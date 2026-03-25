const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const http = require("http");

const authRoutes = require("./routes/auth");
const poolRoutes = require("./routes/pools");
const depositRoutes = require("./routes/deposits");
const prizeRoutes = require("./routes/prizes");
const drawRoutes = require("./routes/draws");
const leaderboardRoutes = require("./routes/leaderboard");
const userRoutes = require("./routes/users");
const walletRoutes = require("./routes/wallet");
const cronRoutes = require("./routes/cron");
const agentRoutes = require("./routes/agent");
const { setupWebSocket } = require("./services/websocket");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);

// WebSocket for real-time pool updates
setupWebSocket(server);

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmet());

const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000").split(",");
app.use(
  cors({
    origin: "*"
  })
);

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts, please try again later." },
});

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Root (for Render / browser) ──────────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    message: "LuckyStake API",
    docs: "Use /api/pools, /api/auth, /api/deposits, etc.",
    health: "/health",
  });
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    network: process.env.STELLAR_NETWORK || "mainnet",
    version: "1.0.0",
  });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/pools", poolRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/prizes", prizeRoutes);
app.use("/api/draws", drawRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/agent", agentRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Cron: auto harvest + execute draw when period ends ───────────────────────
const cronDraw = require("./services/cron-draw");
const CRON_INTERVAL_MS = parseInt(process.env.CRON_INTERVAL_MS, 10) || 60 * 60 * 1000;
if (process.env.ADMIN_SECRET_KEY) {
  cronDraw.startCron(CRON_INTERVAL_MS);
  console.log(`Cron: draw checks every ${CRON_INTERVAL_MS / 60000} min`);
}

// ─── Agent Executor: automated set-and-forget strategies ─────────────────────
const { startExecutor } = require("./services/agent-executor");
if (process.env.ENABLE_AGENT_EXECUTOR !== "false") {
  startExecutor();
  console.log("Agent Executor: started (runs every 6 hours)");
}

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║       🎰 LuckyStake Backend API          ║
║  Port    : ${PORT}                           ║
║  Network : ${(process.env.STELLAR_NETWORK || "mainnet").padEnd(30)}║
║  Env     : ${(process.env.NODE_ENV || "development").padEnd(30)}║
╚══════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
