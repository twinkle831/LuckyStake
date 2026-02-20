const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const StellarSdk = require("@stellar/stellar-sdk");
const { buildChallengeTransaction, verifyWalletSignature } = require("../services/stellar");
const store = require("../services/store");

/**
 * POST /api/auth/challenge
 * 
 * Step 1: Client sends their public key.
 * Server returns a challenge XDR transaction for the wallet to sign.
 * 
 * Body: { publicKey: "G..." }
 * Response: { nonce, challengeXDR, expiresAt }
 */
router.post("/challenge", async (req, res, next) => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({ error: "publicKey is required" });
    }

    // Validate Stellar public key format
    try {
      StellarSdk.Keypair.fromPublicKey(publicKey);
    } catch {
      return res.status(400).json({ error: "Invalid Stellar public key" });
    }

    const nonce = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store challenge
    store.challenges.set(nonce, {
      publicKey,
      nonce,
      createdAt: Date.now(),
      expiresAt: expiresAt.getTime(),
      used: false,
    });

    // Build challenge XDR (if treasury key is configured)
    let challengeXDR = null;
    if (process.env.TREASURY_PUBLIC_KEY && 
        process.env.TREASURY_PUBLIC_KEY !== "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX") {
      challengeXDR = await buildChallengeTransaction(
        process.env.TREASURY_PUBLIC_KEY,
        publicKey,
        nonce
      );
    }

    res.json({
      nonce,
      challengeXDR,
      message: `Sign this message to authenticate with LuckyStake: ${nonce}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/verify
 * 
 * Step 2: Client sends signed XDR (or just the nonce for simple flow).
 * Server verifies and returns a JWT.
 * 
 * Body: { publicKey, nonce, signedXDR? }
 * Response: { token, user }
 */
router.post("/verify", async (req, res, next) => {
  try {
    const { publicKey, nonce, signedXDR } = req.body;

    if (!publicKey || !nonce) {
      return res.status(400).json({ error: "publicKey and nonce are required" });
    }

    // Lookup challenge
    const challenge = store.challenges.get(nonce);
    if (!challenge) {
      return res.status(401).json({ error: "Invalid or expired challenge" });
    }
    if (challenge.used) {
      return res.status(401).json({ error: "Challenge already used" });
    }
    if (challenge.publicKey !== publicKey) {
      return res.status(401).json({ error: "Public key mismatch" });
    }
    if (Date.now() > challenge.expiresAt) {
      store.challenges.delete(nonce);
      return res.status(401).json({ error: "Challenge expired" });
    }

    // If XDR provided, verify cryptographic signature
    if (signedXDR) {
      await verifyWalletSignature(publicKey, signedXDR, nonce);
    }

    // Mark challenge as used
    challenge.used = true;

    // Create or update user
    if (!store.users.has(publicKey)) {
      store.users.set(publicKey, {
        publicKey,
        joinedAt: new Date().toISOString(),
        totalDeposited: 0,
        totalWithdrawn: 0,
        tickets: 0,
        privacyMode: false,
        autoStrategy: null,
      });
    }

    const user = store.users.get(publicKey);
    user.lastLogin = new Date().toISOString();

    // Issue JWT
    const token = jwt.sign(
      { publicKey, sub: publicKey },
      process.env.JWT_SECRET || "dev_secret_change_me",
      { expiresIn: process.env.JWT_EXPIRY || "7d" }
    );

    res.json({
      token,
      expiresIn: "7d",
      user: {
        publicKey: user.publicKey,
        joinedAt: user.joinedAt,
        totalDeposited: user.totalDeposited,
        tickets: user.tickets,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * 
 * Invalidate session (client should also delete token).
 */
router.post("/logout", (req, res) => {
  // In production: blacklist token in Redis/DB
  res.json({ message: "Logged out successfully" });
});

/**
 * GET /api/auth/me
 * 
 * Get current user from JWT.
 */
router.get("/me", require("../middleware/auth"), (req, res) => {
  const user = store.users.get(req.publicKey);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

module.exports = router;