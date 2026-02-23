# LuckyStake – Test Commands (Deposit → Yield → Winner → Principal)

Use these to test the full flow: **deposit** → **yield (Blend)** → **draw (winner gets prize)** → **return of principal** (claim after draw).

---

## 0. Install Rust and Cargo (required for smart contract tests)

The contracts are written in Rust. You need **Rust** (which includes **Cargo**) to build and test them.

### Windows (PowerShell)

1. **Download the Rust installer**
   - Open: **https://rustup.rs**
   - Or direct Windows installer: **https://win.rustup.rs/x86_64** (64-bit) or **https://win.rustup.rs/i686** (32-bit).
   - Run **`rustup-init.exe`**.

2. **Run the installer**
   - Choose option **1** (default install).
   - When it finishes, it will say to restart your terminal (or run the command it shows so `cargo` is in your PATH).

3. **Restart your terminal**
   - Close and reopen PowerShell (or Cursor’s terminal), or run:
   ```powershell
   $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
   ```

4. **Check that Cargo is installed**
   ```powershell
   cargo --version
   ```
   You should see something like `cargo 1.x.x`.

5. **If `cargo` is still not found** after restarting, add Cargo to your PATH manually:
   - Cargo is usually installed in: `%USERPROFILE%\.cargo\bin` (e.g. `C:\Users\YourName\.cargo\bin`).
   - In PowerShell (run as your user):
     ```powershell
     [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:USERPROFILE\.cargo\bin", "User")
     ```
     Then close and reopen the terminal.

6. **Optional (only if you will build WASM for deployment)**
   ```powershell
   rustup target add wasm32-unknown-unknown
   ```
   Unit tests do **not** require this; only building the contract for Stellar does.

### macOS / Linux

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Then restart your terminal or run `source "$HOME/.cargo/env"` and run `cargo --version`.

---

## 1. Contract unit tests (Soroban)

From the **project root** (folder that contains `LuckyStake`), run:

**PowerShell (Windows):**
```powershell
cd LuckyStake\contracts
cargo test
```

**Bash / macOS / Linux:**
```bash
cd LuckyStake/contracts
cargo test
```

Tests run locally (no network). They cover: initialize, deposit, withdraw, add_prize, execute_draw, Blend helpers, and full flow (e.g. `test_full_flow_deposit_prize_draw_withdraw`).

---

## 2. Backend

**Env (required for draw/cron):** In `LuckyStake/backend/.env` set at least:

- `ADMIN_SECRET_KEY` = Stellar secret key (S...) of the pool admin
- `POOL_CONTRACT_WEEKLY` / `POOL_CONTRACT_BIWEEKLY` / `POOL_CONTRACT_MONTHLY` = deployed contract IDs
- Optional: `ADMIN_KEY` = secret for manual cron trigger; `USE_ONCHAIN_PAYOUTS` = leave unset or `true` for on-chain claim

**Install and start:**

```bash
cd LuckyStake/backend
npm install
node src/index.js
```

Backend runs at `http://localhost:4000` (or your `PORT`).

---

## 3. Frontend

**Env:** `LuckyStake/frontend/.env.local` or `.env` with:

- `NEXT_PUBLIC_API_URL=http://localhost:4000`
- `NEXT_PUBLIC_POOL_CONTRACT_WEEKLY` / `_BIWEEKLY` / `_MONTHLY` = same contract IDs as backend

**Install and start:**

```bash
cd LuckyStake/frontend
npm install
npm run dev
```

App at `http://localhost:3000`.

---

## 4. End-to-end flow (manual test)

### 4.1 Deposit

1. Open the app, connect wallet (Freighter/xBull, **testnet**).
2. Pick a pool (e.g. Weekly) → **Deposit** → enter amount → sign in wallet.
3. Confirm you see the deposit and a **real tx hash** (Stellar Expert link).

### 4.2 (Optional) Yield via Blend

- If Blend is configured: admin has already called `set_blend_pool` and `supply_to_blend` for the pool. Yield accrues in Blend; before a draw the cron calls `harvest_yield` (and `withdraw_from_blend` for principal). No extra commands needed if cron runs.
- To **manually** harvest / withdraw from Blend you’d call your backend or a script that invokes the contract (e.g. `harvest_yield`, `withdraw_from_blend`). Default cron does this when the draw runs.

### 4.3 Run the draw (when the pool’s draw time has passed)

Trigger the cron once (replace `YOUR_ADMIN_KEY` with `ADMIN_KEY` from backend `.env`):

```bash
curl -X POST "http://localhost:4000/api/cron/run-draw-checks" \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

Or wait for the scheduled cron (if `ADMIN_SECRET_KEY` is set, it runs every `CRON_INTERVAL_MS`).

**What the cron does:**

1. Optionally harvests yield into the prize fund.
2. Withdraws principal from Blend back to the contract (`withdraw_from_blend`).
3. Calls `execute_draw` on the contract → VRF picks winner, **prize (yield) sent to winner on-chain**.
4. Records the draw; users can **claim principal** from the frontend (no admin XLM when `USE_ONCHAIN_PAYOUTS` is on).

### 4.4 Return of principal (winners and losers)

1. In the app, open **Dashboard** (or the pool detail).
2. After the draw, you should see **“Claim principal”** for that pool (and the modal says “Draw is over”).
3. Click **Claim principal** → sign **contract `withdraw()`** in your wallet.
4. Confirm you receive the principal in your wallet and a **real tx hash** (and “View on Stellar Expert”).

Winners: they already received the **prize** on-chain at draw time; “Claim principal” gives them their **principal** back. Losers: “Claim principal” is the only step (principal only).

---

## 5. Quick command summary

| Step              | Command / action |
|-------------------|------------------|
| Contract tests    | `cd LuckyStake/contracts && cargo test` |
| Start backend     | `cd LuckyStake/backend && node src/index.js` |
| Start frontend   | `cd LuckyStake/frontend && npm run dev` |
| Trigger draw     | `curl -X POST "http://localhost:4000/api/cron/run-draw-checks" -H "x-admin-key: YOUR_ADMIN_KEY"` |
| Deposit          | In app: connect wallet → pool → Deposit → sign |
| Claim principal  | In app: after draw → Dashboard → “Claim principal” → sign |

---

## 6. Troubleshooting

- **“Claim principal” not showing:** Draw must have run for that pool and your deposit must be in that draw window. Run the cron (step 4.3) and refresh; ensure backend returns `claimable: true` for that deposit in `GET /api/deposits/my`.
- **Draw fails (e.g. no prize):** Ensure there is yield in the prize fund (e.g. `harvest_yield` was run or `add_prize` was used) and the contract has deposits/tickets.
- **withdraw_from_blend fails:** Blend may have low liquidity or the pool may not have supplied to Blend; check `get_supplied_to_blend` and Blend docs.
- **Contract not found:** Ensure `POOL_CONTRACT_*` and `NEXT_PUBLIC_POOL_CONTRACT_*` match your deployed contract IDs on the same network (testnet/mainnet).
