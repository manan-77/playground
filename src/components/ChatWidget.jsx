import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { analyzeStock } from '../lib/ai.js'
import AIAnswer from './AIAnswer.jsx'

// Global floating AI-analyst chat. Mounted once in App so it appears on every
// page (bottom-right). Each message is grounded per-call via /api/analyze, so
// the user sets a ticker and asks questions about it.
export default function ChatWidget() {
  // Parse a /stock/:ticker route so the chat can default to that stock.
  const { pathname } = useLocation()
  const routeTicker = pathname.match(/^\/stock\/([^/]+)/i)?.[1]
  const [open, setOpen] = useState(false)
  const [ticker, setTicker] = useState('AAPL')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hi — I'm your AI stock analyst. Set a ticker above and ask me anything, e.g. \"Is the valuation stretched?\" or \"Summarize the bull and bear case.\"",
    },
  ])
  const listRef = useRef(null)

  // When opened on a stock page, default the ticker to that page's stock.
  useEffect(() => {
    if (routeTicker) setTicker(routeTicker.toUpperCase())
  }, [routeTicker])

  // Keep the conversation scrolled to the latest message.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages, open, busy])

  async function send() {
    const text = q.trim()
    const tkr = ticker.trim().toUpperCase()
    if (!text || busy) return
    if (!tkr) {
      setMessages((m) => [...m, { role: 'bot', text: 'Please enter a ticker (e.g. AAPL) first.' }])
      return
    }
    setMessages((m) => [...m, { role: 'user', text }])
    setQ('')
    setBusy(true)
    try {
      const data = await analyzeStock(tkr, text)
      const reply = data.configured ? data.answer || data.error || 'No response.' : data.answer
      setMessages((m) => [...m, { role: 'bot', text: reply }])
    } catch (e) {
      const msg =
        e.message === 'OFFLINE'
          ? 'The AI backend isn’t running. Start it: cd backend && uvicorn app:app --reload --port 8000'
          : `Something went wrong: ${e.message}`
      setMessages((m) => [...m, { role: 'bot', text: msg }])
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button className="chat-fab" onClick={() => setOpen(true)} aria-label="Open AI analyst chat" title="AI analyst">
        <span aria-hidden="true">✨</span>
      </button>
    )
  }

  return (
    <div className="chat-panel" role="dialog" aria-label="AI analyst chat">
      <div className="chat-header">
        <div className="chat-title">✨ AI Analyst</div>
        <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">×</button>
      </div>

      <div className="chat-ticker-row">
        <span className="chat-ticker-label">Ticker</span>
        <input
          className="chat-ticker-input"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="AAPL"
          spellCheck={false}
        />
        <span className="chat-ticker-hint">analysis is grounded on live data for this stock</span>
      </div>

      <div className="chat-messages" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role}`}>
            {m.role === 'bot' ? <AIAnswer text={m.text} /> : m.text}
          </div>
        ))}
        {busy && <div className="chat-msg chat-msg-bot chat-typing">Analyzing {ticker}…</div>}
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder={`Ask about ${ticker || 'a stock'}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={busy}
        />
        <button className="chat-send" onClick={send} disabled={busy || !q.trim()}>
          {busy ? '…' : 'Send'}
        </button>
      </div>
    </div>
  )
}
