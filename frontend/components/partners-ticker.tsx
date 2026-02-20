"use client"

const partners = [
  "Stellar Development Foundation",
  "Soroban",
  "Blend Protocol",
  "Soroswap",
  "Circle",
  "MoneyGram",
  "Wyre",
  "Coinbase",
]

export function PartnersTicker() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-secondary/20 py-6">
      <div className="flex animate-ticker">
        {[...partners, ...partners].map((partner, i) => (
          <div
            key={`${partner}-${i}`}
            className="flex shrink-0 items-center gap-3 px-8"
          >
            <div className="h-2 w-2 rounded-full bg-accent/40" />
            <span className="whitespace-nowrap text-sm font-medium text-muted-foreground">
              {partner}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
