"use client"

// O METRÔ NO MUNDO (T64): a fuga do branch t26-metro (app/linha/metro/Metro.tsx)
// ligada na história (disco/metro.ts). A página monta isto quando a história está
// no metrô (emMetro(h)); o componente decide o fim pela regra pura (fimDoMetro) e
// devolve a história nova e os eventos ("perdeuViolao") pra quem grava o save.
//
// Desempenho: a fuga tem o canvas dela (um WebGLRenderer, relógio de passo fixo
// 1/120 s, nada alocado por quadro). Enquanto ela estiver aberta, a página deve
// pausar o canvas do mundo (frameloop "never"/congelar), senão são dois 3D juntos.
//
// Ligar na page.tsx (lote D):
//   {emMetro(h13) && <MetroFuga historia={h13}
//      onPasso={(p) => { gravar p.h; p.eventos.includes("perdeuViolao") && save.violao = false }}
//      onSair={() => voltar pro mundo (de patins, sem jetpack; os 3 veículos: veiculosLiberados)} />}

import { useCallback, useEffect, useRef } from "react"
import type { HistoriaDisco } from "./historia"
import { CONFIG_METRO, FALAS_METRO, fimDoMetro, type PassoMetro } from "./metro"
import { Metro, type FimMetro } from "../metro/Metro"

export interface MetroFugaProps {
  historia: HistoriaDisco
  // a fuga acabou valendo: a história nova e os eventos (só chama quando muda algo)
  onPasso: (p: PassoMetro) => void
  // o "seguir" do fim: volta pro mundo
  onSair: () => void
}

export function MetroFuga({ historia, onPasso, onSair }: MetroFugaProps) {
  const hRef = useRef(historia)
  const passoRef = useRef(onPasso)
  useEffect(() => { hRef.current = historia; passoRef.current = onPasso }, [historia, onPasso])
  const fim = useCallback((r: FimMetro) => {
    const p = fimDoMetro(hRef.current, r)
    if (p.h !== hRef.current || p.eventos.length) passoRef.current(p)
  }, [])
  return (
    <Metro semente={CONFIG_METRO.semente} onFim={fim} onSeguir={onSair} seguirSePego={!CONFIG_METRO.pegoRecomeca} antes={FALAS_METRO.entrada} />
  )
}
