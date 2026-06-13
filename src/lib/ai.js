// Talks to the Python AI backend (FastAPI) via the Vite /api proxy.
export async function analyzeStock(ticker, question) {
  let res
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, question }),
    })
  } catch {
    throw new Error('OFFLINE')
  }
  if (!res.ok) throw new Error(`Backend HTTP ${res.status}`)
  return res.json()
}
