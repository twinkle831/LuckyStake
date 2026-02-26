# LuckyStake – Setup & Workflow Guide

Step-by-step setup for local development and what to put in each service.

---

## Overview

| Service | Port | Purpose |
|--------|------|--------|
| **Backend** (Express) | 4000 | Auth, pools, deposits, draws, wallet, cron |
| **Agent API** (FastAPI) | 8000 | AI Agent chat, strategy, conversation history |
| **Frontend** (Next.js) | 3000 | App UI, wallet connect, deposits, AI Agent chat |

**Run order:** Backend → Agent API → Frontend (Agent API needs Backend for pool data).

---

## Prerequisites

- **Node.js** 18+ (backend + frontend)
- **Python** 3.10+ (agent-api)
- **Rust/Cargo** (only if building/testing contracts)
- **Stellar wallet** (Freighter or xBull) on mainnet or testnet

---

## 1. Backend (Express)

### 1.1 Install

```bash
cd LuckyStake/backend
npm install
```

### 1.2 Environment

Create **`backend/.env`** (do not commit). Copy from below or from `backend/.env.example` if present.

| Variable | Required | What to put |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Random string, min 32 chars (e.g. `openssl rand -hex 32`) |
| `PORT` | | Default `4000` |
| `STELLAR_NETWORK` | ✅ | `mainnet` or `testnet` |
| `STELLAR_RPC_URL` | ✅ | Mainnet: `https://mainnet.sorobanrpc.com` · Testnet: `https://soroban-testnet.stellar.org` |
| `STELLAR_NETWORK_PASSPHRASE` | ✅ | Mainnet: `Public Global Stellar Network ; September 2015` · Testnet: `Test SDF Network ; September 2015` |
| `STELLAR_HORIZON_URL` | ✅ | Mainnet: `https://horizon.stellar.org` |
| `POOL_CONTRACT_WEEKLY` | ✅ | Deployed weekly pool contract ID |
| `POOL_CONTRACT_BIWEEKLY` | ✅ | Deployed biweekly pool contract ID |
| `POOL_CONTRACT_MONTHLY` | ✅ | Deployed monthly pool contract ID |
| `ADMIN_SECRET_KEY` | For cron/draws | Stellar secret key (S...) for admin (harvest, execute_draw) |
| `ADMIN_KEY` | For cron | Secret for cron webhook / run-draw endpoint |
| `CORS_ORIGINS` | Prod | Frontend origin(s), e.g. `https://your-app.vercel.app` |

**Example `backend/.env` (mainnet):**

```env
JWT_SECRET=your-jwt-secret-at-least-32-characters-long
PORT=4000
STELLAR_NETWORK=mainnet
STELLAR_RPC_URL=https://mainnet.sorobanrpc.com
STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
STELLAR_HORIZON_URL=https://horizon.stellar.org

POOL_CONTRACT_WEEKLY=CCEQRJQ4OLVLRRUS5SLJKGXDILYKISDV43HSBNP2QDUSIJ7ITWLHD73I
POOL_CONTRACT_BIWEEKLY=CCITIDSTLZHHGWRIAJK6JAVLMMYSJ7GUDFWOS4MNCILLZQOFWBT63DFB
POOL_CONTRACT_MONTHLY=CDAPP7TW2CU4D75KM6HL2IJPQYGDXR77O7GSIRGX7H2GNBRNY6J4LVZY

ADMIN_SECRET_KEY=S...your-admin-secret...
ADMIN_KEY=your-cron-secret
```

### 1.3 Run

```bash
cd LuckyStake/backend
node src/index.js
```

Backend: **http://localhost:4000**

---

## 2. Agent API (FastAPI)

### 2.1 Install

```bash
cd LuckyStake/agent-api
pip install -r requirements.txt
```

Or use a venv:

```bash
cd LuckyStake/agent-api
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

### 2.2 Environment

Create **`agent-api/.env`** (optional). Copy from **`agent-api/.env.example`**.

| Variable | Required | What to put |
|----------|----------|-------------|
| `LUCKSTAKE_BACKEND_URL` | | Express API URL. Local: `http://localhost:4000` |
| `AGENT_DATA_DIR` | | Folder for conversation JSON files. Default: `agent-api/data` |
| `AWS_ACCESS_KEY_ID` | For Bedrock | AWS access key (AI replies via Claude) |
| `AWS_SECRET_ACCESS_KEY` | For Bedrock | AWS secret key |
| `AWS_REGION` | For Bedrock | e.g. `us-east-1` |
| `BEDROCK_MODEL_ID` | For Bedrock | e.g. `anthropic.claude-3-haiku-20240307-v1:0` |

- **Without AWS:** Agent uses the built-in rule-based flow (no keys needed).
- **With AWS:** Set the three `AWS_*` vars (and optionally `BEDROCK_MODEL_ID`) to use Bedrock for chat.

**Example `agent-api/.env` (local, no AWS):**

```env
LUCKSTAKE_BACKEND_URL=http://localhost:4000
```

**Example with AWS Bedrock:**

```env
LUCKSTAKE_BACKEND_URL=http://localhost:4000
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

### 2.3 Run

```bash
cd LuckyStake/agent-api
uvicorn app.main:app --reload --port 8000
```

Or:

```bash
python run.py
```

Agent API: **http://localhost:8000**  
Docs: **http://localhost:8000/docs**

---

## 3. Frontend (Next.js)

### 3.1 Install

```bash
cd LuckyStake/frontend
npm install
```

### 3.2 Environment

Create **`frontend/.env.local`** (do not commit). Copy from **`frontend/.env.example`**.

| Variable | Required | What to put |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend URL. Local: `http://localhost:4000` |
| `NEXT_PUBLIC_AGENT_API_URL` | | Agent API URL. Local: `http://localhost:8000` (default if unset) |
| `NEXT_PUBLIC_STELLAR_NETWORK` | ✅ | `mainnet` or `testnet` |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | ✅ | Same as backend passphrase |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | ✅ | Same network as backend |
| `NEXT_PUBLIC_POOL_CONTRACT_WEEKLY` | ✅ | Same as backend weekly contract |
| `NEXT_PUBLIC_POOL_CONTRACT_BIWEEKLY` | ✅ | Same as backend biweekly contract |
| `NEXT_PUBLIC_POOL_CONTRACT_MONTHLY` | ✅ | Same as backend monthly contract |

**Example `frontend/.env.local` (local, all three services):**

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8000

NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
NEXT_PUBLIC_STELLAR_RPC_URL=https://mainnet.sorobanrpc.com

NEXT_PUBLIC_POOL_CONTRACT_WEEKLY=CCEQRJQ4OLVLRRUS5SLJKGXDILYKISDV43HSBNP2QDUSIJ7ITWLHD73I
NEXT_PUBLIC_POOL_CONTRACT_BIWEEKLY=CCITIDSTLZHHGWRIAJK6JAVLMMYSJ7GUDFWOS4MNCILLZQOFWBT63DFB
NEXT_PUBLIC_POOL_CONTRACT_MONTHLY=CDAPP7TW2CU4D75KM6HL2IJPQYGDXR77O7GSIRGX7H2GNBRNY6J4LVZY
```

### 3.3 Run

```bash
cd LuckyStake/frontend
npm run dev
```

Frontend: **http://localhost:3000**

---

## 4. Full local workflow

### One-time setup

1. **Backend:** `backend/.env` with JWT, Stellar, pool contracts (and admin keys if using cron).
2. **Agent API:** `agent-api/.env` with `LUCKSTAKE_BACKEND_URL=http://localhost:4000` (and AWS keys if using Bedrock).
3. **Frontend:** `frontend/.env.local` with API URLs and Stellar + pool contract IDs (match backend network and contracts).

### Start (three terminals)

| Terminal | Command | URL |
|----------|---------|-----|
| 1 | `cd backend && node src/index.js` | http://localhost:4000 |
| 2 | `cd agent-api && uvicorn app.main:app --reload --port 8000` | http://localhost:8000 |
| 3 | `cd frontend && npm run dev` | http://localhost:3000 |

### Test

1. Open **http://localhost:3000**.
2. Connect wallet (same network as env).
3. **Pools:** deposit, view draws.
4. **AI Agent:** click “AI Agent”, answer lock time → gas tolerance → preference → amount; check strategy and history.

---

## 5. Deploy (production)

### Backend

- Deploy to Render/Railway/etc. Set env as in **§ 1.2**; set `CORS_ORIGINS` to your frontend URL.
- Note the backend URL (e.g. `https://luckystake-api.onrender.com`).

### Agent API

- Deploy to any host that runs Python (e.g. Railway, Render, AWS). Set:
  - `LUCKSTAKE_BACKEND_URL` = production backend URL.
  - Optionally AWS vars for Bedrock.
- Note the agent URL (e.g. `https://luckystake-agent.railway.app`).

### Frontend

- Deploy to Vercel. In **Settings → Environment Variables** set:
  - `NEXT_PUBLIC_API_URL` = production backend URL.
  - `NEXT_PUBLIC_AGENT_API_URL` = production agent API URL.
  - Same Stellar and pool contract vars as backend (mainnet).

---

## 6. Quick reference – what to put where

| What | Backend `.env` | Agent API `.env` | Frontend `.env.local` |
|------|----------------|------------------|------------------------|
| Backend URL | — | `LUCKSTAKE_BACKEND_URL=http://localhost:4000` | `NEXT_PUBLIC_API_URL=http://localhost:4000` |
| Agent API URL | — | — | `NEXT_PUBLIC_AGENT_API_URL=http://localhost:8000` |
| Stellar network/RPC/passphrase | ✅ | — | ✅ (same as backend) |
| Pool contract IDs | ✅ | — | ✅ (same as backend) |
| JWT secret | ✅ | — | — |
| Admin / cron | ✅ (if using cron) | — | — |
| AWS (Bedrock) | — | ✅ (optional) | — |

---

## 7. Troubleshooting

| Issue | Check |
|-------|--------|
| Frontend can’t reach backend | Backend running on 4000; `NEXT_PUBLIC_API_URL` correct; CORS allows frontend origin. |
| AI Agent “Could not load conversation” | Agent API running on 8000; `NEXT_PUBLIC_AGENT_API_URL` correct; wallet connected (history is per wallet). |
| Agent “Could not load” or no strategy | Backend running; `LUCKSTAKE_BACKEND_URL` points to backend; `/api/pools` returns data. |
| Deposits fail (contract) | Pool contracts initialized (e.g. `npm run init-pools` from backend); contract IDs match in backend and frontend. |

For more: [README.md](README.md), [backend/CRON_README.md](backend/CRON_README.md), [agent-api/README.md](agent-api/README.md).
