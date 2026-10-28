// A CORRIDA NAS TRINCHEIRAS (T13): a missão dos túneis. O jogador escolhe
// BMX, patins ou skate e dá a volta no triângulo: larga na TORRE 1, passa
// pelos 3 rios secos (um portão no meio de cada) e chega de volta na torre.
// Corre contra 3 rivais (IA leve: andam pela linha do meio da volta, com um
// elástico pra a corrida ficar apertada) e contra o próprio fantasma (a
// melhor volta, salva no aparelho, uma por veículo).
//
// Só a lógica (sem React nem three): a física de cada veículo, os portões,
// os rivais, o fantasma e os recordes.

import { AVENIDAS, CURVA, LEITO, NOME_AVENIDA, PRACA, SUBIDA_MAX, TETO, TORRES, VOLTA, perfil, type P2 } from "./mapa"

// T14: a moto chega depois (trancada na escolha; ?motos libera)
export type Veiculo = "bmx" | "patins" | "skate" | "moto"
export const VEICULOS: Veiculo[] = ["bmx", "patins", "skate", "moto"]

// a sensação de cada um (m/s, m/s², 1/s). Patins = o que já existia no T11.
export type Fisica = {
  vmax: number // o teto empurrando/pedalando
  acel: number // o quanto empurra
  excesso: number // acima do teto, o quanto perde por segundo (o embalo dura mais no skate)
  rolar: number // sem empurrar, o quanto perde por segundo (o skate rola solto)
  aderencia: number // o quanto as rodas seguram de lado
  pulo: number // a velocidade do pulo
  voo: number // a força do voo da borda da parede
  giroAr: number // o quanto gira no ar
  bonus: number // m/s ganhos por manobra limpa (ou por giro de 360)
  jato: boolean // patins: o jato das costas
  manobras: string[] // no ar, o botão de ação faz uma destas
  durManobra: number
  grind: boolean // skate: segura o botão na beira de cima da parede e desliza no trilho
  embalo: number // skate: subiu na parede e voltou pro leito, ganha (m/s por metro de altura)
  moto: boolean // T14: a física da moto (moto.ts): peso pra frente/trás e wall-ride
}

export const FISICA: Record<Veiculo, Fisica> = {
  patins: { vmax: 30, acel: 15, excesso: 8, rolar: 1.2, aderencia: 7, pulo: 7.5, voo: 0.9, giroAr: 4.2, bonus: 0, jato: true, manobras: [], durManobra: 0, grind: false, embalo: 0, moto: false },
  bmx: { vmax: 29, acel: 17, excesso: 3.5, rolar: 1.6, aderencia: 10, pulo: 9.8, voo: 1.15, giroAr: 5.6, bonus: 3.2, jato: false, manobras: ["BARSPIN", "TAILWHIP", "SUPERMAN"], durManobra: 0.5, grind: false, embalo: 0, moto: false },
  skate: { vmax: 26, acel: 11, excesso: 1.4, rolar: 0.35, aderencia: 6, pulo: 7.2, voo: 0.95, giroAr: 4.6, bonus: 2, jato: false, manobras: ["KICKFLIP", "HEELFLIP"], durManobra: 0.42, grind: true, embalo: 1.6, moto: false },
  // a moto: motocross leve (pula alto, gira fácil no ar), mas a mais rápida;
  // o resto da sensação (empinar, pouso, wall-ride) fica em AJUSTE_MOTO (moto.ts)
  moto: { vmax: 35, acel: 19, excesso: 3, rolar: 2.2, aderencia: 9, pulo: 8.5, voo: 1.05, giroAr: 3.2, bonus: 2.6, jato: false, manobras: [], durManobra: 0, grind: false, embalo: 0, moto: true },
}
export const V_TETO = 38 // ninguém passa disso (138 km/h)
export const V_GRIND = 36
export const V_EMBALO = 34 // o embalo do skate leva até aqui (122 km/h)

export const INFO: Record<Veiculo, { nome: string; frase: string; acao: string; teclas: string }> = {
  bmx: { nome: "BMX", frase: "pulos e manobras: no ar, aperte a manobra; caia limpo e ganhe embalo", acao: "manobra", teclas: "espaço pula · shift ou E: manobra no ar (barspin, tailwhip, superman) · setas giram no ar: 360 também vale" },
  patins: { nome: "PATINS", frase: "o jato das costas e as paredes: suba rápido e voe da borda", acao: "jato", teclas: "espaço pula · shift ou E: o jato · suba nas paredes, rápido você voa" },
  skate: { nome: "SKATE", frase: "grind e embalo: desça as paredes pra ganhar velocidade e deslize no trilho lá em cima", acao: "grind", teclas: "zigue-zague nas paredes dá embalo · segure shift ou E na beira de cima: grind no trilho · no ar: kickflip" },
  moto: { nome: "MOTO", frase: "motocross leve: suba rápido na parede e ande nela; no ar, jogue o peso e caia de rodas no chão", acao: "empina", teclas: "suba rápido na parede: anda nela (vire pra parede pra subir) · shift ou E empina · no ar: ▲ peso pra frente, ▼ peso pra trás · caia alinhado" },
}

// ── a volta: o comprimento acumulado de cada ponto da linha do meio ──
const N = VOLTA.length
export const CUM: number[] = (() => {
  const c = [0]
  for (let k = 1; k < N; k++) c.push(c[k - 1] + Math.hypot(VOLTA[k].x - VOLTA[k - 1].x, VOLTA[k].z - VOLTA[k - 1].z))
  return c
})()
export const L_VOLTA = CUM[N - 1] + Math.hypot(VOLTA[0].x - VOLTA[N - 1].x, VOLTA[0].z - VOLTA[N - 1].z)

// o ponto da volta a "d" metros, deslocado "lado" metros pro lado; se o
// lado passa do leito, sobe na parede curva
export type Pose = { x: number; z: number; y: number; yaw: number; incl: number; nx: number; nz: number }
export function naVolta(d: number, lado: number, out: Pose): Pose {
  const dd = ((d % L_VOLTA) + L_VOLTA) % L_VOLTA
  let lo = 0, hi = N - 1
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (CUM[m] <= dd) lo = m; else hi = m - 1 }
  const a = VOLTA[lo], b = VOLTA[(lo + 1) % N], seg = (lo + 1 < N ? CUM[lo + 1] : L_VOLTA) - CUM[lo]
  const f = seg > 0 ? (dd - CUM[lo]) / seg : 0
  const tx = (b.x - a.x) / (seg || 1), tz = (b.z - a.z) / (seg || 1)
  const nx = tz, nz = -tx // a direita de quem anda (yaw = atan2(tx, tz))
  const e = Math.abs(lado) - LEITO, p = perfil(e), s = Math.sign(lado) || 1
  // T14: passou da curva = andando na parede (as motos rivais): sobe na parede em pé
  const naParede = e > SUBIDA_MAX
  const l = naParede ? s * (LEITO + CURVA - 0.05) : lado
  out.x = a.x + (b.x - a.x) * f + nx * l
  out.z = a.z + (b.z - a.z) * f + nz * l
  out.y = naParede ? Math.min(TETO - 1.6, p.y + (e - SUBIDA_MAX) * 1.5) : p.y
  out.yaw = Math.atan2(tx, tz)
  out.incl = naParede ? 12 : p.incl
  out.nx = nx * s; out.nz = nz * s
  return out
}

// o ponto da volta mais perto de (x, z), procurando perto do último
export function acompanhar(k0: number, x: number, z: number): number {
  let kb = k0, db = Infinity
  for (let d = -12; d <= 30; d++) { const k = (k0 + d + N) % N, p = VOLTA[k], q = (p.x - x) ** 2 + (p.z - z) ** 2; if (q < db) { db = q; kb = k } }
  return kb
}

// ── os portões: a largada, um no meio de cada rio e a chegada ──
export type Portao = { k: number; x: number; z: number; lx: number; lz: number; nome: string; cor: string }
const BORDA_PRACA = PRACA - CURVA + 2
const T0 = TORRES[0].c
function portaoEm(k: number, nome: string, cor: string): Portao {
  const a = VOLTA[Math.max(0, k - 1)], b = VOLTA[Math.min(N - 1, k + 1)], L = Math.hypot(b.x - a.x, b.z - a.z) || 1
  return { k, x: VOLTA[k].x, z: VOLTA[k].z, lx: (b.z - a.z) / L, lz: -(b.x - a.x) / L, nome, cor }
}
const longeDaTorre0 = (p: P2) => Math.hypot(p.x - T0.x, p.z - T0.z) > BORDA_PRACA
export const LARGADA = portaoEm(VOLTA.findIndex(longeDaTorre0), "LARGADA", "#ffffff")
export const CHEGADA = portaoEm(N - 1 - [...VOLTA].reverse().findIndex(longeDaTorre0), "CHEGADA", "#ffffff")
export const CHECKPOINTS: Portao[] = (() => {
  let off = 0
  return AVENIDAS.map((a) => {
    const k = off + Math.floor((a.pts.length - 1) / 2)
    off += a.pts.length - 1
    return portaoEm(k, NOME_AVENIDA[a.i], ["#ff3fb0", "#2fe8ff", "#ffc857"][a.i])
  })
})()
export const RAIO_PORTAO = 16 // passou a menos disso do meio do portão: valeu
export const RAIO_CHEGADA = PRACA - CURVA // entrou na praça da torre 1 depois dos 3 rios

// ── os rivais (IA leve) ──
export type Rival = { nome: string; veiculo: Veiculo; cor: string; base: number; fase: number; d: number; v: number; lado: number; fim: number | null; ant: { d: number; lado: number } }
// RASCUNHO: os nomes e as cores (o dono escolhe quem corre nos túneis)
const RIVAIS_BASE: Omit<Rival, "d" | "v" | "lado" | "fim" | "ant">[] = [
  { nome: "FAÍSCA", veiculo: "bmx", cor: "#ff7a3c", base: 28.4, fase: 0.4 },
  { nome: "CORUJA", veiculo: "skate", cor: "#7dffb0", base: 27.2, fase: 2.2 },
  { nome: "RATO", veiculo: "patins", cor: "#c08cff", base: 27.8, fase: 4.3 },
]
// T14: as motos rivais (RASCUNHO: nomes e cores). Mais rápidas e mais
// juntas (corrida pesada): o elástico aperta mais, e elas sobem nas paredes
const RIVAIS_MOTO: Omit<Rival, "d" | "v" | "lado" | "fim" | "ant">[] = [
  { nome: "TROVÃO", veiculo: "moto", cor: "#ff4d4d", base: 33.4, fase: 0.3 },
  { nome: "VESPA", veiculo: "moto", cor: "#ffd23f", base: 32.9, fase: 1.9 },
  { nome: "LAMA", veiculo: "moto", cor: "#9cff57", base: 32.4, fase: 3.4 },
  { nome: "SOMBRA", veiculo: "moto", cor: "#8f7bff", base: 31.8, fase: 5.0 },
]
const ladoDe = (r: { fase: number; veiculo: Veiculo }, d: number) => {
  if (r.veiculo !== "moto") return 8 * Math.sin(d * 0.008 + r.fase) + 2.5 * Math.sin(d * 0.027 + r.fase * 2)
  // a moto: serpenteia no leito e, de vez em quando, sobe e anda na parede
  const base = 6.5 * Math.sin(d * 0.009 + r.fase), parede = 9.5 * Math.max(0, Math.sin(d * 0.0105 + r.fase * 3)) ** 6
  return base + (Math.sign(base) || 1) * parede
}
export function criarRivais(veiculo: Veiculo = "patins"): Rival[] {
  const lista = veiculo === "moto" ? RIVAIS_MOTO : RIVAIS_BASE
  return lista.map((r, i) => { const d = -3 - i * 2.5, lado = ladoDe(r, d); return { ...r, d, v: 0, lado, fim: null, ant: { d, lado } } })
}
// anda um passo: corre na base (com um balanço) e, se o jogador ficou muito
// pra trás ou muito na frente, o elástico aperta (a corrida fica disputada)
export function passoRival(r: Rival, dt: number, tempo: number, progJogador: number, correndo: boolean, voltas = 1) {
  r.ant.d = r.d; r.ant.lado = r.lado
  let alvo = 0
  if (correndo && r.fim == null) {
    alvo = r.base * (1 + 0.05 * Math.sin(tempo * 0.37 + r.fase))
    const dif = r.d - progJogador
    const moto = r.veiculo === "moto" // corrida pesada: o bolo fica mais junto
    if (dif > (moto ? 60 : 90)) alvo *= moto ? 0.9 : 0.93
    else if (dif < (moto ? -45 : -70)) alvo *= moto ? 1.12 : 1.08
  }
  r.v += Math.max(-8 * dt, Math.min(5 * dt, alvo - r.v))
  r.d += r.v * dt
  r.lado = ladoDe(r, r.d)
  if (correndo && r.fim == null && r.d >= L_VOLTA * voltas) r.fim = tempo
}

// ── o fantasma e os recordes (no aparelho) ──
export const RASTRO_HZ = 10
export type Recorde = { ms: number; rastro: number[] } // rastro: x, z, y, yaw a cada 1/10 s
const CHAVE = "trincheiras-corrida-v1"
export function lerRecordes(): Partial<Record<Veiculo, Recorde>> {
  try { const r = JSON.parse(localStorage.getItem(CHAVE) ?? "{}"); return r && typeof r === "object" ? r : {} } catch { return {} }
}
export function salvarRecorde(v: Veiculo, rec: Recorde) {
  try { const r = lerRecordes(); r[v] = rec; localStorage.setItem(CHAVE, JSON.stringify(r)) } catch { /* sem espaço ou bloqueado: segue sem salvar */ }
}
export function poseFantasma(rastro: number[], t: number, out: { x: number; z: number; y: number; yaw: number }): boolean {
  const n = rastro.length / 4
  if (n < 2) return false
  const f = t * RASTRO_HZ, i = Math.floor(f)
  if (i >= n - 1) return false
  const k = f - i, a = i * 4, b = a + 4
  out.x = rastro[a] + (rastro[b] - rastro[a]) * k
  out.z = rastro[a + 1] + (rastro[b + 1] - rastro[a + 1]) * k
  out.y = rastro[a + 2] + (rastro[b + 2] - rastro[a + 2]) * k
  let dy = rastro[b + 3] - rastro[a + 3]; dy = Math.atan2(Math.sin(dy), Math.cos(dy))
  out.yaw = rastro[a + 3] + dy * k
  return true
}

export function relogio(s: number | null | undefined): string {
  if (s == null || !isFinite(s)) return "—"
  const m = Math.floor(s / 60), r = s - m * 60
  return `${m}:${r < 10 ? "0" : ""}${r.toFixed(2)}`
}
