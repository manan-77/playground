export const usd = (n, opts = {}) =>
  (n < 0 ? '-' : '') +
  '$' +
  Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  })

export const pct = (n) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

export const compact = (n) => {
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return String(n)
}

export const shares = (n) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 6 })

export const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.round(diff / 3600000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}
