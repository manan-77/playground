// Live Yahoo Finance access from the browser, via the Vite dev proxy (/yf -> Yahoo).
// No static price fallback — if Yahoo is unreachable these reject and the UI
// surfaces the error.

// Our timeframe keys -> Yahoo (range, interval) pairs.
const YF_RANGES = {
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1wk' },
  '5Y': { range: '5y', interval: '1mo' },
  'ALL': { range: 'max', interval: '3mo' },
}

const round = (n) => Math.round(n * 100) / 100

async function fetchChart(ticker, tf) {
  const { range, interval } = YF_RANGES[tf]
  const res = await fetch(`/yf/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`)
  if (!res.ok) throw new Error(`Yahoo ${ticker} ${tf}: HTTP ${res.status}`)
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error(`Yahoo ${ticker} ${tf}: no data`)
  const meta = result.meta
  const ts = result.timestamp || []
  const closes = result.indicators?.quote?.[0]?.close || []
  const series = []
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] == null) continue
    series.push({ t: ts[i] * 1000, price: round(closes[i]) })
  }
  return { meta, series }
}

// For 1D, prepend the previous close as the baseline so "today's" change is
// measured against the prior close (matches how brokerages display it).
function withBaseline(series, meta) {
  if (meta.chartPreviousClose != null && series.length) {
    return [{ t: series[0].t - 5 * 60000, price: round(meta.chartPreviousClose) }, ...series]
  }
  return series
}

// Current quote + the 1D series, used for list rows and initial load.
export async function fetchQuote(ticker) {
  const { meta, series } = await fetchChart(ticker, '1D')
  return {
    price: round(meta.regularMarketPrice),
    prevClose: round(meta.chartPreviousClose ?? meta.regularMarketPrice),
    name: meta.longName || meta.shortName || ticker,
    volume: meta.regularMarketVolume ?? null,
    high52: meta.fiftyTwoWeekHigh != null ? round(meta.fiftyTwoWeekHigh) : null,
    low52: meta.fiftyTwoWeekLow != null ? round(meta.fiftyTwoWeekLow) : null,
    asOf: new Date((meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    series: withBaseline(series, meta),
  }
}

// Price series for a single timeframe (used lazily by charts).
export async function fetchHistory(ticker, tf) {
  const { meta, series } = await fetchChart(ticker, tf)
  return tf === '1D' ? withBaseline(series, meta) : series
}
