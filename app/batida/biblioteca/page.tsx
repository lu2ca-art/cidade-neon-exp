"use client"

// Biblioteca da B4TIDA — tudo que as pessoas mandaram pra cidade. Só pro
// LU2CA: ouvir, marcar destaque (vai pra rádio do jogo) e abrir no estúdio.

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { PhoneShell } from "../components/PhoneShell"
import { useCurrentSong } from "../lib/CurrentSongContext"
import { desserializar, marcar, todas, type Criacao } from "../lib/biblioteca"
import { renderSongOffline } from "../lib/render"
import { INSTRUMENT_COLOR, INSTRUMENT_LABEL } from "../lib/types"

const ACCENT = "#FFC857"
const CHAVE_LS = "b4tida-admin"

export default function BibliotecaPage() {
  const router = useRouter()
  const { startNewSong, patchSong } = useCurrentSong()
  const [chave, setChave] = useState("")
  const [entrada, setEntrada] = useState("")
  const [lista, setLista] = useState<Criacao[] | null>(null)
  const [dest, setDest] = useState<string[]>([])
  const [armaz, setArmaz] = useState("")
  const [erro, setErro] = useState("")
  const [tocando, setTocando] = useState<string | null>(null)
  const [renderizando, setRenderizando] = useState<string | null>(null)
  const ctx = useRef<AudioContext | null>(null)
  const src = useRef<AudioBufferSourceNode | null>(null)

  const carregar = useCallback(async (k: string) => {
    setErro("")
    const r = await todas(k).catch(() => null)
    if (!r) { setErro("chave errada ou sem conexão"); setLista(null); return }
    setLista(r.criacoes)
    setDest(r.destaques)
    setArmaz(r.armazenamento)
    try { localStorage.setItem(CHAVE_LS, k) } catch {}
  }, [])

  useEffect(() => {
    let k = ""
    try { k = localStorage.getItem(CHAVE_LS) ?? "" } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChave(k)
    void carregar(k)
    return () => { try { src.current?.stop() } catch {} }
  }, [carregar])

  const tocar = async (c: Criacao) => {
    try { src.current?.stop() } catch {}
    if (tocando === c.id) { setTocando(null); return }
    setRenderizando(c.id)
    const song = await desserializar(c.musica)
    const buf = await renderSongOffline(song)
    ctx.current ??= new AudioContext()
    const s = ctx.current.createBufferSource()
    s.buffer = buf
    s.loop = true
    s.connect(ctx.current.destination)
    s.start()
    src.current = s
    setRenderizando(null)
    setTocando(c.id)
  }

  const alternarDestaque = async (id: string) => {
    const r = await marcar(chave, id, !dest.includes(id))
    if (r) setDest(r)
  }

  const abrir = async (c: Criacao) => {
    const song = await desserializar(c.musica)
    startNewSong()
    patchSong(() => ({ ...song, id: `song-${Date.now()}` }))
    router.push("/batida")
  }

  return (
    <PhoneShell accent={ACCENT}>
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <button type="button" onClick={() => router.push("/batida")} className="text-[11px] font-mono" style={{ color: ACCENT }}>‹ estúdio</button>
        <p className="text-white/40 text-[9px] tracking-[0.3em] uppercase font-mono">BIBLIOTECA</p>
        <span className="text-[9px] font-mono text-white/30">{armaz}</span>
      </div>

      {lista === null ? (
        <div className="flex-1 flex flex-col justify-center gap-2">
          <p className="text-white/50 text-xs text-center">a biblioteca é do LU2CA. digita a chave de admin.</p>
          <input
            type="password"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setChave(entrada); void carregar(entrada) } }}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-white font-mono outline-none"
            placeholder="chave"
          />
          <button type="button" onClick={() => { setChave(entrada); void carregar(entrada) }} className="py-2 rounded-xl text-xs font-mono uppercase" style={{ background: `${ACCENT}22`, border: `1px solid ${ACCENT}`, color: ACCENT }}>entrar</button>
          {erro && <p className="text-[10px] font-mono text-center" style={{ color: "#ff6b6b" }}>{erro}</p>}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2">
          <p className="text-white/40 text-[10px] font-mono">{lista.length} criações · {dest.length} na rádio · ★ = vai pra rádio 222 do jogo</p>
          {lista.length === 0 && <p className="text-white/30 text-xs text-center py-8">ninguém mandou nada ainda.</p>}
          {lista.map((c) => {
            const d = dest.includes(c.id)
            return (
              <div key={c.id} className="rounded-xl p-3" style={{ background: d ? `${ACCENT}12` : "rgba(255,255,255,0.04)", border: `1px solid ${d ? ACCENT : "rgba(255,255,255,0.1)"}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{c.titulo}</p>
                    <p className="text-white/40 text-[10px] font-mono">{c.autor} · {new Date(c.criadaEm).toLocaleDateString("pt-BR")} · {c.musica.bpm} bpm</p>
                  </div>
                  <button type="button" onClick={() => alternarDestaque(c.id)} aria-label="destaque" className="text-xl leading-none" style={{ color: d ? ACCENT : "rgba(255,255,255,0.25)" }}>★</button>
                </div>
                <div className="flex flex-wrap gap-1 my-2">
                  {c.musica.tracks.map((t) => (
                    <span key={t.id} className="px-1.5 py-0.5 rounded text-[8px] font-mono" style={{ background: `${INSTRUMENT_COLOR[t.instrument]}18`, color: INSTRUMENT_COLOR[t.instrument] }}>{INSTRUMENT_LABEL[t.instrument]}</span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => tocar(c)} className="flex-1 py-1.5 rounded-lg text-[10px] font-mono uppercase" style={{ background: tocando === c.id ? ACCENT : "rgba(255,255,255,0.06)", color: tocando === c.id ? "#050510" : "white" }}>
                    {renderizando === c.id ? "preparando…" : tocando === c.id ? "❚❚ parar" : "▶ ouvir"}
                  </button>
                  <button type="button" onClick={() => abrir(c)} className="flex-1 py-1.5 rounded-lg text-[10px] font-mono uppercase text-white/70" style={{ background: "rgba(255,255,255,0.06)" }}>abrir no estúdio</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PhoneShell>
  )
}
