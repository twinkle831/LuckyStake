/**
 * routes/draws.js
 *
 * GET /api/draws           – public paginated draw history (all pools)
 * GET /api/draws/my        – draws where the authenticated user won or received a refund
 * GET /api/draws/:id       – single draw detail
 */

const express = require("express");
const router = express.Router();
const store = require("../services/store");
const auth = require("../middleware/auth");

/**
 * GET /api/draws
 * Public list of completed draws, sorted newest-first (max 50).
 */
router.get("/", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const poolType = req.query.pool; // optional filter

    let draws = Array.from(store.draws.values()).sort(
        (a, b) => new Date(b.drawnAt) - new Date(a.drawnAt)
    );

    if (poolType && ["weekly", "biweekly", "monthly"].includes(poolType)) {
        draws = draws.filter((d) => d.poolType === poolType);
    }

    draws = draws.slice(0, limit);

    res.json({
        draws,
        count: draws.length,
        total: store.draws.size,
    });
});

/**
 * GET /api/draws/my  (authenticated)
 * Draws where the user participated (won prize or received a refund).
 */
router.get("/my", auth, (req, res) => {
    const publicKey = req.publicKey;

    // Find deposits that have been paid out
    const myPayouts = Array.from(store.deposits.values())
        .filter((d) => d.publicKey === publicKey && d.payoutAt)
        .sort((a, b) => new Date(b.payoutAt) - new Date(a.payoutAt));

    // Find draws where user was the winner
    const wonDraws = Array.from(store.draws.values())
        .filter((d) => d.winner === publicKey)
        .sort((a, b) => new Date(b.drawnAt) - new Date(a.drawnAt));

    const totalWon = wonDraws.reduce((s, d) => s + (d.prizeAmount || 0), 0);
    const totalRefunded = myPayouts
        .filter((d) => d.payoutType === "refund")
        .reduce((s, d) => s + (d.amount || 0), 0);

    res.json({
        won: wonDraws,
        payouts: myPayouts,
        totalWon,
        totalRefunded,
        winCount: wonDraws.length,
    });
});

/**
 * GET /api/draws/:id
 * Single draw detail.
 */
router.get("/:id", (req, res) => {
    const draw = store.draws.get(req.params.id);
    if (!draw) return res.status(404).json({ error: "Draw not found" });
    res.json({ draw });
});

module.exports = router;
