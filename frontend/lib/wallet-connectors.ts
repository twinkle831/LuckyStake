/**
 * lib/wallet-connectors.ts
 *
 * @stellar/freighter-api v6 — CORRECT API
 *
 * v6 changes from v5:
 *  ❌ getPublicKey()  →  ✅ getAddress()     (returns { address } not { publicKey })
 *  ❌ FreighterApi class  →  ✅ still named exports, no class
 *  ✅ isConnected(), requestAccess(), getNetworkDetails(), signTransaction() unchanged
 *
 * xBull uses window.xBullSDK (injected by Chrome extension, no npm package).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type WalletType = "freighter" | "xbull";

export interface WalletConnection {
  address: string;        // Stellar public key (G...)
  walletType: WalletType;
  network: string;        // network passphrase
  networkName: string;    // "TESTNET" | "PUBLIC"
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isChromeBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /Chrome/.test(navigator.userAgent) &&
    /Google Inc/.test(navigator.vendor) &&
    !(window as any).opr
  );
}

function installUrl(wallet: WalletType): string {
  return isChromeBrowser()
    ? WALLET_INSTALL_URLS[wallet].chrome
    : WALLET_INSTALL_URLS[wallet].website;
}

function makeError(code: WalletError["code"], message: string, wallet?: WalletType): WalletError {
  return { code, message, ...(wallet ? { installUrl: installUrl(wallet) } : {}) };
}

// ─── Freighter v6 ─────────────────────────────────────────────────────────────
//
// Docs: https://docs.freighter.app/docs/guide/usingfreighterwebapp/
//
// Named exports (same as v5 except getPublicKey → getAddress):
//   isConnected()        → { isConnected: boolean }
//   isAllowed()          → { isAllowed: boolean }
//   requestAccess()      → { address: string } | { error: string }
//   getAddress()         → { address: string } | { error: string }
//   getNetworkDetails()  → { network, networkPassphrase, networkUrl, ... }
//   signTransaction(xdr, { networkPassphrase }) → { signedTxXdr } | { error }

export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    // Dynamic import — safe in Next.js (no SSR crash)
    const { isConnected } = await import("@stellar/freighter-api");
    const result = await isConnected();
    // v6 returns { isConnected: boolean }
    return result?.isConnected === true;
  } catch {
    return false;
  }
}

export async function connectFreighter(): Promise<WalletConnection> {
  const installed = await isFreighterInstalled();
  if (!installed) {
    throw makeError(
      "NOT_INSTALLED",
      "Freighter is not installed. Install it from the Chrome Web Store.",
      "freighter"
    );
  }

  try {
    const { requestAccess, getNetworkDetails } = await import("@stellar/freighter-api");

    // requestAccess() opens the Freighter browser extension popup.
    // User sees a permission dialog and clicks "Connect".
    // Returns { address: "G..." } on approval or { error: "..." } on rejection.
    const accessResult = await requestAccess();

    if ("error" in accessResult && accessResult.error) {
      throw makeError("REJECTED", "Connection was rejected in Freighter.");
    }

    const address = (accessResult as any).address as string;
    if (!address) {
      throw makeError("UNKNOWN", "Freighter did not return an address.");
    }

    // Get network details (non-fatal if fails)
    let networkPassphrase = "Test SDF Network ; September 2015";
    let networkName = "TESTNET";
    try {
      const net = await getNetworkDetails();
      networkPassphrase = net?.networkPassphrase ?? networkPassphrase;
      networkName = net?.network ?? networkName;
    } catch {
      /* use defaults */
    }

    return { address, walletType: "freighter", network: networkPassphrase, networkName };
  } catch (err: any) {
    if (err?.code) throw err; // already a WalletError

    const msg: string = err?.message ?? "";
    if (/reject|cancel|den/i.test(msg)) {
      throw makeError("REJECTED", "Connection cancelled in Freighter.");
    }
    throw makeError("UNKNOWN", msg || "Failed to connect to Freighter.");
  }
}

export async function signWithFreighter(xdr: string, networkPassphrase: string): Promise<string> {
  const { signTransaction } = await import("@stellar/freighter-api");
  const result = await signTransaction(xdr, { networkPassphrase });
  if ("error" in result && result.error) throw new Error(String(result.error));
  return (result as any).signedTxXdr as string;
}

// ─── xBull ────────────────────────────────────────────────────────────────────
//
// xBull injects window.xBullSDK when its Chrome extension is active.
// API: sdk.connect({ canRequestPublicKey, canRequestSign })
//      sdk.getPublicKey()  → string
//      sdk.sign({ xdr })   → string (signed XDR)

export function isXBullInstalled(): boolean {
  return typeof window !== "undefined" && typeof (window as any).xBullSDK !== "undefined";
}

export async function connectXBull(): Promise<WalletConnection> {
  if (!isXBullInstalled()) {
    throw makeError(
      "NOT_INSTALLED",
      "xBull is not installed. Install it from the Chrome Web Store.",
      "xbull"
    );
  }

  try {
    const sdk = (window as any).xBullSDK;

    // sdk.connect() opens the xBull extension popup.
    // User sees a permission dialog and clicks "Allow".
    await sdk.connect({ canRequestPublicKey: true, canRequestSign: true });

    const address: string = await sdk.getPublicKey();
    if (!address) throw makeError("REJECTED", "xBull did not return an address.");

    const isMainnet = process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet";
    const networkPassphrase = isMainnet
      ? "Public Global Stellar Network ; September 2015"
      : "Test SDF Network ; September 2015";

    return {
      address,
      walletType: "xbull",
      network: networkPassphrase,
      networkName: isMainnet ? "PUBLIC" : "TESTNET",
    };
  } catch (err: any) {
    if (err?.code) throw err;

    const msg: string = err?.message ?? "";
    if (/reject|deny|cancel/i.test(msg)) {
      throw makeError("REJECTED", "Connection cancelled in xBull.");
    }
    throw makeError("UNKNOWN", msg || "Failed to connect to xBull.");
  }
}

export async function signWithXBull(xdr: string): Promise<string> {
  const sdk = (window as any).xBullSDK;
  return sdk.sign({ xdr });
}

// ─── Unified entry point ──────────────────────────────────────────────────────

export async function connectWallet(type: WalletType): Promise<WalletConnection> {
  switch (type) {
    case "freighter": return connectFreighter();
    case "xbull":     return connectXBull();
    default:          throw makeError("UNKNOWN", "Unknown wallet type");
  }
}