"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/context/wallet-context"
import { AppPoolCards } from "@/components/app-pool-cards"
import { DepositModal } from "@/components/deposit-modal"
import { WithdrawModal } from "@/components/withdraw-modal"
import { UserDashboard } from "@/components/user-dashboard"
import { ConnectWalletModal } from "@/components/connect-wallet-modal"
import { AppNavbar } from "@/components/app-navbar"
import { PoolDetailPanel } from "@/components/pool-detail-panel"
import { DrawsSection } from "@/components/draws-section"
import { NetworkBanner } from "@/components/network-banner"
import { ToastProvider, useToast } from "@/components/toast-provider"
import {
  PoolGridSkeleton,
  DashboardSkeleton,
  DrawsSkeleton,
} from "@/components/skeletons"
import { pools, type Pool } from "@/lib/pool-data"
import { Wallet, ArrowRight, LayoutGrid, PieChart, Trophy } from "lucide-react"

export type Tab = "pools" | "dashboard" | "draws"

function AppContent() {
  const { isConnected } = useWallet()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>("pools")
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [depositPool, setDepositPool] = useState<Pool | null>(null)
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [withdrawPool, setWithdrawPool] = useState<Pool | null>(null)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [detailPool, setDetailPool] = useState<Pool | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Simulate initial data fetch
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1200)
    return () => clearTimeout(t)
  }, [])

  function handleDeposit(pool: Pool) {
    if (!isConnected) {
      setWalletModalOpen(true)
      return
    }
    setDepositPool(pool)
    setDepositModalOpen(true)
  }

  function handleWithdraw(pool: Pool) {
    if (!isConnected) {
      setWalletModalOpen(true)
      return
    }
    setWithdrawPool(pool)
    setWithdrawModalOpen(true)
  }

  function handleViewDetail(pool: Pool) {
    setDetailPool(pool)
    setDetailOpen(true)
  }

  function handleDepositSuccess() {
    toast("success", "Deposit Confirmed", "Your deposit was successful and tickets have been issued.")
    setTab("dashboard")
  }

  function handleWithdrawSuccess() {
    toast("success", "Transaction Complete", "Funds have been returned to your wallet.")
    setTab("dashboard")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <NetworkBanner />
      <AppNavbar
        onConnectWallet={() => setWalletModalOpen(true)}
        activeTab={tab}
        onTabChange={setTab}
      />

      {/* Background accent */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 30% at 50% 0%, rgba(52, 211, 153, 0.04) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <main className="relative mx-auto max-w-7xl px-6 pt-28 pb-28 lg:pb-20">
        {/* Page header */}
        <div className="mb-10">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {tab === "pools" && "Prize Pools"}
            {tab === "dashboard" && "Your Dashboard"}
            {tab === "draws" && "Draw Results"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {tab === "pools" &&
              "Select a pool, deposit USDC, and start earning tickets for the next draw."}
            {tab === "dashboard" &&
              "Track your deposits, tickets, and upcoming draws."}
            {tab === "draws" &&
              "View upcoming draws and past results with on-chain verification."}
          </p>
        </div>

        {/* Not connected prompt */}
        {!isConnected && tab === "dashboard" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent/10">
              <Wallet className="h-10 w-10 text-accent" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Connect Your Wallet
            </h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              Connect your Stellar wallet to view your dashboard, track deposits,
              and monitor upcoming prize draws.
            </p>
            <button
              onClick={() => setWalletModalOpen(true)}
              className="mt-8 flex items-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90"
            >
              Connect Wallet
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Pools tab */}
        {tab === "pools" &&
          (loading ? (
            <PoolGridSkeleton />
          ) : (
            <AppPoolCards
              pools={pools}
              onDeposit={handleDeposit}
              onViewDetail={handleViewDetail}
            />
          ))}

        {/* Dashboard tab */}
        {tab === "dashboard" &&
          isConnected &&
          (loading ? (
            <DashboardSkeleton />
          ) : (
            <UserDashboard onWithdraw={handleWithdraw} />
          ))}

        {/* Draws tab */}
        {tab === "draws" &&
          (loading ? <DrawsSkeleton /> : <DrawsSection />)}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-xl py-2 lg:hidden">
        <MobileNavItem
          icon={<LayoutGrid className="h-5 w-5" />}
          label="Pools"
          active={tab === "pools"}
          onClick={() => setTab("pools")}
        />
        <MobileNavItem
          icon={<PieChart className="h-5 w-5" />}
          label="Dashboard"
          active={tab === "dashboard"}
          onClick={() => setTab("dashboard")}
        />
        <MobileNavItem
          icon={<Trophy className="h-5 w-5" />}
          label="Draws"
          active={tab === "draws"}
          onClick={() => setTab("draws")}
        />
      </nav>

      {/* Modals & Panels */}
      <ConnectWalletModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
      <DepositModal
        pool={depositPool}
        open={depositModalOpen}
        onClose={() => {
          setDepositModalOpen(false)
          setDepositPool(null)
        }}
        onSuccess={handleDepositSuccess}
      />
      <WithdrawModal
        pool={withdrawPool}
        open={withdrawModalOpen}
        onClose={() => {
          setWithdrawModalOpen(false)
          setWithdrawPool(null)
        }}
        onSuccess={handleWithdrawSuccess}
      />
      <PoolDetailPanel
        pool={detailPool}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false)
          setDetailPool(null)
        }}
        onDeposit={(p) => {
          setDetailOpen(false)
          handleDeposit(p)
        }}
        onWithdraw={(p) => {
          setDetailOpen(false)
          handleWithdraw(p)
        }}
      />
    </div>
  )
}

function MobileNavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-1 transition-colors ${
        active ? "text-accent" : "text-muted-foreground"
      }`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

export default function AppPage() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}
