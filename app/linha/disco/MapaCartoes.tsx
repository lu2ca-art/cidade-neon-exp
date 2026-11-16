"use client"

// O MAPA ILUSTRADO E OS CARTÕES (16/11, o dono, episodios.md "O mapa, os cartões
// e a traição"). O mapa inteiro, desenhado e lúdico, em camadas que se
// alternam: a CIDADE (o disco, lá em cima), o SUBÚRBIO com o DESERTO em volta (lá
// embaixo) e os TÚNEIS. Em cada camada, um ícone por missão no lugar dela:
// tocar abre o cartão do personagem (disco/cartoes.ts). A aba FEIRA mostra os
// mesmos cartões em lista (é o que o ícone do holo abre).
//
// Desempenho: é SVG parado, desenhado uma vez ao abrir (as contas no useMemo);
// nada por quadro, nem aberto (o pulso é CSS e some com "reduzir movimento").
// Fechado, nem existe: a Corrida carrega este arquivo só no primeiro toque.

import { useEffect, useMemo, useRef, useState } from "react"
import type { MundoDisco } from "../estrada/mundoDisco"
import type { HistoriaDisco } from "./historia"
import { CASA, CHAO_FIXOS, CHAO_LUGARES, CHAO_PONTAS, SUBURBIO } from "./historia"
import { ruinasNoMundo } from "../estrada/ruinas"
import { PECAS_RUINAS } from "../estrada/ruinasDados"
import { CANTOS_RUA } from "./corridaRua"
import { PORTA_DESERTO, portaDoDeserto } from "./elevadores"
import { pontoDoAlvo, pontoVia } from "../estrada/alvoMissao"
import { ICONE_MISSAO } from "../estrada/Holo"
import { AVENIDAS, SALOES, SALAO_DESCIDA } from "../trincheiras/mapa"
import { cartaoDe, cartoesDe, iconesDosCartoes, iniciais, type Cartao, type IconeCartao } from "./cartoes"
import { EPISODIOS } from "./episodios"
import { pedirEntrega } from "./entrega"
import type { PistaId } from "../estrada/pistas"
import type { MissaoId } from "./portas"
import "./mapaCartoes.css"

export type AbaMapa = "cidade" | "suburbio" | "tuneis" | "feira"
type PoseMin = { via: number; u: number; wx?: number; wz?: number; livreOk?: boolean; voo?: boolean }

// ── os números do desenho (o designer ajusta aqui) ──
export const MAPA_CARTOES_CFG = {
  // lá embaixo: até este raio (m, a partir do meio do subúrbio) a escala é a de verdade;
  // depois o deserto se comprime (a casa da D-Bee e o palco do deserto cabem na tela)
  raioReal: SUBURBIO.r + 80,
  comprime: 220, // m de tela por "dobra" do deserto
  dobra: 400, // m de deserto por dobra
  icone: 0.034, // o ícone, em fração da largura da vista
  rotulo: 0.018, // a letra dos lugares, em fração da largura da vista
}

// o deserto comprimido em volta do subúrbio (perto: a escala de verdade; longe: um log)
function lupa(x: number, z: number): [number, number] {
  const C = MAPA_CARTOES_CFG
  const dx = x - SUBURBIO.x, dz = z - SUBURBIO.z, d = Math.hypot(dx, dz)
  if (d <= C.raioReal || d === 0) return [dx, dz]
  const d2 = C.raioReal + C.comprime * Math.log(1 + (d - C.raioReal) / C.dobra)
  return [(dx / d) * d2, (dz / d) * d2]
}
const NOME_ABA: Record<AbaMapa, string> = { cidade: "cidade", suburbio: "subúrbio", tuneis: "túneis", feira: "feira" }

export function MapaCartoes({ M, historia, pose, apagada, aba: abaInicial, onIr, onFechar }: {
  M: MundoDisco
  historia: HistoriaDisco
  pose: React.RefObject<PoseMin>
  apagada?: boolean[] | null
  // "mapa" abre na camada de onde a pessoa está; "feira", na lista dos cartões
  aba: "mapa" | "feira"
  // marcar a missão no mapa (a rota acende; chegar lá começa)
  onIr: (id: MissaoId) => void
  onFechar: () => void
}) {
  // onde a pessoa está (lido uma vez, ao abrir)
  const eu = useMemo(() => {
    const p = pose.current
    if (!p) return null
    if ((p.livreOk || p.voo) && p.wx !== undefined && p.wz !== undefined) return { camada: "suburbio" as const, x: p.wx, z: p.wz }
    const w = pontoVia(M, p.via, p.u)
    return w ? { camada: "cidade" as const, x: w.x, z: w.z } : null
  }, [M, pose])
  const [aba, setAba] = useState<AbaMapa>(() => (abaInicial === "feira" ? "feira" : eu?.camada ?? "cidade"))
  const [aberto, setAberto] = useState<PistaId | null>(null)
  const cartoes = useMemo(() => cartoesDe(historia), [historia])
  const icones = useMemo(() => iconesDosCartoes(historia), [historia])
  const estadoDe = useMemo(() => new Map(cartoes.map((c) => [c.ep.id, c.estado])), [cartoes])

  // Esc fecha o cartão, depois o mapa
  const fechar = useRef(onFechar)
  fechar.current = onFechar
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key !== "Escape") return; e.stopPropagation(); setAberto((a) => { if (a === null) fechar.current(); return null }) }
    window.addEventListener("keydown", k, true)
    return () => window.removeEventListener("keydown", k, true)
  }, [])

  const cartao = aberto ? cartaoDe(historia, EPISODIOS.find((e) => e.id === aberto)!) : null
  return (
    <div className="l-mc" role="dialog" aria-label="o mapa e as missões" onPointerDown={(e) => e.stopPropagation()}>
      <header className="l-mc-topo">
        <nav className="l-mc-abas" aria-label="as camadas do mapa">
          {(["cidade", "suburbio", "tuneis", "feira"] as AbaMapa[]).map((a) => (
            <button key={a} type="button" className={aba === a ? "is-on" : ""} aria-pressed={aba === a} onClick={() => setAba(a)}>
              {a === "cidade" ? "▲ " : a === "suburbio" ? "▼ " : a === "tuneis" ? "◆ " : "★ "}{NOME_ABA[a]}
            </button>
          ))}
        </nav>
        <button type="button" className="l-mc-x" aria-label="fechar o mapa" onClick={onFechar}>×</button>
      </header>
      <div key={aba} className={`l-mc-vista is-${aba}`}>
        {aba === "cidade" && <VistaCidade M={M} apagada={apagada} icones={icones} estadoDe={estadoDe} eu={eu?.camada === "cidade" ? eu : null} onIcone={setAberto} />}
        {aba === "suburbio" && <VistaSuburbio M={M} icones={icones} estadoDe={estadoDe} eu={eu?.camada === "suburbio" ? eu : null} onIcone={setAberto} />}
        {aba === "tuneis" && <VistaTuneis icones={icones} estadoDe={estadoDe} onIcone={setAberto} />}
        {aba === "feira" && <Feira cartoes={cartoes} onAbrir={setAberto} />}
      </div>
      {aba !== "feira" && (
        <p className="l-mc-legenda" aria-hidden="true"><i className="is-aberto" />dá pra fazer agora <i className="is-feito" />feito <i className="is-trancado" />trancado · toca num ícone</p>
      )}
      {cartao && <CartaoMissao c={cartao} onIr={(id) => { onIr(id); onFechar() }} onEntregar={(id) => { onFechar(); pedirEntrega(id) }} onFechar={() => setAberto(null)} />}
    </div>
  )
}

// ── o ícone de uma missão no mapa (SVG; s = o tamanho na vista) ──
function Icone({ ic, x, z, s, estado, onIcone }: { ic: IconeCartao; x: number; z: number; s: number; estado: Cartao["estado"] | undefined; onIcone: (ep: PistaId) => void }) {
  const ep = EPISODIOS.find((e) => e.id === ic.ep)!
  const est = ic.feito ? "feito" : estado ?? "trancado"
  return (
    <g className={`l-mc-ic is-${est}`} transform={`translate(${x} ${z}) scale(${s / 24})`} style={{ ["--cor" as string]: ic.cor }}
      role="button" tabIndex={0} aria-label={`${ep.quem}: abrir o cartão`}
      onClick={() => onIcone(ic.ep)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onIcone(ic.ep) } }}>
      {est === "aberto" && <circle className="l-mc-ic-pulso" r="17" />}
      <circle className="l-mc-ic-fundo" r="13" />
      <path className="l-mc-ic-glifo" d={ICONE_MISSAO[ic.ep] ?? ""} transform="translate(-12 -12)" />
      {est === "feito" && <path className="l-mc-ic-ok" d="M6 13l3 3 7-7" transform="translate(4 -22)" />}
      {est === "trancado" && <g className="l-mc-ic-cadeado" transform="translate(9 -17)"><rect x="-4" y="0" width="8" height="6" rx="1" /><path d="M-2.4 0v-2a2.4 2.4 0 0 1 4.8 0v2" /></g>}
      <text className="l-mc-ic-nome" y="25" textAnchor="middle">{ep.quem}</text>
    </g>
  )
}
function Voce({ x, z, s }: { x: number; z: number; s: number }) {
  return (
    <g className="l-mc-voce" transform={`translate(${x} ${z}) scale(${s / 24})`} aria-label="você está aqui">
      <circle r="9" /><circle r="3.5" className="is-miolo" />
      <text y="-13" textAnchor="middle">você</text>
    </g>
  )
}

// ── LÁ EM CIMA: a cidade-disco (as pistas como sulcos de um vinil) ──
function VistaCidade({ M, apagada, icones, estadoDe, eu, onIcone }: { M: MundoDisco; apagada?: boolean[] | null; icones: IconeCartao[]; estadoDe: Map<string, Cartao["estado"]>; eu: { x: number; z: number } | null; onIcone: (ep: PistaId) => void }) {
  const d = useMemo(() => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
    const linhas = M.vias.map((v, i) => {
      let s = ""
      for (let k = 0; k < v.n; k += 4) { const x = v.px[k], z = v.pz[k]; s += `${k ? "L" : "M"}${x.toFixed(0)} ${z.toFixed(0)}`; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z) }
      if (v.fechada) s += "Z"
      return { s, cor: apagada?.[i] ? "#3a3650" : (v as { cor?: string }).cor ?? "#888", saida: v.tipo === "saida", apagada: !!apagada?.[i] }
    })
    const pad = 140
    const vb = { x: x0 - pad, z: z0 - pad, w: x1 - x0 + pad * 2, h: z1 - z0 + pad * 2 }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = Math.max(x1 - x0, z1 - z0) / 2 + 60
    // o nome de cada pista, num ponto da ida dela
    const nomes = M.pistas.map((p) => { const v = M.vias[p.ida], k = Math.floor(v.n * 0.42); return { nome: p.nome, cor: p.cor, x: v.px[k], z: v.pz[k], apagada: !!apagada?.[p.ida] } })
    const pts = icones.filter((ic) => ic.lugar.lugar).flatMap((ic) => { const p = pontoDoAlvo(M, ic.lugar); return p ? [{ ic, x: p.x, z: p.z }] : [] })
    return { linhas, vb, cx, cz, R, nomes, pts }
  }, [M, apagada, icones])
  const s = d.vb.w * MAPA_CARTOES_CFG.icone, f = d.vb.w * MAPA_CARTOES_CFG.rotulo
  return (
    <svg className="l-mc-svg" viewBox={`${d.vb.x} ${d.vb.z} ${d.vb.w} ${d.vb.h}`} preserveAspectRatio="xMidYMid meet" aria-label="a cidade, lá em cima">
      {/* o disco: os sulcos do vinil embaixo das pistas */}
      <g className="l-mc-vinil">
        {[1, 0.86, 0.72, 0.58, 0.44, 0.3].map((k) => <circle key={k} cx={d.cx} cy={d.cz} r={d.R * k} />)}
        <circle className="is-selo" cx={d.cx} cy={d.cz} r={d.R * 0.12} />
      </g>
      {d.linhas.map((l, i) => <path key={i} d={l.s} className={`l-mc-pista${l.saida ? " is-saida" : ""}${l.apagada ? " is-apagada" : ""}`} style={{ ["--cor" as string]: l.cor }} />)}
      {M.torres.map((t, i) => <g key={i} className="l-mc-torre" transform={`translate(${t.x} ${t.z})`}><circle r={f * 0.9} /><text y={f * 0.35} fontSize={f * 0.9} textAnchor="middle">{i + 1}</text></g>)}
      {d.nomes.map((n) => <text key={n.nome} className={`l-mc-rotulo-pista${n.apagada ? " is-apagada" : ""}`} x={n.x} y={n.z} fontSize={f} style={{ ["--cor" as string]: n.cor }} textAnchor="middle">{n.nome}</text>)}
      {eu && <Voce x={eu.x} z={eu.z} s={s} />}
      {d.pts.map(({ ic, x, z }) => <Icone key={ic.chave} ic={ic} x={x} z={z} s={s} estado={estadoDe.get(ic.ep)} onIcone={onIcone} />)}
    </svg>
  )
}

// ── LÁ EMBAIXO: o subúrbio (as ruas claras) e o deserto em volta ──
function VistaSuburbio({ M, icones, estadoDe, eu, onIcone }: { M: MundoDisco; icones: IconeCartao[]; estadoDe: Map<string, Cartao["estado"]>; eu: { x: number; z: number } | null; onIcone: (ep: PistaId) => void }) {
  const d = useMemo(() => {
    // as quadras das ruínas (as mesmas do mundo): o que sobra entre elas é rua
    const quadras: { x: number; z: number; w: number; h: number; giro: number }[] = []
    for (const p of ruinasNoMundo(M).postas) {
      const P = PECAS_RUINAS[p.peca], s = Math.sin(p.giro), c = Math.cos(p.giro)
      for (const [cx, cz, hx, hz] of P.caixas) {
        const [x, z] = lupa(p.x + cx * c + cz * s, p.z - cx * s + cz * c)
        quadras.push({ x, z, w: hx * 2, h: hz * 2, giro: (-p.giro * 180) / Math.PI })
      }
    }
    // a rua principal: a volta da corrida (a rua de verdade do subúrbio)
    const rua = CANTOS_RUA.map(([x, z], i) => { const [a, b] = lupa(x, z); return `${i ? "L" : "M"}${a.toFixed(1)} ${b.toFixed(1)}` }).join("") + "Z"
    const [f0, f1] = CHAO_PONTAS.map((p) => lupa(p.x, p.z))
    // os lugares do chão (tudo visitável: todos no mapa) e os do deserto
    const lugares = CHAO_FIXOS.filter((k) => k !== "palcoDeserto").map((k) => { const c = CHAO_LUGARES[k]; const [x, z] = lupa(c.x, c.z); return { k: k as string, nome: c.nome, cor: c.cor, x, z } })
    const deserto = [
      { k: "casa", nome: CHAO_LUGARES.casa.nome, cor: CHAO_LUGARES.casa.cor, p: lupa(CASA.x, CASA.z) },
      { k: "palcoDeserto", nome: "PALCO DO DESERTO", cor: CHAO_LUGARES.palcoDeserto.cor, p: lupa(CHAO_LUGARES.palcoDeserto.x, CHAO_LUGARES.palcoDeserto.z) },
    ]
    const pd = portaDoDeserto(M), porta = lupa(pd.x, pd.z)
    // as torres (o pé delas) e a sombra das pistas lá em cima, bem de leve
    const torres = M.torres.map((t) => lupa(t.x, t.z))
    const pts = icones.filter((ic) => ic.lugar.chao).map((ic) => { const c = CHAO_LUGARES[ic.lugar.chao!]; const [x, z] = lupa(c.x, c.z); return { ic, x, z } })
    // o tamanho da vista: o deserto inteiro comprimido
    let r = MAPA_CARTOES_CFG.raioReal
    for (const q of [...deserto.map((x) => x.p), porta, ...torres]) r = Math.max(r, Math.hypot(q[0], q[1]))
    r += 90
    return { quadras, rua, feira: [f0, f1], lugares, deserto, porta, torres, pts, r }
  }, [M, icones])
  const W = d.r * 2, s = W * MAPA_CARTOES_CFG.icone, f = W * MAPA_CARTOES_CFG.rotulo
  const voce = eu ? lupa(eu.x, eu.z) : null
  return (
    <svg className="l-mc-svg" viewBox={`${-d.r} ${-d.r} ${W} ${W}`} preserveAspectRatio="xMidYMid meet" aria-label="o subúrbio e o deserto, lá embaixo">
      <defs>
        <pattern id="l-mc-dunas" width="120" height="60" patternUnits="userSpaceOnUse"><path d="M0 40 Q30 20 60 40 T120 40" /></pattern>
      </defs>
      <circle className="l-mc-deserto" r={d.r} />
      <circle className="l-mc-dunas" r={d.r} fill="url(#l-mc-dunas)" />
      <text className="l-mc-zona" x={-d.r * 0.55} y={-d.r * 0.62} fontSize={f * 1.6}>DESERTO</text>
      <circle className="l-mc-sub" r={SUBURBIO.r} />
      <text className="l-mc-zona is-sub" y={-SUBURBIO.r - f * 0.8} fontSize={f * 1.3} textAnchor="middle">SUBÚRBIO</text>
      {d.quadras.map((q, i) => <rect key={i} className="l-mc-quadra" x={-q.w / 2} y={-q.h / 2} width={q.w} height={q.h} transform={`translate(${q.x.toFixed(1)} ${q.z.toFixed(1)}) rotate(${q.giro.toFixed(0)})`} />)}
      {/* as vias claras: a rua principal (a volta da corrida) e a rua da feira */}
      <path className="l-mc-rua" d={d.rua} />
      <path className="l-mc-rua-meio" d={d.rua} />
      <line className="l-mc-rua is-feira" x1={d.feira[0][0]} y1={d.feira[0][1]} x2={d.feira[1][0]} y2={d.feira[1][1]} />
      {d.torres.map((t, i) => <g key={i} className="l-mc-torre" transform={`translate(${t[0]} ${t[1]})`}><circle r={f * 0.9} /><text y={f * 0.35} fontSize={f * 0.9} textAnchor="middle">{i + 1}</text></g>)}
      <g className="l-mc-lugar is-porta" transform={`translate(${d.porta[0]} ${d.porta[1]})`} style={{ ["--cor" as string]: PORTA_DESERTO.cor }}>
        <rect x={-f * 0.5} y={-f * 0.7} width={f} height={f * 1.4} rx={f * 0.2} />
        <text x={f * 0.9} y={f * 0.35} fontSize={f * 0.8}>{PORTA_DESERTO.nome}</text>
      </g>
      {d.lugares.map((l) => (
        <g key={l.k} className="l-mc-lugar" transform={`translate(${l.x} ${l.z})`} style={{ ["--cor" as string]: l.cor }}>
          <circle r={f * 0.45} />
          <text x={f * 0.75} y={f * 0.32} fontSize={f * 0.75}>{l.nome}</text>
        </g>
      ))}
      {d.deserto.map((l) => (
        <g key={l.k} className="l-mc-lugar is-deserto" transform={`translate(${l.p[0]} ${l.p[1]})`} style={{ ["--cor" as string]: l.cor }}>
          <circle r={f * 0.6} />
          <text y={f * 1.9} fontSize={f * 0.85} textAnchor="middle">{l.nome}</text>
        </g>
      ))}
      {voce && <Voce x={voce[0]} z={voce[1]} s={s} />}
      {d.pts.map(({ ic, x, z }) => <Icone key={ic.chave} ic={ic} x={x} z={z} s={s} estado={estadoDe.get(ic.ep)} onIcone={onIcone} />)}
    </svg>
  )
}

// ── OS TÚNEIS: os rios secos e os salões (trincheiras/mapa.ts) ──
function VistaTuneis({ icones, estadoDe, onIcone }: { icones: IconeCartao[]; estadoDe: Map<string, Cartao["estado"]>; onIcone: (ep: PistaId) => void }) {
  const d = useMemo(() => {
    let r = 0
    for (const s of SALOES) r = Math.max(r, Math.hypot(s.c.x, s.c.z) + s.r)
    r += 120
    const rios = AVENIDAS.map((a) => ({ nome: a.nome, cor: a.cor, d: a.pts.filter((_, k) => k % 3 === 0 || k === a.pts.length - 1).map((p, k) => `${k ? "L" : "M"}${p.x.toFixed(0)} ${p.z.toFixed(0)}`).join(""), meio: a.pts[Math.floor(a.pts.length / 2)] }))
    // a missão dos túneis mora na descida (a boca do subúrbio dá aqui)
    const pts = icones.filter((ic) => ic.lugar.chao === "tuneis").map((ic) => ({ ic, x: SALAO_DESCIDA.c.x, z: SALAO_DESCIDA.c.z }))
    return { r, rios, pts }
  }, [icones])
  const W = d.r * 2, s = W * MAPA_CARTOES_CFG.icone, f = W * MAPA_CARTOES_CFG.rotulo
  return (
    <svg className="l-mc-svg" viewBox={`${-d.r} ${-d.r} ${W} ${W}`} preserveAspectRatio="xMidYMid meet" aria-label="os túneis">
      <circle className="l-mc-terra" r={d.r} />
      {d.rios.map((x) => <path key={x.nome} className="l-mc-rio" d={x.d} style={{ ["--cor" as string]: x.cor }} />)}
      {d.rios.map((x) => <text key={x.nome} className="l-mc-rotulo-pista" x={x.meio.x} y={x.meio.z} fontSize={f * 0.8} style={{ ["--cor" as string]: x.cor }} textAnchor="middle">{x.nome}</text>)}
      {SALOES.map((sa) => (
        <g key={sa.i} className={`l-mc-salao is-${sa.tipo}`} transform={`translate(${sa.c.x} ${sa.c.z})`}>
          <circle r={sa.r} />
          <text y={sa.r + f * 1.1} fontSize={f * 0.85} textAnchor="middle">{sa.nome}</text>
        </g>
      ))}
      {d.pts.map(({ ic, x, z }) => <Icone key={ic.chave} ic={ic} x={x} z={z} s={s} estado={estadoDe.get(ic.ep)} onIcone={onIcone} />)}
    </svg>
  )
}

// ── A FEIRA DE MISSÕES E RECOMPENSAS: os mesmos cartões, em lista ──
function Feira({ cartoes, onAbrir }: { cartoes: Cartao[]; onAbrir: (ep: PistaId) => void }) {
  return (
    <ul className="l-mc-feira" aria-label="a feira de missões e recompensas">
      {cartoes.map((c) => (
        <li key={c.ep.id}>
          <button type="button" className={`l-mc-mini is-${c.estado}`} style={{ ["--cor" as string]: c.cor }} onClick={() => onAbrir(c.ep.id)}>
            <Retrato c={c} />
            <span className="l-mc-mini-txt">
              <small>ep. {c.n} · {c.musica}</small>
              <b>{c.quem}</b>
              {c.entrega && <em>{c.entrega.agua.toLocaleString("pt-BR")} Água$</em>}
            </span>
            <span className="l-mc-mini-est">{c.estado === "feito" ? "✓ feito" : c.estado === "aberto" ? "agora" : "trancado"}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// a foto: a imagem do personagem (quando houver) ou o retrato ilustrado na cor dele
function Retrato({ c }: { c: Cartao }) {
  if (c.texto.foto) return <span className="l-mc-foto"><img src={c.texto.foto} alt={c.quem} loading="lazy" /></span>
  return (
    <span className="l-mc-foto" style={{ ["--cor" as string]: c.cor }}>
      <svg viewBox="0 0 100 120" role="img" aria-label={`retrato de ${c.quem}`}>
        <rect width="100" height="120" className="is-fundo" />
        {[52, 40, 28].map((r) => <circle key={r} cx="50" cy="52" r={r} className="is-sulco" />)}
        <path className="is-corpo" d="M14 120c2-22 16-34 36-34s34 12 36 34z" />
        <circle className="is-cabeca" cx="50" cy="52" r="21" />
        <text x="50" y="59" textAnchor="middle" className="is-ini">{iniciais(c.quem)}</text>
        <rect y="104" width="100" height="16" className="is-faixa" />
        <text x="50" y="116" textAnchor="middle" className="is-nome">{c.quem.toUpperCase()}</text>
      </svg>
    </span>
  )
}

// ── O CARTÃO ──
function CartaoMissao({ c, onIr, onEntregar, onFechar }: { c: Cartao; onIr: (id: MissaoId) => void; onEntregar: (id: MissaoId) => void; onFechar: () => void }) {
  const bt = useRef<HTMLButtonElement>(null)
  useEffect(() => { bt.current?.focus() }, [c.ep.id])
  // entregar não tem volta: o primeiro toque pergunta, o segundo entrega
  const [certeza, setCerteza] = useState(false)
  useEffect(() => { setCerteza(false) }, [c.ep.id])
  const liberar = c.estado === "aberto" ? c.proxima : null
  const entrega = c.entrega?.pode ? c.entrega : null
  return (
    <div className="l-mc-fundo" onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <article className={`l-cartao is-${c.estado}`} style={{ ["--cor" as string]: c.cor }} aria-label={`cartão de ${c.quem}`}>
        <header className="l-cartao-topo">
          <small>ep. {c.n} · {c.musica}</small>
          <button ref={bt} type="button" className="l-mc-x" aria-label="fechar o cartão" onClick={onFechar}>×</button>
        </header>
        <div className="l-cartao-cara">
          <Retrato c={c} />
          <div>
            <h3>{c.quem}</h3>
            {c.entrega && <p className="l-cartao-recompensa"><small>recompensa</small><b>{c.entrega.agua.toLocaleString("pt-BR")}</b> Água$</p>}
            <p className="l-cartao-crime"><small>o crime</small>{c.texto.crime}</p>
          </div>
        </div>
        <section className="l-cartao-lista">
          <h4>o que você vai encontrar</h4>
          <ul>{c.joga.map((x, i) => <li key={i} className={x.feito ? "is-feito" : ""}><i aria-hidden="true">{x.feito ? "✓" : "▸"}</i>{x.texto}</li>)}</ul>
          <h4>o que libera</h4>
          <ul>{c.libera.map((x, i) => <li key={i} className={x.feito ? "is-feito" : ""}><i aria-hidden="true">{x.feito ? "✓" : "◆"}</i>{x.texto}</li>)}</ul>
        </section>
        {/* (16/11) A ESCOLHA: liberar a experiência (o caminho de aceitar a missão: marca no
            mapa e chegar lá começa) ou entregar o personagem (disco/entrega.ts: a recompensa
            de ENTREGA_CFG, depois o hack e as incubadoras). Entregar só aparece com podeEntregar */}
        <div className="l-cartao-escolha">
          {liberar && <button type="button" className="l-cartao-ir" onClick={() => onIr(liberar)}>liberar</button>}
          {entrega && !certeza && <button type="button" className="l-cartao-entregar" onClick={() => setCerteza(true)}>entregar · {entrega.agua.toLocaleString("pt-BR")} Água$</button>}
          {entrega && certeza && <button type="button" className="l-cartao-entregar is-certeza" onClick={() => onEntregar(entrega.missao)}>entregar {c.quem}? sim</button>}
        </div>
        <footer className="l-cartao-pe">
          {c.estado === "feito" && <span className="l-cartao-est">✓ feito</span>}
          {c.estado === "trancado" && <span className="l-cartao-est is-tranca"><i aria-hidden="true" className="l-cartao-cadeado" />{c.cadeado}</span>}
        </footer>
      </article>
    </div>
  )
}
