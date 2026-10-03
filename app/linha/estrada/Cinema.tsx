"use client"

// A lente do jogo: o que transforma a cena crua em plano de cinema.
// Bloom de verdade (o neon sangra na chuva como em foto noturna), tonemapping
// AgX (os brancos estouram macio, as cores saturadas não viram plástico),
// vinheta, grão de filme e uma aberração cromática bem leve nas bordas.
// Se o aparelho engasga, a lente vai ficando mais simples sozinha:
// 2 = tudo · 1 = só bloom + tonemapping · 0 = sem pós (tonemapping do renderer).

import { PerformanceMonitor } from "@react-three/drei"
import { useThree } from "@react-three/fiber"
import { Bloom, BrightnessContrast, ChromaticAberration, EffectComposer, HueSaturation, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing"
import { BlendFunction, ToneMappingMode } from "postprocessing"
import { useEffect, useMemo, useState } from "react"
import * as THREE from "three"

export function Cinema() {
  const [nivel, setNivel] = useState(2)
  const gl = useThree((s) => s.gl)
  // com a lente ligada quem faz o tonemapping é ela; sem lente, o renderer
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- o renderer é do three, não estado do React */
    gl.toneMapping = nivel > 0 ? THREE.NoToneMapping : THREE.AgXToneMapping
    gl.toneMappingExposure = 1
    /* eslint-enable react-hooks/immutability */
  }, [gl, nivel])
  const aberracao = useMemo(() => new THREE.Vector2(0.0009, 0.0006), [])
  return (
    <>
      <PerformanceMonitor flipflops={3} onDecline={() => setNivel((n) => Math.max(0, n - 1))} onFallback={() => setNivel(0)} />
      {nivel === 2 && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <SMAA />
          <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.62} luminanceSmoothing={0.25} radius={0.72} />
          <ChromaticAberration offset={aberracao} radialModulation modulationOffset={0.35} />
          <ToneMapping mode={ToneMappingMode.AGX} />
          {/* o AgX é honesto mas lava o neon: devolve contraste e cor */}
          <BrightnessContrast brightness={0.01} contrast={0.07} />
          <HueSaturation saturation={0.22} />
          <Vignette offset={0.3} darkness={0.58} />
          <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.1} />
        </EffectComposer>
      )}
      {nivel === 1 && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.66} radius={0.6} />
          <ToneMapping mode={ToneMappingMode.AGX} />
          <HueSaturation saturation={0.2} />
        </EffectComposer>
      )}
    </>
  )
}
