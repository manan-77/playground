import { getEarnings, useFinnhub } from '../lib/finnhub.js'
import { usd } from '../utils/format.js'

// Quarterly EPS: estimate vs actual, plotted like Robinhood's Earnings panel.
export default function EarningsChart({ ticker }) {
  const { status, data } = useFinnhub(getEarnings, ticker)

  return (
    <div className="section">
      <h2 className="section-title">Earnings</h2>
      {status === 'nokey' && <NoKey />}
      {status === 'loading' && <div className="fh-note">Loading earnings…</div>}
      {status === 'error' && <div className="fh-note">Couldn’t load earnings right now.</div>}
      {status === 'ok' && (!data || data.length === 0) && <div className="fh-note">No earnings history available for {ticker}.</div>}
      {status === 'ok' && data && data.length > 0 && <Plot rows={[...data].reverse().slice(-8)} />}
    </div>
  )
}

function Plot({ rows }) {
  const W = 1000
  const H = 340
  const padL = 70
  const padR = 30
  const padT = 24
  const padB = 70
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const vals = rows.flatMap((r) => [r.actual, r.estimate]).filter((v) => v != null)
  const max = Math.max(...vals, 0.01) * 1.15
  const x = (i) => padL + (rows.length === 1 ? plotW / 2 : (i / (rows.length - 1)) * plotW)
  const y = (v) => padT + plotH * (1 - v / max)
  const ticks = [0, max / 3, (2 * max) / 3, max]
  const latestEst = [...rows].reverse().find((r) => r.estimate != null)?.estimate

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Quarterly EPS estimate vs actual">
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 10} y={y(t) + 4} textAnchor="end" fontSize="18" fill="var(--text-dim)">{usd(t)}</text>
          </g>
        ))}
        {rows.map((r, i) => (
          <g key={r.period || i}>
            {r.estimate != null && <circle cx={x(i)} cy={y(r.estimate)} r="9" fill="#7a3410" />}
            {r.actual != null && <circle cx={x(i)} cy={y(r.actual)} r="9" fill="var(--red)" />}
            <text x={x(i)} y={H - padB + 28} textAnchor="middle" fontSize="17" fill="var(--text-dim)">
              {labelFor(r)}
            </text>
          </g>
        ))}
      </svg>
      <div className="legend">
        <span><span className="dot" style={{ background: '#7a3410' }} />Estimated{latestEst != null ? ` · ${usd(latestEst)}/sh` : ''}</span>
        <span><span className="dot" style={{ background: 'var(--red)' }} />Actual (reported)</span>
      </div>
    </div>
  )
}

function labelFor(r) {
  if (r.quarter && r.year) return `Q${r.quarter} '${String(r.year).slice(-2)}`
  if (r.period) return r.period.slice(2) // YYYY-MM-DD -> YY-MM-DD-ish
  return ''
}

function NoKey() {
  return (
    <div className="fh-note">
      Connect a free <b>Finnhub</b> API key to show real earnings data. Add <code>VITE_FINNHUB_KEY=your_key</code> to a
      <code>.env</code> file and restart the dev server.
    </div>
  )
}
