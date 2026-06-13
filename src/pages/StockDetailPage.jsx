import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePortfolio } from '../context/PortfolioContext.jsx'
import { stockChange, positionStats } from '../utils/portfolio.js'
import { usd, pct, compact, shares as fmtShares, timeAgo } from '../utils/format.js'
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
  const { stocks, getHolding, totalValue, loading, loadHistory } = usePortfolio()
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
          </div>
          {stock.source && (
            <div className="muted" style={{ margin: '0 4px 4px', fontSize: 12 }}>
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

          <div style={{ marginTop: 18 }}><AIAnalysis ticker={ticker} /></div>
          <CompanySection stock={stock} />
          <AnalystTrends ticker={ticker} />
          <EarningsChart ticker={ticker} />
          <StockActivity ticker={ticker} name={stock.name} />
          <PeopleAlsoOwn ticker={ticker} />
          <NewsSection news={stock.news} />
        </div>

        <aside className="detail-rail">
          <OrderCard ticker={ticker} stock={stock} owned={!!holding} onTrade={(side) => navigate(`/trade/${ticker}?side=${side}`)} />
          {holding && <PositionCard holding={holding} stock={stock} totalValue={totalValue} />}
        </aside>
      </div>
    </div>
  )
}

// Sticky trade panel in the right rail.
function OrderCard({ ticker, stock, owned, onTrade }) {
  return (
    <div className="card">
      <div className="card-title">Trade {ticker}</div>
      <div className="order-price">{usd(stock.price)} <span>/ share</span></div>
      <button className="btn btn-primary" onClick={() => onTrade('buy')}>Buy {ticker}</button>
      {owned && (
        <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => onTrade('sell')}>Sell {ticker}</button>
      )}
      <div style={{ marginTop: 12 }}>
        <AddToLists ticker={ticker} />
      </div>
    </div>
  )
}

// Owned-stock position details, as a vertical list for the rail.
function PositionCard({ holding, stock, totalValue }) {
  const p = positionStats(holding, stock, totalValue)
  const rows = [
    ['Shares', fmtShares(p.shares)],
    ['Market value', usd(p.marketValue)],
    ['Average cost', usd(p.avgCost)],
    ['Portfolio diversity', `${p.diversity.toFixed(1)}%`],
    ["Today's return", `${usd(p.todayReturnAbs)} (${pct(p.todayReturnPct)})`, p.todayReturnAbs >= 0],
    ['Total return', `${usd(p.totalReturnAbs)} (${pct(p.totalReturnPct)})`, p.totalReturnAbs >= 0],
  ]
  return (
    <div className="card">
      <div className="card-title">Your position</div>
      {rows.map(([k, v, good]) => (
        <div className="field" key={k}>
          <span className="label">{k}</span>
          <span style={good === undefined ? undefined : { color: good ? 'var(--green)' : 'var(--red)' }}>{v}</span>
        </div>
      ))}
    </div>
  )
}

// Company info + analyst rating, shown in the main column for every stock.
// Market cap / industry / website come live from Finnhub when a key is set.
function CompanySection({ stock }) {
  const c = stock.company
  const a = stock.analyst
  const total = a.buy + a.hold + a.sell
  const { data: profile } = useFinnhub(getProfile, stock.ticker)

  // Finnhub marketCapitalization is reported in millions.
  const marketCap = profile?.marketCapitalization ? profile.marketCapitalization * 1e6 : c.marketCap
  const industry = profile?.finnhubIndustry || c.sector
  const cells = [
    ['Volume', compact(c.volume)],
    ['Avg volume', compact(c.avgVolume)],
    ['Market cap', marketCap == null ? '—' : '$' + compact(marketCap)],
    ['P/E ratio', c.peRatio.toFixed(1)],
    ['52-wk high', usd(c.high52)],
    ['52-wk low', usd(c.low52)],
  ]
  return (
    <>
      <div className="section">
        <h2 className="section-title">About {stock.ticker}</h2>
        <p className="muted" style={{ lineHeight: 1.5, margin: '0 4px' }}>{c.description}</p>
        <div className="muted" style={{ margin: '8px 4px 0', fontSize: 13 }}>
          {industry}
          {profile?.ipo ? ` · IPO ${profile.ipo}` : ''}
          {profile?.weburl ? <> · <a href={profile.weburl} target="_blank" rel="noreferrer" style={{ color: 'var(--lime)' }}>Website ↗</a></> : ''}
        </div>
        <div className="stat-grid" style={{ marginTop: 12 }}>
          {cells.map(([k, v]) => (
            <div className="stat-cell" key={k}>
              <div className="k">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="section">
        <h2 className="section-title">Analyst rating · {a.consensus}</h2>
        <div className="muted" style={{ margin: '0 4px 4px' }}>12-month price target: <b style={{ color: 'var(--text)' }}>{usd(a.priceTarget)}</b></div>
        <div className="rating-bar">
          <div className="buy" style={{ width: `${(a.buy / total) * 100}%` }} />
          <div className="hold" style={{ width: `${(a.hold / total) * 100}%` }} />
          <div className="sell" style={{ width: `${(a.sell / total) * 100}%` }} />
        </div>
        <div className="rating-legend">
          <span>● Buy {a.buy}</span>
          <span>● Hold {a.hold}</span>
          <span>● Sell {a.sell}</span>
        </div>
      </div>
    </>
  )
}

function NewsSection({ news }) {
  if (!news || news.length === 0) return null
  return (
    <div className="section">
      <h2 className="section-title">Recent news</h2>
      {news.map((n) => (
        <div className="news-item" key={n.id}>
          <div className="src">{n.source} · {timeAgo(n.publishedAt)}</div>
          <div className="hl">{n.headline}</div>
        </div>
      ))}
    </div>
  )
}
