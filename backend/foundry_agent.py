"""Azure AI Foundry Agent Service invocation.

Sends the live-API dossier as grounding context plus the user's question to the
configured Foundry agent and returns its grounded analysis. If Azure isn't
configured (no endpoint / agent name / credentials), returns a clear
'not configured' result so the rest of the app keeps working.

This targets the new Foundry Agent Service (azure-ai-projects >= 2.x), where an
agent is invoked through its OpenAI-compatible Responses endpoint:

    PROJECT_CONNECTION_STRING=https://<resource>.services.ai.azure.com/api/projects/<project>
    FOUNDRY_RESEARCH_AGENT_ID=<agent name, e.g. stockApp>

(`PROJECT_ENDPOINT` is also accepted as a clearer alias for the endpoint.)
"""
from __future__ import annotations

import os
import re

DISCLAIMER = "Disclaimer: This is just some analysis, not stock or investment advice."


def _has_table(text: str) -> bool:
    """True if the text already contains a markdown-style pipe table."""
    return sum(1 for ln in text.splitlines() if ln.count("|") >= 2) >= 2


def _fallback_table(dossier: str) -> str:
    """Build a canonical summary table from the dossier facts (used when the
    model omits its own table, so the UI always gets one)."""
    def find(label: str):
        m = re.search(rf"{re.escape(label)}:\s*(.+)", dossier)
        v = m.group(1).strip() if m else None
        return v if v and v != "N/A" else None

    mcap, pe = find("Market Cap"), find("Trailing P/E")
    price, target, margin = find("Current Market Price"), find("Analyst Target Mean Price"), find("Profit Margins")

    upside = ""
    try:
        p = float(re.sub(r"[^0-9.]", "", price))
        t = float(re.sub(r"[^0-9.]", "", target))
        if p:
            upside = f" ({'+' if t >= p else ''}{(t - p) / p * 100:.1f}%)"
    except (TypeError, ValueError):
        upside = ""

    rows = []
    if mcap:
        rows.append(("Market cap", mcap))
    if pe:
        rows.append(("Valuation (P/E)", pe))
    if target:
        rows.append(("12-month target", target + upside))
    if margin:
        rows.append(("Profitability", margin))
    if not rows:
        return ""
    return "\n".join(["| Metric | Value |", "| --- | --- |"] + [f"| {k} | {v} |" for k, v in rows])


def _finalize(answer: str, dossier: str) -> str:
    """Guarantee the answer ends with a summary table, then a single disclaimer."""
    lines = [
        ln for ln in answer.rstrip().splitlines()
        if not ln.strip().lower().startswith("disclaimer") and "investment advice" not in ln.lower()
    ]
    body = "\n".join(lines).rstrip()
    if not _has_table(body):
        table = _fallback_table(dossier)
        if table:
            body = f"{body}\n\n{table}"
    return f"{body}\n\n{DISCLAIMER}"


# Sent as `instructions` on every request. Tailored to this app:
#  - grounds the agent strictly on the dossier app.py builds,
#  - forbids markdown (the frontend renders answers as plain text), and
#  - fixes a consistent, skimmable structure for the AI analysis panel.
SYSTEM_PROMPT = """You are a senior financial analyst at a top-tier investment bank (think Goldman Sachs). A client is considering investing in this company and wants your professional read. Give a clear, structured assessment based ONLY on the figures in the financial dossier provided, and tie it back to the client's actual question.

GROUNDING (critical):
- Use ONLY the numbers in the FINANCIAL DOSSIER. Never invent or recall figures from memory.
- If a metric shows "N/A" or is missing, say it is not available and skip that part of the scale rather than guessing.

HOW TO INTERPRET EACH METRIC (apply these scales):
- Market capitalisation (company size):
  - About $1 trillion or more: very large / mega-cap, highly established, lower risk.
  - About $200 billion to $1 trillion: large-cap, established and generally stable.
  - Below about $200 billion: mid-cap or smaller, more growth potential but higher risk.
- Price-to-Earnings (P/E) ratio (how cheap or expensive the stock is):
  - Below 20: attractively valued / relatively cheap, a favourable entry point.
  - 20 to 30: fairly valued.
  - Above 30: expensive, priced for high growth and riskier if growth disappoints.
- 12-month target price: compare the analyst mean target price with the current price and state the implied upside or downside as a percentage (positive = potential gain, negative = potential loss).
- Also weigh profit margins (higher is healthier), where the price sits in its 52-week range, and any analyst recommendation.

OUTPUT FORMAT (write clean GitHub-flavored Markdown — it is rendered in the app):
- Start with a level-1 heading: "# <Company name> — Financial Assessment".
- Then one short paragraph per item below, each led by a bold label:
  **Company & size:** <name, market cap, and which size band it falls in>
  **Valuation (P/E):** <the P/E value and what the scale says about it>
  **12-month outlook:** <analyst mean target vs current price, with implied % upside or downside>
  **Profitability & price position:** <profit margins and where price sits in the 52-week range>
  **Analyst view:** <a clear, balanced recommendation in 1 to 2 sentences — attractive entry, hold, or exercise caution — and why, connected to the client's question>

Then, for readability, ALWAYS end with a summary table in EXACTLY this pipe format (header row, a separator row of dashes, then one row per metric, filled with the dossier figures):
| Metric | Value |
| --- | --- |
| Company size | <market cap + size band> |
| Valuation (P/E) | <P/E + cheap / fair / expensive> |
| 12-month target | <target price + implied % upside or downside> |
| Profitability | <profit margin> |
| Verdict | <attractive / hold / caution> |

Disclaimer: This is just some analysis, not stock or investment advice.

STYLE: Confident, concise and professional, like a real analyst note. Cite the actual dossier numbers. Keep each section to 1 to 2 short sentences. Put the table second-to-last and the disclaimer on the final line. Do not wrap the whole answer in a code block."""


def _project_endpoint() -> str | None:
    """The Foundry project endpoint URL. Accepts either env var name."""
    return os.environ.get("PROJECT_ENDPOINT") or os.environ.get("PROJECT_CONNECTION_STRING")


def foundry_configured() -> bool:
    return bool(_project_endpoint() and os.environ.get("FOUNDRY_RESEARCH_AGENT_ID"))


def run_foundry_analysis(dossier: str, user_question: str) -> dict:
    """Returns {configured, answer, error}. Mirrors the documented Foundry flow."""
    if not foundry_configured():
        return {
            "configured": False,
            "answer": (
                "Azure AI Foundry isn't configured on the backend yet. Set "
                "PROJECT_CONNECTION_STRING (the project endpoint URL) and "
                "FOUNDRY_RESEARCH_AGENT_ID (the agent name) in backend/.env and "
                "sign in with `az login`, then this panel returns a grounded analysis."
            ),
            "error": None,
        }

    # Imported lazily so the backend boots even without the Azure SDK installed.
    try:
        from azure.identity import DefaultAzureCredential
        from azure.ai.projects import AIProjectClient
    except ImportError as e:  # noqa: BLE001
        return {"configured": True, "answer": None, "error": f"Azure SDK not installed: {e}"}

    agent_name = os.environ["FOUNDRY_RESEARCH_AGENT_ID"]
    # Named Foundry agents reject a per-request `instructions` param, so the
    # formatting guidance is prepended to the message instead. (You can also set
    # SYSTEM_PROMPT as the agent's Instructions in the portal and trim this.)
    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"FINANCIAL DOSSIER (your only source of facts):\n{dossier}\n\n"
        f"QUESTION: {user_question}"
    )

    try:
        credential = DefaultAzureCredential()
        # allow_preview=True is required to route an OpenAI client to a named agent.
        with AIProjectClient(
            endpoint=_project_endpoint(),
            credential=credential,
            allow_preview=True,
        ) as project:
            # The Responses API requires `model` to match the agent's own model.
            agent = project.agents.get(agent_name)
            model = agent["versions"]["latest"]["definition"]["model"]

            openai_client = project.get_openai_client(agent_name=agent_name)
            response = openai_client.responses.create(model=model, input=prompt)

            answer = getattr(response, "output_text", None)
            if not answer:
                return {"configured": True, "answer": None, "error": "Agent returned no text."}
            return {"configured": True, "answer": _finalize(answer, dossier), "error": None}
    except Exception as e:  # noqa: BLE001
        return {"configured": True, "answer": None, "error": str(e)}
