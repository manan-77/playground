// The tradable universe + the SYNTHETIC metadata Yahoo's chart endpoint does
// not provide (descriptions, analyst ratings, P/E, price-target multiple).
// Prices, history, volume, and 52-week range are fetched live — see src/lib/yahoo.js.
export const UNIVERSE = [
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Technology', peRatio: 32.1, targetMult: 1.12, rating: { buy: 28, hold: 9, sell: 2 }, desc: 'Designs, manufactures, and markets smartphones, computers, tablets, wearables, and accessories worldwide.' },
  { ticker: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', peRatio: 35.4, targetMult: 1.15, rating: { buy: 34, hold: 4, sell: 1 }, desc: 'Develops and licenses software, services, devices, and solutions, including Azure cloud and Office.' },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', sector: 'Semiconductors', peRatio: 54.7, targetMult: 1.22, rating: { buy: 41, hold: 3, sell: 0 }, desc: 'Provides graphics and compute platforms for gaming, data center, AI, and automotive markets.' },
  { ticker: 'TSLA', name: 'Tesla, Inc.', sector: 'Automotive', peRatio: 71.3, targetMult: 1.05, rating: { buy: 14, hold: 16, sell: 9 }, desc: 'Designs, develops, manufactures, and sells electric vehicles and energy generation and storage systems.' },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumer Discretionary', peRatio: 42.0, targetMult: 1.18, rating: { buy: 39, hold: 3, sell: 0 }, desc: 'Online retailer and cloud-computing provider operating Amazon.com and Amazon Web Services.' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services', peRatio: 24.3, targetMult: 1.14, rating: { buy: 36, hold: 6, sell: 0 }, desc: 'Holding company for Google, providing search, advertising, cloud, and other internet services.' },
  { ticker: 'META', name: 'Meta Platforms, Inc.', sector: 'Communication Services', peRatio: 27.6, targetMult: 1.16, rating: { buy: 40, hold: 4, sell: 1 }, desc: 'Builds technology that helps people connect, including Facebook, Instagram, WhatsApp, and Reality Labs.' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', peRatio: 12.4, targetMult: 1.08, rating: { buy: 18, hold: 11, sell: 2 }, desc: 'Global financial services firm providing investment banking, consumer banking, and asset management.' },
  { ticker: 'DIS', name: 'The Walt Disney Company', sector: 'Communication Services', peRatio: 38.2, targetMult: 1.20, rating: { buy: 21, hold: 8, sell: 1 }, desc: 'Operates entertainment and media networks, parks and experiences, and direct-to-consumer streaming.' },
  { ticker: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer Staples', peRatio: 25.1, targetMult: 1.10, rating: { buy: 15, hold: 9, sell: 0 }, desc: 'Manufactures, markets, and sells nonalcoholic beverages worldwide.' },
  { ticker: 'NFLX', name: 'Netflix, Inc.', sector: 'Communication Services', peRatio: 44.8, targetMult: 1.13, rating: { buy: 25, hold: 12, sell: 3 }, desc: 'Streaming entertainment service offering TV series, films, and games across a wide variety of genres.' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors', peRatio: 47.9, targetMult: 1.19, rating: { buy: 30, hold: 6, sell: 1 }, desc: 'Designs microprocessors, graphics processors, and related technologies for computing markets.' },
  { ticker: 'V', name: 'Visa Inc.', sector: 'Financials', peRatio: 31.2, targetMult: 1.12, rating: { buy: 30, hold: 6, sell: 0 }, desc: 'Operates a global payments technology network connecting consumers, merchants, and banks.' },
  { ticker: 'COST', name: 'Costco Wholesale Corp.', sector: 'Consumer Staples', peRatio: 52.4, targetMult: 1.08, rating: { buy: 24, hold: 9, sell: 1 }, desc: 'Operates membership warehouse clubs offering branded and private-label merchandise.' },
  { ticker: 'SBUX', name: 'Starbucks Corp.', sector: 'Consumer Discretionary', peRatio: 27.0, targetMult: 1.14, rating: { buy: 18, hold: 12, sell: 2 }, desc: 'Roaster, marketer, and retailer of specialty coffee operating stores worldwide.' },
  { ticker: 'UBER', name: 'Uber Technologies, Inc.', sector: 'Technology', peRatio: 33.5, targetMult: 1.20, rating: { buy: 38, hold: 5, sell: 1 }, desc: 'Operates ride-hailing, food delivery, and freight platforms across global markets.' },
  { ticker: 'PYPL', name: 'PayPal Holdings, Inc.', sector: 'Financials', peRatio: 18.3, targetMult: 1.16, rating: { buy: 22, hold: 14, sell: 2 }, desc: 'Operates a technology platform enabling digital payments for merchants and consumers.' },
  { ticker: 'BAC', name: 'Bank of America Corp.', sector: 'Financials', peRatio: 13.1, targetMult: 1.10, rating: { buy: 17, hold: 10, sell: 2 }, desc: 'Provides banking, investing, asset management, and other financial services worldwide.' },
]

// Tickers held in the seed portfolio — home watchlists/movers deliberately
// exclude these so the lists show stocks you don't already own.
export const PORTFOLIO_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'KO']

const NEWS_TEMPLATES = [
  ['{n} beats quarterly earnings estimates, shares move on guidance', 'Market Wire'],
  ['Analysts at major bank raise price target on {t}', 'Street Journal'],
  ['{n} announces new product line aimed at expanding market share', 'Tech Daily'],
  ['Regulators review {n} amid broader sector scrutiny', 'Capital Report'],
  ['{n} expands operations, signals confidence in long-term demand', 'Business Insider'],
]

const DAY = 86400000

export function consensusOf({ buy, hold, sell }) {
  const total = buy + hold + sell
  if (buy / total > 0.6) return 'Buy'
  if (sell / total > 0.3) return 'Sell'
  return 'Hold'
}

// Synthetic headlines with timestamps spread over the last few days.
export function newsFor(name, ticker) {
  const now = Date.now()
  return NEWS_TEMPLATES.map(([title, source], i) => ({
    id: `${ticker}-news-${i}`,
    headline: title.replace('{n}', name).replace('{t}', ticker),
    source,
    publishedAt: new Date(now - (i + 1) * 0.7 * DAY).toISOString(),
  }))
}
