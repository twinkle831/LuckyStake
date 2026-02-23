# LuckyStake – Demo Video: What Was Wrong & What’s Fixed

## What you want to show

1. **Deposit** – User deposits XLM → contract holds it, tickets shown.
2. **Draw** – Timer ends → VRF picks winner on-chain → winner gets **yield (prize)** from contract.
3. **Losers** – Get **principal** back (no loss).
4. **Winner** – Gets **yield + principal** (prize on-chain + principal back).

---

## What was wrong (and what’s fixed)

### 1. **Withdraw returned 404 – FIXED**

- **Issue:** Withdraw modal called `POST /api/deposits/:id/withdraw` with the **frontend** id (from `deposit-store`). The backend only knows **its own** deposit id (returned when you did `POST /api/deposits`). So the backend never found the deposit → 404, withdraw failed.
- **Fix:**  
  - Store **backend deposit id** when creating a deposit (from API response) and when hydrating from `GET /api/deposits/history`.  
  - Use that **backend id** in the withdraw request.  
  - `DepositEntry` now has optional `backendDepositId`; deposit-modal and use-transaction-history set it; withdraw-modal uses it for the API call.

### 2. **Principal and prize source (design)**

- **On-chain:**  
  - `execute_draw()` sends only the **prize (yield)** to the winner.  
  - User **principal** stays in the contract (user balance/tickets unchanged).
- **Backend (cron + payout-service):**  
  - After draw, it sends **XLM from the admin account**: prize to winner + principal to **every** depositor.  
  - So today: **principal (and extra prize) are paid by admin**, not by the contract. The contract still holds the tokens until you add a flow that pulls from Blend and then lets users call `withdraw()` on the contract.

For the **demo** this is fine if:

- Admin has enough XLM to pay principal + prize for that draw.  
- You’re okay with the narrative: “winner gets prize + principal, losers get principal” (all from admin for now).

To make it fully on-chain later you’d:

- After draw: `withdraw_from_blend(total_principal)` so the contract has tokens again.  
- Each user (winner + losers) calls **contract** `withdraw(depositor, amount)` (e.g. from the frontend with wallet sign).  
- Then you can stop sending principal/prize from the admin.

### 3. **Winner from chain vs backend**

- **On-chain:** `execute_draw()` returns the **winner address** (VRF is on-chain).  
- **Backend:** `executeDraw()` in pool-contract doesn’t parse the tx result, so it doesn’t set `drawResult.winner`. Cron then uses `pickWinner(activeDeposits)` (random from backend list).  
- So the “winner” in the backend might not match the on-chain winner if you don’t parse the contract return value.

For the demo: if you’re paying prize + principal from the **admin** to the **backend-chosen** winner and to all depositors, it’s consistent as long as you’re okay with that. For full correctness you’d parse the contract’s return value and use that address as the only winner.

### 4. **Double prize**

- **Contract** already sends the prize (yield) to the winner.  
- **payout-service** also sends “prize” to the winner.  
- So the winner can get the prize **twice** (once on-chain, once from admin) unless you change payout-service to **not** send the prize and only send principal to everyone (including the winner).  
- For a clean demo: either **only** send prize on-chain and use payout-service only for principal refunds, or only send prize from admin and don’t call `execute_draw` (loses on-chain guarantee). Recommended: keep `execute_draw` (prize on-chain), and in payout-service **don’t** send prize to the winner, only send **principal** to every depositor (including winner).

---

## What works well for the demo

- **Deposit:** Frontend calls contract `deposit()`, then backend records it with `txHash`. Tickets are calculated and shown.  
- **History:** `GET /api/deposits/history` + `useTransactionHistory` hydrate the dashboard so after login/refresh the user sees their deposits and payouts.  
- **Winner / refund display:** `useMyResults` and dashboard add payouts with `payoutSubtype: "win" | "refund"`, so the UI can show “You won” and “Principal returned”.  
- **Withdraw (manual):** After the fix, “Withdraw principal” uses the correct backend deposit id and should succeed (admin sends XLM back).

---

## Checklist for the demo

1. **Backend**
   - `ADMIN_SECRET_KEY` and `ADMIN_KEY` set.  
   - Backend store persisted (e.g. `data/store.json`) so deposits/draws survive restart.  
   - Cron runs (or you trigger `POST /api/cron/run-draw-checks` with `x-admin-key`) so the draw and payouts run.

2. **Flow**
   - User connects wallet (Freighter/xBull).  
   - User deposits into a pool → contract + backend record; tickets show.  
   - When the timer hits (or you force the draw), cron: harvest (if you pass yield), `execute_draw`, then payout-service sends principal (and optionally prize) from admin.  
   - User sees “Principal returned” / “You won” and can use “Withdraw” if needed (now using correct backend id).  
   - After logout/login, dashboard is filled from `GET /api/deposits/history` with correct `backendDepositId`, so withdraw still works.

3. **Optional**
   - In payout-service: stop sending prize to the winner (contract already did).  
   - In pool-contract: parse `execute_draw` result and set `winner` so backend and chain agree.  
   - Later: move principal return on-chain (withdraw_from_blend + user calls contract `withdraw`).

---

## Summary

- **Withdraw was broken** because the frontend used its own id instead of the backend’s. That’s fixed by storing and using `backendDepositId`.  
- **Integrated flow (current):** Principal and prize are on-chain. Cron runs `withdraw_from_blend` then `execute_draw`; winner gets prize from contract; all users **claim principal** via contract `withdraw()` from the frontend — real tx hashes in wallet and Stellar Expert. Set `USE_ONCHAIN_PAYOUTS=false` to fall back to admin XLM payouts.
