"use client"
/* eslint-disable react-hooks/immutability -- three.js: a câmera e as cores mudam a cada quadro */

// T47 · O ELEVADOR DE TERROR, a cena (06/11, RASCUNHO; docs/t47-terror.md).
// O poço do elevador 2, em primeira pessoa: a cabine de grade sobe devagar e, em
// cada andar que passa, lá dentro: robôs dormindo em cibercamas, humanos
// encubados em cápsulas, máquinas "dormindo" (a luz respira lenta). Um tranco, a
// luz apaga, a cabine cai um pouco e para; e dispara até o topo. A trilha abafa e
// entra um drone grave (Web Audio sintetizado). Tocar pula; arrastar olha em volta.
// Os números e a linha do tempo: disco/terror.ts.
// Desempenho: low-poly, tudo MeshBasicMaterial (sem luz nenhuma: o "acender" é a
// cor dos materiais), cada peça repetida é UM InstancedMesh pra todos os andares
// (~20 desenhos no total), névoa curta. Montado só durante o percurso; ao sair,
// geometrias e materiais são descartados.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { DPR } from "@/app/linha/estrada/resolucao"
import { abafar, audioCtx, saidaSom } from "@/app/linha/som"
import { ALTURA_TOTAL, DURACAO_TERROR, TERROR, quadroTerror, type FaseTerror } from "../disco/terror"

const POCO = 2.3 // meia largura do poço (m)
const CAB = 1.8 // meia largura da cabine
const ALTO_CAB = 2.6

type Peca = { geo: THREE.BufferGeometry; mat: THREE.MeshBasicMaterial; m: THREE.Matrix4[] }

function montar() {
  const d = new THREE.Object3D()
  const mt = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => {
    d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.set(sx, sy, sz); d.updateMatrix(); return d.matrix.clone()
  }
  const caixa = new THREE.BoxGeometry(1, 1, 1)
  const basico = (cor: string, extra: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ color: cor, ...extra })
  const mats = {
    parede: basico("#140e1c"), viga: basico("#2b2236"), laje: basico("#0f0b16"), placa: basico("#ff9d3c", { toneMapped: false }),
    cama: basico("#231d33"), robo: basico("#3a3350"), olho: basico("#4ff3ff", { toneMapped: false }),
    base: basico("#1a1424"), corpo: basico("#0a0710"), vidro: basico("#3dff9a", { transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false }),
    rack: basico("#1b1626"), respiro: basico("#ff5c8a", { toneMapped: false }),
    grade: basico("#5a5068"), piso: basico("#2a2230"), lampada: basico("#ffd9a0", { toneMapped: false }), emerg: basico("#ff2a2a", { toneMapped: false }),
  }
  const base = Object.fromEntries(Object.entries(mats).map(([k, m]) => [k, m.color.clone()])) as Record<keyof typeof mats, THREE.Color>
  const geos = {
    caixa,
    vidro: new THREE.CylinderGeometry(0.42, 0.42, 2, 10, 1, true),
    corpo: new THREE.CapsuleGeometry(0.2, 1.1, 3, 6),
  }
  // ── o poço parado: paredes, vigas, as lajes da frente entre os andares e os andares ──
  const N = Math.ceil((ALTURA_TOTAL + 10) / TERROR.andar) + 1
  const alto = N * TERROR.andar + 10
  const fixo: Peca[] = []
  const p = (geo: THREE.BufferGeometry, mat: THREE.MeshBasicMaterial) => { const x = { geo, mat, m: [] as THREE.Matrix4[] }; fixo.push(x); return x }
  const parede = p(caixa, mats.parede), viga = p(caixa, mats.viga), laje = p(caixa, mats.laje), placa = p(caixa, mats.placa)
  const cama = p(caixa, mats.cama), robo = p(caixa, mats.robo), olho = p(caixa, mats.olho)
  const baseC = p(caixa, mats.base), corpo = p(geos.corpo, mats.corpo), vidro = p(geos.vidro, mats.vidro)
  const rack = p(caixa, mats.rack), respiro = p(caixa, mats.respiro)
  parede.m.push(mt(-POCO - 0.1, alto / 2 - 5, 0, 0.2, alto, POCO * 2), mt(POCO + 0.1, alto / 2 - 5, 0, 0.2, alto, POCO * 2), mt(0, alto / 2 - 5, -POCO - 0.1, POCO * 2, alto, 0.2))
  for (let y = -4; y < alto - 5; y += 1.4) viga.m.push(mt(-POCO + 0.05, y, 0, 0.1, 0.16, POCO * 2), mt(POCO - 0.05, y, 0, 0.1, 0.16, POCO * 2), mt(0, y, -POCO + 0.05, POCO * 2, 0.16, 0.1))
  const fil = TERROR.porFileira, passoX = 11 / Math.max(1, fil - 1)
  for (let k = 0; k < N; k++) {
    const y = k * TERROR.andar, sobra = TERROR.andar - TERROR.vao
    laje.m.push(mt(0, y + TERROR.vao + sobra / 2, POCO + 0.15, POCO * 2 + 0.4, sobra, 0.3)) // a frente, entre os vãos
    laje.m.push(mt(0, y - 0.15, POCO + 7.5, 16, 0.3, 15)) // o chão do andar
    if (k === 0) continue // o andar 0 é o salão dos túneis (fica pra trás)
    placa.m.push(mt(POCO - 0.45, y + TERROR.vao + 0.25, POCO - 0.02, 0.32, 0.14, 0.04))
    const tipo = k % 3
    for (const z of [5, 10]) for (let i = 0; i < fil; i++) {
      const x = -5.5 + i * passoX + (z === 10 ? passoX / 2 : 0)
      if (tipo === 1) { // robôs dormindo nas cibercamas
        cama.m.push(mt(x, y + 0.25, z, 0.95, 0.5, 2.1))
        robo.m.push(mt(x, y + 0.63, z + 0.1, 0.5, 0.26, 1.5))
        robo.m.push(mt(x, y + 0.66, z - 0.82, 0.34, 0.3, 0.34))
        olho.m.push(mt(x, y + 0.82, z - 0.82, 0.24, 0.025, 0.02))
        olho.m.push(mt(x, y + 0.52, z, 0.98, 0.03, 2.12)) // o filete da cama
      } else if (tipo === 2) { // humanos encubados nas cápsulas
        baseC.m.push(mt(x, y + 0.12, z, 1.0, 0.24, 1.0))
        baseC.m.push(mt(x, y + 2.3, z, 1.0, 0.16, 1.0))
        corpo.m.push(mt(x, y + 1.2, z, 1, 1, 1))
        vidro.m.push(mt(x, y + 1.22, z, 1, 1, 1))
      } else { // as máquinas "dormindo"
        rack.m.push(mt(x, y + 1.2, z, 1.2, 2.4, 0.8))
        respiro.m.push(mt(x - 0.3, y + 1.6, z - 0.41, 0.06, 1.2, 0.02))
        respiro.m.push(mt(x + 0.2, y + 0.9, z - 0.41, 0.4, 0.05, 0.02))
      }
    }
  }
  // ── a cabine (sobe junto): o piso, a grade dos lados e de trás, a lâmpada ──
  const cab: Peca[] = []
  const c = (mat: THREE.MeshBasicMaterial) => { const x = { geo: caixa, mat, m: [] as THREE.Matrix4[] }; cab.push(x); return x }
  const grade = c(mats.grade), piso = c(mats.piso), lampada = c(mats.lampada), emerg = c(mats.emerg)
  piso.m.push(mt(0, -0.06, 0, CAB * 2, 0.12, CAB * 2), mt(0, ALTO_CAB + 0.05, 0, CAB * 2, 0.06, CAB * 2))
  lampada.m.push(mt(0, ALTO_CAB - 0.02, 0, 0.6, 0.04, 0.6))
  emerg.m.push(mt(CAB - 0.25, ALTO_CAB - 0.08, -CAB + 0.25, 0.18, 0.1, 0.18))
  for (let s = -CAB + 0.1; s < CAB; s += 0.2) grade.m.push(mt(-CAB, ALTO_CAB / 2, s, 0.03, ALTO_CAB, 0.03), mt(CAB, ALTO_CAB / 2, s, 0.03, ALTO_CAB, 0.03), mt(s, ALTO_CAB / 2, -CAB, 0.03, ALTO_CAB, 0.03))
  for (const y of [0.12, 1.05, ALTO_CAB - 0.1]) grade.m.push(mt(-CAB, y, 0, 0.05, 0.05, CAB * 2), mt(CAB, y, 0, 0.05, 0.05, CAB * 2), mt(0, y, -CAB, CAB * 2, 0.05, 0.05))
  // a grade da frente (desliza e fecha nas "portas")
  const frente: Peca[] = [{ geo: caixa, mat: mats.grade, m: [] }]
  for (let s = -CAB + 0.1; s < CAB; s += 0.16) frente[0].m.push(mt(s, ALTO_CAB / 2, CAB, 0.03, ALTO_CAB, 0.03))
  for (const y of [0.12, 1.05, ALTO_CAB - 0.1]) frente[0].m.push(mt(0, y, CAB, CAB * 2, 0.05, 0.05))
  const malha = (ps: Peca[]) => ps.filter((x) => x.m.length).map((x) => {
    const im = new THREE.InstancedMesh(x.geo, x.mat, x.m.length)
    x.m.forEach((m, i) => im.setMatrixAt(i, m))
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.frustumCulled = false
    return im
  })
  const fixoM = malha(fixo), cabM = malha(cab), frenteM = malha(frente)
  return {
    fixo: fixoM, cab: cabM, frente: frenteM, mats, base,
    descartar() {
      for (const im of [...fixoM, ...cabM, ...frenteM]) im.dispose()
      Object.values(geos).forEach((g) => g.dispose()); Object.values(mats).forEach((m) => m.dispose())
    },
  }
}

// ── o som: um drone grave (dois dente-de-serra quase iguais + o sub), o filtro
// respira junto com as máquinas; o baque no tranco; na disparada, o tom sobe ──
function montarDrone() {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out) return null
  const vol = TERROR.drone.vol, f0 = TERROR.drone.hz
  const g = c.createGain(); g.gain.value = 0
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 150; lp.Q.value = 3
  const oscs = [f0, f0 * 1.006, f0 * 0.5].map((f, i) => { const o = c.createOscillator(); o.type = i === 2 ? "sine" : "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); return o })
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = TERROR.respira; lg.gain.value = 45; lfo.connect(lg).connect(lp.frequency); lfo.start()
  lp.connect(g).connect(out)
  g.gain.setTargetAtTime(vol, c.currentTime, 0.8)
  const baque = (v = 1) => {
    const t = c.currentTime, n = Math.floor(c.sampleRate * 0.5), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3)
    const src = c.createBufferSource(); src.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 240; bp.Q.value = 1.2
    const ge = c.createGain(); ge.gain.value = 0.5 * v
    src.connect(bp).connect(ge).connect(out); src.start(t)
    const o = c.createOscillator(), go = c.createGain(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(26, t + 0.5)
    go.gain.setValueAtTime(0.6 * v, t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    o.connect(go).connect(out); o.start(t); o.stop(t + 0.65)
  }
  let fase: FaseTerror | "" = ""
  return {
    fase(f: FaseTerror) {
      if (f === fase) return
      fase = f
      const t = c.currentTime
      if (f === "tranco") { baque(); g.gain.setTargetAtTime(vol * 0.4, t, 0.05) }
      if (f === "cai") lp.frequency.setTargetAtTime(420, t, 0.15)
      if (f === "escuro") { baque(0.7); g.gain.setTargetAtTime(vol * 0.55, t, 0.3); lp.frequency.setTargetAtTime(95, t, 0.4) }
      if (f === "dispara") {
        const dd = TERROR.fases.dispara
        oscs.forEach((o) => { o.frequency.setValueAtTime(o.frequency.value, t); o.frequency.exponentialRampToValueAtTime(o.frequency.value * 2.4, t + dd) })
        lp.frequency.setTargetAtTime(1100, t, dd / 2.5); g.gain.setTargetAtTime(vol * 1.4, t, 0.4)
      }
      if (f === "chega") g.gain.setTargetAtTime(0, t, 0.25)
    },
    parar() {
      const t = c.currentTime
      g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.08)
      for (const o of [...oscs, lfo]) { try { o.stop(t + 0.5) } catch {} }
      setTimeout(() => { try { g.disconnect() } catch {} }, 800)
    },
  }
}

function Cena({ onFim, olhar, veu }: { onFim: () => void; olhar: React.MutableRefObject<number>; veu: React.RefObject<HTMLDivElement | null> }) {
  const { scene, camera } = useThree()
  const m = useMemo(() => montar(), [])
  const cabine = useRef<THREE.Group>(null)
  const grade = useRef<THREE.Group>(null)
  const t = useRef(0)
  const som = useRef<ReturnType<typeof montarDrone>>(null)
  const yaw = useRef(0)
  useEffect(() => {
    const n = TERROR.nevoa
    scene.fog = new THREE.Fog(n.cor, n.perto, n.longe)
    scene.background = new THREE.Color(n.cor)
    abafar(true)
    som.current = montarDrone()
    return () => { scene.fog = null; abafar(false); som.current?.parar(); som.current = null; m.descartar() }
  }, [scene, m])
  useFrame((_, dt) => {
    t.current += Math.min(dt, 0.1)
    const q = quadroTerror(t.current), tt = t.current
    som.current?.fase(q.fase)
    if (tt >= DURACAO_TERROR) { onFim(); return }
    const b = 0.5 + 0.5 * Math.sin(tt * Math.PI * 2 * TERROR.respira)
    const { mats, base } = m
    const cor = (k: keyof typeof mats, s: number) => mats[k].color.copy(base[k]).multiplyScalar(s)
    // a cabine: a lâmpada acende o que está perto (paredes, vigas, a grade); a vermelha da disparada
    const perto = 0.12 + 0.88 * q.luz
    cor("lampada", 0.05 + 0.95 * q.luz); cor("emerg", 0.15 + 0.85 * q.emergencia * (0.6 + 0.4 * Math.sin(tt * 14)))
    for (const k of ["parede", "viga", "grade", "piso"] as const) { cor(k, perto); mats[k].color.r += 0.25 * q.emergencia * base[k].r * 3 }
    // os andares: as máquinas respiram (mesmo com a luz apagada, mais fracas); o resto apaga
    const resp = (0.3 + 0.7 * b) * (0.35 + 0.65 * q.andares)
    cor("olho", resp); cor("respiro", resp); cor("vidro", (0.25 + 0.75 * q.andares) * (0.7 + 0.3 * b)); cor("placa", 0.1 + 0.9 * q.andares)
    for (const k of ["cama", "robo", "base", "rack", "laje"] as const) cor(k, 0.3 + 0.7 * q.andares)
    if (cabine.current) cabine.current.position.y = q.y
    if (grade.current) grade.current.position.x = (1 - q.portas) * (CAB * 2 - 0.2)
    // a câmera: a pessoa em pé no meio da cabine, olhando pra grade da frente
    yaw.current += (olhar.current - yaw.current) * Math.min(1, dt * 8)
    const sh = q.tremor, sx = (Math.random() - 0.5) * sh, sy = (Math.random() - 0.5) * sh
    camera.position.set(sx, q.y + 1.62 + sy + Math.sin(tt * 1.3) * 0.006, -0.55)
    camera.lookAt(Math.sin(yaw.current) * 6, q.y + 1.5 + sy * 2, -0.55 + Math.cos(yaw.current) * 6)
    if (veu.current) veu.current.style.opacity = q.veu.toFixed(3)
  })
  return (
    <>
      {m.fixo.map((im, i) => <primitive key={`f${i}`} object={im} />)}
      <group ref={cabine}>
        {m.cab.map((im, i) => <primitive key={`c${i}`} object={im} />)}
        <group ref={grade}>{m.frente.map((im, i) => <primitive key={`g${i}`} object={im} />)}</group>
      </group>
    </>
  )
}

/** o percurso inteiro (~25 s); onFim: acabou ou ele tocou pra pular (uma vez só) */
export function PocoTerror({ onFim }: { onFim: () => void }) {
  const foi = useRef(false)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])
  const acabar = useMemo(() => () => { if (foi.current) return; foi.current = true; fim.current() }, [])
  // (revisão 6) rede de segurança: contexto WebGL perdido (iOS) para o relógio do useFrame; ele não fica preso
  useEffect(() => { const t = setTimeout(acabar, (DURACAO_TERROR + 4) * 1000); return () => clearTimeout(t) }, [acabar])
  const olhar = useRef(0)
  const veu = useRef<HTMLDivElement>(null)
  const toque = useRef<{ x: number; y0: number; mexeu: boolean } | null>(null)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "Escape" || e.code === "Enter") { e.preventDefault(); acabar() } }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [acabar])
  return (
    <div className="tr-terror" aria-live="polite"
      onPointerDown={(e) => { toque.current = { x: e.clientX, y0: olhar.current, mexeu: false } }}
      onPointerMove={(e) => { const tq = toque.current; if (!tq) return; const dx = e.clientX - tq.x; if (Math.abs(dx) > 10) tq.mexeu = true; olhar.current = Math.max(-1.1, Math.min(1.1, tq.y0 - dx * 0.006)) }}
      onPointerUp={() => { const tq = toque.current; toque.current = null; if (tq && !tq.mexeu) acabar() }}
      onPointerCancel={() => { toque.current = null }}>
      <Canvas className="tr-terror-cvs" dpr={DPR.v ?? 1} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }} camera={{ fov: 70, near: 0.05, far: TERROR.nevoa.longe + 6 }}>
        <Cena onFim={acabar} olhar={olhar} veu={veu} />
      </Canvas>
      <div ref={veu} className="tr-terror-veu" />
      <p className="tr-terror-dica">toque pra pular · arraste pra olhar</p>
    </div>
  )
}
