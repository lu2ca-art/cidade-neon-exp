"use client"
/* eslint-disable react-hooks/immutability -- three.js: o patinador e a câmera mudam a cada passo */

// /teste/trincheiras (T11): os túneis, as raízes da cidade-árvore, jogáveis
// de patins. 3 rios secos em triângulo; nas pontas, as torres que sobem pra
// rua. As paredes são curvas: dá pra subir nelas e, rápido o bastante, voar
// da borda e voltar. Experiência solta (regra 5): entra no mapa depois que o
// dono aprovar.
//
// Desempenho: a física anda em passos fixos de 1/120 s e a tela interpola
// (o relógio do jogo); o mapa inteiro sai em 6 desenhos, sem luz de ponto.
// ?medir expõe __gl/__cena/__cam/__estado; ?auto liga o piloto automático
// (dá a volta pela linha do meio: a medição e o teste usam).

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Cinema } from "@/app/linha/estrada/Cinema"
import { Patinador } from "@/app/linha/estrada/Patins"
import { QUALIDADE } from "@/app/linha/estrada/qualidade"
import { DPR, ResolucaoDinamica } from "@/app/linha/estrada/resolucao"
import { geoAtlas, geoConcreto, geoNeon, geoPoeira, geoVidro, raizes, texturaAtlas } from "./geo"
import {
  AVENIDAS, COR_AVENIDA, NOME_AVENIDA, NOME_TORRE, PRACA, SUBIDA_MAX, TETO, TORRES, VOLTA,
  batenaTorre, ondeEsta, perfil,
} from "./mapa"
import "./trincheiras.css"

const PASSO = 1 / 120
const G = 22 // gravidade (forte: o pulo é seco, como nos jogos de patins)
const VMAX = 30, VJATO = 40 // m/s (108 e 144 km/h)
const NEVOA = "#1a0f24"

type Entrada = { frente: boolean; re: boolean; esq: boolean; dir: boolean; pulo: boolean; jato: boolean }
type Estado = {
  x: number; z: number; y: number; vx: number; vz: number; vy: number; yaw: number
  ar: boolean; incl: number; nx: number; nz: number; dist: number; jatoT: number
  ant: { x: number; z: number; y: number; yaw: number }
  onde: ReturnType<typeof ondeEsta>; iVolta: number; voos: number
}

function estadoInicial(): Estado {
  // começa na torre 1 (a dos TÚNEIS, a entrada do subúrbio), virado pro rio A
  const t = TORRES[0].c, a = AVENIDAS[0].pts[20]
  const yaw = Math.atan2(a.x - t.x, a.z - t.z)
  return { x: t.x, z: t.z, y: 0, vx: 0, vz: 0, vy: 0, yaw, ar: false, incl: 0, nx: 0, nz: 1, dist: 0, jatoT: 0, ant: { x: t.x, z: t.z, y: 0, yaw }, onde: ondeEsta(t.x, t.z), iVolta: 0, voos: 0 }
}

// o piloto automático: mira 22 m à frente na linha do meio da volta
function piloto(s: Estado): Entrada {
  const N = VOLTA.length
  let kb = s.iVolta, db = Infinity
  for (let d = -10; d <= 30; d++) { const k = (s.iVolta + d + N) % N, p = VOLTA[k], q = (p.x - s.x) ** 2 + (p.z - s.z) ** 2; if (q < db) { db = q; kb = k } }
  s.iVolta = kb
  const alvo = VOLTA[(kb + 11) % N]
  let dif = Math.atan2(alvo.x - s.x, alvo.z - s.z) - s.yaw
  dif = Math.atan2(Math.sin(dif), Math.cos(dif))
  return { frente: true, re: false, esq: dif > 0.04, dir: dif < -0.04, pulo: false, jato: false }
}

function passo(s: Estado, e: Entrada, dt: number) {
  s.ant = { x: s.x, z: s.z, y: s.y, yaw: s.yaw }
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), rx = fz, rz = -fx
  let v = s.vx * fx + s.vz * fz, lat = s.vx * rx + s.vz * rz
  const virar = (e.esq ? 1 : 0) - (e.dir ? 1 : 0)
  // no chão: vira mais devagar quanto mais rápido; no ar: gira (manobra)
  s.yaw += virar * (s.ar ? 4.2 : 2.6 / (1 + Math.abs(v) / 22) + 0.5) * dt
  if (!s.ar) {
    const teto = e.jato && s.jatoT < 2.5 ? VJATO : VMAX
    if (e.frente && v < teto) v += (e.jato ? 22 : 15) * (1 - Math.max(0, v) / (teto * 1.08)) * dt
    else if (v > teto) v -= 8 * dt
    if (e.re) v -= Math.sign(v) * Math.min(Math.abs(v), 26 * dt)
    if (!e.frente && !e.re) v -= Math.sign(v) * Math.min(Math.abs(v), 1.2 * dt)
    // a aderência das rodas: o de lado morre rápido (um pouco de deslize)
    lat *= Math.exp(-7 * dt)
  }
  // o jato tem fôlego (2,5 s) e recarrega
  s.jatoT = e.jato && e.frente ? Math.min(3, s.jatoT + dt) : Math.max(0, s.jatoT - dt * 0.6)
  const nfx = Math.sin(s.yaw), nfz = Math.cos(s.yaw)
  if (!s.ar) { s.vx = nfx * v + nfz * lat; s.vz = nfz * v - nfx * lat }
  // subindo a parede curva, a gravidade puxa de volta pro leito
  if (!s.ar && s.onde.e > 0) {
    const { incl } = perfil(s.onde.e), a = G * 0.75 * (incl / (1 + incl * incl))
    s.vx -= s.onde.nx * a * dt; s.vz -= s.onde.nz * a * dt
  }
  if (e.pulo && !s.ar) { s.ar = true; s.vy = 7.5 }
  s.x += s.vx * dt; s.z += s.vz * dt
  let o = ondeEsta(s.x, s.z)
  // a parede em pé: não passa. Rápido o bastante subindo, voa (e volta)
  if (o.e > SUBIDA_MAX) {
    s.x -= o.nx * (o.e - SUBIDA_MAX); s.z -= o.nz * (o.e - SUBIDA_MAX)
    const u = s.vx * o.nx + s.vz * o.nz
    if (u > 0) {
      s.vx -= o.nx * u; s.vz -= o.nz * u
      if (u > 7 && !s.ar) { s.ar = true; s.vy = Math.min(14, u * 0.9); s.voos++ }
    }
    o = ondeEsta(s.x, s.z)
  }
  // a torre é obstáculo
  const bt = batenaTorre(s.x, s.z)
  if (bt) {
    s.x = bt.x; s.z = bt.z
    const u = s.vx * bt.nx + s.vz * bt.nz
    if (u < 0) { s.vx -= bt.nx * u * 1.3; s.vz -= bt.nz * u * 1.3 }
    o = ondeEsta(s.x, s.z)
  }
  s.onde = o
  const chao = perfil(o.e)
  if (s.ar) {
    s.vy -= G * dt; s.y += s.vy * dt
    if (s.y <= chao.y && s.vy < 0) {
      // pousou: na parede, a queda vira velocidade pra dentro
      if (o.e > 0.5) { const k = Math.abs(s.vy) * 0.55; s.vx -= o.nx * k; s.vz -= o.nz * k }
      s.ar = false; s.y = chao.y; s.vy = 0
    }
  } else s.y = chao.y
  s.incl = s.ar ? s.incl * 0.9 : chao.incl
  s.nx = o.nx; s.nz = o.nz
  s.dist += Math.hypot(s.vx, s.vz) * dt
}

function nomeDe(o: Estado["onde"]) { return o.tipo === "praca" ? NOME_TORRE[o.i] : NOME_AVENIDA[o.i] }

function Mundo({ st, entrada, auto }: { st: React.MutableRefObject<Estado>; entrada: React.MutableRefObject<Entrada>; auto: boolean }) {
  const { scene, camera, gl } = useThree()
  const concreto = useMemo(() => geoConcreto(), [])
  const neon = useMemo(() => geoNeon(), [])
  const vidro = useMemo(() => geoVidro(), [])
  const atlas = useMemo(() => geoAtlas(), [])
  const poeira = useMemo(() => geoPoeira(), [])
  const tex = useMemo(() => texturaAtlas(), [])
  const rz = useMemo(() => raizes(), [])
  const raizRef = useRef<THREE.InstancedMesh>(null)
  const corpo = useRef<THREE.Group>(null)
  const acc = useRef(0)
  const cam = useRef({ p: new THREE.Vector3(), olhar: new THREE.Vector3(), ok: false })
  const tmp = useMemo(() => ({ q: new THREE.Quaternion(), qy: new THREE.Quaternion(), n: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), alvo: new THREE.Vector3(), olha: new THREE.Vector3() }), [])

  useEffect(() => {
    scene.fog = new THREE.Fog(NEVOA, 25, 260)
    scene.background = new THREE.Color(NEVOA)
    const w = window as unknown as Record<string, unknown>
    if (/[?&]medir/.test(location.search)) { w.__cena = scene; w.__gl = gl; w.__cam = camera }
    return () => { scene.fog = null }
  }, [scene, gl, camera])
  useEffect(() => {
    const m = raizRef.current; if (!m) return
    rz.mats.forEach((x, i) => { m.setMatrixAt(i, x); m.setColorAt(i, rz.cores[i]) })
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.computeBoundingSphere()
  }, [rz])

  useFrame((_, dtq) => {
    const s = st.current
    // o relógio: passos fixos; a tela interpola entre o passo de antes e o de agora
    acc.current = Math.min(acc.current + Math.min(dtq, 0.1), 0.25)
    while (acc.current >= PASSO) { passo(s, auto ? piloto(s) : entrada.current, PASSO); acc.current -= PASSO }
    const k = acc.current / PASSO
    const x = s.ant.x + (s.x - s.ant.x) * k, z = s.ant.z + (s.z - s.ant.z) * k, y = s.ant.y + (s.y - s.ant.y) * k
    let dy = s.yaw - s.ant.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    const yaw = s.ant.yaw + dy * k
    const g = corpo.current
    if (g) {
      g.position.set(x, y, z)
      // de pé em relação à parede: inclina junto com a curva
      tmp.n.set(-s.nx * s.incl, 1, -s.nz * s.incl).normalize()
      tmp.q.setFromUnitVectors(tmp.up, tmp.n)
      tmp.qy.setFromAxisAngle(tmp.up, yaw)
      g.quaternion.copy(tmp.q).multiply(tmp.qy)
    }
    // a câmera atrás, um pouco acima; não entra na parede nem no vidro
    const fx = Math.sin(yaw), fz = Math.cos(yaw)
    const vel = Math.hypot(s.vx, s.vz)
    const longe = 6.2 + vel * 0.05
    tmp.alvo.set(x - fx * longe, y + 2.4 + vel * 0.012, z - fz * longe)
    const oc = ondeEsta(tmp.alvo.x, tmp.alvo.z)
    if (oc.e > 1.5) { tmp.alvo.x -= oc.nx * (oc.e - 1.5); tmp.alvo.z -= oc.nz * (oc.e - 1.5) }
    tmp.alvo.y = Math.min(TETO - 1, Math.max(tmp.alvo.y, perfil(Math.min(oc.e, 1.5)).y + 1.4))
    tmp.olha.set(x + fx * 5, y + 1.3, z + fz * 5)
    const c = cam.current, kk = 1 - Math.exp(-dtq * 7)
    if (!c.ok) { c.p.copy(tmp.alvo); c.olhar.copy(tmp.olha); c.ok = true }
    c.p.lerp(tmp.alvo, kk); c.olhar.lerp(tmp.olha, 1 - Math.exp(-dtq * 12))
    camera.position.copy(c.p); camera.lookAt(c.olhar)
    const pc = camera as THREE.PerspectiveCamera, fov = 66 + Math.min(16, vel * 0.4)
    if (Math.abs(pc.fov - fov) > 0.05) { pc.fov += (fov - pc.fov) * kk; pc.updateProjectionMatrix() }
  })

  const s = st.current
  return (
    <>
      <hemisphereLight args={["#7a58a8", "#0d0a14", 1.5]} />
      <directionalLight position={[0.3, 1, 0.2]} intensity={0.9} color="#ffb070" />
      <mesh geometry={concreto} matrixAutoUpdate={false}><meshStandardMaterial vertexColors roughness={0.9} metalness={0.05} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={neon} matrixAutoUpdate={false}><meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={atlas} matrixAutoUpdate={false}><meshBasicMaterial map={tex} vertexColors toneMapped={false} /></mesh>
      <mesh geometry={vidro} matrixAutoUpdate={false} renderOrder={2}><meshBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
      <points geometry={poeira} matrixAutoUpdate={false} renderOrder={3}><pointsMaterial color="#ffcf8a" size={0.07} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} /></points>
      <instancedMesh ref={raizRef} args={[rz.geo, undefined, rz.mats.length]} matrixAutoUpdate={false}>
        <meshStandardMaterial roughness={0.95} emissive="#0d3a30" emissiveIntensity={0.6} />
      </instancedMesh>
      <group ref={corpo} position={[s.x, 0, s.z]}>
        <Patinador vel={() => Math.hypot(st.current.vx, st.current.vz)} steer={() => (entrada.current.esq ? 1 : 0) - (entrada.current.dir ? 1 : 0)} ar={() => st.current.ar} jato={() => entrada.current.jato && entrada.current.frente && st.current.jatoT < 2.5} />
      </group>
    </>
  )
}

// o mapinha: o triângulo, as torres e você
function Mapinha({ ponto }: { ponto: React.RefObject<SVGCircleElement | null> }) {
  const caminhos = useMemo(() => AVENIDAS.map((a) => a.pts.filter((_, k) => k % 6 === 0).map((p) => `${p.x.toFixed(0)},${p.z.toFixed(0)}`).join(" ")), [])
  return (
    <svg className="tr-mapa" viewBox="-420 -420 840 840" aria-hidden>
      {caminhos.map((c, i) => <polyline key={i} points={c} fill="none" stroke={COR_AVENIDA[i]} strokeWidth={22} strokeLinecap="round" opacity={0.75} />)}
      {TORRES.map((t) => <circle key={t.i} cx={t.c.x} cy={t.c.z} r={PRACA} fill="#9b8cff" opacity={0.85} />)}
      <circle ref={ponto} r={26} fill="#fff" stroke="#14121c" strokeWidth={8} />
    </svg>
  )
}

export function Trincheiras() {
  const st = useRef<Estado>(estadoInicial())
  const entrada = useRef<Entrada>({ frente: false, re: false, esq: false, dir: false, pulo: false, jato: false })
  const [auto, setAuto] = useState(false)
  const [fixa, setFixa] = useState<number | null>(null)
  const [intro, setIntro] = useState(true)
  const velRef = useRef<HTMLSpanElement>(null)
  const ondeRef = useRef<HTMLSpanElement>(null)
  const torreRef = useRef<HTMLParagraphElement>(null)
  const ponto = useRef<SVGCircleElement>(null)

  useEffect(() => {
    const q = new URLSearchParams(location.search)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (q.has("auto")) setAuto(true)
    const d = q.get("dpr"); if (q.has("medir") && d) setFixa(+d)
    const w = window as unknown as Record<string, unknown>
    w.__estado = () => { const s = st.current; return { x: +s.x.toFixed(1), z: +s.z.toFixed(1), y: +s.y.toFixed(2), kmh: Math.round(Math.hypot(s.vx, s.vz) * 3.6), dist: Math.round(s.dist), ar: s.ar, onde: nomeDe(s.onde), voos: s.voos } }
    const t = setTimeout(() => setIntro(false), 6000)
    return () => clearTimeout(t)
  }, [])

  // o teclado: setas/WASD andam, espaço pula, shift é o jato
  useEffect(() => {
    const mapa: Record<string, keyof Entrada> = { ArrowUp: "frente", KeyW: "frente", ArrowDown: "re", KeyS: "re", ArrowLeft: "esq", KeyA: "esq", ArrowRight: "dir", KeyD: "dir", Space: "pulo", ShiftLeft: "jato", ShiftRight: "jato" }
    const f = (v: boolean) => (ev: KeyboardEvent) => { const k = mapa[ev.code]; if (!k) return; ev.preventDefault(); entrada.current[k] = v; if (v) setIntro(false) }
    const d = f(true), u = f(false)
    window.addEventListener("keydown", d); window.addEventListener("keyup", u)
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u) }
  }, [])

  // o painel: 10 vezes por segundo, direto no DOM (sem render do React)
  useEffect(() => {
    const id = setInterval(() => {
      const s = st.current
      if (velRef.current) velRef.current.textContent = String(Math.round(Math.hypot(s.vx, s.vz) * 3.6))
      if (ondeRef.current) ondeRef.current.textContent = nomeDe(s.onde)
      if (ponto.current) { ponto.current.setAttribute("cx", s.x.toFixed(0)); ponto.current.setAttribute("cy", s.z.toFixed(0)) }
      if (torreRef.current) {
        const perto = TORRES.find((t) => Math.hypot(s.x - t.torre.x, s.z - t.torre.z) < 14)
        torreRef.current.textContent = perto ? `${NOME_TORRE[perto.i]} · a porta sobe pra rua (em breve)` : ""
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  const botao = (k: keyof Entrada, rotulo: string, cls = "") => (
    <button type="button" className={`tr-btn ${cls}`} aria-label={k}
      onPointerDown={(e) => { e.preventDefault(); entrada.current[k] = true; setIntro(false) }}
      onPointerUp={() => { entrada.current[k] = false }} onPointerLeave={() => { entrada.current[k] = false }} onPointerCancel={() => { entrada.current[k] = false }}>
      {rotulo}
    </button>
  )

  return (
    <div className="tr-raiz">
      <Canvas className="tr-cvs" dpr={fixa ?? DPR.v ?? 1} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }} camera={{ fov: 66, near: 0.1, far: 600 }}>
        <Mundo st={st} entrada={entrada} auto={auto} />
        <ResolucaoDinamica fixa={fixa} max={QUALIDADE.dprMax} />
        <Cinema maxLente={QUALIDADE.lente} />
      </Canvas>
      <div className="tr-hud">
        <Link href="/teste" className="tr-voltar">← teste</Link>
        <div className="tr-vel"><span ref={velRef} className="tr-vel-n">0</span><small>km/h · de patins</small></div>
        <p className="tr-onde"><span ref={ondeRef}>{NOME_TORRE[0]}</span></p>
        <Mapinha ponto={ponto} />
        <p ref={torreRef} className="tr-torre" />
      </div>
      {intro && (
        <div className="tr-intro" onPointerDown={() => setIntro(false)}>
          <h1>AS TRINCHEIRAS</h1>
          <p>as raízes da cidade. três rios secos em triângulo; nas pontas, as torres que sobem pra rua. aqui só de patins, skate ou BMX.</p>
          <p className="tr-teclas">setas ou WASD · espaço pula · shift é o jato · sobe nas paredes, rápido você voa</p>
        </div>
      )}
      <div className="tr-toque">
        <div className="tr-lado">{botao("esq", "◀")}{botao("dir", "▶")}</div>
        <div className="tr-lado">{botao("pulo", "pula", "is-peq")}{botao("jato", "jato", "is-peq")}{botao("frente", "▲", "is-grande")}</div>
      </div>
    </div>
  )
}
