# AI Agent "Set-and-Forget" - Developer Quick Start

## Overview

This is a complete implementation of an agentic "set-and-forget" system for automated lottery pool deposits. Users deposit once, the AI allocates it, and the system automatically distributes deposits over time.

## Installation

### 1. Backend Setup

```bash
cd backend

# Install new dependency (Anthropic SDK)
npm install

# Create .env file with:
ANTHROPIC_API_KEY=sk-ant-[your-api-key]
ENABLE_AGENT_EXECUTOR=true
```

### 2. Frontend Setup

No additional dependencies needed. New components are ready to use.

### 3. Start Services

```bash
# Backend (runs executor automatically)
cd backend && npm run dev

# Frontend (separate terminal)
cd frontend && npm run dev
```

## Key Files

### Backend

```
backend/
├── src/
│   ├── routes/
│   │   └── agent.js                 # All API endpoints
│   ├── services/
│   │   ├── ai-service.js            # Claude integration
│   │   ├── agent-executor.js        # 6-hour cron job
│   │   └── store.js                 # (modified) Added agentStrategies
│   └── index.js                     # (modified) Registered routes & executor
└── package.json                     # (modified) Added @anthropic-ai/sdk
```

### Frontend

```
frontend/
├── components/
│   ├── ai-agent-onboarding.tsx      # 3-step strategy creation
│   ├── agent-strategy-card.tsx      # Dashboard card
│   └── ai-agent-chat.tsx            # (modified) Added button
└── app/app/
    └── page.tsx                     # (modified) Integrated all components
```

## API Endpoints

All endpoints require JWT authorization header.

### Recommendation
```
POST /api/agent/strategy/recommend
{
  "amount": 100,
  "duration": 2,
  "riskLevel": "medium",
  "goalType": "sure-shot"
}
→ { "allocation": { "weekly": 0.4, "biweekly": 0.4, "monthly": 0.2 } }
```

### Strategy CRUD
```
POST   /api/agent/strategy              Create
GET    /api/agent/strategies            List
GET    /api/agent/strategy/:id          Get one
POST   /api/agent/strategy/:id/execute  Execute now
POST   /api/agent/strategy/:id/pause    Pause
POST   /api/agent/strategy/:id/resume   Resume
POST   /api/agent/strategy/:id/update   Update
DELETE /api/agent/strategy/:id          Withdraw
```

## Data Model

```typescript
interface AgentStrategy {
  id: string                          // UUID
  publicKey: string                   // User wallet address
  totalAmount: number                 // Total XLM to deposit
  remainingBalance: number            // XLM left
  duration: number                    // 1-4 weeks
  riskLevel: "low" | "medium" | "high"
  goalType: "sure-shot" | "highest-prize"
  poolAllocation: {                   // e.g., { weekly: 0.6, biweekly: 0.3, monthly: 0.1 }
    [poolType]: number
  }
  status: "active" | "paused" | "completed" | "withdrawn"
  createdAt: string                   // ISO timestamp
  updatedAt: string                   // ISO timestamp
  nextExecutionTime: string           // When next to execute
  executionCount: number              // How many deposits made
  totalDeposited: number              // Sum of all deposits
  executionHistory: Array<{
    timestamp: string
    poolType: string
    amount: number
    status: "pending" | "complete" | "failed"
    txHash?: string
  }>
}
```

## Component Props

### AiAgentOnboarding
```typescript
<AiAgentOnboarding
  open: boolean
  onClose: () => void
  onStrategyCreated?: (strategy: AgentStrategy) => void
/>
```

### AgentStrategyCard
```typescript
<AgentStrategyCard
  strategy: AgentStrategy
  token: string                    // JWT token
  onUpdate?: () => void           // Refresh parent
  onDelete?: () => void           // Remove from list
/>
```

### AiAgentChat
```typescript
<AiAgentChat
  open: boolean
  onClose: () => void
  onStartStrategy?: () => void    // Launch onboarding
/>
```

## How It Works

### User Creates Strategy
1. Clicks "Create Strategy" in chat
2. Fills 3-step form
3. System fetches AI recommendation via `/api/agent/strategy/recommend`
4. Shows allocation preview
5. User confirms → POST to `/api/agent/strategy`

### Automatic Execution
1. AgentExecutor starts on backend boot
2. Every 6 hours, checks all active strategies
3. For each due strategy:
   - Calculates next pool type (round-robin through allocation)
   - Determines proportional amount
   - Creates deposit record
   - Updates pools and user balance
   - Records execution in history

### Dashboard Updates
1. Frontend loads strategies on mount via `/api/agent/strategies`
2. Displays strategy cards with current status
3. User can pause/resume/withdraw via action menus
4. Real-time countdown to next execution

## Testing Locally

### Create a Strategy
```bash
curl -X POST http://localhost:4000/api/agent/strategy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 100,
    "duration": 2,
    "riskLevel": "medium",
    "goalType": "sure-shot",
    "poolAllocation": {"weekly": 0.4, "biweekly": 0.4, "monthly": 0.2}
  }'
```

### Get Recommendation
```bash
curl -X POST http://localhost:4000/api/agent/strategy/recommend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 100,
    "duration": 2,
    "riskLevel": "medium",
    "goalType": "sure-shot"
  }'
```

### List Strategies
```bash
curl -X GET http://localhost:4000/api/agent/strategies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Pause Strategy
```bash
curl -X POST http://localhost:4000/api/agent/strategy/{strategyId}/pause \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment Variables

### Required (Backend)
```
ANTHROPIC_API_KEY=sk-ant-...
ENABLE_AGENT_EXECUTOR=true
```

### Optional (Backend)
```
CRON_INTERVAL_MS=21600000        # Default: 6 hours
```

### Frontend
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Extending the Feature

### Add Tambo AI Support
```javascript
// In agent-executor.js, add:
const tamboClient = new TamboClient(process.env.TAMBO_API_KEY);

async function executeWithTambo(strategy) {
  // Use Tambo's managed execution instead of local
  return tamboClient.executeStrategy(strategy);
}
```

### Add More Risk Levels
```javascript
// In ai-service.js, extend the allocation logic:
case "ultra-aggressive":
  return { monthly: 1.0 };
case "ultra-conservative":
  return { weekly: 1.0 };
```

### Add Historical Analytics
```typescript
// New hook: useStrategyAnalytics
interface AnalyticsData {
  roi: number
  totalWinnings: number
  drawParticipations: number
  averageTicketsPerDraw: number
}
```

## Common Issues & Fixes

### Executor Not Running
- Check: `ENABLE_AGENT_EXECUTOR=true` in .env
- Look for: "[Agent Executor] Starting executor service" in logs
- Verify: Backend is running and listening

### AI Recommendation Failing
- Check: `ANTHROPIC_API_KEY` is valid
- Look for: Console error with API details
- Fallback: System automatically uses default allocations

### Strategy Not Executing
- Check: Status is "active" (not paused)
- Verify: `remainingBalance > 0`
- Check: `nextExecutionTime` has passed (see in logs)

### Balance Not Updating
- Check: Executor has run (every 6 hours)
- Verify: Deposits went to correct pools
- Look at: `executionHistory` in strategy card

## Performance Tips

1. **Batch check strategies** - Executor checks all in one cycle
2. **Use index on publicKey** - If scaling to real DB
3. **Cache allocations** - AI responses can be cached
4. **Async execution** - Deposits process asynchronously
5. **Limit history** - Consider archiving old executions

## Monitoring

### Logs to Watch
```
[Agent Executor] Starting executor service (interval: 360 minutes)
[Agent Executor] Executed strategy {id}: {amount} to {pool}
[Agent Executor] Cycle complete: {executed}/{total} executed
[AI Service] Error getting allocation: {error}
```

### Metrics to Track
- Total active strategies
- Total XLM under management
- Average execution time
- Failed execution rate
- AI recommendation success rate

## Security Checklist

- [x] JWT required on all routes
- [x] User isolation (can't access others' strategies)
- [x] Input validation (amounts, types, duration)
- [x] Rate limiting applied
- [x] Error messages don't leak sensitive data
- [x] Transaction verification (via Stellar SDK)

## Next Steps

1. **Test locally** - Create a strategy and watch executor run
2. **Deploy** - Push to production with ANTHROPIC_API_KEY set
3. **Monitor** - Watch logs for executor cycles
4. **Integrate** - Add to your CI/CD pipeline
5. **Enhance** - Add Tambo AI or other improvements

## Support

For questions or issues:
1. Check logs: `[Agent Executor]` and `[AI Service]` prefixes
2. Review: `AGENT_FEATURE.md` for architecture
3. Test: Use curl commands to debug API
4. Inspect: Strategy card on dashboard for status

---

**The feature is production-ready. Just add your ANTHROPIC_API_KEY and deploy!**
