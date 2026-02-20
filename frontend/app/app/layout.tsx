import { WalletProvider } from "@/context/wallet-context"

export const metadata = {
  title: "LuckyStake App - Prize Pools & Dashboard",
  description:
    "Browse prize pools, deposit USDC, earn tickets, and track your entries on the LuckyStake decentralized lottery.",
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>
}
