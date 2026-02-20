"use client"

import { useWallet, truncateAddress } from "@/context/wallet-context"
import { Wallet, ChevronDown, LogOut, Copy, CheckCircle2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import Link from "next/link"

type Tab = "pools" | "dashboard" | "draws"

interface Props {
  onConnectWallet: () => void
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { key: Tab; label: string }[] = [
  { key: "pools", label: "Pools" },
  { key: "dashboard", label: "Dashboard" },
  { key: "draws", label: "Draws" },
]

export function AppNavbar({ onConnectWallet, activeTab, onTabChange }: Props) {
  const { isConnected, address, balance, disconnect } = useWallet()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function copyAddress() {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors" />
            <svg
              viewBox="0 0 32 32"
              className="relative h-8 w-8"
              fill="none"
            >
              <path
                d="M16 4L28 10V22L16 28L4 22V10L16 4Z"
                className="stroke-accent"
                strokeWidth="1.5"
                fill="none"
              />
              <circle cx="16" cy="16" r="4" className="fill-accent" />
            </svg>
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            LuckyStake
          </span>
        </Link>

        {/* Tab navigation */}
        <div className="hidden items-center gap-1 rounded-lg bg-secondary/50 p-1 md:flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {isConnected && address ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-4 py-2 text-sm transition-all hover:bg-secondary/60"
              >
                <div className="h-2 w-2 rounded-full bg-accent" />
                <span className="font-mono text-foreground">
                  {truncateAddress(address)}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card p-3 shadow-xl animate-slide-up">
                  <div className="mb-3 px-2">
                    <p className="text-xs text-muted-foreground">
                      Connected Wallet
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-mono text-xs text-foreground truncate">
                        {address}
                      </p>
                      <button
                        onClick={copyAddress}
                        className="shrink-0"
                        aria-label="Copy address"
                      >
                        {copied ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="mb-3 rounded-lg bg-secondary/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-display text-sm font-bold text-foreground">
                      {balance} USDC
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      disconnect()
                      setDropdownOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}
