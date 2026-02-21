# Configuration Guide

## Environment Variables Setup

### Backend Configuration (`backend/.env`)

```bash
# Stellar Network
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Pool Contract Addresses (set after deploying contracts)
POOL_CONTRACT_WEEKLY=<contract_address_here>
POOL_CONTRACT_BIWEEKLY=<contract_address_here>
POOL_CONTRACT_MONTHLY=<contract_address_here>

# USDC Token Contract Address
USDC_TOKEN_ADDRESS=<usdc_contract_address_here>
```

### Frontend Configuration (`frontend/.env.local`)

Create `frontend/.env.local` (copy from `frontend/.env.example`):

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:4000

# Stellar Network Configuration
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org

# Pool Contract Addresses (must match backend)
NEXT_PUBLIC_POOL_CONTRACT_WEEKLY=<contract_address_here>
NEXT_PUBLIC_POOL_CONTRACT_BIWEEKLY=<contract_address_here>
NEXT_PUBLIC_POOL_CONTRACT_MONTHLY=<contract_address_here>

# USDC Token Contract Address
NEXT_PUBLIC_USDC_TOKEN_ADDRESS=<usdc_contract_address_here>
```

## Getting Contract Addresses

### 1. Deploy Contracts

Follow the instructions in `contracts/DEPLOYMENT.md` to deploy your pool contracts.

### 2. Get Contract Addresses

After deploying, you'll get contract addresses like:
```
Contract deployed: CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIH6DTRS3X2
```

### 3. Initialize Each Pool

Initialize each pool with the appropriate `period_days`:
- Weekly: `period_days = 7`
- Biweekly: `period_days = 15`
- Monthly: `period_days = 30`

### 4. Update Environment Variables

Copy the contract addresses into both `backend/.env` and `frontend/.env.local`.

## USDC Token Address

For Stellar Testnet, you can use:
- Test USDC: `CB64D3G7SM2RTH6JSGG34NDAT72A27C34N6O5BMFBUX4G6X4AO3LZP5F`

For Mainnet, use the official Stellar USDC token address.

## Testing Without Contracts

If you want to test the frontend/backend integration without deployed contracts, you can:
1. Leave contract addresses empty (will show errors but won't crash)
2. Use the simulation mode (already implemented in deposit-modal for fallback)

## Production Setup

For production (mainnet):
1. Change `STELLAR_NETWORK=mainnet`
2. Update `STELLAR_NETWORK_PASSPHRASE` to mainnet passphrase
3. Update RPC URL to mainnet Soroban RPC
4. Deploy contracts to mainnet
5. Update all contract addresses
