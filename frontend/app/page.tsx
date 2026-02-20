"use client"

import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { PartnersTicker } from "@/components/partners-ticker"
import { HowItWorks } from "@/components/how-it-works"
import { PrizePools } from "@/components/prize-pools"
import { StatsSection } from "@/components/stats-section"
import { AIAgentSection } from "@/components/ai-agent-section"
import { RecentWinners } from "@/components/recent-winners"
import { SecuritySection } from "@/components/security-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <PartnersTicker />
      <HowItWorks />
      <PrizePools />
      <StatsSection />
      <AIAgentSection />
      <RecentWinners />
      <SecuritySection />
      <CTASection />
      <Footer />
    </main>
  )
}
