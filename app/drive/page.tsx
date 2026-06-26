"use client"
import { useEffect, useRef, useState, useCallback } from "react"

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

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DrivePage() {
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

  // Phone state
  const [phoneMode, setPhoneMode] = useState<"invisible" | "mini" | "fullscreen">("fullscreen")
  const [isZoomingOut, setIsZoomingOut] = useState(true)
  const autoHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Collision flash
  const [collisionFlash, setCollisionFlash] = useState(false)

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

      const horizonY = H * 0.42
      const playerX = playerXRef.current

      // ── Sky ──
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY)
      skyGrad.addColorStop(0, SKY_TOP)
      skyGrad.addColorStop(1, SKY_HORIZON)
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, horizonY)
      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.6)"
      for (let s = 0; s < 80; s++) {
        const sx = (s * 137.5) % W
        const sy = (s * 73.1) % horizonY
        ctx.fillRect(sx, sy, 1, 1)
      }
      // Neon horizon glow
      const horizonGrad = ctx.createLinearGradient(0, horizonY - 40, 0, horizonY + 20)
      horizonGrad.addColorStop(0, "transparent")
      horizonGrad.addColorStop(0.6, `${NEON.purple}66`)
      horizonGrad.addColorStop(1, `${NEON.pink}33`)
      ctx.fillStyle = horizonGrad
      ctx.fillRect(0, horizonY - 40, W, 60)
      // Ground base
      ctx.fillStyle = "#0a0612"
      ctx.fillRect(0, horizonY, W, H - horizonY)

      // ── Scanline pseudo-3D road ──
      // Determine current curve from segment under camera
      const baseSeg = Math.floor(positionRef.current / SEGMENT_LENGTH) % segments.length
      const roadHeight = H - horizonY
      // Curve accumulation for current view
      let curveOffset = 0
      let curveSpeed = 0
      const carHits: Array<{ x: number; carX: number; rowY: number; w: number; color: string }> = []

      for (let y = 0; y < roadHeight; y++) {
        const screenY = H - 1 - y
        // perspective: rows near bottom (y small) are close, near horizon (y large) are far
        const perspective = (y + 1) / roadHeight // 0 at horizon-ish? invert
        // Map screen row to road depth using 1/z perspective
        const p = (roadHeight - y) / roadHeight // 1 at horizon, ~0 at bottom
        const depth = 1 / (1 - p * 0.92) // grows toward horizon
        const z = depth * SEGMENT_LENGTH * 0.5 + positionRef.current
        const segIdx = Math.floor(z / SEGMENT_LENGTH) % segments.length
        const seg = segments[(segIdx + segments.length) % segments.length]

        // accumulate curve (more effect far away)
        curveSpeed += (seg.curve * 0.0015) * (1 - p)
        curveOffset += curveSpeed

        // Road width shrinks toward horizon
        const roadW = (W * 0.92) * (1 - p * 0.82)
        const centerX = W / 2 + curveOffset * 8 - playerX * roadW * 0.55

        // Alternating colors by depth band for motion feel
        const band = Math.floor((z * 0.02) % 2)
        const onRoadAlt = band === 0
        const roadColor = onRoadAlt ? "#26263f" : "#1c1c30"
        const grassColor = onRoadAlt ? "#140a22" : "#0d0616"

        // Grass
        ctx.fillStyle = grassColor
        ctx.fillRect(0, screenY, W, 1)
        // Road
        ctx.fillStyle = roadColor
        ctx.fillRect(centerX - roadW / 2, screenY, roadW, 1)
        // Edges (neon)
        const edgeW = Math.max(2, roadW * 0.02)
        ctx.fillStyle = onRoadAlt ? NEON.cyan : NEON.pink
        ctx.fillRect(centerX - roadW / 2, screenY, edgeW, 1)
        ctx.fillRect(centerX + roadW / 2 - edgeW, screenY, edgeW, 1)
        // Center dashes
        if (onRoadAlt) {
          ctx.fillStyle = `${NEON.pink}cc`
          ctx.fillRect(centerX - roadW * 0.01, screenY, roadW * 0.02, 1)
        }

        // Obstacle cars: draw when a car's segment matches this row's depth band
        if (y % 2 === 0) {
          for (const car of seg.cars) {
            if (Math.abs((car.z % totalLength) - (z % totalLength)) < SEGMENT_LENGTH * 0.5) {
              const cw = roadW * 0.22
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
        if (!crashedRef.current && hit.rowY > H * 0.78 && speedRef.current > 5) {
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

      // ── Player car (bottom center) ──
      const pcW = W * 0.22
      const pcH = pcW * 0.45
      const pcX = W / 2 + playerX * (W * 0.18) - pcW / 2
      const pcY = H - pcH - H * 0.04
      ctx.fillStyle = "rgba(0,0,0,0.4)"
      ctx.beginPath()
      ctx.ellipse(pcX + pcW / 2, H - H * 0.04, pcW * 0.45, pcH * 0.15, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#e8e8f0"
      ctx.fillRect(pcX, pcY, pcW, pcH)
      ctx.fillStyle = "#c0c0d0"
      ctx.fillRect(pcX + pcW * 0.2, pcY - pcH * 0.45, pcW * 0.6, pcH * 0.5)
      ctx.fillStyle = `${NEON.cyan}55`
      ctx.fillRect(pcX + pcW * 0.22, pcY - pcH * 0.38, pcW * 0.56, pcH * 0.38)
      ctx.fillStyle = "#ffffff"
      ctx.shadowColor = "#ffffff"
      ctx.shadowBlur = 20
      ctx.fillRect(pcX + pcW * 0.08, pcY + pcH * 0.1, pcW * 0.12, pcH * 0.15)
      ctx.fillRect(pcX + pcW * 0.8, pcY + pcH * 0.1, pcW * 0.12, pcH * 0.15)
      ctx.shadowBlur = 0
      ctx.fillStyle = `${NEON.pink}33`
      ctx.shadowColor = NEON.pink
      ctx.shadowBlur = 25
      ctx.fillRect(pcX, pcY + pcH * 0.85, pcW, pcH * 0.15)
      ctx.shadowBlur = 0

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
