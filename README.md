# LuckyStake

A decentralized savings platform on **Stellar** where users deposit into daily, weekly, or monthly pools, earn tickets based on amount and lock period, and one winner per draw receives the **yield** (prize) while everyone gets their **principal** back. Funds are held in Soroban smart contracts and can earn yield via Blend; draws use on-chain VRF for fair winner selection.

---

## What’s in this repo

| Folder | Description |
|--------|-------------|
| **`contracts/`** | Soroban (Rust) pool contracts: deposit, withdraw, execute_draw, Blend integration |
| **`backend/`** | Node.js API: auth, deposit records, cron (draw + harvest), payout/claim recording |
| **`frontend/`** | Next.js app: connect wallet, deposit, claim principal, dashboard, transaction history |

---

## Prerequisites

- **Node.js** 18+ (backend + frontend)
- **Rust / Cargo** (only for contract tests; see [TEST_COMMANDS.md](TEST_COMMANDS.md))
- **Stellar wallet** (Freighter or xBull) on testnet or mainnet

---

## Flow: Test locally → Deploy

1. **Set env** – Backend: `backend/.env`. Frontend: `frontend/.env.local` (copy from `frontend/.env.example`).
2. **Run locally** – Start backend (`cd backend && node src/index.js`), then frontend (`cd frontend && npm run dev`).
3. **Test** – Open http://localhost:3000, connect wallet, deposit, (trigger draw if needed), claim principal. Confirm tx hashes and balances.
4. **Deploy** – Deploy backend to your host; deploy frontend to Vercel with the same env (and `NEXT_PUBLIC_API_URL` = your backend URL).

Details are below.

---

## 1. Test locally (full flow)

Use this flow after setting env: run backend and frontend, then test in the browser.

### 1.1 Backend env

Create `backend/.env` (copy from below or from your existing setup). **Do not commit `.env`.**

```env
# Required
JWT_SECRET=your-jwt-secret-min-32-chars
PORT=4000
STELLAR_NETWORK=mainnet
STELLAR_RPC_URL=https://soroban-mainnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
STELLAR_HORIZON_URL=https://horizon.stellar.org

# Pool contracts (mainnet)
POOL_CONTRACT_WEEKLY=CCQGF2HFSPVIVCHHQJUS77GRP6PQI7BJZ2UYJMBGHIEZ72J235MZAKS4
POOL_CONTRACT_BIWEEKLY=CCZPV44WKSHPMGAADPA3BJGGWWGBRIXIQDLICSNV3CE3XM6DKLJGSTSR
POOL_CONTRACT_MONTHLY=CBPQUON5Y5P3LYQRPGSSO3KNH3HLOGM4RKJSKH6JJOQVSWSRQUIOPX72

# For draws (cron)
ADMIN_SECRET_KEY=S...your-admin-secret...
ADMIN_KEY=your-cron-secret
```

For **testnet**, set `STELLAR_NETWORK=testnet`, `STELLAR_RPC_URL=https://soroban-testnet.stellar.org`, `STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015`, and use your testnet contract IDs.

### 1.2 Frontend env

Create `frontend/.env.local` (or copy `frontend/.env.example` to `.env.local`). **Do not commit `.env.local`.**

**Mainnet (matches backend above):**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-mainnet.stellar.org
NEXT_PUBLIC_POOL_CONTRACT_WEEKLY=CCQGF2HFSPVIVCHHQJUS77GRP6PQI7BJZ2UYJMBGHIEZ72J235MZAKS4
NEXT_PUBLIC_POOL_CONTRACT_BIWEEKLY=CCZPV44WKSHPMGAADPA3BJGGWWGBRIXIQDLICSNV3CE3XM6DKLJGSTSR
NEXT_PUBLIC_POOL_CONTRACT_MONTHLY=CBPQUON5Y5P3LYQRPGSSO3KNH3HLOGM4RKJSKH6JJOQVSWSRQUIOPX72
```

For **testnet**, use `NEXT_PUBLIC_STELLAR_NETWORK=testnet` and testnet RPC/passphrase/contract IDs.

### 1.3 Run backend and frontend

**Terminal 1 – backend**

```bash
cd backend
npm install
node src/index.js
```

Backend: **http://localhost:4000**

**Terminal 2 – frontend**

```bash
cd frontend
npm install
npm run dev
```

Frontend: **http://localhost:3000**

### 1.4 Test in the browser

1. Open **http://localhost:3000**, connect your Stellar wallet (same network as env: mainnet or testnet).
2. **Deposit:** pick a pool → Deposit → enter amount → sign in wallet. Check the transaction hash and Stellar Expert link.
3. **Draw (when period ended):** trigger cron (see [TEST_COMMANDS.md](TEST_COMMANDS.md)) or wait for scheduled cron. Winner gets prize on-chain; all depositors can claim principal.
4. **Claim principal:** Dashboard → “Claim principal” for the pool → sign contract `withdraw()` → confirm principal and tx hash in wallet.

If everything works locally, you’re ready to deploy.

---

## 2. Deploy (mainnet)

Deploy **backend first**, then **frontend**, so the frontend can point to the live API.

### Backend (Render)

1. Push the repo to GitHub.
2. Follow **[backend/RENDER_DEPLOY.md](backend/RENDER_DEPLOY.md)** to create a Web Service on Render: set root to `LuckyStake/backend` (or `backend`), add all env vars (mainnet RPC, Horizon, pool contract IDs, `JWT_SECRET`, `CORS_ORIGINS` = your Vercel URL, `ADMIN_SECRET_KEY` and `ADMIN_KEY` for draws).
3. Deploy and note the backend URL (e.g. `https://luckystake-api.onrender.com`).

### Frontend (Vercel)

1. In [Vercel](https://vercel.com), import the repo and set **Root Directory** to `LuckyStake/frontend` (or `frontend`).
2. In **Settings → Environment Variables**, add the vars from **1.2** and set `NEXT_PUBLIC_API_URL` to your **Render backend URL** (no trailing slash).
3. Deploy. The app uses mainnet by default.

Full step-by-step: **[frontend/VERCEL_DEPLOY.md](frontend/VERCEL_DEPLOY.md)**.

### After deploy

- Set **Render** `CORS_ORIGINS` to your Vercel URL (e.g. `https://your-app.vercel.app`).
- Open the Vercel URL, connect wallet (mainnet), and test: deposit, draw (cron or manual trigger), claim principal.

---

## Docs in this repo

| File | Purpose |
|------|--------|
| [TEST_COMMANDS.md](TEST_COMMANDS.md) | Contract tests (Rust), backend/frontend commands, E2E test flow, troubleshooting |
| [backend/RENDER_DEPLOY.md](backend/RENDER_DEPLOY.md) | Deploy backend on Render (mainnet) |
| [frontend/VERCEL_DEPLOY.md](frontend/VERCEL_DEPLOY.md) | Deploy frontend on Vercel (mainnet) |
| [NEXT_STEPS.md](NEXT_STEPS.md) | Integration checklist (if present) |
| [backend/CRON_README.md](backend/CRON_README.md) | Cron setup for draws |
| [contracts/](contracts/) | Contract build, test, deploy (see contracts’ README/QUICK_START) |

---

## Quick command reference

| Task | Command |
|------|--------|
| Contract tests | `cd contracts && cargo test` |
| Start backend | `cd backend && npm install && node src/index.js` |
| Start frontend | `cd frontend && npm install && npm run dev` |
| Trigger draw | `curl -X POST "http://localhost:4000/api/cron/run-draw-checks" -H "x-admin-key: YOUR_ADMIN_KEY"` |

---

## License

Private / as per your project terms.
