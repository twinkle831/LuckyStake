"""
Persist and load conversation history per user (publicKey) for the AI agent.
Stored as JSON files under data/conversations/{publicKey}.json
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

DATA_DIR = Path(os.getenv("AGENT_DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "data")))
CONVERSATIONS_DIR = DATA_DIR / "conversations"


def _path(public_key: str) -> Path:
    # Sanitize: use first 8 chars + hash for filename
    safe = "".join(c if c.isalnum() else "_" for c in public_key)[:32]
    CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)
    return CONVERSATIONS_DIR / f"{safe}.json"


def load_messages(public_key: str) -> list[dict[str, Any]]:
    """Load conversation messages for user. Returns list of { role, content, timestamp? }."""
    p = _path(public_key)
    if not p.exists():
        return []
    try:
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("messages", [])
    except Exception:
        return []


def append_message(public_key: str, role: str, content: str | dict) -> None:
    """Append one message and persist."""
    messages = load_messages(public_key)
    messages.append({
        "role": role,
        "content": content if isinstance(content, str) else json.dumps(content),
        "timestamp": __import__("datetime").datetime.utcnow().isoformat() + "Z",
    })
    p = _path(public_key)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump({"publicKey": public_key, "messages": messages}, f, indent=2)


def save_messages(public_key: str, messages: list[dict[str, Any]]) -> None:
    """Overwrite full conversation (e.g. after loading in API)."""
    p = _path(public_key)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump({"publicKey": public_key, "messages": messages}, f, indent=2)


def get_user_preferences(public_key: str) -> dict[str, Any]:
    """Extract stored user preferences from conversation (lock_days, gas_tolerance, preference, amount)."""
    messages = load_messages(public_key)
    prefs = {}
    for m in messages:
        if m.get("role") == "user" and isinstance(m.get("content"), str):
            # Could parse last user message or a dedicated "preferences" message
            pass
        if isinstance(m.get("content"), dict):
            c = m["content"]
            if "lock_days" in c:
                prefs["lock_days"] = c["lock_days"]
            if "gas_tolerance" in c:
                prefs["gas_tolerance"] = c["gas_tolerance"]
            if "preference" in c:
                prefs["preference"] = c["preference"]
            if "amount_xlm" in c:
                prefs["amount_xlm"] = c["amount_xlm"]
    return prefs
