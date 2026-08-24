"use client"

// /drive-v2 — Fase 2 da experiência 3D: Kombi pilotável com física real (Rapier),
// câmera 3ª pessoa elastic follow, chão infinito. Ainda sem cidade — foco em
// SENTIR a mecânica de dirigir antes de investir no mundo.
//
// Referência: Shopify Horizon Drive.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from "@react-three/rapier"
import Link from "next/link"
import { Suspense, useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { HUB_APPS, HUB_TILES, type HubAppUnlockState } from "@/lib/hub-apps"
import { AppIcon } from "@/components/AppIcon"
import { useCarRadio } from "@/hooks/useCarRadio"
import { TIER_META } from "@/lib/radio-tiers"
import { RadioMusicalPanel } from "@/components/DriveHUD/RadioMusicalPanel"
import { CarPanelDisplay } from "@/components/DriveCockpit/CarPanelDisplay"
import { PortaLuvasModal } from "@/components/DriveHUD/PortaLuvasModal"
import { Speedometer } from "@/components/DriveHUD/Speedometer"
import type { InventoryAction } from "@/lib/inventory-items"
import { CyberpunkCity, magentaSpawn } from "@/components/DriveCockpit/CyberpunkCity"
import { NeonDesert } from "@/components/DriveCockpit/NeonDesert"
import { CidadeNeonSplash } from "@/components/DriveCockpit/CidadeNeonSplash"
import { Kombi } from "@/components/DriveCockpit/Kombi"
import { KOMBI_LAYOUT, KOMBI_COLLIDER_HALF } from "@/lib/kombi-layout"
import { useRouter } from "next/navigation"

// ─── Corpo físico do carro + controles de teclado ───────────────────────────
interface VanBodyProps {
  bodyRef: React.MutableRefObject<RapierRigidBody | null>
  showCockpit: boolean
  onCockpitItem?: (item: "radio" | "pads" | "toca" | "portaLuvas") => void
  isPlaying: boolean
  speedRef: React.MutableRefObject<number>  // atualizado pelo useFrame, lido pelo Kombi
  carRadioActiveTier: import("@/lib/radio-tiers").Tier
  carRadioDialPct: number
  carRadioOn: boolean
  carPanelDisplay?: React.ReactNode
}

function VanBody({ bodyRef, showCockpit, onCockpitItem, isPlaying, speedRef, carRadioActiveTier, carRadioDialPct, carRadioOn, carPanelDisplay }: VanBodyProps) {
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false, jet: false })
  // Alocações reutilizáveis pro useFrame — evita GC pressure por frame
  const tmpQuat = useRef(new THREE.Quaternion())
  const tmpForward = useRef(new THREE.Vector3())
  const tmpLinvelDot = useRef(new THREE.Vector3())

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "w" || k === "arrowup") { e.preventDefault(); keys.current.w = true }
      if (k === "s" || k === "arrowdown") { e.preventDefault(); keys.current.s = true }
      if (k === "a" || k === "arrowleft") { keys.current.a = true }
      if (k === "d" || k === "arrowright") { keys.current.d = true }
      if (k === "shift") { keys.current.shift = true }
      if (k === "f" || k === " ") { e.preventDefault(); keys.current.jet = true }
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "w" || k === "arrowup") { keys.current.w = false }
      if (k === "s" || k === "arrowdown") { keys.current.s = false }
      if (k === "a" || k === "arrowleft") { keys.current.a = false }
      if (k === "d" || k === "arrowright") { keys.current.d = false }
      if (k === "shift") { keys.current.shift = false }
      if (k === "f" || k === " ") { keys.current.jet = false }
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [])

  useFrame(() => {
    const body = bodyRef.current
    if (!body) return

    const rot = body.rotation()
    tmpQuat.current.set(rot.x, rot.y, rot.z, rot.w)
    // vetor "forward" local (-Z) rotacionado pra world space (reutiliza ref)
    tmpForward.current.set(0, 0, -1).applyQuaternion(tmpQuat.current)
    const forward = tmpForward.current

    // ── Tuning arcade estilo Horizon Drive ──
    // Aceleração AGRESSIVA (responde na hora), velocidade alta, turn CONSTANTE
    // (não depende de velocidade — vira igual estacionado ou em 200km/h).
    const MAX_SPEED = keys.current.shift ? 65 : 42
    const ACCEL = 0.9   // ramp-up rápido
    const BRAKE = 1.0
    const TURN_RATE = 2.6

    // velocidade linear atual (reutiliza ref)
    const linvel = body.linvel()
    tmpLinvelDot.current.set(linvel.x, 0, linvel.z)
    const currentSpeed = tmpLinvelDot.current.dot(forward)

    // acelera / freia — resposta arcade instantânea
    let targetSpeed = currentSpeed
    if (keys.current.w) targetSpeed = Math.min(MAX_SPEED, currentSpeed + ACCEL * MAX_SPEED / 3)
    else if (keys.current.s) targetSpeed = Math.max(-MAX_SPEED * 0.4, currentSpeed - BRAKE * MAX_SPEED / 3)
    else targetSpeed = currentSpeed * 0.997 // atrito mínimo — mantém velocidade tipo arcade

    // JETPACK — F ou Espaço aplica impulso vertical (permite subir pra
    // pistas altas cyan Y=8 e yellow Y=14). Sem limite de combustível.
    let vy = linvel.y
    if (keys.current.jet) {
      const JET_POWER = 22 // velocidade vertical alvo
      vy = Math.max(vy, 0) + JET_POWER * 0.15 // acelera suave até JET_POWER
      if (vy > JET_POWER) vy = JET_POWER
    }

    // aplica velocidade linear apenas no plano do forward (sem alocar Vector3)
    const nvX = forward.x * targetSpeed
    const nvZ = forward.z * targetSpeed
    body.setLinvel({ x: nvX, y: vy, z: nvZ }, true)

    // direção: CONSTANTE tipo arcade (não depende de velocidade — Horizon-style)
    let angvelY = 0
    if (keys.current.a) angvelY = TURN_RATE
    if (keys.current.d) angvelY = -TURN_RATE
    if (currentSpeed < -0.5) angvelY = -angvelY
    body.setAngvel({ x: 0, y: angvelY, z: 0 }, true)

    // Atualiza speedRef (magnitude horizontal) pro Kombi (roda spin) sem setState
    const horizSpeed = Math.sqrt(linvel.x * linvel.x + linvel.z * linvel.z)
    speedRef.current = horizSpeed
  })

  const half = KOMBI_COLLIDER_HALF as unknown as [number, number, number]
  // sync steer visual das rodas com o steer real do jogador
  const steerVisual = keys.current.a ? 1 : keys.current.d ? -1 : 0

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={magentaSpawn()}
      rotation={[0, 0, 0]}
      restitution={0.2}
      friction={0.3}
      linearDamping={0.02}
      angularDamping={4}
      enabledRotations={[false, true, false]}
    >
      <CuboidCollider args={half} />
      {/* Kombi hippie — layout exato do /kombi-editor. Em 3ª pessoa mostra
          só exterior (interior bloqueia visão); em 1ª pessoa mostra o
          interior completo (câmera dentro do carro). */}
      <Kombi
        isPlaying={isPlaying}
        steerValue={steerVisual}
        wheelSpinRef={speedRef}
        hideExterior={false}
        hideInterior={!showCockpit}
        onItemClick={onCockpitItem}
        radioHub={{
          freq: TIER_META[carRadioActiveTier].freq,
          stationLabel: TIER_META[carRadioActiveTier].label,
          radioOn: carRadioOn,
        }}
      />
      {carPanelDisplay}
    </RigidBody>
  )
}

// ─── Câmera 3ª pessoa (elastic follow atrás e acima da van) ─────────────────
export type CameraMode = "third" | "first"

function ThirdPersonCamera({ target }: { target: React.MutableRefObject<RapierRigidBody | null> }) {
  const { camera, gl } = useThree()
  const desiredPos = useRef(new THREE.Vector3(0, 6, 12))
  const desiredLook = useRef(new THREE.Vector3(0, 1, 0))
  // Orbit atual + target (pra retorno automático quando solta o mouse)
  const yaw = useRef(0)
  const pitch = useRef(0.35)
  const targetYaw = useRef(0)
  const targetPitch = useRef(0.35)
  const zoom = useRef(1)
  const dragging = useRef(false)
  // Alocações reutilizáveis pro useFrame
  const camQuat = useRef(new THREE.Quaternion())
  const camBackward = useRef(new THREE.Vector3())
  const camAxisY = useRef(new THREE.Vector3(0, 1, 0))

  useEffect(() => {
    const el = gl.domElement
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      dragging.current = true
      el.style.cursor = "grabbing"
    }
    const onUp = () => {
      dragging.current = false
      el.style.cursor = "grab"
      // Auto-return: ao soltar, targetYaw volta pra 0 (atrás da van)
      // e pitch pro padrão. yaw/pitch atuais interpolam via useFrame.
      targetYaw.current = 0
      targetPitch.current = 0.35
    }
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      targetYaw.current -= e.movementX * 0.005
      targetPitch.current = Math.max(0.1, Math.min(1.3, targetPitch.current - e.movementY * 0.005))
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoom.current = Math.max(0.6, Math.min(5, zoom.current + e.deltaY * 0.002))
    }
    el.style.cursor = "grab"
    el.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("mousemove", onMove)
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      el.style.cursor = ""
      el.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("mousemove", onMove)
      el.removeEventListener("wheel", onWheel)
    }
  }, [gl])

  useFrame((_, delta) => {
    const body = target.current
    if (!body) return

    const lerpRate = dragging.current ? 20 : 4
    const l = 1 - Math.exp(-delta * lerpRate)
    yaw.current += (targetYaw.current - yaw.current) * l
    pitch.current += (targetPitch.current - pitch.current) * l

    const t = body.translation()
    const r = body.rotation()
    camQuat.current.set(r.x, r.y, r.z, r.w)

    // Van forward LOCAL = -Z. Backward local = +Z. Rotaciona pelo quaternion
    // da van pra ter world backward. Reutiliza refs — evita GC.
    camBackward.current.set(0, 0, 1).applyQuaternion(camQuat.current)
    camBackward.current.applyAxisAngle(camAxisY.current, yaw.current)
    const backward = camBackward.current

    const BASE_DIST = 11
    const dist = BASE_DIST * zoom.current
    const height = Math.sin(pitch.current) * dist + 1.5
    const horiz = Math.cos(pitch.current) * dist

    // Câmera = van + backward * horiz (no plano XZ) + altura
    desiredPos.current.set(
      t.x + backward.x * horiz,
      t.y + height,
      t.z + backward.z * horiz
    )
    desiredLook.current.set(t.x, t.y + 0.5, t.z)

    const lerpPos = 1 - Math.exp(-delta * 6)
    camera.position.lerp(desiredPos.current, lerpPos)
    camera.lookAt(desiredLook.current)
  })

  return null
}

// ─── Câmera 1ª pessoa (cockpit-locked, free-look com auto-return) ───────────
// Câmera fixada na cabeça do motorista (relativo à van). Ao clicar+arrastar
// o mouse, olha até ±150° yaw (300° total) e ±60° pitch. Ao soltar, volta
// suave pro centro (olhando pra frente, feel de dirigir).
const YAW_LIMIT = (150 * Math.PI) / 180   // ±150°
const PITCH_LIMIT = (60 * Math.PI) / 180  // ±60°
const MOUSE_SENSITIVITY = 0.0025
// Offset do banco motorista relativo à van, em coordenadas locais.
// Banco motorista está em [-0.35, 0.15, 1.0] no LAYOUT; cabeça sentada fica
// bem acima do assento e RECUADA (Z=1.2) pra dar espaço ao volante+painel
// ficarem na frente sem cortar. Feel de "sentado na Kombi olhando pro
// para-brisa com o volante bem visível".
// Câmera FP = posição EXATA da camera-motorista definida por LU2CA no /kombi-editor
const HEAD_OFFSET_LOCAL = new THREE.Vector3(...KOMBI_LAYOUT.cameraMotorista.position)

function CockpitFPCamera({ target }: { target: React.MutableRefObject<RapierRigidBody | null> }) {
  const { camera, gl } = useThree()
  const yaw = useRef(0)     // atual
  const pitch = useRef(0)   // atual
  const targetYaw = useRef(0)   // pra onde queremos (segue mouse OU 0 se soltou)
  const targetPitch = useRef(0)
  const dragging = useRef(false)

  useEffect(() => {
    const el = gl.domElement
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return
      dragging.current = true
      el.style.cursor = "grabbing"
    }
    const onUp = () => {
      dragging.current = false
      el.style.cursor = "grab"
      // ao soltar, mira volta pro centro (motorista olha pra frente)
      targetYaw.current = 0
      targetPitch.current = 0
    }
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      targetYaw.current = Math.max(-YAW_LIMIT, Math.min(YAW_LIMIT, targetYaw.current - e.movementX * MOUSE_SENSITIVITY))
      targetPitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, targetPitch.current - e.movementY * MOUSE_SENSITIVITY))
    }
    el.style.cursor = "grab"
    el.addEventListener("mousedown", onDown)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("mousemove", onMove)
    return () => {
      el.style.cursor = ""
      el.removeEventListener("mousedown", onDown)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("mousemove", onMove)
    }
  }, [gl])

  useFrame((_, delta) => {
    const body = target.current
    if (!body) return

    // interpola yaw/pitch atual em direção ao target — feel elástico
    const lerp = 1 - Math.exp(-delta * (dragging.current ? 14 : 5))
    yaw.current += (targetYaw.current - yaw.current) * lerp
    pitch.current += (targetPitch.current - pitch.current) * lerp

    const t = body.translation()
    const r = body.rotation()
    const vanQuat = new THREE.Quaternion(r.x, r.y, r.z, r.w)

    // Posição alvo da cabeça em world space
    const headPos = HEAD_OFFSET_LOCAL.clone().applyQuaternion(vanQuat)
    headPos.add(new THREE.Vector3(t.x, t.y, t.z))
    // Sutil inércia: cabeça "atrasa" um pouco atrás da van (feel força G)
    const posLerp = 1 - Math.exp(-delta * 22)
    camera.position.lerp(headPos, posLerp)

    // Rotação: van_yaw ∘ camera_yaw ∘ camera_pitch
    // Slerp suave em vez de copy direto — dá inércia à cabeça quando a van vira.
    const cameraQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, "YXZ"))
    const desiredQuat = vanQuat.clone().multiply(cameraQuat)
    const rotLerp = 1 - Math.exp(-delta * 18)
    camera.quaternion.slerp(desiredQuat, rotLerp)
  })

  return null
}

// ─── Página ─────────────────────────────────────────────────────────────────
export default function DriveV2Page() {
  const vanBodyRef = useRef<RapierRigidBody | null>(null)
  // speed é REF (não state) — atualizado pelo VanBody useFrame + lido pelo
  // Kombi (rodas girando) e Speedometer (interval + DOM direto). Sem
  // setState no root: elimina 12 re-renders/s que reinstanciavam handlers.
  const speedRef = useRef(0)
  const [cameraMode, setCameraMode] = useState<CameraMode>("third")
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const [portaLuvasOpen, setPortaLuvasOpen] = useState(false)
  // Splash controlado: aparece até LU2CA clicar PLAY (assegura que a cidade
  // já está carregada quando a experiência começa)
  const [splashVisible, setSplashVisible] = useState(true)

  const audio = useAudioPlayer()
  const funnel = useGameFunnel()
  const router = useRouter()
  const carRadio = useCarRadio()
  const appsUnlocked = funnel.state.appsUnlocked
  const radioAccepted = funnel.state.radioAccepted
  const hubUnlock: HubAppUnlockState = {
    radioAnyAccepted: Object.values(radioAccepted).some(Boolean),
    nectar: appsUnlocked.nectar,
    feelGood: appsUnlocked.feelGood,
    guitarDriver: appsUnlocked.guitarDriver,
  }

  // Handler de clique em item 3D do cockpit → ação correspondente
  const onCockpitItem = (item: "radio" | "pads" | "toca" | "portaLuvas") => {
    if (item === "radio") setPhoneOpen(true)
    else if (item === "pads") router.push("/batida")
    else if (item === "toca") setPortaLuvasOpen(true)  // toca-discos abre porta-luvas pra escolher disco
    else if (item === "portaLuvas") setPortaLuvasOpen(true)
  }

  // Ação de item do inventário — dispara o efeito específico
  const onInventoryAction = (action: InventoryAction) => {
    if (action.type === "play-disc") {
      // Toca o disco selecionado no elemento de áudio do carRadio
      const el = carRadio.audioRef.current
      if (!el) return
      carRadio.setRadioOn(true)
      el.src = action.file
      el.play().catch(() => {})
    } else if (action.type === "open-url") {
      window.open(action.url, "_blank")
    }
    // toggle-effect: placeholder por enquanto
  }

  const isFirstPerson = cameraMode === "first"

  // Respawn: se cair muito abaixo do chão, teleporta pro spawn.
  useEffect(() => {
    const id = setInterval(() => {
      const b = vanBodyRef.current
      if (!b) return
      const t = b.translation()
      if (t.y < -8) {
        const spawn = magentaSpawn()
        b.setTranslation({ x: spawn[0], y: spawn[1] + 2, z: spawn[2] }, true)
        b.setLinvel({ x: 0, y: 0, z: 0 }, true)
        b.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }
    }, 80)
    return () => clearInterval(id)
  }, [])

  // V alterna 1ª ↔ 3ª pessoa
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "v") {
        setCameraMode((m) => (m === "third" ? "first" : "third"))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Toast de notificação do celular (chega via AudioBridge do iframe)
  const [phoneNotif, setPhoneNotif] = useState<null | {
    app: string
    icon: string
    color: string
    title: string
    body: string
  }>(null)
  const notifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Escuta mensagens do iframe do celular: fechar phone, mute rádio,
  // selecionar tier, notificações. Mesmo protocolo do /drive antigo.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data = e.data
      if (!data?.type) return
      switch (data.type) {
        case "CLOSE_PHONE":
          setPhoneOpen(false)
          break
        case "CAR_RADIO_MUTE":
          carRadio.setRadioMuted(true)
          break
        case "CAR_RADIO_UNMUTE":
          carRadio.setRadioMuted(false)
          break
        case "SELECT_RADIO_TIER":
          if (data.tier) carRadio.selectTier(data.tier)
          break
        case "PHONE_NOTIFICATION": {
          const { app, icon, color, title, body, isMission } = data
          setPhoneNotif({ app, icon, color, title, body })
          if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current)
          // Missões ficam até a pessoa fechar; notificações comuns somem em 5s
          if (!isMission) {
            notifTimeoutRef.current = setTimeout(() => setPhoneNotif(null), 5000)
          }
          break
        }
      }
    }
    window.addEventListener("message", onMsg)
    return () => {
      window.removeEventListener("message", onMsg)
      if (notifTimeoutRef.current) clearTimeout(notifTimeoutRef.current)
    }
  }, [carRadio])

  return (
    <div className="relative h-screen w-screen bg-[#050510]">
      {/* Splash "CIDADE NEON · PLAY" — some ao clicar PLAY, garante que a
          cidade já renderizou antes do user ver as coisas se formando. */}
      <CidadeNeonSplash visible={splashVisible} onDismiss={() => setSplashVisible(false)} />
      {/* Elemento de áudio do rádio do carro — controlado pelo useCarRadio */}
      <audio ref={carRadio.audioRef} loop />
      {/* aplica volume ao audio real */}
      {(() => {
        if (carRadio.audioRef.current) carRadio.audioRef.current.volume = volume
        return null
      })()}
      {/* HUD */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 text-white">
        <h1 className="text-xl font-light tracking-widest">DRIVE · V2</h1>
        <p className="mt-1 text-xs text-neutral-400">Kombi pilotável · física Rapier · 3ª pessoa</p>
        <p className="mt-3 text-[10px] text-neutral-500">
          <kbd className="rounded border border-white/20 px-1.5">W/↑</kbd> acelera ·{" "}
          <kbd className="rounded border border-white/20 px-1.5">S/↓</kbd> freia/ré ·{" "}
          <kbd className="rounded border border-white/20 px-1.5">A D ← →</kbd> vira ·{" "}
          <kbd className="rounded border border-white/20 px-1.5">Shift</kbd> boost ·{" "}
          <kbd className="rounded border border-white/20 px-1.5">F/␣</kbd> 🔥 jetpack ·{" "}
          <kbd className="rounded border border-white/20 px-1.5">V</kbd> visão
        </p>
        {isFirstPerson && (
          <p className="mt-1 text-[10px] text-[#00ffff]/80">
            dentro do carro: <b>segure o mouse e arraste</b> pra olhar (até 300°) · clique nos itens do painel pra abrir
          </p>
        )}
        {!isFirstPerson && (
          <p className="mt-1 text-[10px] text-[#ff00ff]/70">
            3ª pessoa · exploração · aperte V pra entrar no cockpit e usar rádio/hub/apps
          </p>
        )}
      </div>

      {/* Camera mode indicator + botão */}
      <button
        onClick={() => setCameraMode((m) => (m === "third" ? "first" : "third"))}
        className="pointer-events-auto absolute right-6 top-6 z-10 rounded-lg border border-white/15 bg-black/80 px-4 py-2 text-xs uppercase tracking-widest text-white backdrop-blur-md hover:bg-white/10"
      >
        {cameraMode === "third" ? "3ª pessoa" : "1ª pessoa"} · trocar
      </button>

      {/* Speedometer isolado — lê linvel + escreve DOM direto (sem setState) */}
      <Speedometer bodyRef={vanBodyRef} />

      {/* Painel Musical Horizontal — SÓ em 3ª pessoa. Em 1ª pessoa quem
          exibe é o CarPanelDisplay ancorado ao rádio 3D. */}
      {!isFirstPerson && (
        <RadioMusicalPanel
          radio={carRadio}
          funnelRadioAccepted={funnel.state.radioAccepted}
          volume={volume}
          onVolumeChange={setVolume}
        />
      )}

      {/* Toast de notificações do celular (aparece quando AudioBridge manda) */}
      {phoneNotif && (
        <div
          className="pointer-events-auto absolute left-1/2 top-6 z-30 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-white/15 bg-black/85 px-4 py-3 backdrop-blur-md"
          style={{
            boxShadow: `0 0 24px ${phoneNotif.color}66`,
            borderColor: `${phoneNotif.color}55`,
          }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: phoneNotif.color }}
          >
            <AppIcon icon={phoneNotif.icon} size={20} />
          </div>
          <div className="min-w-[10rem]">
            <div className="text-[9px] font-mono uppercase tracking-widest text-white/50">
              {phoneNotif.app} · {phoneNotif.title}
            </div>
            <div className="text-xs text-white">{phoneNotif.body}</div>
          </div>
          <button
            onClick={() => setPhoneNotif(null)}
            className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      )}

      {/* Player mini antigo REMOVIDO — substituído pelo RadioMusicalPanel único
          que muda de posição/tamanho baseado no modo de câmera. */}

      {/* HUB dock (bottom-left) — apps do celular. SÓ em 3ª pessoa.
          Em 1ª pessoa, os apps aparecem no CarPanelDisplay (dentro do carro,
          página "apps" swipeable). Interface FP fica limpa. */}
      {!isFirstPerson && (
      <div className="pointer-events-auto absolute bottom-6 left-6 z-10">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/85 px-3 py-2 backdrop-blur-md">
          {HUB_APPS.map((app) => {
            const isUnlocked = app.unlocked(hubUnlock)
            const inner = (
              <>
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: app.color, color: "#fff", opacity: isUnlocked ? 1 : 0.35 }}
                >
                  <AppIcon icon={app.icon} size={18} />
                </div>
                <div
                  className="mt-1 text-[8px] font-mono uppercase tracking-widest"
                  style={{ color: isUnlocked ? "#fff" : "rgba(255,255,255,0.4)" }}
                >
                  {app.label}
                </div>
              </>
            )
            if (!isUnlocked) {
              return (
                <div key={app.id} className="flex cursor-not-allowed flex-col items-center">
                  {inner}
                </div>
              )
            }
            if (app.external) {
              return (
                <a key={app.id} href={app.route} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center transition hover:scale-105">
                  {inner}
                </a>
              )
            }
            return (
              <Link key={app.id} href={app.route} className="flex flex-col items-center transition hover:scale-105">
                {inner}
              </Link>
            )
          })}
        </div>
      </div>
      )}

      {/* Botão celular flutuante — SÓ em 3ª pessoa. Em 1ª pessoa, o botão
          está dentro do CarPanelDisplay (página apps). */}
      {!isFirstPerson && (
        <button
          onClick={() => setPhoneOpen(true)}
          className="pointer-events-auto absolute right-6 top-[4.5rem] z-10 rounded-lg border border-white/15 bg-black/80 px-4 py-2 text-xs uppercase tracking-widest text-white backdrop-blur-md hover:bg-white/10"
        >
          📱 celular
        </button>
      )}

      {/* Porta-luvas / inventário */}
      <PortaLuvasModal
        open={portaLuvasOpen}
        onClose={() => setPortaLuvasOpen(false)}
        onAction={onInventoryAction}
      />

      {/* Celular clonado — usa o mesmo HUB do jogo original via iframe direto
          em ?screen=home&embedded=1. Nunca redireciona /drive-v2. O param
          embedded=1 faz a home mostrar botão "voltar ao carro" que fecha o
          modal via postMessage. */}
      {phoneOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setPhoneOpen(false)}
        >
          <div
            className="relative overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl"
            style={{
              width: "min(400px, 92vw)",
              height: "min(780px, 88vh)",
              boxShadow: "0 20px 80px rgba(255, 45, 120, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPhoneOpen(false)}
              aria-label="fechar celular"
              className="absolute right-2 top-2 z-20 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20"
            >
              ✕
            </button>
            <iframe
              src="/?screen=home&embedded=1"
              className="h-full w-full border-0"
              title="celular · hub do carro"
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* Sem `shadows` — cena é NEON (emissive), sombra real não agrega.
          Bottleneck #4 (agentes de perf): -15-25fps. */}
      <Canvas camera={{ position: [8, 6, 12], fov: isFirstPerson ? 78 : 55 }}>
        <Suspense fallback={null}>
          <color attach="background" args={["#0a0521"]} />
          {/* Fog longo pra deserto aparecer no horizonte com dissolve suave */}
          <fog attach="fog" args={["#4a0e6e", 250, 1400]} />

          <ambientLight intensity={0.9} />
          <hemisphereLight args={["#8899ff", "#221133", 0.6]} />
          <directionalLight position={[40, 60, 30]} intensity={1.6} />
          <directionalLight position={[-30, 40, -20]} intensity={0.7} color="#ff2d78" />
          <directionalLight position={[20, 30, -30]} intensity={0.5} color="#00ffff" />
          <pointLight position={[0, 20, 0]} intensity={1.2} color="#ffcc00" distance={80} />

          <Physics gravity={[0, -18, 0]}>
            <VanBody
              bodyRef={vanBodyRef}
              showCockpit={isFirstPerson}
              onCockpitItem={onCockpitItem}
              isPlaying={audio.playing || carRadio.radioOn}
              speedRef={speedRef}
              carRadioActiveTier={carRadio.activeTier}
              carRadioDialPct={carRadio.dialPct}
              carRadioOn={carRadio.radioOn}
              carPanelDisplay={
                isFirstPerson ? (
                  <CarPanelDisplay
                    radio={carRadio}
                    funnelRadioAccepted={funnel.state.radioAccepted}
                    hubUnlock={hubUnlock}
                    volume={volume}
                    onVolumeChange={setVolume}
                    onOpenPhone={() => setPhoneOpen(true)}
                    hidden={portaLuvasOpen || phoneOpen}
                  />
                ) : null
              }
            />
            <CyberpunkCity />
          </Physics>

          {/* Deserto egípcio neon infinito — fora da cidade, cenário sem colisão */}
          <NeonDesert />

          {isFirstPerson ? (
            <CockpitFPCamera target={vanBodyRef} />
          ) : (
            <ThirdPersonCamera target={vanBodyRef} />
          )}
        </Suspense>
      </Canvas>
    </div>
  )
}

