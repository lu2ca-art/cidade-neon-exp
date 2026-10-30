"use client"

// AS LUZES DA CIDADE (19/10, desempenho): o three.js calcula TODA pointLight
// em todo pixel de todo material iluminado, e recompila todos os materiais
// quando o número de luzes muda (travadas de 1–3 s no Mac). O mapa-disco tinha
// 31. Agora as luzes fixas (vitrines, postes dos lugares, bombas, torres) só se
// registram aqui, e um punhado de luzes de verdade (LUZES_POOL) vai, a cada
// quadro, pras mais perto da câmera. Cada luz alcança 10–30 m: de longe ela
// já não ilumina nada, então a troca não aparece.

import { useFrame } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useRef } from "react"
import * as THREE from "three"

// (22/10, perf 003) era 6. Cada pointLight custa em TODO pixel iluminado
// (o shader percorre todas, mesmo apagadas), e a GPU por pixel é o gargalo.
// Medido no trajeto: a câmera fica a 25–45 m de altura e quase sempre só 0–2
// luzes registradas alcançam algo perto dela; as outras do pool iam pra
// vitrines a 150–500 m (alcance 11–12 m: não iluminavam nada). Com 4, o beco
// (5 juntas) perde só a mais longe da câmera, que entra quando chega perto.
const LUZES_POOL = 4

type Registro = { obj: THREE.Object3D; cor: THREE.Color; intensidade: number; distancia: number; decay: number; p: THREE.Vector3 }
const REGISTRO = new Set<Registro>()

type Props = { position?: [number, number, number]; color?: THREE.ColorRepresentation; intensity?: number; distance?: number; decay?: number }

// no lugar de <pointLight>: mesmas props, mas a luz vem do pool
export function LuzPonto({ position = [0, 0, 0], color = "#ffffff", intensity = 1, distance = 0, decay = 2 }: Props) {
  const obj = useRef<THREE.Object3D>(null)
  const reg = useRef<Registro | null>(null)
  useLayoutEffect(() => {
    if (!obj.current) return
    const r: Registro = { obj: obj.current, cor: new THREE.Color(), intensidade: 0, distancia: 0, decay: 2, p: new THREE.Vector3() }
    reg.current = r
    REGISTRO.add(r)
    return () => { REGISTRO.delete(r); reg.current = null }
  }, [])
  // as props mudam (a vitrine acende na cena): o registro acompanha
  useLayoutEffect(() => {
    const r = reg.current
    if (!r) return
    r.cor.set(color); r.intensidade = intensity; r.distancia = distance; r.decay = decay
  }, [color, intensity, distance, decay])
  return <object3D ref={obj} position={position} />
}

// (19/10, desempenho) o three compila o shader de um material na 1ª vez que
// ele é desenhado, travando o jogo (1–3 s no Mac). Os carros do trânsito, os
// efeitos e os modelos que aparecem depois da abertura caíam nisso. Aqui, antes
// de cada quadro: objeto novo com shader ainda não pronto fica fora da tela
// (camada 0) enquanto compila em segundo plano, e aparece uns quadros depois
//
// O jogo desenha a cena numa imagem intermediária (o pós-processamento do
// Cinema.tsx), e aí o shader sai em cor linear, sem tone mapping. Compilar
// pra tela daria outro shader (inútil): compila com uma imagem dessas ligada
// (POS.ativo: o Cinema avisa quando a lente cai pro nível 0, sem pós: aí é pra tela)
export const POS = { ativo: true }
let ALVO: THREE.WebGLRenderTarget | null = null
// (não usa o compileAsync do three: se o material é descartado no meio — o React
// desmonta algo carregando — ele quebra num setTimeout e a promessa nunca
// resolve, e o objeto ficaria escondido pra sempre. Aqui: material sem programa
// conta como pronto, e em 3 s resolve de qualquer jeito)
export function compilarSemTravar(gl: THREE.WebGLRenderer, o: THREE.Object3D, camera: THREE.Camera, scene: THREE.Scene): Promise<void> {
  ALVO ??= new THREE.WebGLRenderTarget(4, 4)
  const antes = gl.getRenderTarget()
  gl.setRenderTarget(POS.ativo ? ALVO : null)
  let mats: Set<THREE.Material>
  try { mats = gl.compile(o, camera, scene) } catch { mats = new Set() } finally { gl.setRenderTarget(antes) }
  // as texturas também: o three só sobe uma textura pra placa de vídeo na 1ª
  // vez que ela aparece (as dos modelos, 1024², davam 60 ms num quadro)
  for (const m of mats) {
    for (const v of Object.values(m)) if ((v as THREE.Texture | null)?.isTexture && !(v as THREE.Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) { try { gl.initTexture(v as THREE.Texture) } catch {} }
  }
  const t0 = performance.now()
  return new Promise((pronto) => {
    const ver = () => {
      for (const m of mats) {
        const p = (gl.properties.get(m) as { currentProgram?: { isReady?: () => boolean } } | undefined)?.currentProgram
        if (!p?.isReady || p.isReady()) mats.delete(m)
      }
      if (!mats.size || performance.now() - t0 > 3000) pronto()
      else setTimeout(ver, 16)
    }
    ver()
  })
}

export function CompilaSemTravar() {
  const prontos = useRef(new WeakSet<THREE.Material>())
  const esperando = useRef(new WeakSet<THREE.Object3D>())
  useFrame(({ gl, scene, camera }) => {
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material
      if (!m || esperando.current.has(o)) return
      const ms = Array.isArray(m) ? m : [m]
      let falta = false
      for (const mat of ms) {
        if (prontos.current.has(mat)) continue
        if ((gl.properties.get(mat) as { currentProgram?: unknown }).currentProgram) prontos.current.add(mat)
        else falta = true
      }
      if (!falta) return
      esperando.current.add(o)
      const camadas = o.layers.mask
      o.layers.mask = 0
      compilarSemTravar(gl, o, camera, scene).finally(() => {
        for (const mat of ms) prontos.current.add(mat) // (o programa só vira "atual" quando desenha)
        o.layers.mask = camadas
        esperando.current.delete(o)
      })
    })
  })
  return null
}

// as luzes de verdade: sempre LUZES_POOL (o número nunca muda: nada recompila)
export function LuzesProximas() {
  const luzes = useRef<(THREE.PointLight | null)[]>([])
  const dono = useRef<(Registro | null)[]>([])
  const fade = useRef<number[]>(Array(LUZES_POOL).fill(0))
  useEffect(() => () => { dono.current = [] }, [])
  // medição (só com ?medir): as luzes registradas, [distância até a câmera, alcance, intensidade, tem luz do pool]
  const cam = useRef(new THREE.Vector3())
  useEffect(() => {
    if (!/[?&]medir/.test(location.search)) return
    const w = window as unknown as { __luzReg?: () => number[][] }
    w.__luzReg = () => [...REGISTRO].map((r) => [+r.p.distanceTo(cam.current).toFixed(1), r.distancia, r.intensidade, dono.current.includes(r) ? 1 : 0])
    return () => { delete w.__luzReg }
  }, [])
  useFrame(({ camera }, dt) => {
    cam.current.copy(camera.position)
    // a nota de cada luz: a distância da câmera até a borda do alcance dela
    const cands: [number, Registro][] = []
    for (const r of REGISTRO) {
      if (r.intensidade <= 0) continue
      r.obj.getWorldPosition(r.p)
      cands.push([r.p.distanceTo(camera.position) - Math.min(r.distancia || 40, 40), r]) // (alcance limitado na nota: a luz enorme da torre não toma o lugar das de perto)
    }
    cands.sort((a, b) => a[0] - b[0])
    const escolhidas = new Set(cands.slice(0, LUZES_POOL).map((c) => c[1]))
    // quem já tem luz e continua escolhido fica com ela (sem piscar)
    const livres: number[] = []
    for (let i = 0; i < LUZES_POOL; i++) {
      const d = dono.current[i]
      if (d && escolhidas.has(d) && REGISTRO.has(d)) escolhidas.delete(d)
      else { dono.current[i] = null; fade.current[i] = 0; livres.push(i) }
    }
    for (const r of escolhidas) { const i = livres.shift(); if (i === undefined) break; dono.current[i] = r }
    for (let i = 0; i < LUZES_POOL; i++) {
      const L = luzes.current[i], r = dono.current[i]
      if (!L) continue
      if (!r) { L.intensity = 0; continue }
      // entra em ~0,25 s
      fade.current[i] = Math.min(1, fade.current[i] + dt * 4)
      L.position.copy(r.p); L.color.copy(r.cor); L.distance = r.distancia; L.decay = r.decay
      L.intensity = r.intensidade * fade.current[i]
    }
  })
  return (
    <>
      {Array.from({ length: LUZES_POOL }, (_, i) => (
        <pointLight key={i} ref={(l) => { luzes.current[i] = l }} intensity={0} />
      ))}
    </>
  )
}
