import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { usd, pct } from '../utils/format.js'
import { stockChange } from '../utils/portfolio.js'

// Full-screen search: type a ticker or name, get live suggestions, tap to open
// the stock's detail page.
export default function SearchModal({ onClose }) {
  const { stocks } = usePortfolio()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const all = useMemo(() => Object.values(stocks), [stocks])
  const results = useMemo(() => {
    const term = q.trim().toUpperCase()
    if (!term) return all
    return all
      .filter((s) => s.ticker.includes(term) || s.name.toUpperCase().includes(term))
      .sort((a, b) => {
        // exact / prefix ticker matches first
        const ap = a.ticker.startsWith(term) ? 0 : 1
        const bp = b.ticker.startsWith(term) ? 0 : 1
        return ap - bp
      })
  }, [q, all])

  function pick(ticker) {
    onClose()
    navigate(`/stock/${ticker}`)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <input
            className="search-input"
            autoFocus
            placeholder="Search by ticker or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="search-cancel" onClick={onClose}>Cancel</button>
        </div>
        <div style={{ marginTop: 16 }}>
          {results.length === 0 && <div className="empty">No matches for “{q}”.</div>}
          {results.map((s) => {
            const today = stockChange(s, '1D')
            const up = today.pct >= 0
            return (
              <div key={s.ticker} className="suggestion" onClick={() => pick(s.ticker)} style={{ cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{s.ticker}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{s.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{usd(s.price)}</div>
                  <div className={up ? 'pos' : 'neg'} style={{ fontSize: 13, fontWeight: 600 }}>{pct(today.pct)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
