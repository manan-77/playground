import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { searchSymbols } from '../lib/yahoo.js'
import { usd, pct } from '../utils/format.js'
import { stockChange } from '../utils/portfolio.js'

// Full-screen search: type a ticker or name. Seeded stocks (with live prices)
// match instantly; everything else — ETFs, funds, any listed symbol — comes
// from Yahoo's search API so it can be found and opened too.
export default function SearchModal({ onClose }) {
  const { stocks } = usePortfolio()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [remote, setRemote] = useState([])
  const [searching, setSearching] = useState(false)

  const all = useMemo(() => Object.values(stocks), [stocks])

  // Local matches against the already-loaded universe (these have live prices).
  const local = useMemo(() => {
    const term = q.trim().toUpperCase()
    if (!term) return all
    return all
      .filter((s) => s.ticker.includes(term) || s.name.toUpperCase().includes(term))
      .sort((a, b) => (a.ticker.startsWith(term) ? 0 : 1) - (b.ticker.startsWith(term) ? 0 : 1))
  }, [q, all])

  // Debounced remote lookup so any listed symbol (incl. ETFs) is searchable.
  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setRemote([])
      setSearching(false)
      return
    }
    setSearching(true)
    const id = setTimeout(async () => {
      try {
        setRemote(await searchSymbols(term))
      } catch {
        setRemote([])
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(id)
  }, [q])

  // Merge: local (priced) rows first, then remote matches we don't already have.
  const results = useMemo(() => {
    const seen = new Set(local.map((s) => s.ticker))
    const extra = remote
      .filter((r) => !seen.has(r.ticker))
      .map((r) => ({ ticker: r.ticker, name: r.name, type: r.type, remote: true }))
    return [...local, ...extra]
  }, [local, remote])

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
            placeholder="Search stocks, ETFs, funds by ticker or name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="search-cancel" onClick={onClose}>Cancel</button>
        </div>
        <div style={{ marginTop: 16 }}>
          {results.length === 0 && !searching && <div className="empty">No matches for “{q}”.</div>}
          {results.length === 0 && searching && <div className="empty">Searching…</div>}
          {results.map((s) => {
            const today = s.remote ? null : stockChange(s, '1D')
            const up = today ? today.pct >= 0 : false
            return (
              <div key={s.ticker} className="suggestion" onClick={() => pick(s.ticker)} style={{ cursor: 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {s.ticker}
                    {s.remote && <span className="muted" style={{ fontSize: 11, marginLeft: 8, fontWeight: 600 }}>{s.type}</span>}
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>{s.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {s.remote ? (
                    <div className="muted" style={{ fontSize: 13 }}>View ›</div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700 }}>{usd(s.price)}</div>
                      <div className={up ? 'pos' : 'neg'} style={{ fontSize: 13, fontWeight: 600 }}>{pct(today.pct)}</div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
