/**
 * services/stellar.js
 * Horizon-based account and transaction helpers.
 * Returns native XLM balance for wallet display.
 */

const StellarSdk = require("@stellar/stellar-sdk");

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org";
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Get account details including native XLM balance
 * @param {string} publicKey - Stellar account public key
 * @returns {Promise<{xlmBalance: string, subentryCount: number, ...}>}
 */
async function getAccountDetails(publicKey) {
  try {
    const account = await server.accounts().accountId(publicKey).call();
    const nativeBalance = account.balances.find((b) => b.asset_type === "native");
    const xlmBalance = nativeBalance ? nativeBalance.balance : "0";
    return {
      id: account.id,
      accountId: account.id,
      xlmBalance,
      subentryCount: account.subentry_count,
      thresholds: account.thresholds,
      signers: account.signers,
    };
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return { accountId: publicKey, xlmBalance: "0", subentryCount: 0 };
    }
    throw err;
  }
}

/**
 * Get recent transactions for an account
 */
async function getAccountTransactions(publicKey, limit = 10) {
  const { records } = await server
    .transactions()
    .forAccount(publicKey)
    .order("desc")
    .limit(limit)
    .call();
  return records;
}

module.exports = {
  server,
  getAccountDetails,
  getAccountTransactions,
};
