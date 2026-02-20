const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const auth = require("../middleware/auth");
const store = require("../services/store");
const { getAccountDetails } = require("../services/stellar");

/**
 * POST /api/deposits
 * Record a deposit after user submits signed tx
 * 
 * Body: { poolType, amount, txHash }
 */
router.post("/", auth, async (req, res, next) => {
  try {
    const { poolType, amount, txHash } = req.body;

    if (!poolType || !amount || !txHash) {
      return res.status(400).json({ error: "poolType, amount, and txHash are required" });
    }
    if (!["daily", "weekly", "monthly"].includes(poolType)) {
      return res.status(400).json({ error: "Invalid poolType" });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }
    if (amount < 1) {
      return res.status(400).json({ error: "Minimum deposit is 1 USDC" });
    }

    // In production: verify txHash on-chain here
    // const txRecord = await server.transactions().transaction(txHash).call();
    // Verify amount, destination, asset type match

    const depositId = uuidv4();
    const deposit = {
      id: depositId,
      publicKey: req.publicKey,
      poolType,
      amount,
      txHash,
      depositedAt: new Date().toISOString(),
      withdrawnAt: null,
      tickets: Math.floor(amount),
    };

    store.deposits.set(depositId, deposit);

    // Update pool
    const pool = store.pools.get(poolType);
    pool.totalDeposited += amount;
    pool.participants = new Set(
      Array.from(store.deposits.values())
        .filter((d) => d.poolType === poolType && !d.withdrawnAt)
        .map((d) => d.publicKey)
    ).size;

    // Update user
    const user = store.users.get(req.publicKey);
    if (user) {
      user.totalDeposited += amount;
      user.tickets += Math.floor(amount);
    }

    // Broadcast to WebSocket subscribers
    const { broadcast } = require("../services/websocket");
    broadcast("pool_update", { poolType, pool });

    res.status(201).json({
      message: "Deposit recorded successfully",
      deposit,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/deposits/my
 * Get current user's deposits
 */
router.get("/my", auth, (req, res) => {
  const deposits = Array.from(store.deposits.values())
    .filter((d) => d.publicKey === req.publicKey)
    .sort((a, b) => new Date(b.depositedAt) - new Date(a.depositedAt));

  const totalActive = deposits
    .filter((d) => !d.withdrawnAt)
    .reduce((sum, d) => sum + d.amount, 0);

  res.json({ deposits, totalActive, count: deposits.length });
});

/**
 * POST /api/deposits/:id/withdraw
 * Initiate withdrawal - returns unsigned tx for user to sign
 */
router.post("/:id/withdraw", auth, async (req, res, next) => {
  try {
    const deposit = store.deposits.get(req.params.id);

    if (!deposit) return res.status(404).json({ error: "Deposit not found" });
    if (deposit.publicKey !== req.publicKey) {
      return res.status(403).json({ error: "Not your deposit" });
    }
    if (deposit.withdrawnAt) {
      return res.status(400).json({ error: "Already withdrawn" });
    }

    // In production: build and return unsigned withdrawal XDR
    // const withdrawXDR = await buildWithdrawalTransaction(deposit);

    // Mark withdrawn (in production, do this after confirming on-chain)
    deposit.withdrawnAt = new Date().toISOString();

    const pool = store.pools.get(deposit.poolType);
    pool.totalDeposited = Math.max(0, pool.totalDeposited - deposit.amount);

    const user = store.users.get(req.publicKey);
    if (user) {
      user.totalWithdrawn = (user.totalWithdrawn || 0) + deposit.amount;
      user.tickets = Math.max(0, user.tickets - deposit.tickets);
    }

    res.json({
      message: "Withdrawal initiated",
      deposit,
      // withdrawXDR  <- would return this for signing
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;