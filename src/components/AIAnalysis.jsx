import { useState } from 'react'
import { analyzeStock } from '../lib/ai.js'
import AIAnswer from './AIAnswer.jsx'

const SUGGESTIONS = [
  'Analyze the risk given its price vs its 52-week high.',
  'Summarize the bull and bear case in 3 bullets each.',
  'Is the valuation stretched based on the fundamentals?',
]

// "Grounded analysis" panel: sends a question to the Python backend, which
// fetches a live-API dossier and grounds the Azure AI Foundry IQ agent on it.
export default function AIAnalysis({ ticker }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState({ status: 'idle' }) // idle|loading|ok|offline|error

  async function ask(question) {
    const text = (question ?? q).trim()
    if (!text) return
    setQ(text)
    setState({ status: 'loading' })
    try {
      const data = await analyzeStock(ticker, text)
      setState({ status: 'ok', data })
    } catch (e) {
      setState({ status: e.message === 'OFFLINE' ? 'offline' : 'error', error: e.message })
    }
  }

  return (
    <div className="card" style={{ borderColor: 'rgba(204,255,0,.25)' }}>
      <h2 className="card-title" style={{ color: 'var(--lime)' }}>✨ AI analysis</h2>
      <div className="section-sub" style={{ margin: '0 0 12px' }}>
        Ask about {ticker}. A live financial dossier is fetched and an Azure AI Foundry IQ agent answers, grounded on it.
      </div>

      <div className="ai-suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="ai-chip" onClick={() => ask(s)} disabled={state.status === 'loading'}>{s}</button>
        ))}
      </div>

      <div className="ai-input-row">
        <input
          className="input"
          placeholder={`Ask anything about ${ticker}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
        />
        <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 22px' }} disabled={state.status === 'loading' || !q.trim()} onClick={() => ask()}>
          {state.status === 'loading' ? 'Thinking…' : 'Ask'}
        </button>
      </div>

      {state.status === 'offline' && (
        <div className="fh-note" style={{ marginTop: 14 }}>
          The Python AI backend isn’t running. Start it: <code>cd backend && uvicorn app:app --reload --port 8000</code> (see <b>backend/README.md</b>).
        </div>
      )}
      {state.status === 'error' && <div className="fh-note" style={{ marginTop: 14 }}>Something went wrong: {state.error}</div>}

      {state.status === 'ok' && (
        <div style={{ marginTop: 14 }}>
          {!state.data.configured && (
            <div className="fh-note" style={{ marginBottom: 12 }}>{state.data.answer}</div>
          )}
          {state.data.configured && state.data.answer && (
            <div className="ai-answer"><AIAnswer text={state.data.answer} /></div>
          )}
          {state.data.configured && state.data.error && (
            <div className="fh-note" style={{ marginBottom: 12 }}>Foundry error: {state.data.error}</div>
          )}
          <details className="ai-dossier">
            <summary>View the live data dossier sent to the agent</summary>
            <pre>{state.data.dossier}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
