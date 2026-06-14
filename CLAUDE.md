# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Robinhood-style stock portfolio UI: Vite + React 18 (vanilla JS/JSX) frontend with an **optional** FastAPI backend for AI analysis (Azure AI Foundry). The frontend is fully functional without the backend.

## Running it (two processes)

- Frontend: `npm run dev` (root) → http://localhost:5173
- Backend: `uvicorn app:app --reload --port 8000` from `backend/` (after `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`)
- Reseed static portfolio JSON: `npm run gen-data`

## Proxy gotcha

Vite dev proxies `/api` → `localhost:8000` and `/yf` → `query1.finance.yahoo.com` (avoids CORS). These work **only under `vite dev` / `vite preview`** — a static production build has no proxy, so deploys need a real proxy/serverless function for both. Live quotes require Yahoo Finance reachable at runtime; there is no static fallback.

## Conventions & gotchas

- **Vanilla JS/JSX and vanilla CSS** — no TypeScript, no ESLint/Prettier, no test framework, no CI. Match the existing plain-JS style; don't introduce TS or a build-time linter unless asked.
- CSS lives in a single `src/index.css` (black theme; gains `#00C805`, losses `#FF5000`).
- Portfolio state is in-memory in `src/context/PortfolioContext.jsx` — buy/sell mutations are lost on reload. Only Profile edits persist (localStorage).
- Backend degrades gracefully when Foundry env vars are unset; don't assume it's running.
- Commit directly to `main` (solo project, no PR flow).

## Env vars

- Frontend `.env`: `VITE_FINNHUB_KEY` (optional — enables earnings/analyst data).
- Backend `.env` (copy from `.env.example`): `PROJECT_CONNECTION_STRING`, `FOUNDRY_RESEARCH_AGENT_ID` (both optional, for AI analysis).
