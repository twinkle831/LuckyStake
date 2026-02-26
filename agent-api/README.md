# LuckyStake AI Agent API

FastAPI service for the **set-and-forget** staking workflow. The agent asks for:

1. **Lock time** — How long to keep funds (e.g. 1 month, 2 weeks, 1 week)
2. **Gas tolerance** — Low (1 pool), Medium (2 pools), High (3 pools) → more pools = more tx fees
3. **Preference** — **Sure-shot** (spread across more pools for more chances) or **Highest prize** (single pool with biggest prize)
4. **Amount** — XLM to deposit

It then computes an allocation (per-pool amounts, expected value, win probability) and returns a strategy. Conversation is stored per wallet (`public_key`).

## Endpoints

- `POST /chat` — Send a message; body: `{ "public_key": "...", "message": "..." }`. Returns `{ "reply": "..." }`.
- `GET /history?public_key=...` — Get stored messages for the user.
- `GET /strategy?public_key=...` — Get last recommended allocation for contract execution: `[{ "pool_type": "weekly", "amount": 50 }, ...]`.
- `GET /health` — Health check.

## Run locally

```bash
cd agent-api
pip install -r requirements.txt
# Optional: copy .env.example to .env and set LUCKSTAKE_BACKEND_URL, AWS_* for Bedrock
uvicorn app.main:app --reload --port 8000
```

Ensure the LuckyStake Express backend is running (default `http://localhost:4000`) so the agent can fetch pool data.

## Environment (optional)

| Variable | Description |
|----------|-------------|
| `LUCKSTAKE_BACKEND_URL` | Express API URL (default: `http://localhost:4000`) |
| `AGENT_DATA_DIR` | Directory for conversation JSON files (default: `./data`) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` | For AWS Bedrock (Claude). If not set, rule-based flow is used. |
| `BEDROCK_MODEL_ID` | Bedrock model (default: `anthropic.claude-3-haiku-20240307-v1:0`) |

## Profit assessment

- **Expected value** and **win probability** per pool from prize fund and total tickets.
- **Gas**: 1 transaction per pool; approximate fee per tx in XLM is applied.
- **Strategy**: `sure_shot` → spread across up to `max_pools` (from gas tolerance); `high_prize` → single pool with highest prize fund.
