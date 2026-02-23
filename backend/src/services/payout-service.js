/**
 * payout-service.js
 *
 * Handles XLM payouts from the admin Stellar account to users after a draw:
 *   - Winner receives the prize (yield amount)
 *   - Every active depositor (including winner) receives their principal back
 *
 * Uses Stellar Horizon (not Soroban) for simple XLM payment operations.
 */

const {
  Keypair,
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Memo,
} = require("@stellar/stellar-sdk");

const HorizonServer = Horizon.Server;

const HORIZON_URL =
  process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ||
  "Public Global Stellar Network ; September 2015";
const BASE_FEE = 100;

function getServer() {
  return new HorizonServer(HORIZON_URL);
}

function getAdminKeypair() {
  const secret = process.env.ADMIN_SECRET_KEY;
  if (!secret) throw new Error("ADMIN_SECRET_KEY not set");
  return Keypair.fromSecret(secret);
}

/**
 * Send XLM from admin account to a recipient.
 * @param {string} recipientPublicKey  Stellar G... address
 * @param {number} amountXLM           Amount in XLM (e.g. 10.5)
 * @param {string} [memo]              Optional text memo (max 28 bytes)
 * @returns {Promise<{ txHash: string }>}
 */
async function sendXLMPayment(recipientPublicKey, amountXLM, memo) {
  const server = getServer();
  const admin = getAdminKeypair();

  const account = await server.loadAccount(admin.publicKey());

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE.toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: recipientPublicKey,
        asset: Asset.native(),
        amount: amountXLM.toFixed(7),
      })
    )
    .setTimeout(60);

  if (memo) {
    // Stellar text memo max 28 bytes — truncate safely
    builder.addMemo(Memo.text(memo.slice(0, 28)));
  }

  const tx = builder.build();
  tx.sign(admin);

  const result = await server.submitTransaction(tx);
  return { txHash: result.hash };
}

/**
 * Process all payouts for a completed draw:
 *   1. Send prize to winner
 *   2. Send principal back to every active depositor (including winner)
 *
 * @param {string}  poolType      "weekly" | "biweekly" | "monthly"
 * @param {number}  prizeAmount   Yield prize in XLM
 * @param {string}  winner        Winner's Stellar public key
 * @param {Array}   deposits      Active deposit records: [{ id, publicKey, amount }]
 * @returns {Promise<Array<{ depositId, publicKey, type, amount, txHash, error }>>}
 */
async function processDrawPayouts(poolType, prizeAmount, winner, deposits) {
  const results = [];
  const tag = poolType.charAt(0).toUpperCase() + poolType.slice(1);

  // 1 — Prize to winner (only if there IS a winner and a non-zero prize)
  if (winner && prizeAmount > 0) {
    try {
      const { txHash } = await sendXLMPayment(
        winner,
        prizeAmount,
        `LuckyStake ${tag} Prize`
      );
      results.push({
        depositId: null,
        publicKey: winner,
        type: "prize",
        amount: prizeAmount,
        txHash,
        error: null,
      });
      console.log(
        `[payout] Prize ${prizeAmount} XLM → ${winner.slice(0, 8)} | tx: ${txHash}`
      );
    } catch (err) {
      console.error("[payout] Prize payment failed:", err.message);
      results.push({
        depositId: null,
        publicKey: winner,
        type: "prize",
        amount: prizeAmount,
        txHash: null,
        error: err.message,
      });
    }
  } else {
    console.log(`[payout] No prize to distribute (winner=${winner ?? "none"} prizeAmount=${prizeAmount})`);
  }

  // 2 — Principal refund to every active depositor (serial to avoid sequence conflicts)
  for (const deposit of deposits) {
    if (!deposit.publicKey || !(deposit.amount > 0)) {
      console.warn(`[payout] Skipping deposit ${deposit.id} — missing publicKey or amount`);
      continue;
    }
    try {
      const { txHash } = await sendXLMPayment(
        deposit.publicKey,
        deposit.amount,
        `LuckyStake ${tag} Refund`
      );
      results.push({
        depositId: deposit.id,
        publicKey: deposit.publicKey,
        type: "refund",
        amount: deposit.amount,
        txHash,
        error: null,
      });
      console.log(
        `[payout] Refund ${deposit.amount} XLM → ${deposit.publicKey.slice(0, 8)} | tx: ${txHash}`
      );
    } catch (err) {
      console.error(
        `[payout] Refund failed for ${deposit.publicKey.slice(0, 8)}:`,
        err.message
      );
      results.push({
        depositId: deposit.id,
        publicKey: deposit.publicKey,
        type: "refund",
        amount: deposit.amount,
        txHash: null,
        error: err.message,
      });
    }
  }

  return results;
}

module.exports = {
  sendXLMPayment,
  processDrawPayouts,
};
