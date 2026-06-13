import { useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext.jsx'

// Robinhood-style "Add to Lists": toggle this stock in/out of watchlist groups.
export default function AddToLists({ ticker }) {
  const { watchlists, toggleWatch } = usePortfolio()
  const [open, setOpen] = useState(false)
  const inLists = watchlists.filter((g) => g.tickers.includes(ticker)).length

  return (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-outline" onClick={() => setOpen((o) => !o)}>
        {inLists > 0 ? `✓ In ${inLists} list${inLists > 1 ? 's' : ''}` : '＋ Add to Lists'}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setOpen(false)} />
          <div className="list-menu">
            <div className="lm-head">Add {ticker} to</div>
            {watchlists.map((g) => {
              const has = g.tickers.includes(ticker)
              return (
                <button key={g.id} className="lm-item" onClick={() => toggleWatch(g.id, ticker)}>
                  <span>{g.name}</span>
                  {has && <span className="lm-check">✓</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
