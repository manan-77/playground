import HoldingRow from './HoldingRow.jsx'

export default function HoldingsList({ holdings }) {
  return (
    <div className="section">
      <h2 className="section-title">Holdings</h2>
      {holdings.length === 0 ? (
        <div className="empty">No positions yet. Tap the search button to find a stock to buy.</div>
      ) : (
        holdings.map((h) => <HoldingRow key={h.ticker} holding={h} />)
      )}
    </div>
  )
}
