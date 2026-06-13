import { useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { usd, shares as fmtShares, timeAgo } from '../utils/format.js'

// The user's own buy/sell history for a single stock (Robinhood's "History").
export default function StockActivity({ ticker, name }) {
  const { history } = usePortfolio()
  const [expanded, setExpanded] = useState(false)

  const rows = history
    .filter((h) => h.ticker === ticker)
    .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))

  const shown = expanded ? rows : rows.slice(0, 3)

  return (
    <div className="section">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 className="section-title">History</h2>
        {rows.length > 3 && (
          <button className="show-more" onClick={() => setExpanded((e) => !e)}>{expanded ? 'Show less' : 'Show more'}</button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="fh-note">No activity for {ticker} yet. Buy some to start your history.</div>
      ) : (
        shown.map((h) => {
          const side = h.side === 'sell' ? 'sell' : 'buy'
          return (
            <div className="hist-row" key={h.historyId}>
              <div>
                <div className="h-title">{name} market {side}</div>
                <div className="h-sub">{recency(h)}</div>
              </div>
              <div>
                <div className="h-amt">{usd(h.purchaseAmount)}</div>
                <div className="h-det">{fmtShares(Math.round(h.quantityBought * 1e6) / 1e6)} shares at {usd(h.stockPrice)}</div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function recency(h) {
  const t = new Date(h.timestamp || h.date).getTime()
  const ageDays = (Date.now() - t) / 86400000
  if (ageDays < 1.5) return timeAgo(h.timestamp || h.date)
  return new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
