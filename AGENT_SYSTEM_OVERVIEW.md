# LuckyStake Set-and-Forget Agent System Overview

A complete guide to the integrated AI Agent system that enables users to automate their lottery investment strategy.

## What is This?

The Set-and-Forget Agent system allows users to:

1. **Deposit once** - Specify amount and preferences
2. **Get AI recommendations** - Agent suggests optimal pool allocation
3. **Automate execution** - System deposits funds automatically every 6 hours
4. **Monitor dashboard** - Track strategy progress and execution history
5. **Full control** - Pause, resume, modify, or withdraw anytime

## Key Features

✅ **One-Click Strategy Creation** - 3-step onboarding modal
✅ **AI-Powered Allocation** - Claude generates optimal pool distribution
✅ **Automated Execution** - Background service runs every 6 hours
✅ **Full Dashboard** - Real-time strategy monitoring and control
✅ **Error Recovery** - Graceful fallback and error handling
✅ **Blockchain Integration** - Transparent Stellar transactions
✅ **User Privacy** - All data stored locally, no external tracking

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      LuckyStake Platform                     │
└─────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
    │  Frontend   │   │   Backend    │   │  Agent API   │
    │  (React)    │   │  (Node.js)   │   │  (Python)    │
    │             │   │              │   │              │
    │ - Dashboard │   │ - Routes     │   │ - ChatGPT    │
    │ - Modals    │───│ - Executor   │───│ - Claude     │
    │ - Cards     │   │ - Storage    │   │ - Analysis   │
    └─────────────┘   └──────────────┘   └──────────────┘
           │                  │
           └──────────────────┼──────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Stellar Network │
                    │  (Blockchain)   │
                    └─────────────────┘
```

## How It Works

### User Journey

1. **User opens LuckyStake dashboard**
   - Connects wallet
   - Views existing strategies or creates new one

2. **Clicks "Create Set-and-Forget Strategy"**
   - Opens onboarding modal
   - Step 1: Enter amount (e.g., 100 XLM)
   - Step 2: Choose preferences (duration, risk, goal)
   - Step 3: Review AI-recommended allocation

3. **AI generates recommendation**
   - Frontend sends preferences to backend
   - Backend calls agent-api
   - Claude analyzes and recommends allocation
   - Example: weekly: 40%, biweekly: 40%, monthly: 20%

4. **User creates strategy**
   - Allocation is stored in backend
   - Strategy marked as "active"
   - Dashboard shows strategy card

5. **System executes automatically**
   - Every 6 hours, executor checks active strategies
   - For each strategy, deposits to next pool in allocation
   - Updates strategy state (remaining balance, execution count)
   - Example: Hour 0→weekly pool (40 XLM), Hour 6→biweekly (40 XLM), Hour 12→monthly (20 XLM)

6. **User monitors progress**
   - Dashboard shows execution history
   - Tracks total deposited
   - Shows remaining balance
   - Can pause/resume/withdraw anytime

## Component Breakdown

### Frontend Components

#### 1. **AI Agent Onboarding Modal**
- **File**: `frontend/components/ai-agent-onboarding.tsx`
- **Purpose**: Guide users through strategy creation
- **Features**:
  - 3-step process
  - Amount input validation
  - Risk preference selection
  - AI allocation review
  - Fallback allocations if AI unavailable

#### 2. **Strategy Card**
- **File**: `frontend/components/agent-strategy-card.tsx`
- **Purpose**: Display and manage individual strategies
- **Features**:
  - Show total amount and remaining balance
  - Display pool allocation percentages
  - List execution history
  - Control buttons (pause/resume/withdraw)
  - Real-time status updates

#### 3. **Dashboard Integration**
- **File**: `frontend/app/app/page.tsx`
- **Purpose**: Display all user strategies
- **Features**:
  - Strategy cards grid
  - "New Strategy" button
  - Automatic loading on mount

### Backend Services

#### 1. **Agent Routes**
- **File**: `backend/src/routes/agent.js`
- **Endpoints**:
  - `POST /api/agent/strategy/recommend` - Get AI allocation
  - `POST /api/agent/strategy` - Create strategy
  - `GET /api/agent/strategy/:id` - Get details
  - `GET /api/agent/strategies` - List all
  - `POST /api/agent/strategy/:id/pause` - Pause
  - `POST /api/agent/strategy/:id/resume` - Resume
  - `DELETE /api/agent/strategy/:id` - Withdraw

#### 2. **Agent Executor Service**
- **File**: `backend/src/services/agent-executor.js`
- **Purpose**: Background cron job for automatic execution
- **Features**:
  - Runs every 6 hours (configurable)
  - Checks active strategies
  - Calculates next pool from allocation
  - Creates deposits on Stellar
  - Handles errors gracefully
  - Maintains execution history

#### 3. **Data Store**
- **File**: `backend/src/services/store.js`
- **Purpose**: In-memory data store with JSON persistence
- **Data Structure**:
  ```javascript
  agentStrategies: {
    "strategy-uuid": {
      id: "strategy-uuid",
      publicKey: "user-wallet",
      totalAmount: 100,
      remainingBalance: 60,
      duration: 2,
      riskLevel: "medium",
      goalType: "sure-shot",
      poolAllocation: {
        weekly: 0.4,
        biweekly: 0.4,
        monthly: 0.2
      },
      status: "active|paused|withdrawn|completed",
      createdAt: "2026-03-25T...",
      nextExecutionTime: "2026-03-25T07:00:00Z",
      executionCount: 2,
      totalDeposited: 40,
      executionHistory: [
        { timestamp: "...", pool: "weekly", amount: 40, txHash: "..." }
      ]
    }
  }
  ```

### Agent API Integration

#### Purpose
Python FastAPI service that handles AI logic

#### Key Endpoints
- `POST /strategy` - Generate allocation recommendation
- `GET /strategy?public_key=...` - Get last recommendation

#### How Integration Works
1. Main backend receives recommendation request
2. Validates parameters
3. Calls agent-api with normalized parameters
4. Receives allocation percentages
5. Returns to frontend

## Data Flow Diagrams

### Strategy Creation Flow

```
User fills form
  │
  ├─ Amount: 100 XLM
  ├─ Duration: 2 weeks
  ├─ Risk: Medium
  └─ Goal: Sure-shot
        │
        ▼
   GET AI RECOMMENDATION
        │
   Frontend → Backend(/api/agent/strategy/recommend)
        │
   Backend → Agent API(/strategy)
        │
   Claude analyzes preferences
        │
   Agent API ← allocation percentages
        │
   Backend ← allocation response
        │
   Frontend displays allocation
        │
   User confirms
        │
   CREATE STRATEGY
        │
   Frontend → Backend(/api/agent/strategy) + full allocation
        │
   Backend stores in agentStrategies Map
        │
   Backend persists to db.json
        │
   Frontend shows strategy card in dashboard
        │
   ✓ Strategy created successfully
```

### Execution Flow

```
Every 6 hours:
   │
   ▼
Executor runs
   │
   ├─ Loop through agentStrategies
   │  │
   │  ├─ Check if status = "active"
   │  ├─ Check if time >= nextExecutionTime
   │  ├─ Check if remainingBalance > 0
   │  │
   │  └─ For each active strategy:
   │     │
   │     ├─ Get next pool from allocation
   │     │  (pool index = executionCount % number_of_pools)
   │     │
   │     ├─ Calculate amount to deposit
   │     │  (amount = totalAmount × allocation[pool])
   │     │
   │     ├─ Cap amount to remainingBalance
   │     │
   │     ├─ Create deposit on Stellar
   │     │  (using stellar-sdk)
   │     │
   │     ├─ Update strategy state:
   │     │  ├─ executionCount++
   │     │  ├─ totalDeposited += amount
   │     │  ├─ remainingBalance -= amount
   │     │  ├─ nextExecutionTime += 6 hours
   │     │  └─ executionHistory.push({...})
   │     │
   │     └─ If remainingBalance <= 0:
   │        └─ status = "completed"
   │
   ├─ Persist updated strategies to db.json
   │
   └─ Log execution results
        │
   ✓ Executor complete, will run again in 6 hours
```

## Configuration

### Environment Variables

**Backend** (backend/.env):
```bash
# Required for agent system
AGENT_API_URL=http://localhost:8001
ENABLE_AGENT_EXECUTOR=true
AGENT_EXECUTOR_INTERVAL_MS=21600000  # 6 hours

# Required for basic function
PORT=4000
ADMIN_SECRET_KEY=secret_key
STELLAR_NETWORK=mainnet

# Pool contracts (mainnet)
POOL_CONTRACT_WEEKLY=CCE...
POOL_CONTRACT_BIWEEKLY=CCI...
POOL_CONTRACT_MONTHLY=CDA...
```

**Agent API** (agent-api/.env):
```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
MODEL=claude-3-5-sonnet-20241022
TEMPERATURE=0.7
MAX_TOKENS=1000
```

**Frontend** (frontend/.env.local):
```bash
# Points to backend
NEXT_PUBLIC_API_URL=http://localhost:4000

# Stellar configuration
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
NEXT_PUBLIC_STELLAR_RPC_URL=https://mainnet.sorobanrpc.com

# Pool contracts
NEXT_PUBLIC_POOL_CONTRACT_WEEKLY=CCE...
NEXT_PUBLIC_POOL_CONTRACT_BIWEEKLY=CCI...
NEXT_PUBLIC_POOL_CONTRACT_MONTHLY=CDA...
```

## Testing the System

### Quick Test (5 minutes)

1. Start all three services (see AGENT_SETUP_GUIDE.md)
2. Open http://localhost:3000
3. Connect wallet
4. Create strategy with 100 XLM
5. Verify allocation shown
6. Create and see it in dashboard

### Full Test (30 minutes)

1. Create strategy
2. Manually trigger executor or wait 6 hours
3. Watch dashboard update with execution
4. Verify deposits on Stellar blockchain
5. Test pause/resume/withdraw

See AGENT_SETUP_GUIDE.md for complete testing scenarios.

## Monitoring

### Dashboard Indicators

- **Execution Count**: How many times strategy has executed
- **Total Deposited**: Sum of all deposits made so far
- **Remaining Balance**: How much left to distribute
- **Next Execution**: When next deposit will happen
- **Status**: active/paused/withdrawn/completed

### Database Inspection

```bash
# View all strategies
cat backend/data/db.json | jq '.agentStrategies'

# View execution history for one strategy
cat backend/data/db.json | jq '.agentStrategies["id"].executionHistory'

# View deposits created by agent
cat backend/data/db.json | jq '.deposits | to_entries[] | select(.value.id | startswith("agent-"))'
```

### Logs

**Backend logs** should show:
```
[Agent Executor] Executing strategy strategy-uuid
[Agent Executor] Created deposit: 40 XLM to weekly pool
[Agent Executor] Strategy strategy-uuid: execution 1 complete
```

## Error Handling

### What happens if things go wrong?

**Agent API Down**:
- Recommendation fails
- Frontend shows error toast
- User can select manual allocations (fallback)

**Insufficient Balance**:
- Deposit attempt fails
- Executor logs error
- Strategy paused with error message
- User sees "Error: Insufficient balance" on card

**Network Error**:
- Stellar RPC unreachable
- Executor retries on next interval
- Strategy remains active, execution delayed

**Invalid Allocation**:
- Executor validates before executing
- Returns 400 error
- Strategy paused until fixed

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| Get AI Recommendation | 2-5 sec | Depends on Claude API response time |
| Create Strategy | 500 ms | Stores in memory + persists to JSON |
| List Strategies | 10-20 ms | In-memory lookup |
| Execute Strategy | 1-2 sec | Includes Stellar blockchain confirmation |
| Dashboard Load | 500 ms | Fetches user strategies and pools |

## Security Considerations

1. **Authentication**: JWT tokens validated on all agent endpoints
2. **Authorization**: Users can only access their own strategies
3. **Data Privacy**: All strategy data stored locally in backend
4. **Blockchain**: All deposits are public on Stellar (transparent)
5. **API Keys**: Claude key stored only in agent-api, not main backend

## Troubleshooting Quick Reference

| Issue | Check |
|-------|-------|
| "Failed to get recommendation" | Agent API running at AGENT_API_URL? |
| Executor not running | ENABLE_AGENT_EXECUTOR=true in .env? |
| Strategy not appearing | Refresh browser? JWT token valid? |
| Transaction fails | Wallet has sufficient balance? Network reachable? |
| No deposits after 6 hours | Check executor logs, AGENT_EXECUTOR_INTERVAL_MS set? |

## File Reference

### Key Files

- **Frontend**
  - `frontend/components/ai-agent-onboarding.tsx` - Strategy creation modal
  - `frontend/components/agent-strategy-card.tsx` - Strategy display card
  - `frontend/app/app/page.tsx` - Dashboard integration

- **Backend**
  - `backend/src/routes/agent.js` - Agent API routes (8 endpoints)
  - `backend/src/services/agent-executor.js` - Executor service
  - `backend/src/services/store.js` - Data store with agentStrategies

- **Documentation**
  - `AGENT_SYSTEM_OVERVIEW.md` - This file
  - `AGENT_INTEGRATION.md` - Technical architecture
  - `AGENT_INTEGRATION_CHANGES.md` - What changed
  - `AGENT_SETUP_GUIDE.md` - Complete setup guide
  - `IMPLEMENTATION_SUMMARY.md` - Original implementation details

## Future Enhancements

1. **Tambo AI Integration**: Replace Claude with Tambo autonomous agents
2. **Machine Learning**: Learn from historical performance to optimize allocations
3. **Advanced Analytics**: Dashboard charts and performance metrics
4. **Multi-Asset Support**: USDC, USDT, other tokens beyond XLM
5. **WebSocket Updates**: Real-time execution progress notifications
6. **Strategy Templates**: Pre-built strategies for different investment goals
7. **Community Strategies**: Share and fork strategies from other users
8. **Tax Reports**: Automatic tax report generation

## Support & Documentation

- **Setup Issues**: See AGENT_SETUP_GUIDE.md
- **Architecture Questions**: See AGENT_INTEGRATION.md
- **API Details**: See backend/src/routes/agent.js
- **Implementation Details**: See IMPLEMENTATION_SUMMARY.md
- **Testing**: See AGENT_SETUP_GUIDE.md testing section

## Getting Help

1. Check relevant documentation files above
2. Enable debug logging (see AGENT_SETUP_GUIDE.md)
3. Check backend/frontend logs for error messages
4. Verify all services running (use health check commands)
5. Check database state with jq commands shown above
