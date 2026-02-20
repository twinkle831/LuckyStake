"use client"

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"
import Link from "next/link"

const navLinks = [
  { label: "Pools", href: "#pools" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "AI Agent", href: "#ai-agent" },
  { label: "Stats", href: "#stats" },
  { label: "Winners", href: "/winners" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors" />
            <svg viewBox="0 0 32 32" className="relative h-8 w-8" fill="none">
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
        </a>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/app"
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-all hover:bg-secondary"
          >
            Connect Wallet
          </Link>
          <Link
            href="/in-progress"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-all hover:opacity-90"
          >
            Launch App
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border animate-slide-up">
          <div className="flex flex-col gap-4 px-6 py-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/in-progress"
              className="mt-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground text-center"
            >
              Launch App
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
