"use client"

// A CASA DA D-BEE por dentro (lugar 10, ep. 3: ausência, redenção). Um
// cômodo só, de madeira: a cama feita às pressas, um violão encostado sem
// dono, a mesa com a xícara ainda morna, a foto na parede (uma mulher numa
// cidade toda verde), a janela pra estrada escura, a porta aberta pro varal.
// Ninguém. O gesto é procurar: tocar nas coisas. Depois o grupo vai chegando
// pela porta, um a um (cada um aparece quando fala).

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { sinalizar } from "../bus"
import { Caixa, Npc, Sala, Toque, useExplorar, type Coisa, type V3 } from "../comum"
import { Camera, type Plano, type SalaProps } from "../motor"

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
  { quem: "Drewboy", cor: "#ff3fb0", pos: [-0.6, 0, 2.7] },
  { quem: "Alohan", cor: "#ffc857", pos: [1.6, 0, 1.6] },
  { quem: "LU2CA", cor: "#b38cff", pos: [-1.2, 0, 2.2] },
  { quem: "Tony Gordo", cor: "#ffe14d", pos: [0.6, 0, 3.4] },
]

export function SalaCasaDbee({ estado, inicio = false }: SalaProps) {
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

  const plano = useMemo(() => {
    // a porta abre (plano aberto), depois ela de perto
    if (inicio) return estado.pos === 0 ? PLANOS.abertura : PLANOS.dbeePorta
    if (chegaram.length && (estado.falando === null || GRUPO.some((g) => g.quem === estado.falando) || estado.falando === "você" || estado.escolha)) return PLANOS.grupo
    if (procurando) return PLANOS.dentro
    if (estado.falando === "o bilhete") return PLANOS.dentro
    if (naFoto) return PLANOS.foto
    if (estado.pos === 0) return PLANOS.porta
    return PLANOS.dentro
  }, [estado, procurando, chegaram, naFoto, inicio])

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
