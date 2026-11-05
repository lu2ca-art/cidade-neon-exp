"use client"

// (T29) O FINAL NO MUNDO: o 3D e a câmera roteirizada da sequência (as regras,
// os tempos e as legendas moram em disco/final.ts; a tela, em disco/FinalTela.tsx).
//
//   sinal   a câmera gira devagar em volta da casa da D-Bee
//   nove    um corte por ponto: cada um dos nove de pé na beira da pista da
//           faixa dele (embaixo do monumento), esperando; a câmera chega devagar
//   chuva   lá do alto, em volta da torre central: os nove fachos acendem juntos
//           até os monumentos e a chuva toma a cidade (a mesma chuva do jogo)
//   criador atrás do filme (o vídeo da despedida): a casa, chegando devagar, na chuva
//   quintal atrás da casa: a Kombi no quintal e o mato voltando no deserto
//
// PROVISÓRIO (regra 10): as pessoas são cápsulas na cor da missão (os modelos do
// Tripo entram aqui), o mato são cones. Desempenho: sem luz nova; 2 instanciadas
// (pessoas e fachos) só no "nove"/"chuva", 1 instanciada (o mato) e a Kombi só
// perto da casa. Por quadro: a câmera (6 números) e, no crescer do mato, as matrizes.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import * as THREE from "three"
import type { MundoDisco } from "./mundoDisco"
import { PISTAS } from "./pistas"
import { PASSO } from "./pista"
import { Perto, PERTO_EXTRA } from "./Perto"
import { CHUVA_MANIFESTO } from "./manifestos/ceu"
import { CASA, ROT_CASA } from "../disco/historia"
import { CAM_ROTEIRO, FINAL_CFG, FINAL_VIVO, NOVE, lerFinal, ouvirFinal } from "../disco/final"

const ALTO_MONUMENTO = 110 // m acima da pista (Monumentos.tsx, ALTURA)
const FORA_DA_PISTA = 11.5 // m do eixo da pista até onde a pessoa fica de pé
const ESCALA_PESSOA = 1.5

// um ponto em volta da casa: lx pro lado, lz pra frente (a frente olha a cidade)
const naCasa = (lx: number, lz: number) => ({
  x: CASA.x + Math.cos(ROT_CASA) * lx + Math.sin(ROT_CASA) * lz,
  z: CASA.z - Math.sin(ROT_CASA) * lx + Math.cos(ROT_CASA) * lz,
})
// a Kombi do quintal: atrás da casa, de lado. (revisão 3) é a Kombi DO JOGADOR: o
// Corrida.tsx põe ela aqui na despedida (QUINTAL_FINAL) e ela fica; não existe cópia
const QUINTAL = naCasa(-7, -17)
// o rumo do jogo (j.rumo) com a Kombi de lado pra casa (o modelo olha pra -z: rumo = giro + π)
export const QUINTAL_FINAL = { x: QUINTAL.x, z: QUINTAL.z, rumo: ROT_CASA + Math.PI * 1.5 }
const suave = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k) }
const NADA = { momento: null, feito: false }
const lerServidor = () => NADA

export function FinalNove({ M }: { M: MundoDisco }) {
  const vivo = useSyncExternalStore(ouvirFinal, lerFinal, lerServidor)
  const ativo = vivo.momento !== null

  // ── onde fica cada um dos nove (a pista da faixa: o lugar da missão dela; o Xeriff: o lugar dele) ──
  const pontos = useMemo(() => NOVE.map((n) => {
    const nome = n.faixa ? PISTAS.find((p) => p.id === n.faixa)?.faixa : null
    const o = M.onde?.(nome ? `missao:${nome}` : `lugar:${n.lugar}`) ?? null
    if (!o) return null
    const V = M.vias[o.via], i = Math.max(0, Math.min(V.n - 1, Math.round(o.u / PASSO)))
    const tx = V.tx[i], tz = V.tz[i], lado = o.lado ?? 1
    // o lado de fora da pista (o normal no plano: (-tz, tx))
    const nx = -tz * lado, nz = tx * lado
    const x = V.px[i] + nx * FORA_DA_PISTA, z = V.pz[i] + nz * FORA_DA_PISTA, y = V.py[i]
    return { ...n, x, y, z, tx, tz, nx, nz, cx: V.px[i], cz: V.pz[i] }
  }), [M])
  const chaoCasa = useMemo(() => M.chaoEm(CASA.x, CASA.z), [M])
  // (revisão 3) os pontos que o "nove" e o "CHUVA" vão mostrar (os nove e a torre
  // central): entram no <Perto> como câmeras extras, um por vez durante o "sinal", pra
  // cada corte já achar a cidade montada (e o tranco de montar fica espalhado no sinal)
  const aquecer = useMemo(() => [
    ...pontos.filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({ x: p.cx, z: p.cz })),
    { x: M.central.x, z: M.central.z },
  ], [pontos, M])

  // ── as nove pessoas e os nove fachos (instanciados: 2 desenhos) ──
  const nove = useMemo(() => {
    const geoP = new THREE.CapsuleGeometry(0.42, 1.1, 4, 8)
    const geoF = new THREE.CylinderGeometry(0.7, 0.7, 1, 8, 1, true)
    const matP = new THREE.MeshBasicMaterial({ toneMapped: false })
    const matF = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
    const pessoas = new THREE.InstancedMesh(geoP, matP, NOVE.length)
    const fachos = new THREE.InstancedMesh(geoF, matF, NOVE.length)
    pessoas.frustumCulled = fachos.frustumCulled = false
    const m = new THREE.Matrix4(), c = new THREE.Color()
    pontos.forEach((p, k) => {
      if (!p) { m.makeScale(0, 0, 0); pessoas.setMatrixAt(k, m); fachos.setMatrixAt(k, m); return }
      m.makeScale(ESCALA_PESSOA, ESCALA_PESSOA, ESCALA_PESSOA).setPosition(p.x, p.y + 0.97 * ESCALA_PESSOA, p.z)
      pessoas.setMatrixAt(k, m)
      m.makeScale(1, ALTO_MONUMENTO, 1).setPosition(p.x, p.y + ALTO_MONUMENTO / 2, p.z)
      fachos.setMatrixAt(k, m)
      c.set(p.cor); pessoas.setColorAt(k, c); fachos.setColorAt(k, c)
    })
    return { pessoas, fachos }
  }, [pontos])
  useEffect(() => () => { for (const o of [nove.pessoas, nove.fachos]) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); o.dispose() } }, [nove])

  // ── a câmera roteirizada e a chuva (por quadro: só números) ──
  const chuvaEscrita = useRef(false)
  const fachos = useRef<THREE.InstancedMesh>(null)
  useFrame((_, dt) => {
    const mo = FINAL_VIVO.momento
    CAM_ROTEIRO.ativo = mo !== null
    // as câmeras extras do <Perto>: crescem no sinal, inteiras no nove e no CHUVA, somem depois
    const ex = PERTO_EXTRA.pontos
    const nEx = mo === "sinal" ? Math.min(aquecer.length, 1 + Math.floor(((performance.now() / 1000 - FINAL_VIVO.t0) / (FINAL_CFG.sinal * 0.85)) * aquecer.length))
      : mo === "nove" || mo === "chuva" ? aquecer.length : 0
    if (ex.length !== nEx) { ex.length = 0; for (let k = 0; k < nEx; k++) ex.push(aquecer[k]) }
    if (mo === null) {
      if (chuvaEscrita.current) { CHUVA_MANIFESTO.k = 0; chuvaEscrita.current = false }
      return
    }
    const t = performance.now() / 1000 - FINAL_VIVO.t0
    const C = CAM_ROTEIRO
    let chuvaAlvo = 0
    if (mo === "sinal") {
      // gira devagar em volta da casa, baixo, com a casa acesa no meio
      const a = ROT_CASA + 0.5 + t * 0.045, r = 36 - t * 0.6
      C.px = CASA.x + Math.sin(a) * r; C.pz = CASA.z + Math.cos(a) * r; C.py = chaoCasa + 8 - t * 0.25
      C.ox = CASA.x; C.oy = chaoCasa + 3; C.oz = CASA.z
    } else if (mo === "nove") {
      // um corte por pessoa; dentro do corte a câmera chega devagar e sobe o olhar pro monumento
      const k = Math.min(NOVE.length - 1, Math.floor(t / FINAL_CFG.porPonto))
      const s = (t - k * FINAL_CFG.porPonto) / FINAL_CFG.porPonto
      const p = pontos[k]
      if (p) {
        const atras = 13 - 4 * suave(s)
        C.px = p.cx - p.nx * 3 - p.tx * atras; C.pz = p.cz - p.nz * 3 - p.tz * atras; C.py = p.y + 3.2
        C.ox = p.x; C.oy = p.y + 2 + 10 * suave(s); C.oz = p.z
      }
    } else if (mo === "chuva") {
      // lá de cima, em volta da torre central: a cidade inteira na chuva
      const T = M.central, e = suave(t / FINAL_CFG.chuva)
      const a = t * 0.06, r = 520 - 120 * e
      C.px = T.x + Math.sin(a) * r; C.pz = T.z + Math.cos(a) * r; C.py = (T.topo || 160) + 160 - 60 * e
      C.ox = T.x; C.oy = (T.topo || 160) * 0.45; C.oz = T.z
      chuvaAlvo = FINAL_CFG.chuvaMax * suave(t / (FINAL_CFG.chuva * 0.6))
    } else if (mo === "criador") {
      // atrás do filme: a frente da casa, chegando devagar, na chuva
      const e = suave(t / 30), de = naCasa(-6, 50), ate = naCasa(-3, 30)
      C.px = de.x + (ate.x - de.x) * e; C.pz = de.z + (ate.z - de.z) * e; C.py = chaoCasa + 2.2
      C.ox = CASA.x; C.oy = chaoCasa + 3.2; C.oz = CASA.z
      chuvaAlvo = FINAL_CFG.chuvaDespedida
    } else if (mo === "quintal") {
      // atrás da casa: a Kombi no quintal; o mato voltando em volta
      const e = suave(t / FINAL_CFG.quintal), de = naCasa(26, -46), ate = naCasa(12, -32)
      C.px = de.x + (ate.x - de.x) * e; C.pz = de.z + (ate.z - de.z) * e; C.py = chaoCasa + 5 + 6 * e
      C.ox = QUINTAL.x; C.oy = chaoCasa + 1.5; C.oz = QUINTAL.z
      chuvaAlvo = t < FINAL_CFG.quintal * 0.5 ? FINAL_CFG.chuvaQuintal : 0
    }
    // a câmera nunca entra no chão do deserto
    C.py = Math.max(C.py, M.chaoEm(C.px, C.pz) + 1.2)
    // a chuva chega e vai embora devagar (a mesma do jogo: manifestos/ceu.ts)
    CHUVA_MANIFESTO.k += (chuvaAlvo - CHUVA_MANIFESTO.k) * Math.min(1, dt * 0.8)
    chuvaEscrita.current = true
    // os fachos acendem juntos no CHUVA (a rede: os nove ao mesmo tempo)
    if (fachos.current) {
      const mat = fachos.current.material as THREE.MeshBasicMaterial
      mat.opacity = mo === "chuva" ? 0.34 * suave(t / 1.5) * (0.85 + 0.15 * Math.sin(t * 6)) : 0
      fachos.current.visible = mo === "chuva"
    }
  })
  // saiu do jogo no meio do final: a câmera e a chuva voltam a ser do jogo
  useEffect(() => () => { CAM_ROTEIRO.ativo = false; PERTO_EXTRA.pontos.length = 0; if (chuvaEscrita.current) CHUVA_MANIFESTO.k = 0 }, [])

  const comNove = vivo.momento === "nove" || vivo.momento === "chuva"
  const comQuintal = vivo.momento === "quintal" || (vivo.feito && !ativo)
  return (
    <>
      {comNove && <primitive object={nove.pessoas} />}
      {comNove && <primitive ref={fachos} object={nove.fachos} />}
      {comQuintal && (
        <Perto nome="final-quintal" raio={900} pontos={[CASA]}>
          <Quintal M={M} crescer={vivo.momento === "quintal"} />
        </Perto>
      )}
    </>
  )
}

// o quintal da D-Bee depois do CHUVA: a Kombi (a que jogaram lá de cima) e o
// deserto reflorestado em volta (provisório: cones verdes até os modelos)
function Quintal({ M, crescer }: { M: MundoDisco; crescer: boolean }) {
  const mato = useMemo(() => {
    const geo = new THREE.ConeGeometry(1, 3, 5)
    geo.translate(0, 1.5, 0)
    const mat = new THREE.MeshLambertMaterial({ flatShading: true })
    const im = new THREE.InstancedMesh(geo, mat, FINAL_CFG.mato)
    im.frustumCulled = false
    // sempre o mesmo mato (sorteio fixo)
    let sem = 7
    const r = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647 }
    const base: { x: number; y: number; z: number; s: number; a: number }[] = []
    const c = new THREE.Color()
    for (let i = 0; i < FINAL_CFG.mato; i++) {
      const ang = r() * Math.PI * 2, d = 34 + Math.sqrt(r()) * (FINAL_CFG.matoRaio - 34)
      const x = CASA.x + Math.sin(ang) * d, z = CASA.z + Math.cos(ang) * d
      base.push({ x, y: M.chaoEm(x, z), z, s: 0.6 + r() * 1.8, a: r() * 6.28 })
      c.setHSL(0.27 + r() * 0.1, 0.55, 0.18 + r() * 0.16)
      im.setColorAt(i, c)
    }
    return { im, base }
  }, [M])
  useEffect(() => () => { mato.im.geometry.dispose(); (mato.im.material as THREE.Material).dispose(); mato.im.dispose() }, [mato])
  // cresce no "quintal" (4 s, de perto pra longe); depois (o final já visto) fica parado, inteiro
  const feitoEm = useRef(-1)
  const q = useMemo(() => ({ m: new THREE.Matrix4(), r: new THREE.Quaternion(), p: new THREE.Vector3(), e: new THREE.Vector3(), y: new THREE.Vector3(0, 1, 0) }), [])
  useFrame(() => {
    const t = crescer ? performance.now() / 1000 - FINAL_VIVO.t0 : 99
    if (feitoEm.current === 99 && t === 99) return
    const im = mato.im
    for (let i = 0; i < mato.base.length; i++) {
      const b = mato.base[i]
      const k = suave((t - 0.6 - (i / mato.base.length) * 2.4) / 1.4) * b.s
      q.r.setFromAxisAngle(q.y, b.a)
      q.m.compose(q.p.set(b.x, b.y, b.z), q.r, q.e.set(k, k, k))
      im.setMatrixAt(i, q.m)
    }
    im.instanceMatrix.needsUpdate = true
    feitoEm.current = t >= 99 ? 99 : t
  })
  return <primitive object={mato.im} />
}
