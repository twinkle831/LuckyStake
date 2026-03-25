/**
 * services/agent-executor.js
 *
 * Background service that executes automated agent strategies
 * Runs periodically to check for active strategies and execute deposits
 */

const store = require("./store");

/**
 * Check if it's time to execute a strategy
 * @param {object} strategy - The strategy to check
 * @returns {boolean}
 */
function shouldExecute(strategy) {
  if (strategy.status !== "active") {
    return false;
  }

  if (strategy.remainingBalance <= 0.0000001) {
    return false;
  }

  const nextExecution = new Date(strategy.nextExecutionTime);
  const now = new Date();

  return now >= nextExecution;
}

/**
 * Get next pool type based on allocation
 * @param {object} allocation - Pool allocation
 * @param {number} count - Execution count
 * @returns {string|null}
 */
function getNextPoolType(allocation, count) {
  const poolTypes = Object.keys(allocation).sort();
  if (poolTypes.length === 0) return null;
  return poolTypes[count % poolTypes.length];
}

/**
 * Execute a single strategy
 * @param {string} strategyId - Strategy ID
 * @param {object} strategy - Strategy object
 * @returns {Promise<object>} - Execution result
 */
async function executeStrategy(strategyId, strategy) {
  try {
    const nextPoolType = getNextPoolType(strategy.poolAllocation, strategy.executionCount);
    if (!nextPoolType) {
      throw new Error("Invalid pool allocation");
    }

    const allocation = strategy.poolAllocation[nextPoolType];
    let depositAmount = 0;

    if (typeof allocation === "number") {
      if (allocation > 1) {
        depositAmount = Math.min(allocation, strategy.remainingBalance);
      } else {
        depositAmount = strategy.totalAmount * allocation;
      }
    }

    if (depositAmount <= 0) {
      throw new Error("Invalid deposit amount");
    }

    depositAmount = Math.min(depositAmount, strategy.remainingBalance);

    // Get or create pool
    let pool = store.pools.get(nextPoolType);
    if (!pool) {
      pool = {
        type: nextPoolType,
        totalDeposited: 0,
        yieldAccrued: 0,
        participants: 0,
        nextDraw: store.nextDrawTime(nextPoolType),
        prizeHistory: [],
        suppliedToBlend: 0,
      };
      store.pools.set(nextPoolType, pool);
    }

    // Create deposit record
    const depositId = `agent-${strategyId}-${strategy.executionCount}`;
    const deposit = {
      id: depositId,
      publicKey: strategy.publicKey,
      poolType: nextPoolType,
      amount: depositAmount,
      txHash: `agent-execution-${Date.now()}`,
      depositedAt: new Date().toISOString(),
      tickets: Math.floor(depositAmount * 100), // Rough calculation
      withdrawnAt: null,
      payoutTxHash: null,
      payoutAt: null,
      payoutType: null,
      agentStrategyId: strategyId,
    };

    store.deposits.set(depositId, deposit);

    // Update pool
    pool.totalDeposited += depositAmount;
    pool.participants = (pool.participants || 0) + 1;
    store.pools.set(nextPoolType, pool);

    // Update user
    const user = store.users.get(strategy.publicKey);
    if (user) {
      user.totalDeposited = (user.totalDeposited || 0) + depositAmount;
      user.tickets = (user.tickets || 0) + deposit.tickets;
      store.users.set(strategy.publicKey, user);
    }

    // Update strategy
    const execution = {
      timestamp: new Date().toISOString(),
      poolType: nextPoolType,
      amount: depositAmount,
      txHash: deposit.txHash,
      status: "complete",
    };

    strategy.executionHistory.push(execution);
    strategy.executionCount += 1;
    strategy.totalDeposited += depositAmount;
    strategy.remainingBalance -= depositAmount;
    strategy.updatedAt = new Date().toISOString();

    // Calculate next execution time (6 hours)
    const nextExecution = new Date(Date.now() + 6 * 60 * 60 * 1000);
    strategy.nextExecutionTime = nextExecution.toISOString();

    // Check if strategy is complete
    if (strategy.remainingBalance <= 0.0000001 || strategy.executionCount >= 12) {
      strategy.status = "completed";
    }

    store.agentStrategies.set(strategyId, strategy);
    store.persist();

    console.log(`[Agent Executor] Executed strategy ${strategyId}: ${depositAmount} to ${nextPoolType}`);

    return {
      success: true,
      strategyId,
      execution,
    };
  } catch (error) {
    console.error(`[Agent Executor] Error executing strategy ${strategyId}:`, error.message);
    
    // Mark strategy as errored and pause
    strategy.status = "paused";
    strategy.updatedAt = new Date().toISOString();
    store.agentStrategies.set(strategyId, strategy);
    store.persist();

    return {
      success: false,
      strategyId,
      error: error.message,
    };
  }
}

/**
 * Execute all due strategies
 * @returns {Promise<object>} - Execution results
 */
async function executeAllDue() {
  const results = {
    total: 0,
    executed: 0,
    failed: 0,
    executions: [],
  };

  try {
    for (const [strategyId, strategy] of store.agentStrategies.entries()) {
      if (shouldExecute(strategy)) {
        results.total += 1;
        const result = await executeStrategy(strategyId, strategy);

        if (result.success) {
          results.executed += 1;
        } else {
          results.failed += 1;
        }

        results.executions.push(result);
      }
    }

    console.log(`[Agent Executor] Cycle complete: ${results.executed}/${results.total} executed, ${results.failed} failed`);
  } catch (error) {
    console.error("[Agent Executor] Critical error in execution cycle:", error.message);
  }

  return results;
}

/**
 * Start the agent executor service
 * Runs every 6 hours to check and execute due strategies
 */
function startExecutor() {
  const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

  console.log(`[Agent Executor] Starting executor service (interval: ${INTERVAL_MS / 60000} minutes)`);

  // Run immediately on startup
  executeAllDue();

  // Schedule periodic execution
  setInterval(executeAllDue, INTERVAL_MS);
}

module.exports = {
  executeAllDue,
  executeStrategy,
  startExecutor,
  shouldExecute,
};
