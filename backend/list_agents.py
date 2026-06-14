"""One-off helper: print every agent (id/name + model) in your Foundry project.

Run from the `backend/` folder after `az login`:
    python list_agents.py

Copy the agent's `id` into backend/.env as FOUNDRY_RESEARCH_AGENT_ID.
"""
import os

from dotenv import dotenv_values
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

os.environ.update({k: v for k, v in dotenv_values(".env").items() if v})  # reads backend/.env

endpoint = os.environ.get("PROJECT_ENDPOINT") or os.environ.get("PROJECT_CONNECTION_STRING")
if not endpoint:
    raise SystemExit("Set PROJECT_CONNECTION_STRING in backend/.env first.")

with AIProjectClient(endpoint=endpoint, credential=DefaultAzureCredential(), allow_preview=True) as project:
    print(f"Agents in {endpoint}:\n")
    found = False
    for agent in project.agents.list():
        found = True
        try:
            model = agent["versions"]["latest"]["definition"]["model"]
        except Exception:  # noqa: BLE001
            model = "?"
        print(f"  id/name: {agent['id']}")
        print(f"  model:   {model}")
        print("  " + "-" * 40)
    if not found:
        print("  (no agents found — check you're signed into the right account/project)")
