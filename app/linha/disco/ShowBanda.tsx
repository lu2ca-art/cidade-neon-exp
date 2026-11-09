"use client"

// O SHOW DA BANDA (LU2CA 21/10 (5): "cada instrumento sendo tocado de um jeito
// [...] vamos ser mais criativos e ter mais de um modo de fazer um jogo de
// música"). Antes do show, a pessoa escolhe o instrumento; cada um é um jogo:
//   só ver   → (§12, 08/11) da plateia, cantando junto: o medidor é dela (ShowAfinador).
//              O som original não muda; a plateia simulada é que desafina
//   guitarra → o Guitar Driver (ShowPista)
//   baixo    → a corda virtual (ShowCorda): sobe e desce pra pegar as faixas coloridas
//   teclado, bateria → por enquanto a pista do Guitar Driver com as notas deles
//                      (a trava-mente do teclado e o jogo da bateria: a desenhar)
// Sempre 22 s, no palco da missão. Quem termina pode repetir (§12). As faixas que
// ainda não saíram assistem sem o medidor (a voz entra no lançamento).
//
// (T19, J2: 33) O PRELÚDIO: "a missão de cantar tem que ter um prelúdio toda
// vez, um filmezinho, curto, mas antes de aparecer as opções de instrumento".
// Toda vez que o show abre, antes da escolha, rodam as tomadas do Guitar Driver
// (as mesmas da cutscene de entrada dele, neon-tiles/cena.ts): o cartaz de
// hoje, a fachada do palco e o corredor do backstage. ~5 s, com a galera
// crescendo; um toque (ou qualquer tecla) pula. A sequência é configurável em
// PRELUDIO.

import { useEffect, useMemo, useRef, useState } from "react"
import { NOME_INST, ShowPista, ajustarShow, musicaDoShow, type InstrumentoShow, type PropsShow } from "./Show"
import { xenomDaFaixa } from "./xenom"
import { desenharTomada, type Tomada } from "../../neon-tiles/cena"
import { MODELOS, PALCOS, type Palco } from "../../neon-tiles/dados"
import { imagemInstrumento } from "../../neon-tiles/instrumentos"
import { ac, montarShow } from "../../neon-tiles/som"

// a sequência do prelúdio (as tomadas e quanto dura cada uma, em segundos)
export const PRELUDIO: { t: Tomada; dur: number }[] = [
  { t: "cartaz", dur: 1.6 },
  { t: "fachada", dur: 1.9 },
  { t: "backstage", dur: 1.7 },
]
const DUR_PRELUDIO = PRELUDIO.reduce((a, x) => a + x.dur, 0)

function Preludio({ faixa, lugar, palco: palcoId, cor, onFim, sub, publico = 20 }: { faixa: string; lugar: string; palco?: string; cor: string; onFim: () => void; sub?: string; publico?: number }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim })
  const palco = useMemo<Palco>(() => {
    const base = PALCOS.find((x) => x.id === palcoId) ?? PALCOS.find((x) => x.id === "casa-shows") ?? PALCOS[0]
    return palcoId && PALCOS.some((x) => x.id === palcoId) ? base : { ...base, nome: lugar.replace(/^(no|na) /, ""), cor, fachada: faixa.toUpperCase() }
  }, [palcoId, lugar, cor, faixa])
  const modelo = MODELOS[0]
  const imgs = useMemo(() => (typeof window === "undefined" ? {} : { guitarra: imagemInstrumento(modelo.id, modelo.visual, "guitarra", "liso") }), [modelo])
  useEffect(() => {
    const c = cvs.current!, g = c.getContext("2d")!
    ac()
    const som = montarShow()
    som?.galera(0.15)
    const t0 = performance.now()
    let raf = 0, acabou = false
    const sair = () => { if (acabou) return; acabou = true; cancelAnimationFrame(raf); som?.galera(0.05); setTimeout(() => som?.parar(), 400); fim.current() }
    const loop = () => {
      const tt = (performance.now() - t0) / 1000
      let acc = 0, atual = PRELUDIO[PRELUDIO.length - 1], tl = 0
      for (const tm of PRELUDIO) { if (tt < acc + tm.dur) { atual = tm; tl = tt - acc; break } acc += tm.dur }
      som?.galera(Math.min(0.6, 0.15 + tt * 0.09))
      ajustarShow(c)
      const w = c.width, h = c.height
      desenharTomada(g, w, h, atual.t, tl, { palco, modelo, imgs, titulo: palco.nome, sub: sub ?? `hoje: LU2CA · ${faixa}`, publico })
      // o fade de entrada e o de saída
      const fade = Math.max(0, 1 - tt / 0.35, (tt - (DUR_PRELUDIO - 0.4)) / 0.4)
      if (fade > 0) { g.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; g.fillRect(0, 0, w, h) }
      if (tt >= DUR_PRELUDIO) { sair(); return }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const k = (e: KeyboardEvent) => { e.preventDefault(); e.stopPropagation(); sair() }
    window.addEventListener("keydown", k, true)
    ;(window as unknown as { __cnPreludio?: () => void }).__cnPreludio = sair
    return () => { acabou = true; cancelAnimationFrame(raf); window.removeEventListener("keydown", k, true); som?.parar() }
  }, [palco, modelo, imgs, lugar, sub])
  return (
    <div className="l-show is-preludio" style={{ ["--cor" as string]: cor }} onPointerDown={(e) => { e.stopPropagation(); fim.current() }} aria-label="o prelúdio do show">
      <canvas ref={cvs} />
      <span className="l-show-pular">tocar pra pular</span>
    </div>
  )
}
import { ShowCorda } from "./ShowCorda"
import { ShowAfinador } from "./ShowAfinador"

const COMO: Record<InstrumentoShow, string> = {
  voz: "fica na plateia e canta junto: o medidor de afinação é seu, a música não muda",
  guitarra: "o Guitar Driver: as notas descendo",
  baixo: "a corda: segura o dedo na tela (ou ↑ ↓) e chega na faixa no tempo",
  teclado: "as notas do teclado na pista",
  bateria: "as peças da bateria na pista",
}

export function Show(props: PropsShow) {
  const [preludio, setPreludio] = useState(true)
  const [inst, setInst] = useState<InstrumentoShow | null>(null)
  const pista = musicaDoShow(props.faixa)
  // (T21) o show xenom: o prelúdio conta o multiverso e o jogo é o Guitar Driver com a regra dele
  const xenom = xenomDaFaixa(props.faixa)
  if (preludio) return <Preludio faixa={pista.faixa} lugar={props.lugar} palco={props.palco} cor={props.cor} sub={xenom ? `${xenom.preludio} · ${pista.faixa}` : undefined} publico={Math.round(2 + (Math.min(100, props.popularidade) / 100) * 70)} onFim={() => setPreludio(false)} />
  if (xenom) return <ShowPista {...props} inst="guitarra" />
  // (§12) terminou: pode repetir (volta pra escolha)
  const deNovo = () => setInst(null)
  if (inst === "voz") return <ShowAfinador {...props} onDeNovo={deNovo} />
  if (inst === "baixo") return <ShowCorda {...props} onDeNovo={deNovo} />
  if (inst) return <ShowPista {...props} inst={inst} onDeNovo={deNovo} />
  const opcoes: InstrumentoShow[] = ["voz", "guitarra", "baixo", "teclado", "bateria"]
  return (
    <div className="l-show is-gd is-escolha" style={{ ["--cor" as string]: props.cor }} onPointerDown={(e) => e.stopPropagation()}>
      <header className="l-show-topo"><small>o show · {props.lugar}</small><b>{pista.faixa}</b><span>só ver, da plateia, ou subir no palco · 22 s</span></header>
      <div className="l-show-banda" role="group" aria-label="O seu instrumento">
        {opcoes.map((i) => (
          <button key={i} type="button" onClick={() => setInst(i)}>
            <b>{NOME_INST[i]}</b>
            <small>{COMO[i]}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
