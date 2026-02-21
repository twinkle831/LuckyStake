/**
 * Stellar Expert block explorer URLs for viewing transactions and accounts.
 */

const STELLAR_EXPERT_BASE = "https://stellar.expert/explorer";

/**
 * Network segment for Stellar Expert: "testnet" or "public" (mainnet).
 */
function getExplorerNetwork(): "testnet" | "public" {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
  return network.toLowerCase() === "testnet" ? "testnet" : "public";
}

/**
 * URL to view a transaction on Stellar Expert.
 * @param txHash - Stellar transaction hash (hex string)
 */
export function stellarExpertTxUrl(txHash: string): string {
  if (!txHash || typeof txHash !== "string") return STELLAR_EXPERT_BASE;
  const net = getExplorerNetwork();
  return `${STELLAR_EXPERT_BASE}/${net}/tx/${txHash.trim()}`;
}

/**
 * URL to view an account on Stellar Expert.
 * @param accountId - Stellar public key (G...)
 */
export function stellarExpertAccountUrl(accountId: string): string {
  if (!accountId || typeof accountId !== "string") return STELLAR_EXPERT_BASE;
  const net = getExplorerNetwork();
  return `${STELLAR_EXPERT_BASE}/${net}/account/${accountId.trim()}`;
}

/** True if the string looks like a real Stellar transaction hash (64 hex chars). */
export function isStellarTxHash(txHash: string): boolean {
  return typeof txHash === "string" && /^[0-9a-fA-F]{64}$/.test(txHash.trim());
}
