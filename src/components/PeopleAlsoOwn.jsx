import { usePortfolio } from '../context/PortfolioContext.jsx'
import QuoteRow from './QuoteRow.jsx'

// "People also own" — same-sector peers from the loaded universe.
export default function PeopleAlsoOwn({ ticker }) {
  const { stocks } = usePortfolio()
  const stock = stocks[ticker]
  if (!stock) return null

  const peers = Object.values(stocks)
    .filter((s) => s.ticker !== ticker && s.sector === stock.sector)
    .slice(0, 5)

  if (peers.length === 0) return null

  return (
    <div className="section">
      <h2 className="section-title">People also own</h2>
      {peers.map((p) => <QuoteRow key={p.ticker} ticker={p.ticker} />)}
    </div>
  )
}
