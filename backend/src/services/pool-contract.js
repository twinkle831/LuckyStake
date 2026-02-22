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
} = require("@stellar/stellar-sdk");
const stellarBase = require("@stellar/stellar-base");
const { assembleTransaction } = require("@stellar/stellar-sdk/lib/rpc/transaction");
const { Api } = require("@stellar/stellar-sdk/lib/rpc/api");

const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const BASE_FEE = 100;

const CONTRACTS = {
  weekly: (process.env.POOL_CONTRACT_WEEKLY || "").trim(),
  biweekly: (process.env.POOL_CONTRACT_BIWEEKLY || "").trim(),
  monthly: (process.env.POOL_CONTRACT_MONTHLY || "").trim(),
};

function getServer() {
  return new SorobanRpc.Server(RPC_URL);
}

function scValI128(value) {
  const XdrLargeInt = stellarBase.XdrLargeInt ?? stellarBase.default?.XdrLargeInt;
  if (XdrLargeInt) return new XdrLargeInt("i128", String(value)).toScVal();
  throw new Error("XdrLargeInt not found in stellar-base - cannot create i128 ScVal");
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
  if (Api.isSimulationError(sim)) {
    throw new Error(`Simulate ${method} failed: ${JSON.stringify(sim)}`);
  }
  const result = sim.result?.retval;
  if (!result) return null;
  const scv = xdr.ScVal.fromXDR(result, "base64");
  if (scv.switch().name === "scvVoid") return null;
  if (scv.switch().name === "scvI128") {
    const lo = scv.i128().lo().low;
    const hi = scv.i128().hi().low;
    return BigInt(lo) + (BigInt(hi) << 32n);
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
  if (Api.isSimulationError(sim)) {
    throw new Error(`Simulate ${method} failed: ${JSON.stringify(sim)}`);
  }

  tx = assembleTransaction(tx, sim).build();
  tx.sign(admin);

  const send = await server.sendTransaction(tx);
  if (send.errorResult) {
    throw new Error(`Send ${method} failed: ${JSON.stringify(send)}`);
  }

  const getResult = await server.getTransaction(send.hash);
  const maxWait = 60;
  let waited = 0;
  while (getResult.status === "NOT_FOUND" && waited < maxWait) {
    await new Promise((r) => setTimeout(r, 2000));
    const r = await server.getTransaction(send.hash);
    if (r.status === "SUCCESS") return { hash: send.hash, status: "SUCCESS" };
    if (r.status === "FAILED") throw new Error(`Tx failed: ${JSON.stringify(r)}`);
    waited += 2;
  }

  return { hash: send.hash, status: getResult.status };
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
 * Execute draw (select winner, transfer prize).
 */
async function executeDraw(contractId) {
  return invoke(contractId, "execute_draw", []);
}

function getContractId(poolType) {
  const id = CONTRACTS[poolType];
  if (!id) throw new Error(`No contract for pool: ${poolType}`);
  return id;
}

module.exports = {
  getServer,
  getSuppliedToBlend,
  getPrizeFund,
  harvestYield,
  executeDraw,
  getContractId,
  scValI128,
};
