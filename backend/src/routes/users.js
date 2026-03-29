const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const store = require("../services/store");

/**
 * GET /api/users/me
 */
router.get("/me", auth, (req, res) => {
  const user = store.users.get(req.publicKey);
  if (!user) return res.status(404).json({ error: "User not found" });

  const deposits = Array.from(store.deposits.values()).filter(
    (d) => d.publicKey === req.publicKey
  );
  const prizes = Array.from(store.prizes.values()).filter(
    (p) => p.winner === req.publicKey
  );

  res.json({
    user: {
      ...user,
      activeDeposits: deposits.filter((d) => !d.withdrawnAt).length,
      totalPrizeWon: prizes.reduce((s, p) => s + p.amount, 0),
    },
  });
});

/**
 * PATCH /api/users/me/settings
 * Update privacy mode, auto-strategy
 */
router.patch("/me/settings", auth, (req, res) => {
  const user = store.users.get(req.publicKey);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { privacyMode, autoStrategy } = req.body;

  if (typeof privacyMode === "boolean") {
    user.privacyMode = privacyMode;
  }

  if (autoStrategy !== undefined) {
    // autoStrategy: { enabled, poolType, depositAmount, frequency }
    user.autoStrategy = autoStrategy;
  }

  store.persist();
  res.json({ message: "Settings updated", user });
});

/**
 * POST /api/users/me/email
 * Set/update user email for notifications
 */
router.post("/me/email", auth, (req, res) => {
  const user = store.users.get(req.publicKey);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { email } = req.body;

  if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  user.email = email;
  if (user.emailNotificationsEnabled === undefined) {
    user.emailNotificationsEnabled = true;
  }
  if (!user.notificationPreferences) {
    user.notificationPreferences = {
      weekly: true,
      biweekly: true,
      monthly: true,
    };
  }

  store.persist();
  res.json({ message: "Email updated", email });
});

/**
 * GET /api/users/me/notification-preferences
 * Get user's email notification preferences
 */
router.get("/me/notification-preferences", auth, (req, res) => {
  const user = store.users.get(req.publicKey);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    email: user.email || null,
    emailNotificationsEnabled: user.emailNotificationsEnabled !== false,
    notificationPreferences: user.notificationPreferences || {
      weekly: true,
      biweekly: true,
      monthly: true,
    },
  });
});

/**
 * PATCH /api/users/me/notification-preferences
 * Update email notification settings
 */
router.patch("/me/notification-preferences", auth, (req, res) => {
  const user = store.users.get(req.publicKey);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { emailNotificationsEnabled, notificationPreferences } = req.body;

  if (typeof emailNotificationsEnabled === "boolean") {
    user.emailNotificationsEnabled = emailNotificationsEnabled;
  }

  if (notificationPreferences && typeof notificationPreferences === "object") {
    user.notificationPreferences = {
      weekly: notificationPreferences.weekly !== false,
      biweekly: notificationPreferences.biweekly !== false,
      monthly: notificationPreferences.monthly !== false,
    };
  }

  store.persist();
  res.json({
    message: "Notification preferences updated",
    emailNotificationsEnabled: user.emailNotificationsEnabled !== false,
    notificationPreferences: user.notificationPreferences,
  });
});

/**
 * GET /api/users/leaderboard
 * Top depositors (respects privacy mode)
 */
router.get("/leaderboard", (req, res) => {
  const leaderboard = Array.from(store.users.values())
    .filter((u) => !u.privacyMode && u.totalDeposited > 0)
    .sort((a, b) => b.totalDeposited - a.totalDeposited)
    .slice(0, 20)
    .map((u, i) => ({
      rank: i + 1,
      // Mask public key for partial privacy
      publicKey: `${u.publicKey.slice(0, 6)}...${u.publicKey.slice(-4)}`,
      totalDeposited: u.totalDeposited,
      tickets: u.tickets,
    }));

  res.json({ leaderboard });
});

module.exports = router;
