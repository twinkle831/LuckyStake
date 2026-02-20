"use client";

/**
 * ConnectWalletModal.tsx
 *
 * Wallet connection modal that opens real signing windows for Freighter and xBull.
 * Detects if Chrome extension is installed; if not, redirects to install page.
 *
 * Dependencies:
 *   npm install @stellar/freighter-api
 *   (xBull uses window.xBullSDK injected by their extension)
 */

import { useWallet } from "@/context/wallet-context";
import { X, Loader2, Wallet, CheckCircle2, ExternalLink, AlertCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type WalletType = "freighter" | "xbull";
type ConnectionState = "idle" | "connecting" | "awaiting_signature" | "success" | "error";

interface WalletError {
  code: "NOT_INSTALLED" | "REJECTED" | "UNKNOWN";
  message: string;
  installUrl?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREIGHTER_CHROME_URL =
  "https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk";
const XBULL_CHROME_URL =
  "https://chrome.google.com/webstore/detail/xbull-wallet/omajpeaffjgmlpmhbfdjepdejoemifi";

const WALLET_META = {
  freighter: {
    name: "Freighter",
    subtitle: "Recommended for Stellar",
    installUrl: FREIGHTER_CHROME_URL,
    icon: (
      <svg viewBox="0 0 40 40" className="h-6 w-6" fill="none">
        <rect width="40" height="40" rx="10" fill="#6366F1" />
        <path
          d="M8 20L20 8L32 20M12 16V30H28V16"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="16" y="22" width="8" height="8" rx="1" fill="white" />
      </svg>
    ),
  },
  xbull: {
    name: "xBull",
    subtitle: "Browser Extension",
    installUrl: XBULL_CHROME_URL,
    icon: (
      <svg viewBox="0 0 40 40" className="h-6 w-6" fill="none">
        <rect width="40" height="40" rx="10" fill="#0EA5E9" />
        <path
          d="M10 10L20 20M30 10L20 20M20 20V32"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="3" fill="white" />
      </svg>
    ),
  },
} as const;

// ─── Chrome Detection ─────────────────────────────────────────────────────────

function isChromeBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
}

// ─── Extension Detection ──────────────────────────────────────────────────────

async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { isConnected } = await import("@stellar/freighter-api");
    const result = await isConnected();
    return true; // If import works, extension is present
  } catch {
    return typeof (window as any).freighter !== "undefined";
  }
}

function isXBullInstalled(): boolean {
  return typeof window !== "undefined" && typeof (window as any).xBullSDK !== "undefined";
}

// ─── Wallet Connection Functions ──────────────────────────────────────────────

async function connectFreighterWallet(): Promise<string> {
  const { isConnected, requestAccess, getAddress } = await import(
    "@stellar/freighter-api"
  );

  const connResult = await isConnected();

  if (!connResult.isConnected) {
    const access = await requestAccess();
    if (access.error) {
      throw { code: "REJECTED", message: "Connection rejected in Freighter." } as WalletError;
    }
  }

  const addressResult = await getAddress();

  if (addressResult.error) {
    throw { code: "UNKNOWN", message: addressResult.error } as WalletError;
  }

  return addressResult.address;
}

async function connectXBullWallet(): Promise<string> {
  const sdk = (window as any).xBullSDK;

  // This opens the xBull extension popup
  await sdk.connect({
    canRequestPublicKey: true,
    canRequestSign: true,
  });

  const publicKey = await sdk.getPublicKey();

  if (!publicKey) {
    throw { code: "REJECTED", message: "xBull did not return a public key." } as WalletError;
  }

  return publicKey;
}

// ─── Backend Auth Flow ────────────────────────────────────────────────────────

async function authenticateWithBackend(publicKey: string, walletType: WalletType): Promise<string> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // 1. Get challenge nonce
  const challengeRes = await fetch(`${apiBase}/api/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey }),
  });

  if (!challengeRes.ok) {
    throw new Error("Failed to get auth challenge from server");
  }

  const { nonce, challengeXDR } = await challengeRes.json();

  // 2. Sign challenge with wallet (if XDR provided)
  let signedXDR: string | undefined;
  if (challengeXDR) {
    if (walletType === "freighter") {
      const { signTransaction } = await import("@stellar/freighter-api");
      const network =
        process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
          ? "Public Global Stellar Network ; September 2015"
          : "Test SDF Network ; September 2015";
      const result = await signTransaction(challengeXDR, { networkPassphrase: network });
      if (result.error) throw new Error(result.error);
      signedXDR = result.signedTxXdr;
    } else if (walletType === "xbull") {
      const sdk = (window as any).xBullSDK;
      signedXDR = await sdk.sign({ xdr: challengeXDR });
    }
  }

  // 3. Verify and get JWT
  const verifyRes = await fetch(`${apiBase}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey, nonce, signedXDR }),
  });

  if (!verifyRes.ok) {
    throw new Error("Backend verification failed");
  }

  const { token } = await verifyRes.json();
  return token;
}

// ─── Modal Component ──────────────────────────────────────────────────────────

export function ConnectWalletModal({ open, onClose }: Props) {
  const { setConnection } = useWallet() as any;

  const [activeWallet, setActiveWallet] = useState<WalletType | null>(null);
  const [state, setState] = useState<ConnectionState>("idle");
  const [error, setError] = useState<WalletError | null>(null);
  const [connectedKey, setConnectedKey] = useState<string | null>(null);
  const [stateMessage, setStateMessage] = useState("");

  // Reset on open
  useEffect(() => {
    if (open) {
      setState("idle");
      setError(null);
      setActiveWallet(null);
      setConnectedKey(null);
    }
  }, [open]);

  // Auto-close after success
  useEffect(() => {
    if (state === "success") {
      const t = setTimeout(onClose, 1400);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  const handleConnect = useCallback(async (walletType: WalletType) => {
    setActiveWallet(walletType);
    setError(null);
    setState("connecting");

    try {
      // ── Step 1: Check if extension is installed ──────────────────────────
      let installed = false;
      if (walletType === "freighter") {
        installed = await isFreighterInstalled();
      } else if (walletType === "xbull") {
        installed = isXBullInstalled();
      }

      if (!installed) {
        const installUrl =
          walletType === "freighter" ? FREIGHTER_CHROME_URL : XBULL_CHROME_URL;

        // In Chrome: open extension install page
        if (isChromeBrowser()) {
          window.open(installUrl, "_blank", "noopener,noreferrer");
        }

        throw {
          code: "NOT_INSTALLED",
          message: `${WALLET_META[walletType].name} is not installed.`,
          installUrl,
        } as WalletError;
      }

      // ── Step 2: Open wallet popup (signing window) ───────────────────────
      setStateMessage(
        `Opening ${WALLET_META[walletType].name}… approve the connection request in the popup.`
      );
      setState("awaiting_signature");

      let publicKey: string;
      if (walletType === "freighter") {
        publicKey = await connectFreighterWallet();
      } else {
        publicKey = await connectXBullWallet();
      }

      // ── Step 3: Authenticate with LuckyStake backend ─────────────────────
      setStateMessage("Verifying with LuckyStake…");
      const token = await authenticateWithBackend(publicKey, walletType).catch(
        (err) => {
          // Non-fatal: still connect even if backend auth fails (dev fallback)
          console.warn("Backend auth failed, continuing without JWT:", err.message);
          return null;
        }
      );

      // Store in context / localStorage
      if (token) {
        localStorage.setItem("luckystake_token", token);
      }
      localStorage.setItem("luckystake_pubkey", publicKey);
      localStorage.setItem("luckystake_wallet", walletType);

      setConnectedKey(publicKey);
      setConnection?.({ publicKey, walletType, token });
      setState("success");
    } catch (err: any) {
      const walletErr: WalletError =
        err?.code != null
          ? err
          : { code: "UNKNOWN", message: err?.message || "Connection failed." };

      setError(walletErr);
      setState("error");
    }
  }, [setConnection]);

  if (!open) return null;

  const isConnecting = state === "connecting" || state === "awaiting_signature";
  const isSuccess = state === "success";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={!isConnecting ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl animate-slide-up">
        {/* Close */}
        <button
          onClick={onClose}
          disabled={isConnecting}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
            {isSuccess ? (
              <CheckCircle2 className="h-8 w-8 text-accent" />
            ) : (
              <Wallet className="h-8 w-8 text-accent" />
            )}
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            {isSuccess ? "Wallet Connected" : "Connect Wallet"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSuccess
              ? `Connected as ${connectedKey?.slice(0, 8)}…${connectedKey?.slice(-6)}`
              : "Connect your Stellar wallet to start participating in prize pools."}
          </p>
        </div>

        {/* Success state */}
        {isSuccess && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm text-accent">
              <CheckCircle2 className="h-4 w-4" />
              Connected Successfully
            </div>
          </div>
        )}

        {/* Wallet options */}
        {!isSuccess && (
          <div className="flex flex-col gap-3 mt-2">
            {(["freighter", "xbull"] as WalletType[]).map((walletType) => {
              const meta = WALLET_META[walletType];
              const isActive = activeWallet === walletType;
              const isThisConnecting = isActive && isConnecting;

              return (
                <WalletButton
                  key={walletType}
                  meta={meta}
                  walletType={walletType}
                  isConnecting={isThisConnecting}
                  isDisabled={isConnecting && !isActive}
                  onClick={() => handleConnect(walletType)}
                />
              );
            })}
          </div>
        )}

        {/* Awaiting signature message */}
        {state === "awaiting_signature" && (
          <div className="mt-4 rounded-xl bg-accent/5 border border-accent/20 p-3 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-accent mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">{stateMessage}</p>
          </div>
        )}

        {/* Error state */}
        {state === "error" && error && (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-destructive font-medium">{error.message}</p>
                {error.code === "NOT_INSTALLED" && error.installUrl && (
                  <a
                    href={error.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    Install Extension
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By connecting, you agree to our{" "}
          <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

// ─── Wallet Button Sub-component ──────────────────────────────────────────────

interface WalletButtonProps {
  meta: { name: string; subtitle: string; installUrl: string; icon: React.ReactNode };
  walletType: WalletType;
  isConnecting: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

function WalletButton({ meta, isConnecting, isDisabled, onClick }: WalletButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled || isConnecting}
      className="flex items-center gap-4 rounded-xl border border-border bg-secondary/30 px-5 py-4 text-left transition-all hover:bg-secondary/60 hover:border-accent/30 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
    >
      {/* Hover shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary shrink-0">
        {meta.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-semibold text-foreground">{meta.name}</p>
        <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
      </div>

      {isConnecting ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-xs text-accent">Opening…</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground group-hover:text-accent transition-colors">
          Connect
        </span>
      )}
    </button>
  );
}