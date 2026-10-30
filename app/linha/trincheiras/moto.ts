// AS MOTOS DAS TRINCHEIRAS (T14): a física da moto, sem React nem three (dá
// pra testar sem tela, como o fisica.ts do T13).
//
// A proposta junta o melhor de três jogos (o dono escolhe a referência):
//  - Mad Skills Motocross: a moto é leve e, no ar, o peso vai pra frente (▲)
//    ou pra trás (▼ ou shift). Tem que cair com as rodas alinhadas ao chão:
//    alinhado ganha embalo, torto perde, muito torto cai. Uma volta inteira
//    no ar (backflip/frontflip) vale embalo.
//  - Trial Xtreme: no chão, shift empina (o peso pra trás). Empinada na
//    medida certa, a moto anda mais; passou do ponto, vira de costas e cai.
//  - WallRide: rápido o bastante ao longo da parede curva do túnel, a moto
//    sobe e anda NA parede (a gravidade quase some quanto mais rápido). Virar
//    pra parede sobe; soltar desce; espaço salta da parede. Ficar na parede dá
//    embalo na saída.
// Tudo o que é gosto fica em AJUSTE_MOTO (o dono afina sem mexer no resto).
//
// A corrida é "pesada": 4 motos rivais, mais rápidas e mais juntas (elástico
// mais forte, em corrida.ts), 2 voltas, e encostar numa moto rival dá tranco.

import { acompanhar, naVolta, type Fisica, type Pose, type Rival } from "./corrida"
import type { Entrada, Estado } from "./fisica"
import { CURVA, SUBIDA_MAX, TETO, VOLTA, batenaTorre, ondeEsta, perfil } from "./mapa"

const G = 22 // a mesma gravidade do fisica.ts

export const AJUSTE_MOTO = {
  voltas: 2, // a corrida de moto tem 2 voltas (as outras, 1)
  tetoMoto: 42, // m/s (151 km/h): nem com embalo passa disso
  // empinar (shift no chão): sobe/desce em rad/s; na faixa boa anda mais; passou do ponto, cai
  empinaSobe: 2.0, empinaDesce: 3.4, empinaMin: 0.3, empinaMax: 0.95, empinaCai: 1.2, empinaGanho: 1.25, empinaTeto: 3,
  // no ar: o peso gira a moto (rad/s²), o giro morre (1/s) e o nariz tende a seguir a trajetória (1/s; 0 = puro Mad Skills)
  giroPeso: 14, amortece: 1.0, assist: 0.9, viraAr: 1.1,
  // o pouso: diferença entre o nariz e o chão (rad)
  pousoPerfeito: 0.22, pousoOk: 0.6, pousoPesado: 1.0,
  ganhoPerfeito: 2.5, ganhoFlip: 3.5, // m/s
  // a parede (wall-ride)
  paredeEntra: 15, // m/s ao longo da parede pra grudar nela
  paredeSolta: 11, // abaixo disso, cai
  gruda: 40, // a esta velocidade a gravidade na parede quase some
  sobe: 13, // m/s² virando pra parede
  subidaMax: 6, // m/s: o quanto a entrada joga pra cima
  paredeTeto: TETO - 1.6,
  paredeGanho: 2, paredeGanhoMax: 5, // m/s por segundo na parede, na saída (até o máximo)
  // o tranco: encostou numa moto rival, empurra e perde velocidade
  contato: true, tranco: 0.86, raioTranco: 1.6,
}

// a altura onde a curva acaba e a parede em pé começa a valer como "parede"
export const Y_PAREDE = perfil(SUBIDA_MAX).y
// quanto passou do leito na altura y (a curva embaixo, em pé de CURVA pra cima)
const eNaAltura = (y: number) => (y >= CURVA ? CURVA - 0.05 : Math.max(SUBIDA_MAX - 0.05, Math.sqrt(Math.max(0, CURVA * CURVA - (CURVA - y) ** 2))))
const inclNaAltura = (y: number) => { const e = eNaAltura(y); return Math.min(12, e / Math.sqrt(Math.max(1e-4, CURVA * CURVA - e * e))) }
const ang = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

function avisar(s: Estado, txt: string, agora: number, dur = 1.4) { s.aviso = { txt, ate: agora + dur } }

// o nariz do chão na direção em que a moto aponta (subindo a parede = nariz pra cima)
function nivelChao(s: Estado, o: Estado["onde"]) {
  if (o.e <= 0) return 0
  return Math.atan(perfil(o.e).incl * (Math.sin(s.yaw) * o.nx + Math.cos(s.yaw) * o.nz))
}

function cair(s: Estado, agora: number, txt: string, k = 0.25) {
  s.vx *= k; s.vz *= k; s.tombo = 1.3; s.total.tombos++; s.wPitch = 0; s.rotAr = 0
  avisar(s, txt, agora)
}

// sai da parede: soma o embalo do tempo que ficou nela
function sairDaParede(s: Estado, agora: number) {
  const A = AJUSTE_MOTO
  s.parede = false
  s.paredeMaxT = Math.max(s.paredeMaxT, s.paredeT)
  if (s.paredeT > 0.6) {
    const vv = Math.hypot(s.vx, s.vz), ganho = Math.min(A.paredeGanhoMax, s.paredeT * A.paredeGanho)
    if (vv > 1) { const nv = Math.min(A.tetoMoto, vv + ganho); s.vx *= nv / vv; s.vz *= nv / vv }
    avisar(s, `PAREDE ${s.paredeT.toFixed(1)} s · +${Math.round(ganho * 3.6)} km/h`, agora)
  }
}

function entrarNaParede(s: Estado, o: Estado["onde"], u: number, agora: number) {
  const A = AJUSTE_MOTO
  const vyAr = s.ar ? s.vy : 0
  s.parede = true; s.paredeT = 0; s.ar = false; s.total.paredes++
  s.vy = Math.max(vyAr * 0.5, Math.min(A.subidaMax, Math.max(0, u) * 0.5))
  s.y = Math.max(s.y, Y_PAREDE)
  s.pitch = 0; s.wPitch = 0; s.rotAr = 0; s.onde = o
  avisar(s, "NA PAREDE!", agora, 0.9)
}

// andando na parede: ao longo dela (a tangente), subindo e descendo
function passoParede(s: Estado, e: Entrada, dt: number, V: Fisica, agora: number) {
  const A = AJUSTE_MOTO, o = s.onde
  let tx = -o.nz, tz = o.nx, vt = s.vx * tx + s.vz * tz
  if (vt < 0) { tx = -tx; tz = -tz; vt = -vt }
  if (e.frente && vt < V.vmax) vt += V.acel * 0.55 * dt
  else if (!e.frente) vt -= V.rolar * dt
  if (e.re) vt -= 20 * dt
  // subir = virar pra parede (ela fica à direita ou à esquerda de quem anda)
  const paredeDir = o.nx * tz + o.nz * -tx > 0
  const virar = (e.esq ? 1 : 0) - (e.dir ? 1 : 0)
  const praCima = paredeDir ? -virar : virar
  const gEf = G * Math.max(0.15, 1 - (vt / A.gruda) ** 2)
  s.vy += (Math.max(0, praCima) * A.sobe - gEf - Math.max(0, -praCima) * 6) * dt
  s.y += s.vy * dt
  if (s.y > A.paredeTeto) { s.y = A.paredeTeto; s.vy = Math.min(0, s.vy) }
  s.x += tx * vt * dt; s.z += tz * vt * dt
  const eAlvo = eNaAltura(s.y)
  let o2 = ondeEsta(s.x, s.z)
  const sumiu = Math.abs(o2.e - eAlvo) > 1.6 // a parede acabou (a boca de uma praça)
  if (!sumiu) { s.x -= o2.nx * (o2.e - eAlvo); s.z -= o2.nz * (o2.e - eAlvo); o2 = ondeEsta(s.x, s.z) }
  s.onde = o2; s.nx = o2.nx; s.nz = o2.nz
  s.vx = tx * vt; s.vz = tz * vt
  s.incl = inclNaAltura(s.y)
  let dy = Math.atan2(tx, tz) - s.yaw; dy = ang(dy)
  s.yaw += dy * Math.min(1, dt * 14)
  s.pitch = Math.atan2(s.vy, Math.max(1, vt)); s.pitchChao = s.pitch
  s.paredeT += dt
  s.dist += vt * dt
  // as saídas
  if (sumiu) { sairDaParede(s, agora); s.ar = true; return }
  if (e.pulo) {
    // salta da parede pra dentro do túnel
    sairDaParede(s, agora); s.ar = true
    s.vx -= o2.nx * 7; s.vz -= o2.nz * 7; s.vy = Math.max(0, s.vy) + 5; s.pitch = 0.2; s.wPitch = 0; s.rotAr = 0
    return
  }
  if (vt < A.paredeSolta) {
    sairDaParede(s, agora); s.ar = true
    s.vx -= o2.nx * 2.5; s.vz -= o2.nz * 2.5; s.pitch = 0; s.wPitch = 0; s.rotAr = 0
    avisar(s, "DEVAGAR DEMAIS: CAIU DA PAREDE", agora)
    return
  }
  if (s.y <= Y_PAREDE && s.vy < 0) {
    // desceu até a curva: volta pro chão, a queda vira velocidade pra dentro
    sairDaParede(s, agora)
    const k = Math.abs(s.vy) * 0.6
    s.vx -= o2.nx * (k + 1); s.vz -= o2.nz * (k + 1); s.vy = 0
    s.y = Y_PAREDE; s.incl = perfil(o2.e).incl; s.pitch = nivelChao(s, o2); s.pitchChao = s.pitch
  }
}

export function passoMoto(s: Estado, e: Entrada, dt: number, V: Fisica, travado: boolean, agora: number) {
  const A = AJUSTE_MOTO
  s.ant = { x: s.x, z: s.z, y: s.y, yaw: s.yaw }
  s.acaoAnt = e.jato
  s.trancoT = Math.max(0, s.trancoT - dt)
  if (s.parede) { passoParede(s, e, dt, V, agora); s.iVolta = acompanhar(s.iVolta, s.x, s.z); return }
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw), rx = fz, rz = -fx
  let v = s.vx * fx + s.vz * fz, lat = s.vx * rx + s.vz * rz
  const virar = (e.esq ? 1 : 0) - (e.dir ? 1 : 0)
  let rel = s.ar ? 0 : Math.max(0, s.pitch - s.pitchChao) // o quanto está empinada
  // no chão vira menos quanto mais rápido e quanto mais empinada; no ar, quase nada (só mira)
  s.yaw += virar * (s.ar ? A.viraAr : (2.5 / (1 + Math.abs(v) / 24) + 0.45) * (1 - Math.min(0.6, rel * 0.6))) * dt
  s.tombo = Math.max(0, s.tombo - dt)
  s.empurrando = false
  if (!s.ar) {
    const naFaixa = rel >= A.empinaMin && rel <= A.empinaMax
    const teto = V.vmax + (naFaixa ? A.empinaTeto : 0)
    const empurra = 1 / (1 + s.incl * s.incl)
    if (e.frente && !travado && s.tombo <= 0 && v < teto) { v += V.acel * (naFaixa ? A.empinaGanho : 1) * empurra * (1 - Math.max(0, v) / (teto * 1.08)) * dt; s.empurrando = true }
    else if (v > teto) v -= V.excesso * dt
    if (e.re || travado) v -= Math.sign(v) * Math.min(Math.abs(v), 30 * dt)
    if (!e.frente && !e.re) v -= Math.sign(v) * Math.min(Math.abs(v), V.rolar * dt)
    lat *= Math.exp(-V.aderencia * dt / (1 + s.incl * s.incl))
    // empinar: shift segura o peso pra trás (com o acelerador sobe mais rápido)
    if (e.jato && !travado && s.tombo <= 0) rel += A.empinaSobe * (e.frente ? 1.25 : 0.8) * dt
    else rel = Math.max(0, rel - A.empinaDesce * dt)
    if (rel > A.empinaCai) { rel = 0; cair(s, agora, "PASSOU DO PONTO: CAIU!", 0.3); v *= 0.3; lat *= 0.3 }
  }
  const nfx = Math.sin(s.yaw), nfz = Math.cos(s.yaw)
  if (!s.ar) { s.vx = nfx * v + nfz * lat; s.vz = nfz * v - nfx * lat }
  if (!s.ar && s.onde.e > 0) {
    const { incl } = perfil(s.onde.e)
    const a = G * 0.75 * (incl / (1 + incl * incl))
    s.vx -= s.onde.nx * a * dt; s.vz -= s.onde.nz * a * dt
  }
  if (e.pulo && !s.ar && !travado && s.tombo <= 0) { s.ar = true; s.vy = V.pulo; s.pitch += 0.15; s.wPitch = 0.8; s.rotAr = 0 }
  const vh = Math.hypot(s.vx, s.vz)
  if (vh > A.tetoMoto) { s.vx *= A.tetoMoto / vh; s.vz *= A.tetoMoto / vh }
  s.x += s.vx * dt; s.z += s.vz * dt
  let o = ondeEsta(s.x, s.z)
  // a parede: na beira de cima da curva (ou batendo nela no ar), rápido ao longo dela, gruda
  if (!travado && s.tombo <= 0 && o.e >= SUBIDA_MAX - 0.25 && (!s.ar || s.y > Y_PAREDE - 1)) {
    const u = s.vx * o.nx + s.vz * o.nz, vt = Math.abs(s.vx * -o.nz + s.vz * o.nx)
    if (vt > A.paredeEntra && (u > 1 || (s.ar && u > -2))) {
      if (o.e > SUBIDA_MAX) { s.x -= o.nx * (o.e - SUBIDA_MAX); s.z -= o.nz * (o.e - SUBIDA_MAX); o = ondeEsta(s.x, s.z) }
      entrarNaParede(s, o, u, agora)
      passoParede(s, e, 0, V, agora); s.iVolta = acompanhar(s.iVolta, s.x, s.z)
      return
    }
  }
  // a parede em pé (devagar ao longo dela): não passa; subindo rápido, voa (o nariz vai junto)
  if (o.e > SUBIDA_MAX) {
    s.x -= o.nx * (o.e - SUBIDA_MAX); s.z -= o.nz * (o.e - SUBIDA_MAX)
    const u = s.vx * o.nx + s.vz * o.nz
    if (u > 0) {
      s.vx -= o.nx * u; s.vz -= o.nz * u
      if (u > 7 && !s.ar) { s.ar = true; s.vy = Math.min(15, u * 0.9 * V.voo); s.voos++; s.wPitch = 0; s.rotAr = 0 }
    }
    o = ondeEsta(s.x, s.z)
  }
  const bt = batenaTorre(s.x, s.z)
  if (bt) {
    s.x = bt.x; s.z = bt.z
    const u = s.vx * bt.nx + s.vz * bt.nz
    if (u < 0) { s.vx -= bt.nx * u * 1.3; s.vz -= bt.nz * u * 1.3 }
    o = ondeEsta(s.x, s.z)
  }
  s.onde = o
  const chao = perfil(o.e)
  s.pitchChao = nivelChao(s, o)
  if (s.ar) {
    // o peso: ▲ joga pra frente (o nariz desce), ▼ ou shift pra trás (sobe). O ▲ que vinha
    // segurado do chão (o acelerador) não conta: solta e aperta de novo pra jogar o peso
    if (!e.frente) s.gasNeutro = false
    const peso = (e.frente && !s.gasNeutro ? -1 : 0) + (e.re || e.jato ? 1 : 0)
    s.wPitch += peso * A.giroPeso * dt
    s.wPitch *= Math.exp(-A.amortece * dt)
    s.wPitch = Math.max(-7, Math.min(7, s.wPitch))
    s.rotAr += s.wPitch * dt
    // o nariz tende a seguir a trajetória (só o que sobra de uma volta: não desfaz o flip)
    const traj = Math.atan2(s.vy, Math.max(1, Math.hypot(s.vx, s.vz)))
    s.pitch += s.wPitch * dt + ang(traj - s.pitch) * A.assist * dt * (peso ? 0.3 : 1)
    s.vy -= G * dt; s.y += s.vy * dt
    if (s.y <= chao.y && s.vy < 0) {
      if (o.e > 0.5) { const k = Math.abs(s.vy) * 0.55; s.vx -= o.nx * k; s.vz -= o.nz * k }
      s.ar = false; s.y = chao.y; s.vy = 0
      s.pitchChao = nivelChao(s, o)
      const dif = Math.abs(ang(s.pitch - s.pitchChao))
      const voltas = Math.floor(Math.abs(s.rotAr) / (Math.PI * 2) + 0.15)
      s.total.pousos++
      if (dif > A.pousoPesado) cair(s, agora, "CAIU!")
      else if (dif > A.pousoOk) { s.vx *= 0.8; s.vz *= 0.8; avisar(s, "POUSO PESADO", agora, 0.9) }
      else {
        const premio = (dif < A.pousoPerfeito ? A.ganhoPerfeito : 0) + voltas * A.ganhoFlip
        if (voltas) s.total.flips += voltas
        const vv = Math.hypot(s.vx, s.vz)
        if (premio > 0 && vv > 0.5) {
          const nv = Math.min(A.tetoMoto, vv + premio); s.vx *= nv / vv; s.vz *= nv / vv
          const flip = voltas ? `${voltas > 1 ? `${voltas}× ` : ""}${s.rotAr > 0 ? "BACKFLIP" : "FRONTFLIP"} · ` : ""
          avisar(s, `${flip}${dif < A.pousoPerfeito ? "POUSO PERFEITO" : "POUSOU"} · +${Math.round(premio * 3.6)} km/h`, agora)
        }
      }
      s.pitch = s.pitchChao; s.wPitch = 0; s.rotAr = 0
    }
  } else {
    s.y = chao.y
    s.pitch = s.pitchChao + rel
    s.gasNeutro = true
  }
  s.incl = s.ar ? s.incl * 0.9 : chao.incl
  s.nx = o.nx; s.nz = o.nz
  s.dist += Math.hypot(s.vx, s.vz) * dt
  s.iVolta = acompanhar(s.iVolta, s.x, s.z)
}

// a corrida pesada: encostou numa moto rival, empurra e perde velocidade
const poseR: Pose = { x: 0, z: 0, y: 0, yaw: 0, incl: 0, nx: 0, nz: 0 }
export function tranco(s: Estado, rivais: Rival[], agora: number) {
  const A = AJUSTE_MOTO
  if (!A.contato) return
  for (const r of rivais) {
    naVolta(r.d, r.lado, poseR)
    const dx = s.x - poseR.x, dz = s.z - poseR.z, dy = s.y - poseR.y, d = Math.hypot(dx, dz, dy)
    if (d >= A.raioTranco) continue
    const h = Math.hypot(dx, dz) || 1e-3
    s.x += (dx / h) * (A.raioTranco - d); s.z += (dz / h) * (A.raioTranco - d)
    if (s.trancoT <= 0) {
      s.vx *= A.tranco; s.vz *= A.tranco; s.trancoT = 0.6
      s.vx += (dx / h) * 2; s.vz += (dz / h) * 2
      avisar(s, `TRANCO: ${r.nome}`, agora, 0.8)
    }
  }
}

// o piloto automático da moto (medição e testes): segue a linha do meio e,
// no ar, nivela o nariz. Com "parede", mira na parede da direita, sobe e anda
// nela uns 2 s, desce e repete (o teste do wall-ride e a medição pesada)
export function pilotoMoto(s: Estado, parede: boolean): Entrada {
  const ent: Entrada = { frente: true, re: false, esq: false, dir: false, pulo: false, jato: false }
  if (s.parede) {
    const o = s.onde, tx = Math.sin(s.yaw), tz = Math.cos(s.yaw)
    const paredeDir = o.nx * tz + o.nz * -tx > 0
    if (s.paredeT < 2.2 && s.y < 7) { if (paredeDir) ent.dir = true; else ent.esq = true }
    return ent
  }
  const N = VOLTA.length, k = (s.iVolta + 11) % N, a = VOLTA[k], b = VOLTA[(k + 1) % N]
  let ax = a.x, az = a.z
  if (parede) {
    const L = Math.hypot(b.x - a.x, b.z - a.z) || 1
    ax += ((b.z - a.z) / L) * 14; az += (-(b.x - a.x) / L) * 14
  }
  const dif = ang(Math.atan2(ax - s.x, az - s.z) - s.yaw)
  ent.esq = dif > 0.04; ent.dir = dif < -0.04
  if (s.ar) {
    // no ar, o ▲ é o peso pra frente (depois de soltar o acelerador): nivela o nariz pro pouso
    ent.frente = !s.gasNeutro && s.pitch > s.pitchChao + 0.12
    ent.re = s.pitch < s.pitchChao - 0.12
    ent.esq = ent.dir = false
  }
  return ent
}
