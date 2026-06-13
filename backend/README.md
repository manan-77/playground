# Stock Playground — AI backend

Python/FastAPI backend for the **AI analysis** panel on the stock detail page.

Pipeline (the hybrid design):

```
question → fetch free-API dossier (Yahoo) → ground Azure AI Foundry IQ agent → grounded answer
```

- `tools/stock_api_tool.py` — `fetch_live_stock_context(ticker)` builds a dense
  text dossier (price, 52-wk range, business summary, margins, analyst targets)
  from live Yahoo data. Dependency-light (uses `requests`); swap to `yfinance`
  if you prefer — same string contract.
- `foundry_agent.py` — injects the dossier as grounding context into a thread and
  runs your Foundry agent. Degrades gracefully to a "not configured" message.
- `app.py` — FastAPI: `GET /api/health`, `POST /api/analyze {ticker, question}`.

## Run

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

The frontend reaches it through the Vite `/api` proxy, so run `npm run dev` too.
Without the backend running, the AI panel shows a "start the backend" hint.

## Connect Azure AI Foundry

1. `cp .env.example .env` and fill in:
   - `PROJECT_CONNECTION_STRING` — from your Foundry project's Overview page.
   - `FOUNDRY_RESEARCH_AGENT_ID` — the deployed agent/assistant id (`asst_...`).
2. Authenticate: `az login` (DefaultAzureCredential).
3. Restart uvicorn. `GET /api/health` will report `foundryConfigured: true`.

> The Azure SDK surface (`azure-ai-projects`) is still evolving — if the call in
> `foundry_agent.py` doesn't match your installed SDK version, the method names
> (`create_thread` / `create_message` / `create_and_process_run` / `list_messages`)
> may need a small tweak. The dossier + endpoint plumbing is independent of that.
