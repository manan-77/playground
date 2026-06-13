// External fundamentals via Finnhub (https://finnhub.io). Free tier covers the
// endpoints we use: earnings surprises, analyst recommendation trends, and the
// company profile (market cap, industry, IPO, website, logo).
//
// Provide a free key in a `.env` file at the project root:
//   VITE_FINNHUB_KEY=your_key_here
// then restart `npm run dev`. Without a key these sections show a prompt instead.
import { useEffect, useState } from 'react'

const KEY = import.meta.env.VITE_FINNHUB_KEY
export const finnhubEnabled = !!KEY
const BASE = 'https://finnhub.io/api/v1'

async function fh(path) {
  if (!KEY) throw new Error('NO_KEY')
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE}${path}${sep}token=${KEY}`)
  if (res.status === 401 || res.status === 403) throw new Error('NO_KEY')
  if (res.status === 429) throw new Error('Rate limited by Finnhub — try again shortly.')
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`)
  return res.json()
}

export const getEarnings = (ticker) => fh(`/stock/earnings?symbol=${ticker}`)
export const getRecommendations = (ticker) => fh(`/stock/recommendation?symbol=${ticker}`)
export const getProfile = (ticker) => fh(`/stock/profile2?symbol=${ticker}`)

// Generic data hook: returns { status: 'nokey'|'loading'|'ok'|'error', data, error }.
export function useFinnhub(fetcher, ticker) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null })
  useEffect(() => {
    if (!finnhubEnabled) {
      setState({ status: 'nokey', data: null, error: null })
      return
    }
    let cancelled = false
    setState({ status: 'loading', data: null, error: null })
    fetcher(ticker)
      .then((data) => !cancelled && setState({ status: 'ok', data, error: null }))
      .catch((e) => !cancelled && setState({ status: e.message === 'NO_KEY' ? 'nokey' : 'error', data: null, error: e.message }))
    return () => {
      cancelled = true
    }
  }, [fetcher, ticker])
  return state
}
