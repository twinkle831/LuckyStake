# Complete Deposit Workflow: Frontend → Wallet → Contract → Backend

## Overview

This document outlines the complete end-to-end flow for implementing USDC deposits with on-chain storage of wallet address, amount, and timestamp.

---

## Architecture Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  Frontend   │ ───▶ │   Wallet    │ ───▶ │   Stellar   │ ───▶ │   Backend   │
│  (React)    │      │ (Freighter/ │      │  Network    │      │  (Express)  │
│             │      │   xBull)    │      │  (Soroban)   │      │             │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
       │                    │                    │                    │
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
  Build XDR          Sign Transaction    Execute Contract      Index Event
  Invocation         (User Approves)     (On-chain Storage)    (Verify & Store)
```

---

## Step-by-Step Workflow

### **STEP 1: Frontend - User Initiates Deposit**

**Location:** `frontend/components/deposit-modal.tsx`

**Current State:** Simulates deposit with `setTimeout`

**What Needs to Change:**

1. **Install Required SDK:**
   ```bash
   cd frontend
   pnpm add @stellar/stellar-sdk
   ```

2. **Create Contract Invocation Helper:**
   - Build Soroban contract invocation XDR
   - Convert amount to contract format (i128, scaled by 7 decimals for USDC)
   - Map pool ID to contract address

3. **Flow:**
   ```typescript
   // User clicks "Deposit" button
   handleDeposit() {
     1. Validate amount, pool selection
     2. Get contract address for selected pool (weekly/biweekly/monthly)
     3. Build contract invocation XDR
     4. Request wallet signature
     5. Submit signed transaction to Stellar network
     6. Wait for transaction confirmation
     7. Extract txHash from confirmed transaction
     8. Call backend API with txHash to index deposit
   }
   ```

---

### **STEP 2: Wallet - User Signs Transaction**

**Location:** `frontend/lib/wallet-connectors.ts` (extend)

**What Happens:**

1. **Freighter Flow:**
   ```typescript
   import { signTransaction } from "@stellar/freighter-api"
   
   // Build unsigned transaction
   const tx = await buildContractInvocationTx(...)
   
   // Request signature
   const signedTx = await signTransaction(tx.toXDR(), {
     network: networkPassphrase,
     accountToSign: userAddress
   })
   ```

2. **xBull Flow:**
   ```typescript
   const sdk = window.xBullSDK
   await sdk.sign({
     xdr: tx.toXDR(),
     publicKey: userAddress,
     network: networkPassphrase
   })
   ```

3. **User Action:**
   - Wallet extension popup appears
   - User reviews: contract address, amount, fees
   - User approves/rejects
   - If approved, wallet returns signed XDR

---

### **STEP 3: Stellar Network - Contract Execution**

**Location:** `contracts/contracts/lucky-stake-pool/src/lib.rs`

**What Happens On-Chain:**

1. **Transaction Submitted:**
   - Frontend submits signed XDR to Stellar Horizon/RPC
   - Network validates signature, fees, sequence number
   - Transaction enters mempool

2. **Contract Execution:**
   ```rust
   pub fn deposit(env: Env, depositor: Address, amount: i128) {
       // 1. Verify depositor signed (require_auth)
       depositor.require_auth();
       
       // 2. Transfer USDC from user → contract
       token_client.transfer(&depositor, &contract, &amount);
       
       // 3. Calculate tickets (amount * period_days)
       let tickets_to_add = amount * (period_days as i128);
       
       // 4. Update balances & tickets
       // 5. Add to depositors list
       // 6. Emit log event (for indexing)
   }
   ```

3. **Current Limitation:**
   - Contract stores **aggregate balances**, not per-deposit history
   - **No per-deposit timestamp stored on-chain**
   - Timestamp available via `env.ledger().timestamp()` but not persisted per deposit

**To Store Per-Deposit Timestamps, Contract Needs:**
   ```rust
   // Add to DataKey enum:
   DepositHistory(Address),  // Vec<(i128, u64)> // (amount, timestamp)
   
   // In deposit():
   let timestamp = env.ledger().timestamp();
   let mut history: Vec<(i128, u64)> = env.storage()
       .instance()
       .get(&DataKey::DepositHistory(depositor.clone()))
       .unwrap_or_else(|| Vec::new(&env));
   history.push_back((amount, timestamp));
   env.storage().instance().set(&DataKey::DepositHistory(depositor.clone()), &history);
   ```

---

### **STEP 4: Backend - Index & Verify Deposit**

**Location:** `backend/src/routes/deposits.js`

**Current State:** Accepts txHash but doesn't verify on-chain

**What Needs to Change:**

1. **Install Soroban RPC Client:**
   ```bash
   cd backend
   npm install @stellar/stellar-sdk  # Already installed
   ```

2. **Create Stellar Service:**
   ```javascript
   // backend/src/services/stellar.js
   const StellarSdk = require("@stellar/stellar-sdk");
   
   const server = new StellarSdk.SorobanRpc.Server(
     process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org"
   );
   
   async function verifyDepositTransaction(txHash, expectedContract, expectedAmount) {
     // 1. Fetch transaction from Horizon/RPC
     const tx = await server.getTransaction(txHash);
     
     // 2. Verify transaction succeeded
     if (!tx.successful) throw new Error("Transaction failed");
     
     // 3. Parse contract invocation from transaction
     // 4. Verify contract address matches expected pool
     // 5. Verify amount matches
     // 6. Extract depositor address from transaction
     // 7. Extract timestamp from ledger close time
     
     return {
       depositor: tx.sourceAccount,
       amount: parsedAmount,
       timestamp: tx.ledgerCloseTime,
       contract: contractAddress
     };
   }
   ```

3. **Update Deposit Route:**
   ```javascript
   router.post("/", auth, async (req, res, next) => {
     const { poolType, amount, txHash } = req.body;
     
     // 1. Get contract address for poolType
     const contractAddress = getContractAddress(poolType);
     
     // 2. Verify transaction on-chain
     const verified = await verifyDepositTransaction(
       txHash,
       contractAddress,
       amount
     );
     
     // 3. Only then store in database
     const deposit = {
       id: uuidv4(),
       publicKey: verified.depositor,
       poolType,
       amount: verified.amount,
       txHash,
       tickets: calculateTickets(verified.amount, poolType),
       depositedAt: new Date(verified.timestamp * 1000).toISOString(),
       withdrawnAt: null
     };
     
     // Store in MongoDB (or current in-memory store)
     await storeDeposit(deposit);
     
     res.status(201).json({ deposit });
   });
   ```

---

## Implementation Checklist

### **Contract Changes (Optional - for per-deposit timestamps)**

- [ ] Add `DepositHistory(Address)` to `DataKey` enum
- [ ] Modify `deposit()` to append `(amount, timestamp)` to history Vec
- [ ] Add `get_deposit_history()` read function
- [ ] Rebuild and redeploy contracts

### **Frontend Changes**

- [ ] Install `@stellar/stellar-sdk`
- [ ] Create `lib/soroban-contracts.ts` helper:
  - [ ] `buildDepositInvocation(poolId, amount, userAddress)`
  - [ ] `submitTransaction(signedXdr)`
  - [ ] `waitForConfirmation(txHash)`
- [ ] Update `deposit-modal.tsx`:
  - [ ] Replace `setTimeout` simulation with real contract call
  - [ ] Handle wallet signing flow
  - [ ] Handle transaction submission
  - [ ] Handle errors (rejection, network failure)
- [ ] Add contract address mapping (pool ID → contract address)

### **Backend Changes**

- [ ] Create `services/stellar.js`:
  - [ ] Initialize Soroban RPC client
  - [ ] `verifyDepositTransaction(txHash, contract, amount)`
  - [ ] Parse transaction to extract deposit details
- [ ] Update `routes/deposits.js`:
  - [ ] Replace TODO comment with actual verification
  - [ ] Use verified data instead of trusting client
  - [ ] Extract timestamp from transaction ledger close time
- [ ] Add contract address configuration:
  - [ ] Environment variables for each pool contract address
  - [ ] Mapping function `getContractAddress(poolType)`

### **Configuration**

- [ ] Add to `.env`:
  ```
  STELLAR_RPC_URL=https://soroban-testnet.stellar.org
  STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
  POOL_CONTRACT_WEEKLY=CCEQRJQ4OLVLRRUS5SLJKGXDILYKISDV43HSBNP2QDUSIJ7ITWLHD73I
  POOL_CONTRACT_BIWEEKLY=CCITIDSTLZHHGWRIAJK6JAVLMMYSJ7GUDFWOS4MNCILLZQOFWBT63DFB
  POOL_CONTRACT_MONTHLY=CDAPP7TW2CU4D75KM6HL2IJPQYGDXR77O7GSIRGX7H2GNBRNY6J4LVZY
  USDC_TOKEN_ADDRESS=<usdc_contract_address>
  ```

---

## Data Flow Diagram

```
User clicks "Deposit $100"
    │
    ▼
Frontend: buildDepositInvocation("weekly", 100, userAddress)
    │
    ▼
Frontend: Request wallet signature (Freighter/xBull popup)
    │
    ▼
Wallet: User approves → returns signed XDR
    │
    ▼
Frontend: Submit signed XDR to Stellar Network
    │
    ▼
Stellar Network: Execute contract.deposit(userAddress, 1000000000)
    │
    ├─▶ Contract: Transfer USDC from user → contract
    ├─▶ Contract: Update Balance(userAddress) += 100
    ├─▶ Contract: Update Tickets(userAddress) += 700 (100 * 7 days)
    ├─▶ Contract: Update TotalDeposits += 100
    ├─▶ Contract: Emit log event
    │
    ▼
Transaction Confirmed → Returns txHash
    │
    ▼
Frontend: POST /api/deposits { poolType: "weekly", amount: 100, txHash: "..." }
    │
    ▼
Backend: verifyDepositTransaction(txHash, contractAddress, 100)
    │
    ├─▶ Fetch transaction from Soroban RPC
    ├─▶ Verify transaction.successful === true
    ├─▶ Verify contract address matches pool
    ├─▶ Verify amount matches
    ├─▶ Extract depositor address
    ├─▶ Extract timestamp from ledger close time
    │
    ▼
Backend: Store deposit record in MongoDB
    │
    ├─▶ id: uuid
    ├─▶ publicKey: verified depositor address
    ├─▶ poolType: "weekly"
    ├─▶ amount: 100
    ├─▶ txHash: transaction hash
    ├─▶ tickets: 700
    ├─▶ depositedAt: ISO timestamp from ledger
    │
    ▼
Backend: Return 201 { deposit }
    │
    ▼
Frontend: Update UI, show success message
```

---

## Key Considerations

### **1. Amount Scaling**
- USDC on Stellar uses **7 decimal places**
- Frontend: `100 USDC` → Contract: `1000000000` (100 * 10^7)
- Backend: Contract amount → Frontend: divide by 10^7

### **2. Error Handling**
- Wallet rejection (user cancels)
- Network failure (Stellar RPC down)
- Transaction failure (insufficient balance, contract revert)
- Backend verification failure (txHash not found, mismatch)

### **3. Transaction Fees**
- User pays fees in XLM (not USDC)
- Estimate: ~0.00001 XLM per operation
- Contract invocation: ~0.0001 XLM
- Inform user about fees before signing

### **4. Timestamp Source**
- **Option A:** Use transaction ledger close time (backend)
- **Option B:** Store timestamp in contract (requires contract changes)
- **Option C:** Use current time in backend (less accurate)

### **5. Pool Contract Addresses**
- Each pool (weekly/biweekly/monthly) is a separate contract deployment
- Store addresses in environment variables
- Frontend needs mapping: `poolId → contractAddress`

---

## Next Steps

1. **Start with Frontend:** Implement contract invocation helper
2. **Test with Testnet:** Use Stellar Testnet and test USDC
3. **Add Backend Verification:** Implement transaction verification
4. **Optional:** Add per-deposit timestamp storage in contract
5. **Production:** Switch to Mainnet, update contract addresses
