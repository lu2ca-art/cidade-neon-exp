"use client"

// O GRAFITE NAS TRINCHEIRAS (T64, a partir de /teste/grafite do branch t12-grafite).
// As paredes dos túneis têm pontos de grafite (trincheiras/geo.ts pinta os pontos
// numerados no alto da parede; assinado, vira a arte). Chegou perto de um que ainda
// não tem a sua assinatura: aparece o botão; o gesto de ligar os pontos em ordem
// "assina" o desenho e o spray pinta a arte do artista (os 3 rascunhos até o dono
// mandar os desenhos: app/linha/grafite/grafites/). Vira a arte da missão dos túneis.
//
// Leve: o motor (app/linha/grafite/motor.ts) só existe com o painel aberto e o laço
// dele só roda enquanto há o que animar. Perto/longe é lido 3x por segundo (não por
// quadro). A parede repinta só o pedaço do grafite assinado, uma vez.
//
// Ligar na page.tsx (lote D), junto das trincheiras (só quando elas estão abertas):
//   <GrafiteTrincheiras assinados={save.grafites ?? []} onAssinou={(id) => gravar id no save} />
// (o campo do save é do lote D; GRAFITES e todosAssinados servem pra missão dos túneis)

import { useCallback, useEffect, useRef, useState } from "react"
import { GRAFITES } from "../grafite/grafites"
import { Motor, type Estado } from "../grafite/motor"
import type { Grafite } from "../grafite/tipos"
import { GRAFITES_NA_PAREDE, assinarGrafiteNaParede, definirGrafitesAssinados, grafitePerto } from "../trincheiras/geo"
import { vib } from "../som-carro"
import "../grafite/grafite.css"

export { GRAFITES }
export const grafitePorId = (id: string | null | undefined): Grafite | null => GRAFITES.find((g) => g.id === id) ?? null
// todos os grafites da parede assinados? (a missão dos túneis pode pedir isto)
export const todosAssinados = (ids: readonly string[]) => GRAFITES_NA_PAREDE.every((g) => ids.includes(g.id))

// onde o jogador está nos túneis. Padrão: o __estado que as Trincheiras expõem
// (x, z); quem tiver uma fonte melhor passa `posicao`
type Pos = { x: number; z: number } | null
const posPadrao = (): Pos => {
  try {
    const f = (window as unknown as { __estado?: () => { x: number; z: number } }).__estado
    return f ? f() : null
  } catch { return null }
}

export interface GrafiteProps {
  // os ids já assinados (do save)
  assinados: readonly string[]
  // assinou um (gravar no save)
  onAssinou: (id: string) => void
  // algo por cima (a corrida, uma fala): esconde o botão
  escondido?: boolean
  posicao?: () => Pos
}

export function GrafiteTrincheiras({ assinados, onAssinou, escondido, posicao = posPadrao }: GrafiteProps) {
  const [perto, setPerto] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)

  // a parede mostra o que já foi assinado (a chave em texto: um [] novo a cada render não refaz nada)
  const chave = assinados.join(",")
  useEffect(() => { definirGrafitesAssinados(chave ? chave.split(",") : []) }, [chave])

  // perto de um grafite ainda sem assinatura? (3x por segundo; parado com o painel aberto)
  const posRef = useRef(posicao)
  useEffect(() => { posRef.current = posicao }, [posicao])
  useEffect(() => {
    if (aberto) return
    const ver = () => {
      const p = posRef.current()
      const l = p ? grafitePerto(p.x, p.z) : null
      const id = l?.grafite && !chave.split(",").includes(l.grafite) ? l.grafite : null
      setPerto((a) => (a === id ? a : id))
    }
    ver()
    const i = setInterval(ver, 330)
    return () => clearInterval(i)
  }, [aberto, chave])

  const assinou = useCallback((id: string) => {
    assinarGrafiteNaParede(id)
    vib([20, 30, 40])
    onAssinou(id)
  }, [onAssinou])

  if (aberto) {
    const g = grafitePorId(aberto)
    return g ? <PainelGrafite g={g} onAssinou={assinou} onFechar={() => setAberto(null)} /> : null
  }
  if (escondido || !perto) return null
  const g = grafitePorId(perto)
  if (!g) return null
  return (
    <button type="button" className="gf-botao" data-testid="grafite-botao" onClick={() => setAberto(g.id)}>
      <small>grafite na parede</small>
      <b>assinar · {g.gesto.length} pontos</b>
    </button>
  )
}

// a parede de perto: o gesto (ligar os pontos) e o spray pintando a arte
export function PainelGrafite({ g, onAssinou, onFechar }: { g: Grafite; onAssinou: (id: string) => void; onFechar: () => void }) {
  const parede = useRef<HTMLCanvasElement>(null)
  const brilho = useRef<HTMLCanvasElement>(null)
  const arte = useRef<HTMLCanvasElement>(null)
  const fx = useRef<HTMLCanvasElement>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<Estado>("esperando")
  const fim = useRef(onAssinou)
  useEffect(() => { fim.current = onAssinou }, [onAssinou])

  useEffect(() => {
    const m = new Motor(
      { parede: parede.current!, brilho: brilho.current!, arte: arte.current!, fx: fx.current! },
      { estado: setEstado, completou: (x) => fim.current(x.id) },
    )
    const medir = () => { const r = raiz.current!.getBoundingClientRect(); m.dimensionar(r.width, r.height) }
    const ro = new ResizeObserver(medir)
    ro.observe(raiz.current!)
    medir()
    m.usar(g, false)
    return () => { ro.disconnect(); m.destruir() }
  }, [g])

  // as teclas não vazam pro patins enquanto a parede está aberta
  useEffect(() => {
    const parar = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); e.stopPropagation() }
    window.addEventListener("keydown", parar, true)
    return () => window.removeEventListener("keydown", parar, true)
  }, [onFechar])

  return (
    <div ref={raiz} className="gf-raiz is-mundo" data-estado={estado} data-testid="grafite-painel">
      <canvas ref={parede} />
      <canvas ref={brilho} className="gf-brilho" />
      <canvas ref={arte} />
      <canvas ref={fx} className="gf-fx" aria-label="parede do túnel: ligue os pontos em ordem" />
      <div className="gf-topo">
        <button type="button" className="gf-sair" onClick={onFechar}>← voltar pro túnel</button>
        {g.rascunho && <span className="gf-selo">rascunho · desenho provisório</span>}
      </div>
      <div className="gf-dica">
        {estado === "esperando" && <><b>{g.nome}</b><span>liga os pontos em ordem, do 1 ao {g.gesto.length}</span></>}
        {estado === "ligando" && <span>continua… arrasta até o próximo ponto</span>}
        {estado === "revelando" && <b>assinando…</b>}
        {estado === "pronto" && (
          <>
            <b>{g.nome}</b>
            <span>assinado. fica na parede</span>
            <br /><button type="button" className="gf-de-novo" onClick={onFechar}>voltar pro túnel</button>
          </>
        )}
      </div>
    </div>
  )
}
