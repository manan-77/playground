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

// Combine a live Yahoo quote with whatever synthetic metadata we have into a
// stock record. Seeded universe tickers carry synthetic sector/P-E/ratings;
// symbols discovered via search (ETFs, anything else) have no META, so those
// fields degrade gracefully to null / "N/A".
function buildStock(ticker, quote, extra = {}) {
  const m = META[ticker] || {}
  const name = quote.name || m.name || extra.name || ticker
  const sector = m.sector || extra.sector || null
  const rating = m.rating || null
  return {
    ticker,
    name,
    price: quote.price,
    prevClose: quote.prevClose,
    sector,
    source: 'Yahoo Finance',
    asOf: quote.asOf,
    history: { '1D': quote.series }, // other timeframes loaded lazily
    company: {
      description: m.desc || `${name} — live market data from Yahoo Finance.`,
      sector,
      volume: quote.volume, // real
      avgVolume: quote.volume, // chart endpoint gives only current volume
      marketCap: null, // not exposed by the chart endpoint
      peRatio: m.peRatio ?? null, // synthetic; unknown for searched symbols
      high52: quote.high52, // real
      low52: quote.low52, // real
    },
    analyst: rating
      ? { consensus: consensusOf(rating), priceTarget: Math.round(quote.price * (m.targetMult ?? 1) * 100) / 100, ...rating }
      : { consensus: 'N/A', priceTarget: quote.price, buy: 0, hold: 0, sell: 0 },
    news: newsFor(name, ticker),
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

  // Initial load: fetch a live quote for every ticker in the universe. With
  // stocks + ETFs the universe is sizable, so fetch in limited-concurrency
  // batches (avoids a request storm / Yahoo rate-limiting) and flush each batch
  // into state as it resolves so rows paint progressively.
  useEffect(() => {
    let cancelled = false
    const BATCH = 8
    setLoading(true)
    setError(null)
    ;(async () => {
      let resolved = 0
      let lastError = null
      for (let i = 0; i < UNIVERSE.length; i += BATCH) {
        if (cancelled) return
        const slice = UNIVERSE.slice(i, i + BATCH)
        const settled = await Promise.allSettled(
          slice.map(async (m) => buildStock(m.ticker, await fetchQuote(m.ticker))),
        )
        if (cancelled) return
        const map = {}
        for (const r of settled) {
          if (r.status === 'fulfilled') map[r.value.ticker] = r.value
          else lastError = r.reason
        }
        if (Object.keys(map).length) {
          resolved += Object.keys(map).length
          setStocks((prev) => ({ ...prev, ...map }))
          setLoading(false) // first rows are in — let the UI render
        }
      }
      if (cancelled) return
      if (resolved === 0) setError(lastError?.message || 'Could not reach Yahoo Finance.')
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

  // Lazily fetch a quote for a symbol not in the seeded universe (e.g. an ETF
  // opened from search) and cache it so the detail page can render it. Returns
  // true if the symbol resolved to a live quote.
  const ensureStock = useCallback(async (ticker, extra = {}) => {
    const t = ticker.toUpperCase()
    if (stocksRef.current[t]) return true
    const key = `quote:${t}`
    if (inflight.current.has(key)) return false
    inflight.current.add(key)
    try {
      const stock = buildStock(t, await fetchQuote(t), extra)
      setStocks((prev) => (prev[t] ? prev : { ...prev, [t]: stock }))
      return true
    } catch {
      return false // unknown/unreachable ticker — detail page shows its message
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
    ensureStock,
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
