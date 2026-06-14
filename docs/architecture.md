# Stock Playground — Architecture & Microsoft AI Integration

This document illustrates how **Stock Playground** uses **Microsoft Foundry (Azure AI
Foundry Agent Service)** as its runtime AI engine, and where **GitHub Copilot** and
**Microsoft 365 Copilot** fit into the solution's development and (optional) workflow.

> Stock Playground is a Robinhood-style portfolio UI (Vite + React 18) with an optional
> FastAPI backend that produces **grounded, on-demand equity analysis**. The frontend is
> fully functional on its own; the AI analysis panel is powered by a Foundry agent.

---

## 1. System architecture (runtime)

The core AI flow is a **retrieval-grounded agent** pattern: a free market-data API builds a
factual *dossier*, and a Microsoft Foundry agent answers the user's question grounded
**only** on that dossier.

```mermaid
flowchart LR
    subgraph Client["🖥️ Browser — React + Vite (port 5173)"]
        UI["Stock Detail Page"]
        AIP["AIAnalysis.jsx /<br/>ChatWidget.jsx"]
        AILIB["lib/ai.js<br/>analyzeStock(ticker, question)"]
        UI --> AIP --> AILIB
    end

    subgraph Proxy["Vite dev proxy (dev/preview only)"]
        P1["/api → :8000"]
        P2["/yf → Yahoo Finance"]
    end

    subgraph Backend["⚙️ FastAPI backend (port 8000)"]
        APP["app.py<br/>POST /api/analyze"]
        TOOL["tools/stock_api_tool.py<br/>fetch_live_stock_context()"]
        AGENT["foundry_agent.py<br/>run_foundry_analysis()"]
        APP --> TOOL
        APP --> AGENT
    end

    subgraph Microsoft["☁️ Microsoft Foundry"]
        FAS["Azure AI Foundry<br/>Agent Service"]
        MODEL["Deployed model<br/>(OpenAI-compatible<br/>Responses API)"]
        FAS --> MODEL
    end

    YF["Yahoo Finance API<br/>(live quotes + fundamentals)"]
    AAD["Microsoft Entra ID<br/>DefaultAzureCredential / az login"]

    AILIB -->|"POST /api/analyze"| P1 --> APP
    UI -.->|"live quotes"| P2 --> YF
    TOOL -->|"HTTP"| YF
    AGENT -->|"grounded prompt<br/>(dossier + question)"| FAS
    AGENT -.->|"auth token"| AAD
    AAD -.-> FAS
    FAS -->|"grounded analysis"| AGENT --> APP -->|"answer + dossier"| AILIB
```

### Request lifecycle (`POST /api/analyze`)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as React UI (lib/ai.js)
    participant BE as FastAPI (app.py)
    participant T as stock_api_tool
    participant YF as Yahoo Finance
    participant F as Foundry Agent Service

    U->>FE: Ask "Is AAPL a good buy?"
    FE->>BE: POST /api/analyze { ticker, question }
    BE->>T: fetch_live_stock_context("AAPL")
    T->>YF: chart + quoteSummary HTTP calls
    YF-->>T: price, P/E, margins, targets…
    T-->>BE: dense text DOSSIER
    BE->>F: Responses API — SYSTEM_PROMPT + DOSSIER + QUESTION
    Note over F: Agent grounds strictly on the dossier,<br/>never recalls figures from memory
    F-->>BE: grounded Markdown analysis
    BE-->>FE: { answer, dossier, configured, error }
    FE-->>U: Rendered assessment + summary table
```

---

## 2. Where Microsoft Foundry is used

Microsoft Foundry is the **brain** of the AI analysis feature.

| Aspect | Detail |
| --- | --- |
| **Service** | Azure AI Foundry **Agent Service** (`azure-ai-projects`) |
| **Invocation** | OpenAI-compatible **Responses API** against a *named* agent |
| **Auth** | `DefaultAzureCredential` (Microsoft Entra ID / `az login`) |
| **Config** | `PROJECT_CONNECTION_STRING` (project endpoint) + `FOUNDRY_RESEARCH_AGENT_ID` (agent name) |
| **Grounding** | A live Yahoo dossier is injected per request; the agent is instructed to use **only** those figures |
| **Output contract** | Structured Markdown assessment + a canonical summary table (enforced in `foundry_agent.py`) |
| **Graceful degradation** | If Foundry env vars are unset, the API returns a clear "not configured" message and the rest of the app keeps working |

Key code: [`backend/foundry_agent.py`](../backend/foundry_agent.py) — builds the grounded prompt,
authenticates, calls `project.get_openai_client(...).responses.create(...)`, and finalizes the answer.

---

## 3. Where GitHub Copilot & Microsoft 365 Copilot fit

```mermaid
flowchart TB
    subgraph Dev["👩‍💻 Build time — Developer experience"]
        GHC["GitHub Copilot<br/>code completion, refactors,<br/>test/doc generation"]
        REPO["Stock Playground repo<br/>(React + FastAPI)"]
        GHC --> REPO
    end

    subgraph Run["☁️ Run time — Application intelligence"]
        FND["Microsoft Foundry<br/>Agent Service"]
        APP2["Grounded stock analysis<br/>in the app"]
        FND --> APP2
    end

    subgraph Work["🧑‍💼 Optional — Knowledge worker workflow"]
        M365["Microsoft 365 Copilot<br/>(Teams / Excel / Word)"]
        EXPORT["Share / summarize<br/>analysis output"]
        M365 -.-> EXPORT
    end

    REPO --> Run
    APP2 -.->|"export analysis"| Work
```

- **GitHub Copilot — development accelerator.** Used while authoring the React components,
  the FastAPI backend, the Yahoo dossier builder, and these docs (code completion, inline
  refactors, and boilerplate/test/doc generation).
- **Microsoft Foundry — runtime intelligence.** The deployed agent that produces the grounded
  financial assessment surfaced in the app's AI panel. *(Primary Microsoft AI integration.)*
- **Microsoft 365 Copilot — optional knowledge-worker layer.** A natural extension point: the
  Markdown assessment the app returns can be surfaced/summarized inside Teams, Word, or Excel
  via M365 Copilot for sharing and follow-up. *(Extension, not currently wired in code.)*

---

## 4. Component reference

| Layer | File(s) | Responsibility |
| --- | --- | --- |
| Frontend AI panel | `src/components/AIAnalysis.jsx`, `src/components/ChatWidget.jsx` | Collect the question, render the grounded answer |
| Frontend API client | `src/lib/ai.js` | `analyzeStock(ticker, question)` → `POST /api/analyze` |
| Dev proxy | `vite.config.js` | `/api` → `:8000`, `/yf` → Yahoo (dev/preview only) |
| API surface | `backend/app.py` | `GET /api/health`, `POST /api/analyze` |
| Data dossier | `backend/tools/stock_api_tool.py` | Build dense text dossier from live Yahoo data |
| Foundry agent | `backend/foundry_agent.py` | Ground + invoke the Microsoft Foundry agent |

> **Deployment note:** the `/api` and `/yf` proxies exist only under `vite dev` / `vite preview`.
> A static production build needs a real proxy or serverless function for both, and live quotes
> require Yahoo Finance reachable at runtime.
</content>
</invoke>
