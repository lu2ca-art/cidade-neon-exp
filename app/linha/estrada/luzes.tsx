"use client"

// AS LUZES DA CIDADE (19/10, desempenho): o three.js calcula TODA pointLight
// em todo pixel de todo material iluminado, e recompila todos os materiais
// quando o número de luzes muda (travadas de 1–3 s no Mac). O mapa-disco tinha
// 31. Agora as luzes fixas (vitrines, postes dos lugares, bombas, torres) só se
// registram aqui, e um punhado de luzes de verdade (LUZES_POOL) vai, a cada
// quadro, pras mais perto da câmera. Cada luz alcança 10–30 m: de longe ela
// já não ilumina nada, então a troca não aparece.

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { QUALIDADE, type NivelQualidade } from "./qualidade"

// (22/10, perf 003) era 6. Cada pointLight custa em TODO pixel iluminado
// (o shader percorre todas, mesmo apagadas), e a GPU por pixel é o gargalo.
// Medido no trajeto: a câmera fica a 25–45 m de altura e quase sempre só 0–2
// luzes registradas alcançam algo perto dela; as outras do pool iam pra
// vitrines a 150–500 m (alcance 11–12 m: não iluminavam nada). Com 4, o beco
// (5 juntas) perde só a mais longe da câmera, que entra quando chega perto.
// (30/10, leveza C) pela qualidade: 4 no alto, 2 no médio e no leve (no celular
// cada luz pesa em todo pixel). Lido na montagem da estrada e fixo até ela
// desmontar: mudar o número de luzes recompila todos os materiais
const LUZES_POOL = 4
const POOL_POR_NIVEL: Record<NivelQualidade, number> = { alto: 4, medio: 2, baixo: 2 }

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

// (30/10, leveza C) antes, um scene.traverse em TODO quadro (milhares de
// objetos da cidade, 60x por segundo) só pra achar material novo. Agora o
// Object3D.add avisa quem entrou (NOVOS) e o quadro olha só esses galhos; a
// cada 30 quadros uma varredura inteira pega o resto (material trocado num
// objeto que já estava na cena). Sem nada novo, o quadro não percorre nada
const NOVOS: THREE.Object3D[] = []
let ouvindo = 0 // (só junta enquanto a estrada está montada: fora dela não segura objeto nenhum)
const comAviso = THREE.Object3D.prototype as THREE.Object3D & { __avisaNovo?: boolean }
if (!comAviso.__avisaNovo) {
  comAviso.__avisaNovo = true
  const addOriginal = THREE.Object3D.prototype.add
  THREE.Object3D.prototype.add = function (this: THREE.Object3D, ...objs: THREE.Object3D[]) {
    for (let i = 0; i < objs.length; i++) if (ouvindo > 0 && NOVOS.length < 4096) NOVOS.push(objs[i])
    return addOriginal.apply(this, objs)
  }
}
const VARREDURA = 30

function naCena(o: THREE.Object3D, scene: THREE.Scene) {
  let p: THREE.Object3D | null = o
  while (p) { if (p === scene) return true; p = p.parent }
  return false
}

export function CompilaSemTravar() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  // a checagem de um objeto, criada uma vez (nada de função nova por quadro)
  const checar = useMemo(() => {
    const prontos = new WeakSet<THREE.Material>()
    const esperando = new WeakSet<THREE.Object3D>()
    const cam = { atual: camera }
    const pronto = (mat: THREE.Material) => {
      if (prontos.has(mat)) return true
      if ((gl.properties.get(mat) as { currentProgram?: unknown }).currentProgram) { prontos.add(mat); return true }
      return false
    }
    const f = (o: THREE.Object3D) => {
      const m = (o as THREE.Mesh).material
      if (!m || esperando.has(o)) return
      let falta = false
      if (Array.isArray(m)) { for (let i = 0; i < m.length; i++) if (!pronto(m[i])) falta = true }
      else falta = !pronto(m)
      if (!falta) return
      esperando.add(o)
      const camadas = o.layers.mask
      o.layers.mask = 0
      compilarSemTravar(gl, o, cam.atual, scene).finally(() => {
        const mm = (o as THREE.Mesh).material
        if (Array.isArray(mm)) for (const x of mm) prontos.add(x)
        else if (mm) prontos.add(mm) // (o programa só vira "atual" quando desenha)
        o.layers.mask = camadas
        esperando.delete(o)
      })
    }
    return { f, cam }
  }, [gl, scene, camera])
  const quadro = useRef(0)
  useEffect(() => { ouvindo++; return () => { ouvindo--; NOVOS.length = 0 } }, [])
  useFrame(({ camera: c }) => {
    checar.cam.atual = c
    // 1º quadro e a cada 30: a cena toda (o que já estava antes de montar, material trocado)
    if (quadro.current++ % VARREDURA === 0) { NOVOS.length = 0; scene.traverse(checar.f); return }
    if (!NOVOS.length) return
    // só os galhos que entraram (o que entrou fora desta cena fica pra varredura)
    for (let i = 0; i < NOVOS.length; i++) { const o = NOVOS[i]; if (naCena(o, scene)) o.traverse(checar.f) }
    NOVOS.length = 0
  })
  return null
}

// a escolha do quadro, sem alocar nada (antes: array, sort, Set, slice e map a
// cada quadro): as N melhores notas numa lista fixa, por inserção (N ≤ 4)
const TOP_NOTA = new Float64Array(LUZES_POOL)
const TOP_REG: (Registro | null)[] = Array(LUZES_POOL).fill(null)
const TOP_USADO: boolean[] = Array(LUZES_POOL).fill(false)
const LIVRES = new Int8Array(LUZES_POOL)
const ESCOLHA = { n: 0, max: LUZES_POOL, cam: new THREE.Vector3() }
function notar(r: Registro) {
  if (r.intensidade <= 0) return
  r.obj.getWorldPosition(r.p)
  // a nota: a distância da câmera até a borda do alcance (limitado: a luz enorme da torre não toma o lugar das de perto)
  const nota = r.p.distanceTo(ESCOLHA.cam) - Math.min(r.distancia || 40, 40)
  let i = ESCOLHA.n
  if (i === ESCOLHA.max) { if (nota >= TOP_NOTA[i - 1]) return; i-- } else ESCOLHA.n++
  while (i > 0 && TOP_NOTA[i - 1] > nota) { TOP_NOTA[i] = TOP_NOTA[i - 1]; TOP_REG[i] = TOP_REG[i - 1]; i-- }
  TOP_NOTA[i] = nota; TOP_REG[i] = r
}

// as luzes de verdade: N do nível (o número nunca muda com a estrada montada: nada recompila)
export function LuzesProximas() {
  const [pool] = useState(() => Math.min(LUZES_POOL, POOL_POR_NIVEL[QUALIDADE.nivel] ?? LUZES_POOL))
  const luzes = useRef<(THREE.PointLight | null)[]>([])
  const dono = useRef<(Registro | null)[]>(Array(pool).fill(null))
  const fade = useRef<number[]>(Array(pool).fill(0))
  useEffect(() => () => { dono.current.fill(null) }, [])
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
    ESCOLHA.cam.copy(camera.position); ESCOLHA.n = 0; ESCOLHA.max = pool
    REGISTRO.forEach(notar)
    const n = ESCOLHA.n
    for (let k = 0; k < n; k++) TOP_USADO[k] = false
    // quem já tem luz e continua escolhido fica com ela (sem piscar)
    let nLivres = 0
    for (let i = 0; i < pool; i++) {
      const d = dono.current[i]
      let k = -1
      if (d && REGISTRO.has(d)) for (let j = 0; j < n; j++) if (TOP_REG[j] === d) { k = j; break }
      if (k >= 0) TOP_USADO[k] = true
      else { dono.current[i] = null; fade.current[i] = 0; LIVRES[nLivres++] = i }
    }
    let l = 0
    for (let k = 0; k < n && l < nLivres; k++) if (!TOP_USADO[k]) dono.current[LIVRES[l++]] = TOP_REG[k]
    for (let k = 0; k < n; k++) TOP_REG[k] = null // (não segura registro de luz que sai de cena)
    for (let i = 0; i < pool; i++) {
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
      {Array.from({ length: pool }, (_, i) => (
        <pointLight key={i} ref={(l) => { luzes.current[i] = l }} intensity={0} />
      ))}
    </>
  )
}
