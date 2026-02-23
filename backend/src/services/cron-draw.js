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
 *
 * Flow when USE_ONCHAIN_PAYOUTS is set (default):
 *   1. Harvest yield (optional) → prize fund
 *   2. Withdraw principal from Blend → contract has tokens
 *   3. execute_draw on-chain → prize to winner (real tx hash), winner from VRF
 *   4. Record draw; users claim principal via contract.withdraw (frontend) — no admin XLM
 *
 * When USE_ONCHAIN_PAYOUTS=false: send prize + principal from admin (Horizon) as before.
 */
async function runDrawForPool(poolType, options = {}) {
  const { harvestYieldAmount, harvestMinReturn } = options;
  const contractId = poolContract.getContractId(poolType);
  const useOnchainPayouts = process.env.USE_ONCHAIN_PAYOUTS !== "false";

  const results = { poolType, harvest: null, withdrawBlend: null, draw: null, payouts: null, error: null };

  try {
    // ── 1. Harvest yield (optional) ─────────────────────────────────────────
    if (harvestYieldAmount != null && harvestYieldAmount > 0) {
      try {
        const minRet = harvestMinReturn ?? harvestYieldAmount;
        const r = await poolContract.harvestYield(contractId, harvestYieldAmount, minRet);
        results.harvest = { success: true, hash: r.hash };
      } catch (e) {
        results.harvest = { success: false, error: e.message };
      }
    }

    // ── 2. Pre-flight: prize fund + total deposits (stroops) ───────────────
    const [onChainPrizeFund, onChainTotalDeposits] = await Promise.all([
      poolContract.simulateRead(contractId, "get_prize_fund"),
      poolContract.simulateRead(contractId, "get_total_deposits"),
    ]);

    const prizeFund = typeof onChainPrizeFund === "bigint"
      ? Number(onChainPrizeFund)
      : Number(onChainPrizeFund ?? 0);
    const totalDepositsStroops = typeof onChainTotalDeposits === "bigint"
      ? Number(onChainTotalDeposits)
      : Number(onChainTotalDeposits ?? 0);

    console.log(`[cron-draw] ${poolType}: prizeFund=${prizeFund} totalDeposits=${totalDepositsStroops}`);

    if (totalDepositsStroops <= 0) {
      results.error = "No deposits in contract — nothing to draw or refund";
      return results;
    }

    // ── 3. Withdraw principal from Blend so contract can pay users on-chain ───
    if (useOnchainPayouts && totalDepositsStroops > 0) {
      try {
        const supplied = await poolContract.getSuppliedToBlend(contractId);
        const toWithdraw = Math.min(Number(supplied), totalDepositsStroops);
        if (toWithdraw > 0) {
          await poolContract.withdrawFromBlend(contractId, toWithdraw, Math.floor(toWithdraw * 0.99));
          results.withdrawBlend = { success: true, amount: toWithdraw };
        }
      } catch (e) {
        results.withdrawBlend = { success: false, error: e.message };
        console.warn(`[cron-draw] ${poolType}: withdraw_from_blend failed:`, e.message);
      }
    }

    let winner = null;
    let prizeAmount = 0;
    let contractTxHash = null;

    if (prizeFund > 0) {
      const drawResult = await poolContract.executeDraw(contractId);
      contractTxHash = drawResult.hash;
      winner = drawResult.winner ?? null;
      const pool = store.pools.get(poolType);
      prizeAmount = pool?.yieldAccrued ?? Number(prizeFund) / 1e7;
      results.draw = { success: true, hash: contractTxHash, winner, mode: "onchain" };
    } else {
      console.log(`[cron-draw] ${poolType}: PrizeFund=0, skipping execute_draw`);
      results.draw = {
        success: true,
        hash: null,
        mode: "principal-only",
        note: "No yield — principal claimable on-chain",
      };
    }

    const pool = store.pools.get(poolType);
    const activeDeposits = Array.from(store.deposits.values()).filter(
      (d) => d.poolType === poolType && !d.withdrawnAt
    );

    return await _recordAndPayout(
      poolType, prizeAmount, winner, activeDeposits, results, pool, contractTxHash, useOnchainPayouts
    );

  } catch (e) {
    results.error = e.message;
    results.draw = { success: false, error: e.message };
    return results;
  }
}

/**
 * Shared: record draw in store; optionally send admin XLM payouts (when not using on-chain).
 * When useOnchainPayouts: no admin payouts — users claim principal via contract (real tx hashes).
 */
async function _recordAndPayout(poolType, prizeAmount, winner, activeDeposits, results, pool, contractTxHash, useOnchainPayouts) {
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
    payoutStatus: useOnchainPayouts ? "claimable" : "pending",
    txHashes: contractTxHash ? [contractTxHash] : [],
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

  // Winner's prize tx hash (on-chain) — so frontend can show real hash for "You won"
  if (winner && contractTxHash) {
    for (const d of activeDeposits) {
      if (d.publicKey === winner) {
        d.prizeTxHash = contractTxHash;
        d.payoutType = "win";
        d.payoutAt = drawRecord.drawnAt;
        break;
      }
    }
  }

  if (pool) {
    pool.yieldAccrued = 0;
    if (!Array.isArray(pool.prizeHistory)) pool.prizeHistory = [];
    pool.prizeHistory.push({ amount: prizeAmount, winner, drawnAt: drawRecord.drawnAt });
  }
  store.persist();

  if (!useOnchainPayouts && activeDeposits.length > 0) {
    try {
      const payoutResults = await payoutService.processDrawPayouts(
        poolType, prizeAmount, winner, activeDeposits
      );
      const now = new Date().toISOString();
      const txHashes = [...(contractTxHash ? [contractTxHash] : [])];
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
      drawRecord.payoutStatus = payoutResults.every((r) => !r.error) ? "complete" : "partial";
      drawRecord.txHashes = txHashes;
      store.persist();
      results.payouts = { success: true, count: payoutResults.length, txHashes, winner };
    } catch (e) {
      drawRecord.payoutStatus = "failed";
      store.persist();
      results.payouts = { success: false, error: e.message };
    }
  } else if (useOnchainPayouts) {
    results.payouts = { success: true, mode: "onchain", note: "Users claim principal via contract" };
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
