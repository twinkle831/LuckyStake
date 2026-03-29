import { WalletProvider } from "@/context/wallet-context"
import { DrawNotificationProvider } from "@/context/draw-notification-context"

export const metadata = {
  title: "LuckyStake App - Prize Pools & Dashboard",
  description:
    "Browse prize pools, deposit XLM, earn tickets, and track your entries on the LuckyStake decentralized lottery.",
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <DrawNotificationProvider>{children}</DrawNotificationProvider>
    </WalletProvider>
  )
}
