import { TIMEFRAMES } from '../utils/portfolio.js'

const LABELS = { '1D': '1D', '1W': '1W', '1M': '1M', '1Y': '1Y', '5Y': '5Y', ALL: 'ALL' }

export default function TimeframeSelector({ value, onChange }) {
  return (
    <div className="tf-row">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          className={`tf-btn ${value === tf ? 'active' : ''}`}
          onClick={() => onChange(tf)}
        >
          {LABELS[tf]}
        </button>
      ))}
    </div>
  )
}
