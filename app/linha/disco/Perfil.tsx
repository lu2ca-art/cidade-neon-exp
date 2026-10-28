"use client"

// O PERFIL NO HOLO (LU2CA 20/10: "rico do quê?"): as três moedas, que são os
// três atributos do personagem, e o que cada uma compra. Tocar na água abre.

import { MODS, PALCOS_POP } from "./moedas"

export function Perfil({ agua, neon, pop, mods, onFechar }: { agua: number; neon: number; pop: number; mods: string[]; onFechar: () => void }) {
  return (
    <div className="l-perfil" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label="rico do quê?">
      <header><b>rico do quê?</b><button type="button" onClick={onFechar} aria-label="fechar">×</button></header>
      <section className="is-agua">
        <span><i aria-hidden="true" /><b>{agua}</b><small>água</small></span>
        <p>paga o mecânico: só desempenho da Kombi</p>
        <ul>{MODS.map((m) => <li key={m.id} className={mods.includes(m.id) ? "is-tem" : ""}>{m.nome}<em>{mods.includes(m.id) ? "✓" : `${m.preco} água`}</em></li>)}</ul>
      </section>
      <section className="is-neon">
        <span><i aria-hidden="true">$</i><b>{neon}</b><small>neon$</small></span>
        <p>a grana dos shows e das missões: discos, instrumentos, carros, roupas</p>
      </section>
      <section className="is-pop">
        <span><i aria-hidden="true" style={{ ["--p" as string]: `${Math.min(100, pop)}%` }} /><b>{Math.round(pop)}</b><small>popularidade</small></span>
        <p>o que não tem preço</p>
        <ul>{PALCOS_POP.map((p) => <li key={p.nome} className={pop >= p.pop ? "is-tem" : ""}>{p.nome}<em>{pop >= p.pop ? "aberto" : `${p.pop}`}</em></li>)}</ul>
      </section>
    </div>
  )
}

// A OFICINA (o que se compra com água). A pintura e o neon (a oficina de
// antes, /oficina) continuam lá dentro
export function OficinaLoja({ agua, mods, onComprar, onPintura, onFechar }: { agua: number; mods: string[]; onComprar: (id: string, preco: number) => void; onPintura: () => void; onFechar: () => void }) {
  return (
    <div className="l-perfil is-oficina" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label="a oficina">
      <header><b>a oficina</b><button type="button" onClick={onFechar} aria-label="fechar">×</button></header>
      <section className="is-agua">
        <span><i aria-hidden="true" /><b>{agua}</b><small>água</small></span>
        <ul>
          {MODS.map((m) => {
            const tem = mods.includes(m.id)
            return (
              <li key={m.id} className={tem ? "is-tem" : ""}>
                <span>{m.nome}<small>{m.faz}</small></span>
                {tem ? <em>✓</em> : <button type="button" disabled={agua < m.preco} onClick={() => onComprar(m.id, m.preco)}>{m.preco} água</button>}
              </li>
            )
          })}
        </ul>
      </section>
      <button type="button" className="l-perfil-pintura" onClick={onPintura}>pintura e neon →</button>
    </div>
  )
}
