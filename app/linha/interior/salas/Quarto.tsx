"use client"

// O QUARTO DO DREWBOY (AP 222, lugar 5, coming-of-age). Pequeno, escuro, a
// única luz é a do espelho grande na parede. Ele sentado na cama, de costas
// pra porta, de frente pro espelho. Roupa pelo chão, um tênis novo ainda na
// caixa, a janela com a cidade lá fora (e o som abafado da balada).
//
// O gesto é olhar o quarto: tocar no espelho, no tênis, na janela. Cada
// coisa ele comenta. Viu duas, ele levanta.

import { useMemo, useState } from "react"
import * as THREE from "three"
import { sinalizar } from "../bus"
import { Caixa, Neon, Npc, Sala, Toque, useExplorar, type Coisa } from "../comum"
import { Camera, type Plano, type SalaProps } from "../motor"

const ROSA = "#ff3fb0"
const CIANO = "#7fe8ff"

const PLANOS: Record<string, Plano> = {
  porta: { pos: [0.2, 1.65, 2.6], olha: [-0.2, 1.1, -1.4], fov: 60 },
  drewboy: { pos: [1.3, 1.45, 1.4], olha: [-0.3, 0.95, -0.8], fov: 52 },
  mubarak: { pos: [-0.6, 1.55, 1.9], olha: [0.9, 1.25, 0.7], fov: 50 },
  // do canto, na diagonal: o espelho, o tênis e a janela no mesmo quadro
  // (no celular em pé a câmera antiga só pegava o espelho — o gesto travava)
  quarto: { pos: [-1.7, 1.9, 2.2], olha: [0.6, 0.8, -0.9], fov: 75 },
}

const COISAS: Coisa[] = [
  { id: "espelho", pos: [-0.2, 1.4, -2.15], raio: 0.3, falas: [{ texto: "o espelho é maior que a janela", tipo: "acao" }, { de: "Drewboy", texto: "ele me vê mais do que todo mundo junto" }] },
  { id: "tenis", pos: [1.3, 0.12, -1.3], raio: 0.22, falas: [{ texto: "um tênis novo, ainda na caixa", tipo: "acao" }, { de: "Drewboy", texto: "comprei pra sair. nunca saí com ele" }] },
  { id: "janela", pos: [1.95, 1.5, -0.3], raio: 0.35, falas: [{ texto: "lá fora, a cidade. de longe, o grave abafado de uma balada", tipo: "acao" }, { de: "Drewboy", texto: "dá pra ouvir a SEXTA daqui. toda sexta" }] },
]

export function SalaQuarto({ estado }: SalaProps) {
  const olhando = estado.gesto === "quarto"
  // o Mubarak (o fim do tutorial, cenas.ts CENA_MUBARAK_DREW): aparece quando fala
  const [mubarak, setMubarak] = useState(false)
  if (!mubarak && estado.falando === "Mubarak") setMubarak(true)
  const { vistas, ver } = useExplorar(olhando, COISAS, 2, sinalizar)
  // sai depois da resposta (a ação "ele apaga a luz do espelho")
  const saiu = estado.pos >= 8 || (estado.pos === 7 && estado.falando === null)
  const plano = useMemo(() => {
    if (olhando || estado.escolha) return PLANOS.quarto
    if (estado.falando === "Mubarak") return PLANOS.mubarak
    if (estado.falando === "Drewboy" || estado.falando === "você") return PLANOS.drewboy
    return PLANOS.porta
  }, [estado, olhando])
  return (
    <>
      <color attach="background" args={["#040409"]} />
      <ambientLight intensity={0.12} color="#b0c8ff" />
      <hemisphereLight args={["#9fb4ff", "#0a0610", 0.18]} />
      <Sala larg={4} fundo={4.6} alto={2.6} parede="#1c1824" chao="#2a2028" teto="#100e14" />
      {/* o espelho: a única luz do quarto (apaga quando ele sai) */}
      <group position={[-0.2, 1.4, -2.27]}>
        <Caixa pos={[0, 0, 0]} tam={[1.1, 1.9, 0.04]} cor="#c8d8ff" brilho={saiu ? 0.02 : 0.5} rough={0.05} metal={0.9} />
        <Neon pos={[0, 1.0, 0.05]} comp={1.1} cor={CIANO} luz={saiu ? 0 : 3} />
        {!saiu && <pointLight position={[0, 0, 0.8]} color={CIANO} intensity={4} distance={4} decay={2} />}
      </group>
      {/* a cama desfeita */}
      <Caixa pos={[-0.3, 0.25, -0.6]} tam={[1.5, 0.5, 2]} cor="#3a3044" />
      <Caixa pos={[-0.3, 0.53, -0.4]} tam={[1.4, 0.08, 1.4]} cor="#5a4870" rough={1} />
      <Caixa pos={[-0.3, 0.6, -1.4]} tam={[0.9, 0.14, 0.4]} cor="#d8d4e0" rough={1} />
      {/* roupa no chão e o tênis na caixa */}
      <Caixa pos={[0.9, 0.03, 0.6]} tam={[0.6, 0.05, 0.4]} cor="#4a2a40" rot={0.4} />
      <Caixa pos={[-1.4, 0.03, 1.2]} tam={[0.5, 0.05, 0.35]} cor="#203048" rot={-0.7} />
      <Caixa pos={[1.3, 0.07, -1.3]} tam={[0.42, 0.14, 0.26]} cor="#e8e2d8" />
      <Caixa pos={[1.3, 0.16, -1.3]} tam={[0.3, 0.06, 0.12]} cor={ROSA} brilho={0.3} />
      {/* a janela com a cidade */}
      <group position={[1.98, 1.5, 0.2]}>
        <Caixa pos={[0, 0, 0]} tam={[0.04, 1, 1.2]} cor="#0a0a18" brilho={0} />
        {[[-0.3, 0.2, ROSA], [0.2, -0.1, "#ffc857"], [0.35, 0.25, CIANO], [-0.1, -0.3, "#b38cff"]].map(([z, y, c], i) => (
          <mesh key={i} position={[-0.03, y as number, z as number]}>
            <boxGeometry args={[0.01, 0.06, 0.06]} />
            <meshBasicMaterial color={c as string} toneMapped={false} />
          </mesh>
        ))}
        <pointLight position={[-0.5, 0, 0]} color={ROSA} intensity={1.2} distance={3} decay={2} />
      </group>
      {/* a casa do drew (06/10, LU2CA): bem suburbana — grafite nas paredes,
          roupa estilosa pendurada, caixas de som */}
      <Grafite pos={[-1.98, 1.35, -0.2]} rot={Math.PI / 2} w={3.6} h={1.9} seed={3} />
      <Grafite pos={[1.1, 1.5, -2.28]} rot={0} w={1.6} h={1.5} seed={8} />
      <Varal pos={[-1.85, 2.05, -0.6]} rot={Math.PI / 2} />
      {[-1.6, 1.55].map((x) => <Som key={x} pos={[x, 0, x < 0 ? -1.8 : 1.5]} />)}
      <pointLight position={[-1.2, 2.1, 0.6]} color="#ffc857" intensity={1.4} distance={4} decay={2} />
      {mubarak && <Npc cor="#ff6a35" pos={[0.9, 0, 0.8]} vira={-2.4} falando={estado.falando === "Mubarak"} />}
      {/* ele, sentado na cama de frente pro espelho (sai quando desce) */}
      {!saiu && <Npc cor={ROSA} pos={[-0.3, 0.12, -0.7]} vira={Math.PI} pose="sentada" falando={estado.falando === "Drewboy"} />}
      {COISAS.map((c) => (
        <Toque key={c.id} pos={c.pos} raio={c.raio} cor={ROSA} ativo={olhando && !vistas.includes(c.id)} onToque={() => ver(c.id)} />
      ))}
      <Camera plano={plano} />
    </>
  )
}

// grafite: tags e manchas de spray numa parede (canvas, leve)
function Grafite({ pos, rot, w, h, seed }: { pos: [number, number, number]; rot: number; w: number; h: number; seed: number }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = 272
    const g = c.getContext("2d")!
    let s = seed
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const cores = ["#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0", "#b38cff", "#ff6a35"]
    for (let i = 0; i < 14; i++) {
      g.globalAlpha = 0.5 + r() * 0.4
      g.fillStyle = cores[Math.floor(r() * cores.length)]
      g.beginPath(); g.ellipse(r() * 512, r() * 272, 30 + r() * 90, 14 + r() * 40, r() * 3, 0, Math.PI * 2); g.fill()
    }
    g.globalAlpha = 1
    const tags = ["222", "DREW", "SEXTA", "NÃO DORME", "XENOM"]
    for (let i = 0; i < 4; i++) {
      g.save(); g.translate(40 + r() * 400, 70 + r() * 170); g.rotate((r() - 0.5) * 0.4)
      g.font = `900 ${34 + Math.floor(r() * 30)}px sans-serif`
      g.lineWidth = 6; g.strokeStyle = "#0a0a12"; g.fillStyle = cores[Math.floor(r() * cores.length)]
      const t = tags[Math.floor(r() * tags.length)]
      g.strokeText(t, 0, 0); g.fillText(t, 0, 0); g.restore()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [seed])
  return (
    <mesh position={pos} rotation-y={rot}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={tex} transparent roughness={0.9} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.18} />
    </mesh>
  )
}

// o varal da sala: roupa estilosa pendurada (jaqueta, moletom, camisas)
function Varal({ pos, rot = 0 }: { pos: [number, number, number]; rot?: number }) {
  const pecas = [["#ff3fb0", 0.55, 0.7], ["#1d2b4a", 0.5, 0.75], ["#ffc857", 0.45, 0.6], ["#2fe8ff", 0.5, 0.68], ["#e8e2d8", 0.42, 0.62]] as const
  return (
    <group position={pos} rotation-y={rot}>
      <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.015, 0.015, 2.2, 6]} /><meshStandardMaterial color="#8a8590" metalness={0.6} /></mesh>
      {pecas.map(([cor, w, h], i) => (
        <group key={i} position={[-0.9 + i * 0.45, 0, 0]}>
          <mesh position={[0, -0.06, 0]}><boxGeometry args={[0.3, 0.02, 0.02]} /><meshStandardMaterial color="#2a2a30" /></mesh>
          <Caixa pos={[0, -0.12 - h / 2, 0]} tam={[w, h, 0.08]} cor={cor} rough={0.9} />
          <Caixa pos={[-w / 2 - 0.06, -0.3, 0]} tam={[0.12, 0.42, 0.07]} cor={cor} rough={0.9} />
          <Caixa pos={[w / 2 + 0.06, -0.3, 0]} tam={[0.12, 0.42, 0.07]} cor={cor} rough={0.9} />
        </group>
      ))}
    </group>
  )
}

// caixa de som no chão
function Som({ pos }: { pos: [number, number, number] }) {
  return (
    <group position={pos}>
      <Caixa pos={[0, 0.45, 0]} tam={[0.5, 0.9, 0.42]} cor="#141218" rough={0.7} />
      {[0.62, 0.28].map((y, i) => (
        <mesh key={y} position={[0, y, 0.215]}>
          <circleGeometry args={[i ? 0.17 : 0.09, 20]} />
          <meshStandardMaterial color="#2a2830" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.83, 0.215]}><circleGeometry args={[0.02, 8]} /><meshBasicMaterial color="#5dffa0" toneMapped={false} /></mesh>
    </group>
  )
}
