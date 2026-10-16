"use client"
/* eslint-disable react-hooks/immutability -- three.js: a Kombi, a câmera e o céu são do motor, mexidos a cada quadro */

// A CENA DA CIDADE NOVA: o relevo, as ruas, os prédios e as casas, os postes,
// os pilares da expressa, o mar e a Kombi. O motor (Motor) anda a Kombi pela
// rede: no fim de cada rua escolhe a próxima (a da rota marcada; sem rota,
// a mais reta, ou a do lado que você segura), faz o retorno quando pedem e
// desliga parada.

import { useFrame, useThree } from "@react-three/fiber"
import { Suspense, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { KombiHerbal } from "../linha/estrada/KombiHerbal"
import { rota as calcRota } from "../linha/rede/rede"
import { CLIMA, MAR, VMAX, geoRelevo, geoRuas, lotes, naTrilha, type Mundo, type Trilha } from "./mundo"
import { astros, ceuNaHora } from "../linha/ceu"
import { SEG_POR_HORA } from "../linha/relogio"
import { chovendo } from "../linha/clima"
import { W, H, ESCALA } from "../linha/rede/terreno"

export interface Carro {
  t: number; s: number; d: 1 | -1; x: number; v: number; steer: number
  desligada: boolean; ultimo: number
  rota: number[]; destino: number | null; chegou: boolean
  retorno: boolean // pode fazer o retorno aqui
  pedeRetorno: boolean
  X: number; Z: number; rumo: number // pros mapas
  salto?: boolean // teleporte: a câmera vai junto, sem voar
}
export interface Entrada { esq: boolean; dir: boolean; gas: boolean; freio: boolean; toque: boolean }

const toqueTela = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches

function janelas() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 128; const g = c.getContext("2d")!
  g.fillStyle = "#14102a"; g.fillRect(0, 0, 64, 128)
  let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 8) { const v = r(); g.fillStyle = v > 0.5 ? (v > 0.9 ? "#ff6ad5" : v > 0.78 ? "#7fe8ff" : "#ffe7a8") : "#241e40"; g.fillRect(x, y, 4, 4) }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t
}

export interface Ceu { hora: number; dia: number; noite: number; chove: boolean }

function Cidade({ mundo, ceu }: { mundo: Mundo; ceu: React.RefObject<Ceu> }) {
  const { relevo, ruas, lt } = useMemo(() => {
    const r = geoRelevo(mundo)
    return { relevo: r.geo, ruas: geoRuas(mundo), lt: lotes(mundo, r.grade) }
  }, [mundo])
  const jan = useMemo(() => janelas(), [])
  const caixa = useMemo(() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g }, [])
  const rTorre = useRef<THREE.InstancedMesh>(null), rCasa = useRef<THREE.InstancedMesh>(null), rGalpao = useRef<THREE.InstancedMesh>(null)
  const rPoste = useRef<THREE.InstancedMesh>(null), rLuz = useRef<THREE.InstancedMesh>(null), rPilar = useRef<THREE.InstancedMesh>(null)
  const grupos = useMemo(() => ({ torre: lt.lotes.filter((l) => l.tipo === "torre"), casa: lt.lotes.filter((l) => l.tipo === "casa"), galpao: lt.lotes.filter((l) => l.tipo === "galpao") }), [lt])
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color()
    const PAL = [0xf2c14e, 0xe4572e, 0x76b041, 0x17bebb, 0xffc9b9, 0xd7a6ff, 0xf5f0e1, 0xe88f3f, 0x4f86c6]
    const porTipo = { torre: rTorre.current, casa: rCasa.current, galpao: rGalpao.current }
    for (const k of ["torre", "casa", "galpao"] as const) {
      const m = porTipo[k]; if (!m) continue
      grupos[k].forEach((l, i) => {
        o.position.set(l.x, l.y, l.z); o.rotation.set(0, l.a, 0); o.scale.set(l.w, l.h, l.d); o.updateMatrix(); m.setMatrixAt(i, o.matrix)
        m.setColorAt(i, k === "casa" ? c.setHex(PAL[Math.floor(l.cor * PAL.length)]) : k === "torre" ? c.setHSL(0.7 + l.cor * 0.15, 0.3, 0.55 + l.cor * 0.2) : c.setHex(0x8a5a3a))
      })
      m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true
      m.computeBoundingSphere()
    }
    const CORES = [0xff6ad5, 0xffc27a, 0x9fd8ff]
    const pm = rPoste.current, lm = rLuz.current
    if (pm && lm) lt.postes.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z); o.rotation.set(0, p.a, 0); o.scale.set(1, 1, 1); o.updateMatrix(); pm.setMatrixAt(i, o.matrix)
      o.position.set(p.x, p.y + 7, p.z); o.updateMatrix(); lm.setMatrixAt(i, o.matrix); lm.setColorAt(i, c.setHex(CORES[p.cor]))
    })
    if (pm && lm) { pm.instanceMatrix.needsUpdate = true; lm.instanceMatrix.needsUpdate = true; if (lm.instanceColor) lm.instanceColor.needsUpdate = true; pm.computeBoundingSphere(); lm.computeBoundingSphere() }
    const pl = rPilar.current
    if (pl) { lt.pilares.forEach((p, i) => { o.position.set(p.x, p.y, p.z); o.rotation.set(0, 0, 0); o.scale.set(2.4, p.h, 2.4); o.updateMatrix(); pl.setMatrixAt(i, o.matrix) }); pl.instanceMatrix.needsUpdate = true; pl.computeBoundingSphere() }
  }, [grupos, lt])
  const poste = useMemo(() => { const g = new THREE.CylinderGeometry(0.12, 0.16, 7, 5); g.translate(0, 3.5, 0); return g }, [])
  // de noite as janelas e os postes acendem; de dia apagam
  const matTorre = useRef<THREE.MeshStandardMaterial>(null), matLuz = useRef<THREE.MeshBasicMaterial>(null), matAsf = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    const n = ceu.current.noite
    if (matTorre.current) matTorre.current.emissiveIntensity = 0.15 + n * 0.8
    if (matLuz.current) matLuz.current.color.setScalar(0.25 + n * 0.75)
    // chovendo, o asfalto molha (espelha)
    if (matAsf.current) { const alvo = ceu.current.chove ? 0.18 : 0.6; matAsf.current.roughness += (alvo - matAsf.current.roughness) * 0.02 }
  })
  return (
    <group>
      <mesh geometry={relevo}><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, MAR, 0]}><planeGeometry args={[W * ESCALA * 2, H * ESCALA * 2]} /><meshStandardMaterial color="#0e3a52" roughness={0.12} metalness={0.6} /></mesh>
      <mesh geometry={ruas.asfalto}><meshStandardMaterial ref={matAsf} color="#1c1a24" roughness={0.6} metalness={0.2} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={ruas.calcada}><meshStandardMaterial color="#5a5660" roughness={0.9} side={THREE.DoubleSide} /></mesh>
      <mesh geometry={ruas.faixa}><meshBasicMaterial color="#e8e4d0" side={THREE.DoubleSide} /></mesh>
      <mesh geometry={ruas.muro}><meshStandardMaterial color="#9a96a8" emissive="#ff3fb0" emissiveIntensity={0.15} side={THREE.DoubleSide} /></mesh>
      <instancedMesh ref={rTorre} args={[caixa, undefined, Math.max(1, grupos.torre.length)]}><meshStandardMaterial ref={matTorre} map={jan} emissive="#ffffff" emissiveMap={jan} emissiveIntensity={0.85} roughness={0.5} /></instancedMesh>
      <instancedMesh ref={rCasa} args={[caixa, undefined, Math.max(1, grupos.casa.length)]}><meshLambertMaterial /></instancedMesh>
      <instancedMesh ref={rGalpao} args={[caixa, undefined, Math.max(1, grupos.galpao.length)]}><meshStandardMaterial roughness={0.8} /></instancedMesh>
      <instancedMesh ref={rPoste} args={[poste, undefined, Math.max(1, lt.postes.length)]}><meshStandardMaterial color="#2a2834" /></instancedMesh>
      <instancedMesh ref={rLuz} args={[undefined, undefined, Math.max(1, lt.postes.length)]}><sphereGeometry args={[0.45, 8, 6]} /><meshBasicMaterial ref={matLuz} toneMapped={false} /></instancedMesh>
      <instancedMesh ref={rPilar} args={[caixa, undefined, Math.max(1, lt.pilares.length)]}><meshStandardMaterial color="#7a7686" /></instancedMesh>
    </group>
  )
}

// a direção com que uma rua sai de um nó (pra escolher a próxima)
function saida(t: Trilha, no: number, out: THREE.Vector3) {
  const k = Math.min(4, t.n - 1)
  if (t.e.a === no) out.set(t.px[k] - t.px[0], 0, t.pz[k] - t.pz[0])
  else out.set(t.px[t.n - 1 - k] - t.px[t.n - 1], 0, t.pz[t.n - 1 - k] - t.pz[t.n - 1])
  return out.normalize()
}

function Motor({ mundo, carro, ent, onChegou }: { mundo: Mundo; carro: React.RefObject<Carro>; ent: React.RefObject<Entrada>; onChegou: () => void }) {
  const camera = useThree((s) => s.camera)
  const kombi = useRef<THREE.Group>(null)
  const iniciou = useRef(false)
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), f: new THREE.Vector3(), r: new THREE.Vector3(), o: new THREE.Vector3(), i: new THREE.Vector3(), alvo: new THREE.Vector3(), olhar: new THREE.Vector3() }), [])
  const { rede, trilhas } = mundo
  useFrame((_, dtReal) => {
    const dt = Math.min(dtReal, 1 / 30), c = carro.current, e = ent.current
    let t = trilhas[c.t]
    // ── os pedais: no celular acelera sozinho; 10 s sem tocar, desliga ──
    const agora = performance.now()
    if (e.esq || e.dir || e.gas || e.freio) c.ultimo = agora
    if (!c.desligada && agora - c.ultimo > 10000 && Math.abs(c.v) < 0.5) c.desligada = true
    const ocioso = agora - c.ultimo > 10000
    const vmax = VMAX[t.e.tipo]
    const gas = !c.desligada && !ocioso && !c.chegou && (e.gas || (toqueTela && !e.freio))
    if (c.desligada || ocioso || c.chegou) c.v = Math.max(0, c.v - 8 * dt)
    else if (e.freio) c.v = Math.max(0, c.v - 22 * dt)
    else if (gas) c.v += (9 * (1 - Math.min(1, c.v / vmax) ** 2)) * dt
    else c.v = Math.max(0, c.v - (1.5 + 0.004 * c.v * c.v) * dt)
    if (c.v > vmax) c.v += (vmax - c.v) * dt * 1.2
    // ── o volante: muda de faixa dentro da rua ──
    const alvoSteer = (e.esq ? -1 : 0) + (e.dir ? 1 : 0)
    c.steer += (alvoSteer - c.steer) * Math.min(1, dt * 6)
    const L = t.larg / 2 - 1.4
    c.x = Math.max(-L, Math.min(L, c.x + c.steer * (4 + Math.min(1, c.v / 10) * 6) * dt))
    // ── o retorno: dá meia-volta e vai pra outra mão ──
    if (c.pedeRetorno) { c.pedeRetorno = false; c.d = (c.d === 1 ? -1 : 1); c.x = -c.x; c.v *= 0.4 }
    // ── anda; no fim da rua, escolhe a próxima ──
    c.s += c.d * c.v * dt
    if (c.s > t.len || c.s < 0) {
      const no = c.s > t.len ? t.e.b : t.e.a
      const sobra = c.s > t.len ? c.s - t.len : -c.s
      naTrilha(t, c.s > t.len ? t.len : 0, tmp.p, tmp.i)
      if (c.d < 0) tmp.i.negate()
      tmp.i.y = 0; tmp.i.normalize()
      const cands = rede.nos[no].arestas.filter((ai) => ai !== c.t || t.e.a === t.e.b)
      let prox = -1
      if (c.destino !== null && no === c.destino) { c.chegou = true; c.rota = []; c.destino = null; onChegou() }
      if (c.rota.length && cands.includes(c.rota[0])) prox = c.rota.shift()!
      else if (c.destino !== null) {
        const R = calcRota(rede, no, c.destino)
        if (R && R.arestas.length && cands.includes(R.arestas[0])) { c.rota = R.arestas.slice(1); prox = R.arestas[0] }
      }
      if (prox < 0 && cands.length) {
        // sem rota: a mais reta; segurando pro lado, a curva daquele lado
        let melhor = -Infinity
        for (const ai of cands) {
          const o = saida(trilhas[ai], no, tmp.o)
          const reto = tmp.i.dot(o), direita = tmp.i.x * o.z - tmp.i.z * o.x
          if (reto < -0.85 && cands.length > 1) continue
          const nota = alvoSteer === 0 ? reto : alvoSteer * direita * 2 + reto * 0.3
          if (nota > melhor) { melhor = nota; prox = ai }
        }
      }
      if (prox < 0) { c.d = (c.d === 1 ? -1 : 1); c.s = Math.max(0, Math.min(t.len, c.s)) } // rua sem saída: volta
      else {
        const nt = trilhas[prox]
        c.t = prox
        c.d = nt.e.a === no && !(nt.e.a === nt.e.b && c.d < 0) ? 1 : -1
        c.s = c.d > 0 ? sobra : nt.len - sobra
        c.x = Math.max(-(nt.larg / 2 - 1.4), Math.min(nt.larg / 2 - 1.4, c.x))
        t = nt
      }
    }
    // ── o retorno mais perto nesta rua ──
    c.retorno = rede.retornos.some((r) => r.aresta === c.t && Math.abs(r.f * t.len - c.s) < 40)
    // ── a pose da Kombi ──
    naTrilha(t, c.s, tmp.p, tmp.f)
    if (c.d < 0) tmp.f.negate()
    tmp.r.set(-tmp.f.z, 0, tmp.f.x).normalize()
    const k = kombi.current
    if (k) {
      k.position.copy(tmp.p).addScaledVector(tmp.r, c.x)
      k.rotation.set(0, Math.atan2(-tmp.f.x, -tmp.f.z), 0)
      k.rotateX(Math.asin(Math.max(-0.5, Math.min(0.5, tmp.f.y))))
    }
    c.X = tmp.p.x; c.Z = tmp.p.z; c.rumo = Math.atan2(tmp.f.x, tmp.f.z)
    // ── a câmera, atrás e acima, abrindo com a velocidade ──
    const atras = 9 + Math.min(1, c.v / 40) * 3
    tmp.alvo.copy(k ? k.position : tmp.p).addScaledVector(tmp.f, -atras).add(new THREE.Vector3(0, 3.8, 0)).addScaledVector(tmp.r, c.steer * 0.8)
    // vista de cima (só pra teste: window.__cdVista = true)
    if (process.env.NODE_ENV !== "production" && (window as unknown as { __cdVista?: boolean }).__cdVista) tmp.alvo.copy(k ? k.position : tmp.p).addScaledVector(tmp.f, -160).add(new THREE.Vector3(0, 140, 0))
    // o primeiro quadro: a câmera já nasce atrás da Kombi (não dentro do morro)
    if (!iniciou.current || c.salto) { camera.position.copy(tmp.alvo); iniciou.current = true; c.salto = false }
    camera.position.lerp(tmp.alvo, Math.min(1, dt * 5))
    tmp.olhar.copy(k ? k.position : tmp.p).addScaledVector(tmp.f, 7).add(new THREE.Vector3(0, 1.4, 0))
    camera.lookAt(tmp.olhar)
    const cam = camera as THREE.PerspectiveCamera
    cam.fov += (58 + Math.min(1, c.v / 40) * 12 - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix()
  })
  return (
    <group ref={kombi}>
      <Suspense fallback={<mesh position={[0, 1, 0]}><boxGeometry args={[2, 2, 4.5]} /><meshStandardMaterial color="#f2eefa" /></mesh>}><KombiHerbal /></Suspense>
      <pointLight position={[0, 0.3, 0]} color="#ff3fb0" intensity={60} distance={12} decay={2} />
      <pointLight position={[0, 1.2, -5]} color="#fff1d6" intensity={80} distance={40} decay={2} />
    </group>
  )
}

// o destino marcado: uma coluna de luz verde lá longe
function Destino({ mundo, no }: { mundo: Mundo; no: number | null }) {
  const pos = useMemo(() => {
    if (no === null) return null
    const n = mundo.rede.nos[no], ai = n.arestas[0], t = mundo.trilhas[ai]
    const p = new THREE.Vector3(), d = new THREE.Vector3(); naTrilha(t, t.e.a === no ? 0 : t.len, p, d)
    return p
  }, [mundo, no])
  if (!pos) return null
  return <mesh position={[pos.x, pos.y + 60, pos.z]}><cylinderGeometry args={[3, 3, 120, 16, 1, true]} /><meshBasicMaterial color="#5dffa0" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} /></mesh>
}

// o céu, a luz e a névoa: a hora do jogo (o mesmo céu do Red Dead da
// estrada) misturada com o clima de cada área; e a chuva
function Ambiente({ mundo, carro, ceu }: { mundo: Mundo; carro: React.RefObject<Carro>; ceu: React.RefObject<Ceu> }) {
  const scene = useThree((s) => s.scene), camera = useThree((s) => s.camera)
  const hemi = useRef<THREE.HemisphereLight>(null), dir = useRef<THREE.DirectionalLight>(null)
  const tmp = useMemo(() => ({ sol: new THREE.Vector3(), lua: new THREE.Vector3(), a: new THREE.Color(), b: new THREE.Color(), dia: new THREE.Color() }), [])
  const chuva = useMemo(() => {
    const n = 1600, pos = new Float32Array(n * 6)
    let sem = 9; const r = () => ((sem = (sem * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < n; i++) { const x = (r() - 0.5) * 120, y = r() * 60, z = (r() - 0.5) * 120; pos.set([x, y, z, x + 0.15, y - 1.4, z], i * 6) }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); return g
  }, [])
  const linhas = useRef<THREE.LineSegments>(null)
  useFrame((_, dtReal) => {
    const dt = Math.min(dtReal, 1 / 20), c = ceu.current
    c.hora = (c.hora + dt / SEG_POR_HORA) % 24
    const ch = ceuNaHora(c.hora)
    c.noite = ch.noite
    const area = mundo.trilhas[carro.current.t].e.bairro
    c.chove = area !== "deserto" && chovendo(c.dia, c.hora)
    const cl = CLIMA[area]
    // o céu: a cor da área de noite, o céu do dia de dia
    tmp.dia.setRGB(ch.meio[0], ch.meio[1], ch.meio[2])
    tmp.a.set(cl.ceu).lerp(tmp.dia, 1 - ch.noite * 0.85)
    tmp.b.set(cl.nevoa).lerp(tmp.dia, (1 - ch.noite) * 0.7)
    if (c.chove) { tmp.a.multiplyScalar(0.7); tmp.b.lerp(new THREE.Color("#5a6070"), 0.35) }
    ;(scene.background as THREE.Color | null)?.lerp(tmp.a, dt * 0.8)
    const fog = scene.fog as THREE.Fog | null
    if (fog) { fog.color.lerp(tmp.b, dt * 0.8); const longe = cl.longe * (c.chove ? 0.55 : 1) * (1 + (1 - ch.noite) * 0.6); fog.near += (cl.perto - fog.near) * dt * 0.5; fog.far += (longe - fog.far) * dt * 0.5 }
    astros(c.hora, tmp.sol, tmp.lua)
    const deDia = tmp.sol.y > -0.05
    if (dir.current) {
      dir.current.position.copy(deDia ? tmp.sol : tmp.lua).multiplyScalar(1500).add(camera.position)
      dir.current.target.position.copy(camera.position); dir.current.target.updateMatrixWorld()
      const quente = 1 - Math.min(1, Math.max(0, (tmp.sol.y - 0.02) / 0.38))
      if (deDia) dir.current.color.setRGB(1, 0.93 - 0.4 * quente, 0.84 - 0.62 * quente); else dir.current.color.set("#b9ccff")
      dir.current.intensity = 0.35 + ch.luz * 0.7
    }
    if (hemi.current) hemi.current.intensity = 0.7 + ch.luz * 0.6
    // a chuva acompanha a câmera
    const l = linhas.current
    if (l) {
      l.visible = c.chove
      if (c.chove) { l.position.set(camera.position.x, camera.position.y - 20, camera.position.z); l.position.y -= (performance.now() / 18) % 30 }
    }
  })
  return (
    <>
      <hemisphereLight ref={hemi} args={["#a89ae8", "#4a3a30", 1.2]} />
      <ambientLight intensity={0.3} color="#b8a8ff" />
      <directionalLight ref={dir} intensity={0.8} />
      <lineSegments ref={linhas} geometry={chuva} frustumCulled={false}><lineBasicMaterial color="#a8ccff" transparent opacity={0.35} /></lineSegments>
    </>
  )
}

// a fachada de cada lugar: o prédio, a vitrine na cor dele e o letreiro aceso
function letreiro(txt: string, cor: string) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d")!
  g.fillStyle = "#0a0812"; g.fillRect(0, 0, 512, 128)
  g.font = "900 72px Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"
  g.shadowColor = cor; g.shadowBlur = 24; g.fillStyle = cor; g.fillText(txt, 256, 68)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}
function Fachadas({ mundo }: { mundo: Mundo }) {
  const itens = useMemo(() => mundo.lugares.map((p) => ({ p, tex: letreiro(p.l.letreiro, p.l.cor) })), [mundo])
  return (
    <>
      {itens.map(({ p, tex }) => {
        const h = p.l.alto ?? 12
        return (
          <group key={p.l.id} position={[p.fx, p.Y - 1, p.fz]} rotation-y={p.ang}>
            <mesh position={[0, h / 2, 0]}><boxGeometry args={[18, h, 16]} /><meshStandardMaterial color="#1e1a2a" roughness={0.8} /></mesh>
            <mesh position={[0, 2.4, 8.05]}><planeGeometry args={[14, 3.6]} /><meshStandardMaterial color="#07060c" emissive={p.l.cor} emissiveIntensity={0.6} /></mesh>
            <mesh position={[0, Math.min(h - 1.5, 6.6), 8.1]}><planeGeometry args={[14, 3.5]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
            <mesh position={[0, 4.6, 8.6]}><boxGeometry args={[15, 0.15, 1.4]} /><meshStandardMaterial color={p.l.cor} emissive={p.l.cor} emissiveIntensity={0.5} /></mesh>
          </group>
        )
      })}
    </>
  )
}

export function Cena({ mundo, carro, ent, destino, ceu, onChegou }: { mundo: Mundo; carro: React.RefObject<Carro>; ent: React.RefObject<Entrada>; destino: number | null; ceu: React.RefObject<Ceu>; onChegou: () => void }) {
  return (
    <>
      <color attach="background" args={["#1a0b33"]} />
      <fog attach="fog" args={["#3a1f5f", 120, 1400]} />
      <Ambiente mundo={mundo} carro={carro} ceu={ceu} />
      <Cidade mundo={mundo} ceu={ceu} />
      <Fachadas mundo={mundo} />
      <Destino mundo={mundo} no={destino} />
      <Motor mundo={mundo} carro={carro} ent={ent} onChegou={onChegou} />
    </>
  )
}
