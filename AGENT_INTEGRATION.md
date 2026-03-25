# AI Agent Integration Guide

This document explains how the new Set-and-Forget Agent system integrates with the existing `agent-api` (Python FastAPI service).

## Architecture Overview

The LuckyStake AI Agent system is composed of three integrated parts:

```
┌─────────────────┐
│  Frontend UI    │  (React/Next.js)
│  - Onboarding   │
│  - Strategy     │  
│    Dashboard    │
└────────┬────────┘
         │
    ┌────┴─────────────────────────────────────────┐
    │                                              │
    ▼                                              ▼
┌──────────────────┐                   ┌──────────────────┐
│  Main Backend    │                   │   Agent API      │
│  (Node.js)       │                   │   (Python)       │
│                  │                   │                  │
│ - Store          │   GET strategy    │ - Conversational │
│ - Routes         │◄─────────────────►│   AI             │
│ - Executor       │   allocation      │ - Allocation     │
│ - Deposits       │                   │   recommendations│
└──────────────────┘                   └──────────────────┘
         │
         ▼
  ┌─────────────┐
  │   Stellar   │
  │  Blockchain │
  └─────────────┘
```

## How It Works

### 1. User Creates Strategy

User opens the onboarding modal in the dashboard and specifies:
- Amount to deposit (in XLM)
- Duration (1-4 weeks)
- Risk tolerance (low/medium/high)
- Goal type (sure-shot/highest-prize)

### 2. Main Backend Calls Agent API

When the user clicks "Get Recommendation":

```
POST /api/agent/strategy/recommend
{
  "amount": 100,
  "duration": 2,
  "riskLevel": "medium",
  "goalType": "sure-shot"
}
```

The main backend (`/backend/src/routes/agent.js`) forwards this to agent-api:

```javascript
// Forward to agent-api
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
```

### 3. Agent API Returns Allocation

The Python FastAPI service analyzes the request and returns a recommended allocation:

```json
{
  "allocation": {
    "weekly": 0.4,
    "biweekly": 0.4,
    "monthly": 0.2
  },
  "message": "Balanced allocation for medium risk"
}
```

### 4. Strategy is Stored and Executed

Once the user confirms, the strategy is stored in the main backend:

```json
{
  "id": "strategy-uuid",
  "publicKey": "user-wallet-address",
  "totalAmount": 100,
  "remainingBalance": 100,
  "duration": 2,
  "riskLevel": "medium",
  "goalType": "sure-shot",
  "poolAllocation": {
    "weekly": 0.4,
    "biweekly": 0.4,
    "monthly": 0.2
  },
  "status": "active",
  "createdAt": "2026-03-25T...",
  "nextExecutionTime": "2026-03-25T07:00:00Z",
  "executionCount": 0,
  "totalDeposited": 0,
  "executionHistory": []
}
```

### 5. Agent Executor Runs Every 6 Hours

The executor service (`/backend/src/services/agent-executor.js`) periodically:
1. Checks all active strategies
2. Determines which pool to deposit to next (based on allocation %)
3. Creates a deposit transaction on Stellar
4. Updates strategy state
5. Logs execution in history

```
Strategy: 100 XLM for 2 weeks
Allocation: weekly=40%, biweekly=40%, monthly=20%

Hour 0:   Deposit 40 XLM to weekly pool    (execution count 0 % 3 = 0)
Hour 6:   Deposit 40 XLM to biweekly pool  (execution count 1 % 3 = 1)
Hour 12:  Deposit 20 XLM to monthly pool   (execution count 2 % 3 = 2)
Remaining: 0 XLM - strategy complete
```

## Environment Setup

### Backend Configuration

Set these environment variables in `/backend/.env`:

```bash
# Agent API URL - where the Python FastAPI service is running
AGENT_API_URL=http://localhost:8001

# Enable/disable the executor service
ENABLE_AGENT_EXECUTOR=true

# How often executor runs (in milliseconds)
AGENT_EXECUTOR_INTERVAL_MS=21600000  # 6 hours
```

### Frontend Configuration

The frontend already has AGENT_API_URL commented in `.env.example`, but it's optional since the frontend calls the main backend which proxies to agent-api:

```bash
# Frontend doesn't need this, but available if direct agent-api calls needed
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8001
```

## API Endpoints

### Main Backend Agent Routes

```
POST   /api/agent/strategy/recommend      — Get AI allocation recommendation
POST   /api/agent/strategy                — Create a new strategy
GET    /api/agent/strategy/:id            — Get strategy details
GET    /api/agent/strategies              — Get all strategies for user
POST   /api/agent/strategy/:id/execute    — Manually trigger execution
POST   /api/agent/strategy/:id/pause      — Pause a strategy
POST   /api/agent/strategy/:id/resume     — Resume a strategy
POST   /api/agent/strategy/:id/update     — Update preferences
DELETE /api/agent/strategy/:id            — Cancel/withdraw
```

### Agent API (Python FastAPI)

The agent-api exposes these endpoints (refer to `agent-api/README.md`):

```
POST   /strategy                          — Generate allocation recommendation
GET    /strategy?public_key=...           — Get last recommendation for user
POST   /chat                              — Conversational endpoint
```

## Data Flow

### Creating a Strategy

```
Frontend
  ↓
  POST /api/agent/strategy/recommend
  ├─ amount, duration, riskLevel, goalType
  ↓
Backend Route Handler (agent.js)
  ├─ Validate inputs
  ├─ Call AGENT_API_URL/strategy
  ├─ Parse response
  ↓
Agent API (Python)
  ├─ Claude analyzes preferences
  ├─ Generates allocation
  ├─ Returns to backend
  ↓
Backend Response
  ├─ allocation percentages
  ↓
Frontend Modal
  ├─ Shows allocation breakdown
  ├─ User confirms
  ↓
POST /api/agent/strategy
  ├─ amount, duration, riskLevel, goalType, poolAllocation
  ↓
Backend Route Handler
  ├─ Create strategy record
  ├─ Store in agentStrategies Map
  ├─ Persist to JSON
  ↓
Frontend
  ├─ Redirect to dashboard
  ├─ Show strategy card
```

### Executing a Strategy

```
Agent Executor (every 6 hours)
  ↓
Loop through all active strategies
  ├─ Check if execution time reached
  ├─ Determine next pool from allocation
  ├─ Calculate deposit amount
  ├─ Create deposit on Stellar
  ├─ Update strategy state
  ├─ Log execution
  ├─ Update remaining balance
  ↓
If remainingBalance <= 0
  ├─ Mark strategy as completed
  ↓
Dashboard
  ├─ Shows execution history
  ├─ Displays remaining balance
  ├─ Updates pool distributions
```

## Integration Points

### 1. Frontend to Backend
- **Onboarding Modal**: Calls `/api/agent/strategy/recommend` for AI recommendations
- **Dashboard**: Displays strategy cards, calls control endpoints (pause/resume/withdraw)

### 2. Backend to Agent API
- **Agent Routes**: Forwards recommendation requests to Python FastAPI service
- **Request Format**: Converts camelCase to snake_case for Python compatibility
- **Response Handling**: Parses agent allocation and returns to frontend

### 3. Backend to Stellar
- **Executor Service**: Creates deposit transactions using Stellar SDK
- **Atomic Operations**: Each deposit is a single transaction on blockchain

### 4. Data Persistence
- **Main Backend**: Stores strategies in JSON file (`data/db.json`)
- **Agent API**: Maintains conversation history (refer to agent-api docs)

## Error Handling

### If Agent API is Down

If `AGENT_API_URL` is unreachable or returns an error:

```javascript
// In agent.js
if (!agentResponse.ok) {
  console.error("[Agent Routes] agent-api error:", error);
  return res.status(500).json({ 
    error: "Failed to get AI allocation recommendation" 
  });
}
```

**Fallback Behavior**:
- Backend returns 500 error to frontend
- Frontend modal catches error and offers predefined allocations:
  - Low risk: 60% weekly, 30% biweekly, 10% monthly
  - Medium risk: 40% weekly, 40% biweekly, 20% monthly
  - High risk: 20% weekly, 30% biweekly, 50% monthly

### If Executor Fails

If an execution fails (e.g., insufficient balance):

```javascript
// In agent-executor.js
} catch (err) {
  // Mark execution as failed
  executionRecord.status = "failed";
  executionRecord.error = err.message;
  
  // Pause strategy
  strategy.status = "paused";
  strategy.lastError = err.message;
  
  // Notify user (via dashboard)
  store.agentStrategies.set(strategyId, strategy);
  store.persist();
  console.error(`[Agent Executor] Strategy ${strategyId} failed:`, err.message);
}
```

## Monitoring and Debugging

### Check If Executor is Running

```bash
# Look for log messages
docker logs backend_container | grep "Agent Executor"

# Should see:
# Agent Executor: started (runs every 6 hours)
```

### Check Active Strategies

```bash
# Query backend API
curl http://localhost:4000/api/agent/strategies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### View Execution History

```bash
# In dashboard, strategy card shows:
# - Execution count
# - Total deposited
# - Remaining balance
# - Execution history with timestamps and amounts
```

### Debug Agent API Communication

Enable logging in backend routes:

```javascript
// In agent.js
const agentResponse = await fetch(`${AGENT_API_URL}/strategy`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({...}),
});

console.log("[Agent Routes] Request to agent-api:", {...});
console.log("[Agent Routes] Response from agent-api:", agentData);
```

## Future Enhancements

1. **Tambo AI Integration**: Replace agent-api with Tambo's autonomous agent system
2. **Real-time Updates**: WebSocket updates for strategy execution progress
3. **Advanced Analytics**: ML-powered portfolio optimization
4. **User Preferences**: Learn from user behavior to improve allocations
5. **Multi-Asset Support**: Support USDC and other assets beyond XLM

## References

- [Agent API Documentation](./agent-api/README.md)
- [Backend Routes Documentation](./backend/src/routes/agent.js)
- [Agent Executor Documentation](./backend/src/services/agent-executor.js)
- [Frontend Onboarding Component](./frontend/components/ai-agent-onboarding.tsx)
- [Frontend Strategy Card](./frontend/components/agent-strategy-card.tsx)
