import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import SearchModal from './SearchModal.jsx'

// Robinhood-style feather mark.
function Feather() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 4C11 4 6 9.5 6 17v3H4v-2c0-1 .3-2 .9-3" stroke="var(--lime)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 4c0 6-3.5 11-10 13M20 4c-5 .5-8 3-9.5 6.5M13 8.5l5-1M11 12l5.5-1.5M9 15.5l5.5-2" stroke="var(--lime)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'U'

export default function TopNav() {
  const navigate = useNavigate()
  const { profile } = usePortfolio()
  const [search, setSearch] = useState(false)

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Feather />
          <span>Playground</span>
        </div>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Investing</NavLink>
          <NavLink to="/transactions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Transactions</NavLink>
          <NavLink to="/transfer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Transfer</NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>Profile</NavLink>
        </div>

        <div className="nav-right">
          <button className="nav-search" onClick={() => setSearch(true)}>
            <span>🔍</span>
            <span>Search ticker or company…</span>
          </button>
          <div className="nav-profile" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <span className="who muted">{profile.name}</span>
            <div className="avatar">{initials(profile.name)}</div>
          </div>
        </div>
      </nav>
      {search && <SearchModal onClose={() => setSearch(false)} />}
    </>
  )
}
