const express = require("express");
const router = express.Router();
const store = require("../services/store");
const auth = require("../middleware/auth");

/**
 * GET /api/pools
 * Get all pool stats (public)
 */
router.get("/", (req, res) => {
  const pools = Array.from(store.pools.values()).map((pool) => ({
    ...pool,
    // Simulated APY yield (replace with real Blend/AMM yield data)
    estimatedAPY: pool.type === "daily" ? 4.2 : pool.type === "weekly" ? 5.8 : 7.1,
    currency: "USDC",
  }));
  res.json({ pools });
});

/**
 * GET /api/pools/:type
 * Get specific pool details
 */
router.get("/:type", (req, res) => {
  const { type } = req.params;
  if (!["daily", "weekly", "monthly"].includes(type)) {
    return res.status(400).json({ error: "Invalid pool type" });
  }
  const pool = store.pools.get(type);
  if (!pool) return res.status(404).json({ error: "Pool not found" });

  res.json({
    ...pool,
    estimatedAPY: type === "daily" ? 4.2 : type === "weekly" ? 5.8 : 7.1,
    currency: "USDC",
    ticketRatio: "1 ticket per USDC per day",
  });
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
    tickets: Math.floor(totalDeposited), // simplified: 1 ticket per USDC
    sharePercent: pool.totalDeposited > 0
      ? ((totalDeposited / pool.totalDeposited) * 100).toFixed(4)
      : "0",
    deposits: userDeposits,
  });
});

module.exports = router;