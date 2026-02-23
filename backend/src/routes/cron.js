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
 * Add ?force=true to bypass the time check and run ALL pools immediately.
 */
router.get("/run-draw-checks", requireAdmin, async (req, res, next) => {
  try {
    if (!process.env.ADMIN_SECRET_KEY) {
      return res.status(500).json({ error: "ADMIN_SECRET_KEY not set" });
    }

    const force = req.query.force === "true";
    const results = force
      ? await cronDraw.runAllForced()
      : await cronDraw.runDrawChecks();

    res.json({ message: "Draw checks completed", results, forced: force });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/cron/force-draw
 * Force a draw for a specific pool RIGHT NOW, ignoring the nextDraw time.
 * Body: { poolType: "weekly"|"biweekly"|"monthly", harvestYieldAmount?, harvestMinReturn? }
 */
router.post("/force-draw", requireAdmin, async (req, res, next) => {
  try {
    if (!process.env.ADMIN_SECRET_KEY) {
      return res.status(500).json({ error: "ADMIN_SECRET_KEY not set" });
    }

    const { poolType, harvestYieldAmount, harvestMinReturn } = req.body || {};

    if (!poolType || !["weekly", "biweekly", "monthly"].includes(poolType)) {
      return res.status(400).json({
        error: "poolType is required: 'weekly', 'biweekly', or 'monthly'",
      });
    }

    const result = await cronDraw.runDrawForPool(poolType, {
      harvestYieldAmount,
      harvestMinReturn,
      force: true,
    });

    res.json({ message: `Forced draw completed for ${poolType}`, result });
  } catch (err) {
    next(err);
  }
});

const store = require("../services/store");
const poolContract = require("../services/pool-contract");

/**
 * GET /api/cron/contract-state
 * Read on-chain state for any contract by address.
 * Query params:
 *   ?contractId=CAJP6...  (required) — any deployed contract address
 * Returns: total_deposits, prize_fund, total_tickets, period_days
 * No auth required (read-only simulate).
 */
router.get("/contract-state", async (req, res, next) => {
  const { contractId } = req.query;
  if (!contractId) {
    return res.status(400).json({ error: "contractId query param required" });
  }

  try {
    const { SorobanRpc, Contract, TransactionBuilder, Networks, Keypair, nativeToScVal } =
      require("@stellar/stellar-sdk");

    const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-mainnet.stellar.org";
    const PASSPHRASE =
      process.env.STELLAR_NETWORK_PASSPHRASE || "Public Global Stellar Network ; September 2015";

    const server = new SorobanRpc.Server(RPC_URL);
    const adminPub = process.env.ADMIN_SECRET_KEY
      ? Keypair.fromSecret(process.env.ADMIN_SECRET_KEY).publicKey()
      : null;

    // Helper: simulate a read-only call
    async function readField(method, args = []) {
      try {
        // We need a source account for building — use admin or a dummy funded account
        const source = adminPub
          ? await server.getAccount(adminPub)
          : (() => { throw new Error("ADMIN_SECRET_KEY needed for RPC source account"); })();

        const contract = new Contract(contractId);
        const tx = new TransactionBuilder(source, {
          fee: "100",
          networkPassphrase: PASSPHRASE,
        })
          .addOperation(contract.call(method, ...args))
          .setTimeout(30)
          .build();

        const sim = await server.simulateTransaction(tx);
        if (SorobanRpc.Api.isSimulationError(sim)) return { error: sim.error };

        const resultVal = sim.result?.retval;
        if (!resultVal) return null;

        // Decode common types
        const v = resultVal;
        if (v._arm === "i128") {
          const hi = BigInt(v._value._attributes.hi._value);
          const lo = BigInt(v._value._attributes.lo._value);
          return Number((hi << 64n) | lo);
        }
        if (v._arm === "u32") return v._value;
        if (v._arm === "u64") return Number(v._value);
        if (v._arm === "void") return null;
        return v; // fallback: return raw
      } catch (e) {
        return { error: e.message };
      }
    }

    const [totalDeposits, prizeFund, totalTickets, periodDays] = await Promise.all([
      readField("get_total_deposits"),
      readField("get_prize_fund"),
      readField("get_total_tickets"),
      readField("get_period_days"),
    ]);

    res.json({
      contractId,
      totalDeposits,
      prizeFund,
      totalTickets,
      periodDays,
      note: "Values are in stroops (1 XLM = 10,000,000 stroops) — divide by 1e7 for XLM",
    });
  } catch (err) {
    next(err);
  }
});

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
