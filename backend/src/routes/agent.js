/**
 * routes/agent.js
 *
 * AI Agent "Set and Forget" Routes
 * Allows users to create automated deposit strategies that execute periodically
 *
 * POST   /api/agent/strategy              — Create a new strategy
 * GET    /api/agent/strategy/:id          — Get strategy details
 * GET    /api/agent/strategies            — Get all active strategies for user
 * POST   /api/agent/strategy/:id/execute  — Manually trigger strategy execution
 * POST   /api/agent/strategy/:id/pause    — Pause a strategy
 * POST   /api/agent/strategy/:id/resume   — Resume a strategy
 * POST   /api/agent/strategy/:id/update   — Update strategy preferences
 * DELETE /api/agent/strategy/:id          — Cancel/withdraw from strategy
 */

const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const auth = require("../middleware/auth");
const store = require("../services/store");

const AGENT_API_URL = process.env.AGENT_API_URL || "http://localhost:8001";

console.log("[Agent Routes] Using agent-api at", AGENT_API_URL);

// Helper: Calculate next execution time based on pool allocation
function calculateNextExecutionTime() {
  const now = new Date();
  // Start execution in 1 hour
  const nextExecution = new Date(now.getTime() + 60 * 60 * 1000);
  return nextExecution.toISOString();
}

// Helper: Get pool type based on execution count and allocation
function getNextPoolType(allocation, executionCount) {
  const poolTypes = Object.keys(allocation).sort();
  if (poolTypes.length === 0) return null;
  return poolTypes[executionCount % poolTypes.length];
}

// ─── POST /api/agent/strategy/recommend ──────────────────────────────────────
// Get AI recommendation for allocation (delegates to agent-api)
router.post("/strategy/recommend", auth, async (req, res, next) => {
  try {
    const { amount: rawAmount, duration, riskLevel, goalType } = req.body;
    const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : Number(rawAmount);

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }
    if (!duration || duration < 1 || duration > 4) {
      return res.status(400).json({ error: "duration must be 1-4 weeks" });
    }
    if (!["low", "medium", "high"].includes(riskLevel)) {
      return res.status(400).json({ error: "riskLevel must be 'low', 'medium', or 'high'" });
    }
    if (!["sure-shot", "highest-prize"].includes(goalType)) {
      return res.status(400).json({ error: "goalType must be 'sure-shot' or 'highest-prize'" });
    }

    // Call agent-api for allocation recommendation
    const agentResponse = await fetch(`${AGENT_API_URL}/strategy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        duration,
        risk_level: riskLevel,
        goal_type: goalType,
      }),
    });

    if (!agentResponse.ok) {
      const error = await agentResponse.text();
      console.error("[Agent Routes] agent-api error:", error);
      return res.status(500).json({ error: "Failed to get AI allocation recommendation" });
    }

    const agentData = await agentResponse.json();

    res.json({
      allocation: agentData.allocation,
      message: agentData.message || "Allocation recommendation generated",
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/agent/strategy ─────────────────────────────────────────────────
// Create a new agent strategy
router.post("/strategy", auth, async (req, res, next) => {
  try {
    const { amount: rawAmount, duration, riskLevel, goalType, poolAllocation } = req.body;
    const amount = typeof rawAmount === "string" ? parseFloat(rawAmount) : Number(rawAmount);

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }
    if (!duration || duration < 1 || duration > 4) {
      return res.status(400).json({ error: "duration must be 1-4 weeks" });
    }
    if (!["low", "medium", "high"].includes(riskLevel)) {
      return res.status(400).json({ error: "riskLevel must be 'low', 'medium', or 'high'" });
    }
    if (!["sure-shot", "highest-prize"].includes(goalType)) {
      return res.status(400).json({ error: "goalType must be 'sure-shot' or 'highest-prize'" });
    }
    if (!poolAllocation || typeof poolAllocation !== "object") {
      return res.status(400).json({ error: "poolAllocation is required" });
    }

    // Verify user exists
    const user = store.users.get(req.publicKey);
    if (!user) {
      return res.status(400).json({ error: "User not found, please sign in first" });
    }

    const strategyId = uuidv4();
    const now = new Date().toISOString();

    const strategy = {
      id: strategyId,
      publicKey: req.publicKey,
      totalAmount: amount,
      remainingBalance: amount,
      duration,
      riskLevel,
      goalType,
      poolAllocation,
      status: "active",
      createdAt: now,
      updatedAt: now,
      nextExecutionTime: calculateNextExecutionTime(),
      executionCount: 0,
      totalDeposited: 0,
      executionHistory: [],
    };

    store.agentStrategies.set(strategyId, strategy);
    store.persist();

    res.status(201).json({
      id: strategyId,
      message: "Strategy created successfully",
      strategy,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/agent/strategy/:id ──────────────────────────────────────────────
// Get strategy details
router.get("/strategy/:id", auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const strategy = store.agentStrategies.get(id);

    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    if (strategy.publicKey !== req.publicKey) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(strategy);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/agent/strategies ────────────────────────────────────────────────
// Get all active strategies for authenticated user
router.get("/strategies", auth, async (req, res, next) => {
  try {
    const userStrategies = [];
    for (const [id, strategy] of store.agentStrategies.entries()) {
      if (strategy.publicKey === req.publicKey) {
        userStrategies.push(strategy);
      }
    }

    res.json({
      count: userStrategies.length,
      strategies: userStrategies,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/agent/strategy/:id/execute ────────────────────────────────────
// Manually trigger strategy execution
router.post("/strategy/:id/execute", auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const strategy = store.agentStrategies.get(id);

    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    if (strategy.publicKey !== req.publicKey) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (strategy.status !== "active") {
      return res.status(400).json({ error: "Strategy is not active" });
    }

    if (strategy.remainingBalance <= 0) {
      return res.status(400).json({ error: "No remaining balance to deposit" });
    }

    // Get next pool type to deposit to
    const nextPoolType = getNextPoolType(strategy.poolAllocation, strategy.executionCount);
    if (!nextPoolType) {
      return res.status(400).json({ error: "Invalid pool allocation" });
    }

    // Calculate deposit amount (proportional to allocation)
    const allocation = strategy.poolAllocation[nextPoolType];
    let depositAmount = 0;

    if (typeof allocation === "number") {
      if (allocation > 1) {
        // Fixed amount
        depositAmount = Math.min(allocation, strategy.remainingBalance);
      } else {
        // Percentage
        depositAmount = strategy.totalAmount * allocation;
      }
    }

    if (depositAmount <= 0) {
      return res.status(400).json({ error: "Invalid deposit amount" });
    }

    depositAmount = Math.min(depositAmount, strategy.remainingBalance);

    // Record execution
    const execution = {
      timestamp: new Date().toISOString(),
      poolType: nextPoolType,
      amount: depositAmount,
      status: "pending",
    };

    strategy.executionHistory.push(execution);
    strategy.executionCount += 1;
    strategy.totalDeposited += depositAmount;
    strategy.remainingBalance -= depositAmount;
    strategy.updatedAt = new Date().toISOString();
    strategy.nextExecutionTime = calculateNextExecutionTime();

    // Check if strategy is complete
    if (strategy.remainingBalance <= 0.0000001 || strategy.executionCount >= 12) {
      strategy.status = "completed";
    }

    store.agentStrategies.set(id, strategy);
    store.persist();

    res.json({
      message: "Execution recorded successfully",
      execution,
      strategy,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/agent/strategy/:id/pause ───────────────────────────────────────
// Pause a strategy
router.post("/strategy/:id/pause", auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const strategy = store.agentStrategies.get(id);

    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    if (strategy.publicKey !== req.publicKey) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (strategy.status !== "active") {
      return res.status(400).json({ error: "Strategy is not active" });
    }

    strategy.status = "paused";
    strategy.updatedAt = new Date().toISOString();
    store.agentStrategies.set(id, strategy);
    store.persist();

    res.json({
      message: "Strategy paused successfully",
      strategy,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/agent/strategy/:id/resume ──────────────────────────────────────
// Resume a strategy
router.post("/strategy/:id/resume", auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const strategy = store.agentStrategies.get(id);

    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    if (strategy.publicKey !== req.publicKey) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (strategy.status !== "paused") {
      return res.status(400).json({ error: "Strategy is not paused" });
    }

    strategy.status = "active";
    strategy.updatedAt = new Date().toISOString();
    strategy.nextExecutionTime = calculateNextExecutionTime();
    store.agentStrategies.set(id, strategy);
    store.persist();

    res.json({
      message: "Strategy resumed successfully",
      strategy,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/agent/strategy/:id/update ──────────────────────────────────────
// Update strategy preferences
router.post("/strategy/:id/update", auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { riskLevel, goalType, poolAllocation } = req.body;
    const strategy = store.agentStrategies.get(id);

    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    if (strategy.publicKey !== req.publicKey) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (riskLevel && !["low", "medium", "high"].includes(riskLevel)) {
      return res.status(400).json({ error: "Invalid riskLevel" });
    }

    if (goalType && !["sure-shot", "highest-prize"].includes(goalType)) {
      return res.status(400).json({ error: "Invalid goalType" });
    }

    if (riskLevel) strategy.riskLevel = riskLevel;
    if (goalType) strategy.goalType = goalType;
    if (poolAllocation) strategy.poolAllocation = poolAllocation;

    strategy.updatedAt = new Date().toISOString();
    store.agentStrategies.set(id, strategy);
    store.persist();

    res.json({
      message: "Strategy updated successfully",
      strategy,
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/agent/strategy/:id ────────────────────────────────────────────
// Cancel/withdraw from strategy
router.delete("/strategy/:id", auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const strategy = store.agentStrategies.get(id);

    if (!strategy) {
      return res.status(404).json({ error: "Strategy not found" });
    }

    if (strategy.publicKey !== req.publicKey) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Mark as withdrawn
    strategy.status = "withdrawn";
    strategy.updatedAt = new Date().toISOString();
    store.agentStrategies.set(id, strategy);
    store.persist();

    res.json({
      message: "Strategy withdrawn successfully",
      remainingBalance: strategy.remainingBalance,
      totalDeposited: strategy.totalDeposited,
      strategy,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
