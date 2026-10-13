"use client"

// B4TIDA estúdio — a gaveta do instrumento (abre embaixo, a música continua
// visível em cima). TOCAR: pads (bateria) ou teclado de escala + acordes
// (nunca erra nota; "livre" libera todas). Com ● ligado, o que você toca
// grava no tempo. EDITAR: a grade da seção, no dedo. SOM: timbre e mesa.
// VOZ: grava em cima da seção, sem atraso (voz.ts).

import { useEffect, useMemo, useRef, useState } from "react"
import { degreeToMidi, degreeTriadMidi, scaleSteps, type DegreeInfo } from "../lib/theory"

// nome da nota no jeito do tom (tons com bemol mostram bemol: Si♭, não Lá♯)
const SUSTENIDOS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const BEMOIS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"]
export function nomeNota(pc: number, tom: number, modo: Musica["modo"]) {
  const maiorRelativo = modo === "minor" ? (tom + 3) % 12 : tom
  const comBemol = [5, 10, 3, 8, 1, 6].includes(maiorRelativo)
  return (comBemol ? BEMOIS : SUSTENIDOS)[((pc % 12) + 12) % 12]
}
import { INST_COR, PADS, PAD_NOME, novoId, passosDa, type Evento, type Faixa, type Musica, type Secao } from "./tipos"
import type { Motor } from "./motor"
import { nomeDoSom, precarregar, sonsDe } from "./sons"
import { Microfone, atrasoSalvo, paraWav } from "./voz"

type Aba = "tocar" | "editar" | "som"
const OITAVA_BASE = { baixo: 1, teclas: 4, guitarra: 3, pad: 3, bateria: 0, voz: 0 } as const
const DUR_OUVIR = { baixo: 0.55, teclas: 0.8, guitarra: 1.1, pad: 2, bateria: 0.3, voz: 0 } as const

let mic: Microfone | null = null

export function Gaveta({ musica, faixa, secao, graus, motor, pos, tocando, gravando, mudar, onFechar, onTocarSecao, onPararTudo, onVoz, setMsg }: {
  musica: Musica; faixa: Faixa; secao: Secao; graus: DegreeInfo[]; motor: Motor
  pos: React.RefObject<{ secao: string; passo: number } | null>; tocando: boolean; gravando: boolean
  mudar: (f: (m: Musica) => Musica, registrar?: boolean) => void
  onFechar: () => void; onTocarSecao: () => void; onPararTudo: () => void
  onVoz: (chave: string, blob: Blob, buf: AudioBuffer) => Promise<void>
  setMsg: (t: string) => void
}) {
  const [aba, setAba] = useState<Aba>("tocar")
  const [oitava, setOitava] = useState<number>(OITAVA_BASE[faixa.inst])
  const [livre, setLivre] = useState(false)
  const [acordes, setAcordes] = useState(faixa.inst !== "baixo")
  const [setima, setSetima] = useState(false)
  const cor = INST_COR[faixa.inst]

  // grava um evento na seção que está tocando (quantizado)
  const gravarEventos = (q: { secao: string; passo: number }, notas: number[], d: number, v: number) => {
    mudar((m) => ({
      ...m,
      secoes: m.secoes.map((s) => {
        if (s.id !== q.secao) return s
        const atual = s.eventos[faixa.id] ?? []
        const novos = notas.filter((n) => !atual.some((e) => e.p === q.passo && e.n === n)).map((n) => ({ p: q.passo, n, d, v }))
        return novos.length ? { ...s, eventos: { ...s.eventos, [faixa.id]: [...atual, ...novos] } } : s
      }),
    }))
  }

  /* ── notas da escala (teclado) ── */
  const teclas = useMemo(() => {
    const out: number[] = []
    if (livre) for (let i = 0; i < 25; i++) out.push(musica.tom + 12 * (oitava + 1) + i)
    else for (let k = 0; k < 15; k++) out.push(degreeToMidi(musica.tom, musica.modo, k % 7, oitava + Math.floor(k / 7)))
    return out
  }, [livre, musica.tom, musica.modo, oitava])

  const acordeDe = (g: number) => {
    const t = degreeTriadMidi(musica.tom, musica.modo, g, oitava)
    if (!setima) return t
    const g7 = g + 6
    return [...t, degreeToMidi(musica.tom, musica.modo, g7 % 7, oitava + Math.floor(g7 / 7))]
  }

  // segurar: começa a nota no toque, a duração sai do quanto você segurou
  const segurando = useRef(new Map<number, { q: { secao: string; passo: number } | null; notas: number[]; v: number }>())
  const apertar = (id: number, notas: number[], v: number, e?: React.PointerEvent) => {
    if (e) (e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    motor.ouvir(faixa, notas, v, DUR_OUVIR[faixa.inst])
    try { navigator.vibrate?.(6) } catch {}
    const q = gravando && tocando ? motor.quantizar() : null
    if (faixa.inst === "bateria") { if (q) gravarEventos(q, notas, 1, v); return }
    segurando.current.set(id, { q, notas, v })
  }
  const soltar = (id: number) => {
    const s = segurando.current.get(id)
    segurando.current.delete(id)
    if (!s?.q) return
    const fim = motor.quantizar()
    const total = passosDa(musica.secoes.find((x) => x.id === s.q!.secao) ?? secao)
    let d = fim && fim.secao === s.q.secao ? (fim.passo - s.q.passo + total) % total : 2
    if (d <= 0) d = 1
    gravarEventos(s.q, s.notas, Math.min(d, 32), s.v)
  }
  const forca = (e: React.PointerEvent) => (e.pressure > 0 && e.pressure !== 0.5 ? 0.35 + e.pressure * 0.65 : 0.85)

  return (
    <section className="es-gaveta" style={{ ["--c" as string]: cor }}>
      <header className="es-gav-topo">
        <span><b>{faixa.inst}</b><small>{nomeDoSom(faixa)} · {secao.nome}</small></span>
        <div className="es-abas">
          {(["tocar", "editar", "som"] as Aba[]).map((a) => <button key={a} type="button" className={aba === a ? "is-on" : ""} onClick={() => setAba(a)}>{a}</button>)}
        </div>
        <button type="button" className="es-ic" onClick={onFechar} aria-label="fechar">✕</button>
      </header>

      {aba === "tocar" && faixa.inst === "bateria" && (
        <div className="es-pads">
          {[4, 5, 6, 7, 0, 1, 2, 3].map((i) => (
            <button key={i} type="button" className="es-pad" style={{ ["--p" as string]: `hsl(${(i * 45 + 350) % 360} 90% 62%)` }}
              onPointerDown={(e) => { e.preventDefault(); apertar(i, [i], forca(e)) }}>
              <b>{PAD_NOME[PADS[i]]}</b>
            </button>
          ))}
        </div>
      )}

      {aba === "tocar" && faixa.inst !== "bateria" && faixa.inst !== "voz" && (
        <div className="es-tocar">
          <div className="es-tocar-barra">
            {faixa.inst !== "baixo" && <button type="button" className={acordes ? "is-on" : ""} onClick={() => setAcordes(true)}>acordes</button>}
            <button type="button" className={!acordes ? "is-on" : ""} onClick={() => setAcordes(false)}>notas</button>
            {acordes ? <button type="button" className={setima ? "is-on" : ""} onClick={() => setSetima((x) => !x)}>+ 7ª</button>
              : <button type="button" className={livre ? "is-on" : ""} onClick={() => setLivre((x) => !x)}>{livre ? "livre" : "só do tom"}</button>}
            <button type="button" onClick={() => setOitava((o) => Math.max(0, o - 1))}>oit −</button>
            <button type="button" onClick={() => setOitava((o) => Math.min(6, o + 1))}>oit +</button>
          </div>
          {acordes ? (
            <div className="es-acordes">
              {graus.map((g) => (
                <button key={g.degree} type="button" className={`es-acorde is-${g.quality}`}
                  onPointerDown={(e) => apertar(100 + g.degree, acordeDe(g.degree), forca(e), e)}
                  onPointerUp={() => soltar(100 + g.degree)} onPointerCancel={() => soltar(100 + g.degree)}>
                  <b>{nomeNota(g.rootPc, musica.tom, musica.modo)}{g.quality === "min" ? "m" : g.quality === "dim" ? "°" : ""}{setima ? "7" : ""}</b><small>{g.romanNumeral}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className={`es-teclado ${livre ? "is-livre" : ""}`}>
              {[teclas.slice(Math.ceil(teclas.length / 2)), teclas.slice(0, Math.ceil(teclas.length / 2))].map((linha, k) => (
                <div key={k} className="es-tec-linha">
                  {linha.map((n) => {
                    const pc = ((n % 12) + 12) % 12
                    const tonica = pc === musica.tom
                    const naEscala = scaleSteps(musica.modo).includes(((pc - musica.tom) % 12 + 12) % 12)
                    return (
                      <button key={n} type="button" className={`es-tecla ${tonica ? "is-tonica" : ""} ${naEscala ? "" : "is-fora"}`}
                        onPointerDown={(e) => apertar(n, [n], forca(e), e)} onPointerUp={() => soltar(n)} onPointerCancel={() => soltar(n)}>
                        {nomeNota(pc, musica.tom, musica.modo)}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
          <p className="es-dica">{gravando ? (tocando ? "gravando: toque e segure, entra no tempo" : "aperte ▶") : "aperte ● pra gravar o que você tocar"}</p>
        </div>
      )}

      {aba === "tocar" && faixa.inst === "voz" && (
        <PainelVoz musica={musica} faixa={faixa} secao={secao} motor={motor} mudar={mudar} onVoz={onVoz} onPararTudo={onPararTudo} setMsg={setMsg} />
      )}

      {aba === "editar" && (
        faixa.inst === "voz"
          ? <p className="es-dica">a voz se edita gravando de novo (tocar → gravar). Pra tirar, use “apagar a voz desta seção”.</p>
          : <Grade musica={musica} faixa={faixa} secao={secao} oitava={oitava} livre={livre} pos={pos} motor={motor} mudar={mudar} onTocarSecao={onTocarSecao} tocando={tocando} />
      )}

      {aba === "som" && <Som faixa={faixa} motor={motor} mudar={mudar} onFechar={onFechar} />}
    </section>
  )
}

/* ─── a grade (editar no dedo) ─────────────────────────── */
function Grade({ musica, faixa, secao, oitava, livre, pos, motor, mudar, onTocarSecao, tocando }: {
  musica: Musica; faixa: Faixa; secao: Secao; oitava: number; livre: boolean; pos: React.RefObject<{ secao: string; passo: number } | null>
  motor: Motor; mudar: (f: (m: Musica) => Musica, registrar?: boolean) => void; onTocarSecao: () => void; tocando: boolean
}) {
  const [dur, setDur] = useState(faixa.inst === "baixo" ? 2 : faixa.inst === "pad" ? 8 : 2)
  const cvs = useRef<HTMLCanvasElement>(null)
  const bat = faixa.inst === "bateria"
  const linhas = useMemo(() => {
    if (bat) return PADS.map((_, i) => i)
    const out: number[] = []
    if (livre) for (let i = 0; i < 25; i++) out.push(musica.tom + 12 * (oitava + 1) + i)
    else for (let k = 0; k < 15; k++) out.push(degreeToMidi(musica.tom, musica.modo, k % 7, oitava + Math.floor(k / 7)))
    // notas que já estão na seção e fogem da faixa visível também aparecem
    for (const e of secao.eventos[faixa.id] ?? []) if (!out.includes(e.n)) out.push(e.n)
    return out.sort((a, b) => a - b)
  }, [bat, livre, musica.tom, musica.modo, oitava, secao, faixa.id])
  const n = passosDa(secao)
  const CEL = 30
  const ALT = bat ? 34 : 24
  const W = n * CEL, H = linhas.length * ALT

  useEffect(() => {
    let raf = 0
    const desenhar = () => {
      const c = cvs.current
      if (c) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr }
        const g = c.getContext("2d")!
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.fillStyle = "#0d0c14"
        g.fillRect(0, 0, W, H)
        linhas.forEach((ln, r) => {
          const y = H - (r + 1) * ALT
          const pc = ((ln % 12) + 12) % 12
          g.fillStyle = !bat && pc === musica.tom ? "rgba(255,255,255,0.07)" : r % 2 ? "rgba(255,255,255,0.025)" : "transparent"
          g.fillRect(0, y, W, ALT)
          g.fillStyle = "rgba(255,255,255,0.4)"
          g.font = "10px ui-monospace, monospace"
        })
        for (let p = 0; p <= n; p++) {
          g.fillStyle = p % 16 === 0 ? "rgba(255,255,255,0.35)" : p % 4 === 0 ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)"
          g.fillRect(p * CEL, 0, 1, H)
        }
        const cor = INST_COR[faixa.inst]
        for (const e of secao.eventos[faixa.id] ?? []) {
          const r = linhas.indexOf(e.n)
          if (r < 0) continue
          const y = H - (r + 1) * ALT
          g.fillStyle = cor
          g.globalAlpha = 0.45 + e.v * 0.55
          g.beginPath()
          g.roundRect(e.p * CEL + 2, y + 3, Math.max(CEL - 4, e.d * CEL - 4), ALT - 6, 5)
          g.fill()
          g.globalAlpha = 1
        }
        // nomes das linhas por cima (fixos à esquerda da área visível ficam no DOM)
        const p = pos.current
        if (p && p.secao === secao.id) { g.fillStyle = "#fff"; g.fillRect(p.passo * CEL, 0, 2, H) }
      }
      raf = requestAnimationFrame(desenhar)
    }
    raf = requestAnimationFrame(desenhar)
    return () => cancelAnimationFrame(raf)
  }, [W, H, ALT, linhas, secao, faixa, n, bat, musica.tom, pos])

  const tocarNaGrade = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const p = Math.floor((e.clientX - r.left) / CEL)
    const row = linhas.length - 1 - Math.floor((e.clientY - r.top) / ALT)
    if (p < 0 || p >= n || row < 0 || row >= linhas.length) return
    const nota = linhas[row]
    const ev = secao.eventos[faixa.id] ?? []
    const existe = ev.find((x) => x.n === nota && p >= x.p && p < x.p + Math.max(1, x.d))
    if (!existe) motor.ouvir(faixa, [nota], 0.85, 0.3)
    mudar((m) => ({
      ...m,
      secoes: m.secoes.map((s) => s.id !== secao.id ? s : {
        ...s,
        eventos: { ...s.eventos, [faixa.id]: existe ? ev.filter((x) => x !== existe) : [...ev, { p, n: nota, d: bat ? 1 : Math.min(dur, n - p), v: 0.85 } as Evento] },
      }),
    }))
  }

  return (
    <div className="es-grade">
      <div className="es-tocar-barra">
        {!bat && (
          <select value={dur} onChange={(e) => setDur(Number(e.target.value))} aria-label="duração das notas novas">
            <option value={1}>nota 1/16</option><option value={2}>nota 1/8</option><option value={4}>nota 1 tempo</option><option value={8}>nota 2 tempos</option><option value={16}>nota 1 compasso</option>
          </select>
        )}
        {!tocando && <button type="button" onClick={onTocarSecao}>▶ ouvir</button>}
        <button type="button" onClick={() => mudar((m) => ({ ...m, secoes: m.secoes.map((s) => (s.id === secao.id ? { ...s, eventos: { ...s.eventos, [faixa.id]: [] } } : s)) }))}>limpar</button>
        {secao.compassos > 1 && (
          <button type="button" onClick={() => mudar((m) => ({
            ...m,
            secoes: m.secoes.map((s) => {
              if (s.id !== secao.id) return s
              // o 1º compasso vira o padrão da seção inteira
              const base = (s.eventos[faixa.id] ?? []).filter((e) => e.p < 16)
              const out = [...base]
              for (let o = 16; o < passosDa(s); o += 16) for (const e of base) out.push({ ...e, p: e.p + o })
              return { ...s, eventos: { ...s.eventos, [faixa.id]: out } }
            }),
          }))}>repetir o 1º compasso</button>
        )}
      </div>
      <div className="es-grade-area">
        <div className="es-grade-nomes" style={{ height: H }}>
          {[...linhas].reverse().map((ln) => <span key={ln} style={{ height: ALT }}>{bat ? PAD_NOME[PADS[ln]] : `${nomeNota(ln, musica.tom, musica.modo)}${Math.floor(ln / 12) - 1}`}</span>)}
        </div>
        <div className="es-grade-rolo">
          <canvas ref={cvs} style={{ width: W, height: H }} onClick={tocarNaGrade} />
        </div>
      </div>
    </div>
  )
}

/* ─── som: timbre e mesa ───────────────────────────────── */
function Som({ faixa, motor, mudar, onFechar }: { faixa: Faixa; motor: Motor; mudar: (f: (m: Musica) => Musica, registrar?: boolean) => void; onFechar: () => void }) {
  const set = (p: Partial<Faixa>, reg = false) => mudar((m) => ({ ...m, faixas: m.faixas.map((f) => (f.id === faixa.id ? { ...f, ...p } : f)) }), reg)
  const lista = sonsDe(faixa.inst)
  return (
    <div className="es-som">
      {faixa.inst !== "voz" && (
        <div className="es-sons">
          {lista.map((s) => (
            <button key={s.id} type="button" className={faixa.som === s.id ? "is-on" : ""}
              onClick={async () => {
                set({ som: s.id }, true)
                const nf = { ...faixa, som: s.id }
                await precarregar(motor.ctx, [nf])
                motor.ouvir(nf, faixa.inst === "bateria" ? [0] : [48 + (faixa.inst === "baixo" ? -12 : 12)], 0.85, 0.6)
              }}>
              {s.nome}{s.cidade && <small>da cidade</small>}
            </button>
          ))}
        </div>
      )}
      {faixa.inst === "voz" && (
        <div className="es-sons">
          {(["limpo", "rua", "radio", "chuva"] as const).map((e) => <button key={e} type="button" className={faixa.efeitoVoz === e ? "is-on" : ""} onClick={() => set({ efeitoVoz: e }, true)}>{e === "radio" ? "rádio" : e}</button>)}
        </div>
      )}
      {([["vol", "volume", 0, 1], ["pan", "esquerda ↔ direita", -1, 1], ["reverb", "reverb (sala)", 0, 1], ["delay", "delay (eco)", 0, 1]] as const).map(([k, nome, a, b]) => (
        <label key={k} className="es-slider">
          <span>{nome}</span>
          <input type="range" min={a * 100} max={b * 100} value={Math.round((faixa[k] as number) * 100)} onChange={(e) => set({ [k]: Number(e.target.value) / 100 } as Partial<Faixa>)} />
        </label>
      ))}
      <button type="button" className="es-apagar" onClick={() => { if (!window.confirm(`apagar a faixa de ${faixa.inst}?`)) return; mudar((m) => ({ ...m, faixas: m.faixas.filter((f) => f.id !== faixa.id), secoes: m.secoes.map((s) => { const ev = { ...s.eventos }; delete ev[faixa.id]; const vz = { ...s.voz }; delete vz[faixa.id]; return { ...s, eventos: ev, voz: vz } }) })); onFechar() }}>apagar esta faixa</button>
    </div>
  )
}

/* ─── voz ──────────────────────────────────────────────── */
function PainelVoz({ musica, faixa, secao, motor, mudar, onVoz, onPararTudo, setMsg }: {
  musica: Musica; faixa: Faixa; secao: Secao; motor: Motor; mudar: (f: (m: Musica) => Musica, registrar?: boolean) => void
  onVoz: (chave: string, blob: Blob, buf: AudioBuffer) => Promise<void>; onPararTudo: () => void; setMsg: (t: string) => void
}) {
  const [fase, setFase] = useState<"pronto" | "abrindo" | "contagem" | "gravando" | "calibrando">("pronto")
  const tem = !!secao.voz[faixa.id]
  const atraso = atrasoSalvo()
  useEffect(() => () => motor.configurar({ onBloco: null }), [motor])

  const gravar = async () => {
    try {
      setFase("abrindo")
      mic ??= new Microfone(motor.ctx)
      await mic.abrir()
    } catch {
      setFase("pronto")
      setMsg("precisa liberar o microfone pra gravar")
      return
    }
    onPararTudo()
    // a tomada antiga desta seção sai (pra não gravar por cima dela)
    mudar((m) => ({ ...m, secoes: m.secoes.map((s) => { if (s.id !== secao.id) return s; const vz = { ...s.voz }; delete vz[faixa.id]; return { ...s, voz: vz } }) }), true)
    let alvo: { ini: number; fim: number } | null = null
    const aoBloco = (sid: string, ini: number, fim: number) => {
      if (alvo || sid !== secao.id) return
      alvo = { ini, fim }
      setFase("gravando")
      const espera = (fim - motor.ctx.currentTime + mic!.atraso() + 0.25) * 1000
      window.setTimeout(async () => {
        mic!.parar()
        motor.configurar({ onBloco: null, metronomo: false })
        const buf = mic!.recortar(alvo!.ini, alvo!.fim - alvo!.ini)
        if (!buf) { setFase("pronto"); setMsg("não pegou áudio. tenta de novo?"); return }
        const chave = novoId("voz")
        await onVoz(chave, paraWav(buf), buf)
        mudar((m) => ({ ...m, secoes: m.secoes.map((s) => (s.id === secao.id ? { ...s, voz: { ...s.voz, [faixa.id]: { chave, dur: buf.duration } } } : s)) }), false)
        setFase("pronto")
        setMsg("gravado! toca de novo na próxima volta")
      }, Math.max(0, espera))
    }
    motor.configurar({ modo: "secao", secao: secao.id, metronomo: true, onBloco: aoBloco })
    mic.comecar()
    setFase("contagem")
    motor.tocar(true)
  }

  const calibrar = async () => {
    setFase("calibrando")
    onPararTudo()
    try {
      mic ??= new Microfone(motor.ctx)
      const v = await mic.calibrar()
      setMsg(v === null ? "não ouvi os cliques: aumenta o volume, tira o fone e tenta de novo" : `atraso medido: ${Math.round(v * 1000)} ms. agora pode pôr o fone.`)
    } catch {
      setMsg("precisa liberar o microfone")
    }
    setFase("pronto")
  }

  return (
    <div className="es-voz">
      <button type="button" className={`es-voz-rec is-${fase}`} disabled={fase !== "pronto"} onClick={() => void gravar()}>
        <b>{fase === "contagem" ? "1 2 3 4" : fase === "gravando" ? "gravando…" : fase === "abrindo" ? "abrindo o microfone…" : fase === "calibrando" ? "ouvindo os cliques…" : tem ? "gravar de novo" : "gravar voz"}</b>
        <small>{secao.nome} · {secao.compassos} compassos · {musica.bpm} bpm</small>
      </button>
      <p className="es-dica">use fone de ouvido. conta 4 e grava a seção inteira, no tempo. {atraso === null ? "calibre uma vez pra ficar perfeito ↓" : `atraso calibrado: ${Math.round(atraso * 1000)} ms`}</p>
      <div className="es-tocar-barra">
        <button type="button" disabled={fase !== "pronto"} onClick={() => void calibrar()}>calibrar o atraso (sem fone)</button>
        {tem && <button type="button" className="es-apagar" onClick={() => mudar((m) => ({ ...m, secoes: m.secoes.map((s) => { if (s.id !== secao.id) return s; const vz = { ...s.voz }; delete vz[faixa.id]; return { ...s, voz: vz } }) }))}>apagar a voz desta seção</button>}
      </div>
    </div>
  )
}
