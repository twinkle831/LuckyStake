/**
 * In-memory store — replace with PostgreSQL/MongoDB in production.
 * Schema mirrors what you'd create in a real DB.
 */

const store = {
  // users[publicKey] = { publicKey, joinedAt, totalDeposited, tickets }
  users: new Map(),

  // challenges[nonce] = { publicKey, nonce, createdAt, used }
  challenges: new Map(),

  // deposits[id] = { id, publicKey, poolType, amount, txHash, depositedAt, withdrawnAt }
  deposits: new Map(),

  // pools[type] = { type, totalDeposited, yieldAccrued, participants, nextDraw }
  pools: new Map([
    ["daily", { type: "daily", totalDeposited: 0, yieldAccrued: 0, participants: 0, nextDraw: nextDrawTime("daily"), prizeHistory: [] }],
    ["weekly", { type: "weekly", totalDeposited: 0, yieldAccrued: 0, participants: 0, nextDraw: nextDrawTime("weekly"), prizeHistory: [] }],
    ["monthly", { type: "monthly", totalDeposited: 0, yieldAccrued: 0, participants: 0, nextDraw: nextDrawTime("monthly"), prizeHistory: [] }],
  ]),

  // prizes[id] = { id, winner, amount, poolType, drawnAt, txHash }
  prizes: new Map(),
};

function nextDrawTime(type) {
  const now = new Date();
  switch (type) {
    case "daily":
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    case "weekly":
      const nextMonday = new Date(now);
      nextMonday.setDate(nextMonday.getDate() + (7 - nextMonday.getDay() + 1) % 7 || 7);
      nextMonday.setHours(0, 0, 0, 0);
      return nextMonday.toISOString();
    case "monthly":
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return nextMonth.toISOString();
    default:
      return now.toISOString();
  }
}

// Cleanup expired challenges (run every 10 min)
setInterval(() => {
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  for (const [nonce, challenge] of store.challenges.entries()) {
    if (challenge.createdAt < tenMinAgo) {
      store.challenges.delete(nonce);
    }
  }
}, 10 * 60 * 1000);

module.exports = store;