export interface DepositEntry {
  id: string
  poolId: string
  poolName: string
  amount: number
  tickets: number
  winProbability: string
  timestamp: Date
  txHash: string
  status: "confirmed" | "pending"
  type: "deposit" | "withdraw" | "claim"
}

// In-memory store (resets on refresh). In production this comes from on-chain.
let deposits: DepositEntry[] = []
let listeners: Array<() => void> = []

// Cached snapshot: useSyncExternalStore requires referentially stable returns
// when data has not changed. We update this only inside notify().
let snapshot: DepositEntry[] = deposits

function notify() {
  snapshot = [...deposits]
  listeners.forEach((fn) => fn())
}

export function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export function getDeposits(): DepositEntry[] {
  return snapshot
}

function generateTxHash(): string {
  const chars = "abcdef0123456789"
  let hash = "0x"
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)]
  return hash
}

export function addDeposit(
  entry: Omit<DepositEntry, "id" | "txHash" | "status" | "timestamp" | "type">
) {
  deposits = [
    {
      ...entry,
      id: crypto.randomUUID(),
      txHash: generateTxHash(),
      status: "confirmed",
      timestamp: new Date(),
      type: "deposit",
    },
    ...deposits,
  ]
  notify()
}

export function addWithdrawal(poolId: string, poolName: string, amount: number) {
  deposits = [
    {
      id: crypto.randomUUID(),
      poolId,
      poolName,
      amount,
      tickets: 0,
      winProbability: "0%",
      txHash: generateTxHash(),
      status: "confirmed",
      timestamp: new Date(),
      type: "withdraw",
    },
    ...deposits,
  ]
  notify()
}

export function addClaim(poolId: string, poolName: string, amount: number) {
  deposits = [
    {
      id: crypto.randomUUID(),
      poolId,
      poolName,
      amount,
      tickets: 0,
      winProbability: "0%",
      txHash: generateTxHash(),
      status: "confirmed",
      timestamp: new Date(),
      type: "claim",
    },
    ...deposits,
  ]
  notify()
}

export function getTotalDeposited(): number {
  return deposits
    .filter((d) => d.type === "deposit")
    .reduce((sum, d) => sum + d.amount, 0)
}

export function getTotalWithdrawn(): number {
  return deposits
    .filter((d) => d.type === "withdraw")
    .reduce((sum, d) => sum + d.amount, 0)
}

export function getTotalClaimed(): number {
  return deposits
    .filter((d) => d.type === "claim")
    .reduce((sum, d) => sum + d.amount, 0)
}

export function getNetDeposited(): number {
  return getTotalDeposited() - getTotalWithdrawn()
}

export function getTotalTickets(): number {
  return deposits
    .filter((d) => d.type === "deposit")
    .reduce((sum, d) => sum + d.tickets, 0)
}

export function getDepositsByPool(poolId: string): DepositEntry[] {
  return deposits.filter((d) => d.poolId === poolId)
}

export function getPoolBalance(poolId: string): number {
  const poolEntries = deposits.filter((d) => d.poolId === poolId)
  const deposited = poolEntries
    .filter((d) => d.type === "deposit")
    .reduce((s, d) => s + d.amount, 0)
  const withdrawn = poolEntries
    .filter((d) => d.type === "withdraw")
    .reduce((s, d) => s + d.amount, 0)
  return Math.max(0, deposited - withdrawn)
}

export function getAccruedInterest(poolId: string): number {
  // Simulated interest: 0.01% of pool balance as accrued
  const balance = getPoolBalance(poolId)
  return Math.round(balance * 0.0015 * 100) / 100
}
