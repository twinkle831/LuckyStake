# LuckyStake Pool Contracts - Deployment Guide

## Overview

The LuckyStake platform uses a single **parameterized** pool contract (`lucky-stake-pool`) deployed **three times** with different `period_days`:

| Pool      | period_days | Deploy As   |
|-----------|-------------|-------------|
| Weekly    | 7           | `initialize(admin, token, 7)`  |
| Biweekly  | 15          | `initialize(admin, token, 15)` |
| Monthly   | 30          | `initialize(admin, token, 30)` |

## Contract Integration

- **deposit** – Original deposit contract; can be used alongside or replaced by pool deposits
- **prize-pool** – Proportional prize distribution (different model); yield can still be routed to `add_prize` on each pool
- **lucky-stake-pool** – Main lottery pool: deposits, tickets, single-winner draw

## Build

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
# Or use stellar contract build if you have Stellar CLI
```

## Deploy (Stellar CLI)

### 1. Deploy the WASM

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm \
  --source ADMIN_KEY
```

### 2. Initialize Each Pool

**Weekly pool (7 days):**
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source ADMIN_KEY \
  initialize \
  --admin <ADMIN_ADDRESS> \
  --token <USDC_TOKEN_ADDRESS> \
  --period_days 7
```

**Biweekly pool (15 days):**
Deploy a second instance (or use a separate deployment), then:
```bash
stellar contract invoke \
  --id <CONTRACT_ID_2> \
  --source ADMIN_KEY \
  initialize \
  --admin <ADMIN_ADDRESS> \
  --token <USDC_TOKEN_ADDRESS> \
  --period_days 15
```

**Monthly pool (30 days):**
Same process with `--period_days 30`.

## Key Functions

| Function        | Auth   | Description                                      |
|-----------------|--------|--------------------------------------------------|
| `initialize`    | Admin  | Set admin, token, period (7, 15, or 30)         |
| `deposit`       | User   | Deposit tokens; tickets = amount × period_days  |
| `withdraw`      | User   | Withdraw principal; burns proportional tickets |
| `add_prize`     | Admin  | Add yield to prize fund                         |
| `execute_draw`   | Admin  | Select winner, transfer prize                   |

## Ticket Formula

**1 ticket per $1 per day**

- 100 USDC in weekly pool (7 days) → 700 tickets  
- 100 USDC in biweekly pool (15 days) → 1,500 tickets  
- 100 USDC in monthly pool (30 days) → 3,000 tickets  

## Randomness

Draws use **Stellar ledger entropy** (timestamp + sequence + draw nonce) as a fallback. For production, consider integrating a VRF oracle for stronger randomness.
