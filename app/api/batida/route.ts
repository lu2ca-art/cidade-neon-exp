// Biblioteca da B4TIDA — as músicas que as pessoas criam no estúdio.
//
//   POST  /api/batida                 envia uma criação (qualquer pessoa)
//   GET   /api/batida?admin=1         lista tudo (só com x-admin-key)
//   GET   /api/batida                 só os destaques (público: o jogo toca)
//   PATCH /api/batida                 marca/desmarca destaque (x-admin-key)
//
// Armazenamento: Vercel Blob (precisa de BLOB_READ_WRITE_TOKEN no projeto).
// Sem o token: em desenvolvimento grava em .data/batida (gitignored); em
// produção responde 503 e o app guarda a criação no aparelho.
// A listagem completa é só pro LU2CA (BATIDA_ADMIN_KEY): nome e título são
// texto livre de quem enviou e não vão a público sem curadoria.

import { NextResponse, type NextRequest } from "next/server"
import { list, put } from "@vercel/blob"
import { promises as fs } from "node:fs"
import path from "node:path"

const PREFIXO = "batida/criacoes/"
const DESTAQUES = "batida/destaques.json"
const MAX_BYTES = 3 * 1024 * 1024

interface Criacao {
  id: string
  autor: string
  titulo: string
  criadaEm: number
  musica: unknown
}

const temBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN
const local = process.env.NODE_ENV !== "production"
const DIR = path.join(process.cwd(), ".data")

async function gravar(nome: string, dados: unknown) {
  const corpo = JSON.stringify(dados)
  if (temBlob()) {
    await put(nome, corpo, { access: "public", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true })
    return
  }
  const alvo = path.join(DIR, nome)
  await fs.mkdir(path.dirname(alvo), { recursive: true })
  await fs.writeFile(alvo, corpo)
}

async function ler<T>(nome: string): Promise<T | null> {
  try {
    if (temBlob()) {
      const { blobs } = await list({ prefix: nome, limit: 1 })
      if (!blobs[0]) return null
      const r = await fetch(blobs[0].url, { cache: "no-store" })
      return r.ok ? ((await r.json()) as T) : null
    }
    return JSON.parse(await fs.readFile(path.join(DIR, nome), "utf8")) as T
  } catch {
    return null
  }
}

async function listarCriacoes(): Promise<Criacao[]> {
  if (temBlob()) {
    const { blobs } = await list({ prefix: PREFIXO, limit: 500 })
    const todas = await Promise.all(blobs.map(async (b) => {
      try { return (await (await fetch(b.url, { cache: "no-store" })).json()) as Criacao } catch { return null }
    }))
    return todas.filter((c): c is Criacao => !!c)
  }
  try {
    const pasta = path.join(DIR, PREFIXO)
    const arquivos = await fs.readdir(pasta)
    return Promise.all(arquivos.map(async (a) => JSON.parse(await fs.readFile(path.join(pasta, a), "utf8")) as Criacao))
  } catch {
    return []
  }
}

function admin(req: NextRequest) {
  const chave = process.env.BATIDA_ADMIN_KEY
  if (!chave) return local // sem chave configurada, só em dev
  return req.headers.get("x-admin-key") === chave
}

function semArmazenamento() {
  return !temBlob() && !local
}

export async function POST(req: NextRequest) {
  if (semArmazenamento()) return NextResponse.json({ erro: "biblioteca ainda sem armazenamento" }, { status: 503 })
  const texto = await req.text()
  if (texto.length > MAX_BYTES) return NextResponse.json({ erro: "música grande demais" }, { status: 413 })
  let dado: Partial<Criacao>
  try { dado = JSON.parse(texto) } catch { return NextResponse.json({ erro: "json inválido" }, { status: 400 }) }
  if (!dado.musica || typeof dado.musica !== "object") return NextResponse.json({ erro: "sem música" }, { status: 400 })
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const c: Criacao = {
    id,
    autor: String(dado.autor ?? "anônimo").slice(0, 40),
    titulo: String(dado.titulo ?? "sem título").slice(0, 60),
    criadaEm: Date.now(),
    musica: dado.musica,
  }
  await gravar(`${PREFIXO}${id}.json`, c)
  return NextResponse.json({ id })
}

export async function GET(req: NextRequest) {
  const destaques = (await ler<string[]>(DESTAQUES)) ?? []
  if (req.nextUrl.searchParams.get("admin")) {
    if (!admin(req)) return NextResponse.json({ erro: "sem acesso" }, { status: 401 })
    const todas = (await listarCriacoes()).sort((a, b) => b.criadaEm - a.criadaEm)
    return NextResponse.json({ criacoes: todas, destaques, armazenamento: temBlob() ? "blob" : "local" })
  }
  const todas = await listarCriacoes()
  return NextResponse.json({ criacoes: todas.filter((c) => destaques.includes(c.id)) })
}

export async function PATCH(req: NextRequest) {
  if (!admin(req)) return NextResponse.json({ erro: "sem acesso" }, { status: 401 })
  const { id, destaque } = (await req.json()) as { id: string; destaque: boolean }
  const atual = new Set((await ler<string[]>(DESTAQUES)) ?? [])
  if (destaque) atual.add(id)
  else atual.delete(id)
  await gravar(DESTAQUES, [...atual])
  return NextResponse.json({ destaques: [...atual] })
}
