"use client"

// A PÁGINA INICIAL DO DISCO (LU2CA 19/10: "uma página inicial mais
// gamificada, sem a foto da capa do álbum"). O título, o disco girando com as
// 9 linhas (acesas as feitas e as abertas, apagadas as que ainda não), os 3
// atos com os monumentos, as três moedas (água, neon$, popularidade: "rico do
// quê?") e o entrar. Embaixo: a qualidade do aparelho (medir de novo) e o
// começar do zero.

import { useEffect, useState } from "react"
import type { Save } from "../estado"
import { recomecar } from "../estado"
import { TORRES } from "../estrada/atos"
import { luzDosEpisodios } from "./episodios"
import { NOME_NIVEL, QUALIDADE, refazerQualidade } from "../estrada/qualidade"
import { COR_PISTA, MONUMENTO, historiaDe } from "./historia"

const ORDEM = ["Nectar", "DopaminA", "Copo Americano", "Ojalá", "Swav", "Sexta-Feira", "Sabe Ontem?", "Rollercoaster", "CHUVA"]

export function InicioDisco({ save, onEntrar }: { save: Save; onEntrar: () => void }) {
  const h = historiaDe(save)
  const novo = h.fase === "minhoca"
  const luz = luzDosEpisodios(h, save.objetos)
  const [certeza, setCerteza] = useState(false)
  useEffect(() => { if (!certeza) return; const t = setTimeout(() => setCerteza(false), 4000); return () => clearTimeout(t) }, [certeza])
  // (a página só monta no cliente, depois de ler o save)
  const [qual, setQual] = useState<string | null>(() => (QUALIDADE.medido ? NOME_NIVEL[QUALIDADE.nivel] : null))
  const pop = Math.round(save.popularidade ?? 0)
  return (
    <section className="l-inicio-disco">
      <div className="l-inicio-ceu" aria-hidden="true" />
      {/* o disco: 9 sulcos, um por linha, na ordem do Vol.1 */}
      <div className="l-inicio-disco-vinil" aria-hidden="true">
        {ORDEM.map((nome, i) => (
          <i key={nome} className={`is-${luz[nome] ?? "apagada"}`} style={{ ["--c" as string]: COR_PISTA[nome], ["--r" as string]: `${96 - i * 7.2}%` }} />
        ))}
        <b />
      </div>
      <div className="l-inicio-conteudo">
        <p className="l-rotulo">lu2ca · vol.1 · o disco</p>
        <h1 className="l-titulo"><span>cidade</span><span>neon</span></h1>
        <button type="button" className="l-btn l-btn-entrar" onClick={onEntrar}>{novo ? "entrar" : "continuar"}</button>
        {!novo && (
          <>
            <div className="l-inicio-moedas" aria-label="rico do quê?">
              <span className="is-agua"><i aria-hidden="true" /><b>{save.agua ?? 0}</b><small>água</small></span>
              <span className="is-neon"><i aria-hidden="true">$</i><b>{save.neon ?? 0}</b><small>neon$</small></span>
              <span className="is-pop"><i aria-hidden="true" style={{ ["--p" as string]: `${pop}%` }} /><b>{pop}</b><small>popularidade</small></span>
            </div>
            <ol className="l-inicio-atos">
              {/* (21/10 (5)) o progresso por torre: as missões acendem espalhadas */}
              {TORRES.map((linhas, k) => {
                const feitas = linhas.filter((n) => luz[n] === "feita").length
                return (
                  <li key={linhas[0]} className={feitas === 3 ? "is-completo" : linhas.some((n) => luz[n] !== "apagada") ? "is-aberto" : ""}>
                    <small>torre {k + 1} · {MONUMENTO[k]}</small>
                    <span className="l-inicio-linhas">
                      {linhas.map((n) => <i key={n} className={`is-${luz[n] ?? "apagada"}`} style={{ ["--c" as string]: COR_PISTA[n] }} title={n} />)}
                    </span>
                    <b>{feitas}/3</b>
                  </li>
                )
              })}
            </ol>
          </>
        )}
        <p className="l-entrada-nota">melhor com fone 🎧</p>
        <div className="l-inicio-rodape">
          <button type="button" onClick={() => { refazerQualidade(); setQual(null) }}>{qual ? `gráficos: ${qual} · medir de novo` : "gráficos: medidos na próxima partida"}</button>
          {!novo && <button type="button" className={certeza ? "is-certeza" : ""} onClick={() => (certeza ? recomecar() : setCerteza(true))}>{certeza ? "apaga tudo. toca de novo pra confirmar" : "começar do zero"}</button>}
        </div>
      </div>
    </section>
  )
}
