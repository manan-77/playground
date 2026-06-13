import { useMemo, useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { usd, shares as fmtShares } from '../utils/format.js'

const FILTERS = ['All', 'Transfers', 'Buys', 'Sells']

export default function TransactionsPage() {
  const { transactions, history } = usePortfolio()
  const [filter, setFilter] = useState('All')

  // Merge bank transfers and trade events into one activity feed.
  const activity = useMemo(() => {
    const deposits = transactions.map((t) => {
      const withdraw = t.direction === 'withdraw'
      return {
        id: t.depositId,
        kind: withdraw ? 'withdraw' : 'deposit',
        label: withdraw ? 'Withdrawal' : 'Deposit',
        detail: `${withdraw ? 'To' : 'From'} ${t.fromBank}`,
        amount: t.amount,
        signed: withdraw ? -t.amount : t.amount,
        date: t.date,
        ts: new Date(t.createdAt || t.date).getTime(),
      }
    })
    const trades = history.map((h) => {
      const side = h.side === 'sell' ? 'sell' : 'buy'
      return {
        id: h.historyId,
        kind: side,
        label: side === 'sell' ? 'Sell' : 'Buy',
        detail: `${fmtShares(Math.round(h.quantityBought * 1e4) / 1e4)} ${h.ticker} @ ${usd(h.stockPrice)}`,
        ticker: h.ticker,
        amount: h.purchaseAmount,
        signed: side === 'sell' ? h.purchaseAmount : -h.purchaseAmount,
        date: h.date,
        ts: new Date(h.timestamp || h.date).getTime(),
      }
    })
    return [...deposits, ...trades].sort((a, b) => b.ts - a.ts)
  }, [transactions, history])

  const totals = useMemo(() => {
    const t = { deposits: 0, invested: 0, proceeds: 0 }
    for (const a of activity) {
      if (a.kind === 'deposit') t.deposits += a.amount
      else if (a.kind === 'withdraw') t.deposits -= a.amount
      else if (a.kind === 'buy') t.invested += a.amount
      else if (a.kind === 'sell') t.proceeds += a.amount
    }
    return t
  }, [activity])

  const rows = activity.filter((a) =>
    filter === 'All' ? true
      : filter === 'Transfers' ? a.kind === 'deposit' || a.kind === 'withdraw'
      : filter === 'Buys' ? a.kind === 'buy'
      : a.kind === 'sell',
  )

  return (
    <div className="app-shell">
      <h1 className="page-title">Transactions</h1>

      <div className="summary-row">
        <div className="summary-card"><div className="k">Net deposited</div><div className="v">{usd(totals.deposits)}</div></div>
        <div className="summary-card"><div className="k">Total invested</div><div className="v">{usd(totals.invested)}</div></div>
        <div className="summary-card"><div className="k">Sell proceeds</div><div className="v">{usd(totals.proceeds)}</div></div>
        <div className="summary-card"><div className="k">Transactions</div><div className="v">{activity.length}</div></div>
      </div>

      <div className="tf-row" style={{ marginBottom: 12 }}>
        {FILTERS.map((f) => (
          <button key={f} className={`tf-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="card" style={{ padding: '4px 8px' }}>
        {rows.length === 0 ? (
          <div className="empty">No {filter.toLowerCase()} yet.</div>
        ) : (
          <table className="txn-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Details</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="muted">{new Date(a.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td><span className={`badge ${a.kind}`}>{a.label}</span></td>
                  <td>{a.detail}</td>
                  <td className={`num ${a.signed >= 0 ? 'pos' : 'neg'}`}>{a.signed >= 0 ? '+' : '−'}{usd(Math.abs(a.signed))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
