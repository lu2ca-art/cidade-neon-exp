"use client"

// O POSTO (lugar 9, indie, confissão). O último antes da estrada acabar:
// a cobertura com luz fria, as bombas numeradas, a loja de conveniência
// vazia atrás do vidro. A Kombi parada na bomba 5 e o LU2CA sentado no
// meio-fio do lado da 6. Quando ele decide ir, levanta e entra na Kombi.

import { Suspense, useMemo } from "react"
import { texTexto } from "../../estrada/geo"
import { KombiHerbal } from "../../estrada/KombiHerbal"
import { Seguro } from "../../estrada/Seguro"
import { Caixa, Npc } from "../comum"
import { Camera, type Plano, type SalaProps } from "../Interior"

const LILAS = "#b38cff"
const FRIO = "#dfe9ff"

const PLANOS: Record<string, Plano> = {
  chegada: { pos: [5.5, 2, 7], olha: [1, 1.2, -1], fov: 58 },
  lu2ca: { pos: [4.9, 1.25, 3.4], olha: [3.3, 0.8, 0.5], fov: 50 },
  junto: { pos: [5.4, 1.5, 4.2], olha: [1.2, 1, 0], fov: 58 },
  loja: { pos: [3.5, 1.7, 5], olha: [-2, 1.5, -6], fov: 56 },
}

export function SalaPosto({ estado }: SalaProps) {
  const levantou = estado.pos >= 10
  const plano = useMemo(() => {
    if (estado.pos === 0) return PLANOS.loja
    if (estado.pos === 1) return PLANOS.chegada
    if (levantou) return PLANOS.junto
    if (estado.falando === "LU2CA" || estado.falando === "você") return PLANOS.lu2ca
    return PLANOS.junto
  }, [estado, levantou])
  return (
    <>
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#05060a", 12, 40]} />
      <ambientLight intensity={0.2} color={FRIO} />
      <hemisphereLight args={["#c8d8ff", "#08080a", 0.3]} />
      {/* o chão do posto */}
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#202228" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* a cobertura com a luz fria */}
      <Caixa pos={[0, 5.2, 0]} tam={[12, 0.5, 8]} cor="#e8ecf4" />
      <Caixa pos={[0, 4.92, 0]} tam={[11, 0.05, 7]} cor={FRIO} brilho={1.1} />
      <Caixa pos={[0, 5.2, 4.03]} tam={[12, 0.5, 0.05]} cor={LILAS} brilho={0.8} />
      {[-3, 3].map((x) => <pointLight key={x} position={[x, 4.6, 0]} color={FRIO} intensity={10} distance={10} decay={2} />)}
      {[-4.5, 4.5].map((x) => <Caixa key={x} pos={[x, 2.5, 0]} tam={[0.4, 5, 0.4]} cor="#c8ccd8" />)}
      {/* as bombas */}
      {[-2.2, 2.2].map((x, i) => <Bomba key={x} pos={[x, 0, -2.5]} n={i === 0 ? 5 : 6} />)}
      {/* a loja de conveniência: vidro, prateleiras, ninguém no caixa */}
      <group position={[-2, 0, -9]}>
        <Caixa pos={[0, 1.6, 0]} tam={[10, 3.2, 4]} cor="#1a1c24" />
        <Caixa pos={[0, 1.4, 2.02]} tam={[8, 2.2, 0.03]} cor={FRIO} brilho={0.35} rough={0.05} />
        {[-3, -1, 1, 3].map((x) => <Caixa key={x} pos={[x, 1.2, 2.06]} tam={[0.08, 1.8, 0.02]} cor="#2a2c34" />)}
        <Placa />
      </group>
      {/* a Kombi na bomba 6 */}
      <group position={[-1.2, 0, 0.8]} rotation-y={Math.PI}>
        <Seguro nome="kombi-posto">
          <Suspense fallback={null}><KombiHerbal /></Suspense>
        </Seguro>
      </group>
      {/* o LU2CA no meio-fio do lado da bomba 6 (levanta e entra na Kombi) */}
      {!levantou
        ? <Npc cor={LILAS} pos={[3.3, -0.12, 0.5]} vira={0.3} pose="sentada" falando={estado.falando === "LU2CA"} />
        : <Npc cor={LILAS} pos={[1.6, 0, 1.6]} vira={-1.6} falando={estado.falando === "LU2CA"} />}
      <Caixa pos={[3.3, 0.07, 0.5]} tam={[1.6, 0.14, 0.5]} cor="#4a4c56" />
      <Camera plano={plano} />
    </>
  )
}

function Bomba({ pos, n }: { pos: [number, number, number]; n: number }) {
  const tex = useMemo(() => texTexto([{ txt: String(n), tam: 180, cor: LILAS }], 256, 256), [n])
  return (
    <group position={pos}>
      <Caixa pos={[0, 0.9, 0]} tam={[0.8, 1.8, 0.5]} cor="#d8dce8" />
      <Caixa pos={[0, 1.3, 0.26]} tam={[0.5, 0.35, 0.02]} cor="#101218" brilho={0} />
      <mesh position={[0, 1.65, 0.27]}>
        <planeGeometry args={[0.35, 0.35]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

function Placa() {
  const tex = useMemo(() => texTexto([{ txt: "POSTO 24H", tam: 140, cor: LILAS }], 1024, 200), [])
  return (
    <mesh position={[0, 3.6, 2.05]}>
      <planeGeometry args={[4.6, 0.9]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}
