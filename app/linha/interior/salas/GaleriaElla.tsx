"use client"
/* eslint-disable react-hooks/immutability -- three.js: texturas, instâncias e a tela mexidas a cada quadro */

// A CASA DA ELLA, QUE É A GALERIA (T22, o dono em 29/10). Um salão enorme e
// proibido: quadros até o teto (a maioria virada pra parede), o vidro lá em
// cima com a chuva dela, um balde embaixo de cada goteira (ninguém joga a
// chuva fora). No fundo, sob uma redoma, a planta do Criador. Do lado, um
// cavalete com uma tela em branco.
//
// A ordem (T22b, o dono em 30/10; a cena em disco/ella.ts):
//   1. o FILMINHO da planta (CenaFilme.tsx toca as falas; aqui a câmera vai
//      chegando devagar na planta, que acende)
//   2. conhecer a GALERIA: os quadros que ela guardou, um de cada vez
//   3. PINTAR na luz da planta: o cavalete fica do lado dela, a sala apaga e a
//      planta vira a luz da tela (brilho barato: as folhas emissivas, um halo
//      e uma mancha de luz no chão, aditivos; a única luz pontual da sala é a
//      dela, só muda de força). Pintar reaproveita o som da tela do pintar
//      (app/galeria/pintar/som.ts: cada cor é um instrumento, a altura é a
//      nota); pronta, toca no prego e ela vai pra parede, do lado da planta, e
//      fica tocando até você sair. A obra vai pra galeria de verdade (obras.ts).
//
// (06/11) A CASA MODELADA NO BLENDER (blender/scripts/galeria_ella.py,
// public/models/galeria-ella.glb; a foto em docs/blender/galeria-ella.png): o
// salão, o telhado, as estantes de telas, as molduras, o mezanino e a escada, o
// pedestal com a redoma, o cavalete, os baldes, o canto dela, tapetes e plantas.
// Enquanto baixa, ou se falhar, as caixas de antes (GaleriaCaixas). O que mexe
// segue aqui: a copa e a luz da planta, a chuva, as gotas, a tela, os potes.
// O orçamento: 1 luz pontual (a da planta), as coisas repetidas instanciadas,
// as pinturas desenhadas uma vez só em telinhas de 128 px.

import { canal, mesaCtx } from "@/lib/mesa"
import { useGLTF } from "@react-three/drei"
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import * as THREE from "three"
import { CORES, INSTRUMENTOS, corDaPaleta, criarEco, freqDaAltura, notasDaColuna, tocar } from "../../../galeria/pintar/som"
import { guardarObra } from "../../../galeria/obras"
import { atalhosLiberados } from "../../../teste/atalhos"
import { CENA_GALERIA_ELLA, ELLA_COR, PINTAR, QUADROS, QUADROS_PRECISA, type QuadroElla } from "../../disco/ella"
import { sinalizar } from "../bus"
import { Caixa, Chuva, Npc, Toque, useExplorar, type V3 } from "../comum"
import { Camera, olhar, type Plano, type SalaProps } from "../motor"
import { ModeloSeguro } from "../../estrada/Seguro"

const LARG = 9, FUNDO = 16, ALTO = 7
const PAREDE = "#222a3a"
const VERDE = "#5dffa0"
const ROXO = "#b38cff"
const QUENTE = "#ffcf9a"

// onde fica cada coisa
const PLANTA_POS: V3 = [0, 0, -6.2]
// o cavalete do lado da planta: a luz da tela é ela (T22b)
const CAVALETE: { pos: V3; rot: number } = { pos: [-1.05, 0, -5.35], rot: 0.5 }
const TELA = { larg: 0.8, alto: 1.0, y: 1.5 } // no cavalete
const PAREDE_OBRA: V3 = [2.6, 2.35, -7.94] // onde ela pendura a sua (fundo, do lado da planta)
const BALDES: V3[] = [[2.7, 0, 3.0], [-2.4, 0, -0.4], [2.2, 0, -3.6]]

// em que passo da cena está cada gesto (o resto da câmera se acha pelo texto)
const IDX = (id: string) => CENA_GALERIA_ELLA.passos.findIndex((p) => p.t === "gesto" && p.id === id)
const I_FILME = IDX("filme"), I_QUADROS = IDX("quadros"), I_PINTAR = IDX("pintar")

// a Ella anda pela casa: um lugar pra cada parte da cena
const ELLA_EM: Record<"planta" | "quadros" | "tela" | "fim", { pos: V3; vira: number }> = {
  planta: { pos: [1.15, 0, -5.3], vira: -2.4 },
  quadros: { pos: [0.4, 0, -2.4], vira: 0 },
  tela: { pos: [1.15, 0, -4.6], vira: -2.2 },
  fim: { pos: [1.0, 0, -6.4], vira: -0.5 },
}

const PLANOS: Record<string, Plano> = {
  entrada: { pos: [0, 1.7, 7.4], olha: [0, 2.7, -4], fov: 62 },
  // o filme: a câmera sai da porta e vai chegando na planta, devagar, durante as falas
  filme: { pos: [0.3, 1.45, -4.1], olha: [0, 1.35, -6.2], fov: 46 },
  ellaPlanta: { pos: [-0.7, 1.55, -3.7], olha: [1.15, 1.4, -5.3], fov: 46 },
  quadros: { pos: [0, 1.75, 4.6], olha: [0, 2.2, -2], fov: 64 },
  ellaQuadros: { pos: [0.6, 1.6, 2.6], olha: [-0.9, 1.45, 0.6], fov: 48 },
  pendurar: { pos: [0.9, 1.8, -3.6], olha: [2.4, 2.1, -7.9], fov: 54 },
  ellaFim: { pos: [-0.5, 1.55, -4.4], olha: [1.0, 1.45, -6.4], fov: 48 },
  fim: { pos: [-0.4, 2.3, -2.4], olha: [1.0, 1.7, -7.6], fov: 58 },
}
// de frente pro cavalete (pintar sem a câmera torta)
const N_TELA = new THREE.Vector3(Math.sin(CAVALETE.rot), 0, Math.cos(CAVALETE.rot))
PLANOS.tela = {
  pos: [CAVALETE.pos[0] + N_TELA.x * 1.6, TELA.y + 0.02, CAVALETE.pos[2] + N_TELA.z * 1.6],
  // (a planta fica na beira direita: o halo e os esporos entram na tela)
  olha: [CAVALETE.pos[0], TELA.y - 0.02, CAVALETE.pos[2]],
  fov: 52,
}
// os quadros: a câmera leva você de um em um, do meio do salão (com o celular
// em pé, as duas paredes não cabem juntas); tocou, ela chega perto
const planoDoQuadro = (q: QuadroElla, perto: boolean): Plano => perto
  ? { pos: [q.lado * 1.7, 1.7, q.z + 0.8], olha: [q.lado * (LARG / 2), q.y, q.z], fov: 48 }
  : { pos: [-q.lado * 0.3, 1.7, q.z + 1.6], olha: [q.lado * (LARG / 2), q.y - 0.1, q.z], fov: 56 }

export function SalaGaleriaElla({ estado }: SalaProps) {
  const pos = estado.pos
  // 1. o filme → 2. a galeria → 3. pintar → o fim (a escolha, a porta)
  const fase = pos <= I_FILME ? "filme" : pos < I_QUADROS ? "planta-fala" : pos === I_QUADROS ? "quadros" : pos < I_PINTAR ? "antes" : pos === I_PINTAR ? "pintar" : "fim"
  const olhandoQuadros = estado.gesto === "quadros"
  const pintando = estado.gesto === "pintar"
  const coisasQuadros = useMemo(() => QUADROS.map((q) => ({ id: q.id, pos: [q.lado * (LARG / 2 - 0.12), q.y, q.z] as V3, raio: 0.45, falas: q.falas })), [])
  const quadros = useExplorar(olhandoQuadros, coisasQuadros, QUADROS_PRECISA, sinalizar)
  const ultimoQuadro = QUADROS.find((q) => q.id === quadros.vistas[quadros.vistas.length - 1])
  // as pinturas: um material por quadro (a textura dele), nas telas do modelo ou das caixas
  const telas = useTelas(quadros.vistas)

  // o som da casa: um contexto só (a chuva, as goteiras, a tela)
  const audio = useAudioCasa()
  // a tela: pintando → voando pra parede → pendurada (toca até você sair)
  const [tela, setTela] = useState<"branca" | "voando" | "pendurada">("branca")
  const pendurada = tela === "pendurada" || fase === "fim"

  const plano = useMemo(() => {
    const tx = estado.texto ?? ""
    if (fase === "filme") return PLANOS.filme
    if (fase === "planta-fala") return /guardei/.test(tx) ? PLANOS.ellaQuadros : PLANOS.ellaPlanta
    if (fase === "quadros") {
      if (estado.texto && ultimoQuadro) return planoDoQuadro(ultimoQuadro, true)
      const prox = QUADROS.find((q) => !quadros.vistas.includes(q.id))
      return prox ? planoDoQuadro(prox, false) : PLANOS.quadros
    }
    if (fase === "antes") return /tela|luz|sozinho/.test(tx) ? PLANOS.tela : PLANOS.quadros
    if (fase === "pintar") return tela === "branca" ? PLANOS.tela : PLANOS.pendurar
    if (estado.escolha || estado.falando === "você") return PLANOS.fim
    return estado.falando === "Ella" ? PLANOS.ellaFim : PLANOS.pendurar
  }, [estado, fase, ultimoQuadro, tela, quadros.vistas])

  const ellaEm = fase === "filme" ? ELLA_EM.planta : fase === "planta-fala" ? (/guardei/.test(estado.texto ?? "") ? ELLA_EM.quadros : ELLA_EM.planta) : fase === "quadros" ? ELLA_EM.quadros : fase === "antes" || fase === "pintar" ? ELLA_EM.tela : ELLA_EM.fim

  // atalho de teste (só onde os atalhos valem: fora da produção): __gesto() faz o gesto de agora (olha o
  // próximo quadro; na tela, pinta e pendura)
  const gestoRef = useRef(() => {})
  useEffect(() => {
    gestoRef.current = () => {
      if (olhandoQuadros) { const q = QUADROS.find((x) => !quadros.vistas.includes(x.id)); if (q) quadros.ver(q.id) }
      else if (pintando) (window as unknown as { __pintarElla?: () => void }).__pintarElla?.()
    }
  })
  useEffect(() => {
    if (!atalhosLiberados()) return
    const w = window as unknown as Record<string, unknown>
    w.__gesto = () => gestoRef.current()
    // (o useExplorar também põe um __gesto: este, que vem depois, vale pros dois gestos)
  }, [fase])

  // pintar: o arrasto é da tela, não do olhar
  useEffect(() => {
    olhar.travado = pintando && tela === "branca"
    if (olhar.travado) { olhar.yaw = 0; olhar.pitch = 0 }
    return () => { olhar.travado = false }
  }, [pintando, tela])

  // quanto a planta brilha (0..1): acende no filme, é a luz de tudo no pintar
  const brilho = fase === "filme" ? 0.6 : fase === "antes" || fase === "pintar" ? 1 : fase === "fim" ? 0.75 : 0.35

  return (
    <>
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#06080e", 9, 28]} />
      <LuzDaSala brilho={brilho} />
      <Camera plano={plano} vel={fase === "filme" ? 0.11 : undefined} />
      {/* (06/11) a casa modelada no Blender; enquanto baixa, ou se falhar, as caixas de antes */}
      <ModeloSeguro nome="galeria-ella-glb" reserva={<GaleriaCaixas telas={telas} />}>
        <GaleriaModelada telas={telas} />
      </ModeloSeguro>
      <Chuva n={420} larg={3} alto={6} fundo={FUNDO} centro={[0, ALTO + 0.1, 0]} cor="#9fc8ff" />
      <Goteiras audio={audio} />
      <Quadros vistas={quadros.vistas} ativo={olhandoQuadros} onVer={quadros.ver} />
      <Planta audio={audio} perto={fase === "filme" || fase === "planta-fala"} criando={fase === "antes" || fase === "pintar"} brilho={brilho} />
      <Cavalete ativo={pintando} tela={tela} pendurada={pendurada} audio={audio}
        onPendurar={() => setTela("voando")}
        onChegou={() => { setTela("pendurada"); sinalizar({ t: "fim-gesto" }) }} />
      <EllaAndando alvo={ellaEm} falando={estado.falando === "Ella"} />
    </>
  )
}

// ── a luz da sala: o ambiente apaga quando a planta acende (pintar na luz
// dela). Só mexe em intensidades (uniforms): nenhuma luz nasce nem some ──
function LuzDaSala({ brilho }: { brilho: number }) {
  const amb = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 0.8)
    // brilho 0,35 → a sala como era; 1 → quase só a planta
    const alvo = 1 - Math.max(0, brilho - 0.35) / 0.65 * 0.6
    if (amb.current) amb.current.intensity += (0.38 * alvo - amb.current.intensity) * k
    if (hemi.current) hemi.current.intensity += (0.45 * alvo - hemi.current.intensity) * k
  })
  return (
    <>
      <ambientLight ref={amb} intensity={0.38} color="#9fb8e0" />
      <hemisphereLight ref={hemi} args={["#8fb0e8", "#0a0806", 0.45]} />
    </>
  )
}

// o halo da planta: um gradiente redondo desenhado uma vez (64 px)
function texturaHalo(): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 64
  const g = c.getContext("2d")!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,0.45)"); r.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = r; g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ── o som: um AudioContext pra casa toda, ligado no primeiro toque ──
interface AudioCasa { ac: () => AudioContext | null; saida: () => GainNode | null }
function useAudioCasa(): AudioCasa {
  const r = useRef<{ ac: AudioContext | null; saida: GainNode | null; chuva: AudioBufferSourceNode | null; nos: AudioNode[] }>({ ac: null, saida: null, chuva: null, nos: [] })
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const m = r.current
    const ligar = () => {
      if (!m.ac) {
        try {
          // (T40b) o contexto da mesa (antes um AudioContext próprio, direto na caixa,
          // fora do mudo e dos volumes): as notas no canal dos efeitos, a chuva no do ambiente
          const ac = mesaCtx(), fx = canal("efeitos"), amb = canal("ambiente")
          if (!ac || !fx || !amb) return
          const saida = ac.createGain(); saida.gain.value = 0.7
          const eco = criarEco(ac), molhado = ac.createGain(); molhado.gain.value = 0.32
          saida.connect(fx); saida.connect(eco).connect(molhado).connect(fx)
          // a chuva no vidro: ruído filtrado, baixinho, sempre (a voz dela tem chuva atrás)
          const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0)
          let ult = 0
          for (let i = 0; i < d.length; i++) { ult = (ult + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = ult * 3.2 }
          const src = ac.createBufferSource(); src.buffer = buf; src.loop = true
          const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400
          const g = ac.createGain(); g.gain.value = 0.16
          src.connect(lp).connect(g).connect(amb); src.start()
          m.ac = ac; m.saida = saida; m.chuva = src; m.nos = [saida, molhado, g]
        } catch { return }
      }
      if (m.ac.state === "suspended") void m.ac.resume()
    }
    ligar()
    const el = gl.domElement.parentElement ?? gl.domElement
    el.addEventListener("pointerdown", ligar)
    window.addEventListener("pointerdown", ligar)
    return () => {
      el.removeEventListener("pointerdown", ligar)
      window.removeEventListener("pointerdown", ligar)
      try { m.chuva?.stop() } catch {}
      // a mesa é do jogo todo: não fecha o contexto, só solta os nós da casa
      for (const n of m.nos) { try { n.disconnect() } catch {} }
      m.ac = null; m.saida = null; m.chuva = null; m.nos = []
    }
  }, [gl])
  return useMemo(() => ({ ac: () => (r.current.ac?.state === "running" ? r.current.ac : null), saida: () => r.current.saida }), [])
}

// ── (06/11) A CASA MODELADA NO BLENDER (blender/scripts/galeria_ella.py,
// public/models/galeria-ella.glb): um galpão-galeria azul-noite com pilastras e
// treliças, a faixa de vidro no teto, as estantes de telas até o teto (a maioria
// de costas), as seis molduras (cada uma de um jeito) com o spot em cima, o
// mezanino no fundo com a escada caracol e as jardineiras, o pedestal redondo com
// a redoma e a luz de cultivo pendurada, o armarinho das amostras, o mural
// pintado atrás da planta, o cavalete com o carrinho de tintas e o pano manchado,
// os baldes, a cama de palete, o cantinho de almofadas com a luminária de arco,
// tapetes e plantas. Tudo nas posições das caixas: a câmera, a Ella, a planta, os
// quadros, o cavalete e a parede da obra não mudam. Um nó (galeria) com as malhas
// _solido (cor no vértice com a sombra e um pouco da luz assadas), _luz e _neon
// (brilho pelo material, sem luz nova), _vidro (o teto e a redoma) e uma tela_<id>
// por quadro (UV 0..1) que recebe a pintura. Materiais compartilhados; nada por
// quadro. ~33 mil triângulos, 345 KB.
const URL_GALERIA = "/models/galeria-ella.glb"
let MATS_GAL: { solido: THREE.MeshStandardMaterial; luz: THREE.MeshBasicMaterial; neon: THREE.MeshBasicMaterial; vidro: THREE.MeshBasicMaterial } | null = null
function matsGaleria() {
  if (!MATS_GAL) MATS_GAL = {
    solido: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 }),
    luz: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    neon: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    vidro: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
  }
  return MATS_GAL
}
const GRUPOS_GAL = ["solido", "luz", "neon", "vidro"] as const
function GaleriaModelada({ telas }: { telas: THREE.Material[] }) {
  const { nodes } = useGLTF(URL_GALERIA) as unknown as { nodes: Record<string, THREE.Object3D> }
  const mats = matsGaleria()
  const partes = useMemo(() => {
    const out: { k: string; geo: THREE.BufferGeometry; mat: THREE.Material; pos: THREE.Vector3; quat: THREE.Quaternion; esc: THREE.Vector3 }[] = []
    const pega = (k: string, mat: THREE.Material) => {
      const o = nodes[k] as THREE.Mesh | undefined
      if (!o?.geometry) return
      o.updateWorldMatrix(true, false)
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), esc = new THREE.Vector3()
      o.matrixWorld.decompose(pos, quat, esc)
      out.push({ k, geo: o.geometry, mat, pos, quat, esc })
    }
    for (const g of GRUPOS_GAL) pega(`galeria_${g}`, mats[g])
    QUADROS.forEach((q, i) => pega(`tela_${q.id}`, telas[i]))
    if (!out.some((p) => p.k === "galeria_solido")) throw new Error("galeria-ella.glb sem a sala")
    return out
  }, [nodes, mats, telas])
  return (
    <group name="galeria-modelada">
      {partes.map((p) => <mesh key={p.k} geometry={p.geo} material={p.mat} position={p.pos} quaternion={p.quat} scale={p.esc} />)}
    </group>
  )
}
useGLTF.preload(URL_GALERIA)

// as caixas de antes (enquanto o modelo baixa, ou se ele falhar)
function GaleriaCaixas({ telas }: { telas: THREE.Material[] }) {
  return (
    <>
      <Salao />
      <TelhadoCaixas />
      <Encostados />
      <MoldurasCaixas telas={telas} />
      <PlantaCaixas />
      <CavaleteCaixas />
      {BALDES.map((b, i) => (
        <mesh key={i} position={[b[0], 0.2, b[2]]}><cylinderGeometry args={[0.22, 0.17, 0.4, 16, 1, true]} /><meshStandardMaterial color="#5d6a7e" metalness={0.7} roughness={0.35} side={THREE.DoubleSide} /></mesh>
      ))}
    </>
  )
}

// ── o salão: chão de cimento queimado, paredes altas, os trilhos de luz ──
function Salao() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[LARG, FUNDO]} />
        <meshStandardMaterial color="#191c24" roughness={0.32} metalness={0.3} />
      </mesh>
      {/* as paredes (sem a da frente: a câmera entra por ali) */}
      <mesh position={[0, ALTO / 2, -FUNDO / 2]}><planeGeometry args={[LARG, ALTO]} /><meshStandardMaterial color={PAREDE} roughness={0.95} /></mesh>
      <mesh position={[-LARG / 2, ALTO / 2, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[FUNDO, ALTO]} /><meshStandardMaterial color={PAREDE} roughness={0.95} /></mesh>
      <mesh position={[LARG / 2, ALTO / 2, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[FUNDO, ALTO]} /><meshStandardMaterial color={PAREDE} roughness={0.95} /></mesh>
      <mesh position={[0, ALTO / 2, FUNDO / 2]} rotation-y={Math.PI}><planeGeometry args={[LARG, ALTO]} /><meshStandardMaterial color="#0e1119" roughness={1} /></mesh>
      {/* a porta de ferro, atrás de quem entra */}
      <Caixa pos={[0, 1.2, FUNDO / 2 - 0.05]} tam={[1.3, 2.4, 0.08]} cor="#2a2f3a" metal={0.6} rough={0.5} />
      {/* o rodapé azul dela, um fio de luz em volta do salão */}
      <mesh position={[-LARG / 2 + 0.02, 0.12, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[FUNDO, 0.03]} /><meshBasicMaterial color={ELLA_COR} toneMapped={false} /></mesh>
      <mesh position={[LARG / 2 - 0.02, 0.12, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[FUNDO, 0.03]} /><meshBasicMaterial color={ELLA_COR} toneMapped={false} /></mesh>
      <mesh position={[0, 0.12, -FUNDO / 2 + 0.02]}><planeGeometry args={[LARG, 0.03]} /><meshBasicMaterial color={ELLA_COR} toneMapped={false} /></mesh>
      {/* o canto dela: um colchão no chão, uma cadeira, uma luminária quente */}
      <Caixa pos={[3.3, 0.12, 6.2]} tam={[1.4, 0.24, 2]} cor="#2d3446" rough={1} />
      <Caixa pos={[3.3, 0.27, 6.9]} tam={[0.9, 0.1, 0.4]} cor="#c8cfdc" rough={1} />
      <Caixa pos={[2.2, 0.45, 6.6]} tam={[0.45, 0.06, 0.45]} cor="#3a2a1e" />
      <mesh position={[3.95, 0.75, 7.4]}><cylinderGeometry args={[0.12, 0.2, 0.25, 12]} /><meshBasicMaterial color={QUENTE} toneMapped={false} /></mesh>
    </group>
  )
}

// ── o telhado de vidro (a chuva lá fora fica na sala: é do modelo e das caixas) ──
function TelhadoCaixas() {
  return (
    <group>
      {/* o teto escuro dos dois lados, a faixa de vidro no meio */}
      <mesh position={[-LARG / 4 - 0.75, ALTO, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[LARG / 2 - 1.5, FUNDO]} /><meshStandardMaterial color="#0a0c12" roughness={1} /></mesh>
      <mesh position={[LARG / 4 + 0.75, ALTO, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[LARG / 2 - 1.5, FUNDO]} /><meshStandardMaterial color="#0a0c12" roughness={1} /></mesh>
      <mesh position={[0, ALTO, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[3, FUNDO]} />
        <meshBasicMaterial color="#5a7aa8" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* as vigas */}
      {[-6, -3, 0, 3, 6].map((z) => <Caixa key={z} pos={[0, ALTO - 0.08, z]} tam={[3.2, 0.12, 0.1]} cor="#1c212c" metal={0.5} />)}
    </group>
  )
}

// ── as goteiras: uma gota cai, bate no balde, faz o anel e o plim ──
function Goteiras({ audio }: { audio: AudioCasa }) {
  const gotas = useRef<(THREE.Mesh | null)[]>([])
  const aneis = useRef<(THREE.Mesh | null)[]>([])
  const estado = useMemo(() => BALDES.map((_, i) => ({ t: -i * 0.7, periodo: 1.9 + i * 0.45, anel: 1 })), [])
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    estado.forEach((e, i) => {
      e.t += d
      const queda = Math.sqrt((2 * (ALTO - 0.4)) / 9.8) // ~1,1 s do teto ao balde
      const g = gotas.current[i]
      if (g) {
        const k = e.t < 0 ? -1 : e.t
        g.visible = k >= 0 && k < queda
        if (g.visible) g.position.y = ALTO - 0.05 - 0.5 * 9.8 * k * k
      }
      if (e.t >= queda && e.anel >= 1) {
        e.anel = 0
        const ac = audio.ac(), out = audio.saida()
        if (ac && out) tocar(ac, out, "sino", 700 + i * 180 + Math.random() * 60, ac.currentTime + 0.01, 0.12)
      }
      if (e.t >= e.periodo) e.t = 0
      if (e.anel < 1) e.anel = Math.min(1, e.anel + d * 1.6)
      const a = aneis.current[i]
      if (a) { a.scale.setScalar(0.2 + e.anel * 0.9); (a.material as THREE.MeshBasicMaterial).opacity = (1 - e.anel) * 0.7 }
    })
  })
  return (
    <group>
      {BALDES.map((b, i) => (
        <group key={i} position={b}>
          {/* (o balde é do modelo, ou das caixas: aqui só a água, o anel e a gota) */}
          <mesh position={[0, 0.3, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.2, 18]} /><meshStandardMaterial color="#0d2238" roughness={0.05} metalness={0.4} emissive={ELLA_COR} emissiveIntensity={0.12} /></mesh>
          <mesh ref={(m) => { aneis.current[i] = m }} position={[0, 0.305, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.1, 0.12, 20]} /><meshBasicMaterial color="#cfe8ff" transparent opacity={0} toneMapped={false} depthWrite={false} /></mesh>
          <mesh ref={(m) => { gotas.current[i] = m }} visible={false}><sphereGeometry args={[0.018, 6, 4]} /><meshBasicMaterial color="#cfe8ff" toneMapped={false} /></mesh>
        </group>
      ))}
    </group>
  )
}

// ── as telas encostadas e as viradas pra parede, até o teto (uma chamada só) ──
function Encostados() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const lista = useMemo(() => {
    let seed = 11
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const out: { p: V3; s: V3; ry: number; rx: number }[] = []
    // no alto das paredes, empilhadas de costas (o que ela não mostra)
    for (const lado of [-1, 1]) for (let i = 0; i < 16; i++) {
      const w = 0.6 + r() * 1.1, h = 0.5 + r() * 1.2
      out.push({ p: [lado * (LARG / 2 - 0.04), 3.8 + r() * 2.7, -7.2 + i * 0.95 + r() * 0.3], s: [w, h, 0.05], ry: lado * Math.PI / 2, rx: 0 })
    }
    // no chão, encostadas, de costas pra quem entra
    for (let i = 0; i < 10; i++) {
      const lado = i % 2 ? 1 : -1, w = 0.7 + r() * 0.9, h = 0.8 + r() * 0.9
      out.push({ p: [lado * (LARG / 2 - 0.3), h / 2 - 0.02, 7.3 - i * 0.34], s: [w, h, 0.05], ry: lado * Math.PI / 2, rx: 0.18 })
    }
    return out
  }, [])
  useEffect(() => {
    const m = ref.current; if (!m) return
    const o = new THREE.Object3D()
    lista.forEach((x, i) => { o.position.set(...x.p); o.rotation.set(x.rx, x.ry, 0, "YXZ"); o.scale.set(...x.s); o.updateMatrix(); m.setMatrixAt(i, o.matrix) })
    m.instanceMatrix.needsUpdate = true
  }, [lista])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, lista.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3a2c22" roughness={0.9} />
    </instancedMesh>
  )
}

// ── os quadros que ela guardou: as pinturas (provisórias, desenhadas em código),
// um material por quadro; vista, a pintura acende um pouco ──
function useTelas(vistas: string[]): THREE.MeshBasicMaterial[] {
  const mats = useMemo(() => QUADROS.map((q) => new THREE.MeshBasicMaterial({ map: pintura(q), color: "#c9cfdb" })), [])
  useEffect(() => () => mats.forEach((m) => { m.map?.dispose(); m.dispose() }), [mats])
  useEffect(() => { QUADROS.forEach((q, i) => mats[i].color.set(vistas.includes(q.id) ? "#ffffff" : "#c9cfdb")) }, [mats, vistas])
  return mats
}

// o toque de cada quadro (a moldura e a tela são do modelo, ou das caixas)
function Quadros({ vistas, ativo, onVer }: { vistas: string[]; ativo: boolean; onVer: (id: string) => void }) {
  return (
    <group>
      {QUADROS.map((q) => (
        <Toque key={q.id} pos={[q.lado * (LARG / 2 - 0.15), q.y, q.z]} raio={0.42} cor={ELLA_COR} ativo={ativo && !vistas.includes(q.id)} onToque={() => onVer(q.id)} />
      ))}
    </group>
  )
}

// as molduras de antes, com as telas (nas caixas)
function MoldurasCaixas({ telas }: { telas: THREE.Material[] }) {
  return (
    <group>
      {QUADROS.map((q, i) => (
        <group key={q.id} position={[q.lado * (LARG / 2 - 0.06), q.y, q.z]} rotation-y={-q.lado * Math.PI / 2}>
          <mesh position={[0, 0, -0.02]}><boxGeometry args={[q.larg + 0.12, q.alto + 0.12, 0.05]} /><meshStandardMaterial color="#0c0d12" roughness={0.6} metalness={0.4} /></mesh>
          <mesh position={[0, 0, 0.01]} material={telas[i]}><planeGeometry args={[q.larg, q.alto]} /></mesh>
        </group>
      ))}
    </group>
  )
}

// uma pintura provisória (até os quadros de verdade chegarem): pinceladas nas
// cores do quadro, com um motivo simples pros que pedem (a cidade, a kombi…)
function pintura(q: QuadroElla): THREE.CanvasTexture {
  const W = 128, H = Math.round(128 * (q.alto / q.larg))
  const c = document.createElement("canvas"); c.width = W; c.height = H
  const g = c.getContext("2d")!
  let seed = q.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 7)
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  g.fillStyle = q.cores[0]; g.fillRect(0, 0, W, H)
  const resto = q.cores.slice(1)
  g.lineCap = "round"
  if (q.id === "branco") {
    // só a assinatura, embaixo
    g.strokeStyle = "#2a2622"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(W * 0.62, H * 0.9)
    for (let i = 0; i < 9; i++) g.lineTo(W * (0.62 + i * 0.03), H * (0.9 + (i % 2 ? -0.025 : 0.01)))
    g.stroke()
  } else {
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = resto[Math.floor(r() * resto.length)]; g.globalAlpha = 0.25 + r() * 0.5; g.lineWidth = 2 + r() * 9
      const x = r() * W, y = r() * H
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 50, x + (r() - 0.5) * 60, y + (r() - 0.5) * 60); g.stroke()
    }
    g.globalAlpha = 1
    if (q.id === "cidade") {
      // os prédios pendurados do alto, as raízes subindo
      g.fillStyle = "#05060a"
      for (let i = 0; i < 9; i++) { const w = 8 + r() * 10, h = 30 + r() * 70; g.fillRect(i * 14 + 2, 0, w, h) }
      g.strokeStyle = "#5dffa0"; g.lineWidth = 1.5
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(20 + i * 18, H); g.bezierCurveTo(10 + i * 20, H * 0.75, 30 + i * 15, H * 0.7, 18 + i * 18, H * 0.55); g.stroke() }
    } else if (q.id === "kombi") {
      g.fillStyle = "#ff6a35"; g.fillRect(W * 0.2, H * 0.35, W * 0.6, H * 0.3)
      g.fillStyle = "#f2eefa"; g.fillRect(W * 0.2, H * 0.35, W * 0.6, H * 0.12)
      g.fillStyle = "#14121c"; g.beginPath(); g.arc(W * 0.33, H * 0.68, 7, 0, 7); g.arc(W * 0.67, H * 0.68, 7, 0, 7); g.fill()
    } else if (q.id === "janela") {
      g.fillStyle = "#2a3550"; g.fillRect(W * 0.3, H * 0.15, W * 0.4, H * 0.45)
      g.fillStyle = "#0a0c12"; g.beginPath(); g.ellipse(W * 0.5, H * 0.72, 13, 26, 0, 0, 7); g.fill(); g.beginPath(); g.arc(W * 0.5, H * 0.5, 9, 0, 7); g.fill()
      g.strokeStyle = "#9fc8ff"; g.lineWidth = 1
      for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y + 8); g.stroke() }
    } else if (q.id === "flor") {
      g.strokeStyle = "#5dffa0"; g.lineWidth = 3
      g.beginPath(); g.moveTo(W / 2, H); g.lineTo(W / 2, H * 0.35); g.stroke()
      for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? "#5dffa0" : "#2fbf78"; g.beginPath(); g.ellipse(W / 2 + (i % 2 ? 14 : -14), H * (0.8 - i * 0.07), 16, 5, i % 2 ? -0.5 : 0.5, 0, 7); g.fill() }
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 2
  return t
}

// (09/11, ep. 7) a copa é a cannabis modelada (blender/scripts/planta_ella.py, a
// versão planta_casa: 1912 triângulos, menos que as 44 folhas de antes). Sem luz:
// a cor do vértice × GANHO_CANNABIS, e o brilho da planta sobe essa cor. Um desenho.
const URL_PLANTA = "/models/planta-ella.glb"
const GANHO_CANNABIS = 0.25 // o sólido sai do Blender ×4, como o mundo-depois.glb
const ESCALA_CANNABIS = 0.82 // 1,5 m no modelo: cabe na redoma
function materialCannabis() {
  return new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, color: new THREE.Color(GANHO_CANNABIS, GANHO_CANNABIS, GANHO_CANNABIS) })
}
function CopaCannabis({ mat }: { mat: THREE.Material }) {
  const { nodes } = useGLTF(URL_PLANTA) as unknown as { nodes: Record<string, THREE.Object3D> }
  const parte = useMemo(() => {
    const o = nodes.planta_casa_solido as THREE.Mesh | undefined
    if (!o?.geometry) throw new Error("planta-ella.glb sem planta_casa_solido")
    o.updateWorldMatrix(true, false)
    const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), esc = new THREE.Vector3()
    o.matrixWorld.decompose(pos, quat, esc)
    return { geo: o.geometry, pos, quat, esc }
  }, [nodes])
  return <group scale={ESCALA_CANNABIS}><mesh geometry={parte.geo} material={mat} position={parte.pos} quaternion={parte.quat} scale={parte.esc} /></group>
}
// a copa de antes, enquanto o .glb baixa ou se ele falhar
function CopaCaixas({ matFolhas }: { matFolhas: RefObject<THREE.MeshStandardMaterial | null> }) {
  const folhas = useRef<THREE.InstancedMesh>(null)
  // as folhas em espiral, subindo pelo caule
  const lista = useMemo(() => Array.from({ length: N_FOLHAS }, (_, i) => {
    const k = i / N_FOLHAS
    return { y: 0.25 + k * 1.05, a: i * 2.4, incl: 0.5 + (1 - k) * 0.5, tam: 0.75 - k * 0.45 }
  }), [])
  useEffect(() => {
    const m = folhas.current; if (!m) return
    const o = new THREE.Object3D()
    lista.forEach((f, i) => {
      o.position.set(Math.cos(f.a) * 0.04, f.y, Math.sin(f.a) * 0.04)
      o.rotation.set(0, -f.a, f.incl, "YXZ")
      o.scale.set(f.tam * 0.34, 0.03, f.tam * 0.11)
      o.translateX(f.tam * 0.34)
      o.updateMatrix(); m.setMatrixAt(i, o.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [lista])
  return (
    <>
      <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.012, 0.02, 1.2, 6]} /><meshStandardMaterial color="#2f6a3e" roughness={0.8} /></mesh>
      <instancedMesh ref={folhas} args={[undefined, undefined, N_FOLHAS]}>
        <sphereGeometry args={[1, 8, 4]} />
        <meshStandardMaterial ref={matFolhas} color="#2fbf6e" emissive={VERDE} emissiveIntensity={0.22} roughness={0.6} />
      </instancedMesh>
    </>
  )
}

// ── a planta do Criador: o vaso de barro rachado, as folhas que viram pra você,
// a redoma, a luz de cultivo, as amostras na prateleira e os esporos no ar ──
const N_FOLHAS = 44
const N_ESPOROS = 90
const LUZ_PLANTA = "#c8ffdc"
function Planta({ audio, perto, criando, brilho }: { audio: AudioCasa; perto: boolean; criando: boolean; brilho: number }) {
  const copa = useRef<THREE.Group>(null)
  const matFolhas = useRef<THREE.MeshStandardMaterial>(null)
  const matCannabis = useMemo(() => materialCannabis(), [])
  const luz = useRef<THREE.PointLight>(null)
  const halo = useRef<THREE.Sprite>(null)
  const chao = useRef<THREE.Mesh>(null)
  const brilhoAgora = useRef(brilho)
  const tHalo = useMemo(() => texturaHalo(), [])
  useEffect(() => () => tHalo.dispose(), [tHalo])
  const esporos = useRef<THREE.Points>(null)
  const camera = useThree((s) => s.camera)
  const { posEsporos, vel } = useMemo(() => {
    let seed = 23
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const p = new Float32Array(N_ESPOROS * 3)
    for (let i = 0; i < N_ESPOROS; i++) { p[i * 3] = (r() - 0.5) * 1.6; p[i * 3 + 1] = r() * 2.4; p[i * 3 + 2] = (r() - 0.5) * 1.6 }
    return { posEsporos: p, vel: Float32Array.from({ length: N_ESPOROS }, () => 0.04 + r() * 0.08) }
  }, [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const somProx = useRef(0)
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    // o brilho dela chega devagar no pedido (e pulsa de leve, viva)
    brilhoAgora.current += (brilho - brilhoAgora.current) * Math.min(1, d * 0.7)
    const b = brilhoAgora.current * (1 + Math.sin(t * 1.3) * 0.05)
    if (matFolhas.current) matFolhas.current.emissiveIntensity = 0.15 + b * 0.85
    matCannabis.color.setScalar(GANHO_CANNABIS * (0.9 + b * 1.8))
    if (luz.current) luz.current.intensity = 2 + b * 7
    if (halo.current) { halo.current.scale.setScalar(1.2 + b * 1.6); halo.current.material.opacity = 0.12 + b * 0.38 }
    if (chao.current) (chao.current.material as THREE.MeshBasicMaterial).opacity = b * 0.13
    if (copa.current) {
      // respira; perto, as folhas viram devagar pro seu lado
      copa.current.scale.setScalar(1 + Math.sin(t * 0.8) * 0.015)
      dir.set(camera.position.x - PLANTA_POS[0], 0, camera.position.z - PLANTA_POS[2])
      const alvo = perto ? Math.atan2(dir.x, dir.z) * 0.35 : Math.sin(t * 0.2) * 0.1
      copa.current.rotation.y += (alvo - copa.current.rotation.y) * Math.min(1, d * 0.8)
      copa.current.rotation.z = Math.sin(t * 0.6) * 0.025
    }
    // os esporos sobem devagar; quando você cria, eles vão pro cavalete
    const p = esporos.current?.geometry.attributes.position as THREE.BufferAttribute | undefined
    if (p) {
      const a = p.array as Float32Array
      const cx = CAVALETE.pos[0] - PLANTA_POS[0], cz = CAVALETE.pos[2] - PLANTA_POS[2]
      for (let i = 0; i < N_ESPOROS; i++) {
        a[i * 3 + 1] += vel[i] * d
        a[i * 3] += Math.sin(t * 0.7 + i) * 0.002 + (criando ? (cx - a[i * 3]) * 0.12 * d : 0)
        a[i * 3 + 2] += Math.cos(t * 0.5 + i * 1.3) * 0.002 + (criando ? (cz - a[i * 3 + 2]) * 0.12 * d : 0)
        if (a[i * 3 + 1] > 2.6) { a[i * 3] = (Math.random() - 0.5) * 0.9; a[i * 3 + 1] = 0.6; a[i * 3 + 2] = (Math.random() - 0.5) * 0.9 }
      }
      p.needsUpdate = true
    }
    // perto dela, de vez em quando um sino baixinho (a vontade de criar)
    if (perto && t > somProx.current) {
      somProx.current = t + 2.6 + Math.random() * 2
      const ac = audio.ac(), out = audio.saida()
      if (ac && out) tocar(ac, out, "pad", freqDaAltura(0.35 + Math.random() * 0.4), ac.currentTime + 0.02, 0.18)
    }
  })
  return (
    <group position={PLANTA_POS}>
      {/* (o pedestal, o vaso, a redoma, a luz de cultivo e o armarinho são do
          modelo, ou das caixas: aqui só o que mexe) */}
      <group ref={copa} position={[0, 0.75, 0]}>
        <ModeloSeguro nome="planta-ella-glb" reserva={<CopaCaixas matFolhas={matFolhas} />}>
          <CopaCannabis mat={matCannabis} />
        </ModeloSeguro>
      </group>
      {/* A LUZ DA PLANTA: a única luz pontual da sala (só muda de força), o halo
          e a mancha no chão (aditivos, sem luz nova) */}
      <pointLight ref={luz} position={[0, 1.45, 0.25]} color={LUZ_PLANTA} intensity={4} distance={6} decay={2} />
      <sprite ref={halo} position={[0, 1.3, 0]} scale={1.6} renderOrder={2}>
        <spriteMaterial map={tHalo} color={LUZ_PLANTA} transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <mesh ref={chao} position={[-0.5, 0.012, 0.1]} rotation-x={-Math.PI / 2} scale={[2.4, 1.8, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tHalo} color={LUZ_PLANTA} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <points ref={esporos}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[posEsporos, 3]} /></bufferGeometry>
        <pointsMaterial color="#d9ffe9" size={0.025} transparent opacity={0.7} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  )
}
// as peças paradas da planta (nas caixas): o pedestal, o vaso de barro rachado, a
// etiqueta, a redoma, a barra da luz de cultivo, o armarinho das amostras
function PlantaCaixas() {
  return (
    <group position={PLANTA_POS}>
      <Caixa pos={[0, 0.2, 0]} tam={[0.9, 0.4, 0.9]} cor="#1b1f2a" metal={0.4} rough={0.5} />
      <mesh position={[0, 0.58, 0]}><cylinderGeometry args={[0.24, 0.17, 0.36, 18]} /><meshStandardMaterial color="#9a5a3a" roughness={0.95} /></mesh>
      <mesh position={[0.1, 0.58, 0.205]} rotation-z={0.3}><boxGeometry args={[0.008, 0.3, 0.01]} /><meshBasicMaterial color="#3a1e12" /></mesh>
      <mesh position={[0, 0.755, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.22, 18]} /><meshStandardMaterial color="#2a1a10" roughness={1} /></mesh>
      <mesh position={[-0.12, 0.6, 0.215]} rotation-y={-0.3}><planeGeometry args={[0.1, 0.05]} /><meshBasicMaterial color="#efe8da" /></mesh>
      {/* a redoma (vidro barato: transparente, sem refração) */}
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 1.4, 24, 1, true]} />
        <meshStandardMaterial color="#bfe3ff" transparent opacity={0.08} roughness={0.05} metalness={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.58, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#bfe3ff" transparent opacity={0.1} roughness={0.05} metalness={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.7, 0]}><boxGeometry args={[0.9, 0.04, 0.12]} /><meshBasicMaterial color={ROXO} toneMapped={false} /></mesh>
      <Caixa pos={[1.25, 0.5, -0.35]} tam={[0.75, 1.0, 0.3]} cor="#1b1f2a" metal={0.3} />
      <Caixa pos={[1.25, 1.02, -0.35]} tam={[0.7, 0.04, 0.25]} cor="#2a2f3a" />
      <Amostras />
    </group>
  )
}
function Amostras() {
  const ref = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const m = ref.current; if (!m) return
    const o = new THREE.Object3D()
    for (let i = 0; i < 6; i++) { o.position.set(0.98 + i * 0.1, 1.1, -0.35 + (i % 2) * 0.05); o.scale.set(1, 0.8 + (i % 3) * 0.2, 1); o.updateMatrix(); m.setMatrixAt(i, o.matrix) }
    m.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 6]}>
      <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
      <meshStandardMaterial color="#cfe8ff" transparent opacity={0.55} emissive={VERDE} emissiveIntensity={0.15} />
    </instancedMesh>
  )
}

// ── o cavalete e a tela: pintar com o dedo, os potes trocam a cor; pronta, o
// prego; ela voa pra parede e toca (o som do pintar: a cor é o instrumento) ──
const TW = 512, TH = 640
const FUNDO_TELA = "#efe8da"
const VOO_INI = new THREE.Vector3(CAVALETE.pos[0], TELA.y, CAVALETE.pos[2])
const VOO_FIM = new THREE.Vector3(...PAREDE_OBRA)
function Cavalete({ ativo, tela, pendurada, audio, onPendurar, onChegou }: { ativo: boolean; tela: "branca" | "voando" | "pendurada"; pendurada: boolean; audio: AudioCasa; onPendurar: () => void; onChegou: () => void }) {
  const [cor, setCor] = useState(PINTAR.potes[0])
  const [tracos, setTracos] = useState(0)
  const quadro = useRef<THREE.Group>(null)
  const cabeca = useRef<THREE.Mesh>(null)
  const sujo = useRef(false)
  const ult = useRef<{ x: number; y: number } | null>(null)
  const notaProx = useRef(0)
  const voo = useRef(0)
  const guardou = useRef(false)
  const { cvs, tex } = useMemo(() => {
    const c = document.createElement("canvas"); c.width = TW; c.height = TH
    const g = c.getContext("2d", { willReadFrequently: true })!
    g.fillStyle = FUNDO_TELA; g.fillRect(0, 0, TW, TH)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
    return { cvs: c, tex: t }
  }, [])
  useEffect(() => () => tex.dispose(), [tex])
  const ctx = () => cvs.getContext("2d", { willReadFrequently: true })
  const fundoIdx = useMemo(() => { const n = parseInt(FUNDO_TELA.slice(1), 16); return corDaPaleta((n >> 16) & 255, (n >> 8) & 255, n & 255) }, [])

  // a nota da pincelada (a cor é o instrumento, a altura é a nota)
  const nota = (y: number) => {
    const ac = audio.ac(), out = audio.saida()
    const i = CORES.indexOf(cor)
    if (ac && out && i >= 0) tocar(ac, out, INSTRUMENTOS[i], freqDaAltura(y / TH), ac.currentTime + 0.01, 0.4)
  }
  const ponto = (e: ThreeEvent<PointerEvent>) => (e.uv ? { x: e.uv.x * TW, y: (1 - e.uv.y) * TH } : null)
  const risco = (de: { x: number; y: number }, ate: { x: number; y: number }) => {
    const g = ctx(); if (!g) return
    g.strokeStyle = cor; g.lineWidth = PINTAR.pincel; g.lineCap = "round"; g.lineJoin = "round"
    g.beginPath(); g.moveTo(de.x, de.y); g.lineTo(ate.x, ate.y); g.stroke()
    sujo.current = true
  }
  const podePintar = ativo && tela === "branca"
  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!podePintar) return
    e.stopPropagation()
    const p = ponto(e); if (!p) return
    ;(e.target as unknown as Element | null)?.setPointerCapture?.(e.pointerId)
    ult.current = p
    risco(p, { x: p.x + 0.01, y: p.y })
    nota(p.y)
    setTracos((n) => n + 1)
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!ult.current || !podePintar) return
    e.stopPropagation()
    const p = ponto(e); if (!p) return
    risco(ult.current, p); ult.current = p
    const t = performance.now()
    if (t > notaProx.current) { notaProx.current = t + 170; nota(p.y) }
  }
  const up = () => { ult.current = null }
  useEffect(() => { if (!podePintar) ult.current = null }, [podePintar])

  // a tela pendurada toca: a linha varre da esquerda pra direita, em loop
  const toca = useRef({ passo: 0, prox: 0 })
  const N_PASSOS = 16
  useFrame((_, dt) => {
    if (sujo.current) { tex.needsUpdate = true; sujo.current = false }
    const q = quadro.current
    if (!q) return
    // o voo: do cavalete pra parede do fundo, do lado da planta
    if (tela === "voando" || pendurada) {
      voo.current = pendurada ? 1 : Math.min(1, voo.current + Math.min(dt, 0.05) / 1.6)
      const k = voo.current < 0.5 ? 2 * voo.current * voo.current : 1 - Math.pow(-2 * voo.current + 2, 2) / 2
      q.position.lerpVectors(VOO_INI, VOO_FIM, k)
      q.position.y += Math.sin(k * Math.PI) * 0.5
      q.rotation.set(0, CAVALETE.rot * (1 - k), 0)
      if (voo.current >= 1 && tela === "voando") {
        if (!guardou.current) {
          guardou.current = true
          // a obra vai pra parede da galeria de verdade (a mesma do /galeria)
          try {
            const peq = document.createElement("canvas"); peq.width = 300; peq.height = 375
            peq.getContext("2d")!.drawImage(cvs, 0, 0, 300, 375)
            guardarObra({ id: String(Date.now()), nome: PINTAR.nome, img: peq.toDataURL("image/jpeg", 0.82), quando: Date.now() })
          } catch { /* sem espaço no aparelho: a obra fica só na casa dela */ }
          onChegou()
        }
      }
    } else {
      q.position.set(CAVALETE.pos[0], TELA.y, CAVALETE.pos[2])
      q.rotation.set(0, CAVALETE.rot, 0)
    }
    // tocando: no relógio do áudio, um passo de cada vez
    if (cabeca.current) cabeca.current.visible = pendurada
    if (!pendurada) return
    const ac = audio.ac(), out = audio.saida(), g = ctx()
    if (!ac || !out || !g) return
    const dur = (8 * 60) / PINTAR.bpm / N_PASSOS
    const m = toca.current
    if (m.prox < ac.currentTime) m.prox = ac.currentTime + 0.05
    while (m.prox < ac.currentTime + 0.1) {
      const x = Math.min(TW - 1, Math.floor(((m.passo % N_PASSOS) + 0.5) / N_PASSOS * TW))
      const notas = notasDaColuna(g.getImageData(x, 0, 1, TH).data, TH, fundoIdx, 4)
      const vol = 0.3 / Math.sqrt(Math.max(1, notas.length))
      for (const n of notas) tocar(ac, out, INSTRUMENTOS[n.cor], freqDaAltura(n.y01), m.prox, vol)
      if (cabeca.current) cabeca.current.position.x = (x / TW - 0.5) * TELA.larg
      m.prox += dur; m.passo = (m.passo + 1) % N_PASSOS
    }
  })

  // atalho de teste (só onde os atalhos valem: fora da produção): pinta umas pinceladas e pendura
  const testeRef = useRef(() => {})
  useEffect(() => {
    testeRef.current = () => {
      if (!podePintar) return false
      const cores = PINTAR.potes
      for (let i = 0; i < PINTAR.minimo; i++) {
        const g = ctx(); if (!g) break
        g.strokeStyle = cores[i % cores.length]; g.lineWidth = PINTAR.pincel; g.lineCap = "round"
        g.beginPath(); g.moveTo(40 + i * 50, 80 + (i % 3) * 160); g.lineTo(90 + i * 45, 300 + (i % 4) * 70); g.stroke()
      }
      sujo.current = true
      setTracos(PINTAR.minimo)
      onPendurar()
      return true
    }
  })
  useEffect(() => {
    if (!atalhosLiberados()) return
    const w = window as unknown as Record<string, unknown>
    w.__pintarElla = () => testeRef.current()
    return () => { delete w.__pintarElla }
  }, [])

  const pronta = tracos >= PINTAR.minimo
  return (
    <group>
      {/* o cavalete (a madeira é do modelo, ou das caixas): os potes na bandeja e o prego */}
      <group position={CAVALETE.pos} rotation-y={CAVALETE.rot}>
        <Potes cor={cor} ativo={podePintar} onCor={setCor} />
        {/* o prego: acende quando a tela tem tinta bastante */}
        <Toque pos={[0, TELA.y + TELA.alto / 2 + 0.16, 0.02]} raio={0.09} cor="#ffffff" ativo={podePintar && pronta} onToque={onPendurar}>
          <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.08, 6]} /><meshStandardMaterial color="#c9d3e6" metalness={0.8} roughness={0.3} emissive="#ffffff" emissiveIntensity={pronta ? 0.5 : 0} /></mesh>
        </Toque>
      </group>
      {/* a tela (anda sozinha quando vai pra parede) */}
      <group ref={quadro}>
        <mesh position={[0, 0, -0.025]}><boxGeometry args={[TELA.larg + 0.06, TELA.alto + 0.06, 0.04]} /><meshStandardMaterial color="#d8d0c0" roughness={0.9} /></mesh>
        <mesh onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
          <planeGeometry args={[TELA.larg, TELA.alto]} />
          {/* a tela é desenhada sem luz (a tinta sai fiel); o tom verdinho é o da planta */}
          <meshBasicMaterial map={tex} color="#eefff3" />
        </mesh>
        {/* a linha que toca */}
        <mesh ref={cabeca} position={[0, 0, 0.004]} visible={false}>
          <planeGeometry args={[0.008, TELA.alto]} />
          <meshBasicMaterial color={ELLA_COR} toneMapped={false} transparent opacity={0.9} />
        </mesh>
      </group>
    </group>
  )
}

// a madeira do cavalete (nas caixas): três pernas, a travessa, a bandeja dos potes
function CavaleteCaixas() {
  return (
    <group position={CAVALETE.pos} rotation-y={CAVALETE.rot}>
      <Caixa pos={[-0.38, 1.0, -0.05]} tam={[0.04, 2.1, 0.04]} cor="#6a4a30" />
      <Caixa pos={[0.38, 1.0, -0.05]} tam={[0.04, 2.1, 0.04]} cor="#6a4a30" />
      <mesh position={[0, 0.9, -0.38]} rotation-x={-0.35}><boxGeometry args={[0.04, 1.9, 0.04]} /><meshStandardMaterial color="#6a4a30" /></mesh>
      <Caixa pos={[0, 0.95, 0.02]} tam={[0.95, 0.04, 0.14]} cor="#5a3e28" />
      <Caixa pos={[0, TELA.y + TELA.alto / 2 + 0.06, -0.02]} tam={[0.9, 0.05, 0.06]} cor="#5a3e28" />
    </group>
  )
}

// os potes de tinta na bandeja: tocar num troca a cor (e toca o instrumento dela)
function Potes({ cor, ativo, onCor }: { cor: string; ativo: boolean; onCor: (c: string) => void }) {
  const n = PINTAR.potes.length
  return (
    <group position={[0, 0.98, 0.04]}>
      {PINTAR.potes.map((c, i) => {
        const x = (i - (n - 1) / 2) * 0.14
        const escolhido = c === cor
        return (
          <group key={c} position={[x, 0, 0]}>
            <mesh position={[0, 0.035, 0]}><cylinderGeometry args={[0.045, 0.04, 0.07, 12]} /><meshStandardMaterial color="#d8d8d8" roughness={0.4} metalness={0.3} /></mesh>
            <mesh position={[0, 0.071, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.04, 14]} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>
            {escolhido && <mesh position={[0, 0.074, 0]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.048, 0.058, 18]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>}
            {/* a área do toque, maior que o pote (o dedo é grosso) */}
            <mesh position={[0, 0.06, 0]} visible={false} onClick={(e) => { if (!ativo) return; e.stopPropagation(); onCor(c) }}>
              <sphereGeometry args={[0.07, 8, 6]} />
              <meshBasicMaterial />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

// ── a Ella: anda devagar de um lugar pro outro da casa ──
function EllaAndando({ alvo, falando }: { alvo: { pos: V3; vira: number }; falando: boolean }) {
  const g = useRef<THREE.Group>(null)
  const alvoV = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    if (!g.current) return
    alvoV.set(...alvo.pos)
    const d = g.current.position.distanceTo(alvoV)
    // longe demais (a cena pulou): aparece lá; perto: anda
    if (d > 30) g.current.position.copy(alvoV)
    else g.current.position.lerp(alvoV, Math.min(1, dt * 0.9))
  })
  return (
    <group ref={g} position={alvo.pos}>
      <Npc cor={ELLA_COR} pos={[0, 0, 0]} vira={alvo.vira} falando={falando} pele="#2a3040" />
    </group>
  )
}
