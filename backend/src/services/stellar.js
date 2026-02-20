/**
 * routes/deposits.js
 *
 * Right now: records deposits in memory.
 * Smart contract hook is clearly marked — swap it in later.
 *
 * POST /api/deposits          — record a deposit (JWT required)
 * GET  /api/deposits/my       — get my deposits (JWT required)
 * POST /api/deposits/:id/withdraw — initiate withdrawal (JWT required)
 */

const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const auth = require("../middleware/auth");
const store = require("../services/store");

// ─── POST /api/deposits ───────────────────────────────────────────────────────
// Body: { poolType: "daily"|"weekly"|"monthly", amount: number, txHash: string }
//
// txHash is the Stellar transaction hash the user submitted before calling this.
// When you add smart contracts, you'll verify txHash on-chain here.
router.post("/", auth, async (req, res, next) => {
  try {
    const { poolType, amount, txHash } = req.body;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!poolType || amount == null || !txHash) {
      return res.status(400).json({ error: "poolType, amount, and txHash are required" });
    }
    if (!["daily", "weekly", "monthly"].includes(poolType)) {
      return res.status(400).json({ error: "poolType must be 'daily', 'weekly', or 'monthly'" });
    }
    if (typeof amount !== "number" || amount < 1) {
      return res.status(400).json({ error: "amount must be a number ≥ 1 (USDC)" });
    }

    // ── TODO: Smart Contract Hook ───────────────────────────────────────────
    // When you're ready to integrate Stellar smart contracts, replace this
    // comment block with:
    //
    //   const { server } = require("../services/stellar");
    //   const tx = await server.transactions().transaction(txHash).call();
    //   // verify tx.successful === true
    //   // verify the destination matches your pool contract address
    //   // verify the amount matches
    //
    // Until then, we trust the txHash the client sends (fine for dev).

    // ── Record deposit ──────────────────────────────────────────────────────
    const id = uuidv4();
    const deposit = {
      id,
      publicKey: req.publicKey,
      poolType,
      amount,
      txHash,
      tickets: Math.floor(amount), // 1 ticket per USDC
      depositedAt: new Date().toISOString(),
      withdrawnAt: null,
    };

    store.deposits.set(id, deposit);

    // Update pool totals
    const pool = store.pools.get(poolType);
    pool.totalDeposited += amount;
    pool.participants = countUniqueParticipants(poolType);

    // Update user totals
    const user = store.users.get(req.publicKey);
    if (user) {
      user.totalDeposited += amount;
      user.tickets += deposit.tickets;
    }

    // Broadcast real-time update to any open dashboard tabs
    const { broadcast } = require("../services/websocket");
    broadcast("pool_update", { poolType, pool });

    res.status(201).json({ message: "Deposit recorded", deposit });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/deposits/my ─────────────────────────────────────────────────────
router.get("/my", auth, (req, res) => {
  const deposits = Array.from(store.deposits.values())
    .filter((d) => d.publicKey === req.publicKey)
    .sort((a, b) => new Date(b.depositedAt) - new Date(a.depositedAt));

  const totalActive = deposits
    .filter((d) => !d.withdrawnAt)
    .reduce((sum, d) => sum + d.amount, 0);

  res.json({ deposits, totalActive });
});

// ─── POST /api/deposits/:id/withdraw ─────────────────────────────────────────
router.post("/:id/withdraw", auth, async (req, res, next) => {
  try {
    const deposit = store.deposits.get(req.params.id);

    if (!deposit)                             return res.status(404).json({ error: "Deposit not found" });
    if (deposit.publicKey !== req.publicKey)  return res.status(403).json({ error: "Not your deposit" });
    if (deposit.withdrawnAt)                  return res.status(400).json({ error: "Already withdrawn" });

    // ── TODO: Smart Contract Hook ───────────────────────────────────────────
    // When smart contracts are ready:
    //   1. Build an unsigned withdrawal XDR and return it to the frontend
    //   2. Frontend signs it with Freighter/xBull and submits to Stellar
    //   3. Frontend calls back with the txHash to confirm
    //   4. Only then mark withdrawnAt below

    deposit.withdrawnAt = new Date().toISOString();

    const pool = store.pools.get(deposit.poolType);
    pool.totalDeposited = Math.max(0, pool.totalDeposited - deposit.amount);
    pool.participants = countUniqueParticipants(deposit.poolType);

    const user = store.users.get(req.publicKey);
    if (user) {
      user.tickets = Math.max(0, user.tickets - deposit.tickets);
    }

    res.json({ message: "Withdrawal recorded", deposit });
  } catch (err) {
    next(err);
  }
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function countUniqueParticipants(poolType) {
  return new Set(
    Array.from(store.deposits.values())
      .filter((d) => d.poolType === poolType && !d.withdrawnAt)
      .map((d) => d.publicKey)
  ).size;
}

module.exports = router;