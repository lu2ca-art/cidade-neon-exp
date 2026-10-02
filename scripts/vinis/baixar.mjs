// Baixa discos de domínio público pros vinis da Kombi (rádio dos discos).
//
// Fonte: Wikimedia Commons (cada arquivo tem a licença na própria página).
// Critério, pensando em lu2ca.art ser brasileiro (precisa ser livre no
// Brasil E nos EUA):
//   - compositor morto antes de 1956 (Brasil: 70 anos após a morte) —
//     garantido pela lista COMPOSITORES abaixo, só se busca por eles
//   - licença na página = domínio público ou CC0
//   - se for "domínio público" (não CC0), a gravação tem que ser de 1925 ou
//     antes (EUA: gravação de 1925 caiu em 2026). Ano desconhecido = fora
//   - CC0 (ex.: Musopen) vale qualquer ano: o músico liberou a gravação
//   - entre 1m30 e 7min
//
// Converte pra mp3 (128k, volume nivelado), salva em public/vinis/ e
// acrescenta em app/linha/vinis.json com título, autor, ano, licença e o
// link da fonte (a prova, se alguém perguntar).
//
// Rodar (precisa de rede pra commons.wikimedia.org e upload.wikimedia.org,
// e ffmpeg instalado):
//   bun scripts/vinis/baixar.mjs --ver      # só lista o que passaria
//   bun scripts/vinis/baixar.mjs            # baixa até 20
//   bun scripts/vinis/baixar.mjs --max 30

import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { join } from "node:path"

const RAIZ = new URL("../../", import.meta.url).pathname
const PASTA = join(RAIZ, "public/vinis")
const LISTA = join(RAIZ, "app/linha/vinis.json")
const API = "https://commons.wikimedia.org/w/api.php"
const UA = "cidade-neon-vinis/1.0 (https://lu2ca.art; jogo Cidade Neon)"
const SO_VER = process.argv.includes("--ver")
const MAX = Number(process.argv[process.argv.indexOf("--max") + 1]) || 20
const POR_COMPOSITOR = 3

// [nome pra busca, ano da morte] — choro primeiro, depois rag/jazz,
// e uns clássicos de piano pra noite
const COMPOSITORES = [
  ["Chiquinha Gonzaga", 1935],
  ["Ernesto Nazareth", 1934],
  ["Anacleto de Medeiros", 1907],
  ["Zequinha de Abreu", 1935],
  ["Joaquim Callado", 1880],
  ["Scott Joplin", 1917],
  ["James Scott ragtime", 1938],
  ["Jelly Roll Morton", 1941],
  ["King Oliver", 1938],
  ["Bix Beiderbecke", 1931],
  ["Erik Satie", 1925],
  ["Claude Debussy", 1918],
  ["Frédéric Chopin", 1849],
]

const txt = (h) => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim()
const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)

async function api(params) {
  const u = new URL(API)
  for (const [k, v] of Object.entries({ format: "json", formatversion: "2", ...params })) u.searchParams.set(k, v)
  const r = await fetch(u, { headers: { "User-Agent": UA } })
  if (!r.ok) throw new Error(`commons ${r.status} em ${u}`)
  return r.json()
}

async function candidatos(nome) {
  const busca = await api({ action: "query", list: "search", srsearch: `${nome} filetype:audio`, srnamespace: "6", srlimit: "40" })
  const titulos = (busca.query?.search ?? []).map((x) => x.title)
  if (!titulos.length) return []
  const out = []
  for (let i = 0; i < titulos.length; i += 20) {
    const info = await api({ action: "query", titles: titulos.slice(i, i + 20).join("|"), prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiextmetadatafilter: "LicenseShortName|License|Artist|DateTimeOriginal|ObjectName|ImageDescription|Credit" })
    for (const p of info.query?.pages ?? []) {
      const ii = p.imageinfo?.[0]
      if (!ii) continue
      out.push({ titulo: p.title, url: ii.url, pagina: ii.descriptionurl, mime: ii.mime, duracao: ii.duration, meta: ii.extmetadata ?? {} })
    }
  }
  return out
}

function avaliar(c, compositor) {
  const m = (k) => txt(c.meta[k]?.value)
  const lic = `${m("LicenseShortName")} ${m("License")}`.toLowerCase()
  const cc0 = /cc0|cc-zero/.test(lic)
  const pd = cc0 || /public domain|^pd|\bpd\b|pd-/.test(lic)
  if (!pd) return { ok: false, porque: `licença "${m("LicenseShortName") || "?"}"` }
  if (!/^audio\//.test(c.mime ?? "") && !/\.(ogg|oga|opus|mp3|flac|wav)$/i.test(c.url)) return { ok: false, porque: "não é áudio" }
  if (c.duracao && (c.duracao < 90 || c.duracao > 420)) return { ok: false, porque: `duração ${Math.round(c.duracao)}s` }
  // ano da gravação: data original, depois o texto da descrição/título
  const fonteAno = `${m("DateTimeOriginal")} ${m("ObjectName")} ${m("ImageDescription")} ${c.titulo}`
  const anos = [...fonteAno.matchAll(/\b(18[89]\d|19[0-9]\d|20[0-2]\d)\b/g)].map((x) => Number(x[1]))
  const ano = anos.length ? Math.min(...anos) : null
  if (!cc0) {
    if (!ano) return { ok: false, porque: "domínio público sem ano da gravação" }
    if (ano > 1925) return { ok: false, porque: `gravação de ${ano} (> 1925)` }
  }
  // o compositor tem que aparecer em algum lugar da página
  const sobrenome = compositor.split(" ").filter((w) => w.length > 3).pop().toLowerCase()
  const tudo = `${fonteAno} ${m("Artist")} ${m("Credit")}`.toLowerCase()
  if (!tudo.normalize("NFD").replace(/[̀-ͯ]/g, "").includes(sobrenome.normalize("NFD").replace(/[̀-ͯ]/g, ""))) return { ok: false, porque: "não cita o compositor" }
  const nome = (m("ObjectName") || c.titulo.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "")).replace(/_/g, " ")
  return { ok: true, nome, ano, licenca: m("LicenseShortName") || (cc0 ? "CC0" : "Public domain"), interprete: m("Artist") }
}

function duracaoReal(arq) {
  try {
    return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", arq]).toString().trim())
  } catch {
    return 0
  }
}

const lista = JSON.parse(readFileSync(LISTA, "utf8"))
const fontes = new Set(lista.map((v) => v.fonte))
mkdirSync(PASTA, { recursive: true })
let novos = 0
const recusados = []

for (const [compositor, morte] of COMPOSITORES) {
  if (novos >= MAX) break
  let deste = 0
  let cs = []
  try {
    cs = await candidatos(compositor)
  } catch (e) {
    console.error(`✗ ${compositor}: ${e.message}`)
    continue
  }
  for (const c of cs) {
    if (novos >= MAX || deste >= POR_COMPOSITOR) break
    if (fontes.has(c.pagina)) continue
    const a = avaliar(c, compositor)
    if (!a.ok) { recusados.push(`${c.titulo} — ${a.porque}`); continue }
    const id = slug(`${compositor}-${a.nome}`)
    const destino = join(PASTA, `${id}.mp3`)
    console.log(`${SO_VER ? "·" : "↓"} ${compositor} (†${morte}) · ${a.nome}${a.ano ? ` · ${a.ano}` : ""} · ${a.licenca}`)
    console.log(`    ${c.pagina}`)
    if (SO_VER) { novos++; deste++; continue }
    const bruto = join(PASTA, `${id}.orig`)
    const r = await fetch(c.url, { headers: { "User-Agent": UA } })
    if (!r.ok) { console.error(`    ✗ download ${r.status}`); continue }
    writeFileSync(bruto, Buffer.from(await r.arrayBuffer()))
    const dur = duracaoReal(bruto)
    if (dur < 90 || dur > 420) { unlinkSync(bruto); recusados.push(`${c.titulo} — duração real ${Math.round(dur)}s`); continue }
    // mp3 128k, volume nivelado (os 78 rpm vêm muito baixos ou estourados)
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", bruto, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "44100", "-b:a", "128k", destino])
    unlinkSync(bruto)
    lista.push({
      titulo: a.nome,
      autor: compositor.replace(/ ragtime$/, ""),
      src: `/vinis/${id}.mp3`,
      ano: a.ano,
      licenca: a.licenca,
      interprete: a.interprete || undefined,
      fonte: c.pagina,
    })
    fontes.add(c.pagina)
    writeFileSync(LISTA, JSON.stringify(lista, null, 2) + "\n")
    novos++
    deste++
  }
}

console.log(`\n${SO_VER ? "passariam" : "baixados"}: ${novos} · recusados: ${recusados.length}`)
if (process.argv.includes("--recusados")) for (const r of recusados) console.log(`  - ${r}`)
if (!SO_VER && novos) console.log(`lista: ${LISTA}\nconfere cada link de fonte antes de subir pro main.`)
