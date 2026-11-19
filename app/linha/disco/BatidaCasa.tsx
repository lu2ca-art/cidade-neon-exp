"use client"

// O B4TIDA ABERTO DA CASA DA D-BEE (bíblia §13, 09/11): sampleou um instrumento no
// sampler dela, o estúdio abre por cima do jogo (o mesmo /batida, como na missão do
// Alohan), já com uma faixa desse som na música "samples da D-Bee". Sem tocar na
// música do jogador. A trilha fica parada enquanto faz música (bíblia §9).

import { useEffect, useState } from "react"
import { fazerMusica } from "../som"
import { INSTRUMENTOS_ANCESTRAIS, type InstrumentoId } from "./instrumentos"

export function BatidaCasa({ id, onFim }: { id: InstrumentoId; onFim: () => void }) {
  const [carregou, setCarregou] = useState(false)
  useEffect(() => {
    fazerMusica(true)
    return () => fazerMusica(false)
  }, [])
  const x = INSTRUMENTOS_ANCESTRAIS[id]
  return (
    <section className="l-batida-missao" style={{ ["--cor" as string]: x.cor }} role="dialog" aria-label={`B4TIDA: sample ${x.artigo === "a" ? "da" : "do"} ${x.nome}`} onPointerDown={(e) => e.stopPropagation()}>
      <header>
        <div>
          <small>casa da D-Bee · o sampler</small>
          <b>{x.artigo} {x.nome} entrou na batida</b>
          <span><i>agora é uma faixa da música “samples da D-Bee”</i></span>
        </div>
        <button type="button" onClick={onFim} data-voltar>voltar</button>
      </header>
      {!carregou && <p className="l-batida-carrega">abrindo o B4TIDA…</p>}
      <iframe src={`/batida?sample=${encodeURIComponent(id)}&embedded=1`} title="B4TIDA" allow="autoplay; microphone" onLoad={() => setCarregou(true)} />
    </section>
  )
}
