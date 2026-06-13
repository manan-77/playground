import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import holdingsSeed from '../data/holdings.json'
import watchlistsSeed from '../data/watchlists.json'
import transactionsData from '../data/transactions.json'
import stockHistorySeed from '../data/stockHistory.json'
import { UNIVERSE, consensusOf, newsFor } from '../data/universe.js'
import { fetchQuote, fetchHistory } from '../lib/yahoo.js'
import { currentValue } from '../utils/portfolio.js'

const PortfolioContext = createContext(null)

// Starting cash = total bank deposits - what was already spent on the seed buys.
const totalDeposits = transactionsData.reduce((s, t) => s + t.amount, 0)
const totalSpent = stockHistorySeed.reduce((s, p) => s + p.purchaseAmount, 0)
const SEED_CASH = Math.round((totalDeposits - totalSpent) * 100) / 100

const META = Object.fromEntries(UNIVERSE.map((m) => [m.ticker, m]))

// Editable profile, persisted to localStorage so edits survive a reload.
const PROFILE_KEY = 'pg_profile'
const DEFAULT_PROFILE = { name: 'Alex Morgan', email: 'info@phoenixcodecrafter.com', phone: '+1 (415) 555-0147' }
function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE
  } catch {
    return DEFAULT_PROFILE
  }
}

// Combine synthetic metadata with a live Yahoo quote into a stock record.
function buildStock(ticker, quote) {
  const m = META[ticker]
  return {
    ticker,
    name: quote.name || m.name,
    price: quote.price,
    prevClose: quote.prevClose,
    sector: m.sector,
    source: 'Yahoo Finance',
    asOf: quote.asOf,
    history: { '1D': quote.series }, // other timeframes loaded lazily
    company: {
      description: m.desc,
      sector: m.sector,
      volume: quote.volume, // real
      avgVolume: quote.volume, // chart endpoint gives only current volume
      marketCap: null, // not exposed by the chart endpoint
      peRatio: m.peRatio, // synthetic
      high52: quote.high52, // real
      low52: quote.low52, // real
    },
    analyst: { consensus: consensusOf(m.rating), priceTarget: Math.round(quote.price * m.targetMult * 100) / 100, ...m.rating },
    news: newsFor(quote.name || m.name, ticker),
  }
}

// Build a stock-history row for a buy or sell.
function makeTrade(seq, side, ticker, price, qty, dollars) {
  const now = new Date()
  return {
    historyId: `SH-${3000 + seq}`,
    transactionId: null,
    stockId: UNIVERSE.findIndex((m) => m.ticker === ticker) + 1,
    ticker,
    side,
    stockPrice: price,
    purchaseAmount: Math.round(dollars * 100) / 100,
    quantityBought: Math.round(qty * 1e6) / 1e6,
    date: now.toISOString().slice(0, 10),
    timestamp: now.toISOString(),
  }
}

export function PortfolioProvider({ children }) {
  const [stocks, setStocks] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [holdings, setHoldings] = useState(holdingsSeed)
  const [watchlists, setWatchlists] = useState(watchlistsSeed)
  const [history, setHistory] = useState(stockHistorySeed)
  const [transactions, setTransactions] = useState(transactionsData)
  const [cash, setCash] = useState(SEED_CASH)
  const [profile, setProfile] = useState(loadProfile)

  // Move money between a linked bank and the brokerage cash balance.
  // direction: 'deposit' (bank -> brokerage, +cash) or 'withdraw' (brokerage -> bank).
  function transfer(amount, bank, direction = 'deposit') {
    const amt = Math.round(Number(amount) * 100) / 100
    if (!amt || amt <= 0) return false
    if (direction === 'withdraw' && amt > cash) return false
    const now = new Date()
    setTransactions((prev) => [
      ...prev,
      {
        depositId: `${direction === 'withdraw' ? 'WD' : 'DEP'}-${4000 + prev.length}`,
        date: now.toISOString().slice(0, 10),
        fromBank: bank,
        amount: amt,
        direction,
        status: 'cleared',
        createdAt: now.toISOString(),
      },
    ])
    setCash((c) => Math.round((c + (direction === 'withdraw' ? -amt : amt)) * 100) / 100)
    return true
  }

  function updateProfile(patch) {
    setProfile((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
      } catch {
        /* ignore storage errors */
      }
      return next
    })
  }

  const stocksRef = useRef(stocks)
  stocksRef.current = stocks
  const inflight = useRef(new Set())

  // Initial load: fetch a live quote for every ticker in the universe.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      const settled = await Promise.allSettled(
        UNIVERSE.map(async (m) => buildStock(m.ticker, await fetchQuote(m.ticker))),
      )
      if (cancelled) return
      const map = {}
      for (const r of settled) if (r.status === 'fulfilled') map[r.value.ticker] = r.value
      if (Object.keys(map).length === 0) {
        const reason = settled.find((r) => r.status === 'rejected')?.reason
        setError(reason?.message || 'Could not reach Yahoo Finance.')
      } else {
        setStocks(map)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Lazily fetch and cache the price series for a timeframe (charts call this).
  const loadHistory = useCallback(async (ticker, tf) => {
    if (stocksRef.current[ticker]?.history?.[tf]) return
    const key = `${ticker}:${tf}`
    if (inflight.current.has(key)) return
    inflight.current.add(key)
    try {
      const series = await fetchHistory(ticker, tf)
      setStocks((prev) => {
        const s = prev[ticker]
        if (!s || s.history[tf]) return prev
        return { ...prev, [ticker]: { ...s, history: { ...s.history, [tf]: series } } }
      })
    } catch {
      // leave it unloaded; the chart shows its loading state
    } finally {
      inflight.current.delete(key)
    }
  }, [])

  function buy(ticker, dollars) {
    const stock = stocks[ticker]
    if (!stock || dollars <= 0 || dollars > cash) return false
    const qty = dollars / stock.price
    setHoldings((prev) => {
      const existing = prev.find((h) => h.ticker === ticker)
      if (!existing) return [...prev, { ticker, shares: qty, avgCost: stock.price }]
      return prev.map((h) => {
        if (h.ticker !== ticker) return h
        const newShares = h.shares + qty
        const newAvg = (h.avgCost * h.shares + dollars) / newShares
        return { ...h, shares: newShares, avgCost: Math.round(newAvg * 100) / 100 }
      })
    })
    setHistory((prev) => [...prev, makeTrade(prev.length, 'buy', ticker, stock.price, qty, dollars)])
    setCash((c) => Math.round((c - dollars) * 100) / 100)
    return true
  }

  function sell(ticker, dollars) {
    const stock = stocks[ticker]
    const holding = holdings.find((h) => h.ticker === ticker)
    if (!stock || !holding || dollars <= 0) return false
    const qty = dollars / stock.price
    if (qty > holding.shares + 1e-9) return false
    setHoldings((prev) =>
      prev
        .map((h) => (h.ticker === ticker ? { ...h, shares: h.shares - qty } : h))
        .filter((h) => h.shares > 1e-6),
    )
    setHistory((prev) => [...prev, makeTrade(prev.length, 'sell', ticker, stock.price, qty, dollars)])
    setCash((c) => Math.round((c + dollars) * 100) / 100)
    return true
  }

  function toggleWatch(groupId, ticker) {
    setWatchlists((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g
        const has = g.tickers.includes(ticker)
        return { ...g, tickers: has ? g.tickers.filter((t) => t !== ticker) : [...g.tickers, ticker] }
      }),
    )
  }

  const equity = useMemo(() => currentValue(holdings, stocks), [holdings, stocks])
  const totalValue = equity + cash

  const value = {
    stocks,
    loading,
    error,
    holdings,
    watchlists,
    history,
    transactions,
    cash,
    equity,
    totalValue,
    profile,
    updateProfile,
    getHolding: (ticker) => holdings.find((h) => h.ticker === ticker) || null,
    loadHistory,
    buy,
    sell,
    transfer,
    toggleWatch,
  }

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
}

export const usePortfolio = () => {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider')
  return ctx
}
