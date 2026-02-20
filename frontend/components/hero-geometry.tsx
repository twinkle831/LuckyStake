"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  pulse: number
  pulseSpeed: number
}

export function HeroGeometry() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrame: number
    let particles: Particle[] = []

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }

    const initParticles = () => {
      const count = 60
      particles = []
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.1,
          pulse: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.005,
        })
      }
    }

    const drawGrid = (time: number) => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const spacing = 60
      const offset = (time * 0.01) % spacing

      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)"
      ctx.lineWidth = 0.5

      for (let x = -spacing + offset; x < w + spacing; x += spacing) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }

      for (let y = -spacing + offset; y < h + spacing; y += spacing) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
    }

    const drawParticles = (time: number) => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const connectionDistance = 150

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.pulse += p.pulseSpeed

        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1

        const pulsedOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse))

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(52, 211, 153, ${pulsedOpacity})`
        ctx.fill()
      })

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.08
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
    }

    const drawIsometricShapes = (time: number) => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const cx = w * 0.65
      const cy = h * 0.45

      // Draw rotating diamond
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(time * 0.0003)

      const diamondSize = 80
      ctx.beginPath()
      ctx.moveTo(0, -diamondSize)
      ctx.lineTo(diamondSize * 0.7, 0)
      ctx.lineTo(0, diamondSize)
      ctx.lineTo(-diamondSize * 0.7, 0)
      ctx.closePath()
      ctx.strokeStyle = "rgba(52, 211, 153, 0.3)"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Inner glow
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, diamondSize * 0.5)
      gradient.addColorStop(0, "rgba(52, 211, 153, 0.15)")
      gradient.addColorStop(1, "rgba(52, 211, 153, 0)")
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.restore()

      // Draw orbiting spheres
      const orbitRadius = 160
      const sphereCount = 6
      for (let i = 0; i < sphereCount; i++) {
        const angle = (Math.PI * 2 * i) / sphereCount + time * 0.0005
        const sx = cx + Math.cos(angle) * orbitRadius
        const sy = cy + Math.sin(angle) * orbitRadius * 0.5
        const floatOffset = Math.sin(time * 0.001 + i) * 10

        // Platform
        ctx.beginPath()
        ctx.ellipse(sx, sy + 20 + floatOffset, 18, 8, 0, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)"
        ctx.fill()
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)"
        ctx.lineWidth = 0.5
        ctx.stroke()

        // Sphere
        const sphereGrad = ctx.createRadialGradient(
          sx - 3,
          sy - 3 + floatOffset,
          0,
          sx,
          sy + floatOffset,
          14
        )
        sphereGrad.addColorStop(0, "rgba(255, 255, 255, 0.25)")
        sphereGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.08)")
        sphereGrad.addColorStop(1, "rgba(255, 255, 255, 0.02)")

        ctx.beginPath()
        ctx.arc(sx, sy + floatOffset, 14, 0, Math.PI * 2)
        ctx.fillStyle = sphereGrad
        ctx.fill()
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)"
        ctx.lineWidth = 0.5
        ctx.stroke()

        // Connection line to center
        ctx.beginPath()
        ctx.moveTo(sx, sy + floatOffset)
        ctx.lineTo(cx, cy)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)"
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Outer ring
      ctx.beginPath()
      ctx.ellipse(cx, cy, orbitRadius, orbitRadius * 0.5, 0, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(52, 211, 153, 0.06)"
      ctx.lineWidth = 1
      ctx.setLineDash([4, 8])
      ctx.stroke()
      ctx.setLineDash([])

      // Second orbit ring
      ctx.beginPath()
      ctx.ellipse(cx, cy, orbitRadius * 0.6, orbitRadius * 0.3, 0, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(52, 211, 153, 0.04)"
      ctx.lineWidth = 0.5
      ctx.setLineDash([2, 6])
      ctx.stroke()
      ctx.setLineDash([])
    }

    const animate = (time: number) => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      drawGrid(time)
      drawParticles(time)
      drawIsometricShapes(time)

      animationFrame = requestAnimationFrame(animate)
    }

    resize()
    initParticles()
    animate(0)

    window.addEventListener("resize", () => {
      resize()
      initParticles()
    })

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  )
}
