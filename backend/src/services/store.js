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

  // pools[type] = { type, totalDeposited, yieldAccrued, participants, nextDraw, suppliedToBlend }
  pools: new Map([
    ["weekly", { type: "weekly", totalDeposited: 0, yieldAccrued: 0, participants: 0, nextDraw: nextDrawTime("weekly"), prizeHistory: [], suppliedToBlend: 0 }],
    ["biweekly", { type: "biweekly", totalDeposited: 0, yieldAccrued: 0, participants: 0, nextDraw: nextDrawTime("biweekly"), prizeHistory: [], suppliedToBlend: 0 }],
    ["monthly", { type: "monthly", totalDeposited: 0, yieldAccrued: 0, participants: 0, nextDraw: nextDrawTime("monthly"), prizeHistory: [], suppliedToBlend: 0 }],
  ]),

  // prizes[id] = { id, winner, amount, poolType, drawnAt, txHash }
  prizes: new Map(),
};

function nextDrawTime(type) {
  const now = new Date();
  switch (type) {
    case "weekly": {
      const nextMonday = new Date(now);
      nextMonday.setDate(nextMonday.getDate() + ((7 - nextMonday.getDay() + 1) % 7 || 7));
      nextMonday.setHours(0, 0, 0, 0);
      return nextMonday.toISOString();
    }
    case "biweekly": {
      const refMonday = new Date("2020-01-06T00:00:00Z");
      const msPer14Days = 14 * 24 * 60 * 60 * 1000;
      const periods = Math.ceil((now.getTime() - refMonday.getTime()) / msPer14Days);
      const nextDraw = new Date(refMonday.getTime() + periods * msPer14Days);
      return nextDraw.toISOString();
    }
    case "monthly": {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return nextMonth.toISOString();
    }
    default:
      return now.toISOString();
  }
}

/** Advance nextDraw to the following period (call after successful on-chain draw). */
function advanceNextDraw(type) {
  const pool = store.pools.get(type);
  if (!pool) return;
  const from = new Date(pool.nextDraw);
  switch (type) {
    case "weekly":
      from.setDate(from.getDate() + 7);
      break;
    case "biweekly":
      from.setDate(from.getDate() + 14);
      break;
    case "monthly":
      from.setMonth(from.getMonth() + 1);
      from.setDate(1);
      break;
    default:
      return;
  }
  pool.nextDraw = from.toISOString();
}

store.nextDrawTime = nextDrawTime;
store.advanceNextDraw = advanceNextDraw;

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