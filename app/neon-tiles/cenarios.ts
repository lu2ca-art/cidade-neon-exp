// GUITAR DRIVER — o cenário de cada lugar da cidade (cada um com o seu
// ângulo). O braço (a pista) ocupa o meio de baixo; o cenário aparece em
// cima e nas laterais, e a banda fica no "palco" de cada lugar.

export interface Cena { t: number; cor: string; batida: number; energia: number; neon: boolean }
export interface Disposicao { fundo: number; baixo: [number, number]; guitarra: [number, number]; bateria: [number, number] | null; escala: number }

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`
}
const rnd = (s: number) => { const x = Math.sin(s * 999.13) * 43758.5453; return x - Math.floor(x) }

function luz(g: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string, a: number) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, hexA(cor, a))
  gr.addColorStop(1, hexA(cor, 0))
  g.fillStyle = gr
  g.fillRect(x - r, y - r, r * 2, r * 2)
}
function ceuNoite(g: CanvasRenderingContext2D, w: number, h: number, topo: string, base: string) {
  const c = g.createLinearGradient(0, 0, 0, h * 0.6)
  c.addColorStop(0, topo)
  c.addColorStop(1, base)
  g.fillStyle = c
  g.fillRect(0, 0, w, h)
}
function predios(g: CanvasRenderingContext2D, w: number, base: number, alt: number, cor: string, luzCor: string, semente: number, n = 14) {
  for (let i = 0; i < n; i++) {
    const x = (i / n) * w, lw = w / n + 2, hh = alt * (0.35 + rnd(semente + i) * 0.65)
    g.fillStyle = cor
    g.fillRect(x, base - hh, lw, hh)
    for (let k = 0; k < 6; k++) if (rnd(semente * 3 + i * 7 + k) < 0.4) { g.fillStyle = hexA(luzCor, 0.55); g.fillRect(x + 3 + (k % 2) * lw * 0.45, base - hh + 6 + Math.floor(k / 2) * 10, lw * 0.25, 4) }
  }
}
function chuva(g: CanvasRenderingContext2D, w: number, h: number, t: number, cor: string, n = 70) {
  g.strokeStyle = hexA(cor, 0.25)
  g.lineWidth = 1
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const x = (rnd(i) * w + t * 40) % w, y = (rnd(i + 3) * h + t * 600 * (0.7 + rnd(i) * 0.6)) % h
    g.moveTo(x, y)
    g.lineTo(x - 3, y + 14)
  }
  g.stroke()
}
function letreiro(g: CanvasRenderingContext2D, txt: string, x: number, y: number, tam: number, cor: string, pisca = 1) {
  g.save()
  g.font = `900 ${Math.round(tam)}px "Arial Black", "Arial Narrow", system-ui, sans-serif`
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.shadowColor = cor
  g.shadowBlur = 22 * pisca
  g.fillStyle = hexA(cor, 0.35 + 0.65 * pisca)
  g.fillText(txt, x, y)
  g.restore()
}

// desenha o cenário e devolve onde a banda fica
export function desenharCenario(g: CanvasRenderingContext2D, w: number, h: number, id: string, c: Cena): Disposicao | null {
  const pulso = c.batida
  switch (id) {
    case "casa-dbee": {
      // a varanda da casa no deserto, olhando da areia: céu de fim de tarde virando noite
      const ceu = g.createLinearGradient(0, 0, 0, h * 0.55)
      ceu.addColorStop(0, "#120a2a")
      ceu.addColorStop(0.6, "#5a2a4a")
      ceu.addColorStop(1, "#c8643a")
      g.fillStyle = ceu
      g.fillRect(0, 0, w, h)
      for (let i = 0; i < 50; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + rnd(i) * 0.6})`; g.fillRect(rnd(i + 1) * w, rnd(i + 2) * h * 0.3, 1.4, 1.4) }
      // a cidade pequenininha no horizonte
      predios(g, w * 0.3, h * 0.47, h * 0.04, "#2a1630", "#ff3fb0", 7, 8)
      g.save(); g.translate(w * 0.7, 0); predios(g, w * 0.3, h * 0.47, h * 0.03, "#2a1630", "#2fe8ff", 11, 6); g.restore()
      g.fillStyle = "#3a2018"
      g.fillRect(0, h * 0.47, w, h)
      // a casa: parede, porta com luz, telhado
      g.fillStyle = "#4a2c22"
      g.fillRect(w * 0.18, h * 0.24, w * 0.64, h * 0.26)
      g.fillStyle = "#2a1610"
      g.beginPath(); g.moveTo(w * 0.12, h * 0.25); g.lineTo(w * 0.5, h * 0.15); g.lineTo(w * 0.88, h * 0.25); g.fill()
      g.fillStyle = "#ffb070"; g.fillRect(w * 0.46, h * 0.33, w * 0.08, h * 0.17)
      luz(g, w * 0.5, h * 0.4, w * 0.35, "#ffb070", 0.35 + pulso * 0.1)
      // cactos
      for (const x of [0.06, 0.93]) { g.fillStyle = "#1c2a18"; g.fillRect(w * x, h * 0.3, w * 0.025, h * 0.2); g.fillRect(w * x - w * 0.02, h * 0.36, w * 0.02, h * 0.012); g.fillRect(w * x - w * 0.02, h * 0.33, w * 0.012, h * 0.04) }
      return { fundo: h * 0.5, baixo: [w * 0.3, h * 0.17], guitarra: [w * 0.7, h * 0.18], bateria: null, escala: 0.9 }
    }
    case "posto": {
      // debaixo da cobertura do posto, de lado: as bombas, a estrada à noite
      ceuNoite(g, w, h, "#05040f", "#14102a")
      g.fillStyle = "#0e0c18"; g.fillRect(0, h * 0.5, w, h)
      // a cobertura com luz branca
      g.fillStyle = "#e9e3d5"; g.fillRect(0, h * 0.06, w, h * 0.05)
      g.fillStyle = "#ffd23a"; g.fillRect(0, h * 0.11, w, h * 0.012)
      for (let i = 0; i < 5; i++) luz(g, w * (0.1 + i * 0.2), h * 0.13, w * 0.18, "#fff6d0", 0.25)
      letreiro(g, "POSTO 24H", w * 0.5, h * 0.085, h * 0.03, "#ff3d3d", Math.sin(c.t * 3) > -0.8 ? 1 : 0.3)
      // as bombas
      for (const x of [0.12, 0.88]) {
        g.fillStyle = "#c8282a"; g.fillRect(w * x - w * 0.04, h * 0.3, w * 0.08, h * 0.2)
        g.fillStyle = "#101018"; g.fillRect(w * x - w * 0.03, h * 0.32, w * 0.06, h * 0.05)
        g.fillStyle = hexA("#5dffa0", 0.8); g.fillRect(w * x - w * 0.025, h * 0.335, w * 0.05, h * 0.012)
      }
      // pilares
      g.fillStyle = "#bdb6a6"; for (const x of [0.25, 0.75]) g.fillRect(w * x - 4, h * 0.11, 8, h * 0.4)
      return { fundo: h * 0.5, baixo: [w * 0.33, h * 0.18], guitarra: [w * 0.66, h * 0.19], bateria: null, escala: 0.95 }
    }
    case "bar": {
      // de trás do balcão: prateleiras de garrafas, lâmpadas penduradas, palquinho no canto
      g.fillStyle = "#1a0e0a"; g.fillRect(0, 0, w, h)
      g.fillStyle = "#2a1610"; g.fillRect(0, 0, w, h * 0.5)
      for (let r = 0; r < 3; r++) {
        g.fillStyle = "#5a3418"; g.fillRect(0, h * (0.08 + r * 0.09), w, h * 0.008)
        for (let i = 0; i < 22; i++) {
          const x = (i / 22) * w + 4, hh = h * (0.04 + rnd(r * 30 + i) * 0.025), cor = ["#2a7a3a", "#8a3a1a", "#d8b060", "#3a5aa0", "#a02a4a"][Math.floor(rnd(i + r) * 5)]
          g.fillStyle = hexA(cor, 0.85); g.fillRect(x, h * (0.08 + r * 0.09) - hh, w * 0.022, hh)
        }
      }
      for (let i = 0; i < 4; i++) { const x = w * (0.15 + i * 0.23); g.strokeStyle = "#000"; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * 0.05); g.stroke(); luz(g, x, h * 0.06, w * 0.16, "#ffb050", 0.35 + pulso * 0.15) }
      letreiro(g, "O COPO", w * 0.5, h * 0.36, h * 0.045, "#ff6a35", 0.9 + Math.sin(c.t * 7) * 0.1)
      // o balcão em primeiro plano (lateral)
      g.fillStyle = "#3a1e10"; g.fillRect(0, h * 0.44, w, h * 0.08)
      g.fillStyle = "#6a3a1c"; g.fillRect(0, h * 0.44, w, h * 0.012)
      for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(220,240,255,0.25)"; g.fillRect(w * (0.08 + i * 0.16), h * 0.41, w * 0.03, h * 0.03) }
      return { fundo: h * 0.44, baixo: [w * 0.22, h * 0.16], guitarra: [w * 0.78, h * 0.17], bateria: [w * 0.5, h * 0.1], escala: 0.85 }
    }
    case "casa-drewboy": {
      // o quarto: grafite na parede, o espelho grande, a arara de roupa, as caixas de som
      g.fillStyle = "#1a1626"; g.fillRect(0, 0, w, h)
      const cores = ["#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0", "#b38cff"]
      for (let i = 0; i < 16; i++) { g.fillStyle = hexA(cores[i % 5], 0.35); g.beginPath(); g.ellipse(rnd(i) * w, h * (0.05 + rnd(i + 9) * 0.35), w * (0.05 + rnd(i + 2) * 0.12), h * 0.03, rnd(i) * 3, 0, Math.PI * 2); g.fill() }
      g.save(); g.font = `900 ${Math.round(h * 0.05)}px "Arial Black", sans-serif`; g.fillStyle = hexA("#ff3fb0", 0.8); g.translate(w * 0.2, h * 0.2); g.rotate(-0.15); g.fillText("222", 0, 0); g.restore()
      // o espelho com a luz ciano
      g.fillStyle = "#c8d8ff"; g.fillRect(w * 0.42, h * 0.06, w * 0.16, h * 0.3)
      luz(g, w * 0.5, h * 0.2, w * 0.3, "#7fe8ff", 0.25 + pulso * 0.1)
      // arara
      g.strokeStyle = "#8a8590"; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.68, h * 0.12); g.lineTo(w * 0.98, h * 0.12); g.stroke()
      for (let i = 0; i < 5; i++) { g.fillStyle = cores[i]; g.fillRect(w * (0.7 + i * 0.055), h * 0.13, w * 0.045, h * 0.14) }
      // caixas de som
      for (const x of [0.04, 0.9]) { g.fillStyle = "#0a0910"; g.fillRect(w * x, h * 0.3, w * 0.07, h * 0.18); g.fillStyle = "#25232e"; g.beginPath(); g.arc(w * x + w * 0.035, h * 0.42, w * 0.022 * (1 + pulso * 0.15), 0, Math.PI * 2); g.fill() }
      g.fillStyle = "#2a2028"; g.fillRect(0, h * 0.48, w, h)
      return { fundo: h * 0.48, baixo: [w * 0.26, h * 0.17], guitarra: [w * 0.74, h * 0.18], bateria: null, escala: 0.95 }
    }
    case "escondido": {
      // o cultivo: luz roxa de grow, as plantas verdes, as cores rasta
      g.fillStyle = "#0e0a16"; g.fillRect(0, 0, w, h)
      g.fillStyle = "#b040ff"; g.fillRect(w * 0.1, h * 0.04, w * 0.8, h * 0.015)
      luz(g, w * 0.5, h * 0.08, w * 0.6, "#c060ff", 0.35 + pulso * 0.1)
      for (let i = 0; i < 9; i++) {
        const x = w * (0.06 + i * 0.11), base = h * 0.46
        g.fillStyle = "#3a2418"; g.fillRect(x - w * 0.03, base - h * 0.04, w * 0.06, h * 0.04)
        for (let f = 0; f < 7; f++) { g.fillStyle = hexA(f % 2 ? "#3fd060" : "#2a9a40", 0.9); g.beginPath(); g.ellipse(x + Math.sin(f * 1.7 + c.t) * w * 0.02, base - h * (0.06 + f * 0.035), w * 0.035, h * 0.012, f * 0.9, 0, Math.PI * 2); g.fill() }
      }
      for (const [k, cor] of ["#d0302a", "#ffd23a", "#2a9a40"].entries()) { g.fillStyle = cor; g.fillRect(0, h * (0.47 + k * 0.012), w, h * 0.012) }
      g.fillStyle = "#1a1210"; g.fillRect(0, h * 0.506, w, h)
      return { fundo: h * 0.47, baixo: [w * 0.28, h * 0.15], guitarra: [w * 0.72, h * 0.16], bateria: null, escala: 0.85 }
    }
    case "balada": {
      // de cima da cabine: lasers, fumaça, a pista lotada embaixo
      g.fillStyle = "#08050f"; g.fillRect(0, 0, w, h)
      g.globalCompositeOperation = "lighter"
      for (let i = 0; i < 9; i++) {
        const a = Math.sin(c.t * 1.7 + i) * 0.9, x0 = w * (0.1 + (i % 3) * 0.4)
        g.strokeStyle = hexA(i % 3 === 0 ? "#2fe8ff" : i % 3 === 1 ? "#ff3fb0" : "#5dffa0", 0.35 + pulso * 0.3)
        g.lineWidth = 2
        g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + Math.sin(a) * w, h * 0.6); g.stroke()
      }
      for (let i = 0; i < 5; i++) luz(g, (c.t * 30 + i * 200) % (w + 200) - 100, h * 0.4, w * 0.3, "#b38cff", 0.1)
      g.globalCompositeOperation = "source-over"
      letreiro(g, "SEXTA", w * 0.5, h * 0.07, h * 0.05, "#ff3fb0", 0.8 + pulso * 0.2)
      // a cabine do DJ
      g.fillStyle = "#14101f"; g.fillRect(w * 0.3, h * 0.33, w * 0.4, h * 0.08)
      g.fillStyle = hexA("#b38cff", 0.8); g.fillRect(w * 0.3, h * 0.33, w * 0.4, 3)
      return { fundo: h * 0.42, baixo: [w * 0.18, h * 0.17], guitarra: [w * 0.82, h * 0.18], bateria: [w * 0.5, h * 0.1], escala: 0.9 }
    }
    case "topo": {
      // o terraço: a cidade lá embaixo, a chuva, a antena piscando
      ceuNoite(g, w, h, "#05040f", "#1a1640")
      predios(g, w, h * 0.5, h * 0.22, "#0d0b1e", "#2fe8ff", 21, 18)
      predios(g, w, h * 0.5, h * 0.12, "#151230", "#ff3fb0", 33, 12)
      chuva(g, w, h * 0.5, c.t, "#9fd8ff")
      g.fillStyle = "#1a1826"; g.fillRect(0, h * 0.48, w, h)
      g.strokeStyle = "#3a3846"; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.9, h * 0.48); g.lineTo(w * 0.9, h * 0.12); g.stroke()
      if (Math.sin(c.t * 4) > 0) luz(g, w * 0.9, h * 0.12, 30, "#ff2436", 0.9)
      g.fillStyle = "#2a2838"; g.fillRect(0, h * 0.46, w, h * 0.02)
      return { fundo: h * 0.48, baixo: [w * 0.25, h * 0.17], guitarra: [w * 0.75, h * 0.18], bateria: [w * 0.5, h * 0.11], escala: 0.9 }
    }
    case "casa-shows": {
      // o teatro de frente: a cortina, as caixas de som em pilha, a luz de palco
      g.fillStyle = "#07050c"; g.fillRect(0, 0, w, h)
      for (let i = 0; i < 16; i++) { const x = (i / 16) * w; const gr = g.createLinearGradient(x, 0, x + w / 16, 0); gr.addColorStop(0, "#3a0a14"); gr.addColorStop(0.5, "#6a1424"); gr.addColorStop(1, "#3a0a14"); g.fillStyle = gr; g.fillRect(x, 0, w / 16 + 1, h * 0.12) }
      for (const x of [0.02, 0.86]) { for (let k = 0; k < 3; k++) { g.fillStyle = "#0e0d12"; g.fillRect(w * x, h * (0.18 + k * 0.1), w * 0.12, h * 0.095); g.fillStyle = "#24222c"; g.beginPath(); g.arc(w * x + w * 0.06, h * (0.225 + k * 0.1), w * 0.035 * (1 + pulso * 0.12), 0, Math.PI * 2); g.fill() } }
      letreiro(g, "ONTEM", w * 0.5, h * 0.16, h * 0.045, "#ffc857", 0.85)
      g.globalCompositeOperation = "lighter"
      for (let i = 0; i < 4; i++) { const x = w * (0.2 + i * 0.2); const gr = g.createLinearGradient(x, h * 0.12, x, h * 0.5); gr.addColorStop(0, hexA(i % 2 ? "#ffc857" : "#ffffff", 0.3 + pulso * 0.2)); gr.addColorStop(1, hexA("#ffffff", 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 6, h * 0.12); g.lineTo(x + w * 0.1, h * 0.5); g.lineTo(x - w * 0.1, h * 0.5); g.fill() }
      g.globalCompositeOperation = "source-over"
      g.fillStyle = "#1a140c"; g.fillRect(0, h * 0.48, w, h)
      return { fundo: h * 0.48, baixo: [w * 0.25, h * 0.19], guitarra: [w * 0.75, h * 0.2], bateria: [w * 0.5, h * 0.12], escala: 1 }
    }
    case "plataforma": {
      // dentro do vagão, olhando o corredor: as janelas com a cidade passando, as barras
      g.fillStyle = "#d8dce4"; g.fillRect(0, 0, w, h)
      g.fillStyle = "#b8bec8"; g.fillRect(0, 0, w, h * 0.04)
      for (let k = 0; k < 2; k++) {
        const x0 = k ? w * 0.76 : 0, lw = w * 0.24
        g.fillStyle = "#0a0c18"; g.fillRect(x0 + 6, h * 0.1, lw - 12, h * 0.22)
        g.save(); g.beginPath(); g.rect(x0 + 6, h * 0.1, lw - 12, h * 0.22); g.clip()
        for (let i = 0; i < 10; i++) { const x = x0 + ((i * 60 - c.t * 400 * (k ? 1 : -1)) % (lw + 80) + lw + 80) % (lw + 80) - 40; g.fillStyle = hexA(i % 2 ? "#ff3fb0" : "#2fe8ff", 0.5); g.fillRect(x, h * (0.16 + rnd(i) * 0.1), 16, 4) }
        g.restore()
      }
      // o corredor em perspectiva
      g.fillStyle = "#9aa2b0"; g.beginPath(); g.moveTo(w * 0.24, h * 0.04); g.lineTo(w * 0.4, h * 0.2); g.lineTo(w * 0.4, h * 0.42); g.lineTo(w * 0.24, h * 0.55); g.fill()
      g.beginPath(); g.moveTo(w * 0.76, h * 0.04); g.lineTo(w * 0.6, h * 0.2); g.lineTo(w * 0.6, h * 0.42); g.lineTo(w * 0.76, h * 0.55); g.fill()
      g.fillStyle = "#2a2e3a"; g.fillRect(w * 0.4, h * 0.2, w * 0.2, h * 0.22)
      g.fillStyle = hexA("#e6f0ff", 0.9); for (let i = 0; i < 4; i++) g.fillRect(w * (0.3 + i * 0.13), h * 0.045, w * 0.1, 4)
      g.strokeStyle = "#f0f2f6"; g.lineWidth = 4; for (const x of [0.32, 0.68]) { g.beginPath(); g.moveTo(w * x, 0); g.lineTo(w * x, h * 0.5); g.stroke() }
      g.fillStyle = "#5a606c"; g.fillRect(0, h * 0.5, w, h)
      return { fundo: h * 0.48, baixo: [w * 0.25, h * 0.16], guitarra: [w * 0.75, h * 0.17], bateria: null, escala: 0.85 }
    }
    case "beco": {
      // o beco: chão molhado, a escada de incêndio, os três letreiros da avenida lá atrás
      ceuNoite(g, w, h, "#06050d", "#151020")
      g.fillStyle = "#14111c"; g.fillRect(0, 0, w * 0.22, h); g.fillRect(w * 0.78, 0, w * 0.22, h)
      g.strokeStyle = "#2a2634"; g.lineWidth = 2
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(w * 0.02, h * (0.06 + k * 0.08)); g.lineTo(w * 0.2, h * (0.06 + k * 0.08)); g.stroke() }
      const placas: [string, string][] = [["GLAMOUR", "#ff3fb0"], ["CONSUMO", "#ffc857"], ["CONFORTO", "#2fe8ff"]]
      placas.forEach(([t, cor], i) => letreiro(g, t, w * (0.32 + i * 0.18), h * (0.12 + (i % 2) * 0.06), h * 0.022, cor, Math.sin(c.t * (3 + i)) > -0.7 ? 1 : 0.2))
      chuva(g, w, h * 0.5, c.t, "#c0c8ff", 40)
      g.fillStyle = "#100e16"; g.fillRect(0, h * 0.48, w, h)
      for (let i = 0; i < 3; i++) luz(g, w * (0.32 + i * 0.18), h * 0.5, w * 0.12, placas[i][1], 0.15)
      return { fundo: h * 0.48, baixo: [w * 0.33, h * 0.16], guitarra: [w * 0.67, h * 0.17], bateria: null, escala: 0.85 }
    }
    default:
      return null // a arena usa o palco grande (telão de LED)
  }
}
