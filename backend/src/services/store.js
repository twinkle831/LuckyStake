const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "..", "..", "data", "store.json");

const store = {
  // users[publicKey] = { publicKey, joinedAt, totalDeposited, tickets }
  users: new Map(),

  // challenges[nonce] = { publicKey, nonce, createdAt, used }
  challenges: new Map(),

  // deposits[id] = { id, publicKey, poolType, amount, txHash, depositedAt, withdrawnAt, withdrawnAmount, ticketsRemaining }
  deposits: new Map(),

  // pools[type] = { type, totalDeposited, yieldAccrued, participants, nextDraw, suppliedToBlend }
  pools: new Map(),

  // prizes[id] = { id, winner, amount, poolType, drawnAt, txHash }
  prizes: new Map(),
};

function drawClock() {
  const drawHour = Number.parseInt(process.env.DRAW_HOUR_LOCAL || "18", 10);
  const drawMinute = Number.parseInt(process.env.DRAW_MINUTE_LOCAL || "0", 10);
  return { drawHour, drawMinute };
}

function setDrawClock(d) {
  const { drawHour, drawMinute } = drawClock();
  d.setHours(drawHour, drawMinute, 0, 0);
  return d;
}

function nextDrawTime(type) {
  const now = new Date();

  switch (type) {
    case "weekly": {
      const nextMonday = setDrawClock(new Date(now));
      const dayDelta = (1 - nextMonday.getDay() + 7) % 7;
      nextMonday.setDate(nextMonday.getDate() + dayDelta);
      if (nextMonday <= now) nextMonday.setDate(nextMonday.getDate() + 7);
      return nextMonday.toISOString();
    }
    case "biweekly": {
      const refDate = setDrawClock(new Date("2020-01-06T00:00:00"));
      const msPer15Days = 15 * 24 * 60 * 60 * 1000;
      const periods = Math.ceil((now.getTime() - refDate.getTime()) / msPer15Days);
      const nextDraw = new Date(refDate.getTime() + periods * msPer15Days);
      return nextDraw.toISOString();
    }
    case "monthly": {
      const thisMonth = setDrawClock(new Date(now.getFullYear(), now.getMonth(), 1));
      if (thisMonth > now) return thisMonth.toISOString();
      return setDrawClock(new Date(now.getFullYear(), now.getMonth() + 1, 1)).toISOString();
    }
    default:
      return now.toISOString();
  }
}

function defaultPools() {
  return new Map([
    [
      "weekly",
      {
        type: "weekly",
        totalDeposited: 0,
        yieldAccrued: 0,
        participants: 0,
        nextDraw: nextDrawTime("weekly"),
        prizeHistory: [],
        suppliedToBlend: 0,
      },
    ],
    [
      "biweekly",
      {
        type: "biweekly",
        totalDeposited: 0,
        yieldAccrued: 0,
        participants: 0,
        nextDraw: nextDrawTime("biweekly"),
        prizeHistory: [],
        suppliedToBlend: 0,
      },
    ],
    [
      "monthly",
      {
        type: "monthly",
        totalDeposited: 0,
        yieldAccrued: 0,
        participants: 0,
        nextDraw: nextDrawTime("monthly"),
        prizeHistory: [],
        suppliedToBlend: 0,
      },
    ],
  ]);
}

function ensureDataDir() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

function persist() {
  ensureDataDir();
  const serializable = {
    users: Object.fromEntries(store.users),
    challenges: Object.fromEntries(store.challenges),
    deposits: Object.fromEntries(store.deposits),
    pools: Object.fromEntries(store.pools),
    prizes: Object.fromEntries(store.prizes),
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(serializable, null, 2), "utf8");
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    store.pools = defaultPools();
    persist();
    return;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    store.users = new Map(Object.entries(raw.users || {}));
    store.challenges = new Map(Object.entries(raw.challenges || {}));
    store.deposits = new Map(Object.entries(raw.deposits || {}));
    store.pools = new Map(Object.entries(raw.pools || {}));
    store.prizes = new Map(Object.entries(raw.prizes || {}));
  } catch {
    store.users = new Map();
    store.challenges = new Map();
    store.deposits = new Map();
    store.pools = defaultPools();
    store.prizes = new Map();
    persist();
  }

  const defaults = defaultPools();
  for (const [type, poolDefaults] of defaults.entries()) {
    const existing = store.pools.get(type);
    if (!existing) {
      store.pools.set(type, poolDefaults);
      continue;
    }
    if (!existing.nextDraw) existing.nextDraw = nextDrawTime(type);
    if (!Array.isArray(existing.prizeHistory)) existing.prizeHistory = [];
    if (typeof existing.suppliedToBlend !== "number") existing.suppliedToBlend = 0;
    if (typeof existing.totalDeposited !== "number") existing.totalDeposited = 0;
    if (typeof existing.yieldAccrued !== "number") existing.yieldAccrued = 0;
    if (typeof existing.participants !== "number") existing.participants = 0;
  }
}

function advanceNextDraw(type) {
  const pool = store.pools.get(type);
  if (!pool) return;

  const from = new Date(pool.nextDraw);
  switch (type) {
    case "weekly":
      from.setDate(from.getDate() + 7);
      break;
    case "biweekly":
      from.setDate(from.getDate() + 15);
      break;
    case "monthly":
      from.setMonth(from.getMonth() + 1);
      from.setDate(1);
      break;
    default:
      return;
  }

  setDrawClock(from);
  pool.nextDraw = from.toISOString();
  persist();
}

store.nextDrawTime = nextDrawTime;
store.advanceNextDraw = advanceNextDraw;
store.persist = persist;

load();

setInterval(() => {
  const tenMinAgo = Date.now() - 10 * 60 * 1000;
  let changed = false;
  for (const [nonce, challenge] of store.challenges.entries()) {
    if (challenge.createdAt < tenMinAgo) {
      store.challenges.delete(nonce);
      changed = true;
    }
  }
  if (changed) persist();
}, 10 * 60 * 1000);

module.exports = store;
