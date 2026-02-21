# Quick Start: Deploy LuckyStake Pool with Blend Integration

## Prerequisites Check

```powershell
# Check Rust is installed
cargo --version

# Check wasm32 target
rustup target list --installed | Select-String "wasm32-unknown-unknown"

# If not installed:
rustup target add wasm32-unknown-unknown

# Check Stellar CLI
stellar --version
```

---

## Option 1: Use PowerShell Scripts (Easiest)

### Step 1: Build & Deploy

```powershell
cd contracts

# Replace YOUR_SECRET_KEY with your admin secret key (S...)
.\deploy.ps1 -SecretKey "YOUR_SECRET_KEY" -UpgradeOnly
```

This will:
- Build the contract
- Upgrade your existing 3 pool contracts (weekly, biweekly, monthly)
- Skip initialization (contracts already initialized)

### Step 2: Set Blend Pool Address

```powershell
# Set Blend pool for all 3 pools
.\set-blend.ps1 -SecretKey "YOUR_SECRET_KEY"
```

### Step 3: Supply Funds to Blend

```powershell
# Example: Supply 100 XLM (1000000000 stroops) to weekly pool
.\supply-to-blend.ps1 -SecretKey "YOUR_SECRET_KEY" -ContractId "CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD" -Amount "1000000000"

# Repeat for biweekly and monthly pools
.\supply-to-blend.ps1 -SecretKey "YOUR_SECRET_KEY" -ContractId "CCIK3PXFL2LE43BVRVEUDW3FYI2JGL74XVCO4XQYXPMG6F5ZOTP2X3T3" -Amount "1000000000"
.\supply-to-blend.ps1 -SecretKey "YOUR_SECRET_KEY" -ContractId "CBI7W6JDUG3YQ6SSB622JSNMXRH3AJF6AY336W2QERONGFYIFOV636LN" -Amount "1000000000"
```

---

## Option 2: Manual Commands (Step-by-Step)

### Step 1: Build

```powershell
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

**Expected output:** `Finished release [optimized] target(s)`

### Step 2: Upgrade Existing Contracts

```powershell
# Set your secret key (replace YOUR_SECRET_KEY)
$SECRET = "YOUR_SECRET_KEY"

# Upgrade Weekly Pool
stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm `
  --network testnet `
  --source-account $SECRET `
  --upgrade-wasm CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD

# Upgrade Biweekly Pool
stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm `
  --network testnet `
  --source-account $SECRET `
  --upgrade-wasm CCIK3PXFL2LE43BVRVEUDW3FYI2JGL74XVCO4XQYXPMG6F5ZOTP2X3T3

# Upgrade Monthly Pool
stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/lucky_stake_pool.wasm `
  --network testnet `
  --source-account $SECRET `
  --upgrade-wasm CBI7W6JDUG3YQ6SSB622JSNMXRH3AJF6AY336W2QERONGFYIFOV636LN
```

### Step 3: Set Blend Pool Address

```powershell
$SECRET = "YOUR_SECRET_KEY"
$BLEND_POOL = "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF"

# Weekly Pool
stellar contract invoke `
  --id CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD `
  --network testnet `
  --source-account $SECRET `
  set_blend_pool --blend_pool $BLEND_POOL

# Biweekly Pool
stellar contract invoke `
  --id CCIK3PXFL2LE43BVRVEUDW3FYI2JGL74XVCO4XQYXPMG6F5ZOTP2X3T3 `
  --network testnet `
  --source-account $SECRET `
  set_blend_pool --blend_pool $BLEND_POOL

# Monthly Pool
stellar contract invoke `
  --id CBI7W6JDUG3YQ6SSB622JSNMXRH3AJF6AY336W2QERONGFYIFOV636LN `
  --network testnet `
  --source-account $SECRET `
  set_blend_pool --blend_pool $BLEND_POOL
```

### Step 4: Supply Funds to Blend

```powershell
$SECRET = "YOUR_SECRET_KEY"
$AMOUNT = "1000000000"  # 100 XLM in stroops (7 decimals)

# Weekly Pool - Supply 100 XLM
stellar contract invoke `
  --id CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD `
  --network testnet `
  --source-account $SECRET `
  supply_to_blend --amount $AMOUNT

# Biweekly Pool - Supply 100 XLM
stellar contract invoke `
  --id CCIK3PXFL2LE43BVRVEUDW3FYI2JGL74XVCO4XQYXPMG6F5ZOTP2X3T3 `
  --network testnet `
  --source-account $SECRET `
  supply_to_blend --amount $AMOUNT

# Monthly Pool - Supply 100 XLM
stellar contract invoke `
  --id CBI7W6JDUG3YQ6SSB622JSNMXRH3AJF6AY336W2QERONGFYIFOV636LN `
  --network testnet `
  --source-account $SECRET `
  supply_to_blend --amount $AMOUNT
```

---

## Verify Deployment

```powershell
# Check Blend pool is set
stellar contract invoke --id CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD --network testnet get_blend_pool

# Check amount supplied
stellar contract invoke --id CAE4BWUBL73EOR4PZNO55V6HH2YUENBQUO2UKMCFVGIKPQ3ZFM7BKVSD --network testnet get_supplied_to_blend
```

---

## Amount Conversion (XLM to Stroops)

- **1 XLM** = `10000000` stroops (7 decimals)
- **10 XLM** = `100000000` stroops
- **100 XLM** = `1000000000` stroops
- **1000 XLM** = `10000000000` stroops

**Formula:** `stroops = XLM_amount * 10^7`

---

## Troubleshooting

- **"stellar: command not found"**: Install Stellar CLI or use full path
- **"cargo: command not found"**: Install Rust from rustup.rs
- **"wasm32-unknown-unknown not found"**: Run `rustup target add wasm32-unknown-unknown`
- **"Contract not found"**: Verify contract IDs match your `.env` file
- **"Already initialized"**: This is normal if upgrading; skip initialization
- **"Blend pool not set"**: Run `set_blend_pool` before `supply_to_blend`

---

## Next Steps

1. ✅ Contracts upgraded with Blend functions
2. ✅ Blend pool address set
3. ✅ Funds supplied to Blend (optional - do when ready)
4. 🔄 Restart backend to load updated contract code
5. 🔄 Frontend will show "Deployed to Blend" in pool details
