/**
 * Check Blend config: print supplied-to-blend (stroops) per pool.
 * Run after configure-blend.js to verify. Uses backend .env.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { getSuppliedToBlend, getContractId } = require("../src/services/pool-contract");

const STROOPS_PER_XLM = 1e7;

async function main() {
  const pools = ["weekly", "biweekly", "monthly"];
  const blendId = process.env.BLEND_POOL_CONTRACT_ID;
  console.log("BLEND_POOL_CONTRACT_ID:", blendId || "(not set)");
  console.log("");

  for (const type of pools) {
    try {
      const contractId = getContractId(type);
      const supplied = await getSuppliedToBlend(contractId);
      const xlm = (Number(supplied) / STROOPS_PER_XLM).toFixed(4);
      console.log(`${type}: contract=${contractId}`);
      console.log(`      supplied_to_blend = ${supplied} stroops (${xlm} XLM)`);
    } catch (e) {
      console.log(`${type}: error - ${e.message}`);
    }
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
