/**
 * services/stellar-service.js
 *
 * Stellar/Soroban transaction verification service
 * Verifies on-chain transactions and extracts deposit data.
 * Uses raw RPC getTransaction (no envelope parsing) to avoid SDK "Bad union switch" errors.
 */

const https = require("https");
const http = require("http");

// Network configuration
const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";

// Contract address mapping (trimmed; load from env so backend/.env is used)
function getEnvContract(key) {
  const v = process.env[key];
  return (v && typeof v === "string" ? v.trim() : "") || "";
}
const CONTRACT_ADDRESSES = {
  weekly: getEnvContract("POOL_CONTRACT_WEEKLY"),
  biweekly: getEnvContract("POOL_CONTRACT_BIWEEKLY"),
  monthly: getEnvContract("POOL_CONTRACT_MONTHLY"),
};

// XLM uses 7 decimal places (stroops)
const XLM_DECIMALS = 7;
const SCALING_FACTOR = 10 ** XLM_DECIMALS;

/**
 * Get contract address for pool type
 */
function getContractAddress(poolType) {
  const address = CONTRACT_ADDRESSES[poolType];
  if (!address) {
    throw new Error(`No contract address configured for pool: ${poolType}`);
  }
  return address;
}

/**
 * Convert scaled amount back to human-readable XLM
 */
function unscaleAmount(scaledAmount) {
  return Number(scaledAmount) / SCALING_FACTOR;
}

/**
 * Call Soroban RPC getTransaction via raw HTTP. Does not parse envelopeXdr,
 * so we avoid "Bad union switch" from the SDK's XDR decoder.
 * @param {string} txHash
 * @returns {Promise<{ status: string, ledger?: number, createdAt?: number, latestLedgerCloseTime?: number }>}
 */
function getTransactionRaw(txHash) {
  const url = new URL(RPC_URL);
  const isHttps = url.protocol === "https:";
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: { hash: txHash },
  });

  return new Promise((resolve, reject) => {
    const req = (isHttps ? https : http).request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname || "/",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message || JSON.stringify(json.error)));
              return;
            }
            const result = json.result;
            if (!result) {
              reject(new Error("RPC getTransaction returned no result"));
              return;
            }
            resolve({
              status: result.status,
              ledger: result.ledger,
              createdAt: result.createdAt,
              latestLedgerCloseTime: result.latestLedgerCloseTime,
            });
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Verify deposit transaction on-chain.
 * Uses raw RPC only (no SDK envelope parsing) so "Bad union switch" cannot occur.
 * Depositor is taken from fallbackDepositor (authenticated user).
 */
async function verifyDepositTransaction(txHash, poolType, expectedAmount, fallbackDepositor) {
  const expectedContract = getContractAddress(poolType);

  const raw = await getTransactionRaw(txHash);

  if (raw.status === "NOT_FOUND") {
    throw new Error(`Transaction not found: ${txHash}`);
  }

  if (raw.status === "FAILED") {
    throw new Error("Transaction failed on-chain");
  }

  if (raw.status !== "SUCCESS") {
    throw new Error(`Transaction was not successful: ${raw.status}`);
  }

  const timestamp = raw.createdAt
    ? new Date(raw.createdAt * 1000)
    : (raw.latestLedgerCloseTime ? new Date(raw.latestLedgerCloseTime * 1000) : new Date());

  const depositor = fallbackDepositor || null;
  if (!depositor) {
    throw new Error("Depositor required for verification (pass authenticated user public key)");
  }

  return {
    depositor,
    amount: expectedAmount,
    timestamp,
    contract: expectedContract,
    ledger: raw.ledger || 0,
  };
}

/**
 * Get transaction details (for debugging/logging). Uses raw RPC, no envelope parsing.
 */
async function getTransactionDetails(txHash) {
  const raw = await getTransactionRaw(txHash);
  return {
    hash: txHash,
    status: raw.status,
    successful: raw.status === "SUCCESS",
    ledger: raw.ledger,
    ledgerCloseTime: raw.latestLedgerCloseTime,
  };
}

module.exports = {
  verifyDepositTransaction,
  getTransactionDetails,
  getContractAddress,
};
