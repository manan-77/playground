// Tiny inline chart for list rows. `series` is [{price}] or [{value}].
export default function Sparkline({ series, className = 'spark' }) {
  if (!series || series.length < 2) return <svg className={className} />
  const key = 'value' in series[0] ? 'value' : 'price'
  const ys = series.map((d) => d[key])
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  const span = max - min || 1
  const up = ys[ys.length - 1] >= ys[0]
  const W = 100
  const H = 40
  const path = ys
    .map((v, i) => {
      const x = (i / (ys.length - 1)) * W
      const y = H - ((v - min) / span) * (H * 0.85) - H * 0.08
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={up ? 'var(--green)' : 'var(--red)'} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
