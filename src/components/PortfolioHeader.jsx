import { usd, pct } from '../utils/format.js'

const TF_WORD = { '1D': 'Today', '1W': 'Past week', '1M': 'Past month', '1Y': 'Past year', '5Y': 'Past 5 years', ALL: 'All time' }

// Shows the portfolio value and the gain/loss for the selected timeframe.
// When the chart is being scrubbed, `scrubValue` overrides the displayed value
// and the change is measured from the period start to the cursor.
export default function PortfolioHeader({ totalValue, change, tf, scrubValue }) {
  const displayValue = scrubValue != null ? scrubValue : change.end
  const changeAbs = (scrubValue != null ? scrubValue : change.end) - change.start
  const changePct = change.start ? (changeAbs / change.start) * 100 : 0
  const up = changeAbs >= 0
  const cls = up ? 'pos' : 'neg'

  return (
    <div className="pf-header">
      <div className="pf-label">Portfolio value</div>
      <div className="pf-value">{usd(displayValue)}</div>
      <div className={`pf-change ${cls}`}>
        <span className="arrow">{up ? '▲' : '▼'}</span>
        <span>{usd(Math.abs(changeAbs))}</span>
        <span>({pct(changePct)})</span>
        <span className="muted" style={{ fontWeight: 500 }}>{TF_WORD[tf]}</span>
      </div>
    </div>
  )
}
