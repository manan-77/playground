// Pure helpers for deriving portfolio + position numbers from the static data.

export const TIMEFRAMES = ['1D', '1W', '1M', '1Y', '5Y', 'ALL']

// Change of a single stock over a timeframe, from its price history.
export function stockChange(stock, tf) {
  const series = stock.history[tf] || stock.history['1D']
  const start = series[0].price
  const end = series[series.length - 1].price
  const abs = end - start
  return { start, end, abs, pct: start ? (abs / start) * 100 : 0, series }
}

// Build a combined portfolio value series for a timeframe by summing each
// holding's price series (aligned by index) weighted by share count, plus cash.
export function portfolioSeries(holdings, stocks, tf, cash = 0) {
  const seriesList = holdings
    .map((h) => {
      const stock = stocks[h.ticker]
      if (!stock) return null
      return (stock.history[tf] || []).map((pt) => ({ t: pt.t, value: pt.price * h.shares }))
    })
    .filter(Boolean)

  if (seriesList.length === 0) return []
  const len = Math.min(...seriesList.map((s) => s.length))
  const out = []
  for (let i = 0; i < len; i++) {
    let sum = cash
    let t = seriesList[0][i].t
    for (const s of seriesList) sum += s[i].value
    out.push({ t, value: Math.round(sum * 100) / 100 })
  }
  return out
}

export function currentValue(holdings, stocks) {
  return holdings.reduce((sum, h) => {
    const stock = stocks[h.ticker]
    return sum + (stock ? stock.price * h.shares : 0)
  }, 0)
}

export function portfolioChange(holdings, stocks, tf, cash = 0) {
  const series = portfolioSeries(holdings, stocks, tf, cash)
  if (series.length < 2) return { start: 0, end: cash, abs: 0, pct: 0, series }
  const start = series[0].value
  const end = series[series.length - 1].value
  const abs = end - start
  return { start, end, abs, pct: start ? (abs / start) * 100 : 0, series }
}

// Per-position detail for the owned-stock view on the detail page.
export function positionStats(holding, stock, totalEquity) {
  const marketValue = stock.price * holding.shares
  const costBasis = holding.avgCost * holding.shares
  const totalReturnAbs = marketValue - costBasis
  const today = stockChange(stock, '1D')
  const todayReturnAbs = today.abs * holding.shares
  return {
    shares: holding.shares,
    marketValue,
    avgCost: holding.avgCost,
    diversity: totalEquity ? (marketValue / totalEquity) * 100 : 0,
    todayReturnAbs,
    todayReturnPct: today.pct,
    totalReturnAbs,
    totalReturnPct: costBasis ? (totalReturnAbs / costBasis) * 100 : 0,
  }
}
