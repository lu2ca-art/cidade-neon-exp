// A QUALIDADE (LU2CA 19–20/10: "aqui o jogo mede o aparelho, celular fraco ou
// forte, e já define a qualidade gráfica sozinho"; "celular pequeno tem que
// ficar liso"). Três níveis; cada um diz o teto da densidade de pixels (a
// resolução dinâmica trabalha embaixo dele), a lente (bloom/SMAA/aberração)
// e até onde se desenham as gotas e os carros.
// A primeira partida mede (MedirAparelho, no Corrida: a travessia do deserto
// é o lugar natural) e guarda em localStorage ("cn-qualidade"). Dá pra refazer
// (a página inicial tem o botão) ou escolher na mão.

export type NivelQualidade = "alto" | "medio" | "baixo"
export type Qualidade = { nivel: NivelQualidade; dprMax: number; lente: 0 | 1 | 2; gotas: number; carros: number; medido: boolean }

const CHAVE = "cn-qualidade"
export const NIVEIS: Record<NivelQualidade, Omit<Qualidade, "nivel" | "medido">> = {
  alto: { dprMax: 1.5, lente: 2, gotas: 450, carros: 900 },
  medio: { dprMax: 1.25, lente: 1, gotas: 300, carros: 500 },
  baixo: { dprMax: 1, lente: 1, gotas: 190, carros: 300 },
}
export const NOME_NIVEL: Record<NivelQualidade, string> = { alto: "alta", medio: "média", baixo: "leve" }

// o palpite antes de medir: celular (toque) com tela pequena começa no médio;
// pouca memória ou poucos núcleos, no leve. O resto começa no alto
function palpite(): NivelQualidade {
  if (typeof window === "undefined") return "alto"
  const nav = navigator as Navigator & { deviceMemory?: number }
  const toque = window.matchMedia?.("(pointer: coarse)").matches
  const fraco = (nav.deviceMemory ?? 8) <= 3 || (nav.hardwareConcurrency ?? 8) <= 4
  if (fraco) return "baixo"
  if (toque && Math.min(screen.width, screen.height) < 500) return "medio"
  return "alto"
}

function ler(): Qualidade {
  let nivel: NivelQualidade = palpite(), medido = false
  try {
    const q = new URLSearchParams(location.search).get("qualidade")
    if (q === "alto" || q === "medio" || q === "baixo") return { nivel: q, ...NIVEIS[q], medido: true }
    const s = JSON.parse(localStorage.getItem(CHAVE) ?? "null")
    if (s && (s.nivel === "alto" || s.nivel === "medio" || s.nivel === "baixo")) { nivel = s.nivel; medido = true }
  } catch {}
  return { nivel, ...NIVEIS[nivel], medido }
}

// o nível vale pro jogo todo (lido uma vez; mudou, o jogo relê na próxima entrada)
export const QUALIDADE: Qualidade = typeof window === "undefined" ? { nivel: "alto", ...NIVEIS.alto, medido: false } : ler()

// quem quer saber quando o nível muda (a cena: a densidade e a lente; a engrenagem do holo)
const ouvintes = new Set<(n: NivelQualidade) => void>()
export function ouvirQualidade(f: (n: NivelQualidade) => void) { ouvintes.add(f); return () => { ouvintes.delete(f) } }
export function guardarQualidade(nivel: NivelQualidade, comoMedida = true) {
  Object.assign(QUALIDADE, { nivel, ...NIVEIS[nivel], medido: comoMedida })
  try { localStorage.setItem(CHAVE, JSON.stringify({ nivel, em: Date.now() })) } catch {}
  ouvintes.forEach((f) => f(nivel))
}
// refazer: esquece a medida (a próxima partida mede de novo)
export function refazerQualidade() {
  try { localStorage.removeItem(CHAVE) } catch {}
  Object.assign(QUALIDADE, { medido: false })
}

// o veredito da medida: o meio e o p90 dos quadros (ms), já com a densidade e a
// lente do nível de partida. Rápido = alto; dá pra segurar 60 com folga
// pouca = médio; abaixo disso, leve
export function veredito(p50: number, p90: number, partida: NivelQualidade): NivelQualidade {
  const ordem: NivelQualidade[] = ["alto", "medio", "baixo"]
  let k = ordem.indexOf(partida)
  if (p50 > 30 || p90 > 50) k = 2
  else if (p50 > 19 || p90 > 30) k = Math.max(k, 1)
  else if (p50 < 13 && p90 < 20) k = Math.max(0, k - 1) // sobra muito: sobe um
  return ordem[k]
}