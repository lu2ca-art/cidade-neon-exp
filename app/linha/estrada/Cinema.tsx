"use client"

// A lente do jogo: o que transforma a cena crua em plano de cinema.
// Bloom de verdade (o neon sangra na chuva como em foto noturna), tonemapping
// AgX (os brancos estouram macio, as cores saturadas não viram plástico),
// vinheta, grão de filme e uma aberração cromática bem leve nas bordas.
// Se o aparelho engasga, a lente vai ficando mais simples sozinha:
// 2 = tudo · 1 = só bloom + tonemapping · 0 = sem pós (tonemapping do renderer).
// O 0 só se escolhe na entrada (nível leve), nunca no meio do jogo.

import { PerformanceMonitor } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { Bloom, BrightnessContrast, ChromaticAberration, EffectComposer, HueSaturation, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing"
import { BlendFunction, ToneMappingMode } from "postprocessing"
import { useEffect, useMemo, useState } from "react"
import * as THREE from "three"
import { POS } from "./luzes"
import { TROCA } from "./resolucao"
import { VELO } from "./velo"
import { DRONE } from "./Drone"

// maxLente (20/10): o teto que a qualidade do aparelho dá (qualidade.ts)
// (30/10, leveza C) a lente é decidida na montagem e não muda mais até a estrada
// desmontar: se a medida do aparelho baixar o nível no meio da partida, vale na
// próxima entrada. Ir de lente pra sem lente (ou voltar) troca o tonemapping
// do renderer e recompila TODOS os shaders (travada): isso nunca acontece em jogo
function lenteInicial(maxLente: number) {
  const teto = Math.max(0, Math.min(2, maxLente))
  if (typeof window === "undefined" || !/[?&]medir/.test(location.search)) return teto
  const v = new URLSearchParams(location.search).get("lente") // (medição: ?medir&lente=0|1|2 fixa o nível da lente)
  return v === "0" || v === "1" || v === "2" ? +v : teto
}
export function Cinema({ maxLente = 2 }: { maxLente?: number }) {
  const [nivel, setNivel] = useState(() => lenteInicial(maxLente))
  // com a lente decidida na montagem: sem pós, POS já vale antes do 1º quadro
  // (luzes.tsx compila os shaders pro mesmo destino)
  const [comPos] = useState(() => { const c = nivel > 0; POS.ativo = c; return c })
  const gl = useThree((s) => s.gl)
  // com a lente ligada quem faz o tonemapping é ela; sem lente, o renderer
  useEffect(() => {
    /* eslint-disable react-hooks/immutability -- o renderer é do three, não estado do React */
    gl.toneMapping = comPos ? THREE.NoToneMapping : THREE.AgXToneMapping
    gl.toneMappingExposure = 1
    /* eslint-enable react-hooks/immutability */
    POS.ativo = comPos
  }, [gl, comPos])
  const aberracao = useMemo(() => new THREE.Vector2(0.0009, 0.0006), [])
  // (20/10) o hyperlapse abre a lente: a aberração cresce com a velocidade
  // (27/10, drone v2 desempenho) com o drone no alto (a cidade inteira a km, a
  // maior parte quase preta) saem o SMAA (2 passes a mais na tela toda) e a
  // aberração; o resto da lente (bloom, cor, vinheta, grão) fica igual. A troca
  // refaz só os passes (não as imagens) e cai no meio da subida/descida de 1 s
  const [alto, setAlto] = useState(false)
  useFrame(() => {
    const k = Math.min(2.5, VELO.k); aberracao.set(0.0009 + k * 0.0045, 0.0006 + k * 0.003)
    const a = DRONE.e > 0.5
    if (a !== alto) setAlto(a)
  })
  // (19/10) o monitor só começa a julgar depois que o jogo assenta: carregando
  // (compilando shaders, decodificando modelos) todo aparelho engasga, e ele
  // desligava a lente de vez já no começo (sem bloom o resto do jogo)
  const [vigiar, setVigiar] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVigiar(true), 15000); return () => clearTimeout(t) }, [])
  return (
    <>
      {/* (19/10) só desce com engasgo de verdade (menos de 30 fps seguidos). O
          padrão do drei (numa tela de 120 Hz: abaixo de 50 desce, acima de 90
          sobe) virava gangorra a cada travadinha e, com 3 viradas, desligava a
          lente pra sempre: do 1 pro 0 TODOS os shaders recompilam (trava) */}
      {/* (22/10, perf 004) trocar a lente refaz as imagens dela (e os shaders), como
          a troca de densidade: respeita o mesmo intervalo de 10 s (resolucao.tsx) */}
      {/* (30/10, leveza C) o monitor só tira os extras (2 → 1, os passes da própria
          lente); nunca desliga a lente em jogo (1 → 0 recompilava a cena toda) */}
      {vigiar && nivel === 2 && <PerformanceMonitor bounds={() => [30, 1000]} flipflops={Infinity} onDecline={() => { const ag = performance.now(); if (ag - TROCA.ult < 10_000) return; TROCA.ult = ag; setNivel((n) => Math.max(1, n - 1)) }} />}
      {nivel === 2 && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          {!alto && <SMAA />}
          <Bloom mipmapBlur intensity={1.05} luminanceThreshold={0.62} luminanceSmoothing={0.25} radius={0.72} />
          {!alto && <ChromaticAberration offset={aberracao} radialModulation modulationOffset={0.35} />}
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
