import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { stockChange, positionStats } from '../utils/portfolio.js'
import { usd, pct, compact, shares as fmtShares } from '../utils/format.js'
import PerformanceChart from '../components/PerformanceChart.jsx'
import TimeframeSelector from '../components/TimeframeSelector.jsx'
import EarningsChart from '../components/EarningsChart.jsx'
import AnalystTrends from '../components/AnalystTrends.jsx'
import StockActivity from '../components/StockActivity.jsx'
import PeopleAlsoOwn from '../components/PeopleAlsoOwn.jsx'
import AddToLists from '../components/AddToLists.jsx'
import AIAnalysis from '../components/AIAnalysis.jsx'
import { getProfile, useFinnhub } from '../lib/finnhub.js'

export default function StockDetailPage() {
  const { ticker } = useParams()
  const navigate = useNavigate()
  const { stocks, getHolding, totalValue, loading, loadHistory, watchlists } = usePortfolio()
  const [tf, setTf] = useState('1D')
  const [scrub, setScrub] = useState(null)

  const stock = stocks[ticker]
  const holding = getHolding(ticker)
  const hasSeries = !!stock?.history?.[tf]
  const change = useMemo(() => (hasSeries ? stockChange(stock, tf) : null), [hasSeries, stock, tf])

  useEffect(() => {
    if (stock) loadHistory(ticker, tf)
  }, [stock, ticker, tf, loadHistory])

  if (!stock) {
    return (
      <div className="app-shell">
        <button className="back-link" onClick={() => navigate(-1)}>‹ Back</button>
        <div className="empty">{loading ? 'Loading…' : `Unknown ticker “${ticker}”.`}</div>
      </div>
    )
  }

  const displayPrice = scrub ? scrub.price : stock.price
  const up = change ? change.pct >= 0 : stock.price >= stock.prevClose

  return (
    <div className="app-shell">
      <button className="back-link" onClick={() => navigate(-1)}>‹ Back</button>
      <div className="detail-grid">
        <div className="detail-main">
          <div className="detail-name">{stock.name}</div>
          <div className="detail-price">{usd(displayPrice)}</div>
          <div className={up ? 'pos' : 'neg'} style={{ margin: '0 4px 4px', fontWeight: 600 }}>
            {change ? `${up ? '▲' : '▼'} ${usd(Math.abs(change.abs))} (${pct(change.pct)})` : '—'}
            <span className="muted" style={{ fontWeight: 500 }}> {tf === '1D' ? 'Today' : tf}</span>
          </div>
          {stock.source && (
            <div className="muted" style={{ margin: '0 4px 10px', fontSize: 12 }}>
              {stock.source}{stock.asOf ? ` · as of ${new Date(stock.asOf).toLocaleDateString()}` : ''}
            </div>
          )}

          {change ? (
            <PerformanceChart series={change.series} onScrub={setScrub} valueKey="price" />
          ) : (
            <div className="chart-wrap" style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="muted">Loading {tf} chart…</span>
            </div>
          )}
          <TimeframeSelector value={tf} onChange={(t) => { setTf(t); setScrub(null) }} />

          {holding && <PositionSummary holding={holding} stock={stock} totalValue={totalValue} />}

          <AboutSection stock={stock} />
          <KeyStatistics stock={stock} />
          <RelatedLists ticker={ticker} sector={stock.sector} watchlists={watchlists} onOpen={(t) => navigate(`/stock/${t}`)} />
          <AnalystRating analyst={stock.analyst} />

          <div style={{ marginTop: 18 }}><AIAnalysis ticker={ticker} /></div>

          <EarningsChart ticker={ticker} />
          <AnalystTrends ticker={ticker} />
          <StockActivity ticker={ticker} name={stock.name} />
          <PeopleAlsoOwn ticker={ticker} />
          <NewsSection news={stock.news} />
        </div>

        <aside className="detail-rail">
          <OrderCard ticker={ticker} stock={stock} owned={!!holding} onReview={(side) => navigate(`/trade/${ticker}?side=${side}`)} />
        </aside>
      </div>
    </div>
  )
}

// Robinhood-style two-card position summary (owned stocks only).
function PositionSummary({ holding, stock, totalValue }) {
  const p = positionStats(holding, stock, totalValue)
  return (
    <div className="rh-summary">
      <div className="card rh-sum-card">
        <div className="rh-sum-title">Your market value</div>
        <div className="rh-sum-big">{usd(p.marketValue)}</div>
        <div className="field"><span className="label">Today’s return</span>
          <span className={p.todayReturnAbs >= 0 ? 'pos' : 'neg'}>{usd(p.todayReturnAbs)} ({pct(p.todayReturnPct)})</span></div>
        <div className="field"><span className="label">Total return</span>
          <span className={p.totalReturnAbs >= 0 ? 'pos' : 'neg'}>{usd(p.totalReturnAbs)} ({pct(p.totalReturnPct)})</span></div>
      </div>
      <div className="card rh-sum-card">
        <div className="rh-sum-title">Your average cost</div>
        <div className="rh-sum-big">{usd(p.avgCost)}</div>
        <div className="field"><span className="label">Shares</span><span>{fmtShares(p.shares)}</span></div>
        <div className="field"><span className="label">Portfolio diversity</span><span>{p.diversity.toFixed(2)}%</span></div>
      </div>
    </div>
  )
}

// Collapsible company description, Robinhood "About … Show more".
function AboutSection({ stock }) {
  const [expanded, setExpanded] = useState(false)
  const c = stock.company
  const { data: profile } = useFinnhub(getProfile, stock.ticker)
  const industry = profile?.finnhubIndustry || c.sector
  return (
    <div className="section">
      <h2 className="section-title">About</h2>
      <p className={`muted about-text${expanded ? ' expanded' : ''}`} style={{ lineHeight: 1.55, margin: '0 4px' }}>{c.description}</p>
      <button className="show-more" style={{ margin: '6px 4px 0' }} onClick={() => setExpanded((e) => !e)}>
        {expanded ? 'Show less' : 'Show more'}
      </button>
      <div className="muted" style={{ margin: '10px 4px 0', fontSize: 13 }}>
        {industry}
        {profile?.ipo ? ` · IPO ${profile.ipo}` : ''}
        {profile?.weburl ? <> · <a href={profile.weburl} target="_blank" rel="noreferrer" style={{ color: 'var(--lime)' }}>Website ↗</a></> : ''}
      </div>
    </div>
  )
}

// Compute today's open/high/low from the 1D intraday series (index 0 is the
// prevClose baseline, so real intraday points start at index 1).
function dayStats(stock) {
  const s = stock.history?.['1D']
  if (!s || s.length < 2) return { open: null, high: null, low: null }
  const intraday = s.slice(1).map((p) => p.price)
  if (!intraday.length) return { open: null, high: null, low: null }
  return { open: intraday[0], high: Math.max(...intraday), low: Math.min(...intraday) }
}

function KeyStatistics({ stock }) {
  const c = stock.company
  const { data: profile } = useFinnhub(getProfile, stock.ticker)
  const marketCap = profile?.marketCapitalization ? profile.marketCapitalization * 1e6 : c.marketCap
  const d = dayStats(stock)
  const rows = [
    ['Market cap', marketCap == null ? '—' : '$' + compact(marketCap)],
    ['Price-Earnings ratio', c.peRatio != null ? c.peRatio.toFixed(2) : '—'],
    ['Average volume', c.avgVolume != null ? compact(c.avgVolume) : '—'],
    ['High today', d.high != null ? usd(d.high) : '—'],
    ['Low today', d.low != null ? usd(d.low) : '—'],
    ['Open price', d.open != null ? usd(d.open) : '—'],
    ['Volume', c.volume != null ? compact(c.volume) : '—'],
    ['52 Week high', c.high52 != null ? usd(c.high52) : '—'],
    ['52 Week low', c.low52 != null ? usd(c.low52) : '—'],
  ]
  return (
    <div className="section">
      <h2 className="section-title">Key statistics</h2>
      <div className="kv-grid">
        {rows.map(([k, v]) => (
          <div className="kv-row" key={k}>
            <span className="kv-k">{k}</span>
            <span className="kv-v">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Pills for the sector and any watchlists that contain this ticker.
function RelatedLists({ ticker, sector, watchlists, onOpen }) {
  const lists = (watchlists || []).filter((w) => w.tickers?.includes(ticker))
  if (!sector && lists.length === 0) return null
  return (
    <div className="section">
      <h2 className="section-title">Related lists</h2>
      <div className="related-chips">
        {sector && <span className="related-chip">{sector}</span>}
        {lists.map((w) => (
          <button className="related-chip related-chip-btn" key={w.id} onClick={() => onOpen(w.tickers.find((t) => t !== ticker) || ticker)}>
            {w.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// Robinhood "Analyst ratings": donut of Buy % + Buy/Hold/Sell bars.
function AnalystRating({ analyst: a }) {
  const total = a.buy + a.hold + a.sell || 1
  const buyPct = Math.round((a.buy / total) * 100)
  const holdPct = Math.round((a.hold / total) * 100)
  const sellPct = Math.round((a.sell / total) * 100)
  return (
    <div className="section">
      <h2 className="section-title">Analyst ratings · {a.consensus}</h2>
      <div className="muted" style={{ margin: '0 4px 14px' }}>12-month price target: <b style={{ color: 'var(--text)' }}>{usd(a.priceTarget)}</b></div>
      <div className="rating-layout">
        <div className="donut" style={{ '--p': `${buyPct}` }}>
          <div className="donut-hole">
            <div className="donut-pct">{buyPct}%</div>
            <div className="donut-sub">of {total} ratings</div>
          </div>
        </div>
        <div className="rating-rows">
          <RatingRow label="Buy" value={buyPct} color="var(--green)" />
          <RatingRow label="Hold" value={holdPct} color="var(--text-dim)" />
          <RatingRow label="Sell" value={sellPct} color="var(--red)" />
        </div>
      </div>
    </div>
  )
}

function RatingRow({ label, value, color }) {
  return (
    <div className="rating-row">
      <span className="rating-row-label">{label}</span>
      <div className="rating-track"><div className="rating-fill" style={{ width: `${value}%`, background: color }} /></div>
      <span className="rating-row-val">{value}%</span>
    </div>
  )
}

// Robinhood-style order panel in the right rail.
function OrderCard({ ticker, stock, owned, onReview }) {
  const [side, setSide] = useState('buy')
  const [amount, setAmount] = useState('')
  const dollars = parseFloat(amount) || 0
  const estShares = dollars > 0 && stock.price ? dollars / stock.price : 0
  return (
    <div className="card order-card">
      <div className="order-tabs">
        <button className={`order-tab${side === 'buy' ? ' active' : ''}`} onClick={() => setSide('buy')}>Buy {ticker}</button>
        {owned && <button className={`order-tab${side === 'sell' ? ' active' : ''}`} onClick={() => setSide('sell')}>Sell {ticker}</button>}
      </div>

      <div className="order-field">
        <span className="order-label">Order type</span>
        <span className="order-static">Market order</span>
      </div>
      <div className="order-field">
        <span className="order-label">{side === 'buy' ? 'Buy in' : 'Sell in'}</span>
        <span className="order-static">Dollars</span>
      </div>
      <div className="order-field">
        <span className="order-label">Amount</span>
        <div className="order-amount">
          <span className="order-amount-cur">$</span>
          <input
            className="order-amount-input"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          />
        </div>
      </div>

      <div className="order-est">
        <span className="order-label">Estimated quantity</span>
        <span>{estShares ? fmtShares(Math.round(estShares * 1e6) / 1e6) : '0'}</span>
      </div>

      <button className="btn btn-primary order-review" onClick={() => onReview(side)}>Review order</button>
      <div className="order-foot">{usd(stock.price)} / share · live price</div>

      <div className="order-extra">
        <AddToLists ticker={ticker} />
      </div>
    </div>
  )
}

function NewsSection({ news }) {
  if (!news || news.length === 0) return null
  return (
    <div className="section">
      <h2 className="section-title">News</h2>
      {news.map((n) => (
        <div className="news-item" key={n.id}>
          <div className="src">{n.source}</div>
          <div className="hl">{n.headline}</div>
        </div>
      ))}
    </div>
  )
}
