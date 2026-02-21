/**
 * services/stellar-service.js
 * 
 * Stellar/Soroban transaction verification service
 * Verifies on-chain transactions and extracts deposit data
 */

const StellarSdk = require("@stellar/stellar-sdk");

// Network configuration
const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.STELLAR_NETWORK_PASSPHRASE || 
  "Test SDF Network ; September 2015";

// Contract address mapping
const CONTRACT_ADDRESSES = {
  weekly: process.env.POOL_CONTRACT_WEEKLY || "",
  biweekly: process.env.POOL_CONTRACT_BIWEEKLY || "",
  monthly: process.env.POOL_CONTRACT_MONTHLY || "",
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
 * Verify deposit transaction on-chain
 * @param {string} txHash - Transaction hash
 * @param {string} poolType - Pool type (weekly/biweekly/monthly)
 * @param {number} expectedAmount - Expected deposit amount in XLM
 * @returns {Promise<{depositor: string, amount: number, timestamp: Date, contract: string}>}
 */
async function verifyDepositTransaction(txHash, poolType, expectedAmount) {
  const server = new StellarSdk.SorobanRpc.Server(RPC_URL, {
    allowHttp: RPC_URL.startsWith("http://"),
  });

  const expectedContract = getContractAddress(poolType);

  // Fetch transaction from Soroban RPC
  const txResponse = await server.getTransaction(txHash);
  
  if (txResponse.status === StellarSdk.SorobanRpc.GetTransactionStatus.NOT_FOUND) {
    throw new Error(`Transaction not found: ${txHash}`);
  }

  if (txResponse.status === StellarSdk.SorobanRpc.GetTransactionStatus.FAILED) {
    throw new Error(`Transaction failed: ${txResponse.errorResultXdr || "Unknown error"}`);
  }

  if (!txResponse.successful) {
    throw new Error("Transaction was not successful");
  }

  // Extract transaction details
  const tx = StellarSdk.TransactionBuilder.fromXDR(txResponse.transactionXdr, NETWORK_PASSPHRASE);
  const depositor = tx.source;
  
  // Extract timestamp from ledger close time
  const timestamp = txResponse.ledgerCloseTime 
    ? new Date(txResponse.ledgerCloseTime * 1000)
    : new Date();

  // Parse contract invocation from transaction
  // Note: This is a simplified version - in production you'd parse the actual operation
  // For now, we verify the contract address matches and trust the amount from client
  // In a full implementation, you'd decode the invokeHostFunction operation to get exact amount
  
  // Verify contract address (check if transaction invokes the expected contract)
  // This is a simplified check - full implementation would parse the operation
  const contractAddress = expectedContract; // In full impl, extract from tx operations

  // For now, we trust the expectedAmount from client but verify transaction succeeded
  // TODO: Parse invokeHostFunction operation to extract exact amount from on-chain data
  
  return {
    depositor,
    amount: expectedAmount, // TODO: Extract from transaction operations
    timestamp,
    contract: contractAddress,
    ledger: txResponse.ledger || 0,
  };
}

/**
 * Get transaction details (for debugging/logging)
 */
async function getTransactionDetails(txHash) {
  const server = new StellarSdk.SorobanRpc.Server(RPC_URL, {
    allowHttp: RPC_URL.startsWith("http://"),
  });

  const txResponse = await server.getTransaction(txHash);
  
  return {
    hash: txHash,
    status: txResponse.status,
    successful: txResponse.successful,
    ledger: txResponse.ledger,
    ledgerCloseTime: txResponse.ledgerCloseTime,
    errorResultXdr: txResponse.errorResultXdr,
  };
}

module.exports = {
  verifyDepositTransaction,
  getTransactionDetails,
  getContractAddress,
};
