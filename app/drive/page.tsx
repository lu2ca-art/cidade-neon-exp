"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const ROAD_COLOR = "#1a1a2e"
const SKY_TOP = "#0d0d1a"
const SKY_HORIZON = "#1a0a2e"
const ACCELERATION = 0.4
const MAX_SPEED = 280
const FRICTION = 0.88
const SEGMENT_LENGTH = 200

// Neon palette
const NEON = {
  pink: "#ff2d78",
  cyan: "#00f5ff",
  purple: "#9b00ff",
  yellow: "#f5c518",
  dark: "#0a0a14",
}

interface Segment {
  index: number
  curve: number
  color: string
  cars: ObstacleCar[]
}

interface ObstacleCar {
  x: number // -1 to 1 lane position
  z: number // position along road
  color: string
  width: number
  speed: number
}

// ─── ROAD GENERATOR ──────────────────────────────────────────────────────────
function generateRoad(): Segment[] {
  const segments: Segment[] = []
  const colors = [ROAD_COLOR, "#1e1e3a"]
  for (let i = 0; i < 10000; i++) {
    const curve =
      i > 300 && i < 700
        ? 2.5
        : i > 1200 && i < 1600
          ? -2.2
          : i > 2000 && i < 2400
            ? 1.8
            : 0
    segments.push({
      index: i,
      curve,
      color: colors[Math.floor(i / 2) % 2],
      cars: [],
    })
  }
  // Spawn obstacle cars scattered through road
  for (let i = 50; i < 9000; i += Math.floor(Math.random() * 80) + 40) {
    const lanePositions = [-0.6, 0, 0.6]
    const lane = lanePositions[Math.floor(Math.random() * lanePositions.length)]
    const carColors = ["#cc2200", "#0055cc", "#00aa44", "#cc8800", "#880088"]
    segments[i].cars.push({
      x: lane,
      z: i * SEGMENT_LENGTH,
      color: carColors[Math.floor(Math.random() * carColors.length)],
      width: 80,
      speed: 0,
    })
  }
  return segments
}

// ─── DRAW HELPERS ────────────────────────────────────────────────────────────
function drawPalm(ctx: CanvasRenderingContext2D, x: number, baseY: number, h: number, color: string) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, h * 0.05)
  ctx.lineCap = "round"
  const topX = x - h * 0.06
  const topY = baseY - h
  ctx.beginPath()
  ctx.moveTo(x, baseY)
  ctx.quadraticCurveTo(x - h * 0.1, baseY - h * 0.5, topX, topY)
  ctx.stroke()
  ctx.lineWidth = Math.max(1.5, h * 0.03)
  const fronds = 7
  for (let i = 0; i < fronds; i++) {
    const ang = Math.PI + (i / (fronds - 1)) * Math.PI
    const fx = topX + Math.cos(ang) * h * 0.55
    const fy = topY + Math.sin(ang) * h * 0.4 - h * 0.04
    ctx.beginPath()
    ctx.moveTo(topX, topY)
    ctx.quadraticCurveTo((topX + fx) / 2, topY - h * 0.18, fx, fy)
    ctx.stroke()
  }
  ctx.restore()
}

function drawGauge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frac: number,
  color: string,
  label: string,
) {
  ctx.fillStyle = "rgba(0,18,28,0.75)"
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 8)
  ctx.fill()
  ctx.strokeStyle = `${color}66`
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.strokeStyle = `${color}22`
  for (let i = 1; i < 7; i++) {
    const gx = x + (w / 7) * i
    ctx.beginPath()
    ctx.moveTo(gx, y + 4)
    ctx.lineTo(gx, y + h - 4)
    ctx.stroke()
  }
  for (let i = 1; i < 4; i++) {
    const gy = y + (h / 4) * i
    ctx.beginPath()
    ctx.moveTo(x + 4, gy)
    ctx.lineTo(x + w - 4, gy)
    ctx.stroke()
  }
  const cx = x + w * 0.5
  const cy = y + h * 0.92
  const ang = Math.PI * 1.18 + frac * Math.PI * 0.64
  ctx.strokeStyle = "#ff7a18"
  ctx.lineWidth = 2.5
  ctx.shadowColor = "#ff7a18"
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + Math.cos(ang) * w * 0.4, cy + Math.sin(ang) * w * 0.4)
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.fillStyle = `${color}cc`
  ctx.font = `${Math.max(8, w * 0.12)}px monospace`
  ctx.textAlign = "center"
  ctx.fillText(label, cx, y + h - 4)
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DrivePage() {
  const router = useRouter()
  const { updateCinematicStep } = useGameFunnel()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)

  // Game state
  const speedRef = useRef(0)
  const positionRef = useRef(0)
  const playerXRef = useRef(0)
  const isAcceleratingRef = useRef(false)
  const crashedRef = useRef(false)
  const crashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const segmentsRef = useRef<Segment[]>([])
  const driveStartRef = useRef(Date.now())

  // Phone state
  const [phoneMode, setPhoneMode] = useState<"invisible" | "mini" | "fullscreen">("fullscreen")
  const [isZoomingOut, setIsZoomingOut] = useState(true)
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Collision flash
  const [collisionFlash, setCollisionFlash] = useState(false)

  // Countdown to next phase
  const [countdown, setCountdown] = useState(30)
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(id); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Register cinematic step and advance circuit after 30s
  useEffect(() => {
    updateCinematicStep("spotify-auto")
    driveStartRef.current = Date.now()
    const exitTimer = setTimeout(() => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      router.push("/spotify/auto-chuva")
    }, 30000)
    return () => clearTimeout(exitTimer)
  }, [updateCinematicStep, router])

  // Initialize road
  useEffect(() => {
    segmentsRef.current = generateRoad()
  }, [])

  // Zoom out animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsZoomingOut(false)
      setPhoneMode("mini")
      // After showing mini briefly, go invisible
      setTimeout(() => setPhoneMode("invisible"), 3000)
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  // Auto-hide phone after 7 seconds
  const resetAutoHide = useCallback(() => {
    if (autoHideRef.current) clearTimeout(autoHideRef.current)
    autoHideRef.current = setTimeout(() => {
      setPhoneMode("invisible")
    }, 7000)
  }, [])

  const showPhone = useCallback(
    (mode: "mini" | "fullscreen") => {
      setPhoneMode(mode)
      resetAutoHide()
    },
    [resetAutoHide],
  )

  // Accelerator (pointer events = mouse + touch unified)
  useEffect(() => {
    const acceleratorEl = document.getElementById("accelerator")
    if (!acceleratorEl) return
    const onStart = (e: Event) => {
      e.preventDefault()
      isAcceleratingRef.current = true
    }
    const onEnd = () => {
      isAcceleratingRef.current = false
    }
    acceleratorEl.addEventListener("pointerdown", onStart)
    window.addEventListener("pointerup", onEnd)
    window.addEventListener("pointercancel", onEnd)
    return () => {
      acceleratorEl.removeEventListener("pointerdown", onStart)
      window.removeEventListener("pointerup", onEnd)
      window.removeEventListener("pointercancel", onEnd)
    }
  }, [phoneMode])

  // Steering (pointer events, with proper cleanup)
  useEffect(() => {
    const leftBtn = document.getElementById("steer-left")
    const rightBtn = document.getElementById("steer-right")
    if (!leftBtn || !rightBtn) return
    let leftId: ReturnType<typeof setInterval> | null = null
    let rightId: ReturnType<typeof setInterval> | null = null
    const onLeftStart = (e: Event) => {
      e.preventDefault()
      if (leftId) return
      leftId = setInterval(() => { playerXRef.current = Math.max(-1, playerXRef.current - 0.04) }, 16)
    }
    const onRightStart = (e: Event) => {
      e.preventDefault()
      if (rightId) return
      rightId = setInterval(() => { playerXRef.current = Math.min(1, playerXRef.current + 0.04) }, 16)
    }
    const stopLeft = () => { if (leftId) { clearInterval(leftId); leftId = null } }
    const stopRight = () => { if (rightId) { clearInterval(rightId); rightId = null } }
    leftBtn.addEventListener("pointerdown", onLeftStart)
    rightBtn.addEventListener("pointerdown", onRightStart)
    window.addEventListener("pointerup", () => { stopLeft(); stopRight() })
    window.addEventListener("pointercancel", () => { stopLeft(); stopRight() })
    return () => {
      stopLeft(); stopRight()
      leftBtn.removeEventListener("pointerdown", onLeftStart)
      rightBtn.removeEventListener("pointerdown", onRightStart)
    }
  }, [])

  // ─── RENDER LOOP ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    let lastTime = 0
    const render = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05)
      lastTime = timestamp
      const W = canvas.width
      const H = canvas.height
      const segments = segmentsRef.current
      if (segments.length === 0) {
        animFrameRef.current = requestAnimationFrame(render)
        return
      }

      // ── Physics ──
      if (!crashedRef.current) {
        if (isAcceleratingRef.current) {
          speedRef.current = Math.min(speedRef.current + ACCELERATION * dt * 60, MAX_SPEED)
        } else {
          speedRef.current *= FRICTION
          if (speedRef.current < 0.1) speedRef.current = 0
        }
        positionRef.current += speedRef.current * dt * SEGMENT_LENGTH
      }
      const totalLength = segments.length * SEGMENT_LENGTH
      positionRef.current = ((positionRef.current % totalLength) + totalLength) % totalLength

      const horizonY = H * 0.40
      const dashTop = H * 0.66
      const roadTop = horizonY
      const roadBottom = dashTop
      const roadH = roadBottom - roadTop
      const playerX = playerXRef.current
      const t = timestamp * 0.001
      const drift = -playerX * 30

      // ── Sky ──
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY)
      skyGrad.addColorStop(0, "#05030f")
      skyGrad.addColorStop(0.5, "#1a0a3e")
      skyGrad.addColorStop(1, "#3d1259")
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, horizonY)

      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.7)"
      for (let s = 0; s < 90; s++) {
        const sx = (s * 137.5) % W
        const sy = (s * 71.3) % (horizonY * 0.7)
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(s * 1.3 + t))
        const size = s % 7 === 0 ? 2 : 1
        ctx.fillRect(sx, sy, size, size)
      }
      ctx.globalAlpha = 1

      // ── Retrowave sun ──
      const sunR = Math.min(W, H) * 0.17
      const sunX = W / 2 + drift * 0.5
      const sunY = horizonY - sunR * 0.55
      const sunGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, sunR * 2.4)
      sunGlow.addColorStop(0, "rgba(255,80,160,0.45)")
      sunGlow.addColorStop(0.5, "rgba(155,0,255,0.18)")
      sunGlow.addColorStop(1, "transparent")
      ctx.fillStyle = sunGlow
      ctx.fillRect(0, 0, W, horizonY + sunR)
      ctx.save()
      ctx.beginPath()
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2)
      ctx.clip()
      const discGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR)
      discGrad.addColorStop(0, "#ffe39a")
      discGrad.addColorStop(0.45, "#ff5f9e")
      discGrad.addColorStop(1, "#c0006e")
      ctx.fillStyle = discGrad
      ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2)
      // dark stripes on lower half
      ctx.fillStyle = "#1a0a3e"
      let sby = sunY + sunR * 0.05
      let sbh = 3
      let sgap = 7
      while (sby < sunY + sunR) {
        ctx.fillRect(sunX - sunR, sby, sunR * 2, sbh)
        sby += sbh + sgap
        sbh += 1.4
        sgap += 0.6
      }
      ctx.restore()

      // ── City skyline silhouette ──
      const skyBase = horizonY + 1
      for (let i = 0; i < 26; i++) {
        const seed = Math.sin(i * 12.9898) * 43758.5453
        const r = seed - Math.floor(seed)
        const bw = W / 26
        const bx = i * bw + drift * 0.5
        const bh = horizonY * (0.1 + r * 0.4)
        ctx.fillStyle = "#1a0b30"
        ctx.fillRect(bx, skyBase - bh, bw + 1, bh)
        ctx.fillStyle = i % 2 === 0 ? `${NEON.cyan}55` : `${NEON.pink}55`
        for (let wy = skyBase - bh + 4; wy < skyBase - 2; wy += 7) {
          if (Math.sin(wy * 3.1 + i) + 1 > 1.2) ctx.fillRect(bx + 3, wy, 2, 2)
          if (Math.sin(wy * 1.7 + i) + 1 > 1.3) ctx.fillRect(bx + bw * 0.5, wy, 2, 2)
        }
      }
      // horizon neon line
      ctx.fillStyle = NEON.pink
      ctx.shadowColor = NEON.pink
      ctx.shadowBlur = 16
      ctx.fillRect(0, horizonY - 1, W, 2)
      ctx.shadowBlur = 0

      // ── Palm trees ──
      drawPalm(ctx, W * 0.1 + drift * 0.6, horizonY + 4, horizonY * 0.55, "#0d0420")
      drawPalm(ctx, W * 0.9 + drift * 0.6, horizonY + 4, horizonY * 0.6, "#0d0420")
      drawPalm(ctx, W * 0.78 + drift * 0.6, horizonY + 2, horizonY * 0.4, "#0d0420")

      // Ground base
      ctx.fillStyle = "#0a0418"
      ctx.fillRect(0, horizonY, W, dashTop - horizonY)

      // ── Scanline pseudo-3D road ──
      let curveOffset = 0
      let curveSpeed = 0
      const carHits: Array<{ x: number; carX: number; rowY: number; w: number; color: string }> = []

      for (let screenY = roadBottom - 1; screenY >= roadTop; screenY--) {
        const p = (screenY - roadTop) / roadH // 0 at horizon, 1 at bottom (near)
        const depth = 1 / (p * 0.92 + 0.08) // large near horizon, small near camera
        const z = depth * SEGMENT_LENGTH * 0.5 + positionRef.current
        const segIdx = Math.floor(z / SEGMENT_LENGTH) % segments.length
        const seg = segments[(segIdx + segments.length) % segments.length]

        // accumulate curve from near to far
        curveSpeed += seg.curve * 0.0016 * (1 - p)
        curveOffset += curveSpeed

        // Road widens toward camera
        const roadW = W * 0.96 * Math.pow(p, 0.92)
        const centerX = W / 2 + curveOffset * 8 + drift * 0.5 - playerX * roadW * 0.5

        // Alternating bands scrolling for motion
        const band = Math.floor((z * 0.02) % 2)
        const onRoadAlt = band === 0
        const roadColor = onRoadAlt ? "#241636" : "#1a0f2a"

        // Shoulder / ground
        ctx.fillStyle = onRoadAlt ? "#160a26" : "#10071c"
        ctx.fillRect(0, screenY, W, 1)
        // Road surface
        ctx.fillStyle = roadColor
        ctx.fillRect(centerX - roadW / 2, screenY, roadW, 1)
        // Wet neon reflection down the center (sun reflection)
        const reflW = roadW * 0.34
        const reflA = 0.22 * (1 - p) + 0.05
        ctx.fillStyle = `rgba(255,70,150,${reflA})`
        ctx.fillRect(centerX - reflW / 2, screenY, reflW, 1)
        // Neon edges
        const edgeW = Math.max(2, roadW * 0.025)
        ctx.fillStyle = NEON.cyan
        ctx.fillRect(centerX - roadW / 2, screenY, edgeW, 1)
        ctx.fillStyle = NEON.pink
        ctx.fillRect(centerX + roadW / 2 - edgeW, screenY, edgeW, 1)
        // Center dashes
        if (onRoadAlt) {
          ctx.fillStyle = "rgba(255,255,255,0.5)"
          ctx.fillRect(centerX - roadW * 0.012, screenY, roadW * 0.024, 1)
        }

        // Obstacle cars
        if (Math.round(screenY) % 2 === 0) {
          for (const car of seg.cars) {
            if (Math.abs((car.z % totalLength) - (z % totalLength)) < SEGMENT_LENGTH * 0.5) {
              const cw = roadW * 0.2
              const cx = centerX + car.x * roadW * 0.4
              carHits.push({ x: cx, carX: car.x, rowY: screenY, w: cw, color: car.color })
            }
          }
        }
      }

      // Draw obstacle cars (use furthest collected positions as their on-screen spot)
      const seen = new Set<string>()
      for (const hit of carHits) {
        const key = `${Math.round(hit.x)}_${Math.round(hit.rowY / 20)}`
        if (seen.has(key)) continue
        seen.add(key)
        const cw = Math.max(8, hit.w)
        const ch = cw * 0.7
        ctx.fillStyle = hit.color
        ctx.fillRect(hit.x - cw / 2, hit.rowY - ch, cw, ch)
        ctx.fillStyle = "#ff0000"
        ctx.shadowColor = "#ff0000"
        ctx.shadowBlur = cw * 0.25
        ctx.fillRect(hit.x - cw / 2, hit.rowY - ch * 0.35, cw * 0.18, ch * 0.25)
        ctx.fillRect(hit.x + cw * 0.32, hit.rowY - ch * 0.35, cw * 0.18, ch * 0.25)
        ctx.shadowBlur = 0
        // Collision: car near bottom of screen and aligned with player lane
        if (!crashedRef.current && hit.rowY > roadBottom - roadH * 0.14 && speedRef.current > 5) {
          if (Math.abs(hit.carX - playerX) < 0.4) {
            crashedRef.current = true
            setCollisionFlash(true)
            setTimeout(() => setCollisionFlash(false), 300)
            if (crashTimerRef.current) clearTimeout(crashTimerRef.current)
            crashTimerRef.current = setTimeout(() => {
              crashedRef.current = false
              speedRef.current = 0
            }, 2000)
          }
        }
      }

      // ── Cockpit dashboard ──
      const dGrad = ctx.createLinearGradient(0, dashTop, 0, H)
      dGrad.addColorStop(0, "#0c0718")
      dGrad.addColorStop(1, "#040209")
      ctx.fillStyle = dGrad
      ctx.fillRect(0, dashTop, W, H - dashTop)
      // dashboard top neon edge
      ctx.fillStyle = NEON.cyan
      ctx.shadowColor = NEON.cyan
      ctx.shadowBlur = 14
      ctx.fillRect(0, dashTop, W, 2)
      ctx.shadowBlur = 0

      // Gauge clusters
      const dashAreaH = H - dashTop
      const gaugeH = dashAreaH * 0.4
      const gaugeW = W * 0.27
      const gaugeY = dashTop + dashAreaH * 0.12
      const spdFrac = Math.min(speedRef.current / MAX_SPEED, 1)
      drawGauge(ctx, W * 0.3 - gaugeW / 2, gaugeY, gaugeW, gaugeH, spdFrac, NEON.cyan, `${Math.floor(speedRef.current * 2.5)}`)
      drawGauge(ctx, W * 0.7 - gaugeW / 2, gaugeY, gaugeW, gaugeH, 0.25 + spdFrac * 0.6, NEON.cyan, "RPM")

      // Steering wheel
      const wheelCx = W / 2
      const wheelCy = H + H * 0.1
      const wheelR = W * 0.46
      ctx.save()
      ctx.translate(wheelCx, wheelCy)
      ctx.rotate(playerX * 0.35)
      ctx.strokeStyle = "#120c1f"
      ctx.lineWidth = Math.max(10, W * 0.05)
      ctx.beginPath()
      ctx.arc(0, 0, wheelR, Math.PI * 1.12, Math.PI * 1.88)
      ctx.stroke()
      ctx.strokeStyle = NEON.pink
      ctx.lineWidth = Math.max(2, W * 0.008)
      ctx.shadowColor = NEON.pink
      ctx.shadowBlur = 16
      ctx.beginPath()
      ctx.arc(0, 0, wheelR, Math.PI * 1.12, Math.PI * 1.88)
      ctx.stroke()
      ctx.strokeStyle = `${NEON.cyan}cc`
      ctx.lineWidth = Math.max(2, W * 0.006)
      ctx.shadowColor = NEON.cyan
      ctx.shadowBlur = 8
      for (const a of [Math.PI * 1.2, Math.PI * 1.5, Math.PI * 1.8]) {
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(a) * wheelR, Math.sin(a) * wheelR)
        ctx.stroke()
      }
      ctx.shadowBlur = 0
      ctx.fillStyle = "#1a1228"
      ctx.beginPath()
      ctx.arc(0, 0, W * 0.05, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Crash overlay
      if (crashedRef.current) {
        const crashAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.1
        ctx.fillStyle = `rgba(255, 0, 0, ${crashAlpha})`
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = "#ffffff"
        ctx.font = `bold ${W * 0.05}px monospace`
        ctx.textAlign = "center"
        ctx.fillText("BATEU! RECOMPONDO...", W / 2, H / 2)
      }

      // Speed indicator
      const spd = Math.floor(speedRef.current * 2.5)
      ctx.fillStyle = `${NEON.cyan}cc`
      ctx.font = `bold ${W * 0.04}px monospace`
      ctx.textAlign = "left"
      ctx.shadowColor = NEON.cyan
      ctx.shadowBlur = 8
      ctx.fillText(`${spd} km/h`, W * 0.03, H * 0.06)
      ctx.shadowBlur = 0
      animFrameRef.current = requestAnimationFrame(render)
    }
    animFrameRef.current = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [])

  // ─── PHONE STYLES ─────────────────────────────────────────────────────────
  const getPhoneStyle = (): React.CSSProperties => {
    if (isZoomingOut) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) scale(1)",
        width: "min(380px, 88vw)",
        height: "min(780px, 92vh)",
        transition: "all 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 50,
      }
    }
    if (phoneMode === "fullscreen") {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) scale(1)",
        width: "min(380px, 88vw)",
        height: "min(780px, 92vh)",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 50,
      }
    }
    if (phoneMode === "mini") {
      return {
        position: "fixed",
        bottom: "120px",
        right: "16px",
        transform: "scale(1)",
        width: "100px",
        height: "175px",
        transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 50,
        cursor: "pointer",
        borderRadius: "12px",
        overflow: "hidden",
      }
    }
    // invisible
    return {
      position: "fixed",
      bottom: "120px",
      right: "16px",
      transform: "scale(0)",
      width: "100px",
      height: "175px",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      zIndex: 50,
      pointerEvents: "none",
      opacity: 0,
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* ── CANVAS ── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ imageRendering: "pixelated" }} />
      {/* ── COLLISION FLASH ── */}
      {collisionFlash && <div className="absolute inset-0 bg-red-500 opacity-40 pointer-events-none z-40" />}
      {/* ── CONTROLS ── */}
      {phoneMode !== "fullscreen" && !isZoomingOut && (
        <>
          {/* Steering */}
          <div className="absolute bottom-8 left-4 flex gap-3 z-30">
            <button
              id="steer-left"
              type="button"
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl select-none active:scale-95"
              style={{
                background: "rgba(0,245,255,0.15)",
                border: `2px solid ${NEON.cyan}88`,
                color: NEON.cyan,
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label="Virar para esquerda"
            >
              {"◀"}
            </button>
            <button
              id="steer-right"
              type="button"
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl select-none active:scale-95"
              style={{
                background: "rgba(0,245,255,0.15)",
                border: `2px solid ${NEON.cyan}88`,
                color: NEON.cyan,
                WebkitTapHighlightColor: "transparent",
              }}
              aria-label="Virar para direita"
            >
              {"▶"}
            </button>
          </div>
          {/* Accelerator */}
          <button
            id="accelerator"
            type="button"
            className="absolute bottom-8 right-4 w-24 h-24 rounded-full flex items-center justify-center select-none active:scale-95 z-30"
            style={{
              background: `radial-gradient(circle, ${NEON.pink}33, ${NEON.pink}11)`,
              border: `3px solid ${NEON.pink}`,
              color: NEON.pink,
              fontSize: "32px",
              boxShadow: `0 0 20px ${NEON.pink}66`,
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="Acelerar"
          >
            {"▲"}
          </button>
          {/* Show phone button */}
          <button
            type="button"
            onClick={() => showPhone("mini")}
            className="absolute bottom-8 z-30 select-none"
            style={{
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255,45,120,0.15)",
              border: `1px solid ${NEON.pink}44`,
              borderRadius: "20px",
              padding: "6px 16px",
              color: `${NEON.pink}aa`,
              fontSize: "11px",
              letterSpacing: "2px",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            CELULAR
          </button>
        </>
      )}
      {/* ── HUD: countdown + skip ── */}
      <div
        className="absolute top-4 right-4 z-40 flex items-center gap-2"
        style={{ pointerEvents: "auto" }}
      >
        <div
          className="font-mono text-xs px-2 py-1 rounded-lg"
          style={{
            background: "rgba(0,0,0,0.5)",
            border: `1px solid ${NEON.cyan}44`,
            color: `${NEON.cyan}bb`,
            letterSpacing: "2px",
          }}
        >
          {countdown > 0 ? `${countdown}s` : "—"}
        </div>
        <button
          type="button"
          onClick={() => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
            router.push("/spotify/auto-chuva")
          }}
          className="font-mono text-xs px-3 py-1 rounded-lg active:scale-95 transition-transform"
          style={{
            background: `${NEON.pink}22`,
            border: `1px solid ${NEON.pink}55`,
            color: NEON.pink,
            letterSpacing: "2px",
          }}
        >
          PULAR
        </button>
      </div>

      {/* ── PHONE OVERLAY ── */}
      <div
        ref={phoneRef}
        style={getPhoneStyle()}
        onClick={() => {
          if (phoneMode === "mini") showPhone("fullscreen")
        }}
      >
        <div
          className="w-full h-full relative flex flex-col"
          style={{
            background: "linear-gradient(180deg, #0d0d1a 0%, #0a0a14 100%)",
            borderRadius: phoneMode === "mini" ? "12px" : "36px",
            border: `2px solid ${NEON.pink}66`,
            boxShadow:
              phoneMode !== "invisible"
                ? `0 0 30px ${NEON.pink}44, 0 0 60px ${NEON.purple}22, inset 0 0 20px rgba(0,0,0,0.5)`
                : "none",
            overflow: "hidden",
          }}
        >
          {phoneMode === "fullscreen" && !isZoomingOut && (
            <>
              {/* Status bar */}
              <div
                className="flex justify-between items-center px-5 pt-3 pb-1"
                style={{ fontSize: "11px", color: `${NEON.cyan}bb`, letterSpacing: "1px" }}
              >
                <span>CIDADE NEON</span>
                <span>{"██▓▒░"}</span>
              </div>
              {/* Lock / minimize button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setPhoneMode("invisible")
                }}
                className="absolute top-3 right-4 z-10 select-none"
                style={{
                  background: `${NEON.pink}22`,
                  border: `1px solid ${NEON.pink}44`,
                  borderRadius: "8px",
                  padding: "4px 10px",
                  color: NEON.pink,
                  fontSize: "10px",
                  letterSpacing: "1px",
                }}
              >
                DIRIGIR
              </button>
              {/* Main content area */}
              <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
                {/* Now playing */}
                <div
                  className="w-full rounded-2xl p-4"
                  style={{ background: "rgba(255,45,120,0.08)", border: `1px solid ${NEON.pink}33` }}
                >
                  <div style={{ fontSize: "9px", color: `${NEON.cyan}88`, letterSpacing: "3px", marginBottom: "8px" }}>
                    UNTITLED — CIDADE NEON
                  </div>
                  <div style={{ fontSize: "16px", color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}>
                    CHUVA
                  </div>
                  <div style={{ fontSize: "11px", color: `${NEON.pink}aa` }}>LU2CA</div>
                  {/* Progress bar */}
                  <div className="w-full h-1 rounded-full mt-3" style={{ background: `${NEON.pink}22` }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: "35%",
                        background: `linear-gradient(90deg, ${NEON.pink}, ${NEON.purple})`,
                        boxShadow: `0 0 8px ${NEON.pink}`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1" style={{ fontSize: "9px", color: `${NEON.pink}66` }}>
                    <span>0:08</span>
                    <span>0:22</span>
                  </div>
                </div>
                {/* Untitled playlist */}
                <div className="w-full">
                  <div style={{ fontSize: "9px", color: `${NEON.cyan}88`, letterSpacing: "3px", marginBottom: "10px" }}>
                    DESCOBERTAS
                  </div>
                  {[
                    { name: "CHUVA", locked: false },
                    { name: "DOPAMINA", locked: false },
                    { name: "COPO AMERICANO", locked: false },
                    { name: "SEXTA FEIRA", locked: true },
                    { name: "???", locked: true },
                  ].map((track, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2"
                      style={{ borderBottom: `1px solid ${NEON.pink}11`, opacity: track.locked ? 0.35 : 1 }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                        style={{
                          background: track.locked ? "rgba(255,255,255,0.05)" : `${NEON.pink}22`,
                          border: `1px solid ${track.locked ? "rgba(255,255,255,0.1)" : NEON.pink + "44"}`,
                          color: track.locked ? "#444" : NEON.pink,
                        }}
                      >
                        {track.locked ? "" : "▶"}
                      </div>
                      <div>
                        <div style={{ fontSize: "12px", color: track.locked ? "#444" : "#fff" }}>{track.name}</div>
                        <div style={{ fontSize: "9px", color: `${NEON.cyan}55` }}>
                          {track.locked ? "bloqueada" : "0:22 · LU2CA"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Notification area */}
                <div
                  className="w-full rounded-xl p-3"
                  style={{ background: "rgba(155,0,255,0.08)", border: `1px solid ${NEON.purple}33` }}
                >
                  <div style={{ fontSize: "9px", color: `${NEON.purple}aa`, letterSpacing: "2px", marginBottom: "6px" }}>
                    MISSÕES
                  </div>
                  <div style={{ fontSize: "11px", color: "#ccc", lineHeight: "1.4" }}>
                    Nizzy tá no bar do Xênon. Já marquei no mapa pra você.{" "}
                    <span style={{ color: NEON.pink }}>Pode meter marcha →</span>
                  </div>
                </div>
              </div>
              {/* Home indicator */}
              <div className="flex justify-center pb-3 pt-2">
                <div className="rounded-full" style={{ width: "120px", height: "4px", background: `${NEON.pink}44` }} />
              </div>
            </>
          )}
          {/* MINI MODE — just show track name */}
          {phoneMode === "mini" && (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-1 p-2"
              style={{ fontSize: "8px", color: NEON.pink, textAlign: "center" }}
            >
              <div style={{ fontSize: "16px" }}>{"♪"}</div>
              <div style={{ letterSpacing: "1px", fontWeight: "bold" }}>CHUVA</div>
              <div style={{ color: `${NEON.cyan}88`, fontSize: "7px" }}>LU2CA</div>
            </div>
          )}
        </div>
      </div>
      {/* ── SCAN LINE EFFECT ── */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        }}
      />
    </div>
  )
}
