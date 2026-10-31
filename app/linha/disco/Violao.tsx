"use client"

// O VIOLÃO NO MUNDO (T64, a partir de /teste/violao do branch t08-violao).
// Quando o toca-discos ou a rádio estão tocando, aparece o botão do violão; ele
// abre o braço com as notas e os acordes NO TOM DA FAIXA que está tocando (a
// tabela tons.ts quando a faixa é conhecida; senão o detector ao vivo do som.ts;
// sem nada, Ré menor). Pentatônica: qualquer nota acesa soa bem, ninguém erra.
// Só aparece com o violão no save (save.violao).
//
// Leve: nada por quadro. O botão ouve os eventos do disco e do player (play,
// pause); o tom só é relido 1x por segundo e só com o painel aberto. As notas
// são aquecidas (o Karplus-Strong) em pedacinhos quando o painel abre, pra o
// toque nunca pagar o cálculo.
//
// Ligar na page.tsx (lote D):
//   <Violao temViolao={save.violao} escondido={algoAbertoPorCima} onTocou={...} />

import { useCallback, useEffect, useMemo, useState } from "react"
import { audioCtx, disco, player, tomDaMusica, violao, type Tom } from "../som"
import { vib } from "../som-carro"
import { TONS } from "../tons"
import { AFINACAO, CADENCIAS_MAIOR, CADENCIAS_MENOR, GRAUS_MAIOR, GRAUS_MENOR, NOMES, desenho, hz, nomeAc, type Acorde } from "./violaoTeoria"
import "./violao.css"

const PENTA = { maior: [0, 2, 4, 7, 9], menor: [0, 3, 5, 7, 10] }
const SEM_TOM: Tom = { tonica: 2, modo: "menor" }

// o que está tocando agora (o disco ou a rádio), ouvindo só os eventos
function srcTocando(): string | null {
  if (disco.tocando) return disco.src
  if (player.tocando) return player.src || null
  return null
}
export function useSomTocando(): string | null {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const ver = () => setSrc(srcTocando())
    ver()
    const a = disco.ouvir(ver)
    const b = player.ouvir(ver)
    return () => { a(); b() }
  }, [])
  return src
}

// o tom da faixa: a tabela (faixa conhecida), o detector ao vivo, ou Ré menor
export function tomDaFaixa(src: string | null): Tom {
  return (src && TONS[src]) || tomDaMusica() || SEM_TOM
}

// pré-calcula as notas do tom, duas por vez (nunca uma tarefa longa)
let aquecendo = 0
function aquecer(freqs: number[]) {
  const fila = [...new Set(freqs.map((f) => Math.round(f * 10) / 10))]
  const id = ++aquecendo
  const passo = () => {
    if (id !== aquecendo) return
    for (let i = 0; i < 2 && fila.length; i++) violao(fila.shift()!, 0)
    if (fila.length) setTimeout(passo, 16)
  }
  passo()
}

export interface ViolaoProps {
  // o violão está no save (sem ele, nada aparece)
  temViolao: boolean
  // algo aberto por cima (missão, cena, oficina): esconde o botão
  escondido?: boolean
  // cada toque (nota ou acorde), pra quem quiser contar
  onTocou?: (o: { nota?: string; acorde?: string }) => void
}

export function Violao({ temViolao, escondido, onTocou }: ViolaoProps) {
  const src = useSomTocando()
  const [aberto, setAberto] = useState(false)
  const [tom, setTom] = useState<Tom>(SEM_TOM)
  const [toque, setToque] = useState<string | null>(null)
  const [acorde, setAcorde] = useState<string | null>(null)

  // o tom: relido ao abrir, ao trocar de faixa e 1x por segundo com o painel aberto
  useEffect(() => {
    if (!aberto) return
    const ler = () => {
      const t = tomDaFaixa(srcTocando())
      setTom((a) => (a.tonica === t.tonica && a.modo === t.modo ? a : t))
    }
    ler()
    const i = setInterval(ler, 1000)
    return () => clearInterval(i)
  }, [aberto, src])

  const { tonica, modo } = tom
  const penta = PENTA[modo]
  // tônica entre Sol3 e Fá#4
  const base = 55 + ((tonica - 7 + 12) % 12)
  const campo = useMemo(() => (modo === "maior" ? GRAUS_MAIOR : GRAUS_MENOR).map(([i, q, g]) => ({ a: { r: (tonica + i) % 12, q } as Acorde, g })), [tonica, modo])
  // a sugestão: a primeira cadência do modo (I–V–vi–IV ou i–iv–V–i), numerada nos acordes
  const cadencia = (modo === "maior" ? CADENCIAS_MAIOR : CADENCIAS_MENOR)[0]

  useEffect(() => {
    if (!aberto) return
    const freqs: number[] = []
    for (const oit of [0, 1]) for (const iv of penta) freqs.push(hz(base + iv + 12 * oit))
    for (const { a } of campo) desenho(a).forEach((casa, corda) => { if (casa !== null) freqs.push(hz(AFINACAO[corda] + casa)) })
    const id = setTimeout(() => aquecer(freqs), 30)
    return () => { clearTimeout(id); aquecendo++ }
  }, [aberto, base, penta, campo])

  const piscar = useCallback((id: string) => {
    setToque(id)
    setTimeout(() => setToque((t) => (t === id ? null : t)), 180)
  }, [])

  const nota = (midi: number, id: string) => {
    audioCtx()
    violao(hz(midi))
    vib(8)
    piscar(id)
    onTocou?.({ nota: NOMES[midi % 12] })
  }
  const rasgar = (a: Acorde) => {
    audioCtx()
    desenho(a).forEach((casa, corda) => { if (casa !== null) violao(hz(AFINACAO[corda] + casa), 0.24, corda * 0.03) })
    vib(14)
    setAcorde(nomeAc(a))
    onTocou?.({ acorde: nomeAc(a) })
  }

  // a música parou e o painel está fechado: some o botão
  if (!temViolao || escondido) return null
  if (!src && !aberto) return null

  if (!aberto) {
    return (
      <button type="button" className="l-vl-botao" data-testid="violao-botao" aria-label="tocar o violão junto"
        onClick={() => { audioCtx(); setAberto(true) }}>
        <i aria-hidden className="l-vl-icone" />
        <small>violão</small>
      </button>
    )
  }

  return (
    <section className="l-vl-painel" data-testid="violao-painel" aria-label="violão">
      <header>
        <div>
          <small>tom da faixa</small>
          <b data-testid="violao-tom">{NOMES[tonica]} {modo}</b>
        </div>
        <button type="button" className="l-vl-fechar" onClick={() => setAberto(false)} aria-label="guardar o violão">×</button>
      </header>
      <div className="l-vl-notas">
        {[1, 0].map((oit) => (
          <div key={oit} className="l-vl-linha">
            {penta.map((iv, i) => {
              const midi = base + iv + 12 * oit
              const id = `n${oit}${i}`
              return (
                <button key={id} type="button" className={`${i === 0 ? "is-tonica" : ""} ${toque === id ? "is-toca" : ""}`}
                  onPointerDown={() => nota(midi, id)} aria-label={`nota ${NOMES[midi % 12]}`}>
                  {NOMES[midi % 12]}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="l-vl-acordes">
        {campo.map(({ a, g }) => {
          const ordem = cadencia.graus.indexOf(g)
          return (
            <button key={g} type="button" className={`${acorde === nomeAc(a) ? "is-on" : ""} ${ordem >= 0 ? "is-sugere" : ""}`} onPointerDown={() => rasgar(a)}>
              <small>{ordem >= 0 ? `${ordem + 1}º` : g}</small>{nomeAc(a)}
            </button>
          )
        })}
      </div>
      <p className="l-vl-dica">{cadencia.dica}</p>
    </section>
  )
}
