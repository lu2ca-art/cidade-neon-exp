"use client"

// O BECO DOS TRÊS LETREIROS por dentro (lugar 3, thriller psicológico). Dois
// paredões cinza molhados, os três letreiros gritando na boca do beco
// (GLAMOUR, CONSUMO, CONFORTO), e lá no fundo, numa lâmpada amarela fraca, a
// moradora sentada no papelão, enrolada no cobertor.
//
// O gesto: ela fala em pedaços — e os pedaços estão escritos a giz na
// parede, fora de ordem. Toca na ordem certa; errou, o giz some e volta.

import { useEffect, useMemo, useRef, useState } from "react"
import { texTexto } from "../../estrada/geo"
import { gota } from "../../som"
import { vib } from "../../som-carro"
import { sinalizar } from "../bus"
import { Caixa, Chuva, Npc, Toque, type V3 } from "../comum"
import { Camera, type Plano, type SalaProps } from "../Interior"

const CINZA = "#b8bcc8"
const FRASES = ["se quiser ver", "pare de procurar", "onde todos olham"]
// a ordem em que estão escritas na parede (embaralhada)
const NA_PAREDE = [2, 0, 1]
const GRITOS = [{ txt: "GLAMOUR →", cor: "#ff3fb0" }, { txt: "CONSUMO →", cor: "#ffc857" }, { txt: "CONFORTO →", cor: "#2fe8ff" }]

const PLANOS: Record<string, Plano> = {
  boca: { pos: [0, 1.7, 6], olha: [0, 1.4, -3], fov: 58 },
  moradora: { pos: [0.5, 1.2, -1.2], olha: [-0.2, 0.7, -3.6], fov: 48 },
  parede: { pos: [0.3, 1.55, -0.6], olha: [-1.6, 1.5, -1.6], fov: 58 },
}

export function SalaBeco({ estado }: SalaProps) {
  const montando = estado.gesto === "ordem"
  const [montada, setMontada] = useState<number[]>([])
  const pronta = montada.length === FRASES.length
  const pegar = (i: number) => {
    if (!montando || pronta || montada.includes(i)) return
    if (i !== montada.length) {
      vib(30); setMontada([])
      sinalizar({ t: "fala", tipo: "acao", texto: "o giz escorre com a chuva. ela espera. de novo, com calma" })
      return
    }
    gota(2)
    const n = [...montada, i]
    setMontada(n)
    if (n.length === FRASES.length) {
      sinalizar({ t: "fala", de: "a moradora", texto: FRASES.join(" ") + "." })
      setTimeout(() => sinalizar({ t: "fim-gesto" }), 400)
    }
  }
  const pegarRef = useRef(pegar)
  useEffect(() => { pegarRef.current = pegar })
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__gesto = () => { [0, 1, 2].forEach((i, k) => setTimeout(() => pegarRef.current(i), 80 * k)) }
    return () => { delete w.__gesto }
  }, [])

  const plano = useMemo(() => {
    if (montando) return PLANOS.parede
    if (estado.falando === "a moradora" || estado.falando === "você" || estado.ganha) return PLANOS.moradora
    return PLANOS.boca
  }, [estado, montando])

  return (
    <>
      <color attach="background" args={["#06060a"]} />
      <fog attach="fog" args={["#06060a", 5, 18]} />
      <ambientLight intensity={0.18} color="#b8bcc8" />
      <hemisphereLight args={["#8890a8", "#08080a", 0.25]} />
      {/* o chão molhado e os dois paredões */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[4, 14]} />
        <meshStandardMaterial color="#141418" roughness={0.12} metalness={0.6} />
      </mesh>
      <Caixa pos={[-2, 4, 0]} tam={[0.3, 8, 14]} cor="#2a2b32" rough={0.95} />
      <Caixa pos={[2, 4, 0]} tam={[0.3, 8, 14]} cor="#26272e" rough={0.95} />
      <Caixa pos={[0, 4, -4.6]} tam={[4, 8, 0.3]} cor="#1e1f24" rough={1} />
      {/* os letreiros na boca do beco */}
      {GRITOS.map((g, k) => <Grito key={k} txt={g.txt} cor={g.cor} pos={[(k - 1) * 0.4, 3.6 + k * 1.1, 5.2]} />)}
      {/* a lâmpada dela, o papelão, o cobertor */}
      <mesh position={[0, 2.6, -4.3]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.4, -3.9]} color="#ffd9a0" intensity={5} distance={7} decay={2} />
      <Caixa pos={[-0.2, 0.02, -3.7]} tam={[1.4, 0.03, 1.2]} cor="#6a5236" />
      <Npc cor={CINZA} pos={[-0.2, -0.05, -3.75]} vira={0.2} pose="sentada" pele="#3a3a40" falando={estado.falando === "a moradora"} />
      <Caixa pos={[-0.2, 0.5, -3.65]} tam={[0.8, 0.6, 0.5]} cor="#5a5048" rough={1} />
      {/* as frases a giz na parede da esquerda */}
      {NA_PAREDE.map((i, k) => (
        <Giz key={i} texto={FRASES[i]} pos={[-1.83, 2.1 - k * 0.55, -1.2 - k * 0.35]} feita={montada.includes(i) || (estado.pos > 5 && !montando)} ativo={montando && !montada.includes(i)} onToque={() => pegar(i)} />
      ))}
      <Chuva n={280} larg={4} alto={8} fundo={12} />
      <Camera plano={plano} />
    </>
  )
}

function Grito({ txt, cor, pos }: { txt: string; cor: string; pos: V3 }) {
  const tex = useMemo(() => texTexto([{ txt, tam: 120, cor }], 1024, 200), [txt, cor])
  return (
    <group position={pos}>
      <mesh rotation-y={Math.PI}>
        <planeGeometry args={[3.4, 0.66]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <pointLight color={cor} intensity={4} distance={6} decay={2} />
    </group>
  )
}

function Giz({ texto, pos, feita, ativo, onToque }: { texto: string; pos: V3; feita: boolean; ativo: boolean; onToque: () => void }) {
  const tex = useMemo(() => texTexto([{ txt: texto, tam: 90, cor: feita ? "#5dffa0" : "#e8ebf2" }], 1024, 160), [texto, feita])
  return (
    <Toque pos={pos} raio={0.32} cor="#e8ebf2" ativo={ativo} onToque={onToque}>
      <mesh rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.7, 0.27]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} opacity={0.92} />
      </mesh>
    </Toque>
  )
}
