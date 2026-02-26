"""
Profit assessment and pool selection logic for the AI agent.
- Expected value and win probability per pool
- Gas (transaction) cost estimation: 1 tx per deposit per pool
- Strategy: sure-shot (more pools / more chances) vs high-prize (single best pool)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

# Stellar/Soroban: base fee per operation (stroops). 1 XLM = 1e7 stroops.
# Approximate fee per deposit tx in XLM (user pays).
FEE_PER_TX_XLM = 0.00001  # ~100 stroops base; can be higher under load

# Ticket multipliers: 1 XLM * days = tickets (from pool-data / contract)
PERIOD_DAYS = {"weekly": 7, "biweekly": 15, "monthly": 30}


@dataclass
class PoolStats:
    pool_type: str
    period_days: int
    prize_fund_xlm: float
    total_deposits_xlm: float
    participants: int
    estimated_apy: float

    @property
    def total_tickets(self) -> float:
        """Total tickets in pool ≈ total_deposits * period_days (simplified)."""
        return max(self.total_deposits_xlm * self.period_days, 1)


def pool_from_api(raw: dict) -> PoolStats:
    return PoolStats(
        pool_type=raw.get("type", ""),
        period_days=PERIOD_DAYS.get(raw.get("type", ""), 7),
        prize_fund_xlm=float(raw.get("prizeFundXlm", 0) or 0),
        total_deposits_xlm=float(raw.get("totalDepositsXlm", 0) or 0),
        participants=int(raw.get("participants", 0) or 0),
        estimated_apy=float(raw.get("estimatedAPY", 0) or 0),
    )


def win_probability(tickets_user: float, pool: PoolStats) -> float:
    """Probability of winning this pool (0..1) if user has tickets_user tickets."""
    total = pool.total_tickets + tickets_user
    if total <= 0:
        return 0.0
    return tickets_user / total


def expected_value_xlm(tickets_user: float, pool: PoolStats) -> float:
    """Expected value in XLM = P(win) * prize_fund."""
    p = win_probability(tickets_user, pool)
    return p * pool.prize_fund_xlm


def gas_cost_xlm(num_pools: int, amount_per_pool: float) -> float:
    """Total gas (fee) cost for depositing into num_pools (1 tx per pool)."""
    return num_pools * FEE_PER_TX_XLM


def recommend_allocation(
    amount_xlm: float,
    pools: list[PoolStats],
    lock_days: int,
    gas_tolerance: Literal["low", "medium", "high"],
    preference: Literal["sure_shot", "high_prize"],
) -> list[dict]:
    """
    Recommend how to split amount_xlm across pools.
    - lock_days: user's desired lock time (e.g. 30 = 1 month)
    - gas_tolerance: low=1 pool, medium=2, high=3
    - preference: sure_shot = spread across more pools (more draws); high_prize = put in highest prize pool
    Returns list of { "pool_type": str, "amount": float, "tickets": int, "expected_value": float, "win_probability": float }.
    """
    if not pools or amount_xlm <= 0:
        return []

    max_pools = {"low": 1, "medium": 2, "high": 3}.get(gas_tolerance, 1)
    # Filter pools that fit lock period (user locks for lock_days; pool period should be <= lock_days so they can stay)
    # Actually: user said "how long to keep money" — so we pick pools whose draw period fits (e.g. 1 month → weekly = 4 draws, monthly = 1 draw)
    eligible = [p for p in pools if p.period_days <= lock_days or lock_days >= 7]
    if not eligible:
        eligible = pools

    # Sort by preference
    if preference == "high_prize":
        # Single pool with highest prize fund
        eligible_sorted = sorted(eligible, key=lambda p: p.prize_fund_xlm, reverse=True)
        chosen = eligible_sorted[:1]
    else:
        # Sure shot: more pools = more draws = more chances. Prefer pools with more participants (more "winners" in sense of more draws)
        # We have 3 pools: weekly, biweekly, monthly. "More winners" = more pools = more chances per year. So take up to max_pools.
        eligible_sorted = sorted(
            eligible,
            key=lambda p: (p.prize_fund_xlm, -p.period_days),
            reverse=True,
        )
        chosen = eligible_sorted[:max_pools]

    # Split amount evenly across chosen pools (or weight by expected value — simple: even split)
    n = len(chosen)
    amount_per = amount_xlm / n
    result = []
    for p in chosen:
        tickets = int(amount_per * p.period_days)
        ev = expected_value_xlm(tickets, p)
        prob = win_probability(tickets, p)
        result.append({
            "pool_type": p.pool_type,
            "amount": round(amount_per, 6),
            "tickets": tickets,
            "expected_value_xlm": round(ev, 4),
            "win_probability": round(prob * 100, 2),
            "prize_fund_xlm": p.prize_fund_xlm,
        })
    return result


def summarize_profit_assessment(amount_xlm: float, allocation: list[dict], gas_tolerance: str) -> dict:
    """Return a summary for the agent to show the user."""
    total_ev = sum(a["expected_value_xlm"] for a in allocation)
    total_gas = gas_cost_xlm(len(allocation), amount_xlm)
    return {
        "total_amount_xlm": amount_xlm,
        "total_expected_value_xlm": round(total_ev, 4),
        "total_gas_xlm": round(total_gas, 6),
        "pools_used": len(allocation),
        "gas_tolerance": gas_tolerance,
        "allocation": allocation,
    }
