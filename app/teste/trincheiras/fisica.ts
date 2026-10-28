// A física e a corrida das trincheiras (T11 + T13), sem React nem three: o
// passo fixo do piloto (patins, BMX, skate), o grind, as manobras, o tombo e
// a corrida (contagem, portões, chegada, rivais, rastro do fantasma). O
// componente (Trincheiras.tsx) só chama isto e desenha; o teste também.

import {
  CHECKPOINTS, CUM, L_VOLTA, RAIO_CHEGADA, RAIO_PORTAO, RASTRO_HZ, V_EMBALO, V_GRIND, V_TETO,
  acompanhar, criarRivais, passoRival, salvarRecorde,
  type Fisica, type Recorde, type Rival, type Veiculo,
} from "./corrida"
import { TRILHO_E, TRILHO_Y } from "./geoCorrida"
import { AVENIDAS, SUBIDA_MAX, TORRES, VOLTA, batenaTorre, ondeEsta, perfil } from "./mapa"

export const PASSO = 1 / 120
export const G = 22 // gravidade (forte: o pulo é seco, como nos jogos de patins)
export const VJATO = 40 // m/s (144 km/h): o jato dos patins
export const CONTAGEM = 3

export type Entrada = { frente: boolean; re: boolean; esq: boolean; dir: boolean; pulo: boolean; jato: boolean }
export type Estado = {
  x: number; z: number; y: number; vx: number; vz: number; vy: number; yaw: number
  ar: boolean; incl: number; nx: number; nz: number; dist: number; jatoT: number
  ant: { x: number; z: number; y: number; yaw: number }
  onde: ReturnType<typeof ondeEsta>; iVolta: number; voos: number
  // T13: as manobras, o grind, o tombo
  acaoAnt: boolean; manobra: { tipo: string; t: number } | null; limpas: number; giro: number; tombo: number
  grind: boolean; grindT: number; empurrando: boolean; paredeMax: number
  aviso: { txt: string; ate: number } | null; total: { manobras: number; grinds: number; tombos: number }
}
export type Fase = "escolha" | "contagem" | "correndo" | "chegou" | "livre"
export type Corrida = {
  fase: Fase; conta: number; tempo: number; cp: number; parciais: number[]
  rivais: Rival[]; rastro: number[]; proxRastro: number
  fantasma: Recorde | null; recordeAntes: number | null; lugar: number; progresso: number
  resultado: { tempo: number; lugar: number; novo: boolean; rivais: { nome: string; cor: string; fim: number | null }[] } | null
}

export function estadoInicial(): Estado {
  // começa na torre 1 (a dos TÚNEIS, a entrada do subúrbio), virado pro rio A
  const t = TORRES[0].c, a = AVENIDAS[0].pts[20]
  const yaw = Math.atan2(a.x - t.x, a.z - t.z)
  return {
    x: t.x, z: t.z, y: 0, vx: 0, vz: 0, vy: 0, yaw, ar: false, incl: 0, nx: 0, nz: 1, dist: 0, jatoT: 0, ant: { x: t.x, z: t.z, y: 0, yaw }, onde: ondeEsta(t.x, t.z), iVolta: 0, voos: 0,
    acaoAnt: false, manobra: null, limpas: 0, giro: 0, tombo: 0, grind: false, grindT: 0, empurrando: false, paredeMax: 0, aviso: null, total: { manobras: 0, grinds: 0, tombos: 0 },
  }
}
export function corridaInicial(fase: Fase): Corrida {
  return { fase, conta: CONTAGEM, tempo: 0, cp: 0, parciais: [], rivais: criarRivais(), rastro: [], proxRastro: 0, fantasma: null, recordeAntes: null, lugar: 1, progresso: 0, resultado: null }
}

// o piloto automático: mira 22 m à frente na linha do meio da volta
export function piloto(s: Estado): Entrada {
  const alvo = VOLTA[(s.iVolta + 11) % VOLTA.length]
  let dif = Math.atan2(alvo.x - s.x, alvo.z - s.z) - s.yaw
  dif = Math.atan2(Math.sin(dif), Math.cos(dif))
  return { frente: true, re: false, esq: dif > 0.04, dir: dif < -0.04, pulo: false, jato: false }
}
export const PARADO: Entrada = { frente: false, re: false, esq: false, dir: false, pulo: false, jato: false }

export function avisar(s: Estado, txt: string, agora: number, dur = 1.4) { s.aviso = { txt, ate: agora + dur } }

// o grind (skate): preso no trilho da beira de cima da parede, desliza na
// direção em que vinha, ganhando embalo; solta o botão (ou pula) e sai
export function passoGrind(s: Estado, e: Entrada, dt: number, V: Fisica, agora: number) {
  const o = s.onde
  let tx = -o.nz, tz = o.nx, vt = s.vx * tx + s.vz * tz
  if (vt < 0) { tx = -tx; tz = -tz; vt = -vt }
  vt = Math.min(V_GRIND, vt + 3.2 * dt)
  s.x += tx * vt * dt; s.z += tz * vt * dt
  let o2 = ondeEsta(s.x, s.z)
  s.x -= o2.nx * (o2.e - TRILHO_E); s.z -= o2.nz * (o2.e - TRILHO_E)
  o2 = ondeEsta(s.x, s.z)
  s.onde = o2; s.nx = o2.nx; s.nz = o2.nz
  s.vx = tx * vt; s.vz = tz * vt
  s.y = TRILHO_Y; s.incl = perfil(TRILHO_E).incl
  let dy = Math.atan2(tx, tz) - s.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy))
  s.yaw += dy * Math.min(1, dt * 14)
  s.grindT += dt
  s.dist += vt * dt
  if (!e.jato || e.pulo || o2.tipo !== "avenida") {
    s.grind = false; s.ar = true; s.vy = e.pulo ? V.pulo : 3
    s.vx -= o2.nx * 4; s.vz -= o2.nz * 4; s.giro = 0; s.limpas = 0
    if (s.grindT > 0.4) avisar(s, `GRIND ${s.grindT.toFixed(1)} s`, agora)
  }
}

export function passo(s: Estado, e: Entrada, dt: number, V: Fisica, travado: boolean, agora: number) {
  s.ant = { x: s.x, z: s.z, y: s.y, yaw: s.yaw }
  const acaoNova = e.jato && !s.acaoAnt
  s.acaoAnt = e.jato
  if (s.grind) { passoGrind(s, e, dt, V, agora); s.iVolta = acompanhar(s.iVolta, s.x, s.z); return }
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), rx = fz, rz = -fx
  let v = s.vx * fx + s.vz * fz, lat = s.vx * rx + s.vz * rz
  const virar = (e.esq ? 1 : 0) - (e.dir ? 1 : 0)
  // no chão: vira mais devagar quanto mais rápido; no ar: gira (manobra)
  const gira = virar * (s.ar ? V.giroAr : 2.6 / (1 + Math.abs(v) / 22) + 0.5) * dt
  s.yaw += gira
  if (s.ar) s.giro += gira
  s.tombo = Math.max(0, s.tombo - dt)
  const jatoOn = V.jato && e.jato && e.frente && s.jatoT < 2.5 && !travado
  s.empurrando = false
  if (!s.ar) {
    const teto = jatoOn ? VJATO : V.vmax
    // subindo a parede, as pernas empurram menos (senão ele "gruda" lá em cima)
    const empurra = 1 / (1 + s.incl * s.incl)
    if (e.frente && !travado && s.tombo <= 0 && v < teto) { v += (jatoOn ? 22 : V.acel) * empurra * (1 - Math.max(0, v) / (teto * 1.08)) * dt; s.empurrando = true }
    else if (v > teto) v -= V.excesso * dt
    if (e.re || travado) v -= Math.sign(v) * Math.min(Math.abs(v), 26 * dt)
    if (!e.frente && !e.re) v -= Math.sign(v) * Math.min(Math.abs(v), V.rolar * dt)
    // a aderência das rodas: o de lado morre rápido (um pouco de deslize)
    // (na parede íngreme as rodas seguram menos: ele escorrega de volta)
    lat *= Math.exp(-V.aderencia * dt / (1 + s.incl * s.incl))
  }
  // o jato tem fôlego (2,5 s) e recarrega
  if (V.jato) s.jatoT = jatoOn ? Math.min(3, s.jatoT + dt) : Math.max(0, s.jatoT - dt * 0.6)
  const nfx = Math.sin(s.yaw), nfz = Math.cos(s.yaw)
  if (!s.ar) { s.vx = nfx * v + nfz * lat; s.vz = nfz * v - nfx * lat }
  // subindo a parede curva, a gravidade puxa de volta pro leito
  if (!s.ar && s.onde.e > 0) {
    const { incl } = perfil(s.onde.e)
    const a = G * 0.75 * (incl / (1 + incl * incl))
    s.vx -= s.onde.nx * a * dt; s.vz -= s.onde.nz * a * dt
  }
  if (e.pulo && !s.ar && !travado) { s.ar = true; s.vy = V.pulo; s.giro = 0; s.limpas = 0 }
  // no ar, o botão de ação faz uma manobra (BMX e skate; o skate perto do trilho guarda o botão pro grind)
  if (s.ar && acaoNova && !s.manobra && V.manobras.length && !(V.grind && s.onde.e > TRILHO_E - 1.2)) {
    s.manobra = { tipo: V.manobras[s.total.manobras % V.manobras.length], t: 0 }
  }
  if (s.manobra) {
    s.manobra.t += dt
    if (s.manobra.t >= V.durManobra) { s.limpas++; s.total.manobras++; avisar(s, s.manobra.tipo, agora, 0.9); s.manobra = null }
  }
  // o teto de todos (o embalo e as manobras passam do teto do veículo, até aqui)
  const vh = Math.hypot(s.vx, s.vz)
  if (vh > V_TETO) { s.vx *= V_TETO / vh; s.vz *= V_TETO / vh }
  s.x += s.vx * dt; s.z += s.vz * dt
  let o = ondeEsta(s.x, s.z)
  // o grind: o skate com o botão apertado, na beira de cima da parede, andando ao longo dela
  if (V.grind && e.jato && !travado && o.tipo === "avenida" && o.e >= TRILHO_E - 0.6 && (!s.ar || (s.vy <= 0 && Math.abs(s.y - TRILHO_Y) < 1.3))) {
    const vt = Math.abs(s.vx * -o.nz + s.vz * o.nx)
    if (vt > 5) {
      s.grind = true; s.grindT = 0; s.ar = false; s.vy = 0; s.manobra = null; s.total.grinds++
      s.onde = o; passoGrind(s, e, 0, V, agora); s.iVolta = acompanhar(s.iVolta, s.x, s.z); return
    }
  }
  // a parede em pé: não passa. Rápido o bastante subindo, voa (e volta)
  if (o.e > SUBIDA_MAX) {
    s.x -= o.nx * (o.e - SUBIDA_MAX); s.z -= o.nz * (o.e - SUBIDA_MAX)
    const u = s.vx * o.nx + s.vz * o.nz
    if (u > 0) {
      s.vx -= o.nx * u; s.vz -= o.nz * u
      if (u > 7 && !s.ar) { s.ar = true; s.vy = Math.min(15, u * 0.9 * V.voo); s.voos++; s.giro = 0; s.limpas = 0 }
    }
    o = ondeEsta(s.x, s.z)
  }
  // a torre é obstáculo
  const bt = batenaTorre(s.x, s.z)
  if (bt) {
    s.x = bt.x; s.z = bt.z
    const u = s.vx * bt.nx + s.vz * bt.nz
    if (u < 0) { s.vx -= bt.nx * u * 1.3; s.vz -= bt.nz * u * 1.3 }
    o = ondeEsta(s.x, s.z)
  }
  s.onde = o
  const chao = perfil(o.e)
  if (s.ar) {
    s.vy -= G * dt; s.y += s.vy * dt
    if (s.y <= chao.y && s.vy < 0) {
      // pousou: na parede, a queda vira velocidade pra dentro
      if (o.e > 0.5) { const k = Math.abs(s.vy) * 0.55; s.vx -= o.nx * k; s.vz -= o.nz * k }
      s.ar = false; s.y = chao.y; s.vy = 0
      if (s.manobra) {
        // caiu no meio da manobra: tombo (perde o embalo e fica um tempo sem empurrar)
        s.manobra = null; s.vx *= 0.35; s.vz *= 0.35; s.tombo = 0.9; s.total.tombos++
        avisar(s, "CAIU!", agora)
      } else if (V.bonus) {
        // caiu limpo e de frente: cada manobra e cada 360° viram embalo
        const voltas = Math.floor(Math.abs(s.giro) / (Math.PI * 2) + 0.15)
        const vv = Math.hypot(s.vx, s.vz), alinhado = vv < 1 || (s.vx * Math.sin(s.yaw) + s.vz * Math.cos(s.yaw)) / vv > 0.6
        const premio = alinhado ? (s.limpas + voltas) * V.bonus : 0
        if (premio > 0 && vv > 0.5) {
          const nv = Math.min(V_TETO, vv + premio); s.vx *= nv / vv; s.vz *= nv / vv
          avisar(s, `${voltas ? `${voltas * 360}° ` : ""}${s.limpas ? `${s.limpas}× ` : ""}LIMPO · +${Math.round(premio * 3.6)} km/h`, agora)
        }
      }
      s.giro = 0; s.limpas = 0
    }
  } else s.y = chao.y
  // o embalo (skate): subiu na parede e voltou pro leito sem perder o ritmo,
  // ganha velocidade conforme a altura que alcançou (o "pump" do meio-tubo)
  if (V.embalo) {
    if (o.e > 0.3 || s.ar) s.paredeMax = Math.max(s.paredeMax, s.y)
    else if (o.e <= 0) {
      const vv = Math.hypot(s.vx, s.vz)
      if (s.paredeMax > 0.8 && vv > 3 && vv < V_EMBALO) {
        const ganho = Math.min(V.embalo * s.paredeMax, V_EMBALO - vv)
        s.vx *= (vv + ganho) / vv; s.vz *= (vv + ganho) / vv
        if (ganho > 1) avisar(s, `EMBALO +${Math.round(ganho * 3.6)} km/h`, agora, 0.8)
      }
      s.paredeMax = 0
    }
  }
  s.incl = s.ar ? s.incl * 0.9 : chao.incl
  s.nx = o.nx; s.nz = o.nz
  s.dist += Math.hypot(s.vx, s.vz) * dt
  s.iVolta = acompanhar(s.iVolta, s.x, s.z)
}

// a corrida a cada passo: a contagem, o relógio, os portões, a chegada, os rivais, o rastro
export function passoCorrida(c: Corrida, s: Estado, dt: number, veiculo: Veiculo, mudouFase: (f: Fase) => void) {
  if (c.fase === "contagem") {
    c.conta -= dt
    if (c.conta <= 0) { c.fase = "correndo"; c.tempo = 0; mudouFase("correndo") }
  } else if (c.fase === "correndo") {
    c.tempo += dt
    if (c.tempo >= c.proxRastro) { c.rastro.push(+s.x.toFixed(2), +s.z.toFixed(2), +s.y.toFixed(2), +s.yaw.toFixed(3)); c.proxRastro += 1 / RASTRO_HZ }
    if (c.cp < CHECKPOINTS.length) {
      const g = CHECKPOINTS[c.cp]
      if (Math.hypot(s.x - g.x, s.z - g.z) < RAIO_PORTAO) {
        c.parciais.push(c.tempo); c.cp++
        avisar(s, `${g.nome} · ${c.cp}/${CHECKPOINTS.length}`, c.tempo + CONTAGEM, 1.6)
      }
    } else if (Math.hypot(s.x - TORRES[0].c.x, s.z - TORRES[0].c.z) < RAIO_CHEGADA) {
      c.fase = "chegou"
      const novo = c.recordeAntes == null || c.tempo < c.recordeAntes
      const lugar = 1 + c.rivais.filter((r) => r.fim != null).length
      c.lugar = lugar
      c.resultado = { tempo: c.tempo, lugar, novo, rivais: c.rivais.map((r) => ({ nome: r.nome, cor: r.cor, fim: r.fim })) }
      if (novo) { c.rastro.push(+s.x.toFixed(2), +s.z.toFixed(2), +s.y.toFixed(2), +s.yaw.toFixed(3)); salvarRecorde(veiculo, { ms: Math.round(c.tempo * 1000), rastro: c.rastro }) }
      mudouFase("chegou")
    }
  }
  // o progresso do jogador na volta (pra a posição): antes do 1º portão,
  // voltar pra trás não conta como estar no fim; depois do 3º, já é o fim
  let prog = CUM[s.iVolta]
  if (c.cp === 0 && prog > L_VOLTA / 2) prog -= L_VOLTA
  if (c.cp === CHECKPOINTS.length && prog < L_VOLTA / 2) prog += L_VOLTA
  c.progresso = prog
  const correndo = c.fase === "correndo" || c.fase === "chegou"
  for (const r of c.rivais) passoRival(r, dt, c.tempo, prog, correndo)
  if (c.fase === "correndo") c.lugar = 1 + c.rivais.filter((r) => r.fim != null || r.d > prog).length
}

