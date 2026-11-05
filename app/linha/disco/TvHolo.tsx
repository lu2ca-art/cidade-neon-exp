"use client"

// A TV DO HOLO (05/11, o dono: "uma TVzinha no holo, que permite a pessoa
// continuar jogando e a música reproduzindo no YouTube"; bíblia §7).
//
// Regras do YouTube que NÃO se quebram (senão o canal é punido e a view não conta):
//   - o player fica VISÍVEL, com pelo menos 200×200 px, e nada por cima do vídeo
//   - o play é dado pela pessoa (um toque no próprio player); sem autoplay escondido
//   - nunca mudo, nunca escondido, nunca minúsculo; um player só
// Desempenho: nada do YouTube carrega até a pessoa tocar no 📺 TV (o script da
// IFrame Player API entra só nessa hora). Fechou, o player é destruído.
//
// O botão mora no notch (Holo.tsx); a TV é montada uma vez na página (page.tsx)
// e só existe enquanto está aberta. Os vídeos: disco/videosFaixas.ts. Ver docs/tv-holo.md.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as PE } from "react"
import { createPortal } from "react-dom"
import { PISTAS, type PistaId } from "../estrada/pistas"
import { ESTACOES } from "../data"
import { FREQUENCIAS } from "../radio"
import { aoMusicaPropria, calarPraTv, player } from "../som"
import { lerFaixaRua } from "./musicaContinua"
import { faixaDoTitulo, nomeDaFaixa } from "./linksFaixas"
import { proximaComVideo, videoDaFaixa } from "./videosFaixas"
import { track } from "@/lib/analytics"
import "./tvHolo.css"

// ── a loja da TV (fora do React): aberta com qual faixa, ou fechada ──
type EstadoTv = { faixa: PistaId | null; n: number }
let tv: EstadoTv = { faixa: null, n: 0 }
const ouvintes = new Set<() => void>()
const mudar = (x: EstadoTv) => { tv = x; ouvintes.forEach((f) => f()) }
const ouvirTv = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }
const lerTv = () => tv
export const tvAberta = () => tv.faixa !== null
export function abrirTv(id: PistaId) { mudar({ faixa: id, n: tv.n + 1 }) }
export function fecharTv() { if (tv.faixa) mudar({ faixa: null, n: tv.n }) }
// (revisão 05/11) uma música por vez: o Guitar Driver, a batida, o tambor, os
// instrumentos da D-Bee, uma peça com música (som.ts, silenciar/musicaPropria) fecham a TV
if (typeof window !== "undefined") aoMusicaPropria(fecharTv)

// ── a faixa que toca agora: a da rádio (se ela está no ar com uma do vol. 1), senão a da rua ──
function faixaDoSrc(src: string | null): PistaId | null {
  if (!src) return null
  for (const f of FREQUENCIAS) {
    const x = f.faixas.find((t) => t.src === src)
    if (x) return faixaDoTitulo(x.titulo)
  }
  const e = ESTACOES.find((x) => x.audio === src)
  if (e) return faixaDoTitulo(e.faixa)
  return PISTAS.find((p) => p.voz === src || p.inst === src)?.id ?? null
}
export function faixaAgora(): PistaId | null {
  const r = player.tocando ? faixaDoSrc(player.src) : null
  return r ?? ((lerFaixaRua().id as PistaId | null) || null)
}

// ── o 📺 TV (revisão 05/11: mora no menu ♪ do notch, junto do ♥ salvar; Holo.tsx). Sem vídeo: avisa e não abre ──
export function useTvAberta() {
  const t = useSyncExternalStore(ouvirTv, lerTv, lerTv)
  return t.faixa !== null
}
export function alternarTv(aviso: (texto: string, cor?: string) => void) {
  if (tvAberta()) { fecharTv(); return }
  const agora = faixaAgora()
  // nenhuma faixa tocando: a TV começa pela primeira que tem vídeo
  const id = agora ?? proximaComVideo(null)
  if (!id || !videoDaFaixa(id)) { aviso("📺 essa faixa ainda não tem vídeo", "#ff4040"); return }
  abrirTv(id)
  // o evento que já existe (o mesmo do ♥ salvar e das plataformas)
  track("external_link_click", { destination: "youtube", track_id: id, place_id: "tv-holo", utm_source: "cidade-neon", utm_campaign: "tv_holo" })
}

// ── a IFrame Player API do YouTube: o script entra só quando a TV abre pela primeira vez ──
type YTPlayer = {
  loadVideoById(id: string): void
  cueVideoById(id: string): void
  loadPlaylist(o: { list: string; listType: "playlist" }): void
  cuePlaylist(o: { list: string; listType: "playlist" }): void
  getPlaylist(): string[] | null
  getPlaylistIndex(): number
  destroy(): void
}
type YTEvento = { data: number; target: YTPlayer }
type YTApi = { Player: new (el: HTMLElement, o: unknown) => YTPlayer }
type JanelaYT = Window & { YT?: YTApi; onYouTubeIframeAPIReady?: () => void }
let apiP: Promise<YTApi> | null = null
function carregarApi(): Promise<YTApi> {
  const w = window as JanelaYT
  if (w.YT?.Player) return Promise.resolve(w.YT)
  if (apiP) return apiP
  apiP = new Promise<YTApi>((ok, falha) => {
    const antes = w.onYouTubeIframeAPIReady
    w.onYouTubeIframeAPIReady = () => { antes?.(); if (w.YT) ok(w.YT) }
    const s = document.createElement("script")
    s.src = "https://www.youtube.com/iframe_api"
    s.async = true
    s.onerror = () => { apiP = null; falha(new Error("youtube")) }
    document.head.appendChild(s)
  })
  return apiP
}

// põe a faixa no MESMO player (um só): tocar = segue (a próxima, como rádio);
// senão só deixa pronto, esperando o play da pessoa
function carregar(p: YTPlayer, id: PistaId, tocar: boolean) {
  const v = videoDaFaixa(id)
  if (!v) return
  try {
    if (v.videoId) { if (tocar) p.loadVideoById(v.videoId); else p.cueVideoById(v.videoId) }
    else if (v.playlistId) { const o = { list: v.playlistId, listType: "playlist" as const }; if (tocar) p.loadPlaylist(o); else p.cuePlaylist(o) }
  } catch {}
}

// ── os cantos (arrasta pelo topo e solta: ela vai pro canto mais perto) ──
// Padrão embaixo à esquerda (as propagandas do holo, nada essencial): em cima
// moram a rádio, o notch e o mapa; embaixo à direita, o turbo e o propulsor
type Canto = "ie" | "id" | "se" | "sd"
const CHAVE_CANTO = "cn-tv-canto"
function lerCanto(): Canto {
  try { const c = localStorage.getItem(CHAVE_CANTO); if (c === "ie" || c === "id" || c === "se" || c === "sd") return c } catch {}
  return "ie"
}

export function TvHolo() {
  const t = useSyncExternalStore(ouvirTv, lerTv, lerTv)
  if (!t.faixa || typeof document === "undefined") return null
  return createPortal(<Tela key={t.n} inicio={t.faixa} />, document.body)
}

function Tela({ inicio }: { inicio: PistaId }) {
  const [faixa, setFaixa] = useState<PistaId>(inicio)
  const [canto, setCanto] = useState<Canto>(lerCanto)
  const [arrasto, setArrasto] = useState<{ x: number; y: number } | null>(null)
  const [erro, setErro] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const yt = useRef<YTPlayer | null>(null)
  const de = useRef<{ x: number; y: number; id: number } | null>(null)

  // o player: um só, criado quando a TV abre e destruído quando ela fecha
  useEffect(() => {
    let vivo = true
    const box = caixa.current
    if (!box) return
    const v = videoDaFaixa(inicio)
    if (!v) return
    // os estados do YouTube: -1 sem começar, 0 acabou, 1 tocando, 2 pausado, 3 carregando, 5 pronto
    // (como rádio) o vídeo acabou: a TV passa sozinha pra próxima faixa que tem
    // vídeo, sempre visível. Deu a volta inteira (chegou de novo na faixa em que
    // a TV abriu): ela só deixa o vídeo pronto e espera o play da pessoa (nada de
    // laço automático sem fim). Fechou, parou
    const volta = inicio
    let faixaAqui = inicio
    const trocando = { current: false }
    const estado = (e: YTEvento) => {
      // (revisão 05/11) um evento que chega depois de fechar não cala a música do jogo
      if (!vivo) return
      if (e.data === 1) { trocando.current = false; calarPraTv(true); return }
      if (e.data === 0) {
        // playlist do álbum: o YouTube segue sozinho até o último vídeo dela
        const lista = e.target.getPlaylist?.()
        if (lista && lista.length > 1 && e.target.getPlaylistIndex() < lista.length - 1) return
        const prox = proximaComVideo(faixaAqui)
        if (!prox || prox === faixaAqui) { calarPraTv(false); return }
        const tocar = prox !== volta
        if (tocar) {
          trocando.current = true
          // o navegador não deixou o próximo tocar sozinho: a música do jogo volta e a TV espera o play
          setTimeout(() => { if (trocando.current) { trocando.current = false; calarPraTv(false) } }, 5000)
        } else calarPraTv(false)
        faixaAqui = prox
        setFaixa(prox)
        setErro(false)
        carregar(e.target, prox, tocar)
        return
      }
      // (entre um vídeo e outro a música do jogo não volta)
      if (trocando.current && (e.data === -1 || e.data === 3 || e.data === 5)) return
      if (e.data === 2 || e.data === 5 || e.data === -1) calarPraTv(false)
    }
    carregarApi().then((YT) => {
      if (!vivo) return
      const host = document.createElement("div")
      box.appendChild(host)
      yt.current = new YT.Player(host, {
        width: "100%",
        height: "100%",
        videoId: v.videoId,
        // autoplay 0: o play é da pessoa, no próprio player (regra do YouTube)
        playerVars: { autoplay: 0, playsinline: 1, rel: 0, origin: window.location.origin, ...(v.videoId ? {} : { listType: "playlist", list: v.playlistId }) },
        events: {
          // tocando: a música do jogo vai a zero (fade); pausou, parou ou acabou: volta
          onStateChange: estado,
          onError: () => { calarPraTv(false); setErro(true) },
        },
      })
    }).catch(() => { if (vivo) setErro(true) })
    return () => {
      vivo = false
      calarPraTv(false)
      try { yt.current?.destroy() } catch {}
      yt.current = null
      box.innerHTML = ""
    }
  }, [inicio])

  // Esc fecha
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") fecharTv() }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [])

  // arrastar pelo topo
  const pegar = useCallback((e: PE<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button,a")) return
    de.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
  }, [])
  const mover = useCallback((e: PE<HTMLElement>) => {
    const d = de.current
    if (!d || d.id !== e.pointerId) return
    setArrasto({ x: e.clientX - d.x, y: e.clientY - d.y })
  }, [])
  const soltar = useCallback((e: PE<HTMLElement>) => {
    const d = de.current
    if (!d || d.id !== e.pointerId) return
    de.current = null
    const r = raiz.current?.getBoundingClientRect()
    setArrasto(null)
    if (!r) return
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const c: Canto = `${cy < window.innerHeight / 2 ? "s" : "i"}${cx < window.innerWidth / 2 ? "e" : "d"}` as Canto
    setCanto(c)
    try { localStorage.setItem(CHAVE_CANTO, c) } catch {}
  }, [])

  const nome = nomeDaFaixa(faixa)
  const v = videoDaFaixa(faixa)
  const fora = v?.videoId ? `https://www.youtube.com/watch?v=${v.videoId}` : `https://www.youtube.com/playlist?list=${v?.playlistId ?? ""}`
  return (
    <div
      ref={raiz}
      className={`l-tv is-${canto} ${arrasto ? "is-arrastando" : ""}`}
      style={arrasto ? { transform: `translate(${arrasto.x}px, ${arrasto.y}px)` } : undefined}
      // o toque na TV não vira volante nem freio do jogo
      onPointerDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={`TV: ${nome}`}
    >
      <header onPointerDown={pegar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
        <b><i aria-hidden="true">📺</i> {nome}</b>
        <button type="button" onClick={fecharTv} aria-label="fechar a TV">×</button>
      </header>
      {/* o vídeo: nada por cima dele, nunca */}
      <div className="l-tv-video" ref={caixa} />
      {erro && (
        <p className="l-tv-erro">esse vídeo não abre aqui. <a href={fora} target="_blank" rel="noopener noreferrer">abrir no YouTube ↗</a></p>
      )}
    </div>
  )
}
