// Cliente da biblioteca (/api/batida). A voz gravada é Blob no IndexedDB —
// pra viajar em JSON vira data URL, e volta a Blob quando alguém abre.

import { limparSong, type Song, type Track } from "./types"

export interface Criacao {
  id: string
  autor: string
  titulo: string
  criadaEm: number
  musica: Song
}

function blobParaDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })
}

async function serializar(song: Song) {
  const tracks = await Promise.all(song.tracks.map(async (t) => {
    if (t.data.kind !== "voice") return t
    return { ...t, data: { ...t.data, blob: await blobParaDataUrl(t.data.blob) } }
  }))
  return { ...song, tracks }
}

export async function desserializar(song: Song): Promise<Song> {
  song = limparSong(song)
  const tracks = await Promise.all(song.tracks.map(async (t): Promise<Track> => {
    if (t.data.kind !== "voice" || typeof (t.data.blob as unknown) !== "string") return t
    const blob = await (await fetch(t.data.blob as unknown as string)).blob()
    return { ...t, data: { ...t.data, blob } }
  }))
  return { ...song, tracks }
}

export async function enviar(song: Song, autor: string, titulo: string): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  try {
    const r = await fetch("/api/batida", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ autor, titulo, musica: await serializar(song) }),
    })
    const j = await r.json()
    if (!r.ok) return { ok: false, erro: j.erro ?? "não deu pra enviar" }
    return { ok: true, id: j.id }
  } catch {
    return { ok: false, erro: "sem conexão" }
  }
}

export async function destaques(): Promise<Criacao[]> {
  try {
    const r = await fetch("/api/batida", { cache: "no-store" })
    return r.ok ? (await r.json()).criacoes : []
  } catch {
    return []
  }
}

export async function todas(chave: string): Promise<{ criacoes: Criacao[]; destaques: string[]; armazenamento: string } | null> {
  const r = await fetch("/api/batida?admin=1", { headers: { "x-admin-key": chave }, cache: "no-store" })
  return r.ok ? r.json() : null
}

export async function marcar(chave: string, id: string, destaque: boolean) {
  const r = await fetch("/api/batida", {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-admin-key": chave },
    body: JSON.stringify({ id, destaque }),
  })
  return r.ok ? ((await r.json()).destaques as string[]) : null
}
