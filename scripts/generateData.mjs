// Generates the static ACCOUNT tables for the Stock Playground app.
// Run with: npm run gen-data
//
// Market data (prices, history, volume, 52-wk range) is NOT generated here —
// it is fetched live from Yahoo Finance in the browser via the Vite proxy
// (see src/lib/yahoo.js + src/data/universe.js). This script only seeds the
// user's brokerage account: deposits, purchase events, holdings, watchlists.
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { UNIVERSE } from '../src/data/universe.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'src', 'data')
mkdirSync(DATA_DIR, { recursive: true })

// ---- Transaction table (bank -> brokerage deposits) -----------------------
const transactions = [
  { depositId: 'DEP-1001', date: '2025-09-02', fromBank: 'Chase Checking ••4821', amount: 6000.0, status: 'cleared', createdAt: '2025-09-02T13:04:11Z' },
  { depositId: 'DEP-1002', date: '2025-11-15', fromBank: 'Chase Checking ••4821', amount: 3500.0, status: 'cleared', createdAt: '2025-11-15T09:22:40Z' },
  { depositId: 'DEP-1003', date: '2026-02-01', fromBank: 'Ally Savings ••9930', amount: 4000.0, status: 'cleared', createdAt: '2026-02-01T17:48:02Z' },
  { depositId: 'DEP-1004', date: '2026-05-20', fromBank: 'Chase Checking ••4821', amount: 2500.0, status: 'cleared', createdAt: '2026-05-20T11:15:33Z' },
]

// ---- Stock history table (each purchase event) ----------------------------
const purchases = [
  { ticker: 'AAPL', price: 168.42, quantity: 12, date: '2025-09-05' },
  { ticker: 'AAPL', price: 191.10, quantity: 6, date: '2026-01-12' },
  { ticker: 'MSFT', price: 402.55, quantity: 5, date: '2025-09-18' },
  { ticker: 'NVDA', price: 98.20, quantity: 20, date: '2025-11-20' },
  { ticker: 'NVDA', price: 120.44, quantity: 8, date: '2026-03-03' },
  { ticker: 'TSLA', price: 205.66, quantity: 7, date: '2025-12-01' },
  { ticker: 'AMZN', price: 171.30, quantity: 9, date: '2026-02-10' },
  { ticker: 'KO', price: 60.10, quantity: 25, date: '2026-05-22' },
]

const stockHistory = purchases.map((p, i) => ({
  historyId: `SH-${2001 + i}`,
  transactionId: transactions[i % transactions.length].depositId,
  stockId: UNIVERSE.findIndex((m) => m.ticker === p.ticker) + 1,
  ticker: p.ticker,
  stockPrice: p.price,
  purchaseAmount: Math.round(p.price * p.quantity * 100) / 100,
  quantityBought: p.quantity,
  date: p.date,
  timestamp: new Date(`${p.date}T15:30:00Z`).toISOString(),
}))

// ---- Holdings (derived from the stock-history table) ----------------------
const holdingMap = {}
for (const p of stockHistory) {
  const h = holdingMap[p.ticker] || { ticker: p.ticker, shares: 0, costBasis: 0 }
  h.shares += p.quantityBought
  h.costBasis += p.purchaseAmount
  holdingMap[p.ticker] = h
}
const holdings = Object.values(holdingMap).map((h) => ({
  ticker: h.ticker,
  shares: h.shares,
  avgCost: Math.round((h.costBasis / h.shares) * 100) / 100,
}))

// ---- Watchlist groups (deliberately NOT overlapping the portfolio) --------
const watchlists = [
  { id: 'wl-1', name: 'Tech & Internet', tickers: ['GOOGL', 'META', 'NFLX', 'UBER'] },
  { id: 'wl-2', name: 'Banks & Fintech', tickers: ['JPM', 'BAC', 'V', 'PYPL'] },
  { id: 'wl-3', name: 'Consumer & Growth', tickers: ['COST', 'SBUX', 'DIS', 'AMD'] },
]

const write = (name, data) => {
  writeFileSync(join(DATA_DIR, name), JSON.stringify(data, null, 2))
  console.log(`wrote src/data/${name}`)
}

write('transactions.json', transactions)
write('stockHistory.json', stockHistory)
write('holdings.json', holdings)
write('watchlists.json', watchlists)
console.log('Done. Account tables seeded. (Prices are live from Yahoo at runtime.)')
