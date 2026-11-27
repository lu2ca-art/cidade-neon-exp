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
//
// (T64, 06/11) três coisas que faltavam:
// - a FAIXA DA RUA (pistaSom, a música contínua do mapa-disco) também conta como
//   "tocando": antes o botão só via o disco e a rádio, e na rua da cidade ele
//   quase nunca aparecia. Ouve definirFaixaRua (musicaContinua.ts), sem quadro;
// - tocar é "fazer música": com o painel aberto a trilha ABAIXA (abaixarUmPouco,
//   o mesmo duck leve das cenas). Não para: o violão toca junto, no tom dela
//   (docs/trilha-sonora.md; parar seria trocar por fazerMusica);
// - sem o violão no save (antes da D-Bee, ou depois do metrô), o botão aparece
//   com o CADEADO e diz o que libera (`tranca`), em vez de sumir.
// (09/11, decisão do dono) sentado no trem, sem o violão, o mesmo painel toca o
// instrumento comprado (`comprado`, instrumentosLoja.ts). No trem o botão não depende
// de música: sem faixa, fica em Ré menor. Fora do trem, nada mudou.

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { abaixarUmPouco, audioCtx, disco, pistaSom, player, tomDaMusica, violao, type Tom } from "../som"
import { ouvirFaixaRua } from "./musicaContinua"
import { ouvirSentadoNoTrem, sentadoNoTrem } from "../metro/mundo"
import type { Comprado } from "./instrumentosLoja"
import { Cadeado, Trancado } from "../Trancado"
import { vib } from "../som-carro"
import { TONS } from "../tons"
import { AFINACAO, CADENCIAS_MAIOR, CADENCIAS_MENOR, GRAUS_MAIOR, GRAUS_MENOR, NOMES, desenho, hz, nomeAc, type Acorde } from "./violaoTeoria"
import "./violao.css"

const PENTA = { maior: [0, 2, 4, 7, 9], menor: [0, 3, 5, 7, 10] }
const SEM_TOM: Tom = { tonica: 2, modo: "menor" }

// o que está tocando agora (o disco, a rádio ou a faixa da rua), ouvindo só os eventos
function srcTocando(): string | null {
  if (disco.tocando) return disco.src
  if (player.tocando) return player.src || null
  if (pistaSom.tocando) return pistaSom.src
  return null
}
export function useSomTocando(): string | null {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const ver = () => setSrc(srcTocando())
    ver()
    const a = disco.ouvir(ver)
    const b = player.ouvir(ver)
    // a faixa da rua avisa quando troca (o deck pode levar um tique pra dar play: relê logo depois)
    let t: ReturnType<typeof setTimeout> | undefined
    const c = ouvirFaixaRua(() => { ver(); clearTimeout(t); t = setTimeout(ver, 400) })
    return () => { a(); b(); c(); clearTimeout(t) }
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
  // (09/11) o instrumento comprado que ele toca sentado no trem, sem o violão
  comprado?: Comprado | null
  // algo aberto por cima (missão, cena, oficina): esconde o botão
  escondido?: boolean
  // (T64) sem o violão: o que libera (aparece com o cadeado). null/ausente = some, como antes
  tranca?: string | null
  // cada toque (nota ou acorde), pra quem quiser contar
  onTocou?: (o: { nota?: string; acorde?: string }) => void
  // (27/11, a entrada na Kombi) o botão aparece mesmo sem nada tocando (Ré menor)
  sempre?: boolean
  // (27/11) muda o número: abre o painel (tocar no violão 3D)
  abrir?: number
}

const nuncaNoTrem = () => false

export function Violao({ temViolao, comprado, escondido, tranca, onTocou, sempre, abrir }: ViolaoProps) {
  const src = useSomTocando()
  const noTrem = useSyncExternalStore(ouvirSentadoNoTrem, sentadoNoTrem, nuncaNoTrem)
  const [aberto, setAberto] = useState(false)
  // com o violão, é ele; sem ele, o comprado, só no trem
  const outro = !temViolao && noTrem ? comprado ?? null : null
  const podeTocar = temViolao || !!outro
  const nome = outro?.nome ?? "violão"
  const voz = outro?.tocar ?? violao
  // desceu do trem com o painel do comprado aberto: fecha
  if (aberto && !podeTocar) setAberto(false)
  const [aviso, setAviso] = useState(false)
  // tocaram no violão de fora (3D): abre
  useEffect(() => { if (abrir) { audioCtx(); setAberto(true) } }, [abrir])

  // (T64) tocando o violão, a trilha abaixa (não para: ele toca junto, no tom dela)
  const tocando = aberto && podeTocar && !escondido
  useEffect(() => {
    if (!tocando) return
    abaixarUmPouco(true)
    return () => abaixarUmPouco(false)
  }, [tocando])
  // o aviso do cadeado some sozinho
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(false), 3500)
    return () => clearTimeout(t)
  }, [aviso])
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

  const aqueceCorda = !outro || !!outro.aquece
  useEffect(() => {
    if (!aberto || !aqueceCorda) return
    const freqs: number[] = []
    for (const oit of [0, 1]) for (const iv of penta) freqs.push(hz(base + iv + 12 * oit))
    for (const { a } of campo) desenho(a).forEach((casa, corda) => { if (casa !== null) freqs.push(hz(AFINACAO[corda] + casa)) })
    const id = setTimeout(() => aquecer(freqs), 30)
    return () => { clearTimeout(id); aquecendo++ }
  }, [aberto, base, penta, campo, aqueceCorda])

  const piscar = useCallback((id: string) => {
    setToque(id)
    setTimeout(() => setToque((t) => (t === id ? null : t)), 180)
  }, [])

  const nota = (midi: number, id: string) => {
    audioCtx()
    voz(hz(midi))
    vib(8)
    piscar(id)
    onTocou?.({ nota: NOMES[midi % 12] })
  }
  const rasgar = (a: Acorde) => {
    audioCtx()
    desenho(a).forEach((casa, corda) => { if (casa !== null) voz(hz(AFINACAO[corda] + casa), 0.24, corda * 0.03) })
    vib(14)
    setAcorde(nomeAc(a))
    onTocou?.({ acorde: nomeAc(a) })
  }

  // a música parou e o painel está fechado: some o botão
  if (escondido) return null
  if (!podeTocar) {
    // (T64) trancado: o botão com o cadeado, junto da música (no trem, sempre); o toque diz o que libera
    if (!tranca || (!src && !noTrem)) return null
    return (
      <>
        <button type="button" className="l-vl-botao is-trancado" data-testid="violao-trancado" aria-label={`violão trancado: ${tranca}`}
          onClick={() => setAviso((a) => !a)}>
          <i aria-hidden className="l-vl-icone" />
          <small><Cadeado size={9} /> violão</small>
        </button>
        {aviso && <div className="l-vl-aviso"><Trancado texto={tranca} /></div>}
      </>
    )
  }
  if (!src && !aberto && !noTrem && !sempre) return null

  if (!aberto) {
    return (
      <button type="button" className="l-vl-botao" data-testid="violao-botao" aria-label={`tocar ${nome} junto`}
        onClick={() => { audioCtx(); setAberto(true) }}>
        <i aria-hidden className="l-vl-icone" />
        <small>{nome}</small>
      </button>
    )
  }

  return (
    <section className="l-vl-painel" data-testid="violao-painel" aria-label={nome}>
      <header>
        <div>
          <small>tom da faixa</small>
          <b data-testid="violao-tom">{NOMES[tonica]} {modo}</b>
        </div>
        <button type="button" className="l-vl-fechar" onClick={() => setAberto(false)} aria-label={`guardar ${nome}`}>×</button>
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
