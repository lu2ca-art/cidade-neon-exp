"use client"

// A TRILHA DE PEDRAS na tela (o roteiro: disco/trilhaPedras.ts). Uma pedra por
// vez: um balão pequeno preso na coisa de verdade (com uma setinha), a coisa
// pulsando de leve, e só. Some quando ele faz. Não bloqueia toque nenhum
// (pointer-events: none), não escurece nada, não abre tela.
//
// Desempenho: nada no WebGL e nada por quadro. Um intervalo (TRILHA_CFG.pollMs)
// só enquanto ainda há pedra pra esta fase; um setState só quando a pedra, o
// texto ou o lugar do alvo mudam. O balão se ajusta na borda da tela escrevendo
// direto no estilo (sem render).

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { DRONE } from "../estrada/Drone"
import { lerGuia } from "../estrada/alvoMissao"
import { pedraNaTela, pedraNoNotch, useAjudaAtiva } from "../estrada/Holo"
import { gota } from "../som"
import { vib } from "../som-carro"
import { POSE_TUT } from "./tutorialConf"
import { ALVO, PEDRAS, TRILHA_CFG, TRILHA_NA_TELA, ancoraDe, pedraAgora, pedraDe, pedrasFeitas, pedrasPuladas, pulada, textoDaPedra, type CtxTrilha, type MemPedra, type PedraId } from "./trilhaPedras"
import { iconeDaPedra } from "./iconesPedras"
import "./trilhaPedras.css"

// o que vem do save (a page monta)
export type BaseTrilha = Pick<CtxTrilha, "fase" | "holo" | "feitos" | "missao" | "ofertas" | "feitasCidade" | "passo">
type Caixa = { x: number; y: number; w: number; h: number }

const ehToque = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
const tem = (sel: string) => { const el = document.querySelector(sel); return !!el && (el as HTMLElement).getClientRects().length > 0 }
const caixaDe = (sel: string | null): Caixa | null => {
  if (!sel) return null
  const r = document.querySelector(sel)?.getBoundingClientRect()
  return r && r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null
}
const igual = (a: Caixa | null, b: Caixa | null) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h)

// o contexto ao vivo: o save + o drone, o guia, a Kombi e a tela
export function ctxAoVivo(b: BaseTrilha, ajuda: boolean, toque: boolean): CtxTrilha {
  const g = lerGuia()
  return {
    ...b, ajuda, toque,
    drone: DRONE.alvo === 1,
    painel: tem(".l-mapa-missoes"),
    metros: g.metros, dica: g.dica,
    pose: POSE_TUT, poseViva: performance.now() - POSE_TUT.em < 600,
    tem,
  }
}
// ainda há pedra possível nesta fase (senão, nem olha)
const restam = (c: CtxTrilha) => c.holo && TRILHA_CFG.ligada && PEDRAS.some((p) => !c.feitos.includes(p.id) && p.fases.includes(c.fase) && !pulada(c, p))

// onFeito: as pedras feitas (ou já passadas) entram no save (historia.tutorial)
export function TrilhaPedras({ base, pausado, onFeito }: { base: BaseTrilha; pausado: boolean; onFeito: (ids: PedraId[]) => void }) {
  const ajuda = useAjudaAtiva()
  const [agora, setAgora] = useState<{ id: PedraId; texto: string; alvo: Caixa | null; semAlvo: boolean } | null>(null)
  const [ok, setOk] = useState<PedraId | null>(null)
  const baseRef = useRef(base)
  baseRef.current = base
  const feito = useRef(onFeito)
  useEffect(() => { feito.current = onFeito })
  const [toque] = useState(ehToque)
  // (6) quem já passou (save antigo, já fez missões da cidade) não vê o começo de novo: entra no save como vista
  const puladas = pedrasPuladas(ctxBase(base, toque)).join(",")
  useEffect(() => { if (puladas) feito.current(puladas.split(",") as PedraId[]) }, [puladas])

  // dá pra ter pedra? (só o save: barato, a cada render da page)
  const vivo = !pausado && !ajuda && restam(ctxBase(base, toque))

  // a pedra do "?" conta no toque nele (com o "?" ligado a trilha para de olhar)
  const idAgora = agora?.id ?? null
  useEffect(() => { if (ajuda && idAgora === "ajuda") feito.current(["ajuda"]) }, [ajuda, idAgora])

  useEffect(() => {
    if (!vivo) { setAgora(null); TRILHA_NA_TELA.pedra = null; pedraNoNotch(false); pedraNaTela(false); return }
    const mem: MemPedra & { id: PedraId | null; feitoJa: boolean } = { id: null, feitoJa: false, acc: 0, ini: 0, metros0: -1, passo0: "", drone: false, cliques: new Set() }
    let ult = performance.now()
    // o toque nas coisas reais conta (antes do jogo agir)
    const clique = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-info],[data-trilha]") as HTMLElement | null
      const id = el?.dataset.trilha ?? el?.dataset.info
      if (id) mem.cliques.add(id)
    }
    document.addEventListener("click", clique, true)
    const olhar = () => {
      const t = performance.now(), dt = Math.min(0.5, (t - ult) / 1000)
      ult = t
      const c = ctxAoVivo(baseRef.current, false, toque)
      // (feita: o ✓ fica o respiro; quando o save já tem ela, vem a próxima)
      const p = mem.feitoJa && mem.id && !c.feitos.includes(mem.id) ? pedraDe(mem.id) : pedraAgora(c)
      TRILHA_NA_TELA.pedra = p?.id ?? null
      if (!p) { mem.id = null; setAgora(null); pedraNoNotch(false); pedraNaTela(false); document.documentElement.removeAttribute("data-trilha-mexe"); return }
      if (p.id !== mem.id) {
        mem.id = p.id; mem.acc = 0; mem.ini = t; mem.metros0 = -1; mem.passo0 = c.passo; mem.drone = false; mem.cliques.clear(); mem.feitoJa = false
      }
      if (p.mexe) document.documentElement.setAttribute("data-trilha-mexe", p.mexe)
      else document.documentElement.removeAttribute("data-trilha-mexe")
      if (!mem.feitoJa && p.feita(c, mem, dt)) {
        mem.feitoJa = true
        const id = p.id
        setOk(id); vib(18); gota(5)
        setTimeout(() => { setOk(null); feito.current([id]) }, TRILHA_CFG.respiroMs)
      }
      const sel = ancoraDe(p, c)
      pedraNoNotch(sel === ALVO.notch)
      pedraNaTela(true)
      const alvo = caixaDe(sel)
      const texto = p.espera?.se(c) ? p.espera.texto : textoDaPedra(p, c)
      setAgora((a) => (a && a.id === p.id && a.texto === texto && igual(a.alvo, alvo) && a.semAlvo === !sel ? a : { id: p.id, texto, alvo, semAlvo: !sel }))
    }
    olhar()
    const iv = setInterval(olhar, TRILHA_CFG.pollMs)
    return () => { clearInterval(iv); TRILHA_NA_TELA.pedra = null; pedraNoNotch(false); pedraNaTela(false); document.removeEventListener("click", clique, true); document.documentElement.removeAttribute("data-trilha-mexe") }
  }, [vivo, toque])

  // (3) o "?" é a trilha: ligado, mostra a pedra de agora e deixa voltar nas que passaram
  if (ajuda && !pausado && base.holo) return <TrilhaNoQ base={base} toque={toque} />
  if (!agora || (!agora.alvo && !agora.semAlvo)) return null
  return <Balao id={agora.id} texto={ok === agora.id ? "✓ isso" : agora.texto} alvo={agora.alvo} ok={ok === agora.id} />
}

// o contexto só do save (pra saber se ainda há pedra; o ao vivo vem no intervalo)
function ctxBase(b: BaseTrilha, toque: boolean): CtxTrilha {
  return { ...b, ajuda: false, toque, drone: false, painel: false, metros: -1, dica: "", pose: POSE_TUT, poseViva: false, tem: () => false }
}

// ── o balão preso no alvo: a setinha aponta pro meio dele; o alvo ganha um anel que pulsa ──
const GUTTER = 16
export function Balao({ id, texto, alvo, ok = false, children }: { id: string; texto: string; alvo: Caixa | null; ok?: boolean; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const vh = typeof window !== "undefined" ? window.innerHeight : 800
  // o balão vai pro lado de dentro da tela: o alvo embaixo, o balão em cima
  const cima = !!alvo && alvo.y + alvo.h / 2 > vh / 2
  const cx = alvo ? alvo.x + alvo.w / 2 : typeof window !== "undefined" ? window.innerWidth / 2 : 200
  // a borda: depois de montar, puxa o balão pra dentro e acerta a setinha (sem render)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth, vw = window.innerWidth
    const left = Math.max(GUTTER, Math.min(vw - GUTTER - w, cx - w / 2))
    el.style.left = `${left}px`
    el.style.setProperty("--seta", `${Math.max(12, Math.min(w - 12, cx - left))}px`)
  })
  const m = 7
  const pos: React.CSSProperties = !alvo ? { bottom: "26%" } : cima ? { bottom: vh - alvo.y + m + 10 } : { top: alvo.y + alvo.h + m + 10 }
  return (
    <>
      {alvo && <div className={`l-trilha-alvo is-${id} ${ok ? "is-ok" : ""}`} aria-hidden="true" style={{ left: alvo.x - m, top: alvo.y - m, width: alvo.w + m * 2, height: alvo.h + m * 2 }} />}
      <div ref={ref} className={`l-trilha-balao ${cima ? "is-cima" : ""} ${alvo ? "" : "is-solto"} ${ok ? "is-ok" : ""}`} style={pos} role="status" aria-live="polite" data-pedra={id}>
        {/* (5) o ícone animado da pedra: o gesto, mostrado (iconeDaPedra: troca pelos gerados depois) */}
        {!ok && iconeDaPedra(id)}
        <em>{texto}</em>
        {children}
      </div>
    </>
  )
}

// ── (3) O "?" É A PRÓPRIA TRILHA. Tocou no "?": a pedra de agora aparece de novo
// no lugar dela (como se fosse a primeira vez); ‹ volta nas que já passaram, uma
// por vez, cada uma presa na coisa dela (se a coisa não está na tela agora, fica
// presa no próprio "?"). O "?" de novo (ou tocar fora) fecha, como sempre.
// Desempenho: a lista é montada uma vez por abertura; o alvo é medido a cada
// 400 ms só enquanto o "?" está ligado ──
function TrilhaNoQ({ base, toque }: { base: BaseTrilha; toque: boolean }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lista = useMemo(() => {
    // (a pedra do próprio "?" não se repete aqui dentro)
    const ag = pedraAgora(ctxAoVivo(base, false, toque))
    const fs = pedrasFeitas(base.feitos).filter((x) => x.id !== "ajuda")
    return ag && ag.id !== "ajuda" ? [...fs, ag] : fs
  }, [])
  const [i, setI] = useState(lista.length - 1)
  const [alvo, setAlvo] = useState<Caixa | null>(null)
  const p = lista[i] ?? null
  const baseRef = useRef(base)
  baseRef.current = base
  useEffect(() => {
    const medir = () => {
      const sel = p ? ancoraDe(p, ctxAoVivo(baseRef.current, true, toque)) : null
      const c = caixaDe(sel) ?? caixaDe(ALVO.ajuda)
      setAlvo((a) => (igual(a, c) ? a : c))
    }
    medir()
    const iv = setInterval(medir, 400)
    if (p?.mexe) document.documentElement.setAttribute("data-trilha-mexe", p.mexe)
    return () => { clearInterval(iv); document.documentElement.removeAttribute("data-trilha-mexe") }
  }, [p, toque])
  if (!alvo) return null
  if (!p) return <Balao id="vazio" texto="tudo em dia: segue o anel" alvo={alvo} />
  const n = lista.length
  return (
    <Balao key={p.id} id={p.id} texto={textoDaPedra(p, { toque })} alvo={alvo}>
      {n > 1 && (
        <span className="l-trilha-nav" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" data-trilha-nav="volta" disabled={i === 0} onClick={() => setI((x) => Math.max(0, x - 1))} aria-label="a pedra de antes">‹</button>
          <small>{i + 1}/{n}</small>
          <button type="button" data-trilha-nav="vai" disabled={i === n - 1} onClick={() => setI((x) => Math.min(n - 1, x + 1))} aria-label="a próxima pedra">›</button>
        </span>
      )}
    </Balao>
  )
}
