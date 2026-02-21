const express = require("express");
const router = express.Router();
const store = require("../services/store");
const auth = require("../middleware/auth");

/**
 * GET /api/pools
 * Get all pool stats (public). Includes suppliedToBlend (amount deployed to Blend).
 */
router.get("/", (req, res) => {
  const pools = Array.from(store.pools.values()).map((pool) => ({
    ...pool,
    estimatedAPY: pool.type === "weekly" ? 5.8 : pool.type === "biweekly" ? 6.2 : 7.1,
    currency: "XLM",
    suppliedToBlend: pool.suppliedToBlend ?? 0,
  }));
  res.json({ pools });
});

/**
 * GET /api/pools/:type
 * Get specific pool details
 */
router.get("/:type", (req, res) => {
  const { type } = req.params;
  if (!["weekly", "biweekly", "monthly"].includes(type)) {
    return res.status(400).json({ error: "Invalid pool type" });
  }
  const pool = store.pools.get(type);
  if (!pool) return res.status(404).json({ error: "Pool not found" });

  res.json({
    ...pool,
    estimatedAPY: type === "weekly" ? 5.8 : type === "biweekly" ? 6.2 : 7.1,
    currency: "XLM",
    ticketRatio: "1 ticket per 1 XLM per day",
    suppliedToBlend: pool.suppliedToBlend ?? 0,
  });
});

/**
 * PATCH /api/pools/:type/blend-stats
 * Update suppliedToBlend for a pool (e.g. after admin deploys to Blend on-chain).
 * In production, protect with admin auth or derive from on-chain get_supplied_to_blend.
 */
router.patch("/:type/blend-stats", (req, res) => {
  const { type } = req.params;
  if (!["weekly", "biweekly", "monthly"].includes(type)) {
    return res.status(400).json({ error: "Invalid pool type" });
  }
  const pool = store.pools.get(type);
  if (!pool) return res.status(404).json({ error: "Pool not found" });

  const { suppliedToBlend } = req.body;
  if (typeof suppliedToBlend === "number" && suppliedToBlend >= 0) {
    pool.suppliedToBlend = suppliedToBlend;
  }
  res.json({ poolType: type, suppliedToBlend: pool.suppliedToBlend ?? 0 });
});

/**
 * GET /api/pools/:type/my-position  (authenticated)
 * Get user's position in a specific pool
 */
router.get("/:type/my-position", auth, (req, res) => {
  const { type } = req.params;
  const userDeposits = Array.from(store.deposits.values()).filter(
    (d) => d.publicKey === req.publicKey && d.poolType === type && !d.withdrawnAt
  );

  const totalDeposited = userDeposits.reduce((sum, d) => sum + d.amount, 0);
  const pool = store.pools.get(type);

  res.json({
    poolType: type,
    publicKey: req.publicKey,
    deposited: totalDeposited,
    tickets: Math.floor(totalDeposited), // simplified: 1 ticket per XLM (scaled by period in real calc)
    sharePercent: pool.totalDeposited > 0
      ? ((totalDeposited / pool.totalDeposited) * 100).toFixed(4)
      : "0",
    deposits: userDeposits,
  });
});

module.exports = router;