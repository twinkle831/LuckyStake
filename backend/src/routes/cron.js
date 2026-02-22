/**
 * Cron automation endpoints.
 * Protected by x-admin-key header (must match ADMIN_KEY env).
 */

const express = require("express");
const router = express.Router();
const cronDraw = require("../services/cron-draw");

function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];
  if (key !== process.env.ADMIN_KEY && process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

/**
 * POST /api/cron/run-draw-checks
 * Run draw automation for pools whose period has ended.
 * Body: { weekly: { harvestYieldAmount, harvestMinReturn }, ... }
 */
router.post("/run-draw-checks", requireAdmin, async (req, res, next) => {
  try {
    if (!process.env.ADMIN_SECRET_KEY) {
      return res.status(500).json({
        error: "ADMIN_SECRET_KEY not set",
        hint: "Add ADMIN_SECRET_KEY to backend .env for on-chain automation",
      });
    }

    const options = req.body || {};
    const results = await cronDraw.runDrawChecks(options);

    res.json({
      message: "Draw checks completed",
      results,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/cron/run-draw-checks
 * Same as POST but no harvest options (execute draw only).
 */
router.get("/run-draw-checks", requireAdmin, async (req, res, next) => {
  try {
    if (!process.env.ADMIN_SECRET_KEY) {
      return res.status(500).json({
        error: "ADMIN_SECRET_KEY not set",
      });
    }

    const results = await cronDraw.runDrawChecks();
    res.json({ message: "Draw checks completed", results });
  } catch (err) {
    next(err);
  }
});

const store = require("../services/store");

/**
 * GET /api/cron/status
 * Show which pools are due for draw.
 */
router.get("/status", requireAdmin, (req, res) => {
  const status = ["weekly", "biweekly", "monthly"].map((t) => ({
    poolType: t,
    nextDraw: store.pools.get(t)?.nextDraw,
    isDue: cronDraw.isPeriodEnded(t),
  }));
  res.json({ pools: status });
});

module.exports = router;
