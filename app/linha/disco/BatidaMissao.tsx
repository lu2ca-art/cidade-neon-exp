"use client"

// A ARTE DA QUADRA (T10, 28/10): o Alohan apresenta o B4TIDA. O estúdio abre
// por cima do jogo (o mesmo /batida, dentro de uma janela), já com uma música
// que soa (o clima da faixa dele, "Sabe Ontem?"). O jogador toca, mexe no que
// quiser (muda uma batida, liga ou desliga uma faixa, troca um som) e entrega
// o instrumental pra galera. O estúdio avisa o jogo (postMessage) se já tocou
// e se já mexeu; só então o botão "entregar" acende. A música fica guardada no
// B4TIDA (é o primeiro beat do jogador). Os textos são RASCUNHO (o LU2CA reescreve).

import { useEffect, useRef, useState } from "react"
import type { Musica } from "../../batida/estudio/tipos"
import { fazerMusica } from "../som"
import { tocarBeat } from "./beatDoCaminho"

// (ep. 3, 08/11) `caminho`: aberto no meio da viagem, com o piloto levando (o estúdio
// não cobre a rua). Ao entregar, a música fica tocando até o fim da missão: chega no
// ginásio ouvindo o beat (disco/beatDoCaminho.ts)
export function BatidaMissao({ cor, quem, clima, caminho = false, onFim }: { cor: string; quem: string; clima: string; caminho?: boolean; onFim: () => void }) {
  const [p, setP] = useState({ tocou: false, mexeu: false, faixas: 0 })
  const [carregou, setCarregou] = useState(false)
  const [mixando, setMixando] = useState(false)
  const iframe = useRef<HTMLIFrameElement>(null)
  // pede a música pro estúdio (no máximo 3 s) e deixa ela tocando; sem ela, o jogo segue do mesmo jeito
  const entregar = async () => {
    if (mixando) return
    setMixando(true)
    const musica = await new Promise<Musica | null>((res) => {
      const t = setTimeout(() => { window.removeEventListener("message", ouvir); res(null) }, 3000)
      const ouvir = (e: MessageEvent) => {
        if (e.origin !== window.location.origin || e.data?.cn !== "batida-missao-musica") return
        clearTimeout(t); window.removeEventListener("message", ouvir); res((e.data.musica as Musica) ?? null)
      }
      window.addEventListener("message", ouvir)
      iframe.current?.contentWindow?.postMessage({ cn: "batida-missao-pedir" }, window.location.origin)
    })
    if (musica) await tocarBeat(musica)
    onFim()
  }
  useEffect(() => {
    fazerMusica(true)
    return () => fazerMusica(false)
  }, [])
  useEffect(() => {
    const ouvir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.cn !== "batida-missao") return
      setP({ tocou: !!e.data.tocou, mexeu: !!e.data.mexeu, faixas: Number(e.data.faixas) || 0 })
    }
    window.addEventListener("message", ouvir)
    return () => window.removeEventListener("message", ouvir)
  }, [])
  const pronto = p.tocou && p.mexeu
  return (
    <section className={`l-batida-missao${caminho ? " is-caminho" : ""}`} style={{ ["--cor" as string]: cor }} role="dialog" aria-label={`a missão de ${quem}: o B4TIDA`} onPointerDown={(e) => e.stopPropagation()}>
      <header>
        <div>
          <small>{quem} · a arte</small>
          <b>{caminho ? "faz o beat no caminho do ginásio" : "faz um instrumental pra galera do ginásio"}</b>
          <span>
            <i className={p.tocou ? "is-ok" : ""}>{p.tocou ? "✓" : "1"} toca a música</i>
            <i className={p.mexeu ? "is-ok" : ""}>{p.mexeu ? "✓" : "2"} mexe nela: muda uma batida, uma faixa, um som</i>
          </span>
        </div>
        <button type="button" disabled={!pronto || mixando} onClick={() => void entregar()} data-entregar>{mixando ? "mixando…" : pronto ? "entregar pra galera →" : "entregar"}</button>
      </header>
      {!carregou && <p className="l-batida-carrega">abrindo o B4TIDA…</p>}
      <iframe ref={iframe} src={`/batida?missao=1&clima=${encodeURIComponent(clima)}&embedded=1`} title="B4TIDA" allow="autoplay; microphone" onLoad={() => setCarregou(true)} />
    </section>
  )
}
