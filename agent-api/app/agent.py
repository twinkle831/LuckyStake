"""
AI agent logic: conversational flow and strategy recommendation using AWS Bedrock.
Asks for: lock time (e.g. 1 month), gas tolerance (low/medium/high), preference (sure_shot vs high_prize).
Then computes allocation and returns strategy + optional contract-execution payload.
"""
from __future__ import annotations

import json
import os
from typing import Any, Literal

from app.conversation import append_message, load_messages
from app.pool_client import fetch_pools
from app.profit import (
    pool_from_api,
    recommend_allocation,
    summarize_profit_assessment,
)

# AWS Bedrock (optional): if keys not set, agent uses rule-based replies
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BEDROCK_MODEL = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")


def _extract_preferences_from_messages(messages: list[dict]) -> dict[str, Any]:
    """Parse assistant messages for trailing JSON state (lock_days, gas_tolerance, preference, amount_xlm)."""
    prefs = {}
    for m in messages:
        content = m.get("content") or ""
        if m.get("role") != "assistant" or not isinstance(content, str):
            continue
        # Find last JSON object in message (we append state as \n\n{...})
        start = content.rfind("{")
        if start == -1:
            continue
        end = content.rfind("}") + 1
        if end <= start:
            continue
        try:
            data = json.loads(content[start:end])
            if "lock_days" in data:
                prefs["lock_days"] = data["lock_days"]
            if "gas_tolerance" in data:
                prefs["gas_tolerance"] = data["gas_tolerance"]
            if "preference" in data:
                prefs["preference"] = data["preference"]
            if "amount_xlm" in data:
                prefs["amount_xlm"] = data["amount_xlm"]
        except json.JSONDecodeError:
            pass
    return prefs


async def _invoke_bedrock(user_message: str, system_prompt: str, history: list[dict]) -> str:
    """Call AWS Bedrock Claude. Falls back to rule-based if boto3/bedrock not configured."""
    try:
        import boto3
        from botocore.exceptions import ClientError

        client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
        # Build messages for Claude
        formatted = []
        for h in history[-20:]:  # last 20 for context
            role = "user" if h.get("role") == "user" else "assistant"
            content = h.get("content", "")
            if isinstance(content, dict):
                content = json.dumps(content)
            formatted.append({"role": role, "content": [{"type": "text", "text": content}]})
        formatted.append({"role": "user", "content": [{"type": "text", "text": user_message}]})

        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "system": system_prompt,
            "messages": formatted,
        }
        response = client.invoke_model(
            modelId=BEDROCK_MODEL,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body),
        )
        result = json.loads(response["body"].read())
        text = result.get("content", [{}])[0].get("text", "")
        return text.strip() or "I couldn't generate a response."
    except Exception as e:
        return f"[Bedrock unavailable: {e}. Using rule-based response.]"


async def _rule_based_reply(user_message: str, messages: list[dict], pools_summary: str) -> str:
    """When AWS is not used, drive the flow with simple rules and structured JSON for agent to parse."""
    lower = (user_message or "").strip().lower()
    prefs = _extract_preferences_from_messages(messages)

    def _reply(text: str, state: dict | None = None) -> str:
        """Return reply; optionally append JSON state so next turn can extract prefs."""
        if state:
            return text + "\n\n" + json.dumps(state)
        return text

    # 1) No lock_days yet → ask how long to keep money
    if "lock_days" not in prefs:
        if any(w in lower for w in ["month", "30", "week", "7", "day", "15", "biweek"]):
            for w, d in [("30", 30), ("month", 30), ("15", 15), ("biweek", 15), ("7", 7), ("week", 7)]:
                if w in lower:
                    prefs["lock_days"] = d
                    break
            if "lock_days" not in prefs:
                prefs["lock_days"] = 30
        else:
            return _reply(
                "How long do you want to keep your funds in the pools? "
                "For example: **1 month** (30 days), **2 weeks** (15 days), or **1 week** (7 days)."
            )

    # 2) No gas_tolerance → ask
    if "gas_tolerance" not in prefs:
        if any(w in lower for w in ["low", "medium", "high", "minimal", "max", "many pools"]):
            if "low" in lower or "minimal" in lower or "1 pool" in lower:
                prefs["gas_tolerance"] = "low"
            elif "high" in lower or "max" in lower or "many" in lower:
                prefs["gas_tolerance"] = "high"
            else:
                prefs["gas_tolerance"] = "medium"
        else:
            return _reply(
                "How much **gas (transaction) fees** are you okay with? "
                "**Low** = 1 pool (fewest fees). **Medium** = 2 pools. **High** = 3 pools (more chances, more fees).",
                prefs,
            )

    # 3) No preference → ask sure shot vs high prize
    if "preference" not in prefs:
        if "sure" in lower or "chance" in lower or "more winners" in lower or "spread" in lower:
            prefs["preference"] = "sure_shot"
        elif "high" in lower or "prize" in lower or "money" in lower or "big" in lower:
            prefs["preference"] = "high_prize"
        else:
            return _reply(
                "Do you want a **sure-shot** (spread across more pools for more chances to win something) "
                "or **highest prize** (put more in the pool with the biggest prize)?",
                prefs,
            )

    # 4) No amount → ask
    if "amount_xlm" not in prefs:
        import re
        nums = re.findall(r"[\d.]+", user_message)
        if nums:
            prefs["amount_xlm"] = float(nums[0])
        else:
            return _reply("How much **XLM** do you want to deposit? (e.g. 50 or 100)", prefs)

    # 5) We have everything → compute strategy
    lock_days = int(prefs.get("lock_days", 30))
    gas_tolerance = prefs.get("gas_tolerance", "medium")
    preference = prefs.get("preference", "sure_shot")
    amount_xlm = float(prefs.get("amount_xlm", 10))

    pools_raw = await fetch_pools()
    pools = [pool_from_api(p) for p in pools_raw]
    allocation = recommend_allocation(
        amount_xlm, pools, lock_days,
        gas_tolerance=gas_tolerance,
        preference=preference,
    )
    summary = summarize_profit_assessment(amount_xlm, allocation, gas_tolerance)

    # Return human-readable + structured block for frontend
    lines = [
        f"**Your strategy** (lock: {lock_days} days, gas: {gas_tolerance}, preference: {preference}, amount: {amount_xlm} XLM):",
        "",
        f"- **Pools used:** {summary['pools_used']}",
        f"- **Total expected value:** ~{summary['total_expected_value_xlm']} XLM",
        f"- **Estimated gas:** ~{summary['total_gas_xlm']} XLM",
        "",
        "**Allocation:**",
    ]
    for a in summary["allocation"]:
        lines.append(
            f"  - **{a['pool_type']}**: {a['amount']} XLM → {a['tickets']} tickets, "
            f"win probability ~{a['win_probability']}%, prize fund {a['prize_fund_xlm']} XLM"
        )
    lines.append("")
    lines.append("You can apply this strategy from the app by depositing into each pool as shown.")

    return "\n".join(lines) + "\n\n" + json.dumps({
        "strategy": summary,
        "lock_days": lock_days,
        "gas_tolerance": gas_tolerance,
        "preference": preference,
        "amount_xlm": amount_xlm,
    })


async def chat_turn(public_key: str, user_message: str) -> str:
    """
    Process one user message: load history, call Bedrock (or rule-based), compute strategy when ready, persist.
    Returns assistant reply (markdown + optional JSON block).
    """
    messages = load_messages(public_key)
    pools_raw = await fetch_pools()
    pools_summary = json.dumps([{"type": p.get("type"), "prizeFundXlm": p.get("prizeFundXlm"), "totalDepositsXlm": p.get("totalDepositsXlm")} for p in pools_raw])

    system_prompt = """You are the LuckyStake AI agent. You help users set a "set and forget" staking strategy.
Ask the user in order:
1) How long they want to keep their money (e.g. 1 month, 2 weeks, 1 week).
2) How much gas (transaction) fee they can tolerate: low = 1 pool, medium = 2 pools, high = 3 pools.
3) Whether they prefer "sure shot" (spread across more pools for more chances to win) or "high prize" (single pool with highest prize).
4) How much XLM they want to deposit.

When you have all four, output a clear summary and then a JSON block with: strategy (allocation per pool), lock_days, gas_tolerance, preference, amount_xlm.
Current pool data: """ + pools_summary

    use_bedrock = os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY")
    if use_bedrock:
        reply = await _invoke_bedrock(user_message, system_prompt, messages)
        # If Bedrock didn't return a strategy, run rule-based to ensure we have allocation when params are present
        prefs = _extract_preferences_from_messages(messages + [{"role": "user", "content": user_message}])
        if "amount_xlm" in prefs and "strategy" not in reply:
            reply = await _rule_based_reply(user_message, messages, pools_summary)
    else:
        reply = await _rule_based_reply(user_message, messages, pools_summary)

    append_message(public_key, "user", user_message)
    append_message(public_key, "assistant", reply)
    return reply


def get_strategy_for_execution(public_key: str) -> list[dict] | None:
    """
    Return last recommended allocation as list of { pool_type, amount } for the contract/deposit flow.
    Parsed from last assistant message containing JSON strategy.
    """
    messages = load_messages(public_key)
    for m in reversed(messages):
        if m.get("role") != "assistant":
            continue
        content = m.get("content") or ""
        if "strategy" not in content:
            continue
        try:
            # Find JSON block (last occurrence)
            start = content.rfind("{")
            if start == -1:
                continue
            end = content.rfind("}") + 1
            data = json.loads(content[start:end])
            strategy = data.get("strategy", {})
            allocation = strategy.get("allocation", [])
            return [{"pool_type": a["pool_type"], "amount": a["amount"]} for a in allocation]
        except (json.JSONDecodeError, KeyError):
            continue
    return None
