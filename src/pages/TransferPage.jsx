import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { usd } from '../utils/format.js'

export default function TransferPage() {
  const navigate = useNavigate()
  const { transactions, cash, transfer } = usePortfolio()

  // Linked banks = distinct banks seen in transaction history (+ a default).
  const banks = useMemo(() => {
    const seen = new Set(transactions.map((t) => t.fromBank).filter(Boolean))
    seen.add('Chase Checking ••4821')
    return [...seen]
  }, [transactions])

  const [direction, setDirection] = useState('deposit') // 'deposit' | 'withdraw'
  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState(banks[0])
  const [done, setDone] = useState(null)
  const [error, setError] = useState('')

  const amt = parseFloat(amount) || 0
  const overdraft = direction === 'withdraw' && amt > cash

  function submit(e) {
    e.preventDefault()
    setError('')
    const ok = transfer(amt, bank, direction)
    if (!ok) {
      setError(overdraft ? 'Amount exceeds your available cash.' : 'Enter a valid amount.')
      return
    }
    setDone({ amount: amt, direction, bank })
    setAmount('')
  }

  if (done) {
    return (
      <div className="app-shell trade-shell">
        <div className="trade-display" style={{ paddingTop: 70 }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <div className="trade-amount" style={{ fontSize: 28 }}>
            {done.direction === 'withdraw' ? 'Withdrew' : 'Deposited'} {usd(done.amount)}
          </div>
          <div className="trade-sub">
            {done.direction === 'withdraw' ? `To ${done.bank}` : `From ${done.bank}`} · new buying power {usd(cash)}
          </div>
        </div>
        <div className="section">
          <button className="btn btn-primary" onClick={() => navigate('/')}>Done</button>
          <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => setDone(null)}>Make another transfer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell trade-shell">
      <h1 className="page-title">Transfer money</h1>

      <div className="card">
        <div className="field" style={{ borderBottom: 'none', paddingTop: 0 }}>
          <span className="label">Available buying power</span>
          <span style={{ fontWeight: 700 }}>{usd(cash)}</span>
        </div>

        <form onSubmit={submit}>
          <div className="toggle-row">
            <button type="button" className={direction === 'deposit' ? 'active' : ''} onClick={() => { setDirection('deposit'); setError('') }}>To brokerage</button>
            <button type="button" className={direction === 'withdraw' ? 'active' : ''} onClick={() => { setDirection('withdraw'); setError('') }}>To bank</button>
          </div>

          <div className="form-field">
            <label htmlFor="bank">{direction === 'withdraw' ? 'To account' : 'From account'}</label>
            <select id="bank" className="input" value={bank} onChange={(e) => setBank(e.target.value)}>
              {banks.map((b) => <option key={b} value={b}>{b}</option>)}
              <option value="Brokerage cash">Brokerage cash</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              className="input"
              inputMode="decimal"
              placeholder="$0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, '')); setError('') }}
            />
          </div>

          {[100, 500, 1000].map((q) => (
            <button type="button" key={q} className="tf-btn" style={{ marginRight: 8 }} onClick={() => setAmount(String(q))}>+{usd(q, { minimumFractionDigits: 0 })}</button>
          ))}

          {error && (
            <div className="banner" style={{ background: 'rgba(255,80,0,.12)', borderColor: 'rgba(255,80,0,.3)', color: 'var(--red)' }}>{error}</div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: 18, opacity: amt > 0 ? 1 : 0.5 }} disabled={amt <= 0}>
            {direction === 'withdraw' ? 'Withdraw' : 'Deposit'} {amt > 0 ? usd(amt) : ''}
          </button>
        </form>
      </div>
      <p className="muted" style={{ fontSize: 13, textAlign: 'center', marginTop: 14 }}>
        Paper money only — transfers adjust your buying power and appear in Transactions.
      </p>
    </div>
  )
}
