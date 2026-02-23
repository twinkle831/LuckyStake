/**
 * routes/leaderboard.js
 *
 * GET /api/leaderboard   – top winners ranked by cumulative prize amount
 */

const express = require("express");
const router = express.Router();
const store = require("../services/store");

/**
 * GET /api/leaderboard
 * Aggregates draws by winner address and returns top N (default 50).
 */
router.get("/", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // Aggregate total winnings per address
    const totals = new Map(); // publicKey → { publicKey, totalWon, winCount, lastWon, lastPoolType }

    for (const draw of store.draws.values()) {
        if (!draw.winner || draw.payoutStatus === "pending") continue;

        const existing = totals.get(draw.winner) || {
            publicKey: draw.winner,
            totalWon: 0,
            winCount: 0,
            lastWon: null,
            lastPoolType: null,
        };

        existing.totalWon += draw.prizeAmount || 0;
        existing.winCount += 1;

        if (!existing.lastWon || new Date(draw.drawnAt) > new Date(existing.lastWon)) {
            existing.lastWon = draw.drawnAt;
            existing.lastPoolType = draw.poolType;
        }

        totals.set(draw.winner, existing);
    }

    const leaderboard = Array.from(totals.values())
        .sort((a, b) => b.totalWon - a.totalWon)
        .slice(0, limit)
        .map((entry, index) => ({ rank: index + 1, ...entry }));

    // Summary stats
    const allDraws = Array.from(store.draws.values()).filter(
        (d) => d.payoutStatus !== "pending"
    );
    const totalDrawn = allDraws.reduce((s, d) => s + (d.prizeAmount || 0), 0);
    const largestPrize = allDraws.reduce(
        (max, d) => Math.max(max, d.prizeAmount || 0),
        0
    );

    res.json({
        leaderboard,
        stats: {
            totalDrawn,
            uniqueWinners: totals.size,
            totalDraws: allDraws.length,
            largestPrize,
        },
    });
});

module.exports = router;
