import { useId, useRef, useState } from 'react'
import { usd } from '../utils/format.js'

// Interactive SVG line chart. `series` is [{t, value|price}]. Color is driven by
// whether the series ends above where it started. Hovering/dragging reports the
// value at the cursor via onScrub (used to make the header track the chart).
export default function PerformanceChart({ series, height = 200, onScrub, valueKey }) {
  const gradId = useId()
  const ref = useRef(null)
  const [cursor, setCursor] = useState(null)
  const W = 1000
  const H = 1000 * (height / 360)

  const key = valueKey || (series[0] && 'value' in series[0] ? 'value' : 'price')
  const ys = series.map((d) => d[key])
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  const span = max - min || 1
  const up = ys[ys.length - 1] >= ys[0]
  const color = up ? 'var(--green)' : 'var(--red)'

  const x = (i) => (i / (series.length - 1)) * W
  const y = (v) => H - ((v - min) / span) * (H * 0.9) - H * 0.05

  const linePath = series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d[key])}`).join(' ')
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`
  const baselineY = y(ys[0])

  function handleMove(e) {
    const rect = ref.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const idx = Math.round(ratio * (series.length - 1))
    setCursor(idx)
    onScrub && onScrub(series[idx])
  }
  function handleLeave() {
    setCursor(null)
    onScrub && onScrub(null)
  }

  return (
    <div className="chart-wrap" ref={ref}>
      {cursor != null && (
        <div className="chart-cursor-label" style={{ left: `${(cursor / (series.length - 1)) * 100}%` }}>
          {usd(series[cursor][key])}
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onTouchEnd={handleLeave}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={baselineY} x2={W} y2={baselineY} stroke="var(--border)" strokeWidth="2" strokeDasharray="6 8" />
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {cursor != null && (
          <line x1={x(cursor)} y1="0" x2={x(cursor)} y2={H} stroke="var(--text-dim)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        )}
        {cursor != null && <circle cx={x(cursor)} cy={y(series[cursor][key])} r="9" fill={color} />}
      </svg>
    </div>
  )
}
