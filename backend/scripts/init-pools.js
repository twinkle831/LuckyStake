#!/usr/bin/env node
/**
 * Initialize all three LuckyStake pool contracts (weekly, biweekly, monthly).
 * Run once after deploying the pool contracts. Requires ADMIN_SECRET_KEY in .env.
 *
 * Usage: node scripts/init-pools.js
 * Or:    npm run init-pools
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const {
  getContractId,
  getNativeXlmContractId,
  initializePool,
} = require("../src/services/pool-contract");

async function main() {
  if (!process.env.ADMIN_SECRET_KEY) {
    console.error("ERROR: Set ADMIN_SECRET_KEY in backend/.env (Stellar secret key for admin address).");
    process.exit(1);
  }

  const nativeXlm = getNativeXlmContractId();
  console.log("Native XLM contract id:", nativeXlm);

  const pools = [
    { type: "weekly", periodDays: 7 },
    { type: "biweekly", periodDays: 15 },
    { type: "monthly", periodDays: 30 },
  ];

  for (const { type, periodDays } of pools) {
    const contractId = getContractId(type);
    console.log(`\nInitializing ${type} pool (${contractId}) with period_days=${periodDays}...`);
    try {
      const result = await initializePool(contractId, periodDays);
      console.log(`  ✓ ${type} initialized. Tx: ${result.hash}`);
    } catch (err) {
      if (/already initialised|init/i.test(err.message)) {
        console.log(`  ⚠ ${type} already initialized, skipping.`);
      } else {
        console.error(`  ✗ ${type} failed:`, err.message);
        throw err;
      }
    }
  }

  console.log("\nDone. All pools are initialized with native XLM.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
