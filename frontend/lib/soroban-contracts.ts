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

// Network configuration: mainnet unless explicitly testnet
const IS_TESTNET = process.env.NEXT_PUBLIC_STELLAR_NETWORK === "testnet";
const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
  (IS_TESTNET ? "https://soroban-testnet.stellar.org" : "https://soroban-mainnet.stellar.org");
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ||
  (IS_TESTNET ? "Test SDF Network ; September 2015" : "Public Global Stellar Network ; September 2015");

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
  return BigInt(Math.floor(amount * SCALING_FACTOR)).toString();
}

/**
 * Get contract address for a pool ID
 */
export function getContractAddress(poolId: string): string {
  const address = CONTRACT_ADDRESSES[poolId];
  if (!address) {
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
 * Build and simulate deposit transaction, return assembled XDR (unsigned)
 */
export async function buildDepositInvocation(
  poolId: string,
  amount: number,
  userAddress: string
): Promise<string> {
  const StellarSdk = await import("@stellar/stellar-sdk");

  const contractAddress = getContractAddress(poolId);
  const scaledAmount = scaleAmount(amount);

  // FIX: use StellarSdk.rpc.Server instead of StellarSdk.SorobanRpc.Server
  // SorobanRpc was renamed to rpc in newer versions of the SDK
  const server = new StellarSdk.rpc.Server(RPC_URL, {
    allowHttp: RPC_URL.startsWith("http://"),
  });

  // Get account — handle both .sequenceNumber() method and .sequence property
  let accountData: any;
  try {
    accountData = await server.getAccount(userAddress);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    if (/account not found|not found/i.test(msg)) {
      throw new Error(
        "This address has no account on Stellar Mainnet yet. Send a small amount of XLM to it first (e.g. from an exchange or another wallet), then try again."
      );
    }
    throw e;
  }
  const sequence: string =
    typeof (accountData as any).sequenceNumber === "function"
      ? (accountData as any).sequenceNumber()
      : (accountData as any).sequence;

  const sourceAccount = new StellarSdk.Account(userAddress, sequence);

  const contract = new StellarSdk.Contract(contractAddress);

  const depositorScVal = StellarSdk.Address.fromString(userAddress).toScVal();
  const amountScVal = StellarSdk.nativeToScVal(BigInt(scaledAmount), {
    type: "i128",
  });

  const operation = contract.call("deposit", depositorScVal, amountScVal);

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // Simulate
  const simResponse = await server.simulateTransaction(tx);

  // Check simulation error via shape (not helper function — unreliable across builds)
  if ((simResponse as any).error) {
    throw new Error(`Simulation failed: ${(simResponse as any).error}`);
  }

  // FIX: assembleTransaction: try StellarSdk.rpc first, then /rpc subpath
  let assembleTransaction: Function;
  if (typeof (StellarSdk.rpc as any).assembleTransaction === "function") {
    assembleTransaction = (StellarSdk.rpc as any).assembleTransaction;
  } else {
    const rpc = await import("@stellar/stellar-sdk/rpc");
    assembleTransaction = (rpc as any).assembleTransaction;
  }

  const assembledTx = assembleTransaction(tx, simResponse).build();
  return assembledTx.toXDR();
}

/**
 * Sign transaction with wallet.
 * Handles both Freighter API v1 (returns string) and v2+ (returns { signedTxXdr, error })
 */
export async function signTransaction(
  xdr: string,
  walletType: WalletType,
  userAddress: string
): Promise<string> {
  if (walletType === "freighter") {
    const freighter = await import("@stellar/freighter-api");

    // v2+ API: signTransaction accepts options object and returns { signedTxXdr, error }
    // v1 API: signTransaction(xdr, { network, accountToSign }) returns string directly
    const raw = await (freighter.signTransaction as Function)(xdr, {
      // v1 fields
      network: NETWORK_PASSPHRASE,
      accountToSign: userAddress,
      // v2 fields
      networkPassphrase: NETWORK_PASSPHRASE,
      address: userAddress,
    });

    // Handle v2 response object
    if (raw && typeof raw === "object") {
      if (raw.error) {
        throw new Error(
          typeof raw.error === "string"
            ? raw.error
            : raw.error?.message ?? "Transaction signing rejected"
        );
      }
      if (raw.signedTxXdr) {
        return raw.signedTxXdr;
      }
    }

    // Handle v1 plain string response
    if (typeof raw === "string" && raw.length > 0) {
      return raw;
    }

    throw new Error("Transaction signing rejected or returned empty result");
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
    // xBull may return string or object
    if (typeof result === "string" && result.length > 0) return result;
    if (result?.signedTxXdr) return result.signedTxXdr;
    throw new Error("Transaction signing rejected");
  } else {
    throw new Error(`Unsupported wallet type: ${walletType}`);
  }
}

/**
 * Submit signed transaction XDR directly to Stellar RPC via raw JSON-RPC fetch.
 * We bypass the SDK's TransactionBuilder.fromXDR entirely to avoid
 * "Bad union switch" XDR deserialization errors from SDK/wallet version mismatches.
 */
export async function submitTransaction(signedXdr: string): Promise<string> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "sendTransaction",
    params: { transaction: signedXdr },
  };

  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`RPC HTTP error: ${res.status}`);
  }

  const json = await res.json();

  if (json.error) {
    throw new Error(
      `RPC error: ${json.error.message ?? JSON.stringify(json.error)}`
    );
  }

  const result = json.result;

  if (!result) {
    throw new Error("Empty response from RPC");
  }

  // PENDING = submitted successfully
  // DUPLICATE = already submitted, hash still valid
  // TRY_AGAIN_LATER = node busy, treat as pending
  if (
    result.status === "PENDING" ||
    result.status === "DUPLICATE" ||
    result.status === "TRY_AGAIN_LATER"
  ) {
    return result.hash;
  }

  throw new Error(
    `Transaction submission failed with status: ${result.status}`
  );
}

/**
 * Wait for transaction confirmation via direct JSON-RPC polling.
 * Also bypasses SDK to avoid XDR parsing issues.
 */
export async function waitForConfirmation(
  txHash: string,
  timeoutSeconds: number = 30
): Promise<{ success: boolean; ledger: number }> {
  const startTime = Date.now();
  const timeout = timeoutSeconds * 1000;

  while (Date.now() - startTime < timeout) {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: { hash: txHash },
    };

    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    const result = json.result;

    if (!result) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    if (result.status === "SUCCESS") {
      return { success: true, ledger: result.ledger ?? 0 };
    }

    if (result.status === "NOT_FOUND") {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    if (result.status === "FAILED") {
      throw new Error(
        `Transaction failed: ${result.errorResultXdr ?? "Unknown error"}`
      );
    }

    // Unknown status — keep polling
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(`Transaction confirmation timeout after ${timeoutSeconds}s`);
}

/**
 * Build and simulate withdraw (claim principal) transaction.
 */
export async function buildWithdrawInvocation(
  poolId: string,
  amount: number,
  userAddress: string
): Promise<string> {
  const StellarSdk = await import("@stellar/stellar-sdk");

  const contractAddress = getContractAddress(poolId);
  const scaledAmount = scaleAmount(amount);

  const server = new StellarSdk.rpc.Server(RPC_URL, {
    allowHttp: RPC_URL.startsWith("http://"),
  });

  let accountData: any;
  try {
    accountData = await server.getAccount(userAddress);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    if (/account not found|not found/i.test(msg)) {
      throw new Error(
        "This address has no account on Stellar Mainnet yet. Fund it with XLM first, then try again."
      );
    }
    throw e;
  }
  const sequence: string =
    typeof (accountData as any).sequenceNumber === "function"
      ? (accountData as any).sequenceNumber()
      : (accountData as any).sequence;

  const sourceAccount = new StellarSdk.Account(userAddress, sequence);
  const contract = new StellarSdk.Contract(contractAddress);

  const depositorScVal = StellarSdk.Address.fromString(userAddress).toScVal();
  const amountScVal = StellarSdk.nativeToScVal(BigInt(scaledAmount), {
    type: "i128",
  });

  const operation = contract.call("withdraw", depositorScVal, amountScVal);

  const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResponse = await server.simulateTransaction(tx);

  if ((simResponse as any).error) {
    throw new Error(`Simulation failed: ${(simResponse as any).error}`);
  }

  let assembleTransaction: Function;
  if (typeof (StellarSdk.rpc as any).assembleTransaction === "function") {
    assembleTransaction = (StellarSdk.rpc as any).assembleTransaction;
  } else {
    const rpc = await import("@stellar/stellar-sdk/rpc");
    assembleTransaction = (rpc as any).assembleTransaction;
  }

  const assembledTx = assembleTransaction(tx, simResponse).build();
  return assembledTx.toXDR();
}

/**
 * Complete claim-principal flow: build, sign, submit, wait for confirmation.
 * Returns real Soroban tx hash so it shows in user wallet and Stellar Expert.
 */
export async function executeWithdraw(
  poolId: string,
  amount: number,
  userAddress: string,
  walletType: WalletType
): Promise<DepositResult> {
  try {
    const unsignedXdr = await buildWithdrawInvocation(poolId, amount, userAddress);
    const signedXdr = await signTransaction(unsignedXdr, walletType, userAddress);
    const txHash = await submitTransaction(signedXdr);
    const confirmation = await waitForConfirmation(txHash);

    if (!confirmation.success) {
      return {
        txHash,
        success: false,
        error: "Transaction executed but was not successful",
      };
    }

    return { txHash, success: true };
  } catch (error: any) {
    return {
      txHash: "",
      success: false,
      error: error?.message || "Unknown error occurred",
    };
  }
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
    // 1. Build unsigned + assembled transaction
    const unsignedXdr = await buildDepositInvocation(poolId, amount, userAddress);

    // 2. Sign with wallet
    const signedXdr = await signTransaction(unsignedXdr, walletType, userAddress);

    // 3. Submit directly via JSON-RPC (no SDK XDR parsing)
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

    return { txHash, success: true };
  } catch (error: any) {
    return {
      txHash: "",
      success: false,
      error: error?.message || "Unknown error occurred",
    };
  }
}