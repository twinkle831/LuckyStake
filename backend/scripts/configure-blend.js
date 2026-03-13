/**
 * configure-blend.js
 *
 * One-time helper to wire LuckyStake pool contracts to a Blend pool and
 * optional receipt token.
 *
 * Usage:
 *   ADMIN_SECRET_KEY=SB... \
 *   POOL_CONTRACT_WEEKLY=CC... \
 *   POOL_CONTRACT_BIWEEKLY=CC... \
 *   POOL_CONTRACT_MONTHLY=CC... \
 *   BLEND_POOL_CONTRACT_ID=CD... \
 *   RECEIPT_TOKEN_CONTRACT_ID=CE... \
 *   node scripts/configure-blend.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

// pool-contract.js lives under src/services in this repo
const { setBlendPool, setReceiptToken, getContractId } = require("../src/services/pool-contract");

async function main() {
  const blendPool = process.env.BLEND_POOL_CONTRACT_ID;
  if (!blendPool) {
    console.error("BLEND_POOL_CONTRACT_ID is required");
    process.exit(1);
  }

  const receiptToken = process.env.RECEIPT_TOKEN_CONTRACT_ID || null;

  const pools = ["weekly", "biweekly", "monthly"];

  for (const type of pools) {
    try {
      const contractId = getContractId(type);
      console.log(`Configuring ${type} pool (${contractId}) → Blend ${blendPool}`);
      const r1 = await setBlendPool(contractId, blendPool);
      console.log(`  set_blend_pool: tx=${r1.hash} status=${r1.status}`);

      if (receiptToken) {
        const r2 = await setReceiptToken(contractId, receiptToken);
        console.log(`  set_receipt_token: tx=${r2.hash} status=${r2.status}`);
      }
    } catch (e) {
      console.error(`  Error configuring ${type}:`, e.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

