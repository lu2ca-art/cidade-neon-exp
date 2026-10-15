"use client"
/* eslint-disable react-hooks/immutability -- three.js: bola, câmera e rede são do motor, mexidas a cada quadro */

// BASQUETE (o ginásio, de dia), no jeito do Basketball Stars (referência do
// LU2CA): quadra de rua, a câmera atrás do arremessador. Arrasta o dedo pra
// cima: a barra de força sobe; solta pra arremessar. Duas faixas na barra:
// FORÇA PERFEITA (cesta limpa) e TABELA (entra batendo na tabela). O dedo
// pro lado erra pro lado. Às vezes a tabela acende com +8: de tabela vale 8.
// Três cestas seguidas, a bola pega fogo e vale o dobro. 60 segundos.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { aro, quica, rede, torcida } from "./sons"

const TEMPO = 60
const G = 9.8
const ARO = { y: 3.05, z: -6.6, r: 0.23 }
const TABELA_Z = ARO.z - 0.38
const ZONA = { perfeita: [0.6, 0.68] as const, tabela: [0.76, 0.84] as const }
const LUGARES: [number, number][] = [[0, -1.2], [-2.6, -1.6], [2.6, -1.6], [-1.4, -0.4], [1.4, -0.4]] // x, z do arremessador

// sorteio fixo pras texturas (o render tem que ser puro)
let semente = 7
const rnd = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647 }

type Resultado = "limpa" | "tabela" | "aro-entra" | "aro-sai" | "curta" | "longa" | "lado" | "fora"
interface Trecho { p0: THREE.Vector3; v0: THREE.Vector3; T: number }

// a parábola de p0 até p1 em T segundos
const parabola = (p0: THREE.Vector3, p1: THREE.Vector3, T: number): Trecho => ({ p0: p0.clone(), v0: new THREE.Vector3((p1.x - p0.x) / T, (p1.y - p0.y + 0.5 * G * T * T) / T, (p1.z - p0.z) / T), T })
const ponto = (t: Trecho, s: number, out: THREE.Vector3) => out.set(t.p0.x + t.v0.x * s, t.p0.y + t.v0.y * s - 0.5 * G * s * s, t.p0.z + t.v0.z * s)

// decide o que acontece e monta os trechos da bola
function arremesso(de: THREE.Vector3, forca: number, lado: number): { res: Resultado; trechos: Trecho[] } {
  const aro = new THREE.Vector3(0, ARO.y + 0.05, ARO.z)
  const dist = Math.hypot(aro.x - de.x, aro.z - de.z)
  const T = 0.95 + dist * 0.07
  const desvio = lado * 0.7
  const dentro = (f: number, z: readonly [number, number]) => f >= z[0] && f <= z[1]
  if (Math.abs(desvio) > 0.42) { const alvo = aro.clone().add(new THREE.Vector3(desvio * 1.4, -0.3, 0.3)); return { res: "fora", trechos: [parabola(de, alvo, T), parabola(alvo, alvo.clone().add(new THREE.Vector3(desvio, -2.9, -1.5)), 0.7)] } }
  if (Math.abs(desvio) > 0.13) { const bate = aro.clone().add(new THREE.Vector3(Math.sign(desvio) * ARO.r, 0, 0)); return { res: "lado", trechos: [parabola(de, bate, T), parabola(bate, bate.clone().add(new THREE.Vector3(Math.sign(desvio) * 1.2, -2.6, 0.6)), 0.75)] } }
  const centro = aro.clone().add(new THREE.Vector3(desvio * 0.5, 0, 0))
  const embaixo = centro.clone().add(new THREE.Vector3(0, -2.6, 0.15))
  if (dentro(forca, ZONA.perfeita)) return { res: "limpa", trechos: [parabola(de, centro, T), parabola(centro, embaixo, 0.55)] }
  if (dentro(forca, ZONA.tabela)) { const tab = new THREE.Vector3(centro.x, ARO.y + 0.42, TABELA_Z + 0.06); return { res: "tabela", trechos: [parabola(de, tab, T * 1.02), parabola(tab, centro, 0.3), parabola(centro, embaixo, 0.55)] } }
  if (forca < ZONA.perfeita[0] - 0.08) { const frente = centro.clone().add(new THREE.Vector3(0, -0.02, ARO.r)); return { res: "curta", trechos: [parabola(de, frente, T), parabola(frente, frente.clone().add(new THREE.Vector3(desvio, -2.7, 1.6)), 0.75)] } }
  if (forca > ZONA.tabela[1] + 0.05) { const fundo = new THREE.Vector3(centro.x, ARO.y + 0.9, TABELA_Z + 0.06); return { res: "longa", trechos: [parabola(de, fundo, T * 1.05), parabola(fundo, fundo.clone().add(new THREE.Vector3(desvio * 2, -3.5, 2.4)), 0.9)] } }
  // perto, mas não na faixa: roda no aro e entra ou sai
  const tras = centro.clone().add(new THREE.Vector3(0, 0, -ARO.r * 0.9))
  const entra = Math.random() < 0.5
  return entra ? { res: "aro-entra", trechos: [parabola(de, tras, T), parabola(tras, centro.clone().add(new THREE.Vector3(0, 0.05, 0)), 0.3), parabola(centro, embaixo, 0.55)] } : { res: "aro-sai", trechos: [parabola(de, tras, T), parabola(tras, tras.clone().add(new THREE.Vector3(desvio * 2 + (Math.random() - 0.5), -2.8, 1.2)), 0.8)] }
}

// o arremessador: um corpo simples, de costas, com a camisa 222
function Jogador({ pos, bracos }: { pos: THREE.Vector3; bracos: React.RefObject<number> }) {
  const camisa = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 128; c.height = 128; const g = c.getContext("2d")!
    g.fillStyle = "#ff6a1a"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#1b1530"; g.font = "900 56px Arial Black, sans-serif"; g.textAlign = "center"; g.fillText("222", 64, 84)
    return new THREE.CanvasTexture(c)
  }, [])
  const esq = useRef<THREE.Group>(null), dir = useRef<THREE.Group>(null)
  useFrame(() => { const k = bracos.current ?? 0; for (const b of [esq.current, dir.current]) if (b) b.rotation.x = -0.4 - k * 2.4 })
  return (
    <group position={pos}>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.36, 0.9, 0.22]} /><meshStandardMaterial color="#2a5bd7" /></mesh>
      <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.46, 0.7, 0.26]} /><meshStandardMaterial map={camisa} /></mesh>
      <mesh position={[0, 1.78, 0]}><sphereGeometry args={[0.15, 16, 12]} /><meshStandardMaterial color="#5a3a26" /></mesh>
      {[[-0.3, esq], [0.3, dir]].map(([x, r], i) => (
        <group key={i} ref={r as React.RefObject<THREE.Group>} position={[x as number, 1.52, 0]}><mesh position={[0, -0.3, 0]}><boxGeometry args={[0.11, 0.6, 0.11]} /><meshStandardMaterial color="#5a3a26" /></mesh></group>
      ))}
    </group>
  )
}

// a quadra de rua: o piso, as linhas, os prédios do subúrbio, o grafite, a cesta
function Quadra({ bonus }: { bonus: boolean }) {
  const janelas = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 64; const g = c.getContext("2d")!
    g.fillStyle = "#c27a52"; g.fillRect(0, 0, 64, 64)
    for (let y = 6; y < 64; y += 16) for (let x = 6; x < 64; x += 16) { g.fillStyle = rnd() > 0.5 ? "#ffe0a0" : "#2a1c18"; g.fillRect(x, y, 8, 10) }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t
  }, [])
  const grafite = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d")!
    g.fillStyle = "#3a2a2a"; g.fillRect(0, 0, 512, 128)
    const cores = ["#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0", "#b38cff"]
    for (let k = 0; k < 9; k++) { g.strokeStyle = cores[k % 5]; g.lineWidth = 10 + k; g.beginPath(); g.moveTo(rnd() * 512, 20 + rnd() * 90); g.bezierCurveTo(rnd() * 512, 0, rnd() * 512, 128, rnd() * 512, 30 + rnd() * 70); g.stroke() }
    g.font = "900 64px Arial Black, sans-serif"; g.fillStyle = "#ffc857"; g.strokeStyle = "#1b1530"; g.lineWidth = 6; g.strokeText("222", 330, 92); g.fillText("222", 330, 92)
    return new THREE.CanvasTexture(c)
  }, [])
  const quadro = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 150; const g = c.getContext("2d")!
    g.fillStyle = "#f2f0ea"; g.fillRect(0, 0, 256, 150); g.strokeStyle = bonus ? "#ffd400" : "#d8d4c8"; g.lineWidth = bonus ? 14 : 6; g.strokeRect(4, 4, 248, 142)
    g.strokeStyle = "#e85a1a"; g.lineWidth = 5; g.strokeRect(92, 70, 72, 52)
    if (bonus) { g.fillStyle = "#1b6a2a"; g.font = "900 54px Arial Black, sans-serif"; g.textAlign = "center"; g.fillText("+8", 128, 60) }
    return new THREE.CanvasTexture(c)
  }, [bonus])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -3]}><planeGeometry args={[18, 18]} /><meshStandardMaterial color="#3a3d4a" roughness={0.9} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, -5]}><ringGeometry args={[5.9, 6.0, 64, 1, Math.PI * 1.08, Math.PI * 0.84]} /><meshBasicMaterial color="#e8e6dc" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.006, -5.3]}><planeGeometry args={[3.6, 4.6]} /><meshStandardMaterial color="#2f8a54" /></mesh>
      {/* os prédios do subúrbio em volta */}
      {[[-7, 3.5, -10, 5, 7], [-1.5, 4.5, -11, 6, 9], [5, 3, -10, 5, 6], [8.5, 4, -6, 3, 8], [-8.5, 3.5, -5, 3, 7]].map(([x, h, z, w, a], i) => (
        <mesh key={i} position={[x, h, z]}><boxGeometry args={[w, a, 3]} /><meshStandardMaterial map={janelas} /></mesh>
      ))}
      <mesh position={[0, 1, -8.4]}><planeGeometry args={[9, 2]} /><meshStandardMaterial map={grafite} /></mesh>
      {/* a cesta: poste, tabela, aro e a rede */}
      <mesh position={[0, 1.6, TABELA_Z - 0.6]}><cylinderGeometry args={[0.08, 0.1, 3.2, 10]} /><meshStandardMaterial color="#3a6a3a" /></mesh>
      <mesh position={[0, 3.25, TABELA_Z - 0.3]}><boxGeometry args={[0.12, 0.12, 0.6]} /><meshStandardMaterial color="#3a6a3a" /></mesh>
      <mesh position={[0, ARO.y + 0.42, TABELA_Z]}><planeGeometry args={[1.8, 1.05]} /><meshStandardMaterial map={quadro} emissive={bonus ? "#ffd400" : "#000000"} emissiveIntensity={bonus ? 0.25 : 0} /></mesh>
      <mesh position={[0, ARO.y, ARO.z]} rotation-x={Math.PI / 2}><torusGeometry args={[ARO.r, 0.018, 8, 32]} /><meshStandardMaterial color="#e8501a" /></mesh>
    </group>
  )
}

function Rede({ balanco }: { balanco: React.RefObject<number> }) {
  const r = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => { const b = balanco.current ?? 0; balanco.current = Math.max(0, b - dt * 2.5); if (r.current) { r.current.scale.set(1 - b * 0.25, 1 + b * 0.5, 1 - b * 0.25) } })
  return <mesh ref={r} position={[0, ARO.y - 0.22, ARO.z]}><cylinderGeometry args={[ARO.r, ARO.r * 0.6, 0.42, 14, 3, true]} /><meshStandardMaterial color="#f4f4f4" wireframe /></mesh>
}

interface Estado { voando: boolean; trechos: Trecho[]; k: number; s: number; res: Resultado; fim: number }

function Cena({ lugar, voo, bracos, balanco, bonus, fogo }: { lugar: THREE.Vector3; voo: React.RefObject<Estado>; bracos: React.RefObject<number>; balanco: React.RefObject<number>; bonus: boolean; fogo: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const bola = useRef<THREE.Mesh>(null), chama = useRef<THREE.Mesh>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const camAlvo = useMemo(() => new THREE.Vector3(), [])
  const olhar = useMemo(() => new THREE.Vector3(0, ARO.y - 0.4, ARO.z), [])
  useFrame((_, dt) => {
    const v = voo.current
    // a bola: na mão, ou voando trecho por trecho
    if (v.voando) {
      v.s += dt
      while (v.k < v.trechos.length && v.s > v.trechos[v.k].T) { v.s -= v.trechos[v.k].T; v.k++; if (v.k < v.trechos.length) { if (v.res === "limpa" && v.k === 1) { rede(); balanco.current = 1 } else if (v.k === 1) { aro() } if ((v.res === "tabela" || v.res === "aro-entra") && v.k === v.trechos.length - 1) { rede(); balanco.current = 1 } } }
      if (v.k >= v.trechos.length) { const u = v.trechos[v.trechos.length - 1]; ponto(u, u.T, tmp); if (v.fim === 0) { v.fim = 0.6; quica(0.6) } }
      else ponto(v.trechos[v.k], v.s, tmp)
      bola.current?.position.copy(tmp)
    } else bola.current?.position.set(lugar.x + 0.32, 1.75 + (bracos.current ?? 0) * 0.6, lugar.z - 0.2)
    if (chama.current && bola.current) { chama.current.position.copy(bola.current.position); chama.current.visible = fogo; chama.current.scale.setScalar(1 + Math.sin(performance.now() / 60) * 0.12) }
    // a câmera: atrás do arremessador; com a bola no ar, vai junto até a cesta
    // (sobe e avança um pouco, olhando entre a bola e o aro)
    const b = bola.current?.position
    if (v.voando) camAlvo.set(lugar.x * 0.6, 3.2, lugar.z + 1.6); else camAlvo.set(lugar.x * 0.9 - 0.55, 2.75, lugar.z + 4.2)
    camera.position.lerp(camAlvo, Math.min(1, dt * (v.voando ? 1.6 : 3)))
    if (v.voando && b) tmp.set(b.x * 0.4, Math.max(ARO.y - 0.3, b.y * 0.5 + ARO.y * 0.5), b.z * 0.4 + ARO.z * 0.6); else tmp.set(0, ARO.y - 0.35, ARO.z)
    olhar.lerp(tmp, Math.min(1, dt * 4))
    camera.lookAt(olhar)
  })
  return (
    <>
      <Quadra bonus={bonus} />
      <Rede balanco={balanco} />
      <Jogador pos={lugar} bracos={bracos} />
      <mesh ref={bola}><sphereGeometry args={[0.12, 20, 16]} /><meshStandardMaterial color="#e8661a" emissive={fogo ? "#ff5a00" : "#000000"} emissiveIntensity={fogo ? 0.8 : 0} roughness={0.7} /></mesh>
      <mesh ref={chama}><sphereGeometry args={[0.2, 12, 10]} /><meshBasicMaterial color="#ffb000" transparent opacity={0.35} depthWrite={false} /></mesh>
    </>
  )
}

export function Basquete({ onFim }: { onFim: (pontos: number, cestas: number) => void }) {
  const [pontos, setPontos] = useState(0)
  const [cestas, setCestas] = useState(0)
  const [resta, setResta] = useState(TEMPO)
  const [forca, setForca] = useState<number | null>(null)
  const [bonus, setBonus] = useState(false)
  const [seguidas, setSeguidas] = useState(0)
  const [msg, setMsg] = useState("")
  const [iLugar, setILugar] = useState(0)
  const [acabou, setAcabou] = useState(false)
  const lugar = useMemo(() => new THREE.Vector3(LUGARES[iLugar][0], 0, LUGARES[iLugar][1]), [iLugar])
  const voo = useRef<Estado>({ voando: false, trechos: [], k: 0, s: 0, res: "limpa", fim: 0 })
  const bracos = useRef(0), balanco = useRef(0)
  const toque = useRef<{ x: number; y: number } | null>(null)
  const t0 = useRef(0)
  const estado = useRef({ pontos: 0, cestas: 0, seguidas: 0, bonus: false })
  const fogo = seguidas >= 3

  useEffect(() => {
    t0.current = performance.now()
    const t = setInterval(() => { const r = Math.max(0, TEMPO - (performance.now() - t0.current) / 1000); setResta(Math.ceil(r)); if (r <= 0 && !voo.current.voando) { clearInterval(t); setAcabou(true) } }, 200)
    return () => clearInterval(t)
  }, [])

  const arremessar = (f: number, lado: number) => {
    const de = new THREE.Vector3(lugar.x + 0.05, 2.4, lugar.z - 0.3)
    const { res, trechos } = arremesso(de, f, lado)
    voo.current = { voando: true, trechos, k: 0, s: 0, res, fim: 0 }
    bracos.current = 1
    const dur = trechos.reduce((a, t) => a + t.T, 0)
    const caiu = res === "limpa" || res === "tabela" || res === "aro-entra"
    setTimeout(() => {
      const e = estado.current
      if (caiu) {
        e.seguidas++
        const base = res === "tabela" && e.bonus ? 8 : 2
        const ganho = base * (e.seguidas > 3 ? 2 : 1)
        e.pontos += ganho; e.cestas++
        setMsg(res === "limpa" ? `cesta limpa · +${ganho}` : res === "tabela" ? `de tabela · +${ganho}` : `rodou e entrou · +${ganho}`)
        torcida(res === "limpa" || ganho >= 8)
      } else { e.seguidas = 0; setMsg({ curta: "curta", longa: "longa", lado: "pro lado", fora: "passou longe", "aro-sai": "rodou e saiu" }[res as string] ?? "errou") }
      setPontos(e.pontos); setCestas(e.cestas); setSeguidas(e.seguidas)
      e.bonus = Math.random() < 0.3; setBonus(e.bonus)
      setTimeout(() => setMsg(""), 1100)
    }, dur * 1000)
    // volta a bola pra mão, num lugar novo depois de cesta
    setTimeout(() => { voo.current = { voando: false, trechos: [], k: 0, s: 0, res: "limpa", fim: 0 }; bracos.current = 0; if (caiu) setILugar((i) => (i + 1 + Math.floor(Math.random() * 3)) % LUGARES.length) }, dur * 1000 + 900)
  }

  // gancho de teste (fora de produção): window.__bq(forca, lado)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as { __bq?: (f: number, l: number) => void; __bqEstado?: () => object }
    w.__bq = (f, l) => { if (!voo.current.voando) arremessar(f, l) }
    w.__bqEstado = () => ({ ...estado.current, voando: voo.current.voando, res: voo.current.res })
  })

  // o gesto: arrastar pra cima enche a barra; soltar arremessa
  const down = (e: React.PointerEvent) => { if (voo.current.voando || acabou) return; toque.current = { x: e.clientX, y: e.clientY }; setForca(0) }
  const move = (e: React.PointerEvent) => { if (!toque.current) return; const h = (e.currentTarget as HTMLElement).clientHeight; const f = Math.max(0, Math.min(1, (toque.current.y - e.clientY) / (h * 0.45))); setForca(f); bracos.current = f * 0.4 }
  const up = (e: React.PointerEvent) => {
    const t = toque.current; toque.current = null
    if (!t || forca === null) return
    const w = (e.currentTarget as HTMLElement).clientWidth, lado = (e.clientX - t.x) / (w * 0.5)
    const f = forca; setForca(null)
    if (f < 0.12) { bracos.current = 0; return }
    arremessar(f, Math.max(-1, Math.min(1, lado)))
  }

  return (
    <div className="gi-jogo" style={{ touchAction: "none" }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { toque.current = null; setForca(null) }}>
      <Canvas dpr={[1, 1.75]} camera={{ fov: 55, near: 0.05, far: 60, position: [0, 2.5, 2] }} gl={{ antialias: true }} className="gi-cvs">
        <color attach="background" args={["#7fb2e0"]} />
        <fog attach="fog" args={["#9cc4e6", 14, 32]} />
        <hemisphereLight args={["#fff2dc", "#6a5a50", 1.5]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 9, 6]} intensity={1.6} />
        <Cena lugar={lugar} voo={voo} bracos={bracos} balanco={balanco} bonus={bonus} fogo={fogo} />
      </Canvas>
      <div className="gi-placar"><b>{pontos}</b><small>pontos{fogo ? " · em chamas ×2" : ""}</small><span>{resta}s</span></div>
      {/* a barra de força: as faixas da cesta limpa e da tabela */}
      <div className="bq-barra" aria-hidden>
        <i className="bq-faixa is-tabela" style={{ bottom: `${ZONA.tabela[0] * 100}%`, height: `${(ZONA.tabela[1] - ZONA.tabela[0]) * 100}%` }}><em>tabela</em></i>
        <i className="bq-faixa is-perfeita" style={{ bottom: `${ZONA.perfeita[0] * 100}%`, height: `${(ZONA.perfeita[1] - ZONA.perfeita[0]) * 100}%` }}><em>força perfeita</em></i>
        {forca !== null && <b className="bq-nivel" style={{ height: `${forca * 100}%` }} />}
      </div>
      {msg && <p className="gi-dica" style={{ top: "calc(110px + env(safe-area-inset-top))" }}>{msg}</p>}
      {!acabou && cestas === 0 && resta > 54 && !msg && <p className="gi-dica">arrasta pra cima até o verde e solta</p>}
      {acabou && (
        <div className="gi-fim">
          <b>{pontos}</b>
          <small>pontos · {cestas} cestas em 60 segundos</small>
          <button type="button" className="gi-btn" onClick={() => onFim(pontos, cestas)}>continuar</button>
        </div>
      )}
    </div>
  )
}
