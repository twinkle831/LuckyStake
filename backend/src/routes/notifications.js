const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const store = require("../services/store");

/**
 * GET /api/notifications
 * List user's notification history
 */
router.get("/", auth, (req, res) => {
  const notifications = Array.from(store.notifications.values())
    .filter((n) => n.userId === req.publicKey)
    .sort((a, b) => new Date(b.drawnAt) - new Date(a.drawnAt));

  res.json({ notifications });
});

/**
 * GET /api/notifications/:id
 * Get notification detail
 */
router.get("/:id", auth, (req, res) => {
  const notification = store.notifications.get(req.params.id);

  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }

  if (notification.userId !== req.publicKey) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  res.json(notification);
});

module.exports = router;
