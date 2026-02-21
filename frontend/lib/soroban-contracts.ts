/**
 * lib/soroban-contracts.ts
 * 
 * Soroban contract invocation helpers for LuckyStake pools
 * Handles building, signing, and submitting contract transactions
 */

import { type WalletType } from "./wallet-connectors";

// Contract address mapping (set via environment variables)
const CONTRACT_ADDRESSES: Record<string, string> = {
  weekly: process.env.NEXT_PUBLIC_POOL_CONTRACT_WEEKLY || "",
  biweekly: process.env.NEXT_PUBLIC_POOL_CONTRACT_BIWEEKLY || "",
  monthly: process.env.NEXT_PUBLIC_POOL_CONTRACT_MONTHLY || "",
};

// Network configuration
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || 
  "Test SDF Network ; September 2015";

// XLM uses 7 decimal places (stroops)
const XLM_DECIMALS = 7;
const SCALING_FACTOR = 10 ** XLM_DECIMALS;

export interface DepositResult {
  txHash: string;
  success: boolean;
  error?: string;
}

/**
 * Convert XLM amount to contract format (i128 scaled by 7 decimals / stroops)
 */
export function scaleAmount(amount: number): string {
  return (BigInt(Math.floor(amount * SCALING_FACTOR))).toString();
}

/**
 * Get contract address for a pool ID
 */
export function getContractAddress(poolId: string): string {
  const address = CONTRACT_ADDRESSES[poolId];
  if (!address) {
    // In development, provide helpful error message
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        `No contract address configured for pool: ${poolId}. ` +
        `Please set NEXT_PUBLIC_POOL_CONTRACT_${poolId.toUpperCase()} in your .env.local file. ` +
        `See CONFIGURATION.md for setup instructions.`
      );
    }
    throw new Error(`No contract address configured for pool: ${poolId}`);
  }
  return address;
}

/**
 * Build unsigned deposit transaction XDR
 */
export async function buildDepositInvocation(
  poolId: string,
  amount: number,
  userAddress: string
): Promise<string> {
  // Dynamic import to avoid SSR issues
  const StellarSdk = await import("@stellar/stellar-sdk");
  
  const contractAddress = getContractAddress(poolId);
  const scaledAmount = scaleAmount(amount);
  
  // Create Soroban RPC server
  const server = new StellarSdk.SorobanRpc.Server(RPC_URL, {
    allowHttp: RPC_URL.startsWith("http://"),
  });

  // Get account sequence number
  const account = await server.getAccount(userAddress);
  const sourceAccount = new StellarSdk.Account(userAddress, account.sequenceNumber());

  // Build contract invocation operation
  const contract = new StellarSdk.Contract(contractAddress);
  
  // Convert parameters to ScVal
  const depositorScVal = StellarSdk.Address.fromString(userAddress).toScVal();
  const amountScVal = StellarSdk.nativeToScVal(BigInt(scaledAmount), { type: "i128" });
  
  // Build contract call operation
  // Note: Contract.call() returns an InvokeHostFunction operation
  const operation = contract.call("deposit", depositorScVal, amountScVal);

  // Build transaction
  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // Simulate to get resource fees
  const simResponse = await server.simulateTransaction(tx);
  if (StellarSdk.SorobanRpc.isSimulationError(simResponse)) {
    throw new Error(`Simulation failed: ${simResponse.error}`);
  }

  // Set resource fees
  tx.setResourcesFee(simResponse.minResourceFee || "100");

  return tx.toXDR();
}

/**
 * Sign transaction with wallet
 */
export async function signTransaction(
  xdr: string,
  walletType: WalletType,
  userAddress: string
): Promise<string> {
  if (walletType === "freighter") {
    const { signTransaction } = await import("@stellar/freighter-api");
    const result = await signTransaction(xdr, {
      network: NETWORK_PASSPHRASE,
      accountToSign: userAddress,
    });
    
    if (!result) {
      throw new Error("Transaction signing rejected");
    }
    
    return result;
  } else if (walletType === "xbull") {
    const sdk = (window as any).xBullSDK;
    if (!sdk) {
      throw new Error("xBull SDK not available");
    }
    
    const result = await sdk.sign({
      xdr,
      publicKey: userAddress,
      network: NETWORK_PASSPHRASE,
    });
    
    if (!result) {
      throw new Error("Transaction signing rejected");
    }
    
    return result;
  } else {
    throw new Error(`Unsupported wallet type: ${walletType}`);
  }
}

/**
 * Submit signed transaction to Stellar network
 */
export async function submitTransaction(signedXdr: string): Promise<string> {
  const StellarSdk = await import("@stellar/stellar-sdk");
  
  const server = new StellarSdk.SorobanRpc.Server(RPC_URL, {
    allowHttp: RPC_URL.startsWith("http://"),
  });

  // Reconstruct transaction from XDR
  const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  // Send transaction
  const sendResponse = await server.sendTransaction(tx);
  
  if (sendResponse.status === StellarSdk.SorobanRpc.SendTransactionStatus.PENDING) {
    return sendResponse.hash;
  } else {
    throw new Error(`Transaction submission failed: ${sendResponse.status}`);
  }
}

/**
 * Wait for transaction confirmation
 */
export async function waitForConfirmation(
  txHash: string,
  timeoutSeconds: number = 30
): Promise<{ success: boolean; ledger: number }> {
  const StellarSdk = await import("@stellar/stellar-sdk");
  
  const server = new StellarSdk.SorobanRpc.Server(RPC_URL, {
    allowHttp: RPC_URL.startsWith("http://"),
  });

  const startTime = Date.now();
  const timeout = timeoutSeconds * 1000;

  while (Date.now() - startTime < timeout) {
    const txResponse = await server.getTransaction(txHash);
    
    if (txResponse.status === StellarSdk.SorobanRpc.GetTransactionStatus.SUCCESS) {
      return {
        success: txResponse.successful || false,
        ledger: txResponse.ledger || 0,
      };
    }
    
    if (txResponse.status === StellarSdk.SorobanRpc.GetTransactionStatus.NOT_FOUND) {
      // Transaction not yet processed, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    
    if (txResponse.status === StellarSdk.SorobanRpc.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${txResponse.errorResultXdr || "Unknown error"}`);
    }
  }

  throw new Error(`Transaction confirmation timeout after ${timeoutSeconds}s`);
}

/**
 * Complete deposit flow: build, sign, submit, wait for confirmation
 */
export async function executeDeposit(
  poolId: string,
  amount: number,
  userAddress: string,
  walletType: WalletType
): Promise<DepositResult> {
  try {
    // 1. Build unsigned transaction
    const unsignedXdr = await buildDepositInvocation(poolId, amount, userAddress);
    
    // 2. Sign with wallet
    const signedXdr = await signTransaction(unsignedXdr, walletType, userAddress);
    
    // 3. Submit to network
    const txHash = await submitTransaction(signedXdr);
    
    // 4. Wait for confirmation
    const confirmation = await waitForConfirmation(txHash);
    
    if (!confirmation.success) {
      return {
        txHash,
        success: false,
        error: "Transaction executed but was not successful",
      };
    }
    
    return {
      txHash,
      success: true,
    };
  } catch (error: any) {
    return {
      txHash: "",
      success: false,
      error: error?.message || "Unknown error occurred",
    };
  }
}
