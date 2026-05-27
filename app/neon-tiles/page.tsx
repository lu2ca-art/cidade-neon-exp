"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface Tile {
  id: number
  col: number        // 0–3
  beatTime: number   // ms desde o inicio do jogo que o tile deve ser acertado
  hit: boolean
  missed: boolean
}

interface Song {
  id: string
  title: string
  bpm: number
  audioUrl: string
  color: string
  accentColor: string
  duration: number   // segundos
}

type Profile = "ULTRA CONECTADO" | "EM SINTONIA" | "OSCILANDO" | "DESCONECTADO"
type Phase = "select" | "countdown" | "playing" | "result"

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

// ─── GERADOR DE TILES (sincronizado com BPM) ─────────────────────────────────

function generateTiles(song: Song): Tile[] {
  const msPerBeat = (60 / song.bpm) * 1000
  const totalBeats = Math.floor((song.duration * 1000) / msPerBeat)
  const tiles: Tile[] = []
  let id = 0

  // Distribui tiles por colunas aleatoriamente, um por beat, com variações
  const cols = [0, 1, 2, 3]
  let lastCol = -1

  for (let beat = 4; beat < totalBeats - 2; beat++) {
    // Beat principal: sempre tem tile
    let col = cols[Math.floor(Math.random() * 4)]
    while (col === lastCol) col = cols[Math.floor(Math.random() * 4)]
    lastCol = col

    tiles.push({
      id: id++,
      col,
      beatTime: beat * msPerBeat,
      hit: false,
      missed: false,
    })

    // Meio beat: tile extra com probabilidade crescente conforme passa o tempo
    const halfBeatProb = beat < 20 ? 0.2 : beat < 40 ? 0.4 : 0.6
    if (Math.random() < halfBeatProb) {
      let col2 = cols[Math.floor(Math.random() * 4)]
      while (col2 === col) col2 = cols[Math.floor(Math.random() * 4)]
      tiles.push({
        id: id++,
        col: col2,
        beatTime: beat * msPerBeat + msPerBeat / 2,
        hit: false,
        missed: false,
      })
    }
  }

  return tiles.sort((a, b) => a.beatTime - b.beatTime)
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────

function getProfile(accuracy: number, maxCombo: number): Profile {
  if (accuracy > 90 && maxCombo > 40) return "ULTRA CONECTADO"
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

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const COLS = 4
const TILE_W_RATIO = 1 / COLS
const TILE_H = 90
const HIT_ZONE_Y = 0.80   // 80% da altura do canvas
const HIT_WINDOW_MS = 140 // janela de acerto ±ms
const TILE_SPEED_PX_MS = 0.22  // pixels por ms
const CANVAS_H = 600
const COL_COLORS = ["#FF00A8", "#00FFF0", "#7C3AED", "#FFD700"]
const COL_SHADOWS = ["rgba(255,0,168,0.6)", "rgba(0,255,240,0.6)", "rgba(124,58,237,0.6)", "rgba(255,215,0,0.6)"]

// ─── COMPONENTE ───────────────────────────────────────────────────────────────

export default function NeonTilesPage() {
  const router = useRouter()
  const { updateCinematicStep } = useGameFunnel()

  const [phase, setPhase] = useState<Phase>("select")
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [countdown, setCountdown] = useState(3)

  // Game state
  const [tiles, setTiles] = useState<Tile[]>([])
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [total, setTotal] = useState(0)
  const [feedback, setFeedback] = useState<{ col: number; type: "hit" | "miss"; id: number } | null>(null)
  const [timeLeft, setTimeLeft] = useState(60)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accuracy, setAccuracy] = useState(0)
  const [finalCombo, setFinalCombo] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startTimeRef = useRef<number>(0)
  const tilesRef = useRef<Tile[]>([])
  const rafRef = useRef<number>(0)
  const comboRef = useRef(0)
  const maxComboRef = useRef(0)
  const hitsRef = useRef(0)
  const totalRef = useRef(0)
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const feedbackIdRef = useRef(0)
  const songRef = useRef<Song | null>(null)

  // Sync tilesRef com tiles state
  useEffect(() => {
    tilesRef.current = tiles
  }, [tiles])

  // ─── CANVAS RENDER LOOP ───────────────────────────────────────────────────

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

    // Fundo
    ctx.fillStyle = "#050510"
    ctx.fillRect(0, 0, W, H)

    // Grade vertical
    ctx.strokeStyle = "rgba(255,255,255,0.05)"
    ctx.lineWidth = 1
    for (let i = 1; i < COLS; i++) {
      ctx.beginPath()
      ctx.moveTo(i * tileW, 0)
      ctx.lineTo(i * tileW, H)
      ctx.stroke()
    }

    // Zona de acerto (linha)
    const song = songRef.current
    const zoneColor = song ? song.color : "#00FFF0"
    ctx.strokeStyle = zoneColor
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(0, hitY + TILE_H / 2)
    ctx.lineTo(W, hitY + TILE_H / 2)
    ctx.stroke()
    ctx.globalAlpha = 1

    // Tiles
    const currentTiles = tilesRef.current
    for (const tile of currentTiles) {
      if (tile.hit) continue
      // Posicao Y: tile se move de cima para baixo chegando na hitY no beatTime
      const timeToHit = tile.beatTime - elapsed
      const y = hitY - timeToHit * TILE_SPEED_PX_MS

      if (y > H + TILE_H) continue     // abaixo da tela
      if (y < -TILE_H * 2) continue    // acima demais, ainda nao visivel

      const x = tile.col * tileW
      const alpha = tile.missed ? 0.2 : 1

      ctx.globalAlpha = alpha
      // Sombra neon
      ctx.shadowColor = COL_SHADOWS[tile.col]
      ctx.shadowBlur = tile.missed ? 0 : 18

      // Corpo do tile
      ctx.fillStyle = tile.missed ? "rgba(255,255,255,0.1)" : COL_COLORS[tile.col]
      const pad = 6
      const radius = 12
      const tx = x + pad
      const ty = y
      const tw = tileW - pad * 2
      const th = TILE_H - 4

      ctx.beginPath()
      ctx.roundRect(tx, ty, tw, th, radius)
      ctx.fill()

      // Linha de brilho no topo
      if (!tile.missed) {
        ctx.fillStyle = "rgba(255,255,255,0.3)"
        ctx.beginPath()
        ctx.roundRect(tx + 4, ty + 4, tw - 8, 4, 4)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0
      ctx.shadowColor = "transparent"
    }

    rafRef.current = requestAnimationFrame(renderFrame)
  }, [])

  // ─── INICIAR JOGO ─────────────────────────────────────────────────────────

  const startGame = useCallback((song: Song) => {
    if (!song.audioUrl) return

    const generated = generateTiles(song)
    setTiles(generated)
    tilesRef.current = generated
    songRef.current = song

    // Reset counters
    setScore(0)
    setCombo(0)
    setMaxCombo(0)
    setHits(0)
    setTotal(0)
    setTimeLeft(song.duration)
    comboRef.current = 0
    maxComboRef.current = 0
    hitsRef.current = 0
    totalRef.current = 0

    // Audio
    const audio = new Audio(song.audioUrl)
    audio.volume = 0.85
    audioRef.current = audio

    // Countdown
    setPhase("countdown")
    setCountdown(3)
    let count = 3
    const cdInterval = setInterval(() => {
      count--
      setCountdown(count)
      if (count <= 0) {
        clearInterval(cdInterval)
        audio.play().catch(() => {})
        startTimeRef.current = Date.now()
        setPhase("playing")
        rafRef.current = requestAnimationFrame(renderFrame)
      }
    }, 1000)
  }, [renderFrame])

  // ─── TIMER DO JOGO ────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "playing") return

    const interval = setInterval(() => {
      const song = songRef.current
      if (!song) return
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const left = Math.max(0, song.duration - elapsed)
      setTimeLeft(Math.ceil(left))

      // Marcar tiles perdidos
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

      if (left <= 0) {
        clearInterval(interval)
        endGame()
      }
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
    const p = getProfile(acc, mc)

    setAccuracy(acc)
    setFinalCombo(mc)
    setProfile(p)
    setPhase("result")
    updateCinematicStep("neon-tiles-complete")
  }, [updateCinematicStep])

  // ─── TAP / ACERTO ─────────────────────────────────────────────────────────

  const handleTap = useCallback((col: number) => {
    if (phase !== "playing") return

    const now = Date.now() - startTimeRef.current
    let bestTile: Tile | null = null
    let bestDist = Infinity

    for (const tile of tilesRef.current) {
      if (tile.hit || tile.missed) continue
      if (tile.col !== col) continue
      const dist = Math.abs(tile.beatTime - now)
      if (dist < HIT_WINDOW_MS && dist < bestDist) {
        bestDist = dist
        bestTile = tile
      }
    }

    const fid = ++feedbackIdRef.current

    if (bestTile) {
      // Acerto
      const tileId = bestTile.id
      setTiles(prev => prev.map(t => t.id === tileId ? { ...t, hit: true } : t))

      hitsRef.current += 1
      totalRef.current += 1
      comboRef.current += 1
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current

      const newCombo = comboRef.current
      const points = 100 + (newCombo > 5 ? 50 : 0) + (newCombo > 10 ? 100 : 0)

      setHits(hitsRef.current)
      setCombo(newCombo)
      setMaxCombo(maxComboRef.current)
      setScore(s => s + points)
      setFeedback({ col, type: "hit", id: fid })
    } else {
      // Erro
      comboRef.current = 0
      setCombo(0)
      setFeedback({ col, type: "miss", id: fid })
    }

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(f => (f?.id === fid ? null : f))
    }, 300)
  }, [phase])

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      audioRef.current?.pause()
    }
  }, [])

  // ─── TELA: SELECAO DE MUSICA ──────────────────────────────────────────────

  if (phase === "select") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ background: "radial-gradient(ellipse at center, #0d0d2b 0%, #000 100%)" }}
      >
        <p className="font-mono text-xs mb-2 tracking-widest" style={{ color: "rgba(0,255,240,0.5)" }}>
          NEON TILES — TESTE DE CONEXAO
        </p>
        <h1 className="font-mono font-bold text-3xl text-white mb-1">Escolha a faixa</h1>
        <p className="font-mono text-xs mb-10" style={{ color: "rgba(255,255,255,0.3)" }}>
          seus reflexos definem seu perfil
        </p>

        <div className="w-full max-w-sm space-y-3">
          {SONGS.map(song => (
            <button
              key={song.id}
              onClick={() => {
                if (!song.audioUrl) return
                setSelectedSong(song)
                startGame(song)
              }}
              disabled={!song.audioUrl}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all active:scale-95"
              style={{
                background: song.audioUrl
                  ? `linear-gradient(135deg, ${song.color}18 0%, ${song.accentColor}10 100%)`
                  : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${song.audioUrl ? song.color + "40" : "rgba(255,255,255,0.08)"}`,
                opacity: song.audioUrl ? 1 : 0.4,
                cursor: song.audioUrl ? "pointer" : "not-allowed",
              }}
            >
              {/* BPM badge */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-mono text-xs font-bold"
                style={{ background: song.audioUrl ? song.color + "25" : "rgba(255,255,255,0.05)", color: song.color }}
              >
                {song.bpm}
                <br />
                <span className="text-[9px] opacity-60">BPM</span>
              </div>

              <div className="text-left flex-1">
                <p className="font-mono font-bold text-white text-sm">{song.title}</p>
                <p className="font-mono text-xs mt-0.5" style={{ color: song.audioUrl ? song.color : "rgba(255,255,255,0.2)" }}>
                  {song.audioUrl ? "disponivel" : "em breve"}
                </p>
              </div>

              {song.audioUrl && (
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" stroke={song.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-10 font-mono text-xs"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          voltar ao inicio
        </button>
      </div>
    )
  }

  // ─── TELA: CONTAGEM REGRESSIVA ────────────────────────────────────────────

  if (phase === "countdown") {
    const song = selectedSong || SONGS[0]
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: "#000" }}
      >
        <p className="font-mono text-xs mb-4 tracking-widest" style={{ color: song.color + "80" }}>
          {song.title}
        </p>
        <p
          className="font-mono font-bold"
          style={{ fontSize: 96, color: song.color, textShadow: `0 0 40px ${song.color}` }}
        >
          {countdown === 0 ? "GO" : countdown}
        </p>
        <p className="font-mono text-xs mt-4" style={{ color: "rgba(255,255,255,0.3)" }}>
          toque nos tiles no ritmo
        </p>
      </div>
    )
  }

  // ─── TELA: RESULTADO ─────────────────────────────────────────────────────

  if (phase === "result" && profile) {
    const cfg = PROFILE_CONFIG[profile]
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "#000" }}>
        <div className="w-full max-w-sm text-center">
          <p className="font-mono text-xs mb-6 tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
            RESULTADO
          </p>

          <h1
            className="font-mono font-bold text-3xl mb-3"
            style={{ color: cfg.color, textShadow: `0 0 30px ${cfg.color}` }}
          >
            {profile}
          </h1>
          <p className="font-mono text-sm mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>
            {cfg.message}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "ACURACIA", value: `${accuracy}%`, color: cfg.color },
              { label: "MAX COMBO", value: finalCombo, color: "#FF00A8" },
              { label: "PONTOS", value: score, color: "#FFD700" },
            ].map(stat => (
              <div
                key={stat.label}
                className="p-3 rounded-xl font-mono"
                style={{ background: `${stat.color}12`, border: `1px solid ${stat.color}30` }}
              >
                <p className="text-xs mb-1" style={{ color: stat.color + "80" }}>{stat.label}</p>
                <p className="font-bold text-white text-lg">{stat.value}</p>
              </div>
            ))}
          </div>

          <p className="font-mono text-xs mb-8" style={{ color: "rgba(255,255,255,0.3)" }}>
            {cfg.reward}
          </p>

          <p className="font-mono text-xs italic mb-10" style={{ color: "rgba(255,255,255,0.2)" }}>
            &quot;A cidade responde ao seu ritmo.<br />Mas esse ritmo… e seu mesmo?&quot;
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setPhase("select")
                setProfile(null)
              }}
              className="flex-1 py-3 rounded-xl font-mono text-sm font-bold transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Tentar de novo
            </button>
            <button
              onClick={() => router.push("/whatsapp/grupo")}
              className="flex-1 py-3 rounded-xl font-mono text-sm font-bold transition-all active:scale-95"
              style={{ background: cfg.color + "25", color: cfg.color, border: `1px solid ${cfg.color}50` }}
            >
              Entrar na Cidade
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── TELA: JOGO ───────────────────────────────────────────────────────────

  const song = selectedSong || SONGS[0]
  const tileW_pct = TILE_W_RATIO * 100

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between"
      style={{ background: "#000", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <p className="font-mono text-xs" style={{ color: song.color }}>{song.title}</p>
          <p className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{song.bpm} BPM</p>
        </div>
        <div className="flex gap-4 font-mono text-sm">
          <div className="text-right">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>COMBO</p>
            <p className="font-bold" style={{ color: combo > 10 ? "#FFD700" : "#00FFF0" }}>{combo}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>TEMPO</p>
            <p className="font-bold text-white">{timeLeft}s</p>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full max-w-sm flex-1" style={{ maxHeight: CANVAS_H }}>
        <canvas
          ref={canvasRef}
          width={360}
          height={CANVAS_H}
          className="w-full"
          style={{ display: "block" }}
        />

        {/* Feedback overlay */}
        {feedback && (
          <div
            className="absolute pointer-events-none font-mono font-bold text-sm"
            style={{
              left: `${feedback.col * tileW_pct + tileW_pct / 2}%`,
              bottom: "22%",
              transform: "translateX(-50%)",
              color: feedback.type === "hit" ? song.color : "#FF0040",
              textShadow: `0 0 12px ${feedback.type === "hit" ? song.color : "#FF0040"}`,
            }}
          >
            {feedback.type === "hit" ? "PERFECT" : "MISS"}
          </div>
        )}
      </div>

      {/* Botoes de toque — 4 colunas */}
      <div className="w-full max-w-sm grid grid-cols-4 gap-2 px-3 pb-6 pt-3">
        {[0, 1, 2, 3].map(col => (
          <button
            key={col}
            onPointerDown={() => handleTap(col)}
            className="rounded-2xl font-mono font-bold text-xl transition-all active:scale-90 select-none"
            style={{
              height: 72,
              background: `${COL_COLORS[col]}18`,
              border: `2px solid ${COL_COLORS[col]}40`,
              color: COL_COLORS[col],
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            ▼
          </button>
        ))}
      </div>
    </div>
  )
}
