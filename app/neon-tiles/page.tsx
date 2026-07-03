"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface Tile {
  id: number
  col: number
  beatTime: number   // ms: momento em que o tile deve ser acertado
  hit: boolean
  missed: boolean
  hold: boolean      // nota longa?
  holdDuration: number // ms da duração do hold (0 se não for hold)
  holdActive: boolean  // está sendo segurado agora?
}

interface Song {
  id: string
  title: string
  bpm: number
  audioUrl: string
  color: string
  accentColor: string
  duration: number
}

type Profile = "ULTRA CONECTADO" | "EM SINTONIA" | "OSCILANDO" | "DESCONECTADO"
type Phase = "select" | "countdown" | "playing" | "result" | "reward"

// ─── MÚSICAS ─────────────────────────────────────────────────────────────────

const SONGS: Song[] = [
  {
    id: "chuva",
    title: "CHUVA",
    bpm: 95,
    audioUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CHUVA%20%28MASTER%29-gjxdvkaY9bF5PpjHELCGqT3NrahEsG.mp3",
    color: "#00FFF0",
    accentColor: "#0077FF",
    duration: 60,
  },
  {
    id: "copo",
    title: "COPO AMERICANO",
    bpm: 110,
    audioUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COPO%20AMERICANO%20%28MASTER%29-jPjZxju7Z5bxrhmi3XF7pgqkoZGajw.mp3",
    color: "#FF00A8",
    accentColor: "#FF6B00",
    duration: 60,
  },
  {
    id: "dopamina",
    title: "DOPAMINA",
    bpm: 128,
    audioUrl: "",
    color: "#7C3AED",
    accentColor: "#FF00A8",
    duration: 60,
  },
  {
    id: "sexta",
    title: "SEXTA FEIRA",
    bpm: 105,
    audioUrl: "",
    color: "#FFD700",
    accentColor: "#FF6B00",
    duration: 60,
  },
]

// ─── GERADOR DE TILES (~1.5 nota/segundo, notas longas ocasionais) ────────────

function generateTiles(song: Song): Tile[] {
  // Intervalo fixo para 1.5 nota/segundo = 667ms entre notas
  const interval = 667
  const totalMs   = song.duration * 1000
  const tiles: Tile[] = []
  let id = 0
  let lastCol = -1
  let t = 2000 // começa 2s após o início

  const cols = [0, 1, 2, 3]

  while (t < totalMs - 1500) {
    // escolhe coluna diferente da anterior
    let col = cols[Math.floor(Math.random() * 4)]
    while (col === lastCol) col = cols[Math.floor(Math.random() * 4)]
    lastCol = col

    // ~15% de chance de nota longa; duração entre 600ms e 1500ms
    const isHold = Math.random() < 0.15
    const holdDur = isHold ? 600 + Math.floor(Math.random() * 900) : 0

    tiles.push({
      id: id++,
      col,
      beatTime: t,
      hit: false,
      missed: false,
      hold: isHold,
      holdDuration: holdDur,
      holdActive: false,
    })

    // variação de ritmo: às vezes chega mais rápido, às vezes pausa
    const jitter = (Math.random() - 0.5) * 200
    t += interval + jitter + (isHold ? holdDur * 0.5 : 0)
  }

  return tiles.sort((a, b) => a.beatTime - b.beatTime)
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────

function getProfile(accuracy: number, maxCombo: number): Profile {
  if (accuracy > 90 && maxCombo > 20) return "ULTRA CONECTADO"
  if (accuracy > 75) return "EM SINTONIA"
  if (accuracy > 50) return "OSCILANDO"
  return "DESCONECTADO"
}

const PROFILE_CONFIG: Record<Profile, { color: string; message: string; reward: string }> = {
  "ULTRA CONECTADO": {
    color: "#00FFF0",
    message: "Voce sente a cidade profundamente.",
    reward: "Acesso ao Suburbia Xenom desbloqueado.",
  },
  "EM SINTONIA": {
    color: "#7C3AED",
    message: "Voce entende, mas ainda oscila.",
    reward: "Trecho estendido disponivel.",
  },
  "OSCILANDO": {
    color: "#FF6B00",
    message: "Distraido pela dopamina.",
    reward: "voce quase sentiu…",
  },
  "DESCONECTADO": {
    color: "#FF0040",
    message: "Perdido no ruido.",
    reward: "a cidade te consumiu. tenta de novo.",
  },
}

// ─── CONSTANTES VISUAIS ───────────────────────────────────────────────────────

const COLS = 4
const TILE_H_BASE = 72        // altura base do tile normal (px no canvas)
const HIT_ZONE_Y  = 0.78
const HIT_WINDOW_MS = 200
const TILE_SPEED_PX_MS = 0.38   // mais rápido → notas aparecem mais cedo na tela
const CANVAS_H = 580

// Paleta neon rica: rosa, ciano, roxo, amarelo
const COL_COLORS   = ["#FF00A8", "#00FFF0", "#A855F7", "#FFD700"]
const COL_GLOWS    = ["rgba(255,0,168,0.8)", "rgba(0,255,240,0.8)", "rgba(168,85,247,0.8)", "rgba(255,215,0,0.8)"]
const COL_DARK     = ["#4d0030", "#004d4a", "#2d0060", "#4d4000"]
// Linhas de grade laterais neon
const LANE_NEONS   = ["#FF00A830", "#00FFF030", "#A855F730", "#FFD70030"]

// ─── COMPONENTE ───────────────────────────────────────────────────────────────

export default function NeonTilesPage() {
  const router = useRouter()
  const { updateCinematicStep } = useGameFunnel()

  const [phase, setPhase]             = useState<Phase>("select")
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [countdown, setCountdown]     = useState(3)
  const [completedSongs, setCompletedSongs] = useState(0)
  const [tiles, setTiles]             = useState<Tile[]>([])
  const [score, setScore]             = useState(0)
  const [combo, setCombo]             = useState(0)
  const [maxCombo, setMaxCombo]       = useState(0)
  const [hits, setHits]               = useState(0)
  const [feedback, setFeedback]       = useState<{ col: number; type: "hit"|"miss"|"hold"; id: number } | null>(null)
  const [timeLeft, setTimeLeft]       = useState(60)
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [accuracy, setAccuracy]       = useState(0)
  const [finalCombo, setFinalCombo]   = useState(0)

  const canvasRef         = useRef<HTMLCanvasElement>(null)
  const audioRef          = useRef<HTMLAudioElement | null>(null)
  const startTimeRef      = useRef<number>(0)
  const tilesRef          = useRef<Tile[]>([])
  const rafRef            = useRef<number>(0)
  const comboRef          = useRef(0)
  const maxComboRef       = useRef(0)
  const hitsRef           = useRef(0)
  const totalRef          = useRef(0)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackIdRef     = useRef(0)
  const songRef           = useRef<Song | null>(null)
  const holdingRef        = useRef<boolean[]>([false,false,false,false])
  const particlesRef      = useRef<{x:number;y:number;vx:number;vy:number;r:number;color:string;life:number}[]>([])
  const bgPhaseRef        = useRef(0)

  useEffect(() => { tilesRef.current = tiles }, [tiles])

  // ─── RENDER LOOP ─────────────────────────────────────────────────────────

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const tileW = W / COLS
    const hitY = H * HIT_ZONE_Y
    const elapsed = Date.now() - startTimeRef.current
    const song = songRef.current
    bgPhaseRef.current += 0.008

    // ── FUNDO animado com scanlines e gradiente pulsante ──
    const bgG = ctx.createLinearGradient(0, 0, 0, H)
    const pulse = 0.5 + 0.5 * Math.sin(bgPhaseRef.current)
    bgG.addColorStop(0, `rgba(2,0,22,1)`)
    bgG.addColorStop(0.5, `rgba(${Math.round(8+pulse*6)},0,${Math.round(28+pulse*12)},1)`)
    bgG.addColorStop(1, `rgba(0,0,${Math.round(18+pulse*8)},1)`)
    ctx.fillStyle = bgG
    ctx.fillRect(0, 0, W, H)

    // scanlines sutis
    ctx.fillStyle = "rgba(0,0,0,0.06)"
    for (let sy = 0; sy < H; sy += 4) ctx.fillRect(0, sy, W, 2)

    // ── LANES — cada lane tem cor própria e brilho neon ──
    for (let c = 0; c < COLS; c++) {
      const lx = c * tileW
      // fundo da lane com gradiente
      const lg = ctx.createLinearGradient(lx, 0, lx + tileW, 0)
      lg.addColorStop(0, "transparent")
      lg.addColorStop(0.5, LANE_NEONS[c])
      lg.addColorStop(1, "transparent")
      ctx.fillStyle = lg
      ctx.fillRect(lx, 0, tileW, H)
    }

    // bordas de lane
    ctx.lineWidth = 1
    for (let i = 1; i < COLS; i++) {
      const lx = i * tileW
      ctx.strokeStyle = COL_COLORS[i-1] + "20"
      ctx.shadowColor = COL_COLORS[i-1]
      ctx.shadowBlur = 3
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke()
    }
    ctx.shadowBlur = 0

    // ── PERSPECTIVA (linhas de fuga no centro) ──
    ctx.save()
    ctx.globalAlpha = 0.07
    const vpX = W / 2
    for (let i = 0; i <= COLS; i++) {
      ctx.strokeStyle = COL_COLORS[i % COLS]
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(vpX, 0)
      ctx.lineTo(i * tileW, H)
      ctx.stroke()
    }
    ctx.restore()

    // ── ZONA DE ACERTO ──
    const zoneColor = song ? song.color : "#00FFF0"
    ctx.save()
    ctx.shadowColor = zoneColor
    ctx.shadowBlur = 18
    ctx.strokeStyle = zoneColor
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.9
    ctx.beginPath()
    ctx.moveTo(0, hitY + TILE_H_BASE / 2)
    ctx.lineTo(W, hitY + TILE_H_BASE / 2)
    ctx.stroke()
    ctx.restore()

    // glow na zona de acerto
    const zoneGrad = ctx.createLinearGradient(0, hitY, 0, hitY + TILE_H_BASE * 1.5)
    zoneGrad.addColorStop(0, zoneColor + "33")
    zoneGrad.addColorStop(1, "transparent")
    ctx.fillStyle = zoneGrad
    ctx.fillRect(0, hitY, W, TILE_H_BASE * 1.5)

    // ── TILES ──
    const currentTiles = tilesRef.current
    for (const tile of currentTiles) {
      if (tile.hit && !tile.hold) continue
      if (tile.hit && tile.hold && !tile.holdActive) continue

      const timeToHit = tile.beatTime - elapsed
      const y = hitY - timeToHit * TILE_SPEED_PX_MS

      if (y > H + 200) continue
      if (y < -TILE_H_BASE * 4 && !tile.hold) continue

      const x = tile.col * tileW
      const color = COL_COLORS[tile.col]
      const glow  = COL_GLOWS[tile.col]
      const dark  = COL_DARK[tile.col]
      const alpha = tile.missed ? 0.18 : 1

      ctx.save()
      ctx.globalAlpha = alpha

      if (tile.hold && !tile.hit) {
        // ── NOTA LONGA: barra vertical com gradiente ──
        const holdPx = tile.holdDuration * TILE_SPEED_PX_MS
        const pad = 10
        const bx = x + pad
        const bw = tileW - pad * 2
        const tailY = y
        const headY = y - holdPx

        // trilha da nota longa
        const hg = ctx.createLinearGradient(0, headY, 0, tailY)
        hg.addColorStop(0, color + "dd")
        hg.addColorStop(0.4, color + "88")
        hg.addColorStop(1, color + "11")
        ctx.fillStyle = hg
        ctx.shadowColor = color
        ctx.shadowBlur = tile.missed ? 0 : 14
        ctx.beginPath()
        ctx.roundRect(bx, headY, bw, tailY - headY, 8)
        ctx.fill()

        // cabeça da nota
        ctx.shadowBlur = tile.missed ? 0 : 24
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(bx - 2, headY - TILE_H_BASE * 0.5, bw + 4, TILE_H_BASE * 0.5, 10)
        ctx.fill()

        // linha de brilho
        ctx.fillStyle = "rgba(255,255,255,0.5)"
        ctx.beginPath()
        ctx.roundRect(bx + 2, headY - TILE_H_BASE * 0.5 + 4, bw * 0.35, 3, 2)
        ctx.fill()

      } else if (!tile.hold) {
        // ── NOTA NORMAL ──
        const pad = 5
        const radius = 14
        const tx = x + pad
        const ty = y
        const tw = tileW - pad * 2
        const th = TILE_H_BASE - 2

        // glow externo
        if (!tile.missed) {
          ctx.shadowColor = color
          ctx.shadowBlur = 22
        }

        // corpo com gradiente
        const tg = ctx.createLinearGradient(tx, ty, tx, ty + th)
        tg.addColorStop(0, color)
        tg.addColorStop(0.6, color + "cc")
        tg.addColorStop(1, dark)
        ctx.fillStyle = tile.missed ? "rgba(255,255,255,0.08)" : tg
        ctx.beginPath()
        ctx.roundRect(tx, ty, tw, th, radius)
        ctx.fill()

        // borda interna
        if (!tile.missed) {
          ctx.strokeStyle = "rgba(255,255,255,0.35)"
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.roundRect(tx + 1, ty + 1, tw - 2, th - 2, radius - 1)
          ctx.stroke()
        }

        // faixa de brilho no topo
        if (!tile.missed) {
          ctx.fillStyle = "rgba(255,255,255,0.4)"
          ctx.beginPath()
          ctx.roundRect(tx + 6, ty + 5, tw - 12, 5, 3)
          ctx.fill()
        }

        // ícone central (pequeno triângulo)
        if (!tile.missed && th > 20) {
          ctx.fillStyle = "rgba(255,255,255,0.7)"
          ctx.textAlign = "center"
          ctx.font = `bold ${Math.round(th * 0.35)}px monospace`
          ctx.shadowBlur = 0
          ctx.fillText("▼", tx + tw / 2, ty + th * 0.68)
        }
      }

      ctx.restore()
    }

    // ── PARTÍCULAS de acerto ──
    const pts = particlesRef.current
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i]
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 0.03
      if (p.life <= 0) { pts.splice(i, 1); continue }
      ctx.save()
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // ── BOTÕES HIT na zona inferior ──
    for (let c = 0; c < COLS; c++) {
      const bx = c * tileW + tileW * 0.12
      const by = hitY + TILE_H_BASE * 0.65
      const bw = tileW * 0.76
      const bh = TILE_H_BASE * 0.7
      const isHolding = holdingRef.current[c]

      ctx.save()
      ctx.shadowColor = COL_COLORS[c]
      ctx.shadowBlur = isHolding ? 28 : 10

      const bg = ctx.createLinearGradient(bx, by, bx, by + bh)
      bg.addColorStop(0, isHolding ? COL_COLORS[c] + "aa" : COL_COLORS[c] + "22")
      bg.addColorStop(1, isHolding ? COL_COLORS[c] + "66" : COL_COLORS[c] + "08")
      ctx.fillStyle = bg
      ctx.strokeStyle = COL_COLORS[c] + (isHolding ? "ff" : "60")
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, bh, 12)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    rafRef.current = requestAnimationFrame(renderFrame)
  }, [])

  // ─── PARTÍCULAS ao acertar ──────────────────────────────��──────────────────

  const spawnParticles = useCallback((col: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const tileW = canvas.width / COLS
    const cx = col * tileW + tileW / 2
    const cy = canvas.height * HIT_ZONE_Y + TILE_H_BASE / 2
    for (let i = 0; i < 12; i++) {
      const angle = (Math.random() * Math.PI * 2)
      const speed = 1.5 + Math.random() * 3
      particlesRef.current.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: 2 + Math.random() * 4,
        color: COL_COLORS[col],
        life: 0.8 + Math.random() * 0.5,
      })
    }
  }, [])

  // ─── INICIAR JOGO ─────────────────────────────────────────────────────────

  const startGame = useCallback((song: Song) => {
    if (!song.audioUrl) return

    const generated = generateTiles(song)
    setTiles(generated)
    tilesRef.current = generated
    songRef.current = song
    particlesRef.current = []

    setScore(0); setCombo(0); setMaxCombo(0); setHits(0); setTimeLeft(song.duration)
    comboRef.current = 0; maxComboRef.current = 0; hitsRef.current = 0; totalRef.current = 0

    const audio = new Audio(song.audioUrl)
    audio.volume = 0.85
    audioRef.current = audio

    setPhase("countdown"); setCountdown(3)
    let count = 3
    const cdInterval = setInterval(() => {
      count--
      setCountdown(count)
      if (count <= 0) {
        clearInterval(cdInterval)
        audio.play().catch(() => {})
        startTimeRef.current = Date.now()
        setPhase("playing")
        // NOTE: the render loop is started by the `phase === "playing"` effect
        // below — not here — so the <canvas> is guaranteed to be committed to
        // the DOM before requestAnimationFrame(renderFrame) first runs.
      }
    }, 1000)
  }, [])

  // ─── RENDER LOOP ────────────────────────────────────────────────────────────
  // Start the requestAnimationFrame loop only once React has committed the
  // canvas for the "playing" screen. Starting it synchronously right after
  // setPhase("playing") raced ahead of the commit and left renderFrame with a
  // null canvasRef on the first frame.
  useEffect(() => {
    if (phase !== "playing") return
    rafRef.current = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase, renderFrame])

  // ─── TIMER ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "playing") return
    const interval = setInterval(() => {
      const song = songRef.current
      if (!song) return
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const left = Math.max(0, song.duration - elapsed)
      setTimeLeft(Math.ceil(left))

      const now = Date.now() - startTimeRef.current
      setTiles(prev => {
        const updated = prev.map(t => {
          if (!t.hit && !t.missed && t.beatTime < now - HIT_WINDOW_MS) {
            totalRef.current += 1
            comboRef.current = 0
            setCombo(0)
            return { ...t, missed: true }
          }
          return t
        })
        return updated
      })

      if (left <= 0) { clearInterval(interval); endGame() }
    }, 100)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ─── FIM DO JOGO ─────────────────────────────────────────────────────────

  const endGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    audioRef.current?.pause()
    const h = hitsRef.current
    const t = totalRef.current
    const acc = t > 0 ? Math.round((h / t) * 100) : 0
    const mc = maxComboRef.current
    setAccuracy(acc); setFinalCombo(mc); setProfile(getProfile(acc, mc))
    setCompletedSongs(prev => {
      const next = prev + 1
      if (next >= 4) {
        updateCinematicStep("neon-tiles-complete")
        setPhase("reward")
      } else {
        setPhase("result")
      }
      return next
    })
  }, [updateCinematicStep])

  // ─── TAP ──────────────────────────────────────────────────────────────────

  const handlePointerDown = useCallback((col: number) => {
    if (phase !== "playing") return
    holdingRef.current[col] = true

    const now = Date.now() - startTimeRef.current
    let bestTile: Tile | null = null
    let bestDist = Infinity

    for (const tile of tilesRef.current) {
      if (tile.hit || tile.missed) continue
      if (tile.col !== col) continue
      const dist = Math.abs(tile.beatTime - now)
      if (dist < HIT_WINDOW_MS && dist < bestDist) { bestDist = dist; bestTile = tile }
    }

    const fid = ++feedbackIdRef.current

    if (bestTile) {
      const tileId = bestTile.id
      const isHold = bestTile.hold
      setTiles(prev => prev.map(t => t.id === tileId
        ? { ...t, hit: true, holdActive: isHold }
        : t
      ))

      hitsRef.current += 1; totalRef.current += 1; comboRef.current += 1
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current

      const newCombo = comboRef.current
      const points = 100 + (newCombo > 5 ? 50 : 0) + (newCombo > 10 ? 100 : 0)

      setHits(hitsRef.current); setCombo(newCombo); setMaxCombo(maxComboRef.current)
      setScore(s => s + points)
      setFeedback({ col, type: isHold ? "hold" : "hit", id: fid })
      spawnParticles(col)
    } else {
      comboRef.current = 0; setCombo(0)
      setFeedback({ col, type: "miss", id: fid })
    }

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(f => (f?.id === fid ? null : f))
    }, 300)
  }, [phase, spawnParticles])

  const handlePointerUp = useCallback((col: number) => {
    holdingRef.current[col] = false
    // finaliza hold se estava ativo
    setTiles(prev => prev.map(t =>
      t.col === col && t.holdActive ? { ...t, holdActive: false } : t
    ))
  }, [])

  useEffect(() => {
    return () => { cancelAnimationFrame(rafRef.current); audioRef.current?.pause() }
  }, [])

  // ─── TELA: SELEÇÃO ───────────────────────────────────────────────────────

  if (phase === "select") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "radial-gradient(ellipse at center, #0d0d2b 0%, #000 100%)" }}
      >
        <p className="font-mono text-xs mb-2 tracking-widest" style={{ color: "rgba(0,255,240,0.5)" }}>
          GUITAR DRIVER
        </p>
        <h1 className="font-mono font-bold text-3xl text-white mb-1">Escolha a faixa</h1>
        {completedSongs > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-7 h-1.5 rounded-full" style={{ background: i < completedSongs ? "#7c3aed" : "rgba(255,255,255,0.08)", boxShadow: i < completedSongs ? "0 0 6px #7c3aed" : "none" }} />
            ))}
            <span className="font-mono text-xs ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>{completedSongs}/4</span>
          </div>
        )}
        <p className="font-mono text-xs mb-10" style={{ color: "rgba(255,255,255,0.3)" }}>
          complete 4 faixas para desbloquear a recompensa
        </p>
        <div className="w-full max-w-sm space-y-3">
          {SONGS.map(song => (
            <button
              key={song.id}
              onClick={() => { setSelectedSong(song); startGame(song) }}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all active:scale-95"
              style={{
                background: `linear-gradient(135deg,${song.color}18 0%,${song.accentColor}10 100%)`,
                border: `1.5px solid ${song.color}40`,
              }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-mono text-xs font-bold"
                style={{ background: song.color + "25", color: song.color }}>
                {song.bpm}<br /><span className="text-[9px] opacity-60">BPM</span>
              </div>
              <div className="text-left flex-1">
                <p className="font-mono font-bold text-white text-sm">{song.title}</p>
                <p className="font-mono text-xs mt-0.5" style={{ color: song.color }}>
                  {song.audioUrl ? "com audio" : "modo visual"}
                </p>
              </div>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" stroke={song.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ))}
        </div>
        {/* Botao Home — simula botao fisico do iPhone */}
        <button
          onClick={() => router.push("/?screen=home")}
          aria-label="Inicio"
          className="mt-10 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.12)", boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5}>
            <rect x="5" y="3" width="14" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="17" r="1.2" fill="rgba(255,255,255,0.25)" stroke="none" />
          </svg>
        </button>
      </div>
    )
  }

  // ─── TELA: COUNTDOWN ─────────────────────────────────────────────────────

  if (phase === "countdown") {
    const song = selectedSong || SONGS[0]
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#000" }}>
        <p className="font-mono text-xs mb-4 tracking-widest" style={{ color: song.color + "80" }}>{song.title}</p>
        <p className="font-mono font-bold" style={{ fontSize: 96, color: song.color, textShadow: `0 0 40px ${song.color},0 0 80px ${song.color}66` }}>
          {countdown === 0 ? "GO" : countdown}
        </p>
        <p className="font-mono text-xs mt-4" style={{ color: "rgba(255,255,255,0.3)" }}>toque nos tiles no ritmo</p>
      </div>
    )
  }

  // ─── TELA: RESULTADO ─────────────────────────────────────────────────────

  if (phase === "result" && profile) {
    const cfg = PROFILE_CONFIG[profile]
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "#000" }}>
        <div className="w-full max-w-sm text-center">
          <p className="font-mono text-xs mb-6 tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>RESULTADO</p>
          <h1 className="font-mono font-bold text-3xl mb-3" style={{ color: cfg.color, textShadow: `0 0 30px ${cfg.color}` }}>{profile}</h1>
          <p className="font-mono text-sm mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>{cfg.message}</p>
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "ACURACIA", value: `${accuracy}%`, color: cfg.color },
              { label: "MAX COMBO", value: finalCombo, color: "#FF00A8" },
              { label: "PONTOS", value: score, color: "#FFD700" },
            ].map(stat => (
              <div key={stat.label} className="p-3 rounded-xl font-mono"
                style={{ background: `${stat.color}12`, border: `1px solid ${stat.color}30` }}>
                <p className="text-xs mb-1" style={{ color: stat.color + "80" }}>{stat.label}</p>
                <p className="font-bold text-white text-lg">{stat.value}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-xs mb-8" style={{ color: "rgba(255,255,255,0.3)" }}>{cfg.reward}</p>
          {/* Progresso de faixas */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-8 h-2 rounded-full transition-all"
                style={{ background: i < completedSongs ? cfg.color : "rgba(255,255,255,0.08)", boxShadow: i < completedSongs ? `0 0 8px ${cfg.color}` : "none" }}
              />
            ))}
          </div>
          <p className="font-mono text-[11px] mb-10" style={{ color: "rgba(255,255,255,0.2)" }}>
            {completedSongs}/4 faixas completadas
          </p>
          <div className="flex gap-3">
            <button onClick={() => { setPhase("select"); setProfile(null) }}
              className="flex-1 py-3 rounded-xl font-mono text-sm font-bold transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
              Tentar de novo
            </button>
            <button onClick={() => { setPhase("select"); setProfile(null) }}
              className="flex-1 py-3 rounded-xl font-mono text-sm font-bold transition-all active:scale-95"
              style={{ background: cfg.color + "25", color: cfg.color, border: `1px solid ${cfg.color}50` }}>
              Proxima faixa
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── TELA: RECOMPENSA (4 musicas completadas) ────────────────────────────

  if (phase === "reward") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "radial-gradient(ellipse at 50% 30%, #1a003a 0%, #000 70%)" }}>
        <div className="w-full max-w-sm text-center">
          {/* Animacao de desbloqueio */}
          <div className="relative flex items-center justify-center mb-8">
            <div className="absolute w-32 h-32 rounded-full animate-ping" style={{ background: "rgba(139,92,246,0.12)" }} />
            <div className="absolute w-24 h-24 rounded-full animate-pulse" style={{ background: "rgba(139,92,246,0.2)" }} />
            <div className="w-20 h-20 rounded-full flex items-center justify-center relative z-10" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 0 40px rgba(124,58,237,0.6)" }}>
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          </div>

          <p className="font-mono text-xs mb-2 tracking-[0.3em]" style={{ color: "rgba(139,92,246,0.7)" }}>RECOMPENSA DESBLOQUEADA</p>
          <h1 className="font-mono font-bold text-2xl text-white mb-3 text-balance" style={{ textShadow: "0 0 30px rgba(139,92,246,0.8)" }}>
            4 FAIXAS COMPLETAS
          </h1>
          <p className="font-mono text-sm mb-10" style={{ color: "rgba(255,255,255,0.5)" }}>
            voce tocou tudo.<br/>D-Bee tem algo guardado pra voce.
          </p>

          {/* Card de recompensa */}
          <a
            href="/whatsapp/privado/dbee"
            className="block w-full rounded-2xl p-4 mb-4 text-left transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg,rgba(107,127,215,0.15),rgba(107,127,215,0.05))", border: "1px solid rgba(107,127,215,0.3)", boxShadow: "0 0 20px rgba(107,127,215,0.1)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(107,127,215,0.25)" }}>
                <span className="text-[#6B7FD7] font-bold text-lg">D</span>
              </div>
              <div className="flex-1">
                <p className="font-mono font-bold text-white text-sm">D-Bee</p>
                <p className="font-mono text-xs mt-0.5" style={{ color: "rgba(107,127,215,0.8)" }}>Live Neon — toque para ver</p>
              </div>
              <svg className="w-5 h-5 text-[#6B7FD7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </div>
          </a>

          <button
            onClick={() => { setPhase("select"); setProfile(null); setCompletedSongs(0) }}
            className="w-full py-3 rounded-xl font-mono text-sm transition-all active:scale-95 mt-2"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            jogar de novo
          </button>
        </div>
      </div>
    )
  }

  // ─── TELA: JOGO ───────────────────────────────────────────────────────────

  const song = selectedSong || SONGS[0]

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{ background: "#000", paddingBottom: "env(safe-area-inset-bottom)", userSelect: "none" }}
    >
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { cancelAnimationFrame(rafRef.current); audioRef.current?.pause(); setPhase("select"); setProfile(null) }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            aria-label="Sair da musica"
          >
            <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          </button>
          <div>
            <p className="font-mono text-xs" style={{ color: song.color }}>{song.title}</p>
            <p className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{song.bpm} BPM</p>
          </div>
        </div>
        <div className="flex gap-4 font-mono text-sm">
          <div className="text-right">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>COMBO</p>
            <p className="font-bold" style={{ color: combo > 10 ? "#FFD700" : "#00FFF0", textShadow: combo > 10 ? "0 0 10px #FFD700" : "none" }}>
              {combo > 0 ? `x${combo}` : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>TEMPO</p>
            <p className="font-bold text-white">{timeLeft}s</p>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full max-w-sm flex-1" style={{ maxHeight: CANVAS_H }}>
        <canvas ref={canvasRef} width={360} height={CANVAS_H} className="w-full" style={{ display: "block" }} />

        {/* Feedback overlay */}
        {feedback && (
          <div
            className="absolute pointer-events-none font-mono font-bold text-sm"
            style={{
              left: `${(feedback.col / COLS + 1 / COLS / 2) * 100}%`,
              bottom: "22%",
              transform: "translateX(-50%)",
              color: feedback.type === "miss" ? "#FF0040" : COL_COLORS[feedback.col],
              textShadow: `0 0 16px ${feedback.type === "miss" ? "#FF0040" : COL_COLORS[feedback.col]}`,
              fontSize: feedback.type === "hold" ? "11px" : "13px",
              letterSpacing: 1,
            }}
          >
            {feedback.type === "hit" ? "PERFECT" : feedback.type === "hold" ? "HOLD!" : "MISS"}
          </div>
        )}
      </div>

      {/* Score bar */}
      <div className="w-full max-w-sm px-4 py-1">
        <div className="flex justify-between font-mono text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
          <span>PONTOS</span><span style={{ color: "#FFD700" }}>{score.toLocaleString()}</span>
        </div>
        <div className="w-full h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min((score / 10000) * 100, 100)}%`, background: `linear-gradient(90deg,${song.color},${song.accentColor})`, boxShadow: `0 0 8px ${song.color}` }}/>
        </div>
      </div>

      {/* Botoes de toque — overlay transparente sobre o canvas (toca no canvas) */}
      <div className="w-full max-w-sm grid grid-cols-4 gap-1.5 px-3 pb-6 pt-2">
        {[0, 1, 2, 3].map(col => (
          <button
            key={col}
            onPointerDown={() => handlePointerDown(col)}
            onPointerUp={() => handlePointerUp(col)}
            onPointerLeave={() => handlePointerUp(col)}
            className="rounded-2xl font-mono font-bold text-xl transition-all select-none"
            style={{
              height: 68,
              background: `${COL_COLORS[col]}12`,
              border: `2px solid ${COL_COLORS[col]}50`,
              color: COL_COLORS[col],
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              boxShadow: `0 0 12px ${COL_COLORS[col]}30`,
            }}
          >
            ▼
          </button>
        ))}
      </div>
    </div>
  )
}
