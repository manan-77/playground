import { useState } from 'react'
import QuoteRow from './QuoteRow.jsx'

function WatchlistGroup({ group }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="wl-group">
      <div className="wl-group-head" onClick={() => setOpen((o) => !o)}>
        <span>{group.name}</span>
        <span className="wl-count">{open ? '▾' : '▸'} {group.tickers.length}</span>
      </div>
      {open && group.tickers.map((t) => <QuoteRow key={t} ticker={t} />)}
    </div>
  )
}

export default function WatchlistSection({ watchlists }) {
  return (
    <div className="section">
      <h2 className="section-title">Watchlists</h2>
      {watchlists.map((g) => (
        <WatchlistGroup key={g.id} group={g} />
      ))}
    </div>
  )
}
