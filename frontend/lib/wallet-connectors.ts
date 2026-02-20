/**
 * lib/wallet-connectors.ts
 *
 * @stellar/freighter-api v6 — named exports, getAddress() not getPublicKey()
 * xBull — window.xBullSDK (injected by Chrome extension)
 */

export type WalletType = "freighter" | "xbull";

export interface WalletConnection {
  address: string;
  walletType: WalletType;
  network: string;       // full passphrase
  networkName: string;   // "TESTNET" | "PUBLIC"
}

export interface WalletError {
  code: "NOT_INSTALLED" | "REJECTED" | "UNKNOWN";
  message: string;
  installUrl?: string;
}

// ─── Install URLs ─────────────────────────────────────────────────────────────

export const WALLET_INSTALL_URLS = {
  freighter: {
    chrome: "https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk",
    website: "https://www.freighter.app",
  },
  xbull: {
    chrome: "https://chrome.google.com/webstore/detail/xbull-wallet/omajpeaffjgmlpmhbfdjepdejoemifi",
    website: "https://xbull.app",
  },
} as const;

export function isChromeBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
}

function installUrl(wallet: WalletType): string {
  return isChromeBrowser() ? WALLET_INSTALL_URLS[wallet].chrome : WALLET_INSTALL_URLS[wallet].website;
}

// ─── Freighter v6 ─────────────────────────────────────────────────────────────
// v6 named exports — NO class, NO getPublicKey
// requestAccess() → opens popup → returns { address } or { error }

export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { isConnected } = await import("@stellar/freighter-api");
    const result = await isConnected();
    return result?.isConnected === true;
  } catch {
    return false;
  }
}

export async function connectFreighter(): Promise<WalletConnection> {
  if (!(await isFreighterInstalled())) {
    throw { code: "NOT_INSTALLED", message: "Freighter is not installed.", installUrl: installUrl("freighter") } as WalletError;
  }

  try {
    const { requestAccess, getNetworkDetails } = await import("@stellar/freighter-api");

    // Opens the Freighter browser extension popup
    const result = await requestAccess();

    if ("error" in result && result.error) {
      throw { code: "REJECTED", message: "Connection rejected in Freighter." } as WalletError;
    }

    const address = (result as any).address as string;
    if (!address) throw { code: "UNKNOWN", message: "Freighter did not return an address." } as WalletError;

    let networkPassphrase = "Test SDF Network ; September 2015";
    let networkName = "TESTNET";
    try {
      const net = await getNetworkDetails();
      networkPassphrase = net?.networkPassphrase ?? networkPassphrase;
      networkName = net?.network ?? networkName;
    } catch { /* use defaults */ }

    return { address, walletType: "freighter", network: networkPassphrase, networkName };
  } catch (err: any) {
    if (err?.code) throw err;
    if (/reject|cancel|den/i.test(err?.message ?? "")) throw { code: "REJECTED", message: "Connection cancelled." } as WalletError;
    throw { code: "UNKNOWN", message: err?.message || "Failed to connect to Freighter." } as WalletError;
  }
}

// ─── xBull ────────────────────────────────────────────────────────────────────
// window.xBullSDK injected by Chrome extension — no npm package

export function isXBullInstalled(): boolean {
  return typeof window !== "undefined" && typeof (window as any).xBullSDK !== "undefined";
}

export async function connectXBull(): Promise<WalletConnection> {
  if (!isXBullInstalled()) {
    throw { code: "NOT_INSTALLED", message: "xBull is not installed.", installUrl: installUrl("xbull") } as WalletError;
  }

  try {
    const sdk = (window as any).xBullSDK;
    await sdk.connect({ canRequestPublicKey: true, canRequestSign: true }); // opens xBull popup
    const address: string = await sdk.getPublicKey();
    if (!address) throw { code: "REJECTED", message: "xBull did not return an address." } as WalletError;

    const isMainnet = process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet";
    return {
      address,
      walletType: "xbull",
      network: isMainnet ? "Public Global Stellar Network ; September 2015" : "Test SDF Network ; September 2015",
      networkName: isMainnet ? "PUBLIC" : "TESTNET",
    };
  } catch (err: any) {
    if (err?.code) throw err;
    if (/reject|deny|cancel/i.test(err?.message ?? "")) throw { code: "REJECTED", message: "Connection cancelled in xBull." } as WalletError;
    throw { code: "UNKNOWN", message: err?.message || "Failed to connect to xBull." } as WalletError;
  }
}

// ─── Unified connect ──────────────────────────────────────────────────────────

export async function connectWallet(type: WalletType): Promise<WalletConnection> {
  return type === "freighter" ? connectFreighter() : connectXBull();
}

// ─── Backend auth flow ────────────────────────────────────────────────────────
// Called automatically after wallet connects.
// Returns JWT from your backend, or null if backend is unreachable (dev fallback).

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function authenticateWithBackend(address: string): Promise<string | null> {
  try {
    // Step 1: Get nonce for this address
    const challengeRes = await fetch(`${API}/api/auth/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey: address }),
    });
    if (!challengeRes.ok) throw new Error(`Challenge failed: ${challengeRes.status}`);
    const { nonce } = await challengeRes.json();

    // Step 2: Send address + nonce back → get JWT
    const verifyRes = await fetch(`${API}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicKey: address, nonce }),
    });
    if (!verifyRes.ok) throw new Error(`Verify failed: ${verifyRes.status}`);
    const { token } = await verifyRes.json();

    return token;
  } catch (err) {
    console.warn("[LuckyStake] Backend auth skipped (is the backend running?):", (err as Error).message);
    return null;
  }
}