const StellarSdk = require("@stellar/stellar-sdk");

const isMainnet = process.env.STELLAR_NETWORK === "mainnet";

const server = new StellarSdk.Horizon.Server(
  process.env.STELLAR_HORIZON_URL ||
    (isMainnet
      ? "https://horizon.stellar.org"
      : "https://horizon-testnet.stellar.org")
);

const networkPassphrase = isMainnet
  ? StellarSdk.Networks.PUBLIC
  : StellarSdk.Networks.TESTNET;

/**
 * Verify a Stellar wallet challenge signature.
 * Flow:
 *   1. Frontend requests a challenge nonce (/api/auth/challenge)
 *   2. User signs challenge with their wallet (Freighter/xBull)
 *   3. Frontend sends signed XDR back (/api/auth/verify)
 *   4. Backend verifies the signature here
 */
async function verifyWalletSignature(publicKey, signedXDR, originalChallenge) {
  try {
    // Validate public key format
    StellarSdk.Keypair.fromPublicKey(publicKey);

    // Parse the signed transaction
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      signedXDR,
      networkPassphrase
    );

    // Verify it's the same challenge
    const txMemo = transaction.memo?.value?.toString();
    if (!txMemo || !txMemo.includes(originalChallenge)) {
      throw new Error("Challenge mismatch");
    }

    // Verify signature
    const keypair = StellarSdk.Keypair.fromPublicKey(publicKey);
    const txHash = transaction.hash();

    const isValid = transaction.signatures.some((sig) => {
      try {
        return keypair.verify(txHash, sig.signature());
      } catch {
        return false;
      }
    });

    if (!isValid) throw new Error("Invalid signature");
    return true;
  } catch (err) {
    throw new Error(`Signature verification failed: ${err.message}`);
  }
}

/**
 * Build a challenge transaction for wallet signing.
 * Returns XDR that the wallet signs.
 */
async function buildChallengeTransaction(serverPublicKey, clientPublicKey, nonce) {
  const serverKeypair = StellarSdk.Keypair.fromPublicKey(serverPublicKey);

  const account = await server.loadAccount(serverPublicKey).catch(() => null);

  // If treasury not funded yet, use a dummy sequence (for dev)
  const sourceAccount = account || {
    accountId: () => serverPublicKey,
    sequenceNumber: () => "0",
    incrementSequenceNumber: () => {},
  };

  const tx = new StellarSdk.TransactionBuilder(
    account || new StellarSdk.Account(serverPublicKey, "0"),
    {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    }
  )
    .addOperation(
      StellarSdk.Operation.manageData({
        name: "luckystake_auth",
        value: `${clientPublicKey}:${nonce}`,
        source: clientPublicKey,
      })
    )
    .addMemo(StellarSdk.Memo.text(nonce))
    .setTimeout(300) // 5 min expiry
    .build();

  return tx.toXDR();
}

/**
 * Get account details + balances from Stellar network
 */
async function getAccountDetails(publicKey) {
  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find((b) => b.asset_type === "native");
    const otherBalances = account.balances.filter(
      (b) => b.asset_type !== "native"
    );

    return {
      publicKey,
      sequence: account.sequence,
      xlmBalance: xlmBalance ? parseFloat(xlmBalance.balance) : 0,
      otherBalances: otherBalances.map((b) => ({
        asset: `${b.asset_code}:${b.asset_issuer}`,
        balance: parseFloat(b.balance),
      })),
      subentryCount: account.subentry_count,
      homeDomain: account.home_domain || null,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      return { publicKey, exists: false, xlmBalance: 0 };
    }
    throw err;
  }
}

/**
 * Get recent transactions for an account
 */
async function getAccountTransactions(publicKey, limit = 10) {
  const txs = await server
    .transactions()
    .forAccount(publicKey)
    .order("desc")
    .limit(limit)
    .call();

  return txs.records.map((tx) => ({
    id: tx.id,
    hash: tx.hash,
    ledger: tx.ledger,
    createdAt: tx.created_at,
    memo: tx.memo,
    operationCount: tx.operation_count,
    successful: tx.successful,
  }));
}

/**
 * Submit a signed transaction to the Stellar network
 */
async function submitTransaction(signedXDR) {
  try {
    const tx = StellarSdk.TransactionBuilder.fromXDR(signedXDR, networkPassphrase);
    const result = await server.submitTransaction(tx);
    return {
      success: true,
      hash: result.hash,
      ledger: result.ledger,
    };
  } catch (err) {
    const extras = err.response?.data?.extras;
    throw new Error(
      extras?.result_codes?.transaction ||
        extras?.result_codes?.operations?.[0] ||
        err.message
    );
  }
}

module.exports = {
  server,
  networkPassphrase,
  verifyWalletSignature,
  buildChallengeTransaction,
  getAccountDetails,
  getAccountTransactions,
  submitTransaction,
};