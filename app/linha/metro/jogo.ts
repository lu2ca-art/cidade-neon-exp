// O METRÔ (T26): a fuga. Só a lógica, em passos fixos de 1/120 s (o relógio
// do jogo; a tela interpola). Você corre sozinho pra frente; desvia pros
// lados, empurra quem está no caminho, e as portinhas entre os vagões
// seguram o guarda um tiquinho. Esbarrou em alguém: tropeça. Ele te alcança
// a 1ª vez: arranca o violão das suas costas (você ganha um embalo). A 2ª:
// te pegou. Chegou na porta da curva: pula.

import { BAIAS, MEIA, NV, PASSAGEM, RAIO, Z_PORTA, Z_SAIDA, inicioVagao, montarPlanta, sorteio, vagaoDe, type Planta } from "./mundo"

export const PASSO = 1 / 120
export type Fase = "intro" | "fuga" | "porta" | "pulou" | "pego"
export type Evento =
  | "apito" | "esbarrou" | "empurrou" | "guarda-esbarrou" | "violao" | "pego" | "porta" | "pulou"
  | "portinha" | "apagao" | "volta-luz" | "porta-abre" | "radio" | "passo-voce" | "passo-guarda"

// o ajuste fino da perseguição (o gosto do dono decide)
export const AJUSTE = {
  vVoce: 6.2, // m/s correndo
  vTropeco: 1.9, // depois de esbarrar
  tTropeco: 0.42,
  vEmbalo: 7.6, // depois de soltar o violão
  tEmbalo: 1.3,
  vEmpurra: 3.6,
  tEmpurra: 0.22,
  vLado: 3.4,
  vGuarda: 5.75, // o guarda começa assim…
  rampa: 0.045, // …e ganha isto por segundo…
  vGuardaMax: 6.6, // …até aqui
  reacao: 0.9, // o tempo dele levantar
  alcance: 0.74, // a distância em que ele te agarra
}

export interface Corpo { x: number; z: number; px: number; pz: number; vx: number; vz: number; passo: number }
export interface Gente { x: number; z: number; x0: number; empurrado: number; dir: number; fase: number }

export class Fuga {
  planta: Planta
  fase: Fase = "intro"
  t = 0 // tempo desde o "corre"
  voce: Corpo
  guarda: Corpo & { parado: number; lento: number; olhando: number }
  tropeco = 0
  embalo = 0
  empurra = 0
  esperaEmpurra = 0
  violao: "costas" | "perdido" = "costas"
  colisoes = 0
  empurroes = 0
  portinhas: { z: number; aberta: number; alvo: number; fecharEm: number }[]
  gente: Gente[]
  migalhas: { x: number; z: number }[] = []
  ultimaMigalha = 0
  // a porta da curva (0 fechada, 1 aberta) e o pulo
  saida = 0
  tPorta = 0
  // a luz: 1 normal; cai no apagão
  luz = 1
  apagao = { proximo: 4.5, ate: 0 }
  odometro = 0 // quanto o trem já andou (o túnel passando)
  vTrem = 21
  // o que aconteceu neste passo (a cena e o som consomem)
  eventos: Evento[] = []
  // entrada
  lado = 0 // −1..1
  freio = false
  pedeEmpurrar = false
  private r: () => number

  constructor(semente = 222) {
    this.planta = montarPlanta(semente)
    this.r = sorteio(semente * 7 + 1)
    const z0 = inicioVagao(0)
    this.voce = { x: 0, z: z0 + 5.4, px: 0, pz: z0 + 5.4, vx: 0, vz: 0, passo: 0 }
    // ele está no fundo do vagão, sentado do lado esquerdo
    this.guarda = { x: -0.55, z: z0 + 0.9, px: -0.55, pz: z0 + 0.9, vx: 0, vz: 0, passo: 0, parado: AJUSTE.reacao, lento: 0, olhando: 1 }
    this.portinhas = this.planta.portinhas.map((z) => ({ z, aberta: 0, alvo: 0, fecharEm: 0 }))
    this.gente = this.planta.em_pe.map((p) => ({ x: p.x, z: p.z, x0: p.x, empurrado: 0, dir: 0, fase: p.fase }))
    this.apagao.proximo = 4.5 + this.r() * 2.5
  }

  comecar() {
    if (this.fase !== "intro") return
    this.fase = "fuga"
    this.eventos.push("apito")
  }

  get distancia() { return Math.hypot(this.voce.x - this.guarda.x, this.voce.z - this.guarda.z) }
  get progresso() { return Math.max(0, Math.min(1, (this.voce.z - inicioVagao(0)) / (Z_PORTA - inicioVagao(0)))) }

  passo() {
    const dt = PASSO
    const v = this.voce, g = this.guarda
    v.px = v.x; v.pz = v.z; g.px = g.x; g.pz = g.z
    this.odometro += this.vTrem * dt
    // a luz pisca antes de apagar; no apagão só sobra a lanterna dele e o túnel
    if (this.fase === "fuga" || this.fase === "porta") {
      this.t += dt
      const a = this.apagao
      if (this.t >= a.proximo && a.ate === 0) { a.ate = this.t + 1.35; this.eventos.push("apagao") }
      if (a.ate && this.t >= a.ate) { a.ate = 0; a.proximo = this.t + 6 + this.r() * 3; this.eventos.push("volta-luz") }
    }
    const a = this.apagao
    const antes = a.proximo - this.t
    this.luz = a.ate ? 0 : antes < 0.4 && this.fase === "fuga" ? (Math.sin(this.t * 90) > 0.2 ? 1 : 0.15) : 1
    if (this.fase === "pulou") this.luz = 1
    if (this.fase === "intro") { this.animarGente(dt); return }
    if (this.fase === "pulou" || this.fase === "pego") { this.animarGente(dt); this.andarGuarda(dt, true); return }

    // ── você ──
    if (this.fase === "porta") {
      // vai pra porta (à direita) e pula
      this.tPorta += dt
      v.vz += (0.8 - v.vz) * Math.min(1, dt * 6)
      v.x += (1.9 - v.x) * Math.min(1, dt * 5)
      v.z += v.vz * dt
      v.passo += dt * 9
      if (this.tPorta > 0.75) { this.fase = "pulou"; this.eventos.push("pulou") }
    } else {
      this.tropeco = Math.max(0, this.tropeco - dt)
      this.embalo = Math.max(0, this.embalo - dt)
      this.empurra = Math.max(0, this.empurra - dt)
      this.esperaEmpurra = Math.max(0, this.esperaEmpurra - dt)
      const vmax = this.tropeco > 0 ? AJUSTE.vTropeco : this.empurra > 0 ? AJUSTE.vEmpurra : this.embalo > 0 ? AJUSTE.vEmbalo : this.freio ? 2 : AJUSTE.vVoce
      v.vz += Math.max(-14 * dt, Math.min(9 * dt, vmax - v.vz))
      const alvoX = this.lado * AJUSTE.vLado
      v.vx += Math.max(-24 * dt, Math.min(24 * dt, alvoX - v.vx))
      v.x += v.vx * dt
      v.z += v.vz * dt
      const passoAntes = Math.floor(v.passo / Math.PI)
      v.passo += dt * (2.2 + v.vz * 1.35)
      if (Math.floor(v.passo / Math.PI) !== passoAntes) this.eventos.push("passo-voce")
      if (this.pedeEmpurrar) this.empurrar()
      this.colidir(v, true)
      if (v.z >= Z_SAIDA) { this.fase = "porta"; this.tPorta = 0; this.eventos.push("porta") }
    }
    this.pedeEmpurrar = false

    // as migalhas (o caminho que você fez): o guarda vem por elas
    this.ultimaMigalha -= dt
    const um = this.migalhas[this.migalhas.length - 1]
    if (this.ultimaMigalha <= 0 && (!um || Math.hypot(um.x - v.x, um.z - v.z) > 0.18)) { this.migalhas.push({ x: v.x, z: v.z }); this.ultimaMigalha = 0.06 }

    // a porta da curva abre quando você entra no último vagão
    if (this.saida === 0 && vagaoDe(v.z) === NV - 1) this.eventos.push("porta-abre")
    if (vagaoDe(v.z) === NV - 1 || this.saida > 0) this.saida = Math.min(1, this.saida + dt / 0.6)

    this.portas(dt)
    this.andarGuarda(dt, false)
    this.animarGente(dt)

    // ele te alcançou
    if (this.fase === "fuga" && g.parado <= 0 && this.distancia < AJUSTE.alcance) {
      if (this.violao === "costas") {
        // a 1ª vez: ele agarra o violão. Você solta e ganha um embalo
        this.violao = "perdido"
        g.parado = 1.15
        this.embalo = AJUSTE.tEmbalo
        this.tropeco = 0
        this.eventos.push("violao")
      } else {
        this.fase = "pego"
        v.vz = 0; v.vx = 0
        this.eventos.push("pego")
      }
    }
    // o rádio dele, de vez em quando
    if (this.fase === "fuga" && Math.floor((this.t - dt) / 5.5) !== Math.floor(this.t / 5.5)) this.eventos.push("radio")
  }

  private empurrar() {
    if (this.esperaEmpurra > 0) return
    const v = this.voce
    let alvo: Gente | null = null, melhor = 1.7
    for (const p of this.gente) {
      const dz = p.z - v.z
      if (dz > -0.1 && dz < melhor && Math.abs(p.x - v.x) < 0.75) { melhor = dz; alvo = p }
    }
    this.esperaEmpurra = 0.7
    if (!alvo) return
    // empurra pro lado que tem mais espaço (até a beira do banco)
    alvo.dir = alvo.x >= v.x ? 1 : -1
    alvo.empurrado = 1
    this.empurra = AJUSTE.tEmpurra
    this.empurroes++
    this.eventos.push("empurrou")
  }

  // as portinhas: abrem quando alguém chega perto; fecham sozinhas depois que você passa
  private portas(dt: number) {
    const v = this.voce, g = this.guarda
    for (const p of this.portinhas) {
      const dv = p.z - v.z, dg = p.z - g.z
      if (dv > -0.3 && dv < 1.7) p.alvo = 1
      if (dv < -0.3 && p.alvo === 1 && p.fecharEm === 0) p.fecharEm = 0.75
      if (p.fecharEm > 0) { p.fecharEm -= dt; if (p.fecharEm <= 0) { p.fecharEm = 0; if (!(dg > -0.4 && dg < 0.9)) { p.alvo = 0; this.eventos.push("portinha") } } }
      // o guarda abre de novo (mais devagar: ele tem que puxar)
      if (p.alvo === 0 && dg > -0.3 && dg < 1.0 && dv < 0) { p.alvo = 1; p.fecharEm = 0 }
      const vel = p.alvo ? (dg > -0.3 && dg < 1.0 && dv < 0 ? 1 / 0.55 : 1 / 0.3) : 1 / 0.35
      const antes = p.aberta
      p.aberta = Math.max(0, Math.min(1, p.aberta + (p.alvo ? vel : -vel) * dt))
      if (antes === 0 && p.aberta > 0) this.eventos.push("portinha")
    }
  }

  private andarGuarda(dt: number, acabou: boolean) {
    const g = this.guarda, v = this.voce
    if (this.fase === "intro") return
    if (g.parado > 0) { g.parado -= dt; g.vz *= 0.9; return }
    g.lento = Math.max(0, g.lento - dt)
    const d = this.distancia
    let vg = Math.min(AJUSTE.vGuardaMax, AJUSTE.vGuarda + AJUSTE.rampa * this.t)
    if (d > 10) vg += 1.3; else if (d > 7) vg += 0.6; else if (d < 2.2) vg -= 0.6
    if (g.lento > 0) vg *= 0.62
    if (acabou) vg = this.fase === "pego" ? 0 : 3
    // perto e sem portinha fechada no meio: vem direto em você; senão, pelas migalhas
    let tx: number, tz: number
    const fechada = this.portinhas.some((p) => p.aberta < 0.8 && (p.z - g.z) * (p.z - v.z) < 0)
    if (d < 3.5 && !fechada) { tx = v.x; tz = v.z }
    else {
      while (this.migalhas.length > 1 && (Math.hypot(this.migalhas[0].x - g.x, this.migalhas[0].z - g.z) < 0.4 || this.migalhas[0].z < g.z - 0.2)) this.migalhas.shift()
      const m = this.migalhas[0] ?? v
      tx = m.x; tz = m.z
    }
    const dx = tx - g.x, dz = tz - g.z, n = Math.hypot(dx, dz) || 1
    const ax = (dx / n) * vg, az = (dz / n) * vg
    g.vx += (ax - g.vx) * Math.min(1, dt * 8)
    g.vz += (az - g.vz) * Math.min(1, dt * 8)
    g.x += g.vx * dt
    g.z += g.vz * dt
    const passoAntes = Math.floor(g.passo / Math.PI)
    g.passo += dt * (2 + Math.hypot(g.vx, g.vz) * 1.3)
    if (Math.floor(g.passo / Math.PI) !== passoAntes && Math.hypot(g.vx, g.vz) > 1) this.eventos.push("passo-guarda")
    this.colidir(g, false)
  }

  // círculo contra as paredes, os bancos, as portinhas fechadas, os postes e a gente
  private colidir(c: Corpo, ehVoce: boolean) {
    const r = RAIO
    // as paredes do vagão (e a porta da curva, aberta, deixa sair pela direita)
    const lim = MEIA - r
    const saindo = ehVoce && this.fase === "porta"
    if (c.x < -lim) { c.x = -lim; c.vx = Math.max(0, c.vx) }
    if (c.x > lim && !saindo) { c.x = lim; c.vx = Math.min(0, c.vx) }
    for (const b of this.planta.caixas) empurrarCaixa(c, b, r)
    for (const p of this.portinhas) if (p.aberta < 0.8) empurrarCaixa(c, { x0: -PASSAGEM, x1: PASSAGEM, z0: p.z - 0.05, z1: p.z + 0.05 }, r)
    for (const p of this.planta.postes) {
      const dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz), m = r + p.r
      if (d < m && d > 1e-6) {
        c.x = p.x + (dx / d) * m; c.z = p.z + (dz / d) * m
        // de frente no poste: segura um pouco
        if (dz < 0 && ehVoce) c.vz *= 0.6
      }
    }
    for (const p of this.gente) {
      const dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz), m = r + 0.27
      if (d < m && d > 1e-6) {
        c.x = p.x + (dx / d) * m; c.z = p.z + (dz / d) * m
        if (ehVoce) {
          if (this.tropeco <= 0 && this.embalo <= 0 && c.vz > 2.5 && dz < 0) {
            this.tropeco = AJUSTE.tTropeco
            this.colisoes++
            p.dir = p.x >= c.x ? 1 : -1; p.empurrado = Math.max(p.empurrado, 0.6)
            this.eventos.push("esbarrou")
          }
        } else if (p.empurrado < 0.3) {
          // o guarda passa por cima: a pessoa vai pro lado, ele perde o passo
          p.dir = p.x >= c.x ? 1 : -1; p.empurrado = 1
          this.guarda.lento = 0.3
          this.eventos.push("guarda-esbarrou")
        }
      }
    }
  }

  // quem está em pé balança com o trem; quem foi empurrado vai pra beira e fica
  private animarGente(dt: number) {
    for (const p of this.gente) {
      p.fase += dt * 1.3
      if (p.empurrado > 0) {
        const zl = p.z - inicioVagao(Math.max(0, vagaoDe(p.z)))
        const naBaia = BAIAS.some(([a, b]) => zl >= a && zl <= b)
        const beira = naBaia ? 1.0 : 0.62
        p.x0 += (p.dir * beira - p.x0) * Math.min(1, dt * 7 * p.empurrado)
        p.empurrado = Math.max(0, p.empurrado - dt * 1.4)
      }
      p.x = p.x0 + Math.sin(p.fase) * 0.035
    }
  }
}

function empurrarCaixa(c: { x: number; z: number; vx: number; vz: number }, b: { x0: number; x1: number; z0: number; z1: number }, r: number) {
  const qx = Math.max(b.x0, Math.min(c.x, b.x1)), qz = Math.max(b.z0, Math.min(c.z, b.z1))
  const dx = c.x - qx, dz = c.z - qz, d2 = dx * dx + dz * dz
  if (d2 >= r * r) return
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2)
    c.x = qx + (dx / d) * r; c.z = qz + (dz / d) * r
    if (Math.abs(dx) > Math.abs(dz)) c.vx = 0; else if (dz < 0) c.vz = Math.min(c.vz, 0); else c.vz = Math.max(c.vz, 0)
  } else {
    // o centro entrou na caixa: sai pelo lado mais perto
    const e = [c.x - b.x0, b.x1 - c.x, c.z - b.z0, b.z1 - c.z]
    const k = e.indexOf(Math.min(...e))
    if (k === 0) c.x = b.x0 - r; else if (k === 1) c.x = b.x1 + r; else if (k === 2) c.z = b.z0 - r; else c.z = b.z1 + r
  }
}
