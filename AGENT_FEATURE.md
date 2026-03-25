# AI Agent "Set-and-Forget" Feature

## Overview

The AI Agent "Set-and-Forget" feature allows users to deposit a sum of money once and have an intelligent system automatically distribute it across lottery pools based on their preferences. Users specify their risk tolerance, goals, and duration, and the AI recommends an optimal allocation strategy that executes automatically over time.

## User Flow

### 1. Strategy Creation
- User clicks "Create Set-and-Forget Strategy" in the AI Agent chat
- Opens onboarding modal with 3-step form:
  1. **Amount**: User specifies total amount to deposit (e.g., 100 XLM)
  2. **Preferences**: Select duration (1-4 weeks), risk level (low/medium/high), and goal (sure-shot/highest-prize)
  3. **Review**: AI recommends pool allocation, user confirms

### 2. Automatic Execution
- Strategy becomes active immediately after confirmation
- Backend executor checks every 6 hours for due strategies
- Proportional amounts deposit to assigned pools on schedule
- User receives notifications for each automatic deposit
- Executions continue until balance depleted or duration expires

### 3. User Controls
- **Dashboard**: See active strategies with progress bars
- **Pause/Resume**: Temporarily stop automatic deposits
- **Modify**: Adjust allocation or preferences
- **Withdraw**: Claim remaining balance + earned funds

## Architecture

### Backend Components

#### 1. Database Schema (`/backend/src/services/store.js`)
```javascript
agentStrategies: Map<id, {
  id: string
  publicKey: string
  totalAmount: number
  remainingBalance: number
  duration: number (weeks)
  riskLevel: "low" | "medium" | "high"
  goalType: "sure-shot" | "highest-prize"
  poolAllocation: { weekly: %, biweekly: %, monthly: % }
  status: "active" | "paused" | "completed" | "withdrawn"
  createdAt: timestamp
  updatedAt: timestamp
  nextExecutionTime: timestamp
  executionCount: number
  totalDeposited: number
  executionHistory: [{timestamp, poolType, amount, status}]
}>
```

#### 2. API Routes (`/backend/src/routes/agent.js`)

**POST /api/agent/strategy/recommend**
- Get AI allocation recommendation
- Input: amount, duration, riskLevel, goalType
- Output: allocation percentages (e.g., { weekly: 0.5, biweekly: 0.3, monthly: 0.2 })

**POST /api/agent/strategy**
- Create new strategy
- Input: amount, duration, riskLevel, goalType, poolAllocation
- Output: Strategy object with ID and execution schedule

**GET /api/agent/strategies**
- Fetch all active strategies for user
- Output: Array of strategy objects

**GET /api/agent/strategy/:id**
- Get single strategy details

**POST /api/agent/strategy/:id/execute**
- Manually trigger execution

**POST /api/agent/strategy/:id/pause**
- Pause automatic execution

**POST /api/agent/strategy/:id/resume**
- Resume paused strategy

**POST /api/agent/strategy/:id/update**
- Modify strategy preferences

**DELETE /api/agent/strategy/:id**
- Withdraw and cancel strategy

#### 3. AI Service (`/backend/src/services/ai-service.js`)
- Uses Claude API to generate allocation recommendations
- Inputs: amount, duration, risk level, goal type
- Outputs: Optimized pool allocation percentages
- Fallback allocations if Claude fails

#### 4. Agent Executor (`/backend/src/services/agent-executor.js`)
- Background service running every 6 hours
- Checks all active strategies for due execution
- Calculates proportional deposit amounts
- Creates deposit records and updates pools
- Updates strategy execution history
- Handles failures gracefully with pause-on-error

### Frontend Components

#### 1. AI Agent Onboarding Modal (`/frontend/components/ai-agent-onboarding.tsx`)
- Multi-step form for strategy creation
- Gets AI recommendations before confirmation
- Displays allocation preview
- Creates strategy on backend

#### 2. Strategy Card (`/frontend/components/agent-strategy-card.tsx`)
- Displays active strategy status
- Shows progress, remaining balance, next execution
- Pool allocation breakdown
- Recent deposit history
- Action menu (pause/resume/withdraw)

#### 3. Chat Integration (`/frontend/components/ai-agent-chat.tsx`)
- Added "Create Set-and-Forget Strategy" button
- Flows to onboarding modal on click

#### 4. Dashboard Integration (`/frontend/app/app/page.tsx`)
- Shows active strategies above deposit history
- Loads strategies on component mount
- Reflects strategy updates in real-time

## Allocation Strategy

### AI-Powered Allocation
The Claude API generates optimal allocations based on:

**Risk Level:**
- **Low**: Favor weekly pools (60% weekly, 30% biweekly, 10% monthly)
  - More frequent draws = more consistent chances
  - Suitable for conservative users
  
- **Medium**: Balanced across pools (40% weekly, 40% biweekly, 20% monthly)
  - Mix of different frequencies
  - Good for most users
  
- **High**: Favor monthly pools (20% weekly, 30% biweekly, 50% monthly)
  - Less frequent but larger prize pools
  - Suitable for aggressive users seeking big wins

**Goal Type:**
- **Sure-Shot**: More pools, more frequent chances
- **Highest-Prize**: Focus on pools with largest prizes (typically monthly)

## Execution Schedule

- **Frequency**: Every 6 hours (configurable via environment variable)
- **Deposit Timing**: Distributed across pool draws
- **Example**: User deposits 100 XLM, 40% weekly
  - 1st execution: 40 XLM to weekly pool
  - 2nd execution: 40 XLM to biweekly pool
  - 3rd execution: 20 XLM to monthly pool
  - Cycle repeats if balance remains

## Environment Variables Required

**Backend (.env)**
```
ANTHROPIC_API_KEY=sk-ant-...  # Claude API key for allocation recommendations
ENABLE_AGENT_EXECUTOR=true    # Enable/disable agent executor service
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8000  # Agent backend (if separate)
```

## Error Handling

### Strategy Errors
- **Invalid amount**: Strategy rejected at creation
- **Insufficient balance**: Execution skips, strategy pauses
- **Failed deposit**: Logged, strategy paused with user notification

### AI Service Errors
- Claude API timeout/failure: Falls back to default allocation
- Invalid response format: Uses sensible defaults based on risk level
- Network errors: Retries with fallback allocation

### State Management
- All strategy state persisted to JSON store
- Execution history maintained for audit trail
- User can re-pause/resume on error

## Future Enhancements

1. **Tambo AI Integration**
   - Replace Claude with Tambo for fully autonomous execution
   - Advanced ML models for better predictions

2. **Cross-Pool Optimization**
   - Machine learning to predict draw probabilities
   - Dynamic allocation based on historical data

3. **Advanced Analytics**
   - ROI tracking per strategy
   - Historical performance metrics
   - Comparative analysis

4. **Collaborative Strategies**
   - Multiple users contribute to single strategy
   - Shared pool allocation and earnings

5. **Smart Rebalancing**
   - Automatic adjustment based on pool performance
   - Dynamic risk management

## Testing Checklist

- [ ] Create strategy with valid inputs
- [ ] Verify AI allocation recommendation matches preferences
- [ ] Confirm strategy appears on dashboard
- [ ] Test pause/resume functionality
- [ ] Trigger manual execution and verify deposits
- [ ] Withdraw strategy and check balance
- [ ] Test error scenarios (invalid amount, failed deposit)
- [ ] Verify cron executor runs every 6 hours
- [ ] Check execution history is accurate
- [ ] Mobile responsiveness of strategy cards

## Deployment Checklist

- [ ] Set ANTHROPIC_API_KEY in backend environment
- [ ] Enable ENABLE_AGENT_EXECUTOR in backend
- [ ] Build and deploy backend services
- [ ] Build and deploy frontend
- [ ] Verify agent routes are accessible
- [ ] Monitor executor logs for errors
- [ ] Test strategy creation end-to-end in production
