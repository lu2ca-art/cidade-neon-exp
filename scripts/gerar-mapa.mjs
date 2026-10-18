// Gera docs/ARQUITETURA.md: salas, acoplamento, módulos mais usados, ciclos e arquivos órfãos.
// Sem dependências: lê os imports (@/, ./, ../) dos arquivos de app, components, lib e hooks.
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join, normalize } from "node:path"

const PASTAS = ["app", "components", "lib", "hooks"]
const EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs"]
const ESPECIAIS = /^(page|layout|route|loading|error|global-error|not-found|template|default|opengraph-image|icon|sitemap|robots|manifest|middleware|proxy|instrumentation)\.(tsx?|jsx?)$/

const arquivos = []
const varre = (d) => {
  for (const f of readdirSync(d)) {
    if (f === "node_modules" || f.startsWith(".")) continue
    const p = join(d, f)
    if (statSync(p).isDirectory()) varre(p)
    else if (EXT.some((e) => f.endsWith(e)) && !f.endsWith(".d.ts")) arquivos.push(p)
  }
}
PASTAS.filter(existsSync).forEach(varre)
arquivos.sort()
const conjunto = new Set(arquivos)

const resolve = (de, alvo) => {
  let base
  if (alvo.startsWith("@/")) base = normalize(alvo.slice(2))
  else if (alvo.startsWith(".")) base = normalize(join(dirname(de), alvo))
  else return null
  for (const c of [base, ...EXT.map((e) => base + e), ...EXT.map((e) => join(base, "index" + e))]) if (conjunto.has(c)) return c
  return null
}

const RE = /(?:from\s*|import\s*\(\s*|import\s+|require\(\s*)["']([^"']+)["']/g
const linhasDe = new Map()
const importa = new Map()
const importadoPor = new Map(arquivos.map((a) => [a, new Set()]))
for (const a of arquivos) {
  const t = readFileSync(a, "utf8")
  linhasDe.set(a, t.split("\n").length)
  const alvos = new Set()
  for (const m of t.matchAll(RE)) {
    const r = resolve(a, m[1])
    if (r && r !== a) alvos.add(r)
  }
  importa.set(a, alvos)
  alvos.forEach((r) => importadoPor.get(r).add(a))
}

const area = (a) => {
  const [p, s] = a.split("/")
  return p === "app" && s && !s.includes(".") ? `app/${s}` : p === "app" ? "app (raiz)" : p
}

const salas = new Map()
for (const a of arquivos) {
  const k = area(a)
  const o = salas.get(k) ?? { arq: 0, lin: 0, usa: new Set() }
  o.arq++
  o.lin += linhasDe.get(a)
  for (const r of importa.get(a)) if (area(r) !== k) o.usa.add(area(r))
  salas.set(k, o)
}

const orfaos = arquivos.filter((a) => !importadoPor.get(a).size && !ESPECIAIS.test(a.split("/").pop()))

// ciclos (Tarjan)
let idx = 0
const pilha = [], estado = new Map(), ciclos = []
const forte = (v) => {
  estado.set(v, { i: idx, low: idx, na: true }); idx++; pilha.push(v)
  for (const w of importa.get(v)) {
    if (!estado.has(w)) { forte(w); estado.get(v).low = Math.min(estado.get(v).low, estado.get(w).low) }
    else if (estado.get(w).na) estado.get(v).low = Math.min(estado.get(v).low, estado.get(w).i)
  }
  if (estado.get(v).low === estado.get(v).i) {
    const c = []; let w
    do { w = pilha.pop(); estado.get(w).na = false; c.push(w) } while (w !== v)
    if (c.length > 1) ciclos.push(c.sort())
  }
}
arquivos.forEach((a) => estado.has(a) || forte(a))

const topo = (arr, n) => arr.slice(0, n)
const porFanIn = [...arquivos].sort((x, y) => importadoPor.get(y).size - importadoPor.get(x).size || x.localeCompare(y))
const porLinhas = [...arquivos].sort((x, y) => linhasDe.get(y) - linhasDe.get(x) || x.localeCompare(y))

const out = [
  "# Arquitetura (mapa gerado)",
  "",
  "Gerado por `node scripts/gerar-mapa.mjs` (`bun run mapa`). Não editar à mão. Cobre `app/`, `components/`, `lib/` e `hooks/`, só imports estáticos e dinâmicos com string.",
  "",
  `${arquivos.length} arquivos, ${[...linhasDe.values()].reduce((s, n) => s + n, 0)} linhas, ${ciclos.length} ciclos de importação, ${orfaos.length} arquivos que ninguém importa.`,
  "",
  "## Áreas",
  "`usa` = outras áreas que esta importa. Sala que usa outra sala é acoplamento: mexer numa quebra a outra.",
  "",
  "| área | arquivos | linhas | usa |",
  "|---|---|---|---|",
  ...[...salas.entries()].sort((a, b) => b[1].lin - a[1].lin).map(([k, o]) => `| ${k} | ${o.arq} | ${o.lin} | ${[...o.usa].sort().join(", ") || "—"} |`),
  "",
  "## Módulos mais importados (mexer aqui afeta muita coisa)",
  "| arquivo | importado por |",
  "|---|---|",
  ...topo(porFanIn, 20).map((a) => `| ${a} | ${importadoPor.get(a).size} |`),
  "",
  "## Maiores arquivos (candidatos a dividir)",
  "| arquivo | linhas |",
  "|---|---|",
  ...topo(porLinhas, 15).map((a) => `| ${a} | ${linhasDe.get(a)} |`),
  "",
  "## Ciclos de importação",
  ciclos.length ? ciclos.map((c) => `- ${c.join(" ⇄ ")}`).join("\n") : "Nenhum.",
  "",
  "## Arquivos que ninguém importa (código morto ou entrada por configuração)",
  "Confira antes de apagar: pode ser carregado por caminho dinâmico.",
  "",
  ...orfaos.map((a) => `- ${a} (${linhasDe.get(a)} linhas)`),
  "",
].join("\n")
writeFileSync("docs/ARQUITETURA.md", out)
console.log(`docs/ARQUITETURA.md: ${arquivos.length} arquivos, ${ciclos.length} ciclos, ${orfaos.length} órfãos`)
