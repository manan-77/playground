import { useMemo } from 'react'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { stockChange } from '../utils/portfolio.js'
import { PORTFOLIO_TICKERS } from '../data/universe.js'
import QuoteRow from './QuoteRow.jsx'

// Today's biggest gainers and losers across stocks you DON'T already own —
// fills the dashboard's left column, à la Robinhood's "Movers".
export default function MarketMovers() {
  const { stocks } = usePortfolio()
  const { gainers, losers } = useMemo(() => {
    const held = new Set(PORTFOLIO_TICKERS)
    const ranked = Object.values(stocks)
      .filter((s) => !held.has(s.ticker))
      .map((s) => ({ ticker: s.ticker, pct: stockChange(s, '1D').pct }))
      .sort((a, b) => b.pct - a.pct)
    return { gainers: ranked.slice(0, 4), losers: ranked.slice(-4).reverse() }
  }, [stocks])

  if (gainers.length === 0) return null

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2 className="card-title">Today’s movers</h2>
      <div className="movers-grid">
        <div>
          <div className="section-title" style={{ marginTop: 8 }}>Top gainers</div>
          {gainers.map((g) => <QuoteRow key={g.ticker} ticker={g.ticker} />)}
        </div>
        <div>
          <div className="section-title" style={{ marginTop: 8 }}>Top losers</div>
          {losers.map((l) => <QuoteRow key={l.ticker} ticker={l.ticker} />)}
        </div>
      </div>
    </div>
  )
}
