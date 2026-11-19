"use client"

// (06/11) O TREM PARADO NO SALÃO DO METRÔ (a linha 9 nas trincheiras): três carros do
// metro.glb (o mesmo carro da estrada, na escala do salão: 1,53 → 4,6 m de largo,
// 20 m de comprido, a caixa de colisão TREM de sempre). Os faróis nas duas pontas
// (o carro de trás vira pro outro lado). Enquanto baixa, ou se falhar, as caixas
// de antes (geoTremCaixas). Materiais compartilhados, nada por quadro.

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { CarroModelado } from "../estrada/MetroModelo"
import { ModeloSeguro } from "../estrada/Seguro"
import { geoTremCaixas } from "./geo"
import { TREM } from "./mapa"

// o carro nasce 0,5 m acima da viga (y 0,5..3,68): × 1,53 flutuaria 0,77 m; desce 0,5 (fundo ~0,27, as caixas de antes: 0,25)
const ESC = (TREM.meioL * 2) / 3
const VAG = (TREM.meioC * 2 - 2) / 3

function TremCaixas({ concreto, neon }: { concreto: THREE.Material; neon: THREE.Material }) {
  const g = useMemo(() => geoTremCaixas(), [])
  useEffect(() => () => { g.concreto?.dispose(); g.neon?.dispose() }, [g])
  return (
    <>
      {g.concreto && <mesh geometry={g.concreto} material={concreto} matrixAutoUpdate={false} />}
      {g.neon && <mesh geometry={g.neon} material={neon} matrixAutoUpdate={false} />}
    </>
  )
}

export function TremTuneis({ concreto, neon }: { concreto: THREE.Material; neon: THREE.Material }) {
  const rot = Math.atan2(TREM.ax, TREM.az)
  return (
    <ModeloSeguro nome="metro-tuneis-glb" reserva={<TremCaixas concreto={concreto} neon={neon} />}>
      {[-1, 0, 1].map((j) => {
        const u = j * (VAG + 1)
        return (
          <group key={j} position={[TREM.c.x + TREM.ax * u, -0.5, TREM.c.z + TREM.az * u]} rotation-y={rot + (j < 0 ? Math.PI : 0)} scale={ESC}>
            <CarroModelado farol={j !== 0} />
          </group>
        )
      })}
    </ModeloSeguro>
  )
}
