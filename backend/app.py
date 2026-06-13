"""FastAPI backend for the Stock Playground AI analysis feature.

Flow (per the hybrid design):
  user question -> fetch free-API dossier -> ground a Foundry IQ agent -> answer.

Run:
  cd backend
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  uvicorn app:app --reload --port 8000
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from foundry_agent import foundry_configured, run_foundry_analysis
from tools.stock_api_tool import fetch_live_stock_context

load_dotenv()

app = FastAPI(title="Stock Playground AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    ticker: str
    question: str


@app.get("/api/health")
def health():
    return {"ok": True, "foundryConfigured": foundry_configured()}


@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    # 1) Pull the zero-cost text dossier from the free API tool.
    dossier = fetch_live_stock_context(req.ticker)
    # 2) Ground the Foundry IQ agent on it and answer the question.
    result = run_foundry_analysis(dossier, req.question)
    # 3) Return both so the UI can show the answer and its grounding source.
    return {
        "ticker": req.ticker.upper(),
        "question": req.question,
        "dossier": dossier,
        "configured": result["configured"],
        "answer": result["answer"],
        "error": result["error"],
    }
