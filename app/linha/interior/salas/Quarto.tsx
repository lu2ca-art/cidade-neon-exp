"use client"

// O QUARTO DO DREWBOY (AP 222, lugar 5, coming-of-age). Pequeno, escuro, a
// única luz é a do espelho grande na parede. Ele sentado na cama, de costas
// pra porta, de frente pro espelho. Roupa pelo chão, um tênis novo ainda na
// caixa, a janela com a cidade lá fora (e o som abafado da balada).
//
// O gesto é olhar o quarto: tocar no espelho, no tênis, na janela. Cada
// coisa ele comenta. Viu duas, ele levanta.

import { useMemo } from "react"
import { sinalizar } from "../bus"
import { Caixa, Neon, Npc, Sala, Toque, useExplorar, type Coisa } from "../comum"
import { Camera, type Plano, type SalaProps } from "../Interior"

const ROSA = "#ff3fb0"
const CIANO = "#7fe8ff"

const PLANOS: Record<string, Plano> = {
  porta: { pos: [0.2, 1.65, 2.6], olha: [-0.2, 1.1, -1.4], fov: 60 },
  drewboy: { pos: [0.9, 1.35, 0.4], olha: [-0.2, 1.05, -0.8], fov: 50 },
  quarto: { pos: [0.3, 1.75, 2.3], olha: [-0.1, 1.0, -1.2], fov: 66 },
}

const COISAS: Coisa[] = [
  { id: "espelho", pos: [-0.2, 1.4, -2.15], raio: 0.3, falas: [{ texto: "o espelho é maior que a janela", tipo: "acao" }, { de: "Drewboy", texto: "ele me vê mais do que todo mundo junto" }] },
  { id: "tenis", pos: [1.3, 0.12, -1.3], raio: 0.22, falas: [{ texto: "um tênis novo, ainda na caixa", tipo: "acao" }, { de: "Drewboy", texto: "comprei pra sair. nunca saí com ele" }] },
  { id: "janela", pos: [1.95, 1.5, 0.2], raio: 0.35, falas: [{ texto: "lá fora, a cidade. de longe, o grave abafado de uma balada", tipo: "acao" }, { de: "Drewboy", texto: "dá pra ouvir a SEXTA daqui. toda sexta" }] },
]

export function SalaQuarto({ estado }: SalaProps) {
  const olhando = estado.gesto === "quarto"
  const { vistas, ver } = useExplorar(olhando, COISAS, 2, sinalizar)
  const saiu = estado.pos >= 7
  const plano = useMemo(() => {
    if (olhando || estado.escolha) return PLANOS.quarto
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
      {/* ele, sentado na cama de frente pro espelho (sai quando desce) */}
      {!saiu && <Npc cor={ROSA} pos={[-0.3, 0.12, -0.7]} vira={Math.PI} pose="sentada" falando={estado.falando === "Drewboy"} />}
      {COISAS.map((c) => (
        <Toque key={c.id} pos={c.pos} raio={c.raio} cor={ROSA} ativo={olhando && !vistas.includes(c.id)} onToque={() => ver(c.id)} />
      ))}
      <Camera plano={plano} />
    </>
  )
}
