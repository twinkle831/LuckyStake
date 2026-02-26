"""
Fetch pool data from the LuckyStake Express backend for profit assessment and strategy.
"""
import os
from typing import Any

import httpx

BACKEND_URL = os.getenv("LUCKSTAKE_BACKEND_URL", "http://localhost:4000")


async def fetch_pools() -> list[dict[str, Any]]:
    """Fetch all pools from Express API (prize fund, TVL, participants, etc.)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{BACKEND_URL}/api/pools")
        r.raise_for_status()
        data = r.json()
        return data.get("pools", [])
