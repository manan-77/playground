import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { stockChange } from '../utils/portfolio.js'
import { usd, pct, shares as fmtShares } from '../utils/format.js'
import Sparkline from './Sparkline.jsx'

// One row in the holdings list. The whole row opens the detail page; the
// color-coded price button opens the buy/sell action options.
export default function HoldingRow({ holding }) {
  const { stocks } = usePortfolio()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const stock = stocks[holding.ticker]
  if (!stock) return null
  const today = stockChange(stock, '1D')
  const up = today.pct >= 0

  return (
    <div className="row" onClick={() => navigate(`/stock/${holding.ticker}`)} style={{ cursor: 'pointer' }}>
      <div className="row-left">
        <div className="ticker">{holding.ticker}</div>
        <div className="sub">{fmtShares(holding.shares)} shares</div>
      </div>
      <div className="row-right">
        <Sparkline series={today.series} />
        <div style={{ position: 'relative' }}>
          <button
            className={`price-pill ${up ? 'pos' : 'neg'}`}
            onClick={(e) => {
              e.stopPropagation()
              setMenu((m) => !m)
            }}
          >
            {usd(stock.price)}
            <div style={{ fontSize: 11, fontWeight: 600 }}>{pct(today.pct)}</div>
          </button>
          {menu && (
            <ActionMenu
              ticker={holding.ticker}
              onClose={() => setMenu(false)}
              onPick={(side) => navigate(`/trade/${holding.ticker}?side=${side}`)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ActionMenu({ onPick, onClose }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={(e) => { e.stopPropagation(); onClose() }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 10,
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10,
          overflow: 'hidden', minWidth: 120, boxShadow: '0 8px 24px rgba(0,0,0,.5)',
        }}
      >
        <button style={menuBtn} onClick={() => onPick('buy')}>Buy</button>
        <button style={{ ...menuBtn, borderTop: '1px solid var(--border)' }} onClick={() => onPick('sell')}>Sell</button>
      </div>
    </>
  )
}

const menuBtn = { display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', fontWeight: 700, fontSize: 15 }
