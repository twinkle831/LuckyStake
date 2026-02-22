# LuckyStake Pool Contract - Exact Deployment Steps

## Prerequisites

1. **Install Rust** (if not already installed):
   ```bash
   # Windows: Download from https://rustup.rs/
   # Or use: winget install Rustlang.Rustup
   ```

2. **Install wasm32 target**:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```

3. **Install Stellar CLI** (if using CLI deployment):
   ```bash
   # Download from https://github.com/stellar/stellar-cli/releases
   # Or use: npm install -g @stellar/cli
   ```

4. **Get your admin keypair**:
   - You need the secret key (S...) for signing transactions
   - Store it securely (use environment variable or Stellar CLI config)

---

## Step 1: Build the Contract

```bash
# Navigate to contracts directory
cd contracts

# Build the WASM
cargo build --target wasm32-unknown-unknown --release
```

**Expected output:**
- WASM file: `target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm`
- If build succeeds, you'll see: `Finished release [optimized] target(s)`

**Troubleshooting:**
- If `cargo` not found: Install Rust from rustup.rs
- If `wasm32-unknown-unknown` not found: Run `rustup target add wasm32-unknown-unknown`
- If build fails: Check Rust version (need 1.70+), ensure `soroban-sdk = "21.0.0"` matches your Stellar network

---

## Step 2: Deploy the WASM

### Option A: Using Stellar CLI (Recommended)

```bash
# Set your admin secret key (replace YOUR_SECRET_KEY with your actual S... key)
export STELLAR_SECRET_KEY="YOUR_SECRET_KEY"

# Deploy the WASM (this returns a contract ID)
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm \
  --network testnet \
  --source-account YOUR_SECRET_KEY
```

**Save the contract ID** from the output (starts with `C...`). You'll need it for each pool.

**For each pool (weekly, biweekly, monthly), you have two options:**

#### Option 2A: Deploy Separate Instances (Recommended)

Deploy the WASM **three times** to get three separate contract addresses:

```bash
# Weekly pool
CONTRACT_WEEKLY=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm \
  --network testnet \
  --source-account YOUR_SECRET_KEY | grep -o 'C[A-Z0-9]\{55\}')

# Biweekly pool
CONTRACT_BIWEEKLY=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm \
  --network testnet \
  --source-account YOUR_SECRET_KEY | grep -o 'C[A-Z0-9]\{55\}')

# Monthly pool
CONTRACT_MONTHLY=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm \
  --network testnet \
  --source-account YOUR_SECRET_KEY | grep -o 'C[A-Z0-9]\{55\}')

echo "Weekly: $CONTRACT_WEEKLY"
echo "Biweekly: $CONTRACT_BIWEEKLY"
echo "Monthly: $CONTRACT_MONTHLY"
```

#### Option 2B: Upgrade Existing Contracts

If you already have deployed contracts (from your `.env`), you can **upgrade** them:

```bash
# Upgrade weekly pool
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  --upgrade-wasm CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD

# Upgrade biweekly pool
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  --upgrade-wasm CCIK3PXFL2LE43BVRVEUDW3FYI2JGL74XVCO4XQYXPMG6F5ZOTP2X3T3

# Upgrade monthly pool
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  --upgrade-wasm CBI7W6JDUG3YQ6SSB622JSNMXRH3AJF6AY336W2QERONGFYIFOV636LN
```

**Note:** Upgrading preserves existing storage (deposits, tickets, etc.) but adds the new Blend functions.

### Option B: Using Stellar SDK (JavaScript/TypeScript)

If you prefer programmatic deployment, see `backend/src/services/stellar-service.js` for examples using `@stellar/stellar-sdk`.

---

## Step 3: Initialize Each Pool (Only if New Deployment)

**Skip this step if you upgraded existing contracts** (they're already initialized).

For **new deployments**, initialize each pool:

```bash
# Set variables (replace with your values)
ADMIN_ADDRESS="G..."  # Your admin public key (G...)
TOKEN_ADDRESS="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"  # XLM testnet token

# Weekly pool (7 days)
stellar contract invoke \
  --id CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  initialize \
  --admin $ADMIN_ADDRESS \
  --token $TOKEN_ADDRESS \
  --period_days 7

# Biweekly pool (15 days)
stellar contract invoke \
  --id CCIK3PXFL2LE43BVRVEUDW3FYI2JGL74XVCO4XQYXPMG6F5ZOTP2X3T3 \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  initialize \
  --admin $ADMIN_ADDRESS \
  --token $TOKEN_ADDRESS \
  --period_days 15

# Monthly pool (30 days)
stellar contract invoke \
  --id CBI7W6JDUG3YQ6SSB622JSNMXRH3AJF6AY336W2QERONGFYIFOV636LN \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  initialize \
  --admin $ADMIN_ADDRESS \
  --token $TOKEN_ADDRESS \
  --period_days 30
```

---

## Step 4: Set Up Blend Integration

### 4.1 Get Blend Pool Address

For **testnet**, use the Blend TestnetV2 pool:
- Address: `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF`
- Or check: https://github.com/blend-capital/blend-utils/blob/main/testnet.contracts.json

For **mainnet**, use the appropriate Blend pool for your asset (USDC, XLM, etc.).

### 4.2 Set Blend Pool Address (Once Per Pool)

```bash
BLEND_POOL="CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF"

# Weekly pool
stellar contract invoke \
  --id CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  set_blend_pool \
  --blend_pool $BLEND_POOL

# Biweekly pool
stellar contract invoke \
  --id CCIK3PXFL2LE43BVRVEUDW3FYI2JGL74XVCO4XQYXPMG6F5ZOTP2X3T3 \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  set_blend_pool \
  --blend_pool $BLEND_POOL

# Monthly pool
stellar contract invoke \
  --id CBI7W6JDUG3YQ6SSB622JSNMXRH3AJF6AY336W2QERONGFYIFOV636LN \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  set_blend_pool \
  --blend_pool $BLEND_POOL
```

### 4.3 Supply Funds to Blend (Deploy Pool Funds)

**Important:** Amounts are in **stroops** (7 decimals for XLM). Example: 100 XLM = 1000000000 stroops.

```bash
# Example: Supply 100 XLM (1000000000 stroops) to weekly pool
AMOUNT=1000000000  # 100 XLM

stellar contract invoke \
  --id CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  supply_to_blend \
  --amount $AMOUNT
```

**Repeat for biweekly and monthly pools** as needed.

---

## Step 5: Verify Deployment

### 5.1 Check Pool State

```bash
# Check if Blend pool is set
stellar contract invoke \
  --id CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD \
  --network testnet \
  get_blend_pool

# Check principal supplied to Blend (excludes accrued interest)
# For actual withdrawable balance, query Blend get_positions(contract_address) via SDK/RPC
stellar contract invoke \
  --id CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD \
  --network testnet \
  get_supplied_to_blend
```

### 5.2 Update Backend .env (if contract addresses changed)

If you deployed **new** contracts, update `backend/.env`:

```env
POOL_CONTRACT_WEEKLY=<NEW_WEEKLY_CONTRACT_ID>
POOL_CONTRACT_BIWEEKLY=<NEW_BIWEEKLY_CONTRACT_ID>
POOL_CONTRACT_MONTHLY=<NEW_MONTHLY_CONTRACT_ID>
```

### 5.3 Update Frontend .env (if contract addresses changed)

Update `frontend/.env`:

```env
NEXT_PUBLIC_POOL_CONTRACT_WEEKLY=<NEW_WEEKLY_CONTRACT_ID>
NEXT_PUBLIC_POOL_CONTRACT_BIWEEKLY=<NEW_BIWEEKLY_CONTRACT_ID>
NEXT_PUBLIC_POOL_CONTRACT_MONTHLY=<NEW_MONTHLY_CONTRACT_ID>
```

---

## Step 6: Harvest Yield (Optional)

Blend accrues interest on supplied funds. To move yield into the prize fund:

1. **Query Blend** off-chain (via [Blend SDK](https://github.com/blend-capital/blend-sdk-js) or RPC): call `get_positions(pool_contract_address)` to get actual withdrawable balance.
2. **Compute yield**: `yield = actual_balance - get_supplied_to_blend()`
3. **Harvest**: call `harvest_yield(yield_amount, min_return)` (e.g. `min_return = yield_amount` for exact, or slightly lower to allow rounding).

```bash
# Example: Harvest 50 XLM (500000000 stroops) of yield
stellar contract invoke \
  --id <POOL_CONTRACT_ID> \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  harvest_yield \
  --amount 500000000 \
  --min_return 500000000
```

---

## Step 7: Withdraw from Blend (When Needed)

To withdraw principal from Blend back to the pool:

```bash
# Withdraw 100 XLM; require at least 99 XLM received (min_return guards against slippage/bugs)
stellar contract invoke \
  --id <POOL_CONTRACT_ID> \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  withdraw_from_blend \
  --amount 1000000000 \
  --min_return 990000000
```

**Note:** Withdrawal may fail if Blend has insufficient liquidity (high utilization). Per Blend docs, high utilization raises interest rates to incentivize repayment; retry later.

---

## Step 8: Test the Integration

1. **Make a test deposit** via the frontend
2. **Check pool stats** - verify `get_total_deposits()` increases
3. **Supply to Blend** - call `supply_to_blend()` with a small amount
4. **Verify** - call `get_supplied_to_blend()` to confirm principal amount
5. **Check frontend** - pool detail panel should show "Deployed to Blend: X XLM"
6. **Harvest yield** - periodically call `harvest_yield()` after querying Blend for actual balance

---

## Quick Reference: All Commands in One Place

```bash
# 1. Build
cd contracts
cargo build --target wasm32-unknown-unknown --release

# 2. Deploy (replace YOUR_SECRET_KEY and contract IDs)
export STELLAR_SECRET_KEY="YOUR_SECRET_KEY"
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  --upgrade-wasm <EXISTING_CONTRACT_ID>

# 3. Set Blend (once per pool)
BLEND_POOL="CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF"
stellar contract invoke \
  --id <POOL_CONTRACT_ID> \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  set_blend_pool --blend_pool $BLEND_POOL

# 4. Supply to Blend (when ready)
AMOUNT=1000000000  # 100 XLM in stroops
stellar contract invoke \
  --id <POOL_CONTRACT_ID> \
  --network testnet \
  --source-account YOUR_SECRET_KEY \
  supply_to_blend --amount $AMOUNT

# 5. Harvest yield (after querying Blend for actual balance; yield = actual - get_supplied_to_blend)
stellar contract invoke --id <POOL_CONTRACT_ID> --network testnet --source-account YOUR_SECRET_KEY \
  harvest_yield --amount <YIELD_AMOUNT> --min_return <MIN_RETURN>

# 6. Withdraw from Blend (min_return protects against slippage)
stellar contract invoke --id <POOL_CONTRACT_ID> --network testnet --source-account YOUR_SECRET_KEY \
  withdraw_from_blend --amount <AMOUNT> --min_return <MIN_RETURN>
```

---

## Important Notes

- **`get_supplied_to_blend`** = principal only (excludes accrued interest). Query Blend `get_positions(contract_address)` for actual withdrawable balance.
- **`harvest_yield(amount, min_return)`** moves accrued yield into PrizeFund. Admin must compute yield off-chain.
- **`withdraw_from_blend(amount, min_return)`** verifies received >= min_return. May fail if Blend has low liquidity; retry later.
- **`supply_to_blend`** uses `submit_with_allowance` for atomic approve+submit (avoids ledger expiration race).

---

## Troubleshooting

- **"Contract not found"**: Ensure contract ID is correct and network matches (testnet/mainnet)
- **"Already initialized"**: Contract is already set up; skip initialization step
- **"Blend pool not set"**: Run `set_blend_pool` before calling `supply_to_blend`
- **"Insufficient balance"**: Ensure the pool contract has enough token balance before supplying to Blend
- **Withdrawal fails**: Blend may have insufficient liquidity (high utilization). Retry later; high rates incentivize repayment.
- **Build errors**: Ensure Rust and wasm32 target are installed correctly
