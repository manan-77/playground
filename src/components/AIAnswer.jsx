// Renders an AI analyst answer written in Markdown — headings, bold/italic,
// bullet lists, paragraphs, and pipe tables (the summary table). Intentionally
// dependency-free: it covers the small Markdown subset the agent produces.

const splitCells = (line) => {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split('|').map((c) => c.trim())
}
const isSeparator = (cells) => cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()))
const isTableLine = (line) => line.includes('|') && line.trim().length > 0

// Inline formatting: **bold**, *italic*, `code`.
function inline(text, kp) {
  const parts = []
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g
  let last = 0
  let m
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[2] !== undefined) parts.push(<strong key={`${kp}-b${i}`}>{m[2]}</strong>)
    else if (m[3] !== undefined) parts.push(<em key={`${kp}-i${i}`}>{m[3]}</em>)
    else if (m[4] !== undefined) parts.push(<code key={`${kp}-c${i}`}>{m[4]}</code>)
    last = m.index + m[0].length
    i++
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function Table({ lines, k }) {
  const rows = lines.map(splitCells).filter((c) => !isSeparator(c))
  if (rows.length === 0) return null
  const [head, ...body] = rows
  return (
    <table className="ai-table" key={k}>
      <thead><tr>{head.map((c, i) => <th key={i}>{inline(c, `th${i}`)}</th>)}</tr></thead>
      <tbody>
        {body.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, `td${ri}-${ci}`)}</td>)}</tr>)}
      </tbody>
    </table>
  )
}

function renderMarkdown(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const blocks = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }

    // Heading: #, ##, ###…
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const lvl = Math.min(h[1].length, 3)
      blocks.push(<div key={k++} className={`ai-h ai-h${lvl}`}>{inline(h[2], `h${k}`)}</div>)
      i++
      continue
    }

    // Table: two or more consecutive pipe lines.
    if (isTableLine(line) && i + 1 < lines.length && isTableLine(lines[i + 1])) {
      const t = []
      let j = i
      while (j < lines.length && isTableLine(lines[j])) { t.push(lines[j]); j++ }
      blocks.push(<Table key={k++} lines={t} k={k} />)
      i = j
      continue
    }

    // Bullet list.
    if (/^\s*[-*]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={k++} className="ai-ul">
          {items.map((it, li) => <li key={li}>{inline(it, `li${k}-${li}`)}</li>)}
        </ul>,
      )
      continue
    }

    // Paragraph: gather lines until a blank or a structural line.
    const para = []
    while (
      i < lines.length && lines[i].trim()
      && !/^#{1,6}\s+/.test(lines[i])
      && !/^\s*[-*]\s+/.test(lines[i])
      && !(isTableLine(lines[i]) && i + 1 < lines.length && isTableLine(lines[i + 1]))
    ) {
      para.push(lines[i])
      i++
    }
    if (para.length) blocks.push(<p key={k++} className="ai-p">{inline(para.join('\n'), `p${k}`)}</p>)
    else i++
  }
  return blocks
}

export default function AIAnswer({ text }) {
  if (!text) return null
  return <div className="ai-md">{renderMarkdown(text)}</div>
}
