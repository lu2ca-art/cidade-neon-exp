// A CORRIDA DE RUA DO SUBÚRBIO (05/11; bíblia §4: "o subúrbio é o mundo aberto,
// onde acontecem as corridas"; §8: lá embaixo é a pé, de patins ou de moto).
//
// Um circuito pelas ruas das ruínas (ruinasDados.ts: quadras de 40 m e ruas de
// 12 m numa grade; os eixos das ruas ficam em x = -948 + 52·i e z = -732 + 52·j).
// O traçado segue os eixos das ruas, com curvas fechadas nos cruzamentos, uma
// diagonal que corta a praça na frente do bar e duas retas compridas (a da
// largada, rumo à oficina, e a de baixo, a do palco). Passa perto do bar
// (26 m), da oficina (28 m) e da quadra (36 m), sem atravessar prédio nem
// lugar. Conferido por `bun scripts/corrida-rua-conferir.ts` (folga até a
// parede, os pilares das pistas, os lugares e a borda do subúrbio).
// O desenho do traçado (ASCII) está em docs/corrida-suburbio.md.
//
// Só a lógica (sem React nem three): o traçado, os portões, os rivais e o placar.

// os cantos, no sentido da corrida. O primeiro é a linha de largada/chegada
// (na reta do bar, rumo leste, ~47 m do bar)
export const CANTOS_RUA: readonly (readonly [number, number])[] = [
  [-690, -680], // LARGADA · a reta do bar, rumo à oficina
  [-532, -680], // dobra pro sul
  [-532, -576], // a oficina fica do lado (28 m)
  [-688, -576], // de volta pra oeste, embaixo da pista
  [-688, -524],
  [-844, -524], // a reta do palco (47 m)
  [-844, -680],
  [-896, -680],
  [-896, -836], // a quadra fica do lado (36 m)
  [-844, -836],
  [-844, -888],
  [-688, -888],
  [-688, -784], // perto da boca do túnel (a rampa fica a uns 60 m)
  [-792, -784],
  [-792, -732],
  [-740, -732],
  [-740, -712],
  [-704, -680], // a diagonal na frente do bar (26 m) e volta pra reta
]
// o raio das curvas (no eixo): a rua tem 12 m e a folga até a parede é de 5 m ou mais
export const RAIO_CURVA = 9
// a meia largura da rua de correr (o portão cobre isso)
export const MEIA_RUA = 6
export const VOLTAS_RUA = 2

export type P2 = { x: number; z: number }

// ── a linha do meio: as retas e os arcos das curvas, de 2 em 2 m ──
function linhaDoMeio(): P2[] {
  const n = CANTOS_RUA.length
  const out: P2[] = []
  const passo = 2
  // cada canto vira um arco de raio RAIO_CURVA, tangente às duas retas
  const arcos = CANTOS_RUA.map((c, i) => {
    const a = CANTOS_RUA[(i - 1 + n) % n], b = CANTOS_RUA[(i + 1) % n]
    let ux = c[0] - a[0], uz = c[1] - a[1]; const la = Math.hypot(ux, uz); ux /= la; uz /= la
    let vx = b[0] - c[0], vz = b[1] - c[1]; const lb = Math.hypot(vx, vz); vx /= lb; vz /= lb
    const cos = Math.max(-1, Math.min(1, ux * vx + uz * vz)), ang = Math.acos(cos)
    if (ang < 1e-3) return { ent: { x: c[0], z: c[1] }, sai: { x: c[0], z: c[1] }, pts: [] as P2[] }
    const t = RAIO_CURVA * Math.tan(ang / 2)
    const ent = { x: c[0] - ux * t, z: c[1] - uz * t }, sai = { x: c[0] + vx * t, z: c[1] + vz * t }
    // o centro do arco: na bissetriz de dentro (v - u), a R / cos(ang/2) do canto
    let bx = vx - ux, bz = vz - uz; const lbz = Math.hypot(bx, bz) || 1; bx /= lbz; bz /= lbz
    const dc = RAIO_CURVA / Math.cos(ang / 2)
    const ox = c[0] + bx * dc, oz = c[1] + bz * dc
    const a0 = Math.atan2(ent.z - oz, ent.x - ox), a1 = Math.atan2(sai.z - oz, sai.x - ox)
    let da = a1 - a0; da = Math.atan2(Math.sin(da), Math.cos(da))
    const k = Math.max(1, Math.ceil((Math.abs(da) * RAIO_CURVA) / passo))
    const pts: P2[] = []
    for (let j = 1; j < k; j++) { const f = a0 + (da * j) / k; pts.push({ x: ox + Math.cos(f) * RAIO_CURVA, z: oz + Math.sin(f) * RAIO_CURVA }) }
    return { ent, sai, pts }
  })
  for (let i = 0; i < n; i++) {
    const A = arcos[i], B = arcos[(i + 1) % n]
    // o arco do canto i, depois a reta até a entrada do canto i+1
    if (i === 0) out.push({ x: CANTOS_RUA[0][0], z: CANTOS_RUA[0][1] })
    else { out.push(A.ent); out.push(...A.pts); out.push(A.sai) }
    const de = i === 0 ? out[0] : A.sai, ate = B.ent
    const d = Math.hypot(ate.x - de.x, ate.z - de.z), k = Math.floor(d / passo)
    for (let j = 1; j < k; j++) out.push({ x: de.x + ((ate.x - de.x) * j) / k, z: de.z + ((ate.z - de.z) * j) / k })
  }
  // tira os pontos repetidos (arcos sem curva)
  return out.filter((p, i) => i === 0 || Math.hypot(p.x - out[i - 1].x, p.z - out[i - 1].z) > 0.05)
}

export const VOLTA_RUA: P2[] = linhaDoMeio()
const N = VOLTA_RUA.length
export const CUM_RUA: number[] = (() => {
  const c = [0]
  for (let k = 1; k < N; k++) c.push(c[k - 1] + Math.hypot(VOLTA_RUA[k].x - VOLTA_RUA[k - 1].x, VOLTA_RUA[k].z - VOLTA_RUA[k - 1].z))
  return c
})()
export const L_RUA = CUM_RUA[N - 1] + Math.hypot(VOLTA_RUA[0].x - VOLTA_RUA[N - 1].x, VOLTA_RUA[0].z - VOLTA_RUA[N - 1].z)

// a curvatura (1/raio) de cada ponto: os rivais freiam antes das curvas
export const CURVA_RUA: number[] = VOLTA_RUA.map((p, k) => {
  const a = VOLTA_RUA[(k - 1 + N) % N], b = VOLTA_RUA[(k + 1) % N]
  const y0 = Math.atan2(p.x - a.x, p.z - a.z), y1 = Math.atan2(b.x - p.x, b.z - p.z)
  let d = y1 - y0; d = Math.atan2(Math.sin(d), Math.cos(d))
  const s = (Math.hypot(p.x - a.x, p.z - a.z) + Math.hypot(b.x - p.x, b.z - p.z)) / 2 || 1
  return Math.abs(d) / s
})

// o índice do ponto que vem logo antes de "d" metros da volta
function indiceEm(d: number): number {
  const dd = ((d % L_RUA) + L_RUA) % L_RUA
  let lo = 0, hi = N - 1
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (CUM_RUA[m] <= dd) lo = m; else hi = m - 1 }
  return lo
}

// o ponto da volta a "d" metros, deslocado "lado" metros pra direita de quem anda
export type PoseRua = { x: number; z: number; yaw: number }
export function naVoltaRua(d: number, lado: number, out: PoseRua): PoseRua {
  const dd = ((d % L_RUA) + L_RUA) % L_RUA
  const lo = indiceEm(dd)
  const a = VOLTA_RUA[lo], b = VOLTA_RUA[(lo + 1) % N], seg = (lo + 1 < N ? CUM_RUA[lo + 1] : L_RUA) - CUM_RUA[lo]
  const f = seg > 0 ? (dd - CUM_RUA[lo]) / seg : 0
  const tx = (b.x - a.x) / (seg || 1), tz = (b.z - a.z) / (seg || 1)
  // a direita de quem anda (yaw = atan2(tx, tz)): (-tz, tx)
  out.x = a.x + (b.x - a.x) * f - tz * lado
  out.z = a.z + (b.z - a.z) * f + tx * lado
  out.yaw = Math.atan2(tx, tz)
  return out
}

// a maior curvatura nos próximos "frente" metros (o rival olha adiante pra frear)
export function curvaAdiante(d: number, frente: number): number {
  let k = indiceEm(d), andou = 0, mx = 0
  while (andou < frente) {
    mx = Math.max(mx, CURVA_RUA[k])
    const k2 = (k + 1) % N
    andou += Math.hypot(VOLTA_RUA[k2].x - VOLTA_RUA[k].x, VOLTA_RUA[k2].z - VOLTA_RUA[k].z)
    k = k2
  }
  return mx
}

// o ponto da volta mais perto de (x, z): procura perto do último (k0) e, se
// ficou longe, na volta inteira. Devolve o índice
export function acompanharRua(k0: number, x: number, z: number): number {
  let kb = k0, db = Infinity
  for (let d = -10; d <= 25; d++) { const k = (k0 + d + N) % N, p = VOLTA_RUA[k], q = (p.x - x) ** 2 + (p.z - z) ** 2; if (q < db) { db = q; kb = k } }
  if (db < 20 * 20) return kb
  for (let k = 0; k < N; k += 3) { const p = VOLTA_RUA[k], q = (p.x - x) ** 2 + (p.z - z) ** 2; if (q < db) { db = q; kb = k } }
  const kc = kb
  for (let d = -3; d <= 3; d++) { const k = (kc + d + N) % N, p = VOLTA_RUA[k], q = (p.x - x) ** 2 + (p.z - z) ** 2; if (q < db) { db = q; kb = k } }
  return kb
}
export const distNaVolta = (k: number) => CUM_RUA[((k % N) + N) % N]
export const N_RUA = N

// ── os portões: a largada/chegada e um no meio de cada trecho que conta ──
// (os trechos pelo índice do canto de onde saem; obrigam o caminho: sem eles
// dava pra cortar pelos lotes vazios das ruínas)
const TRECHOS_PORTAO = [1, 2, 4, 5, 7, 8, 10, 11, 13, 16]
export type PortaoRua = { x: number; z: number; yaw: number; d: number; nome: string }
export const PORTOES_RUA: PortaoRua[] = (() => {
  const n = CANTOS_RUA.length
  const lista: PortaoRua[] = [{ x: CANTOS_RUA[0][0], z: CANTOS_RUA[0][1], yaw: 0, d: 0, nome: "LARGADA" }]
  for (const t of TRECHOS_PORTAO) {
    const a = CANTOS_RUA[t], b = CANTOS_RUA[(t + 1) % n]
    lista.push({ x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, yaw: 0, d: 0, nome: `${lista.length}` })
  }
  for (const p of lista) {
    const k = acompanharRua(0, p.x, p.z)
    const q = VOLTA_RUA[(k + 1) % N], o = VOLTA_RUA[k]
    p.d = CUM_RUA[k]
    p.yaw = Math.atan2(q.x - o.x, q.z - o.z)
  }
  return lista
})()
// passou a menos disso do meio do portão: valeu (a rua tem 12 m)
export const RAIO_PORTAO_RUA = MEIA_RUA + 2.5

// ── a corrida: os rivais, o placar e o estado (a cena escreve, a tela lê) ──

// RASCUNHO: os números da corrida (o dono afina na Mesa)
export const CORRIDA_RUA_CFG = {
  pertoLargada: 22, // m da linha: aparece o botão "correr"
  contagemS: 3,
  mostraS: 8, // o resultado fica na tela
  foraM: 60, // longe do circuito mais que isso…
  foraS: 6, // …por esse tempo: desistiu
  tempoMaxS: 8 * 60,
  premioNeon: 40, // a primeira vitória (uma vez só)
  // a grade: [m antes da linha, lado] (o jogador larga atrás, do lado direito)
  grade: [[-4, -2.4], [-4, 2.4], [-9, -2.4]] as [number, number][],
  gradeJogador: [-9, 2.4] as [number, number],
}

// os rivais: os mesmos pilotos das trincheiras (trincheiras/corrida.ts), no
// veículo de quem corre: de moto, as motos; de patins, o patins, a BMX e o skate
// (o subúrbio deixa: zonas.ts). base = m/s na reta; curva = a aceleração de lado
// que eles aguentam (a velocidade na curva é √(curva·raio))
export type VeiculoRua = "moto" | "patins"
type PilotoRua = { nome: string; veiculo: "moto" | "patins" | "bmx" | "skate"; cor: string; base: number; curva: number; fase: number }
const RIVAIS_RUA: Record<VeiculoRua, PilotoRua[]> = {
  moto: [
    { nome: "TROVÃO", veiculo: "moto", cor: "#ff4d4d", base: 41, curva: 34, fase: 0.3 },
    { nome: "VESPA", veiculo: "moto", cor: "#ffd23f", base: 39.5, curva: 36, fase: 1.9 },
    { nome: "LAMA", veiculo: "moto", cor: "#9cff57", base: 38, curva: 33, fase: 3.4 },
  ],
  patins: [
    { nome: "RATO", veiculo: "patins", cor: "#c08cff", base: 33, curva: 30, fase: 4.3 },
    { nome: "FAÍSCA", veiculo: "bmx", cor: "#ff7a3c", base: 32, curva: 32, fase: 0.4 },
    { nome: "CORUJA", veiculo: "skate", cor: "#7dffb0", base: 30.5, curva: 28, fase: 2.2 },
  ],
}
export type RivalRua = PilotoRua & { d: number; v: number; lado: number; fim: number | null; ant: { d: number; lado: number } }
export const pilotosRua = (v: VeiculoRua) => RIVAIS_RUA[v]

export function criarRivaisRua(v: VeiculoRua): RivalRua[] {
  return RIVAIS_RUA[v].map((r, i) => {
    const [d, lado] = CORRIDA_RUA_CFG.grade[i] ?? [-14 - i * 4, 0]
    return { ...r, d, v: 0, lado, fim: null, ant: { d, lado } }
  })
}
// um passo do rival: corre na base, freia antes das curvas, e o elástico
// aperta (muito na frente, alivia; muito atrás, força)
export function passoRivalRua(r: RivalRua, dt: number, tempo: number, progJogador: number, correndo: boolean) {
  r.ant.d = r.d; r.ant.lado = r.lado
  let alvo = 0
  if (correndo && r.fim == null) {
    alvo = r.base * (1 + 0.04 * Math.sin(tempo * 0.41 + r.fase))
    const k = curvaAdiante(r.d, 18 + r.v * 0.9)
    if (k > 1e-3) alvo = Math.min(alvo, Math.sqrt(r.curva / k) + 3)
    const dif = r.d - progJogador
    if (dif > 70) alvo *= 0.9
    else if (dif < -50) alvo *= 1.12
  }
  r.v += Math.max(-20 * dt, Math.min(10 * dt, alvo - r.v))
  r.d += r.v * dt
  // a faixa: de um lado pro outro da rua, sem encostar na parede
  const grade = r.d < 30 ? Math.max(0, 1 - r.d / 30) : 0
  r.lado = r.ant.lado * grade + (1 - grade) * 2.2 * Math.sin(r.d * 0.011 + r.fase)
  if (correndo && r.fim == null && r.d >= L_RUA * VOLTAS_RUA) r.fim = tempo
}

// a ordem dos portões numa corrida: os do meio, depois a linha (a chegada), duas voltas
export const SEQ_RUA: number[] = Array.from({ length: VOLTAS_RUA }, () => [...PORTOES_RUA.keys()].slice(1).concat(0)).flat()

export type FaseRua = "fora" | "perto" | "contagem" | "valendo" | "fim"
export interface ResultadoRua {
  veiculo: VeiculoRua
  tempo: number | null // null: desistiu
  lugar: number
  de: number
  venceu: boolean
  motivo?: string
  rivais: { nome: string; cor: string; fim: number | null }[]
}
export interface EstadoRua {
  fase: FaseRua
  veiculo: VeiculoRua
  t0: number // a largada (o tempo do jogo)
  ate: number // a contagem acaba / o resultado some
  conta: number
  tempo: number // o relógio da corrida
  cp: number // quantos portões da SEQ_RUA já passou
  k: number // o ponto da volta mais perto do jogador
  prog: number // m andados na corrida (pra ordem)
  lugar: number
  fora: number // s longe do circuito
  rivais: RivalRua[]
  resultado: ResultadoRua | null
  comecar: boolean // a tela pediu (o botão)
  desistir: boolean
}
export const novoEstadoRua = (): EstadoRua => ({ fase: "fora", veiculo: "patins", t0: 0, ate: 0, conta: 0, tempo: 0, cp: 0, k: 0, prog: 0, lugar: 1, fora: 0, rivais: [], resultado: null, comecar: false, desistir: false })
// um só no jogo (a cena e a tela leem daqui; a cena monta e desmonta com o <Perto>)
export const RUA: { e: EstadoRua } = { e: novoEstadoRua() }

// a volta e o portão em que está (pra tela)
export const voltaDe = (cp: number) => Math.min(VOLTAS_RUA, Math.floor(cp / PORTOES_RUA.length) + 1)
export const portaoDaVolta = (cp: number) => (cp % PORTOES_RUA.length) + 1

// ── o placar no save: o melhor tempo (por veículo) e as vitórias ──
export type PlacarRua = { melhor?: Partial<Record<VeiculoRua, number>>; vitorias?: number; corridas?: number }
/** registra uma corrida no placar: o melhor tempo e, na primeira vitória, o prêmio (devolve quanto pagou) */
export function placarComCorrida(p: PlacarRua | undefined, r: ResultadoRua): { placar: PlacarRua; premio: number } {
  const antes = p ?? {}
  const melhor = { ...(antes.melhor ?? {}) }
  if (r.tempo != null && (melhor[r.veiculo] == null || r.tempo < melhor[r.veiculo]!)) melhor[r.veiculo] = Math.round(r.tempo * 100) / 100
  const vitorias = (antes.vitorias ?? 0) + (r.venceu ? 1 : 0)
  const premio = r.venceu && !(antes.vitorias ?? 0) ? CORRIDA_RUA_CFG.premioNeon : 0
  return { placar: { melhor, vitorias, corridas: (antes.corridas ?? 0) + 1 }, premio }
}
