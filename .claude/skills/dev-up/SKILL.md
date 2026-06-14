---
name: dev-up
description: Start both dev servers for the Stock Playground — the Vite React frontend (port 5173) and the optional FastAPI backend (port 8000). Use when the user wants to run the app locally.
---

Bring up both processes. The frontend works standalone; start the backend too only if the user wants AI analysis or asks for both.

## Frontend (required)

Run in the repo root, in the background:

```
npm run dev
```

Serves at http://localhost:5173. Vite proxies `/api` → backend and `/yf` → Yahoo Finance (dev/preview only).

If `node_modules` is missing, run `npm install` first.

## Backend (optional — AI analysis)

From `backend/`, ensure the venv exists and deps are installed, then run in the background:

```
python3 -m venv .venv          # first time only
source .venv/bin/activate
pip install -r requirements.txt # first time only
uvicorn app:app --reload --port 8000
```

The backend degrades gracefully if `PROJECT_CONNECTION_STRING` / `FOUNDRY_RESEARCH_AGENT_ID` are unset — it will start but AI features stay disabled.

After both are up, report the URLs and whether AI analysis is active.
