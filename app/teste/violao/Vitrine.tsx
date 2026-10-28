"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { aquecerViolao, audioCtx, latenciaSaida, player, tomDaMusica, violao, type Tom } from "@/app/linha/som"
import { AFINACAO, CASAS, GRAUS_MAIOR, GRAUS_MENOR, NOMES, desenho, hz, nomeAc, type Acorde } from "@/app/linha/violao-teoria"
import conferir from "@/app/linha/tons-conferir.json"
import "./violao.css"

const PENTA = { maior: [0, 2, 4, 7, 9], menor: [0, 3, 5, 7, 10] }
const ESCALA = { maior: [0, 2, 4, 5, 7, 9, 11], menor: [0, 2, 3, 5, 7, 8, 10] }
const FAIXAS = conferir.map((c) => ({ ...c, nome: c.faixa.replace("/audio/tracks/", "").replace(".mp3", "") }))

type Lat = { n: number; ult: number; media: number; p95: number; max: number; saida: number }

export function Vitrine() {
  const [faixa, setFaixa] = useState(FAIXAS[0].faixa)
  const [tocando, setTocando] = useState(false)
  const [auto, setAuto] = useState<Tom | null>(null)
  const [manual, setManual] = useState<string>("auto") // "auto" ou "5:menor"
  const [acorde, setAcorde] = useState<string | null>(null)
  const [toque, setToque] = useState<string | null>(null)
  const [lat, setLat] = useState<Lat | null>(null)
  const amostras = useRef<number[]>([])

  // o tom que o jogo conhece agora (tabela ou detector ao vivo)
  useEffect(() => {
    const i = setInterval(() => {
      const t = tomDaMusica()
      setAuto((a) => (a && t && a.tonica === t.tonica && a.modo === t.modo ? a : t))
      setTocando(player.tocando)
    }, 250)
    return () => clearInterval(i)
  }, [])

  const tom: Tom | null = useMemo(() => {
    if (manual !== "auto") { const [t, m] = manual.split(":"); return { tonica: +t, modo: m as Tom["modo"] } }
    return auto
  }, [manual, auto])

  const info = FAIXAS.find((f) => f.faixa === faixa)
  const modo = tom?.modo ?? "menor"
  const tonica = tom?.tonica ?? 2
  // tônica entre Sol3 e Fá#4, como as notas do jogo
  const base = 55 + ((tonica - 7 + 12) % 12)
  const penta = PENTA[modo]
  const naPenta = useCallback((pc: number) => penta.includes(((pc - tonica) % 12 + 12) % 12), [penta, tonica])
  const naEscala = (pc: number) => ESCALA[modo].includes(((pc - tonica) % 12 + 12) % 12)

  // pré-calcula as notas do tom: o toque nunca paga o Karplus-Strong
  useEffect(() => {
    const freqs: number[] = []
    for (let c = 0; c < 6; c++) for (let k = 0; k <= CASAS; k++) if (naPenta((AFINACAO[c] + k) % 12)) freqs.push(hz(AFINACAO[c] + k))
    for (const [i] of modo === "maior" ? GRAUS_MAIOR : GRAUS_MENOR) for (let n = 0; n < 6; n++) freqs.push(hz(AFINACAO[n] + i))
    const id = setTimeout(() => aquecerViolao(freqs), 30)
    return () => clearTimeout(id)
  }, [tonica, modo, naPenta])

  const medir = (e: React.PointerEvent) => {
    const ms = performance.now() - e.timeStamp
    const a = amostras.current
    a.push(ms)
    const ord = [...a].sort((x, y) => x - y)
    const s = {
      n: a.length, ult: ms, media: a.reduce((x, y) => x + y, 0) / a.length,
      p95: ord[Math.min(ord.length - 1, Math.floor(ord.length * 0.95))], max: ord[ord.length - 1],
      saida: latenciaSaida() * 1000,
    }
    ;(window as unknown as { __violaoLat?: Lat }).__violaoLat = s
    setLat(s)
  }

  const nota = (e: React.PointerEvent, midi: number, id: string) => {
    audioCtx() // destrava o som no mesmo toque
    violao(hz(midi))
    medir(e)
    setToque(id)
    setTimeout(() => setToque((t) => (t === id ? null : t)), 200)
  }

  const rasgar = (e: React.PointerEvent, a: Acorde) => {
    audioCtx()
    desenho(a).forEach((casa, corda) => { if (casa !== null) violao(hz(AFINACAO[corda] + casa), 0.24, corda * 0.03) })
    medir(e)
    setAcorde(nomeAc(a))
  }

  const campo = (modo === "maior" ? GRAUS_MAIOR : GRAUS_MENOR).map(([i, q, g]) => ({ a: { r: (tonica + i) % 12, q } as Acorde, g }))
  const formato = acorde ? desenho(campo.find((c) => nomeAc(c.a) === acorde)!.a) : null

  const tocarFaixa = () => {
    audioCtx()
    if (player.src === faixa && player.tocando) player.pausar()
    else player.tocar(faixa)
    setTocando(player.tocando)
  }
  const trocarFaixa = (f: string) => {
    setFaixa(f)
    if (player.tocando) player.tocar(f)
  }

  const fonte = manual !== "auto" ? "manual" : info && player.src === faixa ? info.status : auto ? "ao vivo (detector)" : "sem música"

  return (
    <main className="vl-raiz" data-testid="violao-teste">
      <h1>violão da D-bee</h1>
      <p className="vl-sub">toca uma música e acompanha: as notas acesas são as que combinam com o tom.</p>

      <section className="vl-faixa">
        <select aria-label="faixa" value={faixa} onChange={(e) => trocarFaixa(e.target.value)}>
          {FAIXAS.map((f) => <option key={f.faixa} value={f.faixa}>{f.nome}</option>)}
        </select>
        <button type="button" data-testid="tocar-faixa" onClick={tocarFaixa}>{tocando && player.src === faixa ? "pausar" : "tocar"}</button>
      </section>

      <section className="vl-tom" data-testid="tom">
        <div>
          <small>tom da música</small>
          <b data-testid="tom-nome">{tom ? `${NOMES[tom.tonica]} ${tom.modo}` : "—"}</b>
        </div>
        <small className="vl-fonte" data-testid="tom-fonte">{fonte}</small>
        <select aria-label="tom manual" value={manual} onChange={(e) => setManual(e.target.value)}>
          <option value="auto">tom: automático</option>
          {NOMES.flatMap((n, i) => (["maior", "menor"] as const).map((m) => <option key={`${i}:${m}`} value={`${i}:${m}`}>{n} {m}</option>))}
        </select>
      </section>

      <h2>notas do tom</h2>
      <div className="vl-pads" data-testid="pads-notas">
        {[1, 0].map((oit) => (
          <div key={oit} className="vl-pads-linha">
            {penta.map((iv, i) => {
              const midi = base + iv + 12 * oit
              const id = `n${oit}${i}`
              return (
                <button key={id} type="button" className={`${i === 0 ? "is-tonica" : ""} ${toque === id ? "is-toca" : ""}`}
                  onPointerDown={(e) => nota(e, midi, id)} aria-label={`nota ${NOMES[midi % 12]}`}>
                  {NOMES[midi % 12]}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <h2>acordes do tom</h2>
      <div className="vl-acordes" data-testid="pads-acordes">
        {campo.map(({ a, g }) => (
          <button key={g} type="button" className={acorde === nomeAc(a) ? "is-on" : ""} onPointerDown={(e) => rasgar(e, a)}>
            <small>{g}</small>{nomeAc(a)}
          </button>
        ))}
      </div>

      <h2>braço · só as notas que combinam</h2>
      <div className="vl-braco" data-testid="braco">
        {Array.from({ length: CASAS + 1 }, (_, casa) => (
          <div key={casa} className={`vl-casa ${casa === 0 ? "is-solta" : ""}`}>
            <span className="vl-n">{[3, 5, 7, 9, 12].includes(casa) ? casa : ""}</span>
            {AFINACAO.map((solta, corda) => {
              const midi = solta + casa
              const pc = midi % 12
              const forte = naPenta(pc)
              const fraco = !forte && naEscala(pc)
              const noAc = formato?.[corda] === casa
              const id = `b${corda}:${casa}`
              return (
                <button key={corda} type="button" aria-label={`${NOMES[pc]} corda ${6 - corda} casa ${casa}`}
                  className={`vl-nota ${toque === id ? "is-toca" : ""}`} onPointerDown={(e) => nota(e, midi, id)}>
                  {(forte || noAc) && <b className={`${pc === tonica ? "is-tonica" : ""} ${noAc ? "is-acorde" : ""}`}>{NOMES[pc]}</b>}
                  {fraco && !noAc && <i />}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <h2>atraso do toque</h2>
      <p className="vl-lat" data-testid="lat">
        {lat
          ? `${lat.n} toques · último ${lat.ult.toFixed(1)} ms · média ${lat.media.toFixed(1)} ms · p95 ${lat.p95.toFixed(1)} ms · pior ${lat.max.toFixed(1)} ms · saída do aparelho ${lat.saida.toFixed(0)} ms`
          : "toca uma nota (dedo até o som ser mandado, e a saída do aparelho)"}
      </p>
    </main>
  )
}
