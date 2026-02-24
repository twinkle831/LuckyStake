# Deploy LuckyStake Backend on Render

The backend is a Node.js Express app. Render runs it as a **Web Service**. All configuration is via **Environment Variables** in the Render dashboard.

---

## 1. Push code and create the service

1. Push your repo (including the `backend` folder) to **GitHub**.
2. Go to [Render](https://render.com) → **Dashboard** → **New** → **Web Service**.
3. Connect your GitHub account if needed, then select the **repository** that contains LuckyStake.
4. Configure:
   - **Name:** e.g. `luckystake-api`
   - **Region:** Choose one close to your users.
   - **Root Directory:** `LuckyStake/backend` (or `backend` if the repo root is the backend).
   - **Runtime:** **Node**.
   - **Build Command:** `npm install`
   - **Start Command:** `npm start` (runs `node src/index.js` from package.json).

Do **not** deploy yet. Add environment variables first.

---

## 2. Environment variables (mainnet)

In the Render service: **Environment** tab → **Add Environment Variable**. Add these (replace placeholders with your values).

### Required

| Key | Value | Notes |
|-----|--------|--------|
| `NODE_ENV` | `production` | |
| `PORT` | (leave empty) | Render sets this automatically. |
| `JWT_SECRET` | (min 32 chars) | Strong random string for signing JWTs. |
| `STELLAR_NETWORK` | `mainnet` | |
| `STELLAR_RPC_URL` | `https://mainnet.sorobanrpc.com` | Soroban mainnet RPC (soroban-mainnet.stellar.org does not resolve). |
| `STELLAR_NETWORK_PASSPHRASE` | `Public Global Stellar Network ; September 2015` | |
| `STELLAR_HORIZON_URL` | `https://horizon.stellar.org` | |
| `POOL_CONTRACT_WEEKLY` | `CCEQRJQ4OLVLRRUS5SLJKGXDILYKISDV43HSBNP2QDUSIJ7ITWLHD73I` | Mainnet weekly pool. |
| `POOL_CONTRACT_BIWEEKLY` | `CCITIDSTLZHHGWRIAJK6JAVLMMYSJ7GUDFWOS4MNCILLZQOFWBT63DFB` | Mainnet biweekly pool. |
| `POOL_CONTRACT_MONTHLY` | `CDAPP7TW2CU4D75KM6HL2IJPQYGDXR77O7GSIRGX7H2GNBRNY6J4LVZY` | Mainnet monthly pool. |
| `CORS_ORIGINS` | `https://your-app.vercel.app` | Your Vercel frontend URL. Add multiple separated by commas if needed (e.g. `https://app.vercel.app,https://www.yourdomain.com`). |

### For draws (cron)

| Key | Value | Notes |
|-----|--------|--------|
| `ADMIN_SECRET_KEY` | `S...` | Stellar **secret key** for admin `GDPG33X6WH57VET5AQJJCMHWVBCNJU5VOVARUEWA77OLNHXGQQLT44E6` (signs harvest, execute_draw, withdraw_from_blend). |
| `ADMIN_KEY` | (secret string) | Used in `x-admin-key` header to call `/api/cron/run-draw-checks`. |

### Optional

| Key | Value | Notes |
|-----|--------|--------|
| `JWT_EXPIRY` | `7d` | JWT lifetime. |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 15 min window. |
| `RATE_LIMIT_MAX` | `100` | Max requests per window per IP. |
| `CRON_INTERVAL_MS` | `3600000` | 1 hour. Cron runs when `ADMIN_SECRET_KEY` is set. |
| `USE_ONCHAIN_PAYOUTS` | (leave unset or `true`) | `true` = users claim principal from contract; no admin XLM payouts. |

---

## 3. Deploy

1. Click **Create Web Service** (or **Save** then **Manual Deploy**).
2. Wait for the build and deploy to finish.
3. Note the service URL, e.g. `https://luckystake-api.onrender.com`.

---

## 4. Cron (draws) on Render

The app starts an in-process cron when `ADMIN_SECRET_KEY` is set. It runs every `CRON_INTERVAL_MS` (default 1 hour). No separate worker needed.

To trigger a draw manually (e.g. for testing):

```bash
curl -X POST "https://YOUR-RENDER-URL.onrender.com/api/cron/run-draw-checks" \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```

For production you can also use [Render Cron Jobs](https://render.com/docs/cronjobs) to hit this endpoint on a schedule, instead of the in-process timer.

---

## 5. After deploy

1. Set your **Vercel** frontend env var `NEXT_PUBLIC_API_URL` to this Render URL (e.g. `https://luckystake-api.onrender.com`). No trailing slash.
2. Ensure `CORS_ORIGINS` on Render includes your exact Vercel URL (and custom domain if you add one).
3. Test: open the Vercel app, connect wallet, deposit — the frontend should call the Render backend successfully.

---

## 6. Persistence (data folder)

The backend stores deposits and draw state in `data/store.json`. On Render, the filesystem is **ephemeral** — it may reset on redeploy. For production you may want to switch to a database (e.g. PostgreSQL on Render) and replace the file-based store. For an MVP, the in-memory/file store is fine; just be aware data can be lost on redeploy unless you add a persistent disk (Render paid feature) or a DB.
