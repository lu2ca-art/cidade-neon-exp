"use client"
/* eslint-disable react-hooks/immutability -- three.js: a câmera e as cores mudam a cada quadro */

// A ENTREGA E AS INCUBADORAS, a cena (16/11; as regras: disco/entrega.ts).
//   o hack      as propagandas do Núcleo (as dos outdoors, outdoorsArte.ts) invadem
//               o holo cada vez mais rápido até desnortear; a visão turva e escurece
//   o corredor  o corredor das incubadoras, com as peças do elevador de terror
//               (terror.glb, a cápsula do T47): escuro, o drone grave, a luz
//               voltando aos trancos; aí o chamado da D-Bee. Tocar numa incubadora
//               quebra; o amigo está numa delas (a última, com 1 amigo)
// Desempenho: só monta neste momento (o page.tsx abre com next/dynamic); o hack é
// DOM (as artes pintadas uma vez em canvas; a turva é um blur só na camada das
// propagandas, sem pós-processamento); o corredor é um Canvas próprio, tudo
// MeshBasicMaterial, uma InstancedMesh por peça, névoa curta. Ao sair, descarta tudo.

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { DPR } from "@/app/linha/estrada/resolucao"
import { abafar, audioCtx, saidaSom } from "../som"
import { vib } from "../som-carro"
import { ModeloSeguro } from "../estrada/Seguro"
import { segurarGlb } from "../estrada/glbUso"
import { ANUNCIOS, ANUNCIO_H, ANUNCIO_W } from "../estrada/outdoorsArte"
import { PRODUTOS } from "../estrada/outdoorsDados"
import { URL_TERROR, lerGlb, type Grupo, type Nos } from "../trincheiras/PocoTerror"
import { TERROR } from "./terror"
import { ENTREGA_CFG, corDe, nomeDe, novaQuebra, quebraAcabou, quebrarCapsula, quantasQuebradas, type Quebra } from "./entrega"
import type { MissaoId } from "./portas"
import { TEXTOS_ENTREGA as T, juntarNomes } from "./entregaTextos"
import "./entrega.css"

const H = ENTREGA_CFG.hack, C = ENTREGA_CFG.corredor

// ═══ o som: blips do hack, o drone do corredor, o vidro quebrando ═══
function blip(f: number) {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out) return
  const t = c.currentTime, o = c.createOscillator(), g = c.createGain()
  o.type = "square"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.09)
  g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
  o.connect(g).connect(out); o.start(t); o.stop(t + 0.12)
}
function montarDrone() {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out) return null
  const g = c.createGain(); g.gain.value = 0
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 140; lp.Q.value = 3
  const f0 = TERROR.drone.hz
  const oscs = [f0, f0 * 1.007, f0 * 0.5].map((f, i) => { const o = c.createOscillator(); o.type = i === 2 ? "sine" : "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); return o })
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = TERROR.respira; lg.gain.value = 40; lfo.connect(lg).connect(lp.frequency); lfo.start()
  lp.connect(g).connect(out)
  g.gain.setTargetAtTime(TERROR.drone.vol, c.currentTime, 1.2)
  return {
    vidro() {
      const t = c.currentTime, n = Math.floor(c.sampleRate * 0.4), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0)
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4)
      const s = c.createBufferSource(); s.buffer = buf
      const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2400
      const ge = c.createGain(); ge.gain.value = 0.32
      s.connect(hp).connect(ge).connect(out); s.start(t)
      const o = c.createOscillator(), go = c.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.3)
      go.gain.setValueAtTime(0.4, t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
      o.connect(go).connect(out); o.start(t); o.stop(t + 0.4)
    },
    parar() {
      const t = c.currentTime
      g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.2)
      for (const o of [...oscs, lfo]) { try { o.stop(t + 1) } catch {} }
      setTimeout(() => { try { g.disconnect() } catch {} }, 1400)
    },
  }
}

// ═══ 1. o hack: as propagandas invadem o holo ═══
type Pop = { k: number; src: string; x: number; y: number; r: number; s: number }
function Hack({ agua, onFim }: { agua: number; onFim: () => void }) {
  const [pops, setPops] = useState<Pop[]>([])
  const [fase, setFase] = useState<"invade" | "turva" | "escuro">("invade")
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim })
  // as artes dos outdoors, pintadas uma vez só (15 células de 512×256)
  const artes = useMemo(() => {
    if (typeof document === "undefined") return [] as string[]
    const cv = document.createElement("canvas"); cv.width = ANUNCIO_W; cv.height = ANUNCIO_H
    const g = cv.getContext("2d")
    if (!g) return []
    return PRODUTOS.map((p, i) => { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ANUNCIO_W, ANUNCIO_H); ANUNCIOS[i % ANUNCIOS.length](g, p); return cv.toDataURL("image/jpeg", 0.8) })
  }, [])
  useEffect(() => {
    const ini = performance.now()
    let k = 0, t: ReturnType<typeof setTimeout>
    // cada propaganda chega mais rápido que a anterior, até a tela encher
    const proxima = () => {
      const u = Math.min(1, (performance.now() - ini) / (H.invade * 1000))
      if (u >= 1) return
      const n = k++
      if (artes.length) setPops((ps) => [...ps.slice(-(H.maxNaTela - 1)), { k: n, src: artes[n % artes.length], x: Math.random() * 80 - 5, y: Math.random() * 85 - 5, r: (Math.random() - 0.5) * 24 * u, s: 0.55 + Math.random() * 0.5 + u * 0.4 }])
      blip(300 + Math.random() * 900)
      if (n % 3 === 0) vib(12)
      t = setTimeout(proxima, H.primeiraMs + (H.ultimaMs - H.primeiraMs) * Math.pow(u, 0.6))
    }
    proxima()
    const a = setTimeout(() => setFase("turva"), H.invade * 1000)
    const b = setTimeout(() => setFase("escuro"), (H.invade + H.turva) * 1000)
    const c = setTimeout(() => fim.current(), (H.invade + H.turva + H.escuro) * 1000)
    return () => { clearTimeout(t); clearTimeout(a); clearTimeout(b); clearTimeout(c) }
  }, [artes])
  return (
    <div className={`en-hack is-${fase}`} aria-live="polite">
      {agua > 0 && <p className="en-hack-grana">{T.recompensa.replace("{agua}", String(agua))}</p>}
      <div className="en-hack-pops">
        {pops.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p.k} className="en-hack-pop" src={p.src} alt="" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%, -50%) rotate(${p.r}deg) scale(${p.s})` }} />
        ))}
      </div>
      <i className="en-hack-veu" aria-hidden="true" />
    </div>
  )
}

// ═══ 2. o corredor das incubadoras ═══
type Parte = { geo: THREE.BufferGeometry; mat: THREE.MeshBasicMaterial; grupo: Grupo }
type Ctl = { quebrar: (i: number, amigo: MissaoId | null) => void; luz: (v: number, tt: number) => void }

// onde fica cada incubadora: duas fileiras, frente a frente, pelo corredor (-z)
function lugar(i: number) {
  const lado = i % 2 ? 1 : -1, fil = Math.floor(i / 2)
  return { x: lado * (C.largura / 2 - 0.7), z: -(fil + 1) * C.espaco, lado }
}
const COMPRIDO = (Math.ceil(C.incubadoras / 2) + 2) * C.espaco

function montarCorredor(partes: Parte[] | null, n: number) {
  const d = new THREE.Object3D()
  const mt = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => { d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.set(sx, sy, sz); d.updateMatrix(); return d.matrix.clone() }
  const caixa = new THREE.BoxGeometry(1, 1, 1)
  const descarta: { dispose: () => void }[] = [caixa]
  const mat = (cor: string, extra: THREE.MeshBasicMaterialParameters = {}) => { const m = new THREE.MeshBasicMaterial({ color: cor, ...extra }); descarta.push(m); return m }
  // sem o glb (carregando ou falhou): as formas de antes (a base, o corpo escuro, o vidro verde)
  if (!partes) {
    const vidro = new THREE.CylinderGeometry(0.42, 0.42, 2, 10, 1, true), corpo = new THREE.CapsuleGeometry(0.2, 1.1, 3, 6)
    const base = caixa.clone().scale(1, 0.24, 1).translate(0, 0.12, 0)
    descarta.push(vidro, corpo, base)
    partes = [
      { geo: base, mat: mat("#1a1424"), grupo: "solido" },
      { geo: corpo.translate(0, 1.2, 0), mat: mat("#0a0710"), grupo: "solido" },
      { geo: vidro.translate(0, 1.22, 0), mat: mat("#3dff9a", { transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false }), grupo: "vidro" },
    ]
  }
  const ms = Array.from({ length: n }, (_, i) => { const l = lugar(i); return mt(l.x, 0, l.z, 1, 1, 1, l.lado * -Math.PI / 2) })
  const zero = new THREE.Matrix4().makeScale(0, 0, 0)
  const branco = new THREE.Color(1, 1, 1)
  const caps = partes.map((p) => {
    const im = new THREE.InstancedMesh(p.geo, p.mat, n)
    ms.forEach((m, i) => { im.setMatrixAt(i, m); if (p.grupo === "solido") im.setColorAt(i, branco) })
    im.frustumCulled = false
    return { im, p, base: p.mat.color.clone() }
  })
  // o corredor: chão, teto, paredes; as lâmpadas do teto (piscam); os alvos do toque (invisíveis)
  const L = C.largura, Z0 = 3, zm = -COMPRIDO / 2 + Z0 / 2
  const paredes = new THREE.InstancedMesh(caixa, mat("#120d19"), 4)
  ;[mt(0, -0.05, zm, L, 0.1, COMPRIDO + Z0), mt(0, 3.4, zm, L, 0.1, COMPRIDO + Z0), mt(-L / 2, 1.7, zm, 0.1, 3.4, COMPRIDO + Z0), mt(L / 2, 1.7, zm, 0.1, 3.4, COMPRIDO + Z0)].forEach((m, i) => paredes.setMatrixAt(i, m))
  const fundo = new THREE.InstancedMesh(caixa, mat("#0c0812"), 1); fundo.setMatrixAt(0, mt(0, 1.7, -COMPRIDO, L, 3.4, 0.1))
  const nl = Math.ceil(COMPRIDO / C.espaco)
  const matLuz = mat("#bfffe0", { toneMapped: false }), baseLuz = matLuz.color.clone()
  const luzes = new THREE.InstancedMesh(caixa, matLuz, nl)
  for (let i = 0; i < nl; i++) luzes.setMatrixAt(i, mt(0, 3.33, -i * C.espaco - C.espaco / 2, 0.16, 0.04, 1.4))
  const alvos = new THREE.InstancedMesh(caixa, mat("#000"), n)
  ms.forEach((_, i) => { const l = lugar(i); alvos.setMatrixAt(i, mt(l.x, 1.25, l.z, 1.2, 2.6, 1.2)) })
  alvos.visible = false
  for (const im of [paredes, fundo, luzes, alvos]) { im.frustumCulled = false; descarta.push(im) }
  const corAmigo = new THREE.Color(), escura = new THREE.Color(0.32, 0.3, 0.36)
  const ctl: Ctl = {
    // quebrou: o vidro e a luz da cápsula somem; vazia escurece, com o amigo acende na cor dele
    quebrar(i, amigo) {
      for (const { im, p } of caps) {
        if (p.grupo === "vidro" || p.grupo === "luz") { im.setMatrixAt(i, zero); im.instanceMatrix.needsUpdate = true }
        else if (p.grupo === "solido") { im.setColorAt(i, amigo ? corAmigo.set(corDe(amigo)).multiplyScalar(2.2) : escura); if (im.instanceColor) im.instanceColor.needsUpdate = true }
      }
    },
    // a luz do corredor (0–1) e a respiração das cápsulas (o mesmo ritmo das máquinas do T47)
    luz(v, tt) {
      const b = 0.5 + 0.5 * Math.sin(tt * Math.PI * 2 * TERROR.respira)
      matLuz.color.copy(baseLuz).multiplyScalar(0.06 + 0.94 * v)
      for (const { p, base } of caps) {
        const k = p.grupo === "solido" ? 0.25 + 0.75 * v : p.grupo === "vidro" || p.grupo === "luz" || p.grupo === "neon" ? (0.3 + 0.7 * b) * (0.4 + 0.6 * v) : 1
        p.mat.color.copy(base).multiplyScalar(k)
      }
    },
  }
  return {
    objetos: [...caps.map((c) => c.im), paredes, fundo, luzes], alvos, ctl,
    descartar() { caps.forEach((c) => c.im.dispose()); descarta.forEach((x) => x.dispose()) },
  }
}

type Estado = { q: Quebra; fase: "escuro" | "chamado" | "fim"; ultimo: { i: number; achou: MissaoId | null; t: number } | null }

type Quebradas = React.MutableRefObject<{ i: number; a: MissaoId | null }[]>
function Mundo({ partes, ctlRef, quebradas, onToque }: { partes: Parte[] | null; ctlRef: React.MutableRefObject<Ctl | null>; quebradas: Quebradas; onToque: (i: number) => void }) {
  const m = useMemo(() => montarCorredor(partes, C.incubadoras), [partes])
  useEffect(() => {
    ctlRef.current = m.ctl
    // o glb chegou depois de quebrar alguma: repete as quebras na peça nova
    for (const x of quebradas.current) m.ctl.quebrar(x.i, x.a)
    return () => { if (ctlRef.current === m.ctl) ctlRef.current = null; m.descartar() }
  }, [m, ctlRef, quebradas])
  const tocar = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta > 10 || e.instanceId === undefined) return; onToque(e.instanceId) }
  return (
    <>
      {m.objetos.map((o, i) => <primitive key={i} object={o} />)}
      <primitive object={m.alvos} onClick={tocar} />
    </>
  )
}
// as peças do glb: só a cápsula fica (o resto do que lerGlb copiou é descartado ao sair)
function MundoGlb({ ctlRef, quebradas, onToque }: { ctlRef: React.MutableRefObject<Ctl | null>; quebradas: Quebradas; onToque: (i: number) => void }) {
  const { nodes } = useGLTF(URL_TERROR) as unknown as { nodes: Nos }
  const lido = useMemo(() => lerGlb(nodes), [nodes])
  useEffect(() => () => { lido.geos.forEach((g) => g.dispose()); lido.regs.forEach((r) => r.mat.dispose()) }, [lido])
  return <Mundo partes={lido.pecas.capsula} ctlRef={ctlRef} quebradas={quebradas} onToque={onToque} />
}

function Cena({ est, olhar, onToque, quebradas, ctl }: { est: React.MutableRefObject<Estado>; olhar: React.MutableRefObject<number>; onToque: (i: number) => void; quebradas: Quebradas; ctl: React.MutableRefObject<Ctl | null> }) {
  const { scene, camera } = useThree()
  const t = useRef(0), z = useRef(2.5), yaw = useRef(0)
  useEffect(() => {
    scene.fog = new THREE.Fog(TERROR.nevoa.cor, 1.5, C.nevoa)
    scene.background = new THREE.Color(TERROR.nevoa.cor)
    return () => { scene.fog = null }
  }, [scene])
  useFrame((_, dt) => {
    t.current += Math.min(dt, 0.1)
    const tt = t.current, e = est.current
    // a luz: no escuro do terror, só um piscar fraco; depois volta aos trancos e fica tremendo
    let v: number
    if (e.fase === "escuro") v = tt > C.escuro * 0.55 && Math.sin(tt * 37) > 0.7 ? 0.35 : 0.02
    else v = 0.55 + 0.25 * Math.sin(tt * 0.7) - (Math.sin(tt * 23) > 0.96 ? 0.4 : 0)
    ctl.current?.luz(v, tt)
    // a câmera anda até a fileira da próxima incubadora inteira
    const q = e.q
    let alvo = 1.2
    for (let i = 0; i < q.total; i++) if (!q.quebradas[i]) { alvo = lugar(i).z + C.espaco * 0.9; break }
    if (e.fase === "fim") alvo = lugar(q.total - 1).z + C.espaco * 0.9
    z.current += (alvo - z.current) * Math.min(1, dt * 1.6)
    yaw.current += (olhar.current - yaw.current) * Math.min(1, dt * 8)
    // o tranco da quebra
    const u = e.ultimo ? tt - e.ultimo.t : 9, sh = u < 0.25 ? 0.05 * (1 - u / 0.25) : 0.004
    const sx = (Math.random() - 0.5) * sh, sy = (Math.random() - 0.5) * sh
    camera.position.set(sx, 1.62 + sy + Math.sin(tt * 1.4) * 0.01, z.current)
    camera.lookAt(Math.sin(yaw.current) * 6, 1.4, z.current - Math.cos(yaw.current) * 6)
    if (e.ultimo && e.ultimo.t < 0) e.ultimo.t = tt // a hora da quebra no relógio da cena
  })
  const reserva = <Mundo partes={null} ctlRef={ctl} quebradas={quebradas} onToque={onToque} />
  return <ModeloSeguro nome="incubadoras-glb" reserva={reserva}><MundoGlb ctlRef={ctl} quebradas={quebradas} onToque={onToque} /></ModeloSeguro>
}

function Corredor({ amigos, onAchou, onFim }: { amigos: MissaoId[]; onAchou: (id: MissaoId) => void; onFim: () => void }) {
  const est = useRef<Estado>({ q: novaQuebra(amigos), fase: "escuro", ultimo: null })
  const [ui, setUi] = useState<{ fase: Estado["fase"]; faltam: number; aviso: { txt: string; cor: string; k: number } | null }>({ fase: "escuro", faltam: est.current.q.total, aviso: null })
  const quebradas = useRef<{ i: number; a: MissaoId | null }[]>([])
  const ctl = useRef<Ctl | null>(null)
  const olhar = useRef(0)
  const som = useRef<ReturnType<typeof montarDrone>>(null)
  const achou = useRef(onAchou), fim = useRef(onFim)
  useEffect(() => { achou.current = onAchou; fim.current = onFim })
  useEffect(() => segurarGlb(URL_TERROR), [])
  useEffect(() => {
    abafar(true)
    som.current = montarDrone()
    // depois do terror, o chamado da D-Bee (e a pessoa já pode quebrar)
    const t = setTimeout(() => { est.current.fase = "chamado"; setUi((u) => ({ ...u, fase: "chamado" })); vib([30, 60, 30]) }, C.escuro * 1000)
    return () => { clearTimeout(t); abafar(false); som.current?.parar(); som.current = null }
  }, [])
  const tocar = useCallback((i: number) => {
    const e = est.current
    if (e.fase !== "chamado") return
    const r = quebrarCapsula(e.q, i)
    if (r.q === e.q) return
    e.q = r.q
    e.ultimo = { i, achou: r.achou, t: -1 }
    quebradas.current.push({ i, a: r.achou })
    ctl.current?.quebrar(i, r.achou)
    som.current?.vidro()
    vib(r.achou ? [40, 50, 120] : 35)
    if (r.achou) achou.current(r.achou)
    const acabou = quebraAcabou(e.q)
    if (acabou) { e.fase = "fim"; setTimeout(() => fim.current(), 3600) }
    setUi((u) => ({
      fase: e.fase, faltam: e.q.total - quantasQuebradas(e.q),
      aviso: r.achou ? { txt: T.achou.replace("{quem}", nomeDe(r.achou)), cor: corDe(r.achou), k: (u.aviso?.k ?? 0) + 1 } : { txt: T.vazia, cor: "#9a92a8", k: (u.aviso?.k ?? 0) + 1 },
    }))
  }, [])
  const toque = useRef<{ x: number; y0: number } | null>(null)
  const quem = juntarNomes(amigos.map(nomeDe))
  return (
    <div className={`en-corredor is-${ui.fase}`}
      onPointerDown={(e) => { toque.current = { x: e.clientX, y0: olhar.current } }}
      onPointerMove={(e) => { const tq = toque.current; if (!tq) return; olhar.current = Math.max(-1.3, Math.min(1.3, tq.y0 - (e.clientX - tq.x) * 0.006)) }}
      onPointerUp={() => { toque.current = null }} onPointerCancel={() => { toque.current = null }}>
      <Canvas className="en-corredor-cvs" dpr={DPR.v ?? 1} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }} camera={{ fov: 70, near: 0.05, far: C.nevoa + 4 }}>
        <Cena est={est} olhar={olhar} onToque={tocar} quebradas={quebradas} ctl={ctl} />
      </Canvas>
      {ui.fase !== "escuro" && (
        <div className="en-chamado" aria-live="polite">
          <b>{T.quemChama}</b>
          <span>{T.chamado.replace("{quem}", quem)}</span>
        </div>
      )}
      {ui.fase === "chamado" && <p className="en-dica">{T.dica} · {T.faltam.replace("{n}", String(ui.faltam))}</p>}
      {ui.aviso && <p key={ui.aviso.k} className="en-aviso" style={{ color: ui.aviso.cor }}>{ui.aviso.txt}</p>}
      <i className="en-corredor-veu" aria-hidden="true" />
    </div>
  )
}

/** a cena inteira: o hack (se `hack`) e o corredor. onAchou: cada amigo achado (o save); onFim: acabou */
export function EntregaCena({ amigos, agua, hack, onAchou, onFim }: { amigos: MissaoId[]; agua: number; hack: boolean; onAchou: (id: MissaoId) => void; onFim: () => void }) {
  const [fase, setFase] = useState<"hack" | "corredor">(hack ? "hack" : "corredor")
  return (
    <div className="en-cena" onClick={(e) => e.stopPropagation()}>
      {fase === "hack" ? <Hack agua={agua} onFim={() => setFase("corredor")} /> : <Corredor amigos={amigos} onAchou={onAchou} onFim={onFim} />}
    </div>
  )
}
