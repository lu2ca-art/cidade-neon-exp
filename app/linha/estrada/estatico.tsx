"use client"

// (22/10, perf 003) O QUE NÃO SE MEXE: o three recompõe a matriz de todo objeto
// em todo quadro (matrixAutoUpdate), mesmo dos prédios, placas e do subúrbio,
// que nunca saem do lugar. Aqui a matriz é calculada uma vez e congelada.
//
// Uso:
//   <Estatico>{/* malhas fixas */}</Estatico>
//   congelar(modelo) // num objeto montado à mão (useMemo), depois de posicionar
//
// Regra: só pra coisa que NÃO anima nem muda de posição/rotação/escala por
// props depois de montar. Se mudar, chame `congelar` de novo (ou não use).
// Não é thread-safe (como todo o grafo do three: só na main thread).

import { useLayoutEffect, useRef, type ReactNode } from "react"
import * as THREE from "three"

export function congelar(o: THREE.Object3D) {
  o.traverse((x) => {
    x.updateMatrix()
    x.matrixAutoUpdate = false
  })
  // a matriz do mundo ainda é atualizada pelo pai (matrixWorldNeedsUpdate)
  o.updateMatrixWorld(true)
}

export function Estatico({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  // (o filho aplica as props antes do efeito do pai: aqui já está tudo no lugar)
  useLayoutEffect(() => { if (g.current) congelar(g.current) })
  return <group ref={g}>{children}</group>
}

