# LuckyStake — CLI commands

---

## Verify where your money is right now

If Blend shows 0,0 — your XLM is **in the pool contract**, not in Blend. Admin has to call `supply_to_blend` to send it to Blend. Use one command to see both:

**PowerShell — one table: In Contract vs In Blend**

```powershell
(Invoke-RestMethod http://localhost:4000/api/pools).pools | Format-Table type, totalDepositsXlm, suppliedToBlend -AutoSize
```

- **totalDepositsXlm** = XLM in the **pool contract** (your deposit is here).
- **suppliedToBlend** = XLM sent to **Blend** (0 means none sent yet).

**Example:** You see `weekly  2  0` → 2 XLM is in the contract, 0 in Blend. Your money is in the contract.

**Same thing, one line:**

```powershell
(Invoke-RestMethod http://localhost:4000/api/pools).pools | Select-Object type, totalDepositsXlm, suppliedToBlend
```

**Raw JSON:**

```powershell
curl -s http://localhost:4000/api/pools
```

Look for `totalDepositsXlm` (in contract) and `suppliedToBlend` (in Blend).

---

## Show money deposited (TVL per pool)

Backend must be running (`cd backend && npm run dev`).

**PowerShell — table of deposits per pool:**

```powershell
(Invoke-RestMethod http://localhost:4000/api/pools).pools | Format-Table type, totalDepositsXlm, prizeFundXlm, participants -AutoSize
```

**PowerShell — one line, just totals:**

```powershell
(Invoke-RestMethod http://localhost:4000/api/pools).pools | Select-Object type, totalDepositsXlm
```

**Curl — raw JSON (look for `totalDepositsXlm`, `prizeFundXlm`):**

```powershell
curl -s http://localhost:4000/api/pools
```

`totalDepositsXlm` = XLM currently deposited in that pool (on-chain). If you see 2 for a pool, that includes your 2 XLM.

---

## Wallet balance shows 0 or “couldn’t be loaded”

Balance comes from the **backend** → **Horizon** (Stellar’s account API). If it was working and then stops:

1. **Backend running?** Start it: `cd backend && npm run dev`. Frontend calls `GET /api/wallet/YOUR_ADDRESS`; if the backend is down, balance stays 0.
2. **Horizon URL (mainnet):** In `backend/.env` set:
   ```env
   STELLAR_HORIZON_URL=https://horizon.stellar.org
   ```
   Do **not** use `horizon-mainnet.stellar.org` (can be unreliable). Restart the backend after changing.
3. **Frontend API URL:** If the app is not on localhost, set `NEXT_PUBLIC_API_URL` in the frontend to your real backend URL (e.g. your Render URL). Otherwise the app may be calling the wrong server or localhost.
4. **Refresh:** Click “Refresh balance” in the app (or disconnect and reconnect the wallet) after the backend is running and env is fixed.

**Quick check:** Open in browser or PowerShell:
```powershell
Invoke-RestMethod "http://localhost:4000/api/wallet/YOUR_STELLAR_PUBLIC_KEY"
```
If you see `xlmBalance` and a number, the backend and Horizon are fine; if you get an error or 500, the backend or Horizon URL is the problem.

---

## Fix RPC URL (if you got ENOTFOUND)

In `backend/.env` set:

```env
STELLAR_RPC_URL=https://mainnet.sorobanrpc.com
```

Do **not** use `soroban-mainnet.stellar.org` (that host does not resolve).

---

## 2. One command: show supplied to Blend (XLM per pool)

Start the backend (`npm run dev` or `node src/index.js` in `backend`), then in **PowerShell**:

```powershell
curl -s http://localhost:4000/api/pools | ConvertFrom-Json | % { $_.pools } | % { "$($_.type): $($_.suppliedToBlend) XLM supplied to Blend" }
```

Or just get the raw JSON and read `suppliedToBlend` per pool:

```powershell
(Invoke-RestMethod -Uri "http://localhost:4000/api/pools").pools | Select-Object type, suppliedToBlend
```

**Example output:**

```text
type      suppliedToBlend
----      --------------
weekly    0
biweekly  0
monthly   0
```

Those numbers are **XLM supplied to Blend** (principal behind the position). The backend loads them from its store (and can be updated from on-chain via cron or PATCH).

---

## 3. Single line (PowerShell)

```powershell
(Invoke-RestMethod http://localhost:4000/api/pools).pools | Ft type, suppliedToBlend -AutoSize
```

---

## 4. With curl only (no PowerShell parsing)

```powershell
curl -s http://localhost:4000/api/pools
```

Then look for `"suppliedToBlend"` in the JSON for each pool.

---

## 5. Note

- **bTokens** are held inside **Blend’s** contract. We only store **SuppliedToBlend** (XLM principal we sent). The API’s `suppliedToBlend` is that value (from backend store; update it via cron or PATCH from on-chain if needed).
- To see **Blend’s** own position value (principal + unrealized yield), you must call **Blend’s** contract (e.g. `get_positions(pool_contract_address)`).
