# Deploy LuckyStake Frontend to Vercel

Deploy the Next.js frontend after the backend is live (e.g. on Render). The frontend needs `NEXT_PUBLIC_API_URL` pointing to that backend.

---

## 1. Deploy backend first

Deploy the backend (e.g. [Render – see backend/RENDER_DEPLOY.md](../backend/RENDER_DEPLOY.md)). Note the backend URL, e.g. `https://luckystake-api.onrender.com`. You will use it in step 3.

---

## 2. Connect repository to Vercel

1. Push the LuckyStake repo to **GitHub**.
2. Go to [Vercel](https://vercel.com) → **Add New** → **Project**.
3. Import your GitHub repository.
4. Set **Root Directory** to `LuckyStake/frontend` (or `frontend` if your repo root is the frontend only). Click **Edit** next to Root Directory and enter it.
5. Do **not** deploy yet — add environment variables first (step 3).

---

## 3. Environment variables (mainnet)

In Vercel: **Project → Settings → Environment Variables**. Add these for **Production** (and optionally for Preview):

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.onrender.com` | Your Render (or other) backend URL. **No trailing slash.** |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `mainnet` | |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | `Public Global Stellar Network ; September 2015` | Mainnet passphrase. |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | `https://mainnet.sorobanrpc.com` | Stellar mainnet Soroban RPC. |
| `NEXT_PUBLIC_POOL_CONTRACT_WEEKLY` | `CCEQRJQ4OLVLRRUS5SLJKGXDILYKISDV43HSBNP2QDUSIJ7ITWLHD73I` | Mainnet weekly pool. |
| `NEXT_PUBLIC_POOL_CONTRACT_BIWEEKLY` | `CCITIDSTLZHHGWRIAJK6JAVLMMYSJ7GUDFWOS4MNCILLZQOFWBT63DFB` | Mainnet biweekly pool. |
| `NEXT_PUBLIC_POOL_CONTRACT_MONTHLY` | `CDAPP7TW2CU4D75KM6HL2IJPQYGDXR77O7GSIRGX7H2GNBRNY6J4LVZY` | Mainnet monthly pool. |

Replace `https://your-backend.onrender.com` with your actual backend URL (e.g. from Render).

---

## 4. Build settings

- **Framework Preset:** Next.js (auto-detected).
- **Build Command:** `npm run build` (default).
- **Output Directory:** default (`.next`).
- **Install Command:** `npm install`.

---

## 5. Deploy

1. Click **Deploy** (or **Redeploy** after changing env vars).
2. Wait for the build to finish. Vercel will show a URL like `https://your-app.vercel.app`.
3. On **Render**, set `CORS_ORIGINS` to include this Vercel URL (e.g. `https://your-app.vercel.app`) so the backend accepts requests from the frontend.

---

## 6. Post-deploy check

1. Open your Vercel URL in the browser.
2. Connect a Stellar wallet (mainnet). The banner should show **Connected to Stellar Mainnet**.
3. Test **deposit**: choose a pool → Deposit → enter amount → sign in wallet. Confirm the transaction and that the backend records it.
4. Test **claim principal** (after a draw): Dashboard → Claim principal → sign `withdraw()` in wallet.

If any step fails, check: `NEXT_PUBLIC_API_URL` is correct, backend is running, and `CORS_ORIGINS` on the backend includes your Vercel URL.
