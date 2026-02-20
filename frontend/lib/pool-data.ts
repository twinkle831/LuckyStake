export interface Pool {
  id: string
  name: string
  frequency: string
  prize: number
  prizeFormatted: string
  tvl: string
  participants: number
  participantsFormatted: string
  apy: string
  drawTime: Date
  minDeposit: number
  ticketRatio: string
  color: string
  borderColor: string
  featured: boolean
}

// Draw times are relative to now
function futureDate(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

export const pools: Pool[] = [
  {
    id: "weekly",
    name: "Weekly Pool",
    frequency: "Every 7 Days",
    prize: 8920,
    prizeFormatted: "$8,920",
    tvl: "$1.8M",
    participants: 5847,
    participantsFormatted: "5,847",
    apy: "5.2%",
    drawTime: futureDate(104),
    minDeposit: 50,
    ticketRatio: "1 ticket per $1 per day",
    color: "from-accent/30 to-accent/5",
    borderColor: "hover:border-accent/50",
    featured: true,
  },
  {
    id: "biweekly",
    name: "Biweekly Pool",
    frequency: "Every 15 Days",
    prize: 18500,
    prizeFormatted: "$18,500",
    tvl: "$2.1M",
    participants: 7120,
    participantsFormatted: "7,120",
    apy: "5.4%",
    drawTime: futureDate(260),
    minDeposit: 75,
    ticketRatio: "1 ticket per $1 per day",
    color: "from-emerald-500/20 to-emerald-500/5",
    borderColor: "hover:border-emerald-500/40",
    featured: false,
  },
  {
    id: "monthly",
    name: "Monthly Pool",
    frequency: "Every 30 Days",
    prize: 42500,
    prizeFormatted: "$42,500",
    tvl: "$2.4M",
    participants: 8912,
    participantsFormatted: "8,912",
    apy: "5.6%",
    drawTime: futureDate(437),
    minDeposit: 100,
    ticketRatio: "1 ticket per $1 per day",
    color: "from-teal-500/20 to-teal-500/5",
    borderColor: "hover:border-teal-500/40",
    featured: false,
  },
]

export function calcTickets(amount: number, poolId: string): number {
  const multipliers: Record<string, number> = {
    weekly: 7,
    biweekly: 15,
    monthly: 30,
  }
  return amount * (multipliers[poolId] ?? 1)
}

export function calcWinProbability(
  tickets: number,
  pool: Pool,
  depositAmount: number
): string {
  // Simplified: your tickets / (total tickets estimated from TVL + your tickets)
  const tvlNum = parseFloat(pool.tvl.replace(/[$KM]/g, "")) * (pool.tvl.includes("M") ? 1_000_000 : 1_000)
  const totalTickets = tvlNum + depositAmount
  const prob = (tickets / totalTickets) * 100
  return prob < 0.01 ? "<0.01%" : `${prob.toFixed(2)}%`
}

export function formatCountdown(target: Date): string {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return "Drawing..."
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}
