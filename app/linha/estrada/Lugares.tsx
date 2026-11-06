"use client"

// Os lugares na estrada (lugares.ts): a fachada com o letreiro em neon, a
// calçada até a pista, o PIN em cima quando é a missão (passar na frente
// pra cena começar) e quem está esperando na porta. A cor do lugar é a da
// estação de quem mora lá; a cor pessoal fica no detalhe (porta, toldo).

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import * as THREE from "three"
import { LUGARES, VAGA, type Lugar, type LugarId } from "../lugares"
import { posicao, type Mundo } from "./mundo"
import { MEIA, PASSO, pontoI } from "./pista"
import { texTexto } from "./geo"
import { LuzPonto } from "./luzes"
import { ModeloSeguro } from "./Seguro"

const FRENTE = MEIA + 9 // a fachada fica a isso do eixo da pista
const FUNDO = 10 // profundidade do prédio

export interface PoseLugar {
  via: number
  u: number
  lado: 1 | -1
  chao: number // altura da pista ali
  centro: THREE.Vector3 // o meio da fachada, no chão
  rumo: number // rotação y da pista
  porta: THREE.Vector3
  vaga: THREE.Vector3 // o meio da vaga, na beira da pista
  cam: THREE.Vector3 // de onde a câmera de cinema olha
}

// onde um lugar fica no mundo (o mesmo cálculo pra fachada, vaga e câmera)
export function poseLugar(M: Mundo, l0: Lugar, chave = `lugar:${l0.id}`): PoseLugar {
  // (no mapa novo a posição vem da tabela dele; no de sempre, do circuito)
  const o = posicao(M, chave, l0.area, l0.u, l0.lado, l0.via)
  const via = o.via
  const l = { ...l0, u: o.u, lado: o.lado }
  const C = M.vias[via]
  const i = C.fechada ? ((Math.round(l.u / PASSO) % C.n) + C.n) % C.n : Math.max(0, Math.min(C.n - 1, Math.round(l.u / PASSO)))
  const chao = C.py[i]
  const rumo = Math.atan2(C.tx[i], C.tz[i])
  const centro = pontoI(C, i, l.lado * (FRENTE + FUNDO / 2), 0, new THREE.Vector3())
  const porta = pontoI(C, i, l.lado * (l.segredo ? FRENTE + 4 : FRENTE - 1.2), 2.6, new THREE.Vector3())
  const vaga = pontoI(C, i, l.lado * (MEIA - 1.8), 0, new THREE.Vector3())
  // a câmera: do outro lado da pista, um pouco antes, na altura dos olhos
  // no beco a câmera fica quase de frente, pra ver o fundo do vão
  const antes = l.segredo ? 7 : 17
  const j = ((i - Math.round(antes / PASSO)) % C.n + C.n) % C.n
  const cam = pontoI(C, j, l.segredo ? -l.lado * 2.5 : -l.lado * 5.5, l.segredo ? 2.4 : 3.4, new THREE.Vector3())
  if (l.segredo) porta.y -= 0.9
  return { via, u: l.u, lado: l.lado, chao, centro, rumo, porta, vaga, cam }
}

// a gente na porta: um corpo modelado no Blender (blender/scripts/pessoa.py),
// escuro com a cor de quem é no contorno. Respira e balança o peso de leve.
const URL_PESSOA = "/models/pessoa.glb"

function Pessoa({ cor, pos, vira }: { cor: string; pos: [number, number, number]; vira: number }) {
  const { scene } = useGLTF(URL_PESSOA)
  const corpo = useMemo(() => {
    const g = scene.clone(true)
    const mat = new THREE.MeshStandardMaterial({ color: "#14152a", emissive: cor, emissiveIntensity: 0.22, roughness: 0.75 })
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = mat })
    return g
  }, [scene, cor])
  const g = useRef<THREE.Group>(null)
  const fase = pos[0] * 3.1 + pos[2] * 1.7
  useFrame((s) => {
    if (!g.current) return
    const t = s.clock.elapsedTime + fase
    g.current.scale.y = 1 + Math.sin(t * 1.4) * 0.006
    g.current.rotation.z = Math.sin(t * 0.35) * 0.025
  })
  return (
    <group position={pos} rotation-y={vira}>
      <group ref={g}>
        <primitive object={corpo} />
      </group>
      {/* a cor da pessoa: uma faixa de luz no peito */}
      <mesh position={[0, 1.22, 0.12]}>
        <boxGeometry args={[0.3, 0.035, 0.02]} />
        <meshBasicMaterial color={cor} toneMapped={false} />
      </mesh>
    </group>
  )
}

useGLTF.preload(URL_PESSOA)

function Fachada({ l, p, alvo, emCena, modelo }: { l: Lugar; p: PoseLugar; alvo: boolean; emCena: boolean; modelo?: Let }) {
  const letreiro = useMemo(() => texTexto([{ txt: l.letreiro, tam: 150, cor: l.cor }], 1024, 220), [l])
  const vaga = useRef<THREE.MeshBasicMaterial>(null)
  const coluna = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (vaga.current) vaga.current.opacity = alvo ? 0.32 + Math.sin(t * 3) * 0.14 : 0.12
    if (coluna.current) coluna.current.visible = alvo && !emCena
  })
  const alto = p.chao + 12 - -12 // da água até 12 m acima da pista
  return (
    <group>
      {/* o prédio: sai da água/chão e passa 12 m da pista (com o modelo do
          Blender, o prédio e a frente são ele; aqui fica só o letreiro) */}
      {!modelo && <group position={[p.centro.x, -12 + alto / 2, p.centro.z]} rotation-y={p.rumo}>
        <mesh>
          <boxGeometry args={[FUNDO, alto, 16]} />
          <meshStandardMaterial color="#1a1422" roughness={0.9} />
        </mesh>
      </group>}
      {/* a frente, na altura da pista: vitrine, porta, toldo, letreiro */}
      <group position={[p.centro.x, p.chao, p.centro.z]} rotation-y={p.rumo + (l.lado > 0 ? Math.PI / 2 : -Math.PI / 2)}>
        {modelo && (
          <mesh position={[modelo[0], modelo[1], modelo[2]]}>
            <planeGeometry args={[modelo[3], modelo[3] * 220 / 1024]} />
            <meshBasicMaterial map={letreiro} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        )}
        <group position={[0, 0, FUNDO / 2 + 0.02]}>
          {!modelo && <>
          {/* vitrine: vidro escuro com a luz de dentro vazando, e divisórias */}
          <mesh position={[-2.2, 2, 0]}>
            <planeGeometry args={[8, 3.2]} />
            <meshStandardMaterial color="#07060c" emissive={l.cor} emissiveIntensity={emCena ? 0.42 : 0.3} roughness={0.15} metalness={0.4} />
          </mesh>
          {[-5.4, -3.2, -1.1, 1, 1.9].map((x) => (
            <mesh key={x} position={[x, 2, 0.03]}>
              <boxGeometry args={[0.12, 3.3, 0.06]} />
              <meshStandardMaterial color="#0d0b12" roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[-2.2, 3.66, 0.03]}>
            <boxGeometry args={[8.2, 0.14, 0.08]} />
            <meshStandardMaterial color="#0d0b12" />
          </mesh>
          {/* o andar de cima: janelas, umas acesas */}
          {[-5, -2.5, 0, 2.5, 5].map((x, k) => (
            <mesh key={x} position={[x, 8.6 + (k % 2) * 0.05, 0.02]}>
              <planeGeometry args={[1.5, 1.8]} />
              <meshStandardMaterial color="#0a0910" emissive={k % 3 === 1 ? "#ffcf8a" : "#1a1830"} emissiveIntensity={k % 3 === 1 ? 0.7 : 0.25} />
            </mesh>
          ))}
          {/* frisos na cor de acento */}
          {[4.6, 7.4].map((y) => (
            <mesh key={y} position={[0, y, 0.04]}>
              <boxGeometry args={[16, 0.06, 0.06]} />
              <meshBasicMaterial color={l.acento} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[4.4, 1.5, 0]}>
            <planeGeometry args={[1.6, 3]} />
            <meshBasicMaterial color={l.acento} toneMapped={false} />
          </mesh>
          <mesh position={[0, 3.9, 0.7]} rotation-x={-0.35}>
            <boxGeometry args={[14, 0.12, 1.6]} />
            <meshStandardMaterial color={l.acento} emissive={l.acento} emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 6.4, 0.05]}>
            <planeGeometry args={[12, 2.6]} />
            <meshBasicMaterial map={letreiro} transparent toneMapped={false} depthWrite={false} />
          </mesh>
          </>}
          {/* a luz da vitrine no chão da calçada */}
          <LuzPonto position={[0, 2.5, 2.5]} color={l.cor} intensity={emCena ? 34 : 20} distance={12} decay={2} />
        </group>
        {/* um poste na calçada, luz branca fria (contra o quente do lugar).
            Na cena ele sai: fica bem na frente da câmera */}
        {!emCena && <>
        <mesh position={[-6.5, 2.4, FUNDO / 2 + 7.2]}>
          <cylinderGeometry args={[0.07, 0.09, 4.8, 8]} />
          <meshStandardMaterial color="#20223a" />
        </mesh>
        <mesh position={[-6.5, 4.85, FUNDO / 2 + 7.2]}>
          <sphereGeometry args={[0.22, 12, 8]} />
          <meshBasicMaterial color="#dfe9ff" toneMapped={false} />
        </mesh>
        </>}
        <LuzPonto position={[-6.5, 4.6, FUNDO / 2 + 7.2]} color="#cfe0ff" intensity={18} distance={11} decay={2} />
        {/* calçada até a pista */}
        <mesh position={[0, 0.06, FUNDO / 2 + 4.5]}>
          <boxGeometry args={[16, 0.12, 9]} />
          <meshStandardMaterial color="#1c1d2c" roughness={0.9} />
        </mesh>
        {/* quem espera na porta (a missão de lá está valendo, ou é a cena) */}
        {(alvo || emCena) && l.gente.map((g, k) => (
          <Pessoa key={g.quem} cor={g.cor} pos={[2.8 - k * 1.3, 0.12, FUNDO / 2 + 1.4 + (k % 2) * 0.5]} vira={-0.5 * l.lado + k * 0.6} />
        ))}
      </group>
      {/* a vaga: um retângulo na beira da pista, do lado do lugar */}
      <Vaga p={p} cor={l.cor} materialRef={vaga} />
      {alvo && !emCena && <Pin p={p} cor={l.cor} />}
      {/* coluna de luz em cima da vaga quando é ali que a missão manda */}
      <mesh ref={coluna} position={[p.vaga.x, p.vaga.y + 22, p.vaga.z]} visible={false}>
        <cylinderGeometry args={[0.9, 0.9, 44, 12, 1, true]} />
        <meshBasicMaterial color={l.cor} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// O BECO (lugar secreto): nada de vitrine nem neon próprio. Dois paredões
// cinza com um vão escuro no meio, e em cima os três letreiros que gritam
// (as três ruas bonitas que dão a volta). No fundo do vão, o papelão dela
const GRITOS = [
  { txt: "GLAMOUR →", cor: "#ff3fb0" },
  { txt: "CONSUMO →", cor: "#ffc857" },
  { txt: "CONFORTO →", cor: "#2fe8ff" },
]

function Beco({ l, p, revelado, emCena }: { l: Lugar; p: PoseLugar; revelado: boolean; emCena: boolean }) {
  const placas = useMemo(() => GRITOS.map((g) => texTexto([{ txt: g.txt, tam: 120, cor: g.cor }], 1024, 200)), [])
  const vaga = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((s) => {
    if (vaga.current) vaga.current.opacity = revelado ? 0.1 + Math.sin(s.clock.elapsedTime * 1.5) * 0.05 : 0
  })
  const alto = p.chao + 12 - -12
  return (
    <group>
      <group position={[p.centro.x, -12 + alto / 2, p.centro.z]} rotation-y={p.rumo}>
        {/* os dois paredões, com o vão de 3,5 m no meio */}
        {[-4.9, 4.9].map((z) => (
          <mesh key={z} position={[0, 0, z]}>
            <boxGeometry args={[FUNDO, alto, 6.2]} />
            <meshStandardMaterial color="#24252c" roughness={0.95} />
          </mesh>
        ))}
      </group>
      <group position={[p.centro.x, p.chao, p.centro.z]} rotation-y={p.rumo + (l.lado > 0 ? Math.PI / 2 : -Math.PI / 2)}>
        {/* a parede do fundo do beco */}
        <mesh position={[0, -p.chao / 2, -FUNDO / 2 + 0.3]}>
          <boxGeometry args={[3.6, alto, 0.6]} />
          <meshStandardMaterial color="#1b1c21" roughness={1} />
        </mesh>
        {/* o chão do beco, molhado */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.07, 0]}>
          <planeGeometry args={[3.6, FUNDO]} />
          <meshStandardMaterial color="#121318" roughness={0.25} metalness={0.5} />
        </mesh>
        {/* o papelão e o cobertor, no fundo */}
        <mesh position={[0.6, 0.1, -FUNDO / 2 + 1.6]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[1.6, 2.2]} />
          <meshStandardMaterial color="#5a4630" roughness={1} />
        </mesh>
        {/* uma lâmpada fraca, amarela, no fundo: a única luz que é dela */}
        <LuzPonto position={[0, 3.2, -FUNDO / 2 + 2.5]} color="#ffd9a0" intensity={emCena ? 30 : 6} distance={12} decay={2} />
        <mesh position={[0, 3.3, -FUNDO / 2 + 1.2]}>
          <sphereGeometry args={[0.09, 8, 6]} />
          <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
        </mesh>
        {/* os três letreiros, empilhados por cima do vão, apontando pra frente */}
        {placas.map((tex, k) => (
          <group key={k} position={[(k - 1) * 0.8, 4.6 + k * 1.6, FUNDO / 2 + 0.1]}>
            <mesh>
              <planeGeometry args={[7, 1.4]} />
              <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
            </mesh>
            <LuzPonto position={[0, 0, 1.5]} color={GRITOS[k].cor} intensity={14} distance={10} decay={2} />
          </group>
        ))}
        <mesh position={[0, 0.06, FUNDO / 2 + 4.5]}>
          <boxGeometry args={[16, 0.12, 9]} />
          <meshStandardMaterial color="#1c1d2c" roughness={0.9} />
        </mesh>
        {emCena && l.gente.map((g) => (
          <Pessoa key={g.quem} cor={g.cor} pos={[0.6, 0.12, -FUNDO / 2 + 2.2]} vira={0} />
        ))}
      </group>
      <Vaga p={p} cor="#e6f0ff" materialRef={vaga} />
    </group>
  )
}

// A CASA DA D-BEE (05/10): sozinha no deserto, na beira da estrada. Apagada,
// porta fechada — parece abandonada (a abertura do LU2CA)
function CasaDeserto({ l, p, alvo }: { l: Lugar; p: PoseLugar; alvo: boolean }) {
  const vaga = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((s) => { if (vaga.current) vaga.current.opacity = alvo ? 0.32 + Math.sin(s.clock.elapsedTime * 3) * 0.14 : 0 })
  return (
    <group>
      {/* de frente pra pista: a varanda olha pra estrada */}
      <group position={[p.centro.x, p.chao, p.centro.z]} rotation-y={p.rumo + (l.lado > 0 ? Math.PI : 0)}>
        <group>
          <mesh position={[0, 2.4, 0]}>
            <boxGeometry args={[9, 4.8, 8]} />
            <meshStandardMaterial color="#3a3138" roughness={0.9} />
          </mesh>
          {[-1, 1].map((k) => (
            <mesh key={k} position={[0, 5.6, k * 2.1]} rotation-x={k * 0.62}>
              <boxGeometry args={[9.6, 0.18, 5.2]} />
              <meshStandardMaterial color="#5a3a30" roughness={0.95} />
            </mesh>
          ))}
          <mesh position={[-5.6, 0.15, 0]}>
            <boxGeometry args={[2.4, 0.3, 7.6]} />
            <meshStandardMaterial color="#4a3a2c" roughness={1} />
          </mesh>
          {[-3.4, 3.4].map((z) => (
            <mesh key={z} position={[-6.6, 1.55, z]}>
              <boxGeometry args={[0.16, 2.8, 0.16]} />
              <meshStandardMaterial color="#2a2226" />
            </mesh>
          ))}
          <mesh position={[-5.6, 3.05, 0]} rotation-z={-0.12}>
            <boxGeometry args={[2.8, 0.12, 8]} />
            <meshStandardMaterial color="#4a3028" roughness={1} />
          </mesh>
          {/* janelas apagadas e a porta fechada */}
          {[2.4, -2.6].map((z) => (
            <mesh key={z} position={[-4.52, 2.4, z]} rotation-y={-Math.PI / 2}>
              <planeGeometry args={[1.5, 1.2]} />
              <meshStandardMaterial color="#141012" roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[-4.52, 1.15, 0]} rotation-y={-Math.PI / 2}>
            <planeGeometry args={[1.1, 2.3]} />
            <meshStandardMaterial color="#2a1e18" roughness={1} />
          </mesh>
        </group>
      </group>
      <Vaga p={p} cor={l.cor} materialRef={vaga} />
      {alvo && <Pin p={p} cor={l.cor} />}
    </group>
  )
}

// O PIN: um marcador de mapa flutuando em cima do lugar da missão (girando,
// subindo e descendo), visível de longe. Passar na frente = entrar
function Pin({ p, cor }: { p: PoseLugar; cor: string }) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!g.current) return
    const t = s.clock.elapsedTime
    g.current.position.y = p.chao + 15 + Math.sin(t * 2) * 0.6
    g.current.rotation.y = t * 1.2
  })
  return (
    <group ref={g} position={[p.vaga.x, p.chao + 15, p.vaga.z]}>
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[1.6, 20, 14]} />
        <meshBasicMaterial color={cor} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.7, 14, 10]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation-x={Math.PI}>
        <coneGeometry args={[1.25, 3.2, 20]} />
        <meshBasicMaterial color={cor} toneMapped={false} />
      </mesh>
      <LuzPonto position={[0, 1, 0]} color={cor} intensity={60} distance={30} decay={2} />
    </group>
  )
}

function Vaga({ p, cor, materialRef }: { p: PoseLugar; cor: string; materialRef: React.RefObject<THREE.MeshBasicMaterial | null> }) {
  return (
    <mesh position={[p.vaga.x, p.vaga.y + 0.05, p.vaga.z]} rotation={[-Math.PI / 2, 0, p.rumo]}>
      <planeGeometry args={[3.2, VAGA]} />
      <meshBasicMaterial ref={materialRef} color={cor} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// ── (06/11) OS LUGARES DA CIDADE MODELADOS NO BLENDER (blender/scripts/lugares_cidade.py,
// public/models/lugares-cidade.glb): um modelo por TIPO, reaproveitado — o palco
// suspenso (treliça, line arrays, telão) nos 4 palcos das faixas, a estação da
// Linha 9, a torre do terraço, a loja/AP do Drew, o monolito da balada (também a
// casa de shows) e a cápsula escondida da Ella. Origem no meio da planta (16 × 10,
// a da caixa de antes), na altura da pista, frente pra pista; malhas _solido (cor
// no vértice com a AO assada), _luz (brilho de cor fixa), _neon (vira a cor do
// lugar), _vidro (o tom do vidro misturado com a cor do lugar) e _pe/_pen (de 0 a
// -1: esticados até a água, como o prédio de antes). Tudo vai pro mundo UMA vez e
// vira 3 desenhos (sólido, brilho, vidro) com materiais compartilhados; nada por
// quadro, sem luz nova. Vaga, PIN, gente, poste, calçada e letreiro continuam os
// da Fachada (os gatilhos e as colisões vêm da pose, que não muda). Os sem tipo
// (o posto) e o beco seguem como eram. Se o .glb não carregar, tudo volta às caixas.
const URL_CIDADE = "/models/lugares-cidade.glb"
type Tipo = "palco" | "estacao" | "terraco" | "casa-drew" | "balada" | "casa-ella"
type Let = [number, number, number, number] // o letreiro no modelo: x, altura, frente, largura (m)
const TIPO: Partial<Record<LugarId, Tipo>> = {
  "palco-swav": "palco", "palco-rollercoaster": "palco", "palco-copo": "palco", "palco-nectar": "palco",
  plataforma: "estacao", topo: "terraco", "casa-drewboy": "casa-drew", balada: "balada", "casa-shows": "balada", escondido: "casa-ella",
}
// (os do lugares_cidade.py, impressos como LET; a frente é a partir do meio da planta)
const LET_TIPO: Record<Tipo, Let> = {
  palco: [0, 10.55, 4.33, 7], estacao: [0, 4.75, 4.71, 7], terraco: [0, 7.9, 3.79, 9],
  "casa-drew": [-2, 5, 3.93, 5.5], balada: [-2, 5, 5.03, 6], "casa-ella": [0, 4.2, 3.98, 2.6],
}

let MATS_CIDADE: { solido: THREE.Material; brilho: THREE.Material; vidro: THREE.Material } | null = null
function matsCidade() {
  if (MATS_CIDADE) return MATS_CIDADE
  const vidro = new THREE.MeshStandardMaterial({ vertexColors: true, color: "#2a3040", roughness: 0.12, metalness: 0.5, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })
  // a luz de dentro vazando: o vidro emite a própria cor do vértice (o tom × a cor do lugar)
  vidro.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n#ifdef USE_COLOR\n  totalEmissiveRadiance += vColor.rgb * 0.3;\n#endif")
  }
  vidro.customProgramCacheKey = () => "lugares-cidade-vidro"
  MATS_CIDADE = {
    solido: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 }),
    brilho: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    vidro,
  }
  return MATS_CIDADE
}

// copia a malha do glb (quantizada pelo meshopt) em Float32 e leva pro mundo
function emFloat(g: THREE.BufferGeometry, m: THREE.Matrix4, cor?: THREE.Color, mistura = 1) {
  const pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color
  const n = pos.count
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i)
    if (nor) { N[i * 3] = nor.getX(i); N[i * 3 + 1] = nor.getY(i); N[i * 3 + 2] = nor.getZ(i) }
    const r = col ? col.getX(i) : 1, gg = col ? col.getY(i) : 1, b = col ? col.getZ(i) : 1
    if (cor) {
      C[i * 3] = r + (cor.r - r) * mistura; C[i * 3 + 1] = gg + (cor.g - gg) * mistura; C[i * 3 + 2] = b + (cor.b - b) * mistura
    } else { C[i * 3] = r; C[i * 3 + 1] = gg; C[i * 3 + 2] = b }
  }
  const o = new THREE.BufferGeometry()
  o.setAttribute("position", new THREE.BufferAttribute(P, 3))
  o.setAttribute("normal", new THREE.BufferAttribute(N, 3))
  o.setAttribute("color", new THREE.BufferAttribute(C, 3))
  o.setIndex(g.index ? Array.from(g.index.array as ArrayLike<number>) : Array.from({ length: n }, (_, i) => i))
  o.applyMatrix4(m)
  if (!nor) o.computeVertexNormals()
  return o
}

type Pose = { l: Lugar; p: PoseLugar }

function LugaresGlb({ poses, alvo, emCena, revelado }: { poses: Pose[]; alvo: LugarId | null; emCena: LugarId | null; revelado: LugarId | null }) {
  const { nodes } = useGLTF(URL_CIDADE) as unknown as { nodes: Record<string, THREE.Object3D> }
  const d = useMemo(() => {
    const solido: THREE.BufferGeometry[] = [], brilho: THREE.BufferGeometry[] = [], vidro: THREE.BufferGeometry[] = []
    const inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), estica = new THREE.Matrix4()
    for (const { l, p } of poses) {
      const tipo = l.segredo ? undefined : TIPO[l.id]
      if (!tipo) continue
      const no = nodes[tipo]
      if (!no) throw new Error(`lugares-cidade.glb sem o nó ${tipo}`)
      const base = new THREE.Matrix4().makeRotationY(p.rumo + (l.lado > 0 ? Math.PI / 2 : -Math.PI / 2)).setPosition(p.centro.x, p.chao, p.centro.z)
      estica.makeScale(1, Math.max(0.5, p.chao + 12), 1) // o pé: da pista até a água (-12)
      const cor = new THREE.Color(l.cor)
      no.updateWorldMatrix(true, true)
      inv.copy(no.matrixWorld).invert()
      no.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const g = m.name.slice(m.name.lastIndexOf("_") + 1)
        rel.multiplyMatrices(inv, m.matrixWorld)
        const mm = base.clone()
        if (g === "pe" || g === "pen") mm.multiply(estica)
        mm.multiply(rel)
        if (g === "solido" || g === "pe") solido.push(emFloat(m.geometry, mm))
        else if (g === "neon" || g === "pen") brilho.push(emFloat(m.geometry, mm, cor))
        else if (g === "vidro") vidro.push(emFloat(m.geometry, mm, cor, 0.45))
        else brilho.push(emFloat(m.geometry, mm))
      })
    }
    const juntar = (gs: THREE.BufferGeometry[]) => {
      if (!gs.length) return null
      const r = mergeGeometries(gs, false)
      for (const g of gs) g.dispose()
      if (!r) throw new Error("lugares-cidade.glb: não deu pra juntar")
      return r
    }
    return { solido: juntar(solido), brilho: juntar(brilho), vidro: juntar(vidro) }
  }, [nodes, poses])
  // as mescladas são nossas (copiadas em Float32): soltar ao desmontar; o cache do drei fica
  useEffect(() => () => { d.solido?.dispose(); d.brilho?.dispose(); d.vidro?.dispose() }, [d])
  const mats = matsCidade()
  return (
    <group>
      {d.solido && <mesh geometry={d.solido} material={mats.solido} name="lugares-cidade" />}
      {d.brilho && <mesh geometry={d.brilho} material={mats.brilho} />}
      {d.vidro && <mesh geometry={d.vidro} material={mats.vidro} renderOrder={1} />}
      <LugaresCorpo poses={poses} alvo={alvo} emCena={emCena} revelado={revelado} comModelo />
    </group>
  )
}

function LugaresCorpo({ poses, alvo, emCena, revelado, comModelo = false }: { poses: Pose[]; alvo: LugarId | null; emCena: LugarId | null; revelado: LugarId | null; comModelo?: boolean }) {
  return (
    <group>
      {poses.map(({ l, p }) => {
        const tipo = comModelo ? TIPO[l.id] : undefined
        return l.segredo
          ? <Beco key={l.id} l={l} p={p} revelado={revelado === l.id} emCena={emCena === l.id} />
          : l.id === "casa-dbee"
          ? <CasaDeserto key={l.id} l={l} p={p} alvo={alvo === l.id} />
          : <Fachada key={l.id} l={l} p={p} alvo={alvo === l.id} emCena={emCena === l.id} modelo={tipo ? LET_TIPO[tipo] : undefined} />
      })}
    </group>
  )
}

export function Lugares({ M, alvo, emCena, revelado = null }: { M: Mundo; alvo: LugarId | null; emCena: LugarId | null; revelado?: LugarId | null }) {
  const poses = useMemo(() => Object.values(LUGARES).filter((l) => (!l.soDisco || "disco" in M) && !("disco" in M && (l.id === "bar" || l.id === "casa-dbee")) && !l.soChao).map((l) => ({ l, p: poseLugar(M, l) })), [M])
  const reserva = <LugaresCorpo poses={poses} alvo={alvo} emCena={emCena} revelado={revelado} />
  return (
    <ModeloSeguro nome="lugares-cidade-glb" reserva={reserva}>
      <LugaresGlb poses={poses} alvo={alvo} emCena={emCena} revelado={revelado} />
    </ModeloSeguro>
  )
}
