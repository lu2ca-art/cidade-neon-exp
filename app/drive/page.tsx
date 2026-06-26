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
const VISIBLE_SEGMENTS = 300
const FIELD_OF_VIEW = 100
const CAMERA_HEIGHT = 1500
const CAMERA_DEPTH = 1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180)

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

// ─── PROJECT POINT ────────────────────────────────────────────────────────────
function project(
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  worldX: number,
  worldY: number,
  worldZ: number,
  width: number,
  height: number,
) {
  const transX = worldX - cameraX
  const transY = worldY - cameraY
  const transZ = worldZ - cameraZ
  const cameraScale = CAMERA_DEPTH / transZ
  const screenX = Math.round((1 + cameraScale * transX) * (width / 2))
  const screenY = Math.round((1 - cameraScale * transY) * (height / 2))
  const screenW = Math.round(cameraScale * width * 0.55)
  return { screenX, screenY, screenW, scale: cameraScale }
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function DrivePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const animFrameRef = useRef<number>(0)

  // Game state
  const speedRef = useRef(0)
  const positionRef = useRef(0)
  const xRef = useRef(0)
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

  // Touch/mouse controls
  useEffect(() => {
    const onStart = () => {
      if (phoneMode === "fullscreen") return
      isAcceleratingRef.current = true
    }
    const onEnd = () => {
      isAcceleratingRef.current = false
    }
    const acceleratorEl = document.getElementById("accelerator")
    if (!acceleratorEl) return
    acceleratorEl.addEventListener("touchstart", onStart, { passive: true })
    acceleratorEl.addEventListener("touchend", onEnd)
    acceleratorEl.addEventListener("mousedown", onStart)
    acceleratorEl.addEventListener("mouseup", onEnd)

    return () => {
      acceleratorEl.removeEventListener("touchstart", onStart)
      acceleratorEl.removeEventListener("touchend", onEnd)
      acceleratorEl.removeEventListener("mousedown", onStart)
      acceleratorEl.removeEventListener("mouseup", onEnd)
    }
  }, [phoneMode])

  // Steering
  useEffect(() => {
    const leftBtn = document.getElementById("steer-left")
    const rightBtn = document.getElementById("steer-right")
    const onLeft = () => {
      playerXRef.current = Math.max(-1, playerXRef.current - 0.05)
    }
    const onRight = () => {
      playerXRef.current = Math.min(1, playerXRef.current + 0.05)
    }
    if (leftBtn && rightBtn) {
      const leftInterval = { id: 0 as unknown as ReturnType<typeof setInterval> }
      const rightInterval = { id: 0 as unknown as ReturnType<typeof setInterval> }
      leftBtn.addEventListener("touchstart", () => { leftInterval.id = setInterval(onLeft, 50) }, { passive: true })
      leftBtn.addEventListener("touchend", () => clearInterval(leftInterval.id))
      leftBtn.addEventListener("mousedown", () => { leftInterval.id = setInterval(onLeft, 50) })
      leftBtn.addEventListener("mouseup", () => clearInterval(leftInterval.id))
      rightBtn.addEventListener("touchstart", () => { rightInterval.id = setInterval(onRight, 50) }, { passive: true })
      rightBtn.addEventListener("touchend", () => clearInterval(rightInterval.id))
      rightBtn.addEventListener("mousedown", () => { rightInterval.id = setInterval(onRight, 50) })
      rightBtn.addEventListener("mouseup", () => clearInterval(rightInterval.id))
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
      // ── Sky ──
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55)
      skyGrad.addColorStop(0, SKY_TOP)
      skyGrad.addColorStop(1, SKY_HORIZON)
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, W, H)
      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.6)"
      for (let s = 0; s < 80; s++) {
        const sx = (((s * 137.5 + positionRef.current * 0.01) % W) + W) % W
        const sy = (s * 73.1) % (H * 0.45)
        ctx.fillRect(sx, sy, 1, 1)
      }
      // Neon horizon glow
      const horizonGrad = ctx.createLinearGradient(0, H * 0.48, 0, H * 0.58)
      horizonGrad.addColorStop(0, "transparent")
      horizonGrad.addColorStop(0.5, `${NEON.purple}44`)
      horizonGrad.addColorStop(1, "transparent")
      ctx.fillStyle = horizonGrad
      ctx.fillRect(0, H * 0.45, W, H * 0.15)
      // ── Road segments ──
      const startPos = Math.floor(positionRef.current / SEGMENT_LENGTH)
      let x = xRef.current
      let dx = 0
      let maxY = H
      const drawCalls: Array<() => void> = []
      for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
        const segIndex = (startPos + i) % segments.length
        const seg = segments[segIndex]
        const camZ = positionRef.current - startPos * SEGMENT_LENGTH
        const worldZ = segIndex * SEGMENT_LENGTH - camZ + (segIndex < startPos ? totalLength : 0)
        if (worldZ < CAMERA_DEPTH * SEGMENT_LENGTH) continue
        const p1 = project(playerXRef.current * 800, CAMERA_HEIGHT, positionRef.current, x, 0, worldZ, W, H)
        const p2 = project(
          playerXRef.current * 800,
          CAMERA_HEIGHT,
          positionRef.current,
          x + dx * SEGMENT_LENGTH,
          0,
          worldZ + SEGMENT_LENGTH,
          W,
          H,
        )
        x += dx
        dx += seg.curve * 0.001
        if (p1.screenY >= maxY) continue
        maxY = p1.screenY
        const isAlternate = Math.floor(segIndex / 2) % 2 === 0
        const roadColor = isAlternate ? "#16162a" : "#1e1e3a"
        const grassColor = isAlternate ? "#0a0a1a" : "#080810"
        // Grass
        ctx.fillStyle = grassColor
        ctx.fillRect(0, p2.screenY, W, p1.screenY - p2.screenY)
        // Road
        ctx.fillStyle = roadColor
        ctx.beginPath()
        ctx.moveTo(p1.screenX - p1.screenW, p1.screenY)
        ctx.lineTo(p1.screenX + p1.screenW, p1.screenY)
        ctx.lineTo(p2.screenX + p2.screenW, p2.screenY)
        ctx.lineTo(p2.screenX - p2.screenW, p2.screenY)
        ctx.fill()
        // Center line (neon pink glow)
        if (isAlternate) {
          ctx.strokeStyle = NEON.pink
          ctx.lineWidth = Math.max(1, p1.scale * 8)
          ctx.shadowColor = NEON.pink
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.moveTo(p1.screenX, p1.screenY)
          ctx.lineTo(p2.screenX, p2.screenY)
          ctx.stroke()
          ctx.shadowBlur = 0
        }
        // Road edges (neon cyan)
        ctx.strokeStyle = `${NEON.cyan}88`
        ctx.lineWidth = Math.max(1, p1.scale * 4)
        ctx.beginPath()
        ctx.moveTo(p1.screenX - p1.screenW, p1.screenY)
        ctx.lineTo(p2.screenX - p2.screenW, p2.screenY)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(p1.screenX + p1.screenW, p1.screenY)
        ctx.lineTo(p2.screenX + p2.screenW, p2.screenY)
        ctx.stroke()
        // Obstacle cars
        for (const car of seg.cars) {
          const carScreenX = p1.screenX + car.x * p1.screenW
          const carW = p1.scale * car.width * 2.5
          const carH = carW * 0.6
          const carY = p1.screenY - carH
          if (carW < 3) continue
          const speed = speedRef.current
          const crashed = crashedRef.current
          const pX = playerXRef.current
          const segLoopIdx = i
          drawCalls.push(() => {
            // Car body
            ctx.fillStyle = car.color
            ctx.fillRect(carScreenX - carW / 2, carY, carW, carH)
            // Windshield
            ctx.fillStyle = `${NEON.cyan}66`
            ctx.fillRect(carScreenX - carW * 0.3, carY + carH * 0.1, carW * 0.6, carH * 0.35)
            // Brake lights
            ctx.fillStyle = "#ff0000"
            ctx.shadowColor = "#ff0000"
            ctx.shadowBlur = carW * 0.3
            ctx.fillRect(carScreenX - carW / 2, carY + carH * 0.6, carW * 0.15, carH * 0.2)
            ctx.fillRect(carScreenX + carW * 0.35, carY + carH * 0.6, carW * 0.15, carH * 0.2)
            ctx.shadowBlur = 0
            // Collision check
            if (!crashed && segLoopIdx < 5 && speed > 5) {
              const distX = Math.abs(pX - car.x)
              if (distX < 0.35) {
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
          })
        }
      }
      // Execute draw calls (sprites on top of road)
      for (const call of drawCalls) call()
      // ── Player car (bottom center) ──
      const carW = W * 0.22
      const carH = carW * 0.45
      const carX = W / 2 - carW / 2
      const carY = H - carH - H * 0.04
      // Car shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)"
      ctx.beginPath()
      ctx.ellipse(W / 2, H - H * 0.04, carW * 0.45, carH * 0.15, 0, 0, Math.PI * 2)
      ctx.fill()
      // Car body
      ctx.fillStyle = "#e8e8f0"
      ctx.fillRect(carX, carY, carW, carH)
      // Car roof
      ctx.fillStyle = "#c0c0d0"
      ctx.fillRect(carX + carW * 0.2, carY - carH * 0.45, carW * 0.6, carH * 0.5)
      // Windshield (neon tint)
      ctx.fillStyle = `${NEON.cyan}55`
      ctx.fillRect(carX + carW * 0.22, carY - carH * 0.38, carW * 0.56, carH * 0.38)
      // Headlights
      ctx.fillStyle = "#ffffff"
      ctx.shadowColor = "#ffffff"
      ctx.shadowBlur = 20
      ctx.fillRect(carX + carW * 0.08, carY + carH * 0.1, carW * 0.12, carH * 0.15)
      ctx.fillRect(carX + carW * 0.8, carY + carH * 0.1, carW * 0.12, carH * 0.15)
      ctx.shadowBlur = 0
      // Pink underglow
      ctx.fillStyle = `${NEON.pink}33`
      ctx.shadowColor = NEON.pink
      ctx.shadowBlur = 25
      ctx.fillRect(carX, carY + carH * 0.85, carW, carH * 0.15)
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
      // Speed indicator (minimal)
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
