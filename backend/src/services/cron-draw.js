/**
 * cron-draw.js
 * Automation: check if pool period has ended, harvest yield (if Blend configured),
 * then execute draw. Run on schedule or via GET/POST /api/cron/run-draw-checks.
 */

const store = require("./store");
const poolContract = require("./pool-contract");

const POOL_TYPES = ["weekly", "biweekly", "monthly"];

/**
 * Check if the pool's nextDraw has passed (period ended).
 */
function isPeriodEnded(poolType) {
  const pool = store.pools.get(poolType);
  if (!pool || !pool.nextDraw) return false;
  return new Date() >= new Date(pool.nextDraw);
}

/**
 * Run draw automation for a single pool.
 * 1. Optionally harvest yield (if yieldAmount provided - admin must query Blend off-chain)
 * 2. Execute draw
 * 3. Advance nextDraw on success
 */
async function runDrawForPool(poolType, options = {}) {
  const { harvestYieldAmount, harvestMinReturn } = options;
  const contractId = poolContract.getContractId(poolType);

  const results = { poolType, harvest: null, draw: null, error: null };

  try {
    if (harvestYieldAmount != null && harvestYieldAmount > 0) {
      try {
        const minRet = harvestMinReturn ?? harvestYieldAmount;
        const r = await poolContract.harvestYield(contractId, harvestYieldAmount, minRet);
        results.harvest = { success: true, hash: r.hash };
      } catch (e) {
        results.harvest = { success: false, error: e.message };
      }
    }

    const drawResult = await poolContract.executeDraw(contractId);
    results.draw = { success: true, hash: drawResult.hash };
    store.advanceNextDraw(poolType);
    return results;
  } catch (e) {
    results.error = e.message;
    results.draw = { success: false, error: e.message };
    return results;
  }
}

/**
 * Run draw checks for all pools whose period has ended.
 */
async function runDrawChecks(options = {}) {
  const results = [];
  for (const poolType of POOL_TYPES) {
    if (!isPeriodEnded(poolType)) continue;

    const poolOpts = options[poolType] || {};
    const r = await runDrawForPool(poolType, poolOpts);
    results.push(r);
  }
  return results;
}

/**
 * Start the cron interval (runs every hour by default).
 */
function startCron(intervalMs = 60 * 60 * 1000) {
  const run = async () => {
    if (!process.env.ADMIN_SECRET_KEY) {
      console.warn("[cron-draw] ADMIN_SECRET_KEY not set, skipping");
      return;
    }
    try {
      const r = await runDrawChecks();
      if (r.length > 0) {
        console.log("[cron-draw] Run completed:", JSON.stringify(r));
      }
    } catch (e) {
      console.error("[cron-draw] Error:", e.message);
    }
  };
  setInterval(run, intervalMs);
  run();
}

module.exports = {
  runDrawChecks,
  runDrawForPool,
  isPeriodEnded,
  startCron,
};
