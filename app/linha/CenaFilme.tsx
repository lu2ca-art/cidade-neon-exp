"use client"

// (T22b) O FILMINHO dentro de uma cena (o gancho: estrada/ganchoCena.ts).
//
// Com o vídeo (Filme.video, T70): toca o arquivo por cima de tudo e, quando
// acaba, a cena segue. Sem o vídeo (hoje), o PROVISÓRIO: a cena 3D fica parada
// atrás (a sala põe a câmera chegando devagar no assunto) e as falas aparecem
// em legenda de cinema, cada uma no seu tempo (Filme.falas[].seg). Tocar na
// tela passa pra próxima fala (quem já viu não precisa esperar). Se o vídeo
// não carregar, cai no provisório.
//
// Barato: nada em 3D aqui, só um timer e um <p>.

import { useEffect, useRef, useState } from "react"
import { atalhosLiberados } from "../teste/atalhos"
import { pedirCena, type Filme } from "./estrada/ganchoCena"
import { VOZES } from "./roteiros"
import { fazerMusica } from "./som"

export function CenaFilme({ filme, onFim }: { filme: Filme; onFim: () => void }) {
  const [semVideo, setSemVideo] = useState(!filme.video)
  // -1: a abertura (só imagem); 0..n-1: as falas; n: o fecho (só imagem)
  const [i, setI] = useState(-1)
  const acabou = useRef(false)
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })
  const terminar = () => { if (acabou.current) return; acabou.current = true; fimRef.current() }
  const n = filme.falas.length
  const seguir = () => { if (i >= n) terminar(); else setI(i + 1) }

  // pede a cena no gancho (o T70 escuta; os testes conferem)
  useEffect(() => { pedirCena({ tipo: "filme", id: filme.id, video: !!filme.video }) }, [filme.id, filme.video])

  // (revisão 3) o vídeo com som: a música do jogo (a rádio, o disco, a faixa da rua) some
  // em fade e pausa, como no fazer música; acabou (ou o vídeo falhou), volta de onde estava
  const comSom = !semVideo && !!filme.video && !filme.semSom
  useEffect(() => {
    if (!comSom) return
    fazerMusica(true)
    return () => fazerMusica(false)
  }, [comSom])

  // o provisório: cada fala no seu tempo
  useEffect(() => {
    if (!semVideo) return
    const seg = i < 0 ? filme.abertura : i < n ? filme.falas[i].seg : filme.fecho
    const t = setTimeout(() => { if (i >= n) terminar(); else setI((x) => x + 1) }, seg * 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, semVideo])

  // atalho de teste (só fora da produção): __pularFilme() acaba o filme
  useEffect(() => {
    if (!atalhosLiberados()) return
    const w = window as unknown as Record<string, unknown>
    w.__pularFilme = () => terminar()
    return () => { delete w.__pularFilme }
  }, [])

  if (!semVideo && filme.video) return (
    <div className="l-filme is-video" onClick={(e) => { e.stopPropagation(); terminar() }}>
      <video src={filme.video} poster={filme.poster} autoPlay playsInline preload="auto" onEnded={terminar} onError={() => setSemVideo(true)} />
      <small className="l-filme-pular">toca pra pular</small>
    </div>
  )
  const fala = i >= 0 && i < n ? filme.falas[i] : null
  return (
    <div className="l-filme" data-fala={i} onClick={(e) => { e.stopPropagation(); seguir() }}>
      {fala && (
        <p key={i} className={`l-filme-fala is-${fala.tipo ?? "fala"}`} style={{ ["--cor" as string]: (fala.de && VOZES[fala.de]) || "#e6f0ff" }}>
          {fala.de && <small>{fala.de}</small>}
          {fala.texto}
        </p>
      )}
      <i className="l-filme-barra" style={{ width: `${Math.max(0, Math.min(1, (i + 1) / (n + 1))) * 100}%` }} />
    </div>
  )
}
