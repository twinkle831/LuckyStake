/**
 * cron-draw.js
 * Automation: check if pool period has ended, harvest yield (if Blend configured),
 * execute draw, then send payouts to winner and all depositors.
 * Run on schedule or via GET/POST /api/cron/run-draw-checks.
 */

const { v4: uuidv4 } = require("uuid");
const store = require("./store");
const poolContract = require("./pool-contract");
const payoutService = require("./payout-service");

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
 * Weighted random winner selection from active deposits.
 * @param {Array} activeDeposits  deposits with .publicKey and .tickets
 * @returns {string} winner public key
 */
function pickWinner(activeDeposits) {
  const tickets = activeDeposits.flatMap((d) =>
    Array(Math.max(1, d.tickets || 1)).fill(d.publicKey)
  );
  return tickets[Math.floor(Math.random() * tickets.length)];
}

/**
 * Run draw automation for a single pool.
 * 1. Optionally harvest yield (if yieldAmount provided)
 * 2. Execute on-chain draw
 * 3. Pick winner from active deposits, record prize, send payouts
 * 4. Advance nextDraw on success
 */
/**
 * Run draw automation for a single pool.
 *
 * Pre-flight reads get_prize_fund + get_total_deposits from the contract:
 *   - totalDeposits == 0  → error (nothing to do)
 *   - prizeFund == 0      → skip execute_draw (would panic), go straight to
 *                           principal refunds via payout-service (real Horizon txs)
 *   - prizeFund > 0       → full flow: execute_draw (VRF winner + on-chain prize
 *                           transfer) then principal refunds via payout-service
 *
 * force=true is only used upstream to skip the isPeriodEnded() time check.
 */
async function runDrawForPool(poolType, options = {}) {
  const { harvestYieldAmount, harvestMinReturn } = options;
  const contractId = poolContract.getContractId(poolType);

  const results = { poolType, harvest: null, draw: null, payouts: null, error: null };

  try {
    // ── 1. Harvest yield (optional, before draw) ────────────────────────────
    if (harvestYieldAmount != null && harvestYieldAmount > 0) {
      try {
        const minRet = harvestMinReturn ?? harvestYieldAmount;
        const r = await poolContract.harvestYield(contractId, harvestYieldAmount, minRet);
        results.harvest = { success: true, hash: r.hash };
      } catch (e) {
        results.harvest = { success: false, error: e.message };
      }
    }

    // ── 2. Pre-flight: read on-chain state so we don't blindly call execute_draw ──
    const [onChainPrizeFund, onChainTotalDeposits] = await Promise.all([
      poolContract.simulateRead(contractId, "get_prize_fund"),
      poolContract.simulateRead(contractId, "get_total_deposits"),
    ]);

    const prizeFund = typeof onChainPrizeFund === "bigint"
      ? Number(onChainPrizeFund)
      : Number(onChainPrizeFund ?? 0);
    const totalDeposits = typeof onChainTotalDeposits === "bigint"
      ? Number(onChainTotalDeposits)
      : Number(onChainTotalDeposits ?? 0);

    console.log(`[cron-draw] ${poolType}: onChainPrizeFund=${prizeFund} onChainTotalDeposits=${totalDeposits}`);

    if (totalDeposits <= 0) {
      results.error = "No deposits in contract — nothing to draw or refund";
      return results;
    }

    // ── 3a. prizeFund > 0 → full on-chain draw (VRF winner + prize + refunds) ──
    let winner = null;
    let prizeAmount = 0;
    let contractTxHash = null;

    if (prizeFund > 0) {
      const drawResult = await poolContract.executeDraw(contractId);
      contractTxHash = drawResult.hash;
      winner = drawResult.winner ?? null;
      // Prize in XLM: contract pays winner on-chain in the token; we record for display
      // Use stored yieldAccrued if available, otherwise derive from on-chain prize fund
      const pool = store.pools.get(poolType);
      prizeAmount = pool?.yieldAccrued ?? Number(prizeFund) / 1e7; // stroops → XLM
      results.draw = { success: true, hash: contractTxHash, mode: "onchain" };

    } else {
      // ── 3b. prizeFund == 0 → principal-return-only draw ─────────────────────
      // execute_draw would panic ("no prize to distribute"), so we skip it.
      // We still send real XLM refunds via payout-service (Horizon transactions).
      console.log(`[cron-draw] ${poolType}: PrizeFund=0, skipping execute_draw — returning principal only`);
      results.draw = {
        success: true,
        hash: null,
        mode: "principal-only",
        note: "No yield accrued yet — principal returned to all depositors",
      };
    }

    // ── 4. Collect active backend deposits + send real XLM refunds ──────────
    const pool = store.pools.get(poolType);
    const activeDeposits = Array.from(store.deposits.values()).filter(
      (d) => d.poolType === poolType && !d.withdrawnAt
    );

    return await _recordAndPayout(
      poolType, prizeAmount, winner, activeDeposits, results, pool, contractTxHash
    );

  } catch (e) {
    results.error = e.message;
    results.draw = { success: false, error: e.message };
    return results;
  }
}

/**
 * Shared: record draw in store, send XLM payouts, mark deposits, broadcast, advance nextDraw.
 * Called by both force (off-chain) and on-chain paths.
 */
async function _recordAndPayout(poolType, prizeAmount, winner, activeDeposits, results, pool, contractTxHash) {
  const drawId = uuidv4();
  const drawRecord = {
    id: drawId,
    poolType,
    winner,
    prizeAmount,
    participants: activeDeposits.length,
    totalTickets: activeDeposits.reduce((s, d) => s + (d.tickets || 1), 0),
    drawnAt: new Date().toISOString(),
    contractTxHash: contractTxHash ?? null,
    payoutStatus: "pending",
    txHashes: [],
  };
  store.draws.set(drawId, drawRecord);

  const prizeId = uuidv4();
  store.prizes.set(prizeId, {
    id: prizeId,
    winner,
    amount: prizeAmount,
    poolType,
    drawnAt: drawRecord.drawnAt,
    txHash: contractTxHash,
    participants: activeDeposits.length,
    totalTickets: drawRecord.totalTickets,
  });

  if (pool) {
    pool.yieldAccrued = 0;
    if (!Array.isArray(pool.prizeHistory)) pool.prizeHistory = [];
    pool.prizeHistory.push({ amount: prizeAmount, winner, drawnAt: drawRecord.drawnAt });
  }
  store.persist();

  // Send XLM payouts: prize to winner (if any) + principal refund to every depositor
  if (activeDeposits.length > 0) {
    try {
      const payoutResults = await payoutService.processDrawPayouts(
        poolType, prizeAmount, winner, activeDeposits
      );

      const now = new Date().toISOString();
      const txHashes = [];

      for (const pr of payoutResults) {
        if (pr.txHash) txHashes.push(pr.txHash);
        if (pr.depositId) {
          const dep = store.deposits.get(pr.depositId);
          if (dep) {
            dep.withdrawnAt = now;
            dep.payoutAt = now;
            dep.payoutTxHash = pr.txHash;
            dep.payoutType = dep.publicKey === winner ? "win" : "refund";
          }
        }
      }

      drawRecord.payoutStatus = payoutResults.every((r) => !r.error)
        ? "complete"
        : payoutResults.some((r) => r.txHash) ? "partial" : "failed";
      drawRecord.txHashes = txHashes;
      store.persist();

      results.payouts = {
        success: true,
        count: payoutResults.length,
        failed: payoutResults.filter((r) => r.error).length,
        txHashes,
        winner,
      };
    } catch (e) {
      drawRecord.payoutStatus = "failed";
      store.persist();
      results.payouts = { success: false, error: e.message };
      console.error("[cron-draw] Payout error:", e.message);
    }
  }

  try {
    const { broadcast } = require("./websocket");
    broadcast("draw_complete", { poolType, draw: drawRecord, winner, prizeAmount });
  } catch (_) { }

  store.advanceNextDraw(poolType);
  return results;
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
 * Force a draw for ALL pools immediately, bypassing the period check.
 * Used for testing or emergency manual draws.
 */
async function runAllForced(options = {}) {
  const results = [];
  for (const poolType of POOL_TYPES) {
    const poolOpts = { ...(options[poolType] || {}), force: true };
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
  runAllForced,
  runDrawForPool,
  isPeriodEnded,
  startCron,
};
