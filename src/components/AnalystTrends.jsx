import { getRecommendations, useFinnhub } from '../lib/finnhub.js'

// Diverging bar chart of analyst recommendation trend (buy stack up, sell down),
// styled like Robinhood's "Trading Trends". NOTE: Robinhood's own customer
// buy/sell volume is proprietary and has no public API — this is the closest
// real, public analog (analyst sentiment over time).
export default function AnalystTrends({ ticker }) {
  const { status, data } = useFinnhub(getRecommendations, ticker)

  return (
    <div className="section">
      <h2 className="section-title">Analyst Trends</h2>
      <div className="section-sub">
        Analyst buy/sell recommendation mix over recent months (Finnhub). Robinhood’s own customer trading
        volume isn’t publicly available.
      </div>
      {status === 'nokey' && <NoKey />}
      {status === 'loading' && <div className="fh-note">Loading analyst trends…</div>}
      {status === 'error' && <div className="fh-note">Couldn’t load analyst trends right now.</div>}
      {status === 'ok' && (!data || data.length === 0) && <div className="fh-note">No analyst trend data for {ticker}.</div>}
      {status === 'ok' && data && data.length > 0 && <Bars rows={[...data].reverse().slice(-12)} />}
    </div>
  )
}

function Bars({ rows }) {
  const W = 1000
  const H = 320
  const padT = 20
  const padB = 50
  const zero = padT + (H - padT - padB) / 2
  const half = (H - padT - padB) / 2

  const series = rows.map((r) => ({
    up: (r.strongBuy || 0) + (r.buy || 0),
    down: (r.sell || 0) + (r.strongSell || 0),
    period: r.period,
  }))
  const max = Math.max(1, ...series.map((s) => Math.max(s.up, s.down)))
  const n = series.length
  const gap = 10
  const bw = (W - gap * (n + 1)) / n

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Analyst recommendation trend">
        <line x1="0" y1={zero} x2={W} y2={zero} stroke="var(--text-dim)" strokeWidth="1" />
        {series.map((s, i) => {
          const xc = gap + i * (bw + gap)
          const upH = (s.up / max) * half
          const downH = (s.down / max) * half
          return (
            <g key={s.period || i}>
              <rect x={xc} y={zero - upH} width={bw} height={upH} rx="3" fill="var(--green)" />
              <rect x={xc} y={zero} width={bw} height={downH} rx="3" fill="var(--red)" />
              <text x={xc + bw / 2} y={H - 18} textAnchor="middle" fontSize="15" fill="var(--text-dim)">
                {(s.period || '').slice(2, 7)}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="legend">
        <span><span className="swatch" style={{ background: 'var(--green)' }} />Buy ratings</span>
        <span><span className="swatch" style={{ background: 'var(--red)' }} />Sell ratings</span>
      </div>
    </div>
  )
}

function NoKey() {
  return (
    <div className="fh-note">
      Connect a free <b>Finnhub</b> API key to show analyst trends. Add <code>VITE_FINNHUB_KEY=your_key</code> to a
      <code>.env</code> file and restart the dev server.
    </div>
  )
}
