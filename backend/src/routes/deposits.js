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
const { verifyDepositTransaction } = require("../services/stellar-service");

// ─── POST /api/deposits ───────────────────────────────────────────────────────
// Body: { poolType: "weekly"|"biweekly"|"monthly", amount: number, txHash: string }
//
// txHash is the Stellar transaction hash the user submitted before calling this.
// When you add smart contracts, you'll verify txHash on-chain here.
router.post("/", auth, async (req, res, next) => {
  try {
    const { poolType: rawPoolType, amount: rawAmount, txHash } = req.body;
    const amount = typeof rawAmount === "string" ? parseFloat(rawAmount, 10) : Number(rawAmount);
    const poolType = rawPoolType ? String(rawPoolType).toLowerCase() : "";

    // ── Validation ─────────────────────────────────────────────────────────
    if (!poolType || (amount == null || Number.isNaN(amount)) || !txHash) {
      return res.status(400).json({ error: "poolType, amount, and txHash are required" });
    }
    if (!["weekly", "biweekly", "monthly"].includes(poolType)) {
      return res.status(400).json({ error: "poolType must be 'weekly', 'biweekly', or 'monthly'" });
    }
    if (typeof amount !== "number" || amount < 0.0000001) {
      return res.status(400).json({ error: "amount must be a number ≥ 0.0000001 (XLM)" });
    }

    // ── Verify transaction on-chain ─────────────────────────────────────────
    let verified;
    try {
      verified = await verifyDepositTransaction(txHash, poolType, amount, req.publicKey);
    } catch (verifyError) {
      return res.status(400).json({
        error: `Transaction verification failed: ${verifyError.message}`
      });
    }

    // Verify depositor matches authenticated user
    if (verified.depositor !== req.publicKey) {
      return res.status(403).json({
        error: "Transaction depositor does not match authenticated user"
      });
    }

    // Calculate tickets based on pool type (tickets scale with lock period)
    const ticketMultipliers = {
      weekly: 7,
      biweekly: 15,
      monthly: 30,
    };
    const tickets = Math.floor(amount * (ticketMultipliers[poolType] || 7));

    // ── Record deposit ──────────────────────────────────────────────────────
    const id = uuidv4();
    const deposit = {
      id,
      publicKey: verified.depositor,
      poolType,
      amount: verified.amount,
      txHash,
      tickets,
      depositedAt: verified.timestamp.toISOString(),
      withdrawnAt: null,
      ledger: verified.ledger,
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

    if (!deposit) return res.status(404).json({ error: "Deposit not found" });
    if (deposit.publicKey !== req.publicKey) return res.status(403).json({ error: "Not your deposit" });
    if (deposit.withdrawnAt) return res.status(400).json({ error: "Already withdrawn" });

    // ── Send real XLM back to the depositor via Horizon ─────────────────────
    // This uses the admin account (which holds the pooled funds) to refund
    // the exact deposited amount to the user's wallet.
    const { sendXLMPayment } = require("../services/payout-service");
    let txHash;
    try {
      const tag = deposit.poolType.charAt(0).toUpperCase() + deposit.poolType.slice(1);
      const result = await sendXLMPayment(
        deposit.publicKey,
        deposit.amount,
        `LuckyStake ${tag} Withdraw`
      );
      txHash = result.txHash;
      console.log(`[withdraw] Sent ${deposit.amount} XLM → ${deposit.publicKey.slice(0, 8)} | tx: ${txHash}`);
    } catch (payErr) {
      console.error("[withdraw] XLM payment failed:", payErr.message);
      return res.status(502).json({
        error: "XLM refund failed — your deposit is still active",
        detail: payErr.message,
      });
    }

    // ── Mark deposit withdrawn and persist ───────────────────────────────────
    const now = new Date().toISOString();
    deposit.withdrawnAt = now;
    deposit.payoutAt = now;
    deposit.payoutTxHash = txHash;
    deposit.payoutType = "refund";

    const pool = store.pools.get(deposit.poolType);
    if (pool) {
      pool.totalDeposited = Math.max(0, pool.totalDeposited - deposit.amount);
      pool.participants = countUniqueParticipants(deposit.poolType);
    }

    const user = store.users.get(req.publicKey);
    if (user) {
      user.tickets = Math.max(0, user.tickets - deposit.tickets);
    }

    store.persist();

    res.json({ message: "Withdrawal complete", deposit, txHash });
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

/**
 * GET /api/deposits/history
 * Full transaction history for the authenticated user, sourced from the
 * persistent backend store. Survives logout and page refresh.
 * Returns deposits (including payout info) in descending time order.
 */
router.get("/history", auth, (req, res) => {
  const all = Array.from(store.deposits.values())
    .filter((d) => d.publicKey === req.publicKey)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const history = all.map((d) => ({
    id: d.id,
    poolType: d.poolType,
    amount: d.amount,
    tickets: d.tickets,
    txHash: d.txHash,
    createdAt: d.createdAt,
    withdrawnAt: d.withdrawnAt ?? null,
    // Payout info (set after draw)
    payoutAt: d.payoutAt ?? null,
    payoutTxHash: d.payoutTxHash ?? null,
    payoutType: d.payoutType ?? null,   // "win" | "refund" | null
    status: d.withdrawnAt ? "settled" : "active",
  }));

  res.json({ history, count: history.length });
});

module.exports = router;