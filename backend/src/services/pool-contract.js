/**
 * pool-contract.js
 * Invoke LuckyStake pool contract functions (harvest_yield, execute_draw, get_supplied_to_blend).
 * Uses Soroban RPC to simulate, build, sign, and submit transactions.
 */

const {
  Contract,
  TransactionBuilder,
  SorobanRpc,
  Keypair,
  Networks,
  xdr,
  assembleTransaction, // ✅ directly from top-level in v12
  nativeToScVal,
} = require("@stellar/stellar-sdk");
const { Address } = require("@stellar/stellar-base");

// ✅ No need for @stellar/stellar-base or internal subpath imports
// assembleTransaction and SorobanRpc.Api are both available from the top-level export

const RPC_URL =
  process.env.STELLAR_RPC_URL || "https://soroban-mainnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ||
  "Public Global Stellar Network ; September 2015";
const BASE_FEE = 100;

const CONTRACTS = {
  weekly: (process.env.POOL_CONTRACT_WEEKLY || "").trim(),
  biweekly: (process.env.POOL_CONTRACT_BIWEEKLY || "").trim(),
  monthly: (process.env.POOL_CONTRACT_MONTHLY || "").trim(),
};

function getServer() {
  return new SorobanRpc.Server(RPC_URL);
}

/**
 * Create an i128 ScVal from a JS number/bigint.
 * nativeToScVal handles this cleanly in v12.
 */
function scValI128(value) {
  return nativeToScVal(BigInt(value), { type: "i128" });
}

function getAdminKeypair() {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) throw new Error("ADMIN_SECRET_KEY not set");
  return Keypair.fromSecret(secret);
}

/**
 * Simulate and invoke a contract (read-only). Returns parsed result.
 */
async function simulateRead(contractId, method, args = []) {
  const server = getServer();
  const admin = getAdminKeypair();
  const contract = new Contract(contractId);
  const account = await server.getAccount(admin.publicKey());

  const op = contract.call(method, ...args);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE.toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);

  // ✅ Use SorobanRpc.Api (not a separate internal import)
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulate ${method} failed: ${JSON.stringify(sim)}`);
  }

  const result = sim.result?.retval;
  if (!result) return null;

  // result is already an xdr.ScVal in v12 (no need for fromXDR)
  const scv = result;
  const switchName = scv.switch().name;

  if (switchName === "scvVoid") return null;

  if (switchName === "scvI128") {
    const lo = BigInt(scv.i128().lo().low >>> 0) +
      BigInt(scv.i128().lo().high >>> 0) * 0x100000000n;
    const hi = BigInt(scv.i128().hi().low >>> 0) +
      BigInt(scv.i128().hi().high >>> 0) * 0x100000000n;
    return lo + (hi << 64n);
  }

  return scv;
}

/**
 * Build, simulate, sign, and submit a contract invocation.
 */
async function invoke(contractId, method, args = []) {
  const server = getServer();
  const admin = getAdminKeypair();
  const contract = new Contract(contractId);
  const account = await server.getAccount(admin.publicKey());

  const op = contract.call(method, ...args);
  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE.toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);

  // ✅ SorobanRpc.Api is the correct namespace in v12
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulate ${method} failed: ${JSON.stringify(sim)}`);
  }

  // ✅ assembleTransaction imported directly from top-level
  tx = assembleTransaction(tx, sim).build();
  tx.sign(admin);

  const send = await server.sendTransaction(tx);
  if (send.errorResult) {
    throw new Error(`Send ${method} failed: ${JSON.stringify(send)}`);
  }

  // Poll for result
  const maxWait = 60;
  let waited = 0;
  let lastTx;
  while (waited < maxWait) {
    await new Promise((r) => setTimeout(r, 2000));
    const r = await server.getTransaction(send.hash);
    lastTx = r;
    if (r.status === "SUCCESS") return { hash: send.hash, status: "SUCCESS", getTransactionResponse: r };
    if (r.status === "FAILED")
      throw new Error(`Tx failed: ${JSON.stringify(r)}`);
    waited += 2;
  }

  return { hash: send.hash, status: "TIMEOUT", getTransactionResponse: lastTx };
}

/**
 * Get principal supplied to Blend (from our contract).
 */
async function getSuppliedToBlend(contractId) {
  const v = await simulateRead(contractId, "get_supplied_to_blend", []);
  return v ? Number(v) : 0;
}

/**
 * Get prize fund from contract.
 */
async function getPrizeFund(contractId) {
  const v = await simulateRead(contractId, "get_prize_fund", []);
  return v ? Number(v) : 0;
}

/**
 * Harvest yield from Blend into PrizeFund.
 */
async function harvestYield(contractId, amount, minReturn) {
  return invoke(contractId, "harvest_yield", [
    scValI128(amount),
    scValI128(minReturn),
  ]);
}

/**
 * Withdraw token from Blend back to the pool (admin). Call before execute_draw
 * so the contract has liquidity to pay prize and for users to claim principal.
 */
async function withdrawFromBlend(contractId, amount, minReturn) {
  return invoke(contractId, "withdraw_from_blend", [
    scValI128(amount),
    scValI128(minReturn ?? amount),
  ]);
}

/**
 * Execute draw (select winner, transfer prize). Returns on-chain winner address.
 */
async function executeDraw(contractId) {
  const out = await invoke(contractId, "execute_draw", []);
  let winner = null;
  if (out.getTransactionResponse && out.getTransactionResponse.returnValue) {
    try {
      const scv = out.getTransactionResponse.returnValue;
      winner = Address.fromScVal(scv).toString();
    } catch (_) {
      // ignore decode failure
    }
  }
  return { hash: out.hash, status: out.status, winner };
}

/**
 * Get user balance from contract (stroops). For claimable amount.
 */
async function getUserBalance(contractId, userAddress) {
  const addrSc = Address.fromString(userAddress).toScVal();
  const v = await simulateRead(contractId, "get_balance", [addrSc]);
  return v ? Number(v) : 0;
}

function getContractId(poolType) {
  const id = CONTRACTS[poolType];
  if (!id) throw new Error(`No contract for pool: ${poolType}`);
  return id;
}

module.exports = {
  getServer,
  simulateRead,
  getSuppliedToBlend,
  getPrizeFund,
  harvestYield,
  withdrawFromBlend,
  executeDraw,
  getUserBalance,
  getContractId,
  scValI128,
};