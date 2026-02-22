# Cron Automation

The backend runs a cron job that **automatically executes draws** when a pool's period has ended.

## How It Works

1. **Interval**: Every hour (configurable via `CRON_INTERVAL_MS`)
2. **Check**: For each pool (weekly, biweekly, monthly), compares `now` to `nextDraw`
3. **Execute**: If period ended, calls the on-chain contract `execute_draw()`
4. **Advance**: On success, advances `nextDraw` to the next period

## Setup

Add to `backend/.env`:

```env
ADMIN_SECRET_KEY=S...   # Admin Stellar secret (for signing on-chain tx)
ADMIN_KEY=your-secret   # Shared secret for x-admin-key header (protects /api/cron/*)
CRON_INTERVAL_MS=3600000   # Optional, default 1 hour
```

## Harvesting Yield

**Harvest is not automated** by default. To harvest Blend yield before a draw:

1. Query Blend `get_positions(pool_contract_address)` off-chain (Blend SDK or RPC)
2. Compute `yield = actual_balance - get_supplied_to_blend`
3. Call the cron with harvest options:

```bash
curl -X POST http://localhost:4000/api/cron/run-draw-checks \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{
    "weekly": { "harvestYieldAmount": 500000000, "harvestMinReturn": 499000000 }
  }'
```

Or run `harvest_yield` manually via Stellar CLI, then the cron will pick up the prize on the next run.

## Manual Trigger

```bash
# Run draw checks now (no harvest)
curl -X POST http://localhost:4000/api/cron/run-draw-checks \
  -H "x-admin-key: YOUR_ADMIN_KEY"

# Check which pools are due
curl http://localhost:4000/api/cron/status -H "x-admin-key: YOUR_ADMIN_KEY"
```

## Notes

- `nextDraw` is stored in-memory; on server restart it resets from `nextDrawTime()`.
- For production, persist `nextDraw` (e.g. in a DB) or derive it from the last draw timestamp on-chain.
- `execute_draw` will fail if prize fund is 0; ensure yield is harvested or prize is added via `add_prize` first.
