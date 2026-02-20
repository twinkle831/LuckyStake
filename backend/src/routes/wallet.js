const express = require("express");
const router = express.Router();
const StellarSdk = require("@stellar/stellar-sdk");
const { getAccountDetails, getAccountTransactions } = require("../services/stellar");

/**
 * GET /api/wallet/:publicKey
 * Get on-chain account details for a Stellar address
 */
router.get("/:publicKey", async (req, res, next) => {
  try {
    const { publicKey } = req.params;

    try {
      StellarSdk.Keypair.fromPublicKey(publicKey);
    } catch {
      return res.status(400).json({ error: "Invalid Stellar public key" });
    }

    const details = await getAccountDetails(publicKey);
    res.json(details);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/wallet/:publicKey/transactions
 * Recent transactions for an account
 */
router.get("/:publicKey/transactions", async (req, res, next) => {
  try {
    const { publicKey } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    try {
      StellarSdk.Keypair.fromPublicKey(publicKey);
    } catch {
      return res.status(400).json({ error: "Invalid Stellar public key" });
    }

    const transactions = await getAccountTransactions(publicKey, limit);
    res.json({ transactions, count: transactions.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;