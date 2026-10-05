// Roda o orçamento de todas as salas (precisa do dev server em localhost:3222).
// Falha se alguma sala passar do limite. uso: bun docs/linha-222/testes/orcamento.mjs
import { execFileSync } from "node:child_process"
const LIMITE = { luzes: 10, triangulos: 60000, malhas: 160 }
const TODAS = ["bar", "balada", "vagao", "escondido", "beco", "topo", "shows", "posto", "drewboy"]
let falhou = false
for (const q of TODAS) {
  const out = execFileSync("bun", [new URL("./orcamento-uma.mjs", import.meta.url).pathname, q], { encoding: "utf8" })
  const m = JSON.parse(out.trim().split("\n").pop().slice(11))
  const estouro = m ? Object.entries(LIMITE).filter(([k, v]) => m[k] > v).map(([k, v]) => `${k} ${m[k]} > ${v}`) : ["sala não abriu"]
  console.log(q.padEnd(10), estouro.length ? "ESTOUROU: " + estouro.join(", ") : `ok (${m.luzes} luzes, ${m.triangulos} triângulos, ${m.malhas} malhas)`)
  if (estouro.length) falhou = true
}
process.exit(falhou ? 1 : 0)
