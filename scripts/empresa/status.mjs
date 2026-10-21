// O STATUS DA EMPRESA (21/10): lê o BACKLOG.md e escreve RELATORIOS/status.json,
// o arquivo que o dashboard vivo da empresa mostra (uma linha por item: área,
// estado, commit, prova). Rodar ao fim de cada tarefa e subir o arquivo pro
// dashboard (ver "Regras da casa" no CLAUDE.md).
//   bun scripts/empresa/status.mjs
import { readFileSync, writeFileSync } from "node:fs"
import { execSync } from "node:child_process"

const raiz = new URL("../../", import.meta.url).pathname
const texto = readFileSync(raiz + "BACKLOG.md", "utf8")

const SECOES = { "Em andamento": "em andamento", "Fila": "na fila", "Aguardando o dono": "aguardando o dono", "Feito": "feito" }
const AREAS = ["gameplay", "áudio", "arte-3d", "ui", "level", "narrativa", "performance", "qa", "diretor"]
// itens sem área escrita: a área pelo assunto
const PISTAS = [
  [/física|propulsor|drift|pinball|gravidade/i, "gameplay"],
  [/música|tema|prévia|voz|som|áudio|22 s/i, "áudio"],
  [/mapa|feira|marcação|foco|holo|widget/i, "ui"],
  [/torre|lançamento|missão|missões/i, "level"],
  [/fala|roteiro|personagem|história/i, "narrativa"],
  [/empresa|dashboard|disparador|backlog/i, "diretor"],
]
const normaliza = (a) => ({ audio: "áudio", "arte 3d": "arte-3d" })[a] ?? a

const linhas = []
let estado = null, ordem = 0
for (const bruta of texto.split("\n")) {
  const sec = bruta.match(/^## (.+?)(\s*\(|$)/)
  if (sec) { estado = Object.entries(SECOES).find(([k]) => sec[1].startsWith(k))?.[1] ?? null; continue }
  if (!estado) continue
  const m = bruta.match(/^(?:- |\d+[a-z]?\. |[A-Z]\d+[a-z]?\. |~~)(.*)$/)
  if (!m) continue
  let corpo = m[1].trim()
  if (!corpo || corpo.startsWith("(nada")) continue
  const riscado = bruta.startsWith("~~")
  const idm = bruta.match(/^\s*(?:- )?\**([A-Z]?\d+[a-z]?)\./) ?? corpo.match(/^\*\*([A-Z]?\d+[a-z]?)\./)
  const titulo = (corpo.match(/\*\*(.+?)\*\*/)?.[1] ?? corpo.split("·")[0]).replace(/^[A-Z]?\d+[a-z]?\.\s*/, "").replace(/~~/g, "").trim()
  const partes = corpo.split("·").map((s) => s.trim())
  let areas = partes.length > 1 ? partes[1].split("+").map((a) => normaliza(a.trim().toLowerCase())).filter((a) => AREAS.includes(a)) : []
  if (!areas.length) { const p = PISTAS.find(([re]) => re.test(corpo)); areas = [p ? p[1] : "diretor"] }
  const commit = corpo.match(/\(([0-9a-f]{7})\)/)?.[1] ?? null
  const prova = estado === "feito" ? (partes.slice(1).join(" · ").replace(/\*\*/g, "") || null) : null
  for (const area of areas) {
    linhas.push({
      id: `${(idm?.[1] ?? `x${ordem}`)}-${area}`,
      item: idm?.[1] ?? "",
      titulo: titulo.slice(0, 140),
      area,
      estado: riscado ? "feito" : estado,
      ordem: ordem,
      commit,
      prova: prova ? prova.slice(0, 400) : null,
    })
  }
  ordem++
}
let ultimo = null
try { ultimo = execSync("git log -1 --format=%h·%cI·%s", { cwd: raiz }).toString().trim() } catch {}
const saida = { gerado: new Date().toISOString(), ultimoCommit: ultimo, rows: linhas }
writeFileSync(raiz + "RELATORIOS/status.json", JSON.stringify(saida, null, 1))
console.log(`status: ${linhas.length} linhas`, Object.fromEntries(Object.values(SECOES).map((e) => [e, linhas.filter((l) => l.estado === e).length])))
