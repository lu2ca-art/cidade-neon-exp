// B4TIDA estúdio — onde as músicas ficam no aparelho (IndexedDB): a música
// (sem o áudio) e, à parte, os áudios da voz (por chave). Na primeira vez,
// as músicas da versão antiga (os 4 slots) entram convertidas.

import type { Song } from "../lib/types"
import { PASSOS_POR_COMPASSO, novaFaixa, novaSecao, novoId, type Evento, type Faixa, type Musica } from "./tipos"
import { chordStepMidiNotes, degreeToMidi } from "../lib/theory"

const DB = "b4tida-estudio"
const VER = 1

function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER)
    r.onupgradeneeded = () => {
      const db = r.result
      if (!db.objectStoreNames.contains("musicas")) db.createObjectStore("musicas", { keyPath: "id" })
      if (!db.objectStoreNames.contains("vozes")) db.createObjectStore("vozes")
    }
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}

function tx<T>(store: string, modo: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return abrir().then((db) => new Promise<T>((res, rej) => {
    const t = db.transaction(store, modo)
    const r = f(t.objectStore(store))
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  }))
}

export const listarMusicas = () => tx<Musica[]>("musicas", "readonly", (s) => s.getAll() as IDBRequest<Musica[]>).then((l) => l.sort((a, b) => b.atualizadaEm - a.atualizadaEm)).catch(() => [] as Musica[])
export const salvarMusica = (m: Musica) => tx("musicas", "readwrite", (s) => s.put({ ...m, atualizadaEm: Date.now() }))
export const apagarMusica = (id: string) => tx("musicas", "readwrite", (s) => s.delete(id))
export const salvarVoz = (chave: string, b: Blob) => tx("vozes", "readwrite", (s) => s.put(b, chave))
export const lerVoz = (chave: string) => tx<Blob | undefined>("vozes", "readonly", (s) => s.get(chave) as IDBRequest<Blob | undefined>).catch(() => undefined)

/* ─── a v1 vira v2 ─────────────────────────────────────── */
const INST_V1: Record<string, Faixa["inst"]> = { bateria: "bateria", baixo: "baixo", guitarra: "guitarra", piano: "teclas", pad: "pad", voz: "voz" }
const PAD_V1: Record<string, number> = { kick: 0, snare: 1, hat: 2, perc: 5 }

export async function converterV1(song: Song): Promise<Musica> {
  const sec = novaSecao("verso", 4)
  const faixas: Faixa[] = []
  for (const t of song.tracks) {
    const inst = INST_V1[t.instrument]
    if (!inst) continue
    const d = t.data
    const f: Faixa = { ...novaFaixa(inst), vol: t.fx.volume, reverb: t.fx.reverb, delay: t.fx.delay, mudo: t.fx.muted }
    const ev: Evento[] = []
    const compassos = d.kind === "voice" ? Math.min(8, d.bars) : d.bars ?? 1
    sec.compassos = Math.max(sec.compassos, compassos <= 1 ? 1 : compassos <= 2 ? 2 : compassos <= 4 ? 4 : 8) as Musica["secoes"][0]["compassos"]
    if (d.kind === "drum") {
      f.som = String(d.timbre).startsWith("faixa-") || ["sintetico", "808", "acustico", "lofi", "xenonio", "neonio", "argonio", "chuva"].includes(String(d.timbre)) ? `k:${d.timbre}` : "pack:chuva"
      for (const [row, cells] of Object.entries(d.cells)) cells.forEach((on, i) => { if (on) ev.push({ p: i * 2, n: PAD_V1[row] ?? 5, d: 1, v: 0.85 }) })
    } else if (d.kind === "bass") {
      f.som = `s:${d.timbre}`
      d.cells.forEach((row, grau) => row.forEach((on, i) => { if (on) ev.push({ p: i, n: degreeToMidi(song.rootNote, song.mode, grau, 2), d: 2, v: 0.85 }) }))
    } else if (d.kind === "chord") {
      f.som = `s:${d.timbre}`
      d.steps.forEach((st, i) => {
        const ms = chordStepMidiNotes(st, song.rootNote, song.mode, t.instrument === "guitarra" ? 3 : 4)
        if (ms) for (const n of ms) ev.push({ p: i, n, d: 4, v: 0.8 })
      })
    } else if (d.kind === "voice") {
      const chave = novoId("voz")
      await salvarVoz(chave, d.blob)
      sec.voz[f.id] = { chave, dur: 0 }
    }
    faixas.push(f)
    sec.eventos[f.id] = ev
  }
  // padrões menores que a seção se repetem até encher
  for (const f of faixas) {
    const ev = sec.eventos[f.id]
    if (!ev?.length) continue
    const maxP = Math.max(...ev.map((e) => e.p)) + 1
    const comp = Math.ceil(maxP / PASSOS_POR_COMPASSO) * PASSOS_POR_COMPASSO
    const total = sec.compassos * PASSOS_POR_COMPASSO
    const base = [...ev]
    for (let o = comp; o < total; o += comp) for (const e of base) ev.push({ ...e, p: e.p + o })
  }
  return { versao: 2, id: novoId("m"), nome: song.name || "música antiga", bpm: song.bpm, tom: song.rootNote, modo: song.mode, swing: 0, faixas, secoes: [sec], arranjo: [sec.id], criadaEm: Date.now(), atualizadaEm: Date.now() }
}
