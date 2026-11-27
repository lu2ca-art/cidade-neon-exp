"use client"

// KOMBEAT STUDIO (14/11, o dono): a Kombi vira estúdio. O widget da batida chama
// isto: a câmera vai pra dentro, de frente pro fundo da Kombi, e o piloto
// automático liga sozinho (quem decide é a Corrida). Sentado lá atrás, três
// coisas: escolher um disco (a estante que já existe), fazer um beat (o B4TIDA,
// com os instrumentos da Kombi como sample) ou tocar um instrumento. Tudo
// conversa: os timbres que tocam aqui são os mesmos que o beat sampleia.
// Na Kombi cabem 4 instrumentos (portas.ts naKombi): pegar o 5º derruba o 1º.

import { useEffect, useState, useSyncExternalStore } from "react"
import { fazerMusica } from "../som"
import { INSTRUMENTOS_ANCESTRAIS, tocarInstrumento, type InstrumentoId } from "../disco/instrumentos"
import { naKombiAgora, ouvirNaKombi } from "../disco/instrumentosMundo"
import { KOMBI_CABE } from "../disco/portas"
import "./kombeat.css"

export type ModoEstudio = "menu" | "instrumento" | "beat"
// a cena 3D (CenaBase) lê isto a cada quadro: com o estúdio aberto o olhar não volta
// sozinho pra frente; `pedido` vira o olhar (pro fundo ao entrar, pra frente ao sair)
export const OLHAR_ESTUDIO: { ativo: boolean; pedido: { yaw: number; pitch: number } | null } = { ativo: false, pedido: null }
const VAZIO: readonly InstrumentoId[] = []

export function KombeatStudio({ modo, onModo, onDiscos, onSair }: {
  modo: ModoEstudio
  onModo: (m: ModoEstudio) => void
  onDiscos: () => void
  onSair: () => void
}) {
  const ids = useSyncExternalStore(ouvirNaKombi, naKombiAgora, () => VAZIO)
  const parar = (e: React.PointerEvent | React.KeyboardEvent) => e.stopPropagation()
  return (
    <>
      {modo === "menu" && (
        <section className="l-kombeat" role="dialog" aria-label="KOMBEAT STUDIO" onPointerDown={parar}>
          <header>
            <b>KOMBEAT STUDIO</b>
            <small>no piloto · lá atrás</small>
            <button type="button" className="l-kombeat-sair" onClick={onSair} aria-label="sair do estúdio">✕</button>
          </header>
          <div className="l-kombeat-opcoes">
            <button type="button" onClick={onDiscos}><IconeDisco /><span>um disco</span></button>
            <button type="button" onClick={() => onModo("beat")}><IconeBeat /><span>um beat</span></button>
            <button type="button" onClick={() => onModo("instrumento")} disabled={!ids.length} title={ids.length ? undefined : "ache um instrumento pelo mundo"}><IconeInstrumento /><span>um instrumento</span></button>
          </div>
          <p className="l-kombeat-kombi">{ids.length ? `na Kombi (${ids.length}/${KOMBI_CABE}): ${ids.map((i) => INSTRUMENTOS_ANCESTRAIS[i].nome).join(" · ")}` : `cabem ${KOMBI_CABE} instrumentos aqui. nenhum ainda`}</p>
        </section>
      )}
      {modo === "instrumento" && <Instrumentos ids={ids} onVoltar={() => onModo("menu")} />}
      {modo === "beat" && <Beat ids={ids} onVoltar={() => onModo("menu")} />}
    </>
  )
}

// ── tocar: os 4 da Kombi; escolhe um, as notas dele viram pads (ou as teclas 1–8) ──
function Instrumentos({ ids, onVoltar }: { ids: readonly InstrumentoId[]; onVoltar: () => void }) {
  const [sel, setSel] = useState<InstrumentoId | null>(ids[0] ?? null)
  const [bateu, setBateu] = useState<number | null>(null)
  const x = sel ? INSTRUMENTOS_ANCESTRAIS[sel] : null
  useEffect(() => {
    fazerMusica(true)
    return () => fazerMusica(false)
  }, [])
  useEffect(() => {
    if (!sel) return
    const n = INSTRUMENTOS_ANCESTRAIS[sel].notas.length
    const k = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1
      if (i >= 0 && i < Math.min(8, n)) { e.stopPropagation(); tocarInstrumento(sel, i); setBateu(i) }
    }
    window.addEventListener("keydown", k, true)
    return () => window.removeEventListener("keydown", k, true)
  }, [sel])
  return (
    <section className="l-kombeat is-tocar" role="dialog" aria-label="tocar um instrumento" style={x ? { ["--cor" as string]: x.cor } : undefined} onPointerDown={(e) => e.stopPropagation()}>
      <header>
        <b>{x ? x.nome : "tocar"}</b>
        <small>{x ? x.origem : ""}</small>
        <button type="button" className="l-kombeat-sair" onClick={onVoltar} aria-label="voltar pro menu do estúdio">←</button>
      </header>
      <div className="l-kombeat-inst" role="tablist">
        {ids.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={sel === id} className={sel === id ? "is-sel" : ""} style={{ ["--c" as string]: INSTRUMENTOS_ANCESTRAIS[id].cor }} onClick={() => setSel(id)}>
            {INSTRUMENTOS_ANCESTRAIS[id].nome}
          </button>
        ))}
      </div>
      {x && sel && (
        <div className="l-kombeat-pads">
          {x.notas.slice(0, 8).map((_, i) => (
            <button key={i} type="button" className={bateu === i ? "is-bate" : ""} aria-label={`nota ${i + 1}`}
              onPointerDown={(e) => { e.stopPropagation(); tocarInstrumento(sel, i); setBateu(i) }}
              onAnimationEnd={() => setBateu(null)}>
              <span>{i + 1}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

// ── o beat: o B4TIDA embaixo (a rua continua em cima), com os instrumentos da Kombi como som ──
function Beat({ ids, onVoltar }: { ids: readonly InstrumentoId[]; onVoltar: () => void }) {
  const [carregou, setCarregou] = useState(false)
  useEffect(() => {
    fazerMusica(true)
    return () => fazerMusica(false)
  }, [])
  const kombi = ids.join(",")
  return (
    <section className="l-batida-missao is-caminho" style={{ ["--cor" as string]: "#ff6b6b" }} role="dialog" aria-label="KOMBEAT STUDIO: fazer um beat" onPointerDown={(e) => e.stopPropagation()}>
      <header>
        <div>
          <small>KOMBEAT STUDIO · o beat</small>
          <b>no piloto, lá atrás</b>
          <span><i>{ids.length ? `os instrumentos da Kombi estão nos sons (anc): ${ids.map((i) => INSTRUMENTOS_ANCESTRAIS[i].nome).join(", ")}` : "ache instrumentos pelo mundo: eles viram som aqui"}</i></span>
        </div>
        <button type="button" onClick={onVoltar} data-voltar>voltar</button>
      </header>
      {!carregou && <p className="l-batida-carrega">abrindo o B4TIDA…</p>}
      <iframe src={`/batida?embedded=1${kombi ? `&kombi=${encodeURIComponent(kombi)}` : ""}`} title="B4TIDA" allow="autoplay; microphone" onLoad={() => setCarregou(true)} />
    </section>
  )
}

// ── os ícones (uma linha cada, cor do texto) ──
function IconeDisco() {
  return <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="2.4" fill="currentColor" /><path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" /></svg>
}
function IconeBeat() {
  return <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">{[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={3 + c * 6.5} y={3 + r * 6.5} width="5" height="5" rx="1.2" fill="currentColor" opacity={(r + c) % 2 ? 0.45 : 1} />))}</svg>
}
function IconeInstrumento() {
  return <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21c-2.2 0-3.5-1.6-3-3.6.4-1.7 2-2.4 2.8-3.6.9-1.3.5-3 1.7-4 1.4-1.1 3.4-.5 4.3.9.9 1.4.4 3.4-.9 4.3-1.2.8-2.6.5-3.4 1.6-.9 1.2-.2 2.8-1.5 4.4M12.5 9.5 20 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><circle cx="8.6" cy="15.4" r="1.2" fill="currentColor" /></svg>
}
