"use client"

// OS PALCOS (T20, 28/10): o "cantar · Guitar Driver" da rua virou a carreira do
// Guitar Hero. Em cima, a escada dos palcos (com a proposta ligada, ela é a
// cidade de verdade: a calçada embaixo, o alto das torres em cima); embaixo, o
// menu de músicas do palco escolhido, com as estrelas de cada uma. Nenhum show
// é obrigatório: fechar é sempre um toque. As regras e os números moram em
// disco/palcos.ts (PALCOS_CONFIG, PALCOS_CARREIRA).

import { useEffect, useMemo, useState } from "react"
import type { PistaId } from "../estrada/pistas"
import { COR_PISTA, type HistoriaDisco } from "./historia"
import { MISSOES13, quemLibera } from "./portas"
import { NIVEL_MAX, NOME_ALTURA, PALCOS_CARREIRA, PALCOS_CONFIG, alturaDe, estrelasDoPalco, estrelasTotais, menuDo, nivelDe, nomeDoPalco, travaDo } from "./palcos"

const Estrelas = ({ n }: { n: number }) => <i className="l-palcos-estrelas" aria-label={`${n} de 5 estrelas`}>{"★".repeat(n)}<span>{"★".repeat(5 - n)}</span></i>

export function Palcos({ h, onTocar, onFechar }: { h: HistoriaDisco; onTocar: (palco: string, f: PistaId) => void; onFechar: () => void }) {
  const nivel = nivelDe(h)
  const total = estrelasTotais(h)
  const prox = PALCOS_CARREIRA[nivel] ?? null
  const travaProx = prox ? travaDo(h, prox) : null
  // começa no palco mais alto que está aberto
  const [sel, setSel] = useState(PALCOS_CARREIRA[nivel - 1].id)
  const palco = PALCOS_CARREIRA.find((p) => p.id === sel) ?? PALCOS_CARREIRA[0]
  const menu = useMemo(() => menuDo(h, palco), [h, palco])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar() }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [onFechar])
  const nomeProx = prox ? nomeDoPalco(prox).nome : null
  return (
    <div className="l-rua l-palcos" role="dialog" aria-label="os palcos" onPointerDown={(e) => e.stopPropagation()}>
      <div className="l-rua-caixa l-palcos-caixa" style={{ ["--cor" as string]: palco.cor }}>
        <header>
          <small>Guitar Driver · os palcos</small>
          <b className="l-palcos-nivel">nível {nivel} de {NIVEL_MAX}</b>
          <span className="l-palcos-prox">
            ★ {total}
            {!prox ? " · você chegou no topo" : travaProx?.t === "live" ? ` · ${nomeProx} abre com a missão do LU2CA` : travaProx?.t === "estrelas" ? ` · faltam ${travaProx.faltam} ★ pra ${nomeProx}` : ""}
          </span>
          <button type="button" onClick={onFechar} aria-label="Fechar">×</button>
        </header>
        {/* a escada: o topo em cima. Com a proposta ligada, a altura de cada um na cidade */}
        <ol className={`l-palcos-escada${PALCOS_CONFIG.sobem ? " is-sobe" : ""}`} aria-label="os palcos, da rua ao topo">
          {[...PALCOS_CARREIRA].reverse().map((p) => {
            const tr = travaDo(h, p)
            const { altura, metros } = alturaDe(p)
            const nome = nomeDoPalco(p).nome
            return (
              <li key={p.id} style={{ ["--cor" as string]: p.cor }} className={`${tr.t === "aberto" ? "is-aberto" : "is-fechado"}${p.id === palco.id ? " is-sel" : ""}`}>
                <button type="button" data-palco={p.id} aria-pressed={p.id === palco.id} onClick={() => setSel(p.id)}>
                  <small>{NOME_ALTURA[altura]}{metros ? ` · ${metros} m` : ""}</small>
                  <b>{nome}</b>
                  <em>{tr.t === "aberto" ? <>★ {estrelasDoPalco(h, p.id)} · cachê ×{p.paga}</> : tr.t === "live" ? "abre com a missão do LU2CA" : `faltam ${tr.faltam} ★`}</em>
                </button>
              </li>
            )
          })}
        </ol>
        {/* o menu de músicas do palco escolhido */}
        <section className="l-palcos-menu" aria-label={`o menu ${nomeDoPalco(palco).no}`}>
          <small>o menu · {nomeDoPalco(palco).nome}</small>
          <ul>
            {menu.map((m) => {
              const aberto = travaDo(h, palco).t === "aberto"
              const quem = m.livre ? null : quemLibera(m.faixa)
              return (
                <li key={m.faixa} style={{ ["--cor" as string]: COR_PISTA[m.nome] ?? palco.cor }} className={m.livre && aberto ? "" : "is-fechada"}>
                  {m.livre && aberto ? (
                    <button type="button" data-faixa={m.faixa} onClick={() => onTocar(palco.id, m.faixa)}><b>{m.nome}</b><small><Estrelas n={m.estrelas} /> · cantar ou tocar · 22 s</small></button>
                  ) : (
                    <span><b>{m.nome}</b><small>{!aberto ? "o palco ainda está fechado" : quem ? `abre na missão de ${MISSOES13[quem].quem}` : "em breve"}</small></span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
