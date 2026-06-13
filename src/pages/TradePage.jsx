import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { usd, shares as fmtShares } from '../utils/format.js'

// Buy/Sell entry. Supports entering either a dollar amount or a share count;
// the other value is derived from the live price. Submitting updates holdings.
export default function TradePage() {
  const { ticker } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { stocks, getHolding, cash, buy, sell, loading } = usePortfolio()

  const side = params.get('side') === 'sell' ? 'sell' : 'buy'
  const [mode, setMode] = useState('dollars') // 'dollars' | 'shares'
  const [input, setInput] = useState('')
  const [done, setDone] = useState(null)

  const stock = stocks[ticker]
  const holding = getHolding(ticker)
  if (!stock) {
    return (
      <div className="app-shell">
        <button className="back-link" onClick={() => navigate(-1)}>‹ Back</button>
        <div className="empty">{loading ? 'Loading…' : `Unknown ticker “${ticker}”.`}</div>
      </div>
    )
  }

  const num = parseFloat(input || '0') || 0
  const dollars = mode === 'dollars' ? num : num * stock.price
  const qty = mode === 'dollars' ? (stock.price ? num / stock.price : 0) : num

  const maxSellDollars = holding ? holding.shares * stock.price : 0
  const canSubmit =
    dollars > 0 && (side === 'buy' ? dollars <= cash : qty <= (holding?.shares ?? 0) + 1e-9)

  function press(key) {
    setInput((cur) => {
      if (key === 'del') return cur.slice(0, -1)
      if (key === '.') return cur.includes('.') ? cur : cur + '.'
      const next = cur + key
      // limit to 2 decimals
      if (next.includes('.') && next.split('.')[1].length > (mode === 'dollars' ? 2 : 4)) return cur
      return next
    })
  }

  function submit() {
    const ok = side === 'buy' ? buy(ticker, dollars) : sell(ticker, dollars)
    if (ok) setDone({ side, dollars, qty })
  }

  if (done) {
    return (
      <div className="app-shell trade-shell">
        <div className="trade-display" style={{ paddingTop: 80 }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <div className="trade-amount" style={{ fontSize: 28 }}>
            {done.side === 'buy' ? 'Bought' : 'Sold'} {fmtShares(Math.round(done.qty * 1e4) / 1e4)} {ticker}
          </div>
          <div className="trade-sub">{usd(done.dollars)} at {usd(stock.price)}/share</div>
        </div>
        <div className="section">
          <button className="btn btn-primary" onClick={() => navigate('/')}>Done</button>
          <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => navigate(`/stock/${ticker}`)}>
            View {ticker}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell trade-shell">
      <button className="back-link" onClick={() => navigate(-1)}>‹ Back</button>
      <h2 style={{ margin: '4px', fontSize: 20 }}>
        {side === 'buy' ? 'Buy' : 'Sell'} {ticker} <span className="muted" style={{ fontWeight: 500, fontSize: 15 }}>· {usd(stock.price)}/sh</span>
      </h2>

      <div className="toggle-row">
        <button className={mode === 'dollars' ? 'active' : ''} onClick={() => { setMode('dollars'); setInput('') }}>Dollars</button>
        <button className={mode === 'shares' ? 'active' : ''} onClick={() => { setMode('shares'); setInput('') }}>Shares</button>
      </div>

      <div className="trade-display">
        <div className="trade-amount">
          {mode === 'dollars' ? `$${input || '0'}` : `${input || '0'}`}
          {mode === 'shares' && <span style={{ fontSize: 20 }}> sh</span>}
        </div>
        <div className="trade-sub">
          {mode === 'dollars' ? `≈ ${fmtShares(Math.round(qty * 1e4) / 1e4)} shares` : `≈ ${usd(dollars)}`}
        </div>
      </div>

      <div className="field">
        <span className="label">{side === 'buy' ? 'Buying power' : 'Shares owned'}</span>
        <span>{side === 'buy' ? usd(cash) : `${fmtShares(holding?.shares ?? 0)} (${usd(maxSellDollars)})`}</span>
      </div>

      {!canSubmit && num > 0 && (
        <div className="banner" style={{ background: 'rgba(255,90,95,.12)', borderColor: 'rgba(255,90,95,.3)', color: 'var(--red)' }}>
          {side === 'buy' ? 'Amount exceeds your buying power.' : 'You don’t own that many shares.'}
        </div>
      )}

      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => (
          <button key={k} onClick={() => press(k)}>{k === 'del' ? '⌫' : k}</button>
        ))}
      </div>

      <button
        className={`btn ${side === 'buy' ? 'btn-primary' : 'btn-danger'}`}
        disabled={!canSubmit}
        style={{ opacity: canSubmit ? 1 : 0.4 }}
        onClick={submit}
      >
        Review {side === 'buy' ? 'buy' : 'sell'}
      </button>
    </div>
  )
}
