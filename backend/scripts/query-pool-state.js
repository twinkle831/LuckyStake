#!/usr/bin/env node
/**
 * Query LuckyStake pool contracts: supplied to Blend (principal), prize fund, total deposits.
 * "bTokens" are held inside Blend; we only track principal (get_supplied_to_blend).
 * Yield we've pulled out appears in get_prize_fund after harvest_yield.
 *
 * Usage (from repo root or backend):
 *   node backend/scripts/query-pool-state.js
 *   npm run query-pools   (if script added to package.json)
 *
 * Requires backend/.env: STELLAR_RPC_URL, POOL_CONTRACT_*, ADMIN_SECRET_KEY (for simulation).
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const poolContract = require("../src/services/pool-contract");

const STROOPS_PER_XLM = 1e7;

function toXlm(stroops) {
  const n = Number(stroops);
  return (n / STROOPS_PER_XLM).toFixed(4);
}

async function main() {
  const types = ["weekly", "biweekly", "monthly"];
  console.log("LuckyStake pool state (on-chain)\n");

  for (const type of types) {
    let contractId;
    try {
      contractId = poolContract.getContractId(type);
    } catch (e) {
      console.log(`  ${type}: (no contract id in .env)\n`);
      continue;
    }

    try {
      const [supplied, prizeFund, totalDeposits] = await Promise.all([
        poolContract.getSuppliedToBlend(contractId),
        poolContract.getPrizeFund(contractId),
        poolContract.getTotalDeposits(contractId),
      ]);

      const suppliedXlm = toXlm(supplied);
      const prizeXlm = toXlm(prizeFund);
      const depositsXlm = toXlm(totalDeposits);

      console.log(`  ${type.toUpperCase()} (${contractId.slice(0, 8)}...)`);
      console.log(`    Supplied to Blend (principal): ${suppliedXlm} XLM`);
      console.log(`    Prize fund (realized yield):   ${prizeXlm} XLM`);
      console.log(`    Total deposits (TVL):         ${depositsXlm} XLM`);
      console.log("");
    } catch (err) {
      console.log(`  ${type}: error - ${err.message}\n`);
    }
  }

  console.log("Note: Actual bToken balance / position value is in Blend's contract.");
  console.log("      Use Blend's get_positions(pool_contract_address) for principal + unrealized yield.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
