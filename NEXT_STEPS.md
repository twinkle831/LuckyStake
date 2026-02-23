# LuckyStake – Next Steps to Integrate & Run

Follow these in order to run the full flow: **deposit → draw (Blend returns money) → claim principal** with real tx hashes in the user wallet.

---

## 1. Backend environment

**File:** `backend/.env`

| Variable | What to do |
|----------|-------------|
| `ADMIN_SECRET_KEY` | **Required for draws.** Set to the Stellar **secret key** (starts with `S...`) of the pool **admin** (the account that initialized the contracts). This account will sign `withdraw_from_blend`, `harvest_yield`, and `execute_draw`. |
| `ADMIN_KEY` | Optional. Shared secret for the `x-admin-key` header when calling `/api/cron/run-draw-checks` manually. |
| `USE_ONCHAIN_PAYOUTS` | Omit or set to `true` = principal comes from the **contract** (users claim via “Claim principal”). Set to `false` = backend sends principal + prize from admin XLM (old behaviour). |

**Example (add or uncomment in `.env`):**

```env
ADMIN_SECRET_KEY=S...your_admin_secret...
ADMIN_KEY=your-cron-secret
```

Restart the backend after changing `.env`.

---

## 2. Contract / Blend (if you use Blend)

- **If pools are already supplying to Blend:** Ensure each pool contract has **Blend pool address** set (admin calls `set_blend_pool` once per pool). Without this, `withdraw_from_blend` in cron will fail for that pool.
- **If you’re not using Blend yet:** Either:
  - Deploy and configure Blend, then call `set_blend_pool` and `supply_to_blend` for each pool, or  
  - Run without supplying to Blend: deposits stay in the contract; when you run a draw, cron will still call `withdraw_from_blend` only if there is supplied balance (see `getSuppliedToBlend`). If supplied is 0, you can skip or guard that step in cron for the first run.

So: **next step** = either configure Blend and supply, or run a draw with no Blend supply (principal never leaves the contract, so no need to withdraw from Blend).

---

## 3. Data directory (backend)

The backend persists deposits and draws under `backend/data/`. Ensure the app can create and write that directory (e.g. run the backend once so it creates `data/store.json`).

---

## 4. Start backend and frontend

```bash
# Terminal 1 – backend
cd LuckyStake/backend
npm install
node src/index.js
# or: npm run dev

# Terminal 2 – frontend
cd LuckyStake/frontend
npm install
npm run dev
```

- Backend: e.g. `http://localhost:4000`
- Frontend: e.g. `http://localhost:3000`

---

## 5. Frontend environment

**File:** `frontend/.env.local` (or `.env`)

- `NEXT_PUBLIC_API_URL` = backend URL (e.g. `http://localhost:4000`)
- `NEXT_PUBLIC_POOL_CONTRACT_WEEKLY` / `BIWEEKLY` / `MONTHLY` = your deployed pool contract IDs (same as in backend `POOL_CONTRACT_*`).
- `NEXT_PUBLIC_STELLAR_RPC_URL` and `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` for testnet (or mainnet).

---

## 6. Test the full flow

1. **Connect wallet** (Freighter or xBull, testnet).
2. **Deposit** into a pool (e.g. Weekly). Confirm you see the deposit and a real **tx hash** (Stellar Expert link).
3. **Trigger a draw** when the pool’s draw time has passed:
   - **Option A:** Wait for the cron interval (if `ADMIN_SECRET_KEY` and cron are configured).
   - **Option B:** Call the cron endpoint manually:
     ```bash
     curl -X POST "http://localhost:4000/api/cron/run-draw-checks" \
       -H "x-admin-key: your-cron-secret"
     ```
     (Use `ADMIN_KEY` from `.env` as `your-cron-secret`.)
4. **Claim principal:** Open the **Withdraw** modal for that pool. You should see **“Claim principal”**. Click it → sign the contract `withdraw()` in your wallet → confirm you get a **real tx hash** and the funds in your wallet; “View on Stellar Expert” should open the correct transaction.
5. **Winner:** If you’re the winner, you should see the **prize** tx (from `execute_draw`) and the **principal** tx (from “Claim principal”) in the dashboard and in your wallet.

---

## 7. Optional checks

- **Cron status:** `GET http://localhost:4000/api/cron/status` (if protected, use `x-admin-key`).
- **History:** After login, dashboard loads from `GET /api/deposits/history`; entries should show real `payoutTxHash` / `prizeTxHash` after a draw and claim.
- **Fallback to admin payouts:** Set `USE_ONCHAIN_PAYOUTS=false` in `backend/.env` if you want the backend to send principal (and optionally prize) from the admin account instead of users claiming from the contract.

---

## Quick checklist

- [ ] `ADMIN_SECRET_KEY` set in `backend/.env`
- [ ] Backend starts without errors
- [ ] Frontend env has correct API URL and pool contract IDs
- [ ] Deposit works and shows tx hash
- [ ] Draw runs (cron or manual POST `/api/cron/run-draw-checks`)
- [ ] “Claim principal” appears after draw and returns real tx hash and funds in wallet

Once these are done, the integration (deposit → Blend/contract → draw → claim principal with real tx hashes) is in place.
