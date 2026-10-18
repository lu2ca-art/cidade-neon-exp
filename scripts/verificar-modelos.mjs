// Confere os .glb de public/models contra o orçamento em scripts/orcamento-modelos.json.
//   node scripts/verificar-modelos.mjs            → falha (exit 1) se um modelo NOVO estoura o orçamento
//   node scripts/verificar-modelos.mjs --baseline → grava os modelos atuais como "legado" (só avisa, não falha)
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"

const RAIZ = "public/models"
const CFG = "scripts/orcamento-modelos.json"
const cfg = JSON.parse(readFileSync(CFG, "utf8"))

const glbs = []
const varre = (d) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f)
    if (statSync(p).isDirectory()) varre(p)
    else if (f.toLowerCase().endsWith(".glb")) glbs.push(p)
  }
}
varre(RAIZ)

function dimImagem(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)]
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue }
      const m = buf[i + 1]
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]
      i += 2 + buf.readUInt16BE(i + 2)
    }
  }
  return null
}

function analisa(arquivo) {
  const b = readFileSync(arquivo)
  if (b.readUInt32LE(0) !== 0x46546c67) throw new Error("não é GLB")
  const tamJson = b.readUInt32LE(12)
  const json = JSON.parse(b.subarray(20, 20 + tamJson).toString("utf8"))
  const binIni = 20 + tamJson + 8
  let tris = 0
  for (const m of json.meshes ?? []) {
    for (const p of m.primitives) {
      const modo = p.mode ?? 4
      const n = p.indices !== undefined ? json.accessors[p.indices].count : json.accessors[p.attributes.POSITION].count
      tris += modo === 4 ? n / 3 : modo === 5 || modo === 6 ? Math.max(0, n - 2) : 0
    }
  }
  let maiorTextura = 0
  for (const im of json.images ?? []) {
    if (im.bufferView === undefined) continue
    const bv = json.bufferViews[im.bufferView]
    const d = dimImagem(b.subarray(binIni + (bv.byteOffset ?? 0), binIni + (bv.byteOffset ?? 0) + bv.byteLength))
    if (d) maiorTextura = Math.max(maiorTextura, d[0], d[1])
  }
  const ext = json.extensionsUsed ?? []
  return {
    kb: Math.round(b.length / 1024),
    tris: Math.round(tris),
    texturas: (json.images ?? []).length,
    maiorTextura,
    comprimido: ext.includes("KHR_draco_mesh_compression") || ext.includes("EXT_meshopt_compression"),
  }
}

const linhas = glbs.map((g) => ({ arq: relative(RAIZ, g), ...analisa(g) }))

if (process.argv.includes("--baseline")) {
  const legado = linhas.filter((l) => violacoes(l).length).map((l) => l.arq).sort()
  writeFileSync(CFG, JSON.stringify({ ...cfg, legado }, null, 2) + "\n")
  console.log(`baseline: ${legado.length} modelos legados gravados em ${CFG}`)
  process.exit(0)
}

function violacoes(l) {
  const v = []
  if (l.kb > cfg.maxKB) v.push(`${l.kb} KB > ${cfg.maxKB} KB`)
  if (l.tris > cfg.maxTriangulos) v.push(`${l.tris} triângulos > ${cfg.maxTriangulos}`)
  if (l.texturas > cfg.maxTexturas) v.push(`${l.texturas} texturas > ${cfg.maxTexturas}`)
  if (l.maiorTextura > cfg.maxLadoTextura) v.push(`textura ${l.maiorTextura}px > ${cfg.maxLadoTextura}px`)
  return v
}

const legado = new Set(cfg.legado ?? [])
let falhas = 0
for (const l of linhas) {
  const v = violacoes(l)
  if (!v.length) continue
  const velho = legado.has(l.arq)
  if (!velho) falhas++
  console.log(`${velho ? "aviso (legado)" : "FALHA"}: ${l.arq}: ${v.join("; ")}${l.comprimido ? "" : " [sem compressão]"}`)
}
console.log(`${linhas.length} modelos, ${falhas} fora do orçamento (novos), ${legado.size} legados`)
if (falhas) {
  console.log("Otimize: bunx @gltf-transform/cli optimize entrada.glb saida.glb --compress meshopt --texture-compress webp   (ver docs/FUNIL-TRIPO.md)")
  process.exit(1)
}
