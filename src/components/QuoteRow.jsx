import { useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { stockChange } from '../utils/portfolio.js'
import { usd, pct } from '../utils/format.js'
import Sparkline from './Sparkline.jsx'

// A read-only quote row used inside watchlists and search results.
export default function QuoteRow({ ticker }) {
  const { stocks } = usePortfolio()
  const navigate = useNavigate()
  const stock = stocks[ticker]
  if (!stock) return null
  const today = stockChange(stock, '1D')
  const up = today.pct >= 0
  return (
    <div className="row" onClick={() => navigate(`/stock/${ticker}`)} style={{ cursor: 'pointer' }}>
      <div className="row-left">
        <div className="ticker">{ticker}</div>
        <div className="sub">{stock.name}</div>
      </div>
      <div className="row-right">
        <Sparkline series={today.series} />
        <div style={{ textAlign: 'right', minWidth: 92 }}>
          <div style={{ fontWeight: 700 }}>{usd(stock.price)}</div>
          <div className={up ? 'pos' : 'neg'} style={{ fontSize: 13, fontWeight: 600 }}>{pct(today.pct)}</div>
        </div>
      </div>
    </div>
  )
}
