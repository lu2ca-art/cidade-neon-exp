"use client"

// (08/11) AS PAREDES LIVRES NO MUNDO (docs/t64.md): as 8 paredes numa malha só, um
// desenho, com o atlas de atlasParedes.ts. Montadas só com a câmera perto (<Perto>);
// longe, nada existe. Quem pinta e o que salva é disco/Grafite.tsx.

import { useEffect, useMemo, useState } from "react"
import type * as THREE from "three"
import { Perto } from "../estrada/Perto"
import { desmontarAtlasParedes, montarAtlasParedes } from "./atlasParedes"
import { geoParedesLivres, paredesLivres } from "./geo"

const RAIO = 170 // a névoa já cobre boa parte a essa distância

function Malha() {
  const geo = useMemo(() => geoParedesLivres(), [])
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null)
  useEffect(() => {
    const t = montarAtlasParedes()
    setTex(t) // eslint-disable-line react-hooks/set-state-in-effect -- a textura é criada no cliente, ao montar
    return () => desmontarAtlasParedes(t)
  }, [])
  useEffect(() => () => geo.dispose(), [geo])
  if (!tex) return null
  return (
    <mesh geometry={geo} matrixAutoUpdate={false}>
      <meshBasicMaterial map={tex} vertexColors toneMapped={false} />
    </mesh>
  )
}

export function ParedesPintadas() {
  const pontos = useMemo(() => paredesLivres(), [])
  return <Perto nome="paredes-livres" raio={RAIO} pontos={pontos}><Malha /></Perto>
}
