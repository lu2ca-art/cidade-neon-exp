"use client"

// O MAPA (LU2CA 14/10: "no jeito do GTA / Watch Dogs"). Um minimapa redondo
// no canto, girando com a Kombi (a frente sempre pra cima), com as ruas por
// perto, os lugares, a rota até o destino em destaque e a distância. Tocar
// nele abre o mapa grande: a cidade inteira, norte pra cima; tocar num lugar
// (ou numa rua) marca o destino e a rota se refaz sozinha. Sem destino
// marcado, a rota vai pra missão.

import { useEffect, useMemo, useRef, useState } from "react"
import { posicao, type Mundo } from "./mundo"
import { distritoDe } from "./mundo"
import { PASSO } from "./pista"
import { calcularRota, pontoMaisPerto, type Ponto, type Rota } from "./rota"
import { LUGARES, type LugarId } from "../lugares"
import { CANTEIROS } from "./Flores"
import { PARQUE } from "./Parque"
import { PAGINAS } from "../paginas"
import { pintarCarta } from "./carta"
import { ESCALA, H as HU, W as WU } from "../rede/terreno"
import { ICONE_MISSAO } from "./Holo"
import type { LugarChao } from "../disco/historia"
import { NAV } from "./nav"
import { pontosDoMapa, type IconeMapa } from "./pontosMapa"
import { brilha } from "../disco/brilho"
export type { IconeMapa } from "./pontosMapa"

export interface Marca extends Ponto { nome: string; cor: string }
interface Blip extends Ponto { id: string; nome: string; cor: string; tipo: "lugar" | "posto" | "parque" | "flor" }
interface PoseKombi { via: number; u: number; x: number; v: number; wx?: number; wz?: number; rumo?: number; livreOk?: boolean; voo?: boolean }

const ROTA_COR = "#ff3fb0"
// (23/10) os lugares do chão do subúrbio (a oficina, o bar, o palco) ficam fora das
// pistas: no mapa, um ponto em coordenada de mundo, com halo pulsando pra achar
// (T09) os achados da oficina (o painel, a goteira) não são lugar: ficam fora do mapa fixo
function desenharChao(g: CanvasRenderingContext2D, x: number, y: number, cor: string, k: number, agora: number) {
  const p = 0.5 + 0.5 * Math.sin(agora / 320)
  g.globalAlpha = 0.18 + 0.22 * p; g.fillStyle = cor; g.beginPath(); g.arc(x, y, (10 + 5 * p) * k, 0, 7); g.fill(); g.globalAlpha = 1
  g.fillStyle = "#0b0a12"; g.beginPath(); g.arc(x, y, 6.5 * k, 0, 7); g.fill()
  g.strokeStyle = cor; g.lineWidth = 2 * k; g.beginPath(); g.arc(x, y, 6.5 * k, 0, 7); g.stroke()
  g.fillStyle = cor; g.fillRect(x - 2.6 * k, y - 2.6 * k, 5.2 * k, 5.2 * k)
}
// (22/10) as missões no mapa: um ícone por missão
// (missões claras, 02/11) no LUGAR da missão (estrada/alvoMissao.ts: o mesmo ponto
// do gatilho), não mais na pista da faixa. `agora` = a pegada (maior, pulsando,
// com o nome); `feita` = apagada; o resto, as que dá pra pegar. `icone` = a
// chave do desenho (ICONE_MISSAO, a faixa); `faixa` = o rótulo embaixo
interface IconeDesenho extends IconeMapa { x: number; z: number; forma: Path2D | null }
const DASH = [14, 22], SEM_DASH: number[] = []
// o caminho acendendo: um tracejado claro correndo por cima da rota, no sentido da Kombi pro destino
function acenderRota(g: CanvasRenderingContext2D, segs: TrechoDesenho[], tela: (x: number, z: number) => [number, number], larg: number, agora: number) {
  g.setLineDash(DASH); g.lineDashOffset = -agora * 0.05
  g.strokeStyle = "#ffffff"; g.globalAlpha = 0.85; g.lineWidth = Math.max(1.5, larg * 0.45)
  for (const s of segs) {
    g.beginPath()
    for (let i = 0; i < s.pts.length; i += 2) { const [x, y] = tela(s.pts[i], s.pts[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y) }
    g.stroke()
  }
  g.setLineDash(SEM_DASH); g.globalAlpha = 1
}
function desenharIcone(g: CanvasRenderingContext2D, x: number, y: number, ic: IconeDesenho, k: number, agora: number) {
  const r = (ic.agora ? 19 : ic.feita ? 9 : 13) * k
  // (missões claras) a feita: só um anel apagado com o ✓
  if (ic.feita) {
    g.globalAlpha = 0.45; g.fillStyle = "#07060c"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill()
    g.strokeStyle = ic.cor; g.lineWidth = 1.5 * k; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke()
    g.beginPath(); g.moveTo(x - 4 * k, y); g.lineTo(x - 1 * k, y + 3 * k); g.lineTo(x + 4.5 * k, y - 3.5 * k); g.stroke()
    g.globalAlpha = 1
    return
  }
  // o halo pulsando (o destaque): a de agora pulsa mais forte e mais largo
  const s = 0.5 + 0.5 * Math.sin(agora / (ic.agora ? 220 : 320))
  g.globalAlpha = ic.agora ? 0.3 + 0.35 * s : 0.14 + 0.16 * s; g.fillStyle = ic.cor
  g.beginPath(); g.arc(x, y, r + (ic.agora ? 8 + 10 * s : 4 + 4 * s) * k, 0, 7); g.fill()
  g.globalAlpha = 1
  g.fillStyle = "#07060c"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill()
  g.strokeStyle = ic.cor; g.lineWidth = 2.5 * k; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke()
  if (ic.forma) {
    const e = (r * 1.25) / 24
    g.save(); g.translate(x - 12 * e, y - 12 * e); g.scale(e, e)
    g.lineWidth = 2; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(ic.forma)
    g.restore()
  }
}

// os pontos de cada via (em metros do mundo), um a cada ~8 m
function amostrarVias(M: Mundo) {
  return M.vias.map((v) => {
    const pts: number[] = []
    for (let i = 0; i < v.n; i += 4) pts.push(v.px[i], v.pz[i])
    if (v.fechada) pts.push(v.px[0], v.pz[0])
    // (disco) cada linha na cor dela, a mesma do diagrama
    return { pts, cor: (v as typeof v & { cor?: string }).cor ?? distritoDe(v.t).luz[0], saida: v.tipo === "saida" }
  })
}

// (T42, J2:15) o ícone da missão na pista: o ponto dela no espalhar (mundoDisco), senão a pouco mais da metade
export const uDaMissao = (M: Mundo, pista: string, n: number) => M.onde?.(`missao:${pista}`)?.u ?? (n - 1) * PASSO * 0.55

export function noMundo(M: Mundo, p: Ponto) {
  const v = M.vias[p.via]
  const i = v.fechada ? ((Math.round(p.u / PASSO) % v.n) + v.n) % v.n : Math.max(0, Math.min(v.n - 1, Math.round(p.u / PASSO)))
  return { x: v.px[i], z: v.pz[i], tx: v.tx[i], tz: v.tz[i] }
}

// (21/10, o mapa que ensina) a pista disponível pulsa (brilho e espessura no
// ritmo de ~1 s); a pista em foco brilha forte; a feita fica acesa e parada
function pulso(g: CanvasRenderingContext2D, v: { cor: string; aberta?: boolean; foco?: boolean | null; saida?: boolean }, agora: number, k: number) {
  if (v.saida) return
  if (v.foco) { g.globalAlpha = 1; g.lineWidth += 2 * k; g.shadowColor = v.cor; g.shadowBlur = 12 * k; return }
  if (!v.aberta) return
  const s = 0.5 + 0.5 * Math.sin((agora / 1000) * Math.PI * 2)
  g.globalAlpha = Math.max(g.globalAlpha, 0.75 + 0.25 * s)
  g.lineWidth += (1 + 1.5 * s) * k
  g.shadowColor = v.cor; g.shadowBlur = (4 + 10 * s) * k
}

// a cor de uma via (no disco, cada pista tem a da linha dela)
const corDaVia = (M: Mundo, via: number) => ("disco" in M ? (M.vias[via] as { cor?: string }).cor : undefined) ?? ROTA_COR
// a rota como trechos de pontos do mundo, cada um na cor da pista por onde passa
// (LU2CA 21/10: "a marcação no mapa acende mais ainda a mesma cor da pista
// selecionada. tira esse rosa que sobrepõe")
type TrechoDesenho = { cor: string; pts: number[] }
function linhaDaRota(M: Mundo, r: Rota) {
  const out: TrechoDesenho[] = []
  for (const t of r.trechos) {
    const cor = corDaVia(M, t.via)
    let seg = out[out.length - 1]
    if (!seg || seg.cor !== cor) { const ult = seg?.pts.slice(-2) ?? []; seg = { cor, pts: [...ult] }; out.push(seg) }
    for (let u = t.u0; u <= t.u1; u += 8) { const p = noMundo(M, { via: t.via, u }); seg.pts.push(p.x, p.z) }
    const p = noMundo(M, { via: t.via, u: t.u1 }); seg.pts.push(p.x, p.z)
  }
  return out
}
// desenha a rota: a pista marcada brilha na cor dela, acima das outras (um
// halo largo e suave e o traço por cima, mais claro)
function desenharRota(g: CanvasRenderingContext2D, segs: TrechoDesenho[], tela: (x: number, z: number) => [number, number], larg: number) {
  for (const passe of [0, 1]) {
    for (const s of segs) {
      g.strokeStyle = s.cor
      g.globalAlpha = passe ? 1 : 0.35
      g.lineWidth = passe ? larg : larg * 2.6
      g.shadowColor = s.cor; g.shadowBlur = passe ? larg * 2.2 : 0
      g.beginPath()
      for (let i = 0; i < s.pts.length; i += 2) { const [x, y] = tela(s.pts[i], s.pts[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y) }
      g.stroke()
    }
  }
  g.globalAlpha = 1; g.shadowBlur = 0
}

export function blipsDo(M: Mundo): Blip[] {
  const b: Blip[] = []
  for (const l of Object.values(LUGARES)) {
    if (l.segredo || l.soChao || (l.soDisco && !("disco" in M))) continue
    const o = posicao(M, `lugar:${l.id}`, l.area, l.u, l.lado, l.via)
    if (o.via < 0) continue
    b.push({ id: l.id, nome: l.nome, cor: l.cor, via: o.via, u: o.u, tipo: l.id === "posto" ? "posto" : "lugar" })
  }
  for (const lp of PAGINAS) if (!lp.lugar) { const o = posicao(M, `pagina:${lp.id}`, lp.area, lp.u, lp.lado); b.push({ id: lp.id, nome: lp.nome, cor: lp.cor, via: o.via, u: o.u, tipo: "lugar" }) }
  { const o = posicao(M, "parque", PARQUE.area, PARQUE.u, PARQUE.lado); b.push({ id: "parque", nome: "o parque", cor: "#ff5b5b", via: o.via, u: o.u, tipo: "parque" }) }
  if (!("ligacoes" in M)) for (const c of CANTEIROS) { const o = posicao(M, `flor:${c.id}`, c.area, c.u, c.lado); b.push({ id: `flor-${c.id}`, nome: "um canteiro da Ella", cor: "#2fe8ff", via: o.via, u: o.u, tipo: "flor" }) }
  return b
}

function desenharBlip(g: CanvasRenderingContext2D, x: number, y: number, b: { cor: string; tipo: Blip["tipo"] }, k = 1) {
  if (b.tipo === "flor") { g.fillStyle = b.cor; g.beginPath(); g.arc(x, y, 2.2 * k, 0, 7); g.fill(); return }
  g.fillStyle = "#0b0a12"; g.beginPath(); g.arc(x, y, 6.5 * k, 0, 7); g.fill()
  g.strokeStyle = b.cor; g.lineWidth = 2 * k; g.beginPath(); g.arc(x, y, 6.5 * k, 0, 7); g.stroke()
  g.fillStyle = b.cor
  if (b.tipo === "posto") { g.fillRect(x - 2.5 * k, y - 3 * k, 4 * k, 6 * k); g.fillRect(x + 1.5 * k, y - 1 * k, 1.5 * k, 3 * k) }
  else if (b.tipo === "parque") { g.beginPath(); g.arc(x, y, 3.2 * k, 0, 7); g.stroke() }
  else { g.beginPath(); g.arc(x, y, 2.4 * k, 0, 7); g.fill() }
}

function seta(g: CanvasRenderingContext2D, x: number, y: number, ang: number, k = 1) {
  g.save(); g.translate(x, y); g.rotate(ang)
  g.fillStyle = "#ffffff"; g.strokeStyle = "#0b0a12"; g.lineWidth = 2
  g.beginPath(); g.moveTo(0, -8 * k); g.lineTo(6 * k, 7 * k); g.lineTo(0, 3.5 * k); g.lineTo(-6 * k, 7 * k); g.closePath(); g.stroke(); g.fill()
  g.restore()
}

const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m / 10) * 10} m`)

export function Mapa({ M, apagada = null, aberta = null, foco = null, pose, missao, marca, onMarcar, onAberto, viagens = 0, onViajar, onToqueMini, pedido = 0, missoes = null, painel = null, onIcone, onDrone, fase = null, alvoChao = null, corridaRua = false }: {
  M: Mundo
  // (05/11) a largada da corrida de rua no mapa: só depois de chegar ao subúrbio
  corridaRua?: boolean
  // (notas 04/11) a fase da história e o lugar do chão de agora: o que o mapa mostra (pontosMapa.ts)
  fase?: string | null
  alvoChao?: LugarChao | null
  // (disco, os atos) as vias das pistas ainda apagadas: no mapa, um fio escuro
  apagada?: boolean[] | null
  // (21/10, o mapa que ensina) as vias das pistas disponíveis agora (pulsam) e as
  // da pista em foco (tocou na oferta da feira: ela brilha, o resto apaga 50%)
  aberta?: boolean[] | null
  foco?: boolean[] | null
  // a Kombi: via, u (m), x (lateral) e v (velocidade) — o jogo.current da Corrida
  pose: React.RefObject<PoseKombi>
  missao: LugarId | null
  marca: Marca | null
  onMarcar: (m: Marca | null) => void
  viagens?: number
  onViajar?: () => boolean
  onAberto: (aberto: boolean) => void
  // (22/10, o Omnitrix) o toque na bolinha: se o anel usar (abre a checklist em volta), o mapa não abre
  onToqueMini?: () => boolean
  // (22/10) o anel e o mapa abrem a mesma tela: cada pedido (um número que sobe) abre o mapa grande
  pedido?: number
  // (22/10) as missões moram no mapa: os ícones (um por missão, na pista dela) e o painel com as opções
  missoes?: IconeMapa[] | null
  painel?: React.ReactNode
  onIcone?: (id: string) => void
  // (27/10) o drone GPS: tocar na bolinha (ou o anel pedir as missões) liga a vista do
  // drone em vez do mapa grande; devolve true se cuidou (sem ele, o mapa 2D de reserva)
  onDrone?: (via: "mini" | "pedido") => boolean
}) {
  const mini = useRef<HTMLCanvasElement>(null)
  const grande = useRef<HTMLCanvasElement>(null)
  const [aberto, setAberto] = useState(false)
  const [distancia, setDistancia] = useState("")
  const vias = useMemo(() => amostrarVias(M).map((v, i) => ({ ...v, ...(apagada?.[i] ? { cor: "#2e2c40" } : {}), aberta: !!aberta?.[i], foco: foco ? !!foco[i] : null })), [M, apagada, aberta, foco])
  // o mapa novo: a carta pintada (o v5) embaixo, no lugar das linhas soltas
  const [carta, setCarta] = useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    // (o disco não tem a carta do v5: as linhas das pistas bastam)
    if (!("ligacoes" in M) || "disco" in M || (window as unknown as { __semCarta?: boolean }).__semCarta) return
    const t = setTimeout(() => setCarta(pintarCarta()), 700)
    return () => clearTimeout(t)
  }, [M])
  // (os atos) os lugares de uma pista apagada também ficam apagados
  const blips = useMemo(() => blipsDo(M).filter((b) => !apagada?.[b.via]), [M, apagada])
  // (notas 04/11) O QUE APARECE: os mesmos pontos do drone (pontosMapa.ts)
  const pontos = useMemo(() => pontosDoMapa(M, { apagada, missoes, fase, alvoChao, corridaRua }), [M, apagada, missoes, fase, alvoChao, corridaRua])
  const lugaresVis = useMemo(() => pontos.filter((p) => p.tipo === "lugar" || p.tipo === "posto" || p.tipo === "parque") as (typeof pontos[number] & { via: number; u: number })[], [pontos])
  const chaoVis = useMemo(() => pontos.filter((p) => p.tipo === "chao"), [pontos])
  // o destino: o que você marcou, senão o lugar da missão
  const destino = useMemo<Marca | null>(() => {
    if (marca) return marca
    const b = missao ? blips.find((x) => x.id === missao) : null
    return b ? { via: b.via, u: b.u, nome: b.nome, cor: b.cor } : null
  }, [marca, missao, blips])
  const rota = useRef<{ segs: TrechoDesenho[]; metros: number } | null>(null)
  // os ícones das missões: na pista de cada uma (no disco, a ida dela, a pouco mais da metade)
  const icones = useMemo<IconeDesenho[]>(() => {
    const forma = (k?: string) => (k && ICONE_MISSAO[k] && typeof Path2D !== "undefined" ? new Path2D(ICONE_MISSAO[k]) : null)
    // (missões claras) no lugar da missão: o mesmo ponto do gatilho
    return pontos.filter((p) => p.tipo === "missao").map((p) => ({ id: p.id, faixa: p.nome, cor: p.cor, agora: !!p.agora, feita: p.feita, icone: p.icone, x: p.x, z: p.z, forma: forma(p.icone) }))
  }, [pontos])

  // (T58) com o GPS ligado, o minimapa mostra a MESMA rota dele (a vaga da missão,
  // o lugar do chão, a marca): antes ele só via a marca e o lugar da missão
  const destNav = useRef<{ x: number; z: number; cor: string } | null>(null)
  // a rota se refaz a cada meio segundo (a Kombi andou, o destino mudou)
  useEffect(() => {
    const refazer = () => {
      const p = pose.current
      if (NAV.ativo && NAV.destino && p && !marca) {
        const D = NAV.destino
        const segs = NAV.rota ? linhaDaRota(M, NAV.rota) : []
        // o pedaço fora da pista (até o lugar do chão) ou a reta (voando, no chão)
        const de = NAV.rota ? NAV.saida : p.wx !== undefined && (p.livreOk || p.voo) ? { x: p.wx, z: p.wz! } : null
        if (de) segs.push({ cor: D.cor, pts: [de.x, de.z, D.x, D.z] })
        rota.current = segs.length ? { segs, metros: NAV.metros } : null
        destNav.current = { x: D.x, z: D.z, cor: D.cor }
        setDistancia(NAV.metros >= 0 ? km(NAV.metros) : "")
        return
      }
      destNav.current = null
      if (!destino || !p) { rota.current = null; setDistancia(""); return }
      const r = calcularRota(M, { via: p.via, u: p.u }, destino)
      if (!r) { rota.current = null; setDistancia(""); return }
      rota.current = { segs: linhaDaRota(M, r), metros: r.metros }
      setDistancia(km(r.metros))
      // chegou no destino que você marcou: a marca some
      if (marca && r.metros < 40) onMarcar(null)
    }
    refazer()
    const t = setInterval(refazer, 500)
    return () => clearInterval(t)
  }, [M, destino, marca, onMarcar, pose])

  // o minimapa: redondo, a frente da Kombi pra cima, aproxima devagar e afasta correndo
  useEffect(() => {
    let raf = 0, ultimo = 0, zoom = 260
    const desenhar = (agora: number) => {
      raf = requestAnimationFrame(desenhar)
      if (agora - ultimo < 50) return
      ultimo = agora
      const c = mini.current, p = pose.current
      if (!c || !p) return
      const dpr = Math.min(2, window.devicePixelRatio || 1), S = c.clientWidth
      if (S < 20) return // escondido (cutscene, montanha-russa)
      if (c.width !== S * dpr) { c.width = S * dpr; c.height = S * dpr }
      const g = c.getContext("2d")!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      // (direção livre) a Kombi tem posição e rumo próprios: o minimapa gira com ela
      // (T58) e no disco, fora da pista (o chão do subúrbio, as dunas, voando): a posição de verdade
      const livre = (p.livreOk || p.voo) && p.wx !== undefined
      const k = livre ? { x: p.wx!, z: p.wz!, tx: Math.sin(p.rumo!), tz: Math.cos(p.rumo!) } : noMundo(M, p)
      const ox = livre ? k.x : k.x - k.tz * p.x, oz = livre ? k.z : k.z + k.tx * p.x
      const alvoZoom = 240 + Math.min(260, Math.abs(p.v) * 9)
      zoom += (alvoZoom - zoom) * 0.08
      const R = S / 2, esc = R / zoom
      // mundo → tela: a frente (tx, tz) vira "pra cima"
      const tela = (x: number, z: number): [number, number] => {
        const dx = x - ox, dz = z - oz
        return [R + (dx * -k.tz + dz * k.tx) * esc, R - (dx * k.tx + dz * k.tz) * esc]
      }
      g.clearRect(0, 0, S, S)
      g.save(); g.beginPath(); g.arc(R, R, R - 1, 0, 7); g.clip()
      g.fillStyle = "rgba(8, 7, 16, 0.86)"; g.fillRect(0, 0, S, S)
      g.lineCap = "round"; g.lineJoin = "round"
      if (carta) {
        // a mesma conta do tela(), como matriz: a carta gira com a Kombi
        const a = -k.tz * esc, b = -k.tx * esc, cc = k.tx * esc, dd = -k.tz * esc
        const e = R - (a * ox + cc * oz), f = R - (b * ox + dd * oz)
        g.save(); g.setTransform(a * dpr, b * dpr, cc * dpr, dd * dpr, e * dpr, f * dpr)
        g.drawImage(carta, -WU / 2 * ESCALA, -HU / 2 * ESCALA, WU * ESCALA, HU * ESCALA)
        g.restore()
      }
      if (!carta) for (const v of vias) {
        g.strokeStyle = v.saida ? "rgba(255,255,255,0.28)" : v.cor; g.globalAlpha = (v.saida ? 1 : 0.55) * (v.foco === false ? 0.5 : 1)
        g.lineWidth = v.saida ? 2.5 : 3.5
        pulso(g, v, agora, 1)
        g.beginPath()
        for (let i = 0; i < v.pts.length; i += 2) { const [x, y] = tela(v.pts[i], v.pts[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y) }
        g.stroke()
        g.shadowBlur = 0
      }
      g.globalAlpha = 1
      const rt = rota.current
      // (LU2CA 21/10) com uma pista marcada, o resto do mapa apaga 50%: o foco na acesa
      if (rt) { g.fillStyle = "rgba(8, 7, 16, 0.5)"; g.fillRect(0, 0, S, S); desenharRota(g, rt.segs, tela, 4.5); acenderRota(g, rt.segs, tela, 4.5, agora) }
      // (notas 04/11) os mesmos pontos do mapa grande e do drone (pontosMapa.ts). Só o
      // que está dentro do círculo; preso na borda (como no GTA) fica só a missão de agora
      for (const b of lugaresVis) {
        const [x, y] = tela(b.x, b.z)
        if (Math.hypot(x - R, y - R) > R - 9) continue
        desenharBlip(g, x, y, b as { cor: string; tipo: Blip["tipo"] }, 0.85)
      }
      for (const c of chaoVis) {
        const [x, y] = tela(c.x, c.z)
        if (Math.hypot(x - R, y - R) > R - 10) continue
        desenharChao(g, x, y, c.cor, 0.8, agora)
      }
      for (const ic of icones) {
        let [x, y] = tela(ic.x, ic.z)
        const d = Math.hypot(x - R, y - R)
        // (trilha de pedras) o que acabou de abrir brilha no próprio lugar (e fica preso na borda)
        const b = brilha(ic.id)
        if (d > R - 12) {
          if (!ic.agora && !b) continue
          x = R + ((x - R) / d) * (R - 12); y = R + ((y - R) / d) * (R - 12)
        }
        if (b) {
          const s = 0.5 + 0.5 * Math.sin(agora / 170)
          g.globalAlpha = 0.35 + 0.5 * s; g.strokeStyle = ic.cor; g.lineWidth = 2.5
          g.beginPath(); g.arc(x, y, 12 + 7 * s, 0, 7); g.stroke(); g.globalAlpha = 1
        }
        desenharIcone(g, x, y, ic, 0.6, agora)
      }
      const dn = destNav.current ?? (destino ? { ...noMundo(M, destino), cor: destino.cor } : null)
      if (dn) {
        let [x, y] = tela(dn.x, dn.z)
        const d = Math.hypot(x - R, y - R)
        if (d > R - 10) { x = R + ((x - R) / d) * (R - 10); y = R + ((y - R) / d) * (R - 10) }
        g.fillStyle = dn.cor ?? ROTA_COR; g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x - 6, y - 8); g.lineTo(x + 6, y - 8); g.closePath(); g.fill()
      }
      g.restore()
      g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 2; g.beginPath(); g.arc(R, R, R - 1, 0, 7); g.stroke()
      // (T58) a Kombi: a seta com um halo, a frente sempre pra cima (o mapa gira com ela)
      g.fillStyle = "rgba(47, 232, 255, 0.22)"; g.beginPath(); g.arc(R, R, 13, 0, 7); g.fill()
      seta(g, R, R, 0, 1.1)
    }
    raf = requestAnimationFrame(desenhar)
    return () => cancelAnimationFrame(raf)
  }, [M, vias, lugaresVis, chaoVis, destino, pose, carta, icones])

  // o mapa grande: a cidade inteira, norte pra cima
  const caixa = useMemo(() => {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
    for (const v of vias) for (let i = 0; i < v.pts.length; i += 2) { x0 = Math.min(x0, v.pts[i]); x1 = Math.max(x1, v.pts[i]); z0 = Math.min(z0, v.pts[i + 1]); z1 = Math.max(z1, v.pts[i + 1]) }
    return { x0, x1, z0, z1 }
  }, [vias])
  const vista = useRef({ cx: 0, cz: 0, esc: 0.1 })
  useEffect(() => {
    if (!aberto) return
    const c = grande.current; if (!c) return
    const W = c.clientWidth, H = c.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = W * dpr; c.height = H * dpr
    // começa centrado na Kombi, com a cidade quase inteira na tela
    const p = pose.current
    let k = p ? noMundo(M, p) : { x: 0, z: 0, tx: 0, tz: 1 }
    // (no mapa novo abre mostrando mais da cidade)
    // (22/10) com missões no mapa, abre no meio do caminho entre a Kombi e elas (o ícone não fica de fora)
    if (icones.length) { let sx = k.x, sz = k.z; for (const ic of icones) { sx += ic.x; sz += ic.z } k = { ...k, x: sx / (icones.length + 1), z: sz / (icones.length + 1) } }
    vista.current = { cx: k.x, cz: k.z, esc: Math.min(W / (caixa.x1 - caixa.x0), H / (caixa.z1 - caixa.z0)) * ("ligacoes" in M ? 1.15 : 1.6) }
    let raf = 0
    const desenhar = () => {
      raf = requestAnimationFrame(desenhar)
      const g = c.getContext("2d")!, vv = vista.current
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const tela = (x: number, z: number): [number, number] => [W / 2 + (x - vv.cx) * vv.esc, H / 2 + (z - vv.cz) * vv.esc]
      g.fillStyle = carta ? "#1a5470" : "#07060e"; g.fillRect(0, 0, W, H)
      g.lineCap = "round"; g.lineJoin = "round"
      if (carta) {
        g.save(); g.setTransform(vv.esc * dpr, 0, 0, vv.esc * dpr, (W / 2 - vv.cx * vv.esc) * dpr, (H / 2 - vv.cz * vv.esc) * dpr)
        g.drawImage(carta, -WU / 2 * ESCALA, -HU / 2 * ESCALA, WU * ESCALA, HU * ESCALA)
        g.restore()
      }
      if (!carta) for (const v of vias) {
        g.strokeStyle = v.saida ? "rgba(255,255,255,0.3)" : v.cor; g.globalAlpha = (v.saida ? 1 : 0.7) * (v.foco === false ? 0.5 : 1)
        g.lineWidth = v.saida ? 2 : 3.5
        pulso(g, v, performance.now(), 1.4)
        g.beginPath()
        for (let i = 0; i < v.pts.length; i += 2) { const [x, y] = tela(v.pts[i], v.pts[i + 1]); if (i) g.lineTo(x, y); else g.moveTo(x, y) }
        g.stroke()
        g.shadowBlur = 0
      }
      g.globalAlpha = 1
      const rt = rota.current
      // (LU2CA 21/10) com uma pista marcada, o resto do mapa apaga 50%: o foco na acesa
      if (rt) { g.fillStyle = "rgba(7, 6, 14, 0.5)"; g.fillRect(0, 0, W, H); desenharRota(g, rt.segs, tela, 4); acenderRota(g, rt.segs, tela, 4, performance.now()) }
      g.font = "700 11px ui-monospace, monospace"; g.textBaseline = "middle"
      for (const b of lugaresVis) {
        const [x, y] = tela(b.x, b.z)
        // (22/10) os pontos de interesse em destaque: um halo na cor do lugar
        g.globalAlpha = 0.22; g.fillStyle = b.cor; g.beginPath(); g.arc(x, y, 13, 0, 7); g.fill(); g.globalAlpha = 1
        desenharBlip(g, x, y, b as { cor: string; tipo: Blip["tipo"] }, 1.1)
        g.fillStyle = "rgba(7,6,14,0.75)"; const tw = g.measureText(b.nome).width; g.fillRect(x + 10, y - 8, tw + 8, 16)
        g.fillStyle = "#e9e6f2"; g.fillText(b.nome, x + 14, y)
      }
      for (const c of chaoVis) {
        const [x, y] = tela(c.x, c.z)
        desenharChao(g, x, y, c.cor, 1.2, performance.now())
        g.fillStyle = "rgba(7,6,14,0.75)"; const tw = g.measureText(c.nome).width; g.fillRect(x + 12, y - 8, tw + 8, 16)
        g.fillStyle = c.cor; g.fillText(c.nome, x + 16, y)
      }
      const dn = destNav.current ?? (destino ? { ...noMundo(M, destino), cor: destino.cor } : null)
      if (dn) {
        const [x, y] = tela(dn.x, dn.z)
        g.fillStyle = dn.cor ?? ROTA_COR; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x - 8, y - 18); g.lineTo(x + 8, y - 18); g.closePath(); g.fill()
      }
      g.font = "800 11px ui-monospace, monospace"
      // (missões claras) as feitas embaixo, a de agora por cima de tudo
      for (const ic of icones) if (ic.feita) { const [x, y] = tela(ic.x, ic.z); desenharIcone(g, x, y, ic, 1.2, performance.now()) }
      for (const ic of icones) {
        if (ic.feita) continue
        const [x, y] = tela(ic.x, ic.z)
        desenharIcone(g, x, y, ic, 1.2, performance.now())
        g.font = ic.agora ? "800 13px ui-monospace, monospace" : "800 11px ui-monospace, monospace"
        const tw = g.measureText(ic.faixa).width, dy = ic.agora ? 38 : 32
        g.fillStyle = "rgba(7,6,14,0.85)"; g.fillRect(x - tw / 2 - 5, y + dy - 8, tw + 10, ic.agora ? 18 : 16)
        g.fillStyle = ic.agora ? "#ffffff" : ic.cor; g.textAlign = "center"; g.fillText(ic.faixa, x, y + dy + (ic.agora ? 1 : 0)); g.textAlign = "start"
      }
      const pk = pose.current
      // (T58) fora da pista, a posição e o rumo de verdade
      if (pk) { const fora = (pk.livreOk || pk.voo) && pk.wx !== undefined; const w = fora ? { x: pk.wx!, z: pk.wz!, tx: Math.sin(pk.rumo ?? 0), tz: Math.cos(pk.rumo ?? 0) } : noMundo(M, pk); const [x, y] = tela(w.x, w.z)
        // (missões claras) você: um halo ciano e a seta maior, com "você" embaixo
        g.fillStyle = "rgba(47, 232, 255, 0.28)"; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill()
        seta(g, x, y, Math.atan2(w.tx, -w.tz), 1.6)
        g.font = "800 11px ui-monospace, monospace"; g.textAlign = "center"; g.fillStyle = "rgba(7,6,14,0.85)"; g.fillRect(x - 20, y + 16, 40, 15); g.fillStyle = "#2fe8ff"; g.fillText("você", x, y + 24); g.textAlign = "start" }
    }
    desenhar()
    return () => cancelAnimationFrame(raf)
  }, [aberto, M, vias, lugaresVis, chaoVis, destino, caixa, pose, carta, icones])

  // arrastar move, pinça/roda aproxima, tocar marca
  const gesto = useRef<{ x: number; y: number; moveu: boolean; dedos: Map<number, { x: number; y: number }>; dist: number }>({ x: 0, y: 0, moveu: false, dedos: new Map(), dist: 0 })
  const tocar = (sx: number, sy: number) => {
    const c = grande.current; if (!c) return
    const r = c.getBoundingClientRect(), vv = vista.current
    const x = vv.cx + (sx - r.left - r.width / 2) / vv.esc, z = vv.cz + (sy - r.top - r.height / 2) / vv.esc
    // (22/10) um ícone de missão perto do dedo: a missão em foco (a pista brilha, o cartão acende)
    for (const ic of icones) { if (!ic.feita && Math.hypot(ic.x - x, ic.z - z) < 26 / vv.esc) { onIcone?.(ic.id); return } }
    // um lugar perto do dedo ganha; senão, a rua mais perto
    let melhor: Blip | null = null, dm = 28 / vv.esc
    for (const b of lugaresVis) { const d = Math.hypot(b.x - x, b.z - z); if (d < dm) { dm = d; melhor = { id: b.id, nome: b.nome, cor: b.cor, via: b.via, u: b.u, tipo: b.tipo as Blip["tipo"] } } }
    if (melhor) { onMarcar({ via: melhor.via, u: melhor.u, nome: melhor.nome, cor: melhor.cor }); return }
    const p = pontoMaisPerto(M, x, z)
    if (p && p.d < 60 / vv.esc + 40) onMarcar({ via: p.via, u: p.u, nome: "o ponto marcado", cor: corDaVia(M, p.via) })
  }
  const abrir = (v: boolean) => { setAberto(v); onAberto(v) }
  // o anel pediu o mapa
  const pedidoAnt = useRef(pedido)
  useEffect(() => {
    if (pedido === pedidoAnt.current) return
    pedidoAnt.current = pedido
    if (pedido && !onDrone?.("pedido")) abrir(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido])

  return (
    <>
      <button type="button" className="l-mapa-mini" data-info="mapa" aria-label="abrir o mapa" onPointerDown={(e) => e.stopPropagation()} onClick={() => { if (!onToqueMini?.() && !onDrone?.("mini")) abrir(true) }}>
        <canvas ref={mini} />
        {distancia && <span style={{ ["--cor" as string]: destino?.cor ?? ROTA_COR }}>{distancia}</span>}
      </button>
      {aberto && (
        <div className="l-mapa-grande" onPointerDown={(e) => e.stopPropagation()}>
          <canvas
            ref={grande}
            onPointerDown={(e) => {
              const gs = gesto.current
              e.currentTarget.setPointerCapture(e.pointerId)
              gs.dedos.set(e.pointerId, { x: e.clientX, y: e.clientY })
              if (gs.dedos.size === 1) { gs.x = e.clientX; gs.y = e.clientY; gs.moveu = false }
              if (gs.dedos.size === 2) { const [a, b] = [...gs.dedos.values()]; gs.dist = Math.hypot(a.x - b.x, a.y - b.y); gs.moveu = true }
            }}
            onPointerMove={(e) => {
              const gs = gesto.current, vv = vista.current
              if (!gs.dedos.has(e.pointerId)) return
              const antes = gs.dedos.get(e.pointerId)!
              gs.dedos.set(e.pointerId, { x: e.clientX, y: e.clientY })
              if (gs.dedos.size === 2) {
                const [a, b] = [...gs.dedos.values()], d = Math.hypot(a.x - b.x, a.y - b.y)
                if (gs.dist) vv.esc = Math.max(0.02, Math.min(2, vv.esc * (d / gs.dist)))
                gs.dist = d
                return
              }
              if (Math.hypot(e.clientX - gs.x, e.clientY - gs.y) > 8) gs.moveu = true
              vv.cx -= (e.clientX - antes.x) / vv.esc; vv.cz -= (e.clientY - antes.y) / vv.esc
            }}
            onPointerUp={(e) => {
              const gs = gesto.current
              gs.dedos.delete(e.pointerId)
              if (!gs.dedos.size && !gs.moveu) tocar(e.clientX, e.clientY)
              if (gs.dedos.size < 2) gs.dist = 0
            }}
            onPointerCancel={(e) => { gesto.current.dedos.delete(e.pointerId) }}
            onWheel={(e) => { const vv = vista.current; vv.esc = Math.max(0.02, Math.min(2, vv.esc * (e.deltaY < 0 ? 1.15 : 1 / 1.15))) }}
          />
          <header>
            <b>{destino ? destino.nome : "o mapa"}</b>
            {distancia && <span>{distancia}</span>}
          </header>
          {painel && (
            <aside className="l-mapa-missoes" aria-label="as missões" onClick={(e) => { if ((e.target as HTMLElement).closest("[data-fecha-mapa]")) abrir(false) }}>
              {painel}
            </aside>
          )}
          <footer>
            {marca && onViajar && (viagens > 0
              ? <button type="button" className="is-viagem" onClick={() => { if (onViajar()) abrir(false) }}>viagem rápida · {viagens}</button>
              : <button type="button" className="is-viagem" disabled>viagem rápida · 0</button>)}
            {marca && <button type="button" onClick={() => onMarcar(null)}>tirar a marca</button>}
            <button type="button" onClick={() => abrir(false)}>voltar pra estrada</button>
          </footer>
        </div>
      )}
    </>
  )
}
