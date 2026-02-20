export interface DrawResult {
  id: string
  poolName: string
  poolId: string
  drawDate: Date
  prizeAmount: number
  prizeFormatted: string
  winnerAddress: string
  winnerTickets: number
  totalTickets: number
  totalParticipants: number
  txHash: string
  verifiable: boolean
}

function pastDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
}

function randomStellarAddr(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let addr = "G"
  for (let i = 0; i < 55; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)]
  }
  return addr
}

function randomTxHash(): string {
  const chars = "abcdef0123456789"
  let hash = "0x"
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)]
  return hash
}

export const pastDraws: DrawResult[] = [
  {
    id: "draw-1",
    poolName: "Biweekly Pool",
    poolId: "biweekly",
    drawDate: pastDate(1),
    prizeAmount: 1180,
    prizeFormatted: "$1,180",
    winnerAddress: randomStellarAddr(),
    winnerTickets: 342,
    totalTickets: 124500,
    totalParticipants: 2280,
    txHash: randomTxHash(),
    verifiable: true,
  },
  {
    id: "draw-2",
    poolName: "Biweekly Pool",
    poolId: "biweekly",
    drawDate: pastDate(2),
    prizeAmount: 1095,
    prizeFormatted: "$1,095",
    winnerAddress: randomStellarAddr(),
    winnerTickets: 510,
    totalTickets: 118200,
    totalParticipants: 2190,
    txHash: randomTxHash(),
    verifiable: true,
  },
  {
    id: "draw-3",
    poolName: "Weekly Pool",
    poolId: "weekly",
    drawDate: pastDate(3),
    prizeAmount: 8450,
    prizeFormatted: "$8,450",
    winnerAddress: randomStellarAddr(),
    winnerTickets: 1240,
    totalTickets: 542000,
    totalParticipants: 5620,
    txHash: randomTxHash(),
    verifiable: true,
  },
  {
    id: "draw-4",
    poolName: "Biweekly Pool",
    poolId: "biweekly",
    drawDate: pastDate(3),
    prizeAmount: 1210,
    prizeFormatted: "$1,210",
    winnerAddress: randomStellarAddr(),
    winnerTickets: 180,
    totalTickets: 120800,
    totalParticipants: 2310,
    txHash: randomTxHash(),
    verifiable: true,
  },
  {
    id: "draw-5",
    poolName: "Monthly Pool",
    poolId: "monthly",
    drawDate: pastDate(8),
    prizeAmount: 41200,
    prizeFormatted: "$41,200",
    winnerAddress: randomStellarAddr(),
    winnerTickets: 4200,
    totalTickets: 1840000,
    totalParticipants: 8750,
    txHash: randomTxHash(),
    verifiable: true,
  },
  {
    id: "draw-6",
    poolName: "Weekly Pool",
    poolId: "weekly",
    drawDate: pastDate(10),
    prizeAmount: 7980,
    prizeFormatted: "$7,980",
    winnerAddress: randomStellarAddr(),
    winnerTickets: 890,
    totalTickets: 510000,
    totalParticipants: 5410,
    txHash: randomTxHash(),
    verifiable: true,
  },
  {
    id: "draw-7",
    poolName: "Biweekly Pool",
    poolId: "biweekly",
    drawDate: pastDate(4),
    prizeAmount: 1050,
    prizeFormatted: "$1,050",
    winnerAddress: randomStellarAddr(),
    winnerTickets: 290,
    totalTickets: 115000,
    totalParticipants: 2150,
    txHash: randomTxHash(),
    verifiable: true,
  },
  {
    id: "draw-8",
    poolName: "Biweekly Pool",
    poolId: "biweekly",
    drawDate: pastDate(5),
    prizeAmount: 1130,
    prizeFormatted: "$1,130",
    winnerAddress: randomStellarAddr(),
    winnerTickets: 420,
    totalTickets: 121000,
    totalParticipants: 2250,
    txHash: randomTxHash(),
    verifiable: true,
  },
]

export function truncateAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatDrawDate(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
