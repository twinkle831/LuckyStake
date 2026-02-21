/**
 * routes/auth.js
 *
 * Two jobs only:
 *   POST /api/auth/challenge  — frontend sends user's wallet address, gets a nonce back
 *   POST /api/auth/verify     — frontend sends address + nonce back, gets JWT
 *
 * No TREASURY_PUBLIC_KEY needed. No XDR signing needed.
 * Works out of the box with only JWT_SECRET in .env.
 */

const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const StellarSdk = require("@stellar/stellar-sdk");
const store = require("../services/store");

// ─── POST /api/auth/challenge ─────────────────────────────────────────────────
// Frontend sends: { publicKey: "GABC..." }  ← comes from Freighter/xBull after connect
// Returns:        { nonce, expiresAt }
router.post("/challenge", (req, res) => {
  const { publicKey } = req.body;

  if (!publicKey) {
    return res.status(400).json({ error: "publicKey is required" });
  }

  // Make sure it's a real Stellar address format
  try {
    StellarSdk.Keypair.fromPublicKey(publicKey);
  } catch {
    return res.status(400).json({ error: "Invalid Stellar address format (must start with G)" });
  }

  const nonce = uuidv4();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  store.challenges.set(nonce, {
    publicKey,   // the user's wallet address — stored to verify on /verify
    nonce,
    createdAt: Date.now(),
    expiresAt,
    used: false,
  });

  res.json({ nonce, expiresAt: new Date(expiresAt).toISOString() });
});

// ─── POST /api/auth/verify ────────────────────────────────────────────────────
// Frontend sends: { publicKey: "GABC...", nonce: "uuid" }
// Returns:        { token, user }
router.post("/verify", (req, res) => {
  const { publicKey, nonce } = req.body;

  if (!publicKey || !nonce) {
    return res.status(400).json({ error: "publicKey and nonce are required" });
  }

  const challenge = store.challenges.get(nonce);

  if (!challenge)                           return res.status(401).json({ error: "Invalid nonce — request a new challenge" });
  if (challenge.used)                       return res.status(401).json({ error: "Nonce already used" });
  if (Date.now() > challenge.expiresAt)     { store.challenges.delete(nonce); return res.status(401).json({ error: "Nonce expired — request a new challenge" }); }
  if (challenge.publicKey !== publicKey)    return res.status(401).json({ error: "Address does not match challenge" });

  // Mark used so it can't be replayed
  challenge.used = true;

  // Create user on first connect
  if (!store.users.has(publicKey)) {
    store.users.set(publicKey, {
      publicKey,
      joinedAt: new Date().toISOString(),
      totalDeposited: 0,
      tickets: 0,
    });
  }

  store.users.get(publicKey).lastLogin = new Date().toISOString();

  const token = jwt.sign(
    { sub: publicKey, publicKey },
    process.env.JWT_SECRET || "dev_secret_change_me",
    { expiresIn: "7d" }
  );

  res.json({
    token,
    user: store.users.get(publicKey),
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out" });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", require("../middleware/auth"), (req, res) => {
  const user = store.users.get(req.publicKey);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

module.exports = router;