"use client"
/* eslint-disable react-hooks/immutability -- three.js: a câmera e as cores mudam a cada quadro */

// A SALA DE CONTROLE DO NÚCLEO (16/11, episodios.md "A entrega e as incubadoras", palavras
// do dono): o elevador no fim da sala das incubadoras sobe até a sala de controle do
// Núcleo, dentro do prédio. Ali o plano se revela: todo mundo já sabia, foram parar lá
// de propósito. Só se assiste: a câmera anda devagar até o painel, os nove em volta
// dele (na cor de cada um), e as falas (RASCUNHO, disco/finalTextos.ts) uma por vez.
// (18/11, o dono) cada frase é dita por um amigo diferente: quem fala dá um passo pro
// painel (só muda a matriz dele quando a fala troca) e a legenda leva o nome e a cor.
//
// Desempenho: só monta neste momento (dentro do EntregaCena, que o page.tsx abre com
// next/dynamic). Canvas próprio, MeshBasicMaterial, uma InstancedMesh por peça (as
// paredes, as telas, os corpos), névoa curta. As telas piscam trocando a cor de umas
// poucas instâncias a cada 0,25 s, sem nada novo por quadro. Ao sair, descarta tudo.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { DPR } from "@/app/linha/estrada/resolucao"
import { audioCtx, saidaSom } from "../som"
import { corDe, nomeDe } from "./entrega"
import type { MissaoId } from "./portas"
import { TEXTOS_FINAL } from "./finalTextos"

// ═══ RASCUNHO: os números da sala (o dono mexe aqui) ═══
export const CONTROLE_CFG = {
  subida: 2.6, // s: o elevador subindo (escuro, o zumbido)
  fala: 3.6, // s por fala
  fim: 2.4, // s depois da última fala, antes de sair
  largura: 16, // m
  fundo: 18, // m
  alto: 5,
  telas: 40, // as telas da parede do fundo (8 × 5)
  piscam: 6, // quantas telas trocam de cor a cada passo
  nevoa: 26,
}
const K = CONTROLE_CFG

// o zumbido do elevador subindo (um tom que sobe), barato e descartado sozinho
function somSubida() {
  const c = audioCtx(), out = saidaSom()
  if (!c || !out) return
  const t = c.currentTime, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter()
  o.type = "sawtooth"; o.frequency.setValueAtTime(48, t); o.frequency.linearRampToValueAtTime(96, t + K.subida)
  lp.type = "lowpass"; lp.frequency.value = 260
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.5); g.gain.setTargetAtTime(0.0001, t + K.subida - 0.3, 0.2)
  o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + K.subida + 0.6)
}

function montarSala(amigos: MissaoId[]) {
  const d = new THREE.Object3D()
  const mt = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => { d.position.set(x, y, z); d.rotation.set(0, ry, 0); d.scale.set(sx, sy, sz); d.updateMatrix(); return d.matrix.clone() }
  const caixa = new THREE.BoxGeometry(1, 1, 1)
  const corpo = new THREE.CapsuleGeometry(0.24, 1.1, 3, 8).translate(0, 0.8, 0)
  const descarta: { dispose: () => void }[] = [caixa, corpo]
  const mat = (cor: string, extra: THREE.MeshBasicMaterialParameters = {}) => { const m = new THREE.MeshBasicMaterial({ color: cor, ...extra }); descarta.push(m); return m }
  const W = K.largura, F = K.fundo, A = K.alto
  // a sala: chão, teto, paredes; o painel no meio
  const sala = new THREE.InstancedMesh(caixa, mat("#0d1018"), 6)
  ;[mt(0, -0.05, -F / 2, W, 0.1, F), mt(0, A, -F / 2, W, 0.1, F), mt(-W / 2, A / 2, -F / 2, 0.1, A, F), mt(W / 2, A / 2, -F / 2, 0.1, A, F), mt(0, A / 2, -F, W, A, 0.1), mt(0, 0.5, -F * 0.55, 5, 1, 1.6)].forEach((m, i) => sala.setMatrixAt(i, m))
  // as telas do fundo
  const cols = 8, linhas = Math.ceil(K.telas / cols)
  const telas = new THREE.InstancedMesh(caixa, mat("#ffffff", { toneMapped: false }), K.telas)
  const corTela = new THREE.Color()
  for (let i = 0; i < K.telas; i++) {
    const c = i % cols, l = Math.floor(i / cols)
    telas.setMatrixAt(i, mt((c - (cols - 1) / 2) * 1.7, 1.2 + l * 0.72, -F + 0.12, 1.5, 0.6, 0.05))
    telas.setColorAt(i, corTela.setHSL(0.52 + Math.random() * 0.08, 0.8, 0.18 + Math.random() * 0.2))
  }
  // o painel aceso por cima
  const painel = new THREE.InstancedMesh(caixa, mat("#7af0ff", { toneMapped: false }), 1)
  painel.setMatrixAt(0, mt(0, 1.02, -F * 0.55, 4.6, 0.04, 1.3))
  // os nove em volta do painel, de frente pra quem chega
  const gente = new THREE.InstancedMesh(corpo, mat("#ffffff"), Math.max(1, amigos.length))
  const lugarDe = (i: number, passo: number) => {
    const a = (i / Math.max(1, amigos.length - 1) - 0.5) * 2.4 // em leque atrás do painel, de frente pra câmera
    return mt(Math.sin(a) * 3.6, 0, -F * 0.55 - 1.5 + (1 - Math.cos(a)) * 1.4 + passo, 1 + passo * 0.08, 1 + passo * 0.08, 1 + passo * 0.08)
  }
  amigos.forEach((id, i) => {
    gente.setMatrixAt(i, lugarDe(i, 0))
    gente.setColorAt(i, corTela.set(corDe(id)))
  })
  let falando = -1
  for (const im of [sala, telas, painel, gente]) { im.frustumCulled = false; descarta.push(im) }
  return {
    objetos: [sala, telas, painel, gente],
    // umas poucas telas trocam de cor (o Núcleo trabalhando)
    piscar() {
      for (let k = 0; k < K.piscam; k++) telas.setColorAt(Math.floor(Math.random() * K.telas), corTela.setHSL(0.5 + Math.random() * 0.12, 0.85, 0.12 + Math.random() * 0.32))
      if (telas.instanceColor) telas.instanceColor.needsUpdate = true
    },
    // (18/11) quem fala dá um passo pro painel; quem falou volta pro lugar
    falar(id: MissaoId | null) {
      const i = id ? amigos.indexOf(id) : -1
      if (i === falando) return
      if (falando >= 0) gente.setMatrixAt(falando, lugarDe(falando, 0))
      if (i >= 0) gente.setMatrixAt(i, lugarDe(i, 0.9))
      falando = i
      gente.instanceMatrix.needsUpdate = true
    },
    descartar() { descarta.forEach((x) => x.dispose()) },
  }
}

function Cena({ amigos, quem }: { amigos: MissaoId[]; quem: MissaoId | null }) {
  const { scene, camera } = useThree()
  const m = useMemo(() => montarSala(amigos), [amigos])
  useEffect(() => () => m.descartar(), [m])
  useEffect(() => { m.falar(quem) }, [m, quem])
  useEffect(() => {
    scene.fog = new THREE.Fog("#05060a", 2, K.nevoa)
    scene.background = new THREE.Color("#05060a")
    return () => { scene.fog = null }
  }, [scene])
  const t = useRef(0), passo = useRef(0)
  useFrame((_, dt) => {
    t.current += Math.min(dt, 0.1)
    if ((passo.current += dt) > 0.25) { passo.current = 0; m.piscar() }
    // a câmera sai do elevador e anda devagar até o painel
    const dura = K.fala * TEXTOS_FINAL.controle.length + K.fim
    const k = Math.min(1, t.current / dura), s = k * k * (3 - 2 * k)
    camera.position.set(Math.sin(t.current * 0.2) * 0.3, 1.65, -1 - s * (K.fundo * 0.25))
    camera.lookAt(0, 1.3, -K.fundo * 0.6)
  })
  return <>{m.objetos.map((o, i) => <primitive key={i} object={o} />)}</>
}

/** o elevador subindo e a sala de controle. onFim: acabou (o final segue) */
export function SalaControle({ amigos, onFim }: { amigos: MissaoId[]; onFim: () => void }) {
  const [fase, setFase] = useState<"subindo" | "sala">("subindo")
  const [fala, setFala] = useState(-1)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim })
  useEffect(() => {
    somSubida()
    const ts: ReturnType<typeof setTimeout>[] = [setTimeout(() => setFase("sala"), K.subida * 1000)]
    TEXTOS_FINAL.controle.forEach((_, i) => ts.push(setTimeout(() => setFala(i), (K.subida + 1 + i * K.fala) * 1000)))
    ts.push(setTimeout(() => fim.current(), (K.subida + 1 + TEXTOS_FINAL.controle.length * K.fala + K.fim) * 1000))
    return () => ts.forEach(clearTimeout)
  }, [])
  return (
    <div className={`en-controle is-${fase}`}>
      {fase === "sala" && (
        <Canvas className="en-corredor-cvs" dpr={DPR.v ?? 1} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }} camera={{ fov: 62, near: 0.05, far: K.nevoa + 4 }}>
          <Cena amigos={amigos} quem={fala >= 0 ? TEXTOS_FINAL.controle[fala].quem : null} />
        </Canvas>
      )}
      {fala >= 0 && (() => {
        const f = TEXTOS_FINAL.controle[fala]
        return <p key={fala} className="en-controle-fala" aria-live="polite"><b style={{ color: corDe(f.quem), display: "block", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>{nomeDe(f.quem)}</b>{f.texto}</p>
      })()}
      <i className="en-corredor-veu" aria-hidden="true" />
    </div>
  )
}
