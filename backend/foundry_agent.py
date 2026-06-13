"""Azure AI Foundry Agent Service invocation.

Injects the live-API dossier as grounding context into a thread, then runs the
configured Foundry IQ agent and returns its grounded analysis. If Azure isn't
configured (no connection string / agent id / credentials), returns a clear
'not configured' result so the rest of the app keeps working.
"""
from __future__ import annotations

import os


def foundry_configured() -> bool:
    return bool(os.environ.get("PROJECT_CONNECTION_STRING") and os.environ.get("FOUNDRY_RESEARCH_AGENT_ID"))


def run_foundry_analysis(dossier: str, user_question: str) -> dict:
    """Returns {configured, answer, error}. Mirrors the documented Foundry flow."""
    if not foundry_configured():
        return {
            "configured": False,
            "answer": (
                "Azure AI Foundry isn't configured on the backend yet. Set "
                "PROJECT_CONNECTION_STRING and FOUNDRY_RESEARCH_AGENT_ID in backend/.env "
                "and sign in with `az login`, then this panel returns a grounded analysis."
            ),
            "error": None,
        }

    # Imported lazily so the backend boots even without the Azure SDK installed.
    try:
        from azure.identity import DefaultAzureCredential
        from azure.ai.projects import AIProjectClient
    except ImportError as e:  # noqa: BLE001
        return {"configured": True, "answer": None, "error": f"Azure SDK not installed: {e}"}

    try:
        credential = DefaultAzureCredential()
        with AIProjectClient.from_connection_string(
            credential=credential,
            conn_str=os.environ["PROJECT_CONNECTION_STRING"],
        ) as client:
            thread = client.agents.create_thread()

            # 1) Inject the live API data as grounding context.
            client.agents.create_message(
                thread_id=thread.id,
                role="user",
                content=f"Background Context from Live Financial API:\n{dossier}",
            )
            # 2) Inject the user's question.
            client.agents.create_message(
                thread_id=thread.id,
                role="user",
                content=f"Based on the provided API data, answer this: {user_question}",
            )
            # 3) Run the Foundry IQ agent.
            run = client.agents.create_and_process_run(
                thread_id=thread.id,
                assistant_id=os.environ["FOUNDRY_RESEARCH_AGENT_ID"],
            )
            if run.status == "completed":
                messages = client.agents.list_messages(thread_id=thread.id)
                answer = messages.data[0].content[0].text.value
                return {"configured": True, "answer": answer, "error": None}
            return {"configured": True, "answer": None, "error": f"Run status: {run.status}"}
    except Exception as e:  # noqa: BLE001
        return {"configured": True, "answer": None, "error": str(e)}
