"use client"

import { useInView } from "@/hooks/use-in-view"
import { useCounter } from "@/hooks/use-counter"

function StatItem({
  value,
  suffix,
  prefix,
  label,
  isInView,
  delay,
}: {
  value: number
  suffix?: string
  prefix?: string
  label: string
  isInView: boolean
  delay: number
}) {
  const count = useCounter(value, 2500, 0, isInView)

  return (
    <div
      className={`relative p-8 text-center transition-all duration-700 ${
        isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="font-display text-4xl font-bold text-foreground lg:text-5xl">
        {prefix}
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function StatsSection() {
  const { ref, isInView } = useInView()

  return (
    <section id="stats" className="relative bg-background py-24 lg:py-32" ref={ref}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-card/30 backdrop-blur-sm">
          <div className="grid divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
            <StatItem
              value={4200000}
              prefix="$"
              label="Total Value Locked"
              isInView={isInView}
              delay={200}
            />
            <StatItem
              value={12847}
              label="Unique Depositors"
              isInView={isInView}
              delay={350}
            />
            <StatItem
              value={892}
              prefix="$"
              suffix="K"
              label="Total Prizes Awarded"
              isInView={isInView}
              delay={500}
            />
            <StatItem
              value={342}
              label="Draws Completed"
              isInView={isInView}
              delay={650}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
