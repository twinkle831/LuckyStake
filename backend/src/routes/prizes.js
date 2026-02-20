const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const store = require("../services/store");
const auth = require("../middleware/auth");

/**
 * GET /api/prizes
 * Public prize history
 */
router.get("/", (req, res) => {
  const prizes = Array.from(store.prizes.values())
    .sort((a, b) => new Date(b.drawnAt) - new Date(a.drawnAt))
    .slice(0, 50); // last 50

  res.json({ prizes, count: store.prizes.size });
});

/**
 * GET /api/prizes/my  (authenticated)
 * User's prize winnings
 */
router.get("/my", auth, (req, res) => {
  const myPrizes = Array.from(store.prizes.values())
    .filter((p) => p.winner === req.publicKey)
    .sort((a, b) => new Date(b.drawnAt) - new Date(a.drawnAt));

  const totalWon = myPrizes.reduce((sum, p) => sum + p.amount, 0);
  res.json({ prizes: myPrizes, totalWon, count: myPrizes.length });
});

/**
 * POST /api/prizes/draw  (admin/cron endpoint)
 * Trigger a prize draw for a pool.
 * In production: protect with admin key or run as a cron job.
 */
router.post("/draw", async (req, res, next) => {
  try {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== process.env.ADMIN_KEY && process.env.NODE_ENV !== "development") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { poolType } = req.body;
    if (!["daily", "weekly", "monthly"].includes(poolType)) {
      return res.status(400).json({ error: "Invalid poolType" });
    }

    const pool = store.pools.get(poolType);
    if (pool.yieldAccrued <= 0) {
      return res.status(400).json({ error: "No yield accrued to distribute" });
    }

    // Collect all active tickets for this pool
    const activeDeposits = Array.from(store.deposits.values()).filter(
      (d) => d.poolType === poolType && !d.withdrawnAt
    );

    if (activeDeposits.length === 0) {
      return res.status(400).json({ error: "No participants in pool" });
    }

    // Weighted random selection (more tickets = better odds)
    const tickets = activeDeposits.flatMap((d) =>
      Array(d.tickets).fill(d.publicKey)
    );
    const winner = tickets[Math.floor(Math.random() * tickets.length)];
    const prizeAmount = pool.yieldAccrued;

    // Record prize
    const prizeId = uuidv4();
    const prize = {
      id: prizeId,
      winner,
      amount: prizeAmount,
      poolType,
      drawnAt: new Date().toISOString(),
      txHash: null, // set after on-chain transfer
      participants: activeDeposits.length,
      totalTickets: tickets.length,
    };
    store.prizes.set(prizeId, prize);

    // Reset yield
    pool.yieldAccrued = 0;
    pool.prizeHistory.push({ amount: prizeAmount, winner, drawnAt: prize.drawnAt });

    // Broadcast result
    const { broadcast } = require("../services/websocket");
    broadcast("prize_drawn", { poolType, prize });

    res.json({ message: "Draw complete", prize });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/prizes/accrue-yield  (admin/cron endpoint)
 * Simulate yield accrual (replace with real Blend/AMM integration)
 */
router.post("/accrue-yield", (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_KEY && process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Simulate ~5% APY
  for (const [type, pool] of store.pools.entries()) {
    if (pool.totalDeposited > 0) {
      const dailyYield = pool.totalDeposited * (0.05 / 365);
      pool.yieldAccrued += dailyYield;
    }
  }

  const { broadcast } = require("../services/websocket");
  broadcast("yield_update", {
    pools: Object.fromEntries(
      Array.from(store.pools.entries()).map(([k, v]) => [k, { yieldAccrued: v.yieldAccrued }])
    ),
  });

  res.json({ message: "Yield accrued", pools: Object.fromEntries(store.pools) });
});

module.exports = router;