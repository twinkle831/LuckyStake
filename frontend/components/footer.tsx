"use client"

import { Github, Twitter } from "lucide-react"

const links = {
  Protocol: ["Pools", "AI Agent", "Docs", "Governance"],
  Resources: ["Whitepaper", "Audits", "FAQ", "Blog"],
  Community: ["Discord", "Twitter", "Telegram", "Forum"],
  Legal: ["Terms", "Privacy", "Disclaimer"],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2">
              <div className="relative h-8 w-8">
                <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none">
                  <path
                    d="M16 4L28 10V22L16 28L4 22V10L16 4Z"
                    className="stroke-accent"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <circle cx="16" cy="16" r="4" className="fill-accent" />
                </svg>
              </div>
              <span className="font-display text-xl font-bold text-foreground">LuckyStake</span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The decentralized no-loss lottery on Stellar. Deposit, earn yield,
              win prizes - your principal is always safe.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground">{category}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 LuckyStake Protocol. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built on Stellar &middot; Powered by Soroban
          </p>
        </div>
      </div>
    </footer>
  )
}
