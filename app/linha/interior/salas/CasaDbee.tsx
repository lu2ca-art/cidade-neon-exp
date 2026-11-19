"use client"

// A CASA DA D-BEE por dentro (lugar 10, ep. 3: ausência, redenção). Um
// cômodo só, de madeira: a cama feita às pressas, um violão encostado sem
// dono, a mesa com a xícara ainda morna, a foto na parede (uma mulher numa
// cidade toda verde), a janela pra estrada escura, a porta aberta pro varal.
// Ninguém. O gesto é procurar: tocar nas coisas. Depois o grupo vai chegando
// pela porta, um a um (cada um aparece quando fala).

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { sinalizar } from "../bus"
import { Caixa, Npc, Sala, Toque, useExplorar, type Coisa, type V3 } from "../comum"
import { Camera, type Plano, type SalaProps } from "../motor"
import { DjembeDela, DjembeSeu } from "./Djembe"
import { INSTRUMENTOS_GLB, InstrumentosCasa } from "../../disco/InstrumentosCasa"

useGLTF.preload(INSTRUMENTOS_GLB)

const AZUL = "#3d7bff"
const QUENTE = "#ffcf8a"

const PLANOS: Record<string, Plano> = {
  porta: { pos: [0.3, 1.65, 3.1], olha: [-0.4, 1.2, -2], fov: 62 },
  dentro: { pos: [0.1, 1.75, 2.3], olha: [0.1, 0.85, -1.6], fov: 70 },
  foto: { pos: [0.2, 1.65, -0.4], olha: [0.2, 1.7, -2.4], fov: 46 },
  grupo: { pos: [-1.3, 1.6, -1.2], olha: [0.8, 1.3, 2.4], fov: 62 },
  dbee: { pos: [0.9, 1.55, -0.6], olha: [-1.5, 1.35, 1.1], fov: 52 },
  janela: { pos: [0.4, 1.6, -0.2], olha: [-2.5, 1.6, 0.8], fov: 55 },
  // a abertura: de fora, quem bateu na porta. Ela abre, no batente
  abertura: { pos: [0.15, 1.6, 5.2], olha: [0, 1.4, 1.8], fov: 46 },
  // ela fala de perto, a luz da casa nela
  dbeePorta: { pos: [0.5, 1.6, 4], olha: [0, 1.45, 2], fov: 42 },
  // (disco) o tapete com os tambores e a parede dos instrumentos
  tapete: { pos: [1.4, 1.5, 1.1], olha: [0.0, 0.35, -1.0], fov: 54 },
  parede: { pos: [0.4, 1.5, 1.4], olha: [0.2, 1.6, -2.4], fov: 58 },
  dbeeDisco: { pos: [-1.1, 1.55, -0.6], olha: [0.55, 1.35, 0.75], fov: 52 },
  // (T06) o tambor: sentado atrás do seu djembê, ela do outro lado com o dela
  tambor: { pos: [0.28, 1.4, 0.62], olha: [0.0, 0.4, -1.6], fov: 56 },
  // (T07) a entrega do holo: ela de frente, a mão estendida pra ele (o holo na mão é o disco/EntregaHolo.tsx, por cima)
  entrega: { pos: [-0.75, 1.5, 2.45], olha: [0.5, 1.2, 0.75], fov: 50 },
  // (T49) os instrumentos ganhos: o banco e as prateleiras na parede da direita
  instrumentos: { pos: [0.55, 1.45, 0.95], olha: [2.3, 0.9, -0.6], fov: 56 },
  // (notas 04/11) ela falando na cena dos instrumentos: de pé no fim do banco,
  // o banco à direita do quadro
  dbeeInstrumentos: { pos: [0.1, 1.5, 0.3], olha: [1.85, 1.15, -1.15], fov: 54 },
}

const COISAS: Coisa[] = [
  { id: "cama", pos: [-1.3, 0.6, -1.3], raio: 0.35, falas: [{ texto: "a cama feita às pressas. o lençol ainda guarda a forma de alguém deitado de lado", tipo: "acao" }] },
  { id: "violao", pos: [1.75, 0.8, -1.9], raio: 0.3, falas: [{ texto: "um violão encostado. as cordas novas. ninguém tocou nele ainda", tipo: "acao" }] },
  { id: "xicara", pos: [1, 0.86, 0.2], raio: 0.2, falas: [{ texto: "a xícara ainda morna. ela saiu faz pouco. muito pouco", tipo: "acao" }] },
  { id: "foto", pos: [0.2, 1.7, -2.25], raio: 0.3, falas: [{ texto: "um quadro na parede, virado de costas. alguém virou ele antes de sair", tipo: "acao" }] },
]

// quem chega (na ordem em que fala na cena)
const GRUPO: { quem: string; cor: string; pos: V3 }[] = [
  { quem: "Ella", cor: "#2fe8ff", pos: [0.2, 0, 2.2] },
  { quem: "Notti", cor: "#5dffa0", pos: [1, 0, 2.6] },
  { quem: "Drew", cor: "#ff3fb0", pos: [-0.6, 0, 2.7] },
  { quem: "Alohan", cor: "#ffc857", pos: [1.6, 0, 1.6] },
  { quem: "LU2CA", cor: "#b38cff", pos: [-1.2, 0, 2.2] },
  { quem: "Tony Gordo", cor: "#ffe14d", pos: [0.6, 0, 3.4] },
]

// (T49) `instrumentos`: os ganhos e os achados (portas.ts instrumentosGanhos, ligado pela
// page.tsx); `novos`: os que chegaram desde a última visita
export function SalaCasaDbee({ estado, inicio = false, disco = false, instrumentos = [], novos = [] }: SalaProps) {
  const ganhos = instrumentos
  const coisas = inicio ? [] : COISAS
  const procurando = estado.gesto === (inicio ? "casa-inicio" : "casa")
  const { vistas, ver } = useExplorar(procurando, coisas, inicio ? 2 : 3, sinalizar)
  // cada um aparece quando fala pela primeira vez e fica
  const [chegaram, setChegaram] = useState<string[]>([])
  if (estado.falando && GRUPO.some((g) => g.quem === estado.falando) && !chegaram.includes(estado.falando)) setChegaram([...chegaram, estado.falando])
  // a foto desvirada: quem acorda acha (a cena diz)
  const [viuFoto, setViuFoto] = useState(false)
  if (!viuFoto && estado.texto?.includes("uma foto")) setViuFoto(true)
  const naFoto = !!estado.texto && /foto|relicário/.test(estado.texto)
  // (notas 04/11) a cena dos instrumentos (a volta e a visita): ela fica do lado do banco
  const naCenaInstrumentos = disco && (estado.gesto === "instrumentos" || /no banco|trouxeram|cada um tem um jeito|a casa lembra|toca o que quiser|a casa também|ainda não tá aqui/.test(estado.texto ?? ""))

  const plano = useMemo(() => {
    // (disco, LU2CA 20/10) a casinha no deserto: a porta, a parede dos
    // instrumentos, ela falando, os tambores
    if (disco) {
      if (estado.pos === 0) return PLANOS.abertura
      if (estado.gesto === "instrumentos") return PLANOS.instrumentos
      if (naCenaInstrumentos) return estado.falando === "D-Bee" ? PLANOS.dbeeInstrumentos : PLANOS.instrumentos
      if (estado.gesto === "holo" || /é seu|aparelho pequeno/.test(estado.texto ?? "")) return PLANOS.entrega
      if (estado.gesto === "tambores") return PLANOS.tambor
      if (estado.pos === 1 || /estante|livros/.test(estado.texto ?? "")) return PLANOS.parede
      if (/tambor|tocam junto/.test(estado.texto ?? "")) return PLANOS.tapete
      return estado.falando === "D-Bee" ? PLANOS.dbeeDisco : PLANOS.dentro
    }
    // a porta abre (plano aberto), depois ela de perto
    if (inicio) return estado.pos === 0 ? PLANOS.abertura : PLANOS.dbeePorta
    if (chegaram.length && (estado.falando === null || GRUPO.some((g) => g.quem === estado.falando) || estado.falando === "você" || estado.escolha)) return PLANOS.grupo
    if (procurando) return PLANOS.dentro
    if (estado.falando === "o bilhete") return PLANOS.dentro
    if (naFoto) return PLANOS.foto
    if (estado.pos === 0) return PLANOS.porta
    return PLANOS.dentro
  }, [estado, procurando, chegaram, naFoto, inicio, disco, naCenaInstrumentos])

  return (
    <>
      <color attach="background" args={["#05060a"]} />
      <ambientLight intensity={0.2} color={QUENTE} />
      <hemisphereLight args={["#ffcf8a", "#100a08", 0.25]} />
      <Sala larg={5} fundo={5} alto={2.8} parede="#3a2c24" chao="#2a1e16" teto="#1a120e" sem={["frente"]} />
      {/* a porta aberta (frente), a varanda e a noite lá fora */}
      <Caixa pos={[-1.6, 1.4, 2.5]} tam={[1.8, 2.8, 0.1]} cor="#3a2c24" />
      <Caixa pos={[1.6, 1.4, 2.5]} tam={[1.8, 2.8, 0.1]} cor="#3a2c24" />
      <Caixa pos={[0, 2.5, 2.5]} tam={[1.4, 0.6, 0.1]} cor="#3a2c24" />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 6]}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#14100c" roughness={1} />
      </mesh>
      {/* a lâmpada do teto, quente */}
      <mesh position={[0, 2.55, 0]}>
        <sphereGeometry args={[0.08, 10, 8]} />
        <meshBasicMaterial color="#fff0c8" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.4, 0]} color={QUENTE} intensity={6} distance={7} decay={2} />
      {/* a cama */}
      <Caixa pos={[-1.3, 0.25, -1.3]} tam={[1.6, 0.5, 2]} cor="#4a3424" />
      <Caixa pos={[-1.3, 0.53, -1.2]} tam={[1.5, 0.08, 1.7]} cor="#8a96b8" rough={1} />
      <Caixa pos={[-1.3, 0.62, -2]} tam={[0.8, 0.12, 0.35]} cor="#e0dcd4" rough={1} />
      {/* o violão encostado */}
      <group position={[1.75, 0.55, -2.05]} rotation={[0.25, 0, -0.05]}>
        <mesh scale={[1, 1.2, 0.35]}><sphereGeometry args={[0.2, 16, 10]} /><meshStandardMaterial color="#8a5a2c" /></mesh>
        <mesh position={[0, 0.22, 0]} scale={[0.82, 0.9, 0.35]}><sphereGeometry args={[0.16, 16, 10]} /><meshStandardMaterial color="#8a5a2c" /></mesh>
        <Caixa pos={[0, 0.7, 0.02]} tam={[0.05, 0.7, 0.03]} cor="#3a2414" />
      </group>
      {/* a mesa e a xícara (fumacinha) */}
      <Caixa pos={[1, 0.4, 0.2]} tam={[0.9, 0.8, 0.7]} cor="#5a3e28" />
      <mesh position={[1, 0.86, 0.2]}>
        <cylinderGeometry args={[0.05, 0.04, 0.09, 12]} />
        <meshStandardMaterial color="#e8e2d8" />
      </mesh>
      <Fumaca pos={[1, 0.95, 0.2]} />
      {/* o quadro na parede, virado (a cena desvira pra quem acorda) */}
      <Quadro pos={[0.2, 1.7, -2.47]} virado={!viuFoto} />
      {/* a janela pra estrada */}
      <Janela pos={[-2.46, 1.6, 0.6]} deserto={inicio} />
      <pointLight position={[-1.9, 1.6, 0.6]} color={AZUL} intensity={0.8} distance={3} decay={2} />
      {/* a abertura: ela abre a porta e fica no batente, com a luz da casa
          nas costas e a do fim de tarde no rosto */}
      {inicio && <Npc cor={AZUL} pos={[0, 0, 2.2]} vira={0} falando={estado.falando === "D-Bee"} />}
      {inicio && <pointLight position={[0.2, 1.8, 3.6]} color="#ffb070" intensity={5} distance={4} decay={2} />}
      {/* (disco) a D-Bee em casa, os instrumentos na parede, os tambores no tapete */}
      {disco && <CasaDisco falando={estado.falando === "D-Bee"} tocando={estado.gesto === "tambores" || /senta no tapete|tocam junto|é quem eu achei/.test(estado.texto ?? "")} instrumentos={naCenaInstrumentos} />}
      {/* (T49) os instrumentos ganhos: ficam na casa e cada um toca */}
      {disco && <InstrumentosCasa ids={ganhos} novos={novos} gesto={estado.gesto === "instrumentos"} />}
      {/* quem chega */}
      {GRUPO.filter((g) => chegaram.includes(g.quem)).map((g) => (
        <Npc key={g.quem} cor={g.cor} pos={g.pos} vira={Math.PI} falando={estado.falando === g.quem} />
      ))}
      {coisas.map((c) => (
        <Toque key={c.id} pos={c.pos} raio={c.raio} cor={QUENTE} ativo={procurando && !vistas.includes(c.id)} onToque={() => ver(c.id)} />
      ))}
      <Camera plano={plano} />
    </>
  )
}

function Fumaca({ pos }: { pos: V3 }) {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!g.current) return
    g.current.children.forEach((c, i) => {
      const t = (s.clock.elapsedTime * 0.4 + i / 3) % 1
      c.position.set(Math.sin(t * 6 + i) * 0.02, t * 0.25, 0)
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial
      m.opacity = (1 - t) * 0.35
    })
  })
  return (
    <group ref={g} position={pos}>
      {[0, 1, 2].map((i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// a foto: uma mulher sorrindo numa cidade toda verde (desenhada simples)
function Quadro({ pos, virado }: { pos: V3; virado: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 192
    const g = c.getContext("2d")!
    g.fillStyle = "#cfeedd"; g.fillRect(0, 0, 256, 192)
    for (let i = 0; i < 14; i++) { g.fillStyle = ["#3fa060", "#5dffa0", "#2a7a48"][i % 3]; g.fillRect(i * 19, 90 - (i % 4) * 14, 14, 110) }
    for (let i = 0; i < 9; i++) { g.fillStyle = "#3f9a5a"; g.beginPath(); g.arc(i * 30 + 10, 80 - (i % 3) * 10, 16, 0, Math.PI * 2); g.fill() }
    g.fillStyle = "#2a2028"; g.beginPath(); g.arc(128, 110, 16, 0, Math.PI * 2); g.fill(); g.fillRect(114, 124, 28, 50)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <group position={pos}>
      <Caixa pos={[0, 0, 0]} tam={[0.66, 0.52, 0.04]} cor="#2a1a10" />
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[0.58, 0.44]} />
        {virado ? <meshStandardMaterial color="#6a5a48" /> : <meshBasicMaterial map={tex} toneMapped={false} />}
      </mesh>
    </group>
  )
}

const PREDIOS_JANELA = (() => {
  let seed = 4
  const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  return Array.from({ length: 26 }, (_, i) => ({ x: i * 10, w: 7 + r() * 5, h: 20 + r() * 55, cor: ["#ff3fb0", "#2fe8ff", "#ffc857", "#b38cff", "#5dffa0"][Math.floor(r() * 5)] }))
})()

// a janela: a cidade neon lá longe, no horizonte. De tempos em tempos um
// pedaço dela apaga e acende BRANCO (o Núcleo testando a otimização)
function Janela({ pos, deserto = false }: { pos: V3; deserto?: boolean }) {
  const { tex, pintar } = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 192
    const g = c.getContext("2d")!
    const predios = PREDIOS_JANELA
    const t = new THREE.CanvasTexture(c)
    const pintar = (branco: number) => {
      if (deserto) {
        // a abertura: o céu da cidade (estrada/ceu.ts) sobre o deserto, e a
        // cidade neon pequenininha no horizonte
        const c2 = g.createLinearGradient(0, 0, 0, 192)
        c2.addColorStop(0, "#03040d"); c2.addColorStop(0.55, "#0d1233"); c2.addColorStop(0.85, "#4a1a30"); c2.addColorStop(1, "#6a2a2a")
        g.fillStyle = c2; g.fillRect(0, 0, 256, 192)
        const cores = ["#ff6a35", "#ff3fb0", "#2fe8ff", "#ffc857"]
        for (let i = 0; i < 40; i++) { const h = 3 + ((i * 37) % 11); g.fillStyle = cores[i % 4]; g.globalAlpha = 0.7; g.fillRect(88 + i * 2, 156 - h, 1.6, h) }
        g.globalAlpha = 1
        g.fillStyle = "#1c1412"; g.fillRect(0, 156, 256, 36)
        t.needsUpdate = true
        return
      }
      const ceu = g.createLinearGradient(0, 0, 0, 192)
      ceu.addColorStop(0, "#05060f"); ceu.addColorStop(0.7, "#1a0f2e"); ceu.addColorStop(1, "#2a1238")
      g.fillStyle = ceu; g.fillRect(0, 0, 256, 192)
      g.fillStyle = "#0a0812"; g.fillRect(0, 150, 256, 42)
      predios.forEach((p, i) => {
        const otimizado = branco >= 0 && Math.abs(i - branco) < 4
        g.fillStyle = otimizado ? "#e8ecf4" : "#0c0a16"
        g.fillRect(p.x, 150 - p.h, p.w, p.h)
        g.fillStyle = otimizado ? "#ffffff" : p.cor
        for (let y = 150 - p.h + 4; y < 146; y += 7) if ((y + i) % 3) g.fillRect(p.x + 2, y, 2, 2)
      })
      t.needsUpdate = true
    }
    pintar(-1)
    return { tex: t, pintar }
  }, [deserto])
  const prox = useRef(4)
  const branco = useRef(-1)
  useFrame((s) => {
    if (deserto) return
    const t = s.clock.elapsedTime
    if (t > prox.current) {
      if (branco.current < 0) { branco.current = 3 + Math.floor(Math.random() * 20); prox.current = t + 1.2 }
      else { branco.current = -1; prox.current = t + 4 + Math.random() * 3 }
      pintar(branco.current)
    }
  })
  return (
    <group position={pos}>
      <Caixa pos={[0, 0, 0]} tam={[0.06, 1.0, 1.3]} cor="#2a1e16" />
      <mesh position={[0.04, 0, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.2, 0.9]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  )
}

// (disco, LU2CA 20/10: "instrumentos na parede, tambores no tapete")
const DBEE_SENTADA: V3 = [-0.15, 0, -1.9]
// (notas 04/11, o dono: "a D-Bee tá bem na frente dos instrumentos") no plano dos
// instrumentos ela sai da frente da câmera: fica de pé no fim do banco, do lado
// esquerdo do quadro, meio virada pra ele (o banco inteiro à vista)
const DBEE_INSTRUMENTOS: V3 = [1.6, 0, -1.65]
function CasaDisco({ falando, tocando, instrumentos = false }: { falando: boolean; tocando: boolean; instrumentos?: boolean }) {
  return (
    <>
      {/* (T06) no tambor ela senta no banquinho atrás do djembê dela; antes e depois, de pé */}
      {tocando
        ? <Npc cor={AZUL} pos={DBEE_SENTADA} pose="sentada" vira={0.42} falando={falando} />
        : instrumentos
        ? <Npc key="instrumentos" cor={AZUL} pos={DBEE_INSTRUMENTOS} vira={-0.35} falando={falando} />
        : <Npc cor={AZUL} pos={[0.55, 0, 0.75]} vira={-2.4} falando={falando} />}
      {/* o tapete redondo */}
      <mesh rotation-x={-Math.PI / 2} position={[0.15, 0.01, -0.95]}>
        <circleGeometry args={[0.9, 24]} />
        <meshStandardMaterial color="#7a2a34" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0.15, 0.015, -0.95]}>
        <ringGeometry args={[0.68, 0.78, 24]} />
        <meshStandardMaterial color="#e0b060" roughness={1} />
      </mesh>
      {/* (T06) os dois djembês (Djembe.tsx): o dela, virado pra ela, e o seu, na sua frente */}
      <DjembeDela pos={[-0.05, 0.01, -1.45]} vira={Math.PI + 0.22} cor={AZUL} />
      <DjembeSeu pos={[0.4, 0.01, -0.5]} vira={-0.1} />
      <Caixa pos={[DBEE_SENTADA[0], 0.19, DBEE_SENTADA[2]]} tam={[0.34, 0.38, 0.3]} cor="#4a3020" />
      {/* um tamborzinho velho encostado */}
      <group position={[0.95, 0, -1.4]}>
        <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.15, 0.13, 0.32, 16]} /><meshStandardMaterial color="#6a4424" /></mesh>
        <mesh position={[0, 0.325, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.144, 16]} /><meshStandardMaterial color="#efe4cc" roughness={0.9} /></mesh>
      </group>
      {/* na parede do fundo: duas guitarras, um violino e um pandeiro */}
      {([[-1.4, 1.55, 0.25], [-0.75, 1.5, -0.2]] as const).map(([x, y, rz], i) => (
        <group key={i} position={[x, y, -2.44]} rotation={[0, 0, rz]}>
          <mesh scale={[1, 1.25, 0.25]}><sphereGeometry args={[0.17, 14, 10]} /><meshStandardMaterial color={["#b0342c", "#2a2a3a"][i]} /></mesh>
          <Caixa pos={[0, 0.42, 0.02]} tam={[0.05, 0.5, 0.03]} cor="#2a1a10" />
        </group>
      ))}
      <group position={[1.15, 1.75, -2.44]} rotation={[0, 0, -0.3]}>
        <mesh scale={[0.7, 1.1, 0.2]}><sphereGeometry args={[0.12, 12, 8]} /><meshStandardMaterial color="#8a4a1c" /></mesh>
        <Caixa pos={[0, 0.22, 0.01]} tam={[0.03, 0.22, 0.02]} cor="#1a0e08" />
      </group>
      <mesh position={[1.6, 1.25, -2.44]}><torusGeometry args={[0.13, 0.03, 8, 18]} /><meshStandardMaterial color="#c8a050" metalness={0.4} /></mesh>
      {/* a estante dos livros velhos */}
      <Caixa pos={[2.35, 1, 1.2]} tam={[0.3, 2, 1.2]} cor="#3a2416" />
      {[0.5, 1, 1.5].map((y) => <Caixa key={y} pos={[2.25, y, 1.2]} tam={[0.18, 0.32, 1.05]} cor={y === 1 ? "#6a2a2a" : y === 0.5 ? "#2a3a5a" : "#5a4a2a"} />)}
    </>
  )
}
