import { useEffect, useMemo, useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { portfolioChange } from '../utils/portfolio.js'
import { usd } from '../utils/format.js'
import PortfolioHeader from '../components/PortfolioHeader.jsx'
import PerformanceChart from '../components/PerformanceChart.jsx'
import TimeframeSelector from '../components/TimeframeSelector.jsx'
import HoldingsList from '../components/HoldingsList.jsx'
import WatchlistSection from '../components/WatchlistSection.jsx'
import MarketMovers from '../components/MarketMovers.jsx'

export default function HomePage() {
  const { holdings, watchlists, stocks, cash, loading, error, totalValue, equity, loadHistory } = usePortfolio()
  const [tf, setTf] = useState('1D')
  const [scrub, setScrub] = useState(null)

  // Make sure every holding's history for the selected timeframe is loaded.
  useEffect(() => {
    holdings.forEach((h) => loadHistory(h.ticker, tf))
  }, [tf, holdings, loadHistory])

  const ready = holdings.every((h) => stocks[h.ticker]?.history?.[tf])
  const change = useMemo(
    () => (ready ? portfolioChange(holdings, stocks, tf, cash) : null),
    [ready, holdings, stocks, tf, cash],
  )

  if (loading) {
    return <div className="app-shell"><div className="empty">Loading live market data from Yahoo Finance…</div></div>
  }
  if (error) {
    return (
      <div className="app-shell">
        <div className="empty">
          Couldn’t load market data: {error}
          <div style={{ marginTop: 8, fontSize: 13 }}>Yahoo is fetched through the Vite dev proxy — make sure you’re running <code>npm run dev</code>.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="dashboard">
        <div className="dashboard-main">
          {change ? (
            <>
              <PortfolioHeader totalValue={change.end} change={change} tf={tf} scrubValue={scrub ? scrub.value : null} />
              {change.series.length > 1 && (
                <PerformanceChart series={change.series} onScrub={setScrub} valueKey="value" />
              )}
            </>
          ) : (
            <div className="pf-header">
              <div className="pf-label">Portfolio value</div>
              <div className="pf-value">{usd(totalValue)}</div>
              <div className="chart-wrap" style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="muted">Loading {tf} chart…</span>
              </div>
            </div>
          )}
          <TimeframeSelector value={tf} onChange={(t) => { setTf(t); setScrub(null) }} />

          <div className="stat-grid" style={{ marginTop: 16 }}>
            <div className="stat-cell"><div className="k">Account value</div><div className="v">{usd(totalValue)}</div></div>
            <div className="stat-cell"><div className="k">Invested</div><div className="v">{usd(equity)}</div></div>
            <div className="stat-cell"><div className="k">Buying power</div><div className="v">{usd(cash)}</div></div>
          </div>

          <MarketMovers />
        </div>

        <aside className="dashboard-aside">
          <div className="card"><HoldingsList holdings={holdings} /></div>
          <div className="card"><WatchlistSection watchlists={watchlists} /></div>
        </aside>
      </div>
    </div>
  )
}
