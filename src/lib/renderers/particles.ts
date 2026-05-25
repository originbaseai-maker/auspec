import type { ParticleConfig } from '@/store/useParticleStore'
import type { FrequencyData } from '@/types/analyzer'
import { colorFromPalette } from '@/lib/colorPalette'

interface Particle {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  size: number
  ageMs: number
  lifespanMs: number
  /** 0–1, used to look up a color from the active palette. */
  colorProgress: number
}

const MAX_PARTICLES = 500
/** How long to wait after a burst before another beat can trigger one. */
const BEAT_COOLDOWN_MS = 200
/** Bass-energy threshold (0–1) above which a beat burst is triggered. */
const BEAT_THRESHOLD = 0.6

class ParticleSystem {
  private particles: Particle[] = []
  private lastTimestamp = 0
  private beatCooldown = 0

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        ageMs: 0,
        lifespanMs: 0,
        colorProgress: 0,
      })
    }
  }

  reset(): void {
    for (const p of this.particles) p.active = false
    this.beatCooldown = 0
    this.lastTimestamp = 0
  }

  spawn(
    config: ParticleConfig,
    width: number,
    height: number,
    count: number,
  ): void {
    let spawned = 0
    for (const p of this.particles) {
      if (spawned >= count) break
      if (p.active) continue
      this.initParticle(p, config, width, height)
      spawned++
    }
  }

  private initParticle(
    p: Particle,
    config: ParticleConfig,
    width: number,
    height: number,
  ): void {
    p.active = true

    switch (config.motion) {
      case 'rise':
        p.x = Math.random() * width
        p.y = height + 10
        break
      case 'fall':
        p.x = Math.random() * width
        p.y = -10
        break
      case 'explode':
        p.x = width / 2
        p.y = height / 2
        break
      case 'orbit': {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.min(width, height) * 0.3
        p.x = width / 2 + Math.cos(angle) * radius
        p.y = height / 2 + Math.sin(angle) * radius
        break
      }
      case 'float':
      default:
        p.x = Math.random() * width
        p.y = Math.random() * height
    }

    const spreadFactor = config.spread / 100
    const baseSpeed = config.speed * 0.5

    switch (config.motion) {
      case 'rise':
        p.vx = (Math.random() - 0.5) * spreadFactor * baseSpeed
        p.vy = -baseSpeed - Math.random() * baseSpeed
        break
      case 'fall':
        p.vx = (Math.random() - 0.5) * spreadFactor * baseSpeed
        p.vy = baseSpeed + Math.random() * baseSpeed
        break
      case 'explode': {
        const a = Math.random() * Math.PI * 2
        const v = baseSpeed * (1 + Math.random() * spreadFactor)
        p.vx = Math.cos(a) * v * 3
        p.vy = Math.sin(a) * v * 3
        break
      }
      case 'orbit': {
        // Tangential velocity perpendicular to the radial vector.
        const dx = p.x - width / 2
        const dy = p.y - height / 2
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        p.vx = (-dy / len) * baseSpeed * 2
        p.vy = (dx / len) * baseSpeed * 2
        break
      }
      case 'float':
      default:
        p.vx = (Math.random() - 0.5) * spreadFactor * baseSpeed
        p.vy = (Math.random() - 0.5) * spreadFactor * baseSpeed
    }

    // ±30% size variance so a uniform "size: 3" doesn't look mechanical.
    p.size = config.size * (0.7 + Math.random() * 0.6)
    p.ageMs = 0
    p.lifespanMs = config.lifespan * 1000 * (0.7 + Math.random() * 0.6)
    p.colorProgress = Math.random()
  }

  update(
    config: ParticleConfig,
    width: number,
    height: number,
    deltaMs: number,
    bassEnergy: number,
  ): void {
    if (!config.enabled) {
      this.reset()
      return
    }

    let activeCount = 0
    for (const p of this.particles) if (p.active) activeCount++

    // Trickle-spawn up to 5/frame to maintain target density without
    // burst-spawning when settings change.
    const targetDensity = config.density
    if (activeCount < targetDensity) {
      this.spawn(
        config,
        width,
        height,
        Math.min(5, targetDensity - activeCount),
      )
    }

    this.beatCooldown -= deltaMs
    if (
      config.beatReactive &&
      bassEnergy > BEAT_THRESHOLD &&
      this.beatCooldown <= 0
    ) {
      this.spawn(config, width, height, config.beatBurstAmount)
      this.beatCooldown = BEAT_COOLDOWN_MS
    }

    // Convert deltaMs into per-frame-equivalent friction so friction
    // value behaves the same at 30 / 60 / 120 FPS.
    const frameFriction = Math.pow(config.friction, deltaMs / 16.67)
    const isWrappingMotion =
      config.motion === 'float' || config.motion === 'orbit'

    for (const p of this.particles) {
      if (!p.active) continue

      p.ageMs += deltaMs
      if (p.ageMs >= p.lifespanMs) {
        p.active = false
        continue
      }

      p.vy += config.gravity * deltaMs * 0.0005
      p.vx *= frameFriction
      p.vy *= frameFriction
      p.x += p.vx * deltaMs * 0.06
      p.y += p.vy * deltaMs * 0.06

      if (!isWrappingMotion) {
        if (p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) {
          p.active = false
        }
      } else {
        if (p.x < 0) p.x += width
        if (p.x > width) p.x -= width
        if (p.y < 0) p.y += height
        if (p.y > height) p.y -= height
      }
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    config: ParticleConfig,
    visualizerPalette: string[] | undefined,
    bassEnergy: number,
  ): void {
    if (!config.enabled) return

    const palette =
      config.useVisualizerPalette &&
      visualizerPalette &&
      visualizerPalette.length >= 1
        ? visualizerPalette
        : config.palette

    if (palette.length === 0) return

    const sizeMultiplier = config.beatReactive
      ? 1 + bassEnergy * (config.beatSizeMultiplier - 1)
      : 1

    ctx.save()

    for (const p of this.particles) {
      if (!p.active) continue

      const lifeRatio = p.ageMs / p.lifespanMs
      const alpha = config.fadeOut ? 1 - lifeRatio : 1
      const color =
        palette.length >= 2
          ? colorFromPalette(
              palette,
              palette[0],
              palette[palette.length - 1],
              p.colorProgress,
            )
          : palette[0]
      const finalSize = p.size * sizeMultiplier

      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.strokeStyle = color

      if (config.glowEnabled && config.glowIntensity > 0) {
        ctx.shadowColor = color
        ctx.shadowBlur = config.glowIntensity * 0.3
      } else {
        ctx.shadowBlur = 0
      }

      this.drawShape(ctx, p.x, p.y, finalSize, config.shape)
    }

    ctx.restore()
  }

  private drawShape(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    shape: ParticleConfig['shape'],
  ): void {
    switch (shape) {
      case 'circle':
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'square':
        ctx.fillRect(x - size, y - size, size * 2, size * 2)
        break
      case 'star':
        this.drawStar(ctx, x, y, size, 5)
        ctx.fill()
        break
      case 'spark':
        ctx.lineWidth = Math.max(1, size * 0.5)
        ctx.beginPath()
        ctx.moveTo(x - size, y)
        ctx.lineTo(x + size, y)
        ctx.moveTo(x, y - size)
        ctx.lineTo(x, y + size)
        ctx.stroke()
        break
      case 'ring':
        ctx.lineWidth = Math.max(1, size * 0.3)
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.stroke()
        break
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    outerR: number,
    points: number,
  ): void {
    const innerR = outerR * 0.4
    ctx.beginPath()
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  }

  step(timestamp: number): number {
    // Bound delta so a tab-switch or hiccup can't teleport every particle
    // off-screen on the next frame.
    const prev = this.lastTimestamp || timestamp
    const deltaMs = Math.min(100, timestamp - prev)
    this.lastTimestamp = timestamp
    return deltaMs
  }
}

/**
 * One ParticleSystem per layer ID. Each system owns its 500-particle
 * pool and lastTimestamp, so simulations don't bleed across layers when
 * the user has multiple particle layers running at once. Cleanup on
 * layer remove is handled by useLayerStore.removeLayer calling
 * `cleanupParticleSystem(id)` below.
 */
const particleSystems = new Map<string, ParticleSystem>()

export function drawParticlesForLayer(
  ctx: CanvasRenderingContext2D,
  layerId: string,
  config: ParticleConfig,
  width: number,
  height: number,
  visualizerPalette: string[] | undefined,
  frequencyData: FrequencyData | null,
  timestamp: number,
): void {
  let system = particleSystems.get(layerId)
  if (!system) {
    system = new ParticleSystem()
    particleSystems.set(layerId, system)
  }
  const deltaMs = system.step(timestamp)
  const bassEnergy = frequencyData ? frequencyData.bass / 255 : 0
  system.update(config, width, height, deltaMs, bassEnergy)
  system.draw(ctx, config, visualizerPalette, bassEnergy)
}

/** Drop the particle system for a removed layer (frees the pool). */
export function cleanupParticleSystem(layerId: string): void {
  particleSystems.delete(layerId)
}

/** Reset all particle systems — used on full layer-stack replace (preset apply). */
export function resetAllParticles(): void {
  for (const sys of particleSystems.values()) sys.reset()
}
