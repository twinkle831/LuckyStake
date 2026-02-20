require("dotenv").config();
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
const userRoutes = require("./routes/users");
const walletRoutes = require("./routes/wallet");
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
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
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

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    network: process.env.STELLAR_NETWORK || "testnet",
    version: "1.0.0",
  });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/pools", poolRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/prizes", prizeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wallet", walletRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║       🎰 LuckyStake Backend API          ║
║  Port    : ${PORT}                           ║
║  Network : ${(process.env.STELLAR_NETWORK || "testnet").padEnd(30)}║
║  Env     : ${(process.env.NODE_ENV || "development").padEnd(30)}║
╚══════════════════════════════════════════╝
  `);
});

module.exports = { app, server };