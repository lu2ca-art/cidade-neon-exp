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
import type { Grafite, TagLivre } from "../grafite/tipos"
import { GRAFITES_NA_PAREDE, assinarGrafiteNaParede, definirGrafitesAssinados, definirTagLivre, grafitePerto, paredeLivrePerto, paredesLivres, type LugarGrafite } from "../trincheiras/geo"
import { FOV_PAREDE, PAREDE_ABERTA, definirParedes } from "../trincheiras/atlasParedes"
import { CORES_PAREDE, LARGURA_SPRAY, LARG_PAREDE, ALT_PAREDE, MAX_PTS, MAX_TRACOS, codificar, decodificar, riscar } from "../grafite/paredes"
import { Cadeado, Trancado } from "../Trancado"
import { vib } from "../som-carro"
import { assinou as somAssinou } from "../grafite/spray"
import "../grafite/grafite.css"

export { GRAFITES }
export const grafitePorId = (id: string | null | undefined): Grafite | null => GRAFITES.find((g) => g.id === id) ?? null
// todos os grafites da parede assinados? (a missão dos túneis pode pedir isto)
export const todosAssinados = (ids: readonly string[]) => GRAFITES_NA_PAREDE.every((g) => ids.includes(g.id))

// onde o jogador está nos túneis. Padrão: o __estado que as Trincheiras expõem
// (x, z); quem tiver uma fonte melhor passa `posicao`
type Pos = { x: number; z: number; fase?: string } | null
const posPadrao = (): Pos => {
  try {
    const f = (window as unknown as { __estado?: () => Pos }).__estado
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
  // (08/11) o grafite LIVRE: até 8 paredes (trincheiras/geo.ts, paredesLivres), depois da
  // missão dos túneis; cada uma guarda o seu desenho (grafite/paredes.ts, o texto do save)
  paredes?: readonly string[]
  onParede?: (i: number, desenho: string) => void
  // a tag única de antes (T64): continua aparecendo nas paredes ainda sem desenho
  tag?: TagLivre | null
  // liberado? (a missão dos túneis feita ou os 3 assinados); senão, o cadeado e `trancaLivre`
  livre?: boolean
  trancaLivre?: string
}

export function GrafiteTrincheiras({ assinados, onAssinou, escondido, posicao = posPadrao, paredes, onParede, tag = null, livre = false, trancaLivre }: GrafiteProps) {
  const [perto, setPerto] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  // (08/11) a parede livre perto (-1 = nenhuma) / a que está sendo pintada / o aviso do cadeado
  const [paredePerto, setParedePerto] = useState(-1)
  const [pintando, setPintando] = useState(-1)
  const [aviso, setAviso] = useState(false)
  useEffect(() => { definirTagLivre(tag) }, [tag])
  // o atlas das paredes (repinta só o que mudou; a chave em texto segura um [] novo a cada render)
  const chaveParedes = (paredes ?? []).join("|")
  useEffect(() => {
    definirParedes({ desenhos: chaveParedes.split("|"), tag, livre, tranca: trancaLivre ?? "faça a missão dos túneis" })
  }, [chaveParedes, tag, livre, trancaLivre])
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(false), 3500); return () => clearTimeout(t) }, [aviso])

  // a parede mostra o que já foi assinado (a chave em texto: um [] novo a cada render não refaz nada)
  const chave = assinados.join(",")
  useEffect(() => { definirGrafitesAssinados(chave ? chave.split(",") : []) }, [chave])

  // perto de um grafite ainda sem assinatura? (3x por segundo; parado com o painel aberto)
  const posRef = useRef(posicao)
  useEffect(() => { posRef.current = posicao }, [posicao])
  const comParedes = !!onParede
  useEffect(() => {
    if (aberto || pintando >= 0) return
    const ver = () => {
      const p = posRef.current()
      const l = p ? grafitePerto(p.x, p.z) : null
      const id = l?.grafite && !chave.split(",").includes(l.grafite) ? l.grafite : null
      setPerto((a) => (a === id ? a : id))
      // na corrida não se para pra pintar
      const t = !id && comParedes && p && (!p.fase || p.fase === "livre") ? paredeLivrePerto(p.x, p.z) : -1
      setParedePerto((a) => (a === t ? a : t))
    }
    ver()
    const i = setInterval(ver, 330)
    return () => clearInterval(i)
  }, [aberto, pintando, chave, comParedes])

  const assinou = useCallback((id: string) => {
    assinarGrafiteNaParede(id)
    vib([20, 30, 40])
    onAssinou(id)
  }, [onAssinou])

  if (aberto) {
    const g = grafitePorId(aberto)
    return g ? <PainelGrafite g={g} onAssinou={assinou} onFechar={() => setAberto(null)} /> : null
  }
  const desenhos = chaveParedes ? chaveParedes.split("|") : []
  if (pintando >= 0 && onParede) {
    return <PainelParede parede={paredesLivres()[pintando]} inicial={decodificar(desenhos[pintando])}
      onPronto={(t) => { onParede(pintando, codificar(t)); vib([20, 30, 40]); setPintando(-1) }} onFechar={() => setPintando(-1)} />
  }
  if (escondido) return null
  if (!perto && paredePerto >= 0) {
    // o grafite livre: liberado, a câmera vai até a parede; trancado, o cadeado e o que libera
    const pintada = !!desenhos[paredePerto]
    return (
      <>
        <button type="button" className={`gf-botao${livre ? "" : " is-trancado"}`} data-testid="grafite-livre" onClick={() => (livre ? setPintando(paredePerto) : setAviso((a) => !a))}>
          <small>{livre ? `parede livre ${paredePerto + 1} de ${paredesLivres().length}` : <><Cadeado size={9} /> parede livre</>}</small>
          <b>{livre ? (pintada ? "repintar esta parede" : "pintar esta parede") : "grafite livre"}</b>
        </button>
        {aviso && !livre && trancaLivre && <div className="gf-aviso"><Trancado texto={trancaLivre} /></div>}
      </>
    )
  }
  if (!perto) return null
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

// (08/11) O GRAFITE LIVRE: a câmera vai até a parede (o jogo continua aparecendo em
// volta, sem tela preta) e o retângulo daqui fica exatamente em cima dela. O dedo é
// o spray. Nada por quadro: cada movimento pinta só o pedacinho novo, direto no
// canvas; o atlas só muda ao terminar. Repintar começa do desenho daquela parede.
export function PainelParede({ parede, inicial, onPronto, onFechar }: { parede: LugarGrafite; inicial: TagLivre | null; onPronto: (t: TagLivre) => void; onFechar: () => void }) {
  const raiz = useRef<HTMLDivElement>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const tracos = useRef<TagLivre["tracos"]>(inicial ? inicial.tracos.map((t) => ({ cor: t.cor, pts: [...t.pts] })) : [])
  const total = useRef(tracos.current.reduce((a, t) => a + t.pts.length / 2, 0))
  const atual = useRef<{ cor: string; pts: number[] } | null>(null)
  const [cor, setCor] = useState(CORES_PAREDE[0])
  const [vazio, setVazio] = useState(!tracos.current.length)
  const [cheio, setCheio] = useState(false)

  const escala = () => { const c = cv.current!; return { c, g: c.getContext("2d")!, k: c.width / LARG_PAREDE } }
  const redesenhar = useCallback(() => {
    const { c, g, k } = escala()
    g.clearRect(0, 0, c.width, c.height)
    for (const t of tracos.current) riscar(g, t.pts, t.cor, 0, 0, k, LARGURA_SPRAY * k)
  }, [])
  // a câmera vai pra frente da parede; a distância faz a parede encher o retângulo do painel
  useEffect(() => {
    PAREDE_ABERTA.l = parede
    document.body.classList.add("gf-pintando")
    return () => { PAREDE_ABERTA.l = null; document.body.classList.remove("gf-pintando") }
  }, [parede])
  useEffect(() => {
    const c = cv.current!
    const medir = () => {
      const r = c.getBoundingClientRect(), tela = raiz.current!.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1)
      c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); redesenhar()
      if (r.width > 0 && tela.height > 0) PAREDE_ABERTA.d = parede.w / (2 * Math.tan((FOV_PAREDE * Math.PI) / 360) * (tela.width / tela.height) * (r.width / tela.width))
    }
    const ro = new ResizeObserver(medir)
    ro.observe(c)
    medir()
    return () => ro.disconnect()
  }, [redesenhar, parede])
  // as teclas não vazam pro patins
  useEffect(() => {
    const parar = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); e.stopPropagation() }
    window.addEventListener("keydown", parar, true)
    return () => window.removeEventListener("keydown", parar, true)
  }, [onFechar])

  const ponto = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect()
    return [Math.max(0, Math.min(LARG_PAREDE - 1, Math.round(((e.clientX - r.left) / r.width) * LARG_PAREDE))), Math.max(0, Math.min(ALT_PAREDE - 1, Math.round(((e.clientY - r.top) / r.height) * ALT_PAREDE)))]
  }
  const baixo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (total.current >= MAX_PTS || tracos.current.length >= MAX_TRACOS) { setCheio(true); return }
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = ponto(e)
    const t = { cor, pts: [x, y] }
    atual.current = t
    tracos.current.push(t)
    total.current++
    const { g, k } = escala()
    riscar(g, t.pts, cor, 0, 0, k, LARGURA_SPRAY * k)
    setVazio(false)
    vib(6)
  }
  const mexe = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const t = atual.current
    if (!t) return
    if (total.current >= MAX_PTS) { atual.current = null; setCheio(true); return }
    const [x, y] = ponto(e), n = t.pts.length
    const px = t.pts[n - 2], py = t.pts[n - 1]
    if (Math.abs(x - px) + Math.abs(y - py) < 2) return
    t.pts.push(x, y)
    total.current++
    const { g, k } = escala()
    riscar(g, [px, py, x, y], t.cor, 0, 0, k, LARGURA_SPRAY * k)
  }
  const solta = () => { atual.current = null }
  const apagar = () => { tracos.current = []; total.current = 0; setVazio(true); setCheio(false); redesenhar() }

  return (
    <div ref={raiz} className="gf-raiz is-mundo gf-tag" data-testid="grafite-livre-painel">
      <div className="gf-topo">
        <button type="button" className="gf-sair" onClick={onFechar}>← voltar pro túnel</button>
        <span className="gf-tag-dica">{cheio ? "a parede encheu" : "o dedo é o spray"}</span>
      </div>
      <canvas ref={cv} className="gf-tag-parede" aria-label="parede livre: faça o seu desenho"
        onPointerDown={baixo} onPointerMove={mexe} onPointerUp={solta} onPointerCancel={solta} />
      <div className="gf-tag-barra">
        {CORES_PAREDE.map((c) => (
          <button key={c} type="button" className={`gf-tag-cor${c === cor ? " is-on" : ""}`} style={{ background: c }} aria-label={`cor ${c}`} onClick={() => setCor(c)} />
        ))}
        <button type="button" className="gf-tag-bt" onClick={apagar}>apagar</button>
        <button type="button" className="gf-tag-bt is-pronto" disabled={vazio} onClick={() => { somAssinou(); onPronto({ tracos: tracos.current.filter((t) => t.pts.length) }) }}>pintar na parede</button>
      </div>
    </div>
  )
}
