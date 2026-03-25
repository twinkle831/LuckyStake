# Complete Agent Integration Setup Guide

This guide walks you through setting up and testing the integrated Set-and-Forget Agent system with the existing agent-api.

## Prerequisites

- Node.js 18+ (backend)
- Python 3.9+ (agent-api)
- Running Stellar network connection
- Git with agent-api repository cloned

## Quick Start (5 minutes)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env from template
cp .env.example .env

# Edit .env and set:
# AGENT_API_URL=http://localhost:8001
# ENABLE_AGENT_EXECUTOR=true

# Start backend
npm run dev
```

Expected output:
```
Server running on port 4000
Agent Routes loaded
Agent Executor: started (runs every 6 hours)
```

### 2. Agent API Setup

```bash
cd agent-api

# Install dependencies
pip install -r requirements.txt

# Create .env (refer to agent-api/README.md)
# Ensure ANTHROPIC_API_KEY is set

# Start agent-api
python -m uvicorn app.main:app --reload --port 8001
```

Expected output:
```
Uvicorn running on http://127.0.0.1:8001
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
cp .env.example .env.local

# Ensure these are set:
# NEXT_PUBLIC_API_URL=http://localhost:4000
# NEXT_PUBLIC_STELLAR_NETWORK=mainnet

# Start dev server
npm run dev
```

Expected output:
```
Ready in 2.5s
http://localhost:3000
```

### 4. Test the Integration

1. Open http://localhost:3000 in your browser
2. Connect your wallet
3. Navigate to Dashboard → "Create Set-and-Forget Strategy"
4. Fill in preferences:
   - Amount: 100 XLM
   - Duration: 2 weeks
   - Risk: Medium
   - Goal: Sure-shot
5. Click "Get AI Recommendation"
6. Verify allocation is returned (e.g., weekly: 40%, biweekly: 40%, monthly: 20%)
7. Click "Create Strategy"
8. Strategy should appear in dashboard

## Full Setup Guide (15 minutes)

### Backend Configuration

#### 1. Install Dependencies

```bash
cd backend
npm install
```

Verify installation:
```bash
npm list | grep stellar
# Should show @stellar packages
```

#### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Server
PORT=4000
NODE_ENV=development

# Admin (required for cron)
ADMIN_SECRET_KEY=dev_secret_key_123

# Stellar Network
STELLAR_NETWORK=mainnet
STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
STELLAR_RPC_URL=https://mainnet.sorobanrpc.com

# Pool Contracts (mainnet)
POOL_CONTRACT_WEEKLY=CCEQRJQ4OLVLRRUS5SLJKGXDILYKISDV43HSBNP2QDUSIJ7ITWLHD73I
POOL_CONTRACT_BIWEEKLY=CCITIDSTLZHHGWRIAJK6JAVLMMYSJ7GUDFWOS4MNCILLZQOFWBT63DFB
POOL_CONTRACT_MONTHLY=CDAPP7TW2CU4D75KM6HL2IJPQYGDXR77O7GSIRGX7H2GNBRNY6J4LVZY

# Agent API Integration
AGENT_API_URL=http://localhost:8001
ENABLE_AGENT_EXECUTOR=true
AGENT_EXECUTOR_INTERVAL_MS=21600000

# Cron
CRON_INTERVAL_MS=3600000

# Database
DATA_DIR=./data
LOG_LEVEL=info
```

#### 3. Start Backend

```bash
npm run dev
```

Check logs:
```bash
# Should see all three services starting
[Agent Routes] Using agent-api at http://localhost:8001
Agent Executor: started (runs every 6 hours)
Cron: draw checks every 60 min
```

### Agent API Configuration

#### 1. Verify Installation

```bash
cd agent-api
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### 2. Set Environment Variables

```bash
# Create .env in agent-api directory
echo "ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE" > .env
```

Get your API key from https://console.anthropic.com/

#### 3. Start Agent API

```bash
python -m uvicorn app.main:app --reload --port 8001
```

Verify it's running:
```bash
curl http://localhost:8001/docs
# Should return OpenAPI documentation
```

### Frontend Configuration

#### 1. Install Dependencies

```bash
cd frontend
npm install
```

#### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` (no changes needed for local dev):

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
NEXT_PUBLIC_STELLAR_RPC_URL=https://mainnet.sorobanrpc.com
```

#### 3. Start Frontend

```bash
npm run dev
```

Open http://localhost:3000

## Testing Scenarios

### Scenario 1: Get AI Recommendation

**Steps**:
1. Connect wallet
2. Go to Dashboard → "Create Set-and-Forget Strategy"
3. Enter: 100 XLM, 2 weeks, medium risk, sure-shot
4. Click "Get AI Recommendation"

**Expected Result**:
- Loading spinner appears
- Allocation returns in 2-5 seconds
- Shows percentage breakdown (e.g., weekly: 40%, biweekly: 40%, monthly: 20%)

**Troubleshooting**:
- If error: Check agent-api is running at http://localhost:8001
- If timeout: Check AGENT_API_URL in .env matches agent-api port
- Check backend logs: `curl http://localhost:4000/api/health`

### Scenario 2: Create Strategy

**Steps**:
1. Complete Scenario 1
2. Click "Create Strategy"
3. Confirm in modal

**Expected Result**:
- Toast notification: "Strategy created successfully!"
- Dashboard refreshes
- New strategy card appears showing:
  - Total amount: 100 XLM
  - Pool allocation percentages
  - Next execution time
  - Status: Active

**Check Database**:
```bash
cat backend/data/db.json | jq '.agentStrategies'
```

### Scenario 3: Monitor Execution

**Steps**:
1. Wait for executor to run (every 6 hours in dev, or check logs)
2. Or manually trigger: Strategy card → "Execute Now" button
3. Watch strategy card update

**Expected Result**:
- Execution count increases
- Total deposited updates
- Remaining balance decreases
- Execution history shows deposits with timestamps
- Dashboard shows deposits in pool cards

**Manual Trigger for Testing**:
```bash
# Reduce AGENT_EXECUTOR_INTERVAL_MS to test faster
# Edit backend/.env:
AGENT_EXECUTOR_INTERVAL_MS=60000  # 1 minute for testing

# Restart backend
npm run dev
```

### Scenario 4: Pause/Resume Strategy

**Steps**:
1. Find active strategy in dashboard
2. Click "Pause" button
3. Verify status changes to "Paused"
4. Click "Resume" button
5. Verify status changes back to "Active"

**Expected Result**:
- Strategy status updates immediately
- Executor skips paused strategies
- Strategy can be resumed without losing data

### Scenario 5: Withdraw Strategy

**Steps**:
1. Find active strategy
2. Click "Withdraw" button
3. Confirm dialog

**Expected Result**:
- Strategy status changes to "withdrawn"
- Remaining balance goes to 0
- Strategy no longer executes
- User receives any accrued yields

**Check Blockchain**:
```bash
# View deposit transactions on Stellar
curl "https://mainnet.sorobanrpc.com/" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "sorobanRpc_getTransaction", "params": {"hash": "..."}, "id": 1}'
```

## Monitoring and Debugging

### 1. Check Service Status

```bash
# Backend alive?
curl http://localhost:4000/api/health 2>/dev/null && echo "✓ Backend OK" || echo "✗ Backend DOWN"

# Agent API alive?
curl http://localhost:8001/docs 2>/dev/null && echo "✓ Agent API OK" || echo "✗ Agent API DOWN"

# Frontend alive?
curl http://localhost:3000 2>/dev/null && echo "✓ Frontend OK" || echo "✗ Frontend DOWN"
```

### 2. Check Agent API Integration

```bash
# Test recommendation endpoint
curl -X POST http://localhost:4000/api/agent/strategy/recommend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 100,
    "duration": 2,
    "riskLevel": "medium",
    "goalType": "sure-shot"
  }' | jq .

# Expected response:
# {
#   "allocation": {
#     "weekly": 0.4,
#     "biweekly": 0.4,
#     "monthly": 0.2
#   },
#   "message": "Allocation recommendation generated"
# }
```

### 3. View Executor Logs

```bash
# Watch backend logs in real-time
# In terminal running backend, look for:
# [Agent Executor] Executing strategy strategy-uuid
# [Agent Executor] Created deposit: 40 XLM to weekly pool
# [Agent Executor] Strategy completed
```

### 4. Check Database State

```bash
# View all strategies
cat backend/data/db.json | jq '.agentStrategies' | head -50

# View specific strategy
cat backend/data/db.json | jq '.agentStrategies["strategy-id"]'

# View deposits created by agent
cat backend/data/db.json | jq '.deposits | to_entries[] | select(.value.id | startswith("agent-")) | .value'
```

### 5. Enable Debug Logging

Add debug statements to track execution:

**Backend** (src/routes/agent.js):
```javascript
console.log("[v0] Recommendation request:", { amount, duration, riskLevel, goalType });
console.log("[v0] Calling agent-api at:", AGENT_API_URL);
console.log("[v0] Agent response:", agentData);
```

**Frontend** (components/ai-agent-onboarding.tsx):
```javascript
console.log("[v0] Getting AI allocation with:", { amount, duration, riskLevel, goalType });
console.log("[v0] Allocation response:", data.allocation);
```

Enable in browser console:
```javascript
// Log all fetch requests
const origFetch = window.fetch;
window.fetch = (...args) => {
  console.log("[v0] Fetch:", args[0]);
  return origFetch(...args);
};
```

## Troubleshooting

### Agent API Connection Fails

**Error**: "Failed to get AI allocation recommendation"

**Solutions**:
1. Check agent-api is running: `curl http://localhost:8001/docs`
2. Check AGENT_API_URL in backend/.env: `cat backend/.env | grep AGENT_API_URL`
3. Check firewall isn't blocking port 8001
4. Check Claude API key is set in agent-api: `env | grep ANTHROPIC`

### Executor Not Running

**Error**: No deposits created, strategy not executing

**Solutions**:
1. Check executor started: Look for "Agent Executor: started" in backend logs
2. Check ENABLE_AGENT_EXECUTOR=true in .env
3. Check AGENT_EXECUTOR_INTERVAL_MS is reasonable (not 0 or negative)
4. Check server has ADMIN_SECRET_KEY set
5. Reduce AGENT_EXECUTOR_INTERVAL_MS to 60000 (1 minute) for faster testing

### Strategy Not Showing in Dashboard

**Error**: Created strategy doesn't appear

**Solutions**:
1. Check database: `cat backend/data/db.json | jq '.agentStrategies | length'`
2. Refresh frontend (Cmd+Shift+R to hard refresh)
3. Check JWT token is valid: `console.log(sessionStorage.getItem('luckystake_wallet'))`
4. Check user is authenticated: Dashboard should show wallet address
5. Check GET /api/agent/strategies returns data

### Stellar Transaction Fails

**Error**: "Insufficient balance" or "Network error"

**Solutions**:
1. Check wallet has sufficient XLM balance
2. Check Stellar network is mainnet (correct in .env)
3. Check pool contract addresses are correct
4. Check network latency: `curl https://mainnet.sorobanrpc.com -I`

## Performance Optimization

### For Development

Use smaller intervals for faster iteration:

```bash
# .env
AGENT_EXECUTOR_INTERVAL_MS=60000      # 1 minute (dev)
CRON_INTERVAL_MS=300000               # 5 minutes (dev)
```

### For Production

Use longer intervals:

```bash
# .env
AGENT_EXECUTOR_INTERVAL_MS=21600000   # 6 hours (prod)
CRON_INTERVAL_MS=3600000              # 1 hour (prod)
```

## Next Steps

1. ✅ Verify all three services running
2. ✅ Test recommendation endpoint
3. ✅ Create a test strategy
4. ✅ Wait for executor or manually trigger
5. ✅ Verify deposits on Stellar blockchain
6. ✅ Deploy to production (update URLs, API keys, etc.)

## Support

For issues:
1. Check logs first: backend, agent-api, frontend console
2. Read AGENT_INTEGRATION.md for architecture details
3. Read specific service READMEs (agent-api/README.md, etc.)
4. Enable debug logging (see section above)
5. Check Stellar blockchain: https://stellar.expert/explorer/mainnet
