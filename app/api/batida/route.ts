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
import { randomUUID, timingSafeEqual } from "node:crypto"

const PREFIXO = "batida/criacoes/"
const DESTAQUES = "batida/destaques.json"
// os destaques prontos (as criações inteiras), refeitos a cada PATCH: o GET
// público lê um arquivo só, em vez de baixar todas as criações a cada visita
const VITRINE = "batida/vitrine.json"
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
  // comparação em tempo constante (não vaza pelo tempo quantos caracteres batem)
  const a = Buffer.from(req.headers.get("x-admin-key") ?? "")
  const b = Buffer.from(chave)
  return a.length === b.length && timingSafeEqual(a, b)
}

// freio contra enxurrada de envios: por IP, poucos por minuto. É por
// instância (serverless), então é um freio, não um muro — o muro de
// verdade é a regra de rate limit no firewall da Vercel
const JANELA = 60_000
const LIMITE = 6
const envios = new Map<string, number[]>()
function devagar(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?"
  const agora = Date.now()
  const lista = (envios.get(ip) ?? []).filter((t) => agora - t < JANELA)
  lista.push(agora)
  envios.set(ip, lista)
  if (envios.size > 5000) envios.clear()
  return lista.length > LIMITE
}

function semArmazenamento() {
  return !temBlob() && !local
}

export async function POST(req: NextRequest) {
  if (semArmazenamento()) return NextResponse.json({ erro: "biblioteca ainda sem armazenamento" }, { status: 503 })
  if (devagar(req)) return NextResponse.json({ erro: "calma. tenta de novo daqui a pouco" }, { status: 429 })
  // recusa antes de ler, se o próprio pedido já diz que é grande demais
  const tam = Number(req.headers.get("content-length") ?? 0)
  if (tam > MAX_BYTES) return NextResponse.json({ erro: "música grande demais" }, { status: 413 })
  const texto = await req.text()
  if (texto.length > MAX_BYTES) return NextResponse.json({ erro: "música grande demais" }, { status: 413 })
  let dado: Partial<Criacao>
  try { dado = JSON.parse(texto) } catch { return NextResponse.json({ erro: "json inválido" }, { status: 400 }) }
  if (!dado.musica || typeof dado.musica !== "object") return NextResponse.json({ erro: "sem música" }, { status: 400 })
  // id impossível de adivinhar: o arquivo fica num link público do Blob, e
  // criação sem curadoria não pode ser achada chutando endereço
  const id = randomUUID()
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
  let vitrine = await ler<Criacao[]>(VITRINE)
  if (!vitrine) {
    // primeira vez (ou arquivo perdido): monta e guarda
    vitrine = (await listarCriacoes()).filter((c) => destaques.includes(c.id))
    await gravar(VITRINE, vitrine)
  }
  // a borda da Vercel guarda a resposta por 1 minuto
  return NextResponse.json({ criacoes: vitrine }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } })
}

export async function PATCH(req: NextRequest) {
  if (!admin(req)) return NextResponse.json({ erro: "sem acesso" }, { status: 401 })
  const { id, destaque } = (await req.json()) as { id: unknown; destaque: unknown }
  if (typeof id !== "string" || !/^[\w-]{6,64}$/.test(id) || typeof destaque !== "boolean") return NextResponse.json({ erro: "pedido inválido" }, { status: 400 })
  const atual = new Set((await ler<string[]>(DESTAQUES)) ?? [])
  if (destaque) atual.add(id)
  else atual.delete(id)
  await gravar(DESTAQUES, [...atual])
  await gravar(VITRINE, (await listarCriacoes()).filter((c) => atual.has(c.id)))
  return NextResponse.json({ destaques: [...atual] })
}
