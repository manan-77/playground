import { useEffect, useState } from 'react'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { usd } from '../utils/format.js'

export default function ProfilePage() {
  const { profile, updateProfile, totalValue, equity, cash, holdings } = usePortfolio()
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)

  // Keep the form in sync if the stored profile changes elsewhere.
  useEffect(() => setForm(profile), [profile])

  const dirty = form.name !== profile.name || form.email !== profile.email || form.phone !== profile.phone

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }
  function save(e) {
    e.preventDefault()
    updateProfile(form)
    setSaved(true)
  }

  return (
    <div className="app-shell">
      <h1 className="page-title">Profile</h1>

      <div className="summary-row">
        <div className="summary-card"><div className="k">Account value</div><div className="v">{usd(totalValue)}</div></div>
        <div className="summary-card"><div className="k">Invested</div><div className="v">{usd(equity)}</div></div>
        <div className="summary-card"><div className="k">Buying power</div><div className="v">{usd(cash)}</div></div>
        <div className="summary-card"><div className="k">Positions</div><div className="v">{holdings.length}</div></div>
      </div>

      <div className="two-col">
        <div className="card">
          <h2 className="card-title">Personal information</h2>
          <form className="form" onSubmit={save}>
            <div className="form-field">
              <label htmlFor="name">Full name</label>
              <input id="name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" />
            </div>
            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input id="email" className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="form-field">
              <label htmlFor="phone">Mobile phone</label>
              <input id="phone" className="input" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>

            {saved && !dirty && <div className="banner">Profile saved.</div>}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={!dirty} style={{ opacity: dirty ? 1 : 0.5 }}>Save changes</button>
              <button type="button" className="btn btn-outline" disabled={!dirty} style={{ opacity: dirty ? 1 : 0.5 }} onClick={() => { setForm(profile); setSaved(false) }}>Cancel</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title">Account</h2>
          <div className="field"><span className="label">Account type</span><span>Individual · Playground</span></div>
          <div className="field"><span className="label">Status</span><span className="pos">Active</span></div>
          <div className="field"><span className="label">Buying power</span><span>{usd(cash)}</span></div>
          <div className="field"><span className="label">Invested</span><span>{usd(equity)}</span></div>
          <div className="field"><span className="label">Open positions</span><span>{holdings.length}</span></div>
          <div className="field" style={{ borderBottom: 'none' }}><span className="label">Data source</span><span>Yahoo Finance (live)</span></div>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 14 }}>
            This is a paper-trading playground — no real money or real account is involved. Profile details
            are saved to your browser only.
          </p>
        </div>
      </div>
    </div>
  )
}
