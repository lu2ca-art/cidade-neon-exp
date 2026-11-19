// A ARTE DOS OUTDOORS DO NÚCLEO (08/11). Coordenada do dono: "propaganda
// maximalista mesmo, pra ficar bem na cara das pessoas". Uma peça diferente por
// produto, na mesma ordem de PRODUTOS (outdoorsDados.ts): cada função pinta uma
// célula do atlas, uma vez só, com a origem no canto da célula.
//
// O que vale pra todas:
// - Toda letra passa pelo bloco(): ela é medida e esticada pra caber na caixa,
//   então Arial Black no computador e a fonte do sistema no iPhone não vazam.
// - Sem shadowBlur (é o que custa caro no canvas): a sombra é o texto repetido.
// - Formas (estouro, seta, coração) são caminho, não caractere: emoji varia por aparelho.
// - O bloom do Cinema corta em 0,62 de luminância: fundo grande fica abaixo disso
//   (amarelo #ffc800, nunca branco), senão a placa estoura e lava a letra.
// - O hack é preto com ciano/magenta deslocados: aqui, nenhum fundo preto.

const FONTE = '"Arial Black", system-ui, sans-serif'
export const ANUNCIO_W = 512, ANUNCIO_H = 256
const W = ANUNCIO_W, H = ANUNCIO_H
const PRETO = "#111", BRANCO = "#fff", AMARELO = "#ffc800", VERMELHO = "#e8001c", AZUL = "#0030d8"
const TAU = Math.PI * 2

type G = CanvasRenderingContext2D
type Produto = { nome: string; slogan: string; cor: string }
type Op = {
  al?: "left" | "center" | "right"; peso?: string
  c?: string; lc?: number // contorno
  s?: string; dx?: number; dy?: number // sombra dura (o texto repetido)
  gira?: number; inclina?: number
  maxX?: number; maxY?: number // o quanto pode esticar de um lado em relação ao outro
}

/** escreve `txt` dentro da caixa, esticando até encostar nela (nunca passa) */
function bloco(g: G, txt: string, x: number, y: number, w: number, h: number, cor: string, o: Op = {}) {
  g.save()
  g.font = `${o.peso ?? "900"} 100px ${FONTE}`; g.textAlign = "left"; g.textBaseline = "alphabetic"
  const m = g.measureText(txt)
  const l = m.actualBoundingBoxLeft, a = m.actualBoundingBoxAscent
  const tw = l + m.actualBoundingBoxRight || 1, th = a + m.actualBoundingBoxDescent || 1
  const sx = Math.min(w / tw, (h / th) * (o.maxX ?? 1.5)), sy = Math.min(h / th, sx * (o.maxY ?? 2.6))
  const al = o.al ?? "center", aw = tw * sx, ah = th * sy
  g.translate(x + w / 2, y + h / 2)
  if (o.gira) g.rotate(o.gira)
  if (o.inclina) g.transform(1, 0, -o.inclina, 1, 0, 0)
  g.translate(al === "left" ? -w / 2 : al === "right" ? w / 2 - aw : -aw / 2, -ah / 2 + a * sy)
  g.scale(sx, sy)
  if (o.s) {
    const dx = o.dx ?? 4, dy = o.dy ?? 4, n = Math.max(Math.abs(dx), Math.abs(dy))
    g.fillStyle = o.s
    for (let k = n; k > 0; k--) g.fillText(txt, l + (dx * k) / n / sx, (dy * k) / n / sy)
  }
  if (o.c) { g.strokeStyle = o.c; g.lineJoin = "round"; g.lineWidth = ((o.lc ?? 3) * 4) / (sx + sy); g.strokeText(txt, l, 0) }
  g.fillStyle = cor
  g.fillText(txt, l, 0)
  g.restore()
}

/** quebra o texto em `n` linhas de tamanho parecido */
function quebra(txt: string, n: number) {
  const alvo = txt.length / n, l: string[] = []
  let a = ""
  for (const p of txt.split(" ")) {
    if (a && a.length + p.length / 2 > alvo && l.length < n - 1) { l.push(a); a = p } else a = a ? `${a} ${p}` : p
  }
  l.push(a)
  return l
}

/** várias linhas empilhadas dentro da caixa */
function pilha(g: G, ls: string[], x: number, y: number, w: number, h: number, cor: string, o: Op = {}) {
  const lh = (h - 2 * (ls.length - 1)) / ls.length
  ls.forEach((t, i) => bloco(g, t, x, y + i * (lh + 2), w, lh, cor, o))
}

function retan(g: G, x: number, y: number, w: number, h: number, cor: string) { g.fillStyle = cor; g.fillRect(x, y, w, h) }

// (roundRect do canvas só existe do iOS 16 em diante)
function arred(g: G, x: number, y: number, w: number, h: number, r: number, cor: string) {
  g.beginPath(); g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r)
  g.closePath(); g.fillStyle = cor; g.fill()
}

function disco(g: G, cx: number, cy: number, r: number, cor: string) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fillStyle = cor; g.fill() }

/** o estouro de oferta: `n` pontas entre os raios r1 e r2 */
function estouro(g: G, cx: number, cy: number, r1: number, r2: number, n: number, cor: string, borda?: string, gira = 0) {
  g.beginPath()
  for (let i = 0; i < n * 2; i++) {
    const a = gira + (i * Math.PI) / n, r = i % 2 ? r2 : r1
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
  }
  g.closePath(); g.fillStyle = cor; g.fill()
  if (borda) { g.strokeStyle = borda; g.lineWidth = 3; g.stroke() }
}

/** o fundo em raios de sol saindo de um ponto */
function raios(g: G, cx: number, cy: number, n: number, c1: string, c2: string) {
  retan(g, 0, 0, W, H, c1)
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const a = (i * TAU) / n, b = a + Math.PI / n
    g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 800, cy + Math.sin(a) * 800); g.lineTo(cx + Math.cos(b) * 800, cy + Math.sin(b) * 800); g.closePath()
  }
  g.fillStyle = c2; g.fill()
}

/** faixa de zebra diagonal (obra, perigo, urgência) */
function listras(g: G, x: number, y: number, w: number, h: number, c1: string, c2: string, passo: number) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip()
  retan(g, x, y, w, h, c1)
  g.beginPath()
  for (let a = x - h; a < x + w; a += passo * 2) { g.moveTo(a, y + h); g.lineTo(a + passo, y + h); g.lineTo(a + passo + h, y); g.lineTo(a + h, y); g.closePath() }
  g.fillStyle = c2; g.fill()
  g.restore()
}

/** seta cheia apontando no ângulo `ang` */
function seta(g: G, cx: number, cy: number, t: number, ang: number, cor: string) {
  g.save(); g.translate(cx, cy); g.rotate(ang)
  g.beginPath(); g.moveTo(-t, -0.35 * t); g.lineTo(0, -0.35 * t); g.lineTo(0, -0.8 * t); g.lineTo(t, 0); g.lineTo(0, 0.8 * t); g.lineTo(0, 0.35 * t); g.lineTo(-t, 0.35 * t); g.closePath()
  g.fillStyle = cor; g.fill(); g.restore()
}

/** a divisa ">" pra direita */
function divisa(g: G, cx: number, cy: number, t: number, cor: string) {
  g.beginPath(); g.moveTo(cx - 0.5 * t, cy - t); g.lineTo(cx + 0.1 * t, cy - t); g.lineTo(cx + 0.7 * t, cy); g.lineTo(cx + 0.1 * t, cy + t); g.lineTo(cx - 0.5 * t, cy + t); g.lineTo(cx + 0.1 * t, cy); g.closePath()
  g.fillStyle = cor; g.fill()
}

function coracao(g: G, cx: number, cy: number, s: number) {
  g.moveTo(cx, cy + s * 0.9)
  g.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.8, cy - s * 1.1, cx, cy - s * 0.35)
  g.bezierCurveTo(cx + s * 0.8, cy - s * 1.1, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.9)
  g.closePath()
}

const marca = (g: G, x: number, y: number, w: number, h: number, cor: string) => bloco(g, "◆ NÚCLEO", x, y, w, h, cor, { al: "right" })
const miudo = (g: G, txt: string, x: number, y: number, w: number, h: number, cor: string) => bloco(g, txt, x, y, w, h, cor, { peso: "700", al: "left", maxX: 2 })

/** uma peça por produto, na ordem de PRODUTOS */
export const ANUNCIOS: ((g: G, p: Produto) => void)[] = [
  // SCROLL INFINITO: o nome descendo e crescendo até a borda cortar, e setas pra baixo
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    retan(g, 0, 0, W, H, p.cor)
    const degraus: [number, number, string][] = [[6, 14, BRANCO], [24, 22, PRETO], [50, 34, BRANCO], [88, 52, PRETO]]
    for (const [y, h, cor] of degraus) bloco(g, a, 10, y, 324, h, cor)
    bloco(g, b, 10, 146, 324, 62, AMARELO, { c: PRETO, lc: 3, s: PRETO, dx: 4, dy: 4 })
    bloco(g, b, 10, 214, 324, 66, "#c81e7a")
    estouro(g, 286, 40, 44, 32, 14, BRANCO, PRETO, 0.1)
    bloco(g, "MAIS", 258, 26, 56, 16, VERMELHO); bloco(g, "UM!", 264, 44, 44, 16, VERMELHO)
    retan(g, 344, 0, 168, H, AMARELO)
    marca(g, 356, 8, 144, 16, PRETO)
    seta(g, 428, 52, 24, Math.PI / 2, VERMELHO); seta(g, 428, 98, 24, Math.PI / 2, PRETO); seta(g, 428, 144, 24, Math.PI / 2, VERMELHO)
    pilha(g, quebra(p.slogan, 2), 354, 176, 148, 52, PRETO)
    pilha(g, quebra("*o fim não está incluso no plano.", 2), 354, 232, 148, 18, PRETO, { peso: "700" })
  },
  // FOMO+: placa de perigo, o "+" num estouro e o cronômetro acabando
  (g, p) => {
    retan(g, 0, 0, W, H, AMARELO)
    listras(g, 0, 0, W, 18, PRETO, AMARELO, 28); listras(g, 0, 238, W, 18, PRETO, AMARELO, 28)
    bloco(g, p.nome.replace("+", ""), 14, 24, 340, 130, PRETO, { s: VERMELHO, dx: 6, dy: 6 })
    estouro(g, 418, 90, 88, 66, 16, VERMELHO, PRETO, 0.1)
    bloco(g, "+", 366, 38, 104, 104, BRANCO, { c: PRETO, lc: 4 })
    bloco(g, "*", 482, 22, 22, 22, PRETO)
    retan(g, 0, 160, W, 36, VERMELHO)
    bloco(g, "ÚLTIMAS UNIDADES!!! CORRE!!!", 12, 165, 372, 26, BRANCO, { maxX: 3 })
    marca(g, 396, 168, 104, 20, AMARELO)
    bloco(g, p.slogan, 14, 200, 372, 22, PRETO, { al: "left", maxX: 3 })
    retan(g, 398, 200, 100, 34, PRETO)
    bloco(g, "00:03", 404, 204, 88, 26, VERMELHO)
    miudo(g, "*30% a mais que o medo do mês passado. todo mundo já comprou.", 14, 224, 372, 11, PRETO)
  },
  // MINUTO DOURADO: relógio de ouro de loja de penhor, em raios de sol, com etiqueta
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    raios(g, 110, 118, 18, p.cor, AMARELO)
    disco(g, 110, 118, 96, VERMELHO); disco(g, 110, 118, 84, "#ffcf70")
    g.strokeStyle = PRETO; g.lineCap = "round"
    g.lineWidth = 5
    for (let i = 0; i < 12; i++) { const t = (i * TAU) / 12; g.beginPath(); g.moveTo(110 + Math.cos(t) * 68, 118 + Math.sin(t) * 68); g.lineTo(110 + Math.cos(t) * 78, 118 + Math.sin(t) * 78); g.stroke() }
    g.lineWidth = 9; g.beginPath(); g.moveTo(110, 118); g.lineTo(150, 88); g.stroke()
    g.lineWidth = 6; g.beginPath(); g.moveTo(110, 118); g.lineTo(62, 86); g.stroke()
    estouro(g, 74, 204, 50, 38, 14, VERMELHO, BRANCO)
    bloco(g, "R$ 59,99", 34, 186, 80, 24, BRANCO); bloco(g, "/MIN", 48, 212, 52, 16, AMARELO)
    bloco(g, a, 226, 14, 272, 74, VERMELHO, { c: BRANCO, lc: 3 })
    bloco(g, b, 226, 92, 272, 80, BRANCO, { c: "#7a1200", lc: 4 })
    pilha(g, quebra(p.slogan, 2), 226, 178, 272, 44, PRETO)
    miudo(g, "*minuto de 59 segundos. o segundo restante é taxa.", 226, 225, 272, 13, PRETO)
    marca(g, 360, 240, 138, 14, "#7a1200")
  },
  // DOPA-COLA: refrigerante antigo, nome torto, faixa branca, a lata suando
  (g, p) => {
    const [a, b] = p.nome.split("-")
    retan(g, 0, 0, W, H, p.cor)
    g.fillStyle = BRANCO; g.beginPath(); g.moveTo(0, 150); g.bezierCurveTo(130, 110, 250, 200, 400, 120); g.lineTo(400, 142); g.bezierCurveTo(260, 222, 130, 134, 0, 172); g.closePath(); g.fill()
    retan(g, 0, 0, W, 22, "#8a0012")
    bloco(g, "BEBA. BEBA. BEBA. BEBA. BEBA.", 8, 4, 382, 14, AMARELO, { maxX: 3 })
    marca(g, 400, 4, 104, 14, AMARELO)
    bloco(g, a, 24, 28, 276, 88, BRANCO, { c: "#8a0012", lc: 4, gira: -0.1 })
    bloco(g, b, 92, 110, 276, 88, AMARELO, { c: "#8a0012", lc: 4, gira: -0.1 })
    arred(g, 400, 30, 92, 210, 16, "#c8ced8")
    retan(g, 400, 76, 92, 112, "#8a0012")
    bloco(g, a, 410, 92, 72, 34, BRANCO); bloco(g, b, 410, 132, 72, 34, AMARELO)
    for (const [x, y, r] of [[414, 58, 5], [438, 46, 4], [470, 62, 6], [424, 206, 6], [462, 216, 5], [482, 200, 4]]) disco(g, x, y, r, BRANCO)
    estouro(g, 452, 50, 44, 34, 12, AMARELO, VERMELHO, 0.2)
    bloco(g, "0% PAZ*", 420, 40, 64, 20, VERMELHO)
    arred(g, 10, 204, 376, 36, 10, "#8a0012")
    bloco(g, p.slogan, 22, 209, 352, 26, BRANCO)
    miudo(g, "*contém 100% da vontade de tomar outra.", 14, 243, 372, 11, BRANCO)
  },
  // PACIÊNCIA ZERO: o nome riscado, ZERO deitado de tão rápido, JÁ JÁ JÁ
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    retan(g, 0, 0, W, H, p.cor)
    for (let k = 0; k < 11; k++) retan(g, (k * 97) % 300, 6 + k * 17, 80 + ((k * 53) % 160), 3, BRANCO)
    bloco(g, a, 14, 10, 306, 54, PRETO, { al: "left" })
    g.save(); g.translate(167, 38); g.rotate(-0.1); retan(g, -160, -4, 320, 8, VERMELHO); g.restore()
    bloco(g, b, 12, 66, 364, 122, VERMELHO, { c: PRETO, lc: 3, s: PRETO, dx: 6, dy: 5, inclina: 0.18 })
    retan(g, 384, 0, 128, 192, AMARELO)
    bloco(g, "JÁ!", 396, 10, 104, 40, PRETO); bloco(g, "JÁ!", 396, 54, 104, 50, VERMELHO); bloco(g, "JÁ!", 396, 108, 104, 74, PRETO)
    retan(g, 0, 192, W, 64, AZUL)
    bloco(g, p.slogan, 14, 198, 320, 34, AMARELO, { al: "left" })
    miudo(g, "*entrega antes do pedido. reclamação antes da entrega.", 14, 236, 320, 14, BRANCO)
    marca(g, 350, 198, 150, 16, AMARELO)
    for (let k = 0; k < 5; k++) divisa(g, 360 + k * 30, 236, 13, BRANCO)
  },
  // SONO LITE: comercial de farmácia com gráfico "comprovado", lua e cápsula
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    retan(g, 0, 0, W, H, p.cor)
    for (const [x, y, r] of [[226, 18, 7], [404, 22, 6], [498, 120, 7], [400, 176, 5], [342, 12, 5]]) estouro(g, x, y, r * 2, r * 0.7, 5, AMARELO)
    disco(g, 456, 58, 44, AMARELO); disco(g, 474, 48, 40, p.cor)
    g.save(); g.translate(456, 150); g.rotate(-0.5)
    arred(g, -48, -17, 96, 34, 17, VERMELHO)
    g.beginPath(); g.rect(0, -20, 60, 40); g.clip(); arred(g, -48, -17, 96, 34, 17, BRANCO)
    g.restore()
    retan(g, 0, 0, 200, H, AMARELO)
    bloco(g, "RESULTADOS*", 14, 10, 172, 26, PRETO)
    retan(g, 30, 158, 60, 40, p.cor); retan(g, 110, 78, 60, 120, VERMELHO); retan(g, 20, 198, 160, 3, PRETO)
    bloco(g, "4H", 30, 134, 60, 22, PRETO); bloco(g, "12H", 110, 54, 60, 22, PRETO)
    bloco(g, "DORME", 26, 204, 68, 18, PRETO); bloco(g, "RENDE", 106, 204, 68, 18, VERMELHO)
    marca(g, 12, 232, 176, 18, PRETO)
    bloco(g, a, 216, 12, 190, 100, BRANCO, { s: PRETO, dx: 5, dy: 5 })
    bloco(g, b, 216, 116, 190, 70, AMARELO, { c: PRETO, lc: 3 })
    bloco(g, p.slogan, 216, 192, 284, 34, BRANCO)
    miudo(g, "*não substitui dormir. nada substitui. por isso a assinatura.", 216, 232, 284, 15, BRANCO)
  },
  // LIKE EXPRESS: balão de fala gigante sobre papel de parede de coração
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    retan(g, 0, 0, W, H, p.cor)
    g.beginPath()
    for (let l = 0; l < 7; l++) for (let c = 0; c < 14; c++) coracao(g, c * 40 + (l % 2 ? 20 : 0), l * 40 + 12, 10)
    g.fillStyle = "#e63fa8"; g.fill()
    g.fillStyle = AMARELO; g.beginPath(); g.moveTo(70, 170); g.lineTo(58, 226); g.lineTo(146, 170); g.closePath(); g.fill()
    arred(g, 30, 22, 370, 154, 18, AMARELO)
    bloco(g, a, 46, 30, 338, 72, VERMELHO, { s: PRETO, dx: 3, dy: 3 })
    bloco(g, b, 46, 104, 338, 64, AZUL, { inclina: 0.15 })
    estouro(g, 450, 72, 62, 46, 18, VERMELHO, BRANCO)
    bloco(g, "+9.999", 412, 52, 76, 30, BRANCO); bloco(g, "LIKES", 426, 86, 48, 16, AMARELO)
    disco(g, 456, 150, 30, AZUL)
    bloco(g, "3 SEG!", 434, 140, 44, 20, AMARELO)
    arred(g, 150, 182, 354, 42, 21, AMARELO)
    bloco(g, p.slogan, 162, 190, 330, 26, PRETO)
    miudo(g, "*autoestima processada em até 3 segundos úteis.", 150, 228, 250, 16, "#4a002e")
    marca(g, 406, 228, 96, 16, PRETO)
  },
  // SORRISO PADRÃO: a boca gigante tomando a placa, com carimbo de aprovado
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    retan(g, 0, 0, W, H, AZUL)
    bloco(g, a, 14, 10, 336, 64, p.cor, { al: "left" })
    bloco(g, b, 14, 76, 336, 52, AMARELO, { al: "left" })
    g.save(); g.translate(430, 50); g.rotate(-0.18)
    retan(g, -68, -28, 136, 56, VERMELHO); retan(g, -62, -22, 124, 44, AMARELO)
    bloco(g, "APROVADO", -56, -16, 112, 32, VERMELHO)
    g.restore()
    g.lineWidth = 2; g.strokeStyle = PRETO
    for (let k = 0; k < 6; k++) {
      const x = 372 + k * 24
      disco(g, x, 110, 10, AMARELO); disco(g, x - 3, 107, 1.5, PRETO); disco(g, x + 3, 107, 1.5, PRETO)
      g.beginPath(); g.arc(x, 110, 6, 0.3, Math.PI - 0.3); g.stroke()
    }
    g.beginPath(); g.ellipse(256, 136, 240, 110, 0, 0, Math.PI); g.closePath(); g.fillStyle = VERMELHO; g.fill()
    g.save()
    g.beginPath(); g.ellipse(256, 136, 216, 90, 0, 0, Math.PI); g.closePath(); g.fillStyle = "#d8dde6"; g.fill(); g.clip()
    retan(g, 40, 176, 432, 3, "#333")
    for (let x = 56; x < 470; x += 40) retan(g, x, 176, 3, 60, "#333")
    g.restore()
    bloco(g, p.slogan, 80, 146, 352, 26, PRETO)
    pilha(g, quebra("*sorriso obrigatório. fiscalização por amostragem.", 2), 6, 222, 98, 30, BRANCO, { peso: "700", al: "left" })
    marca(g, 408, 230, 98, 20, p.cor)
  },
  // NOTIFICA: a pilha de avisos que não acaba e a bolinha vermelha
  (g, p) => {
    retan(g, 0, 0, W, H, "#00c853")
    const avisos = ["VOCÊ TEM 1.284 AVISOS", "ALGUÉM TE OLHOU", "VOCÊ FICOU PRA TRÁS", "URGENTE: NADA", "OI??", "CADÊ VOCÊ???"]
    avisos.forEach((t, k) => {
      g.save(); g.translate(394 + (k % 2 ? 6 : -6), 30 + k * 38); g.rotate(k % 2 ? 0.03 : -0.03)
      arred(g, -100, -17, 200, 34, 8, k % 2 ? AMARELO : p.cor)
      disco(g, -84, 0, 9, VERMELHO)
      bloco(g, t, -70, -11, 162, 22, PRETO, { al: "left" })
      g.restore()
    })
    bloco(g, "TEM NOVIDADE!!!", 14, 14, 172, 38, VERMELHO, { c: BRANCO, lc: 2 })
    disco(g, 232, 36, 34, VERMELHO)
    bloco(g, "1.284", 206, 24, 52, 24, BRANCO)
    bloco(g, p.nome, 14, 58, 266, 98, PRETO, { s: AMARELO, dx: 4, dy: 4 })
    pilha(g, quebra(p.slogan, 2), 14, 162, 266, 48, PRETO)
    miudo(g, "*desligar os avisos gera um aviso.", 14, 215, 266, 13, PRETO)
    marca(g, 14, 233, 136, 17, BRANCO)
  },
  // SILÊNCIO PREMIUM: gritando sobre silêncio, com a tabela de planos e a coroa
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    retan(g, 0, 0, W, H, p.cor)
    bloco(g, a, 12, 10, 488, 86, AZUL, { s: AMARELO, dx: 5, dy: 5 })
    arred(g, 12, 100, 248, 46, 8, AMARELO)
    bloco(g, b, 22, 105, 228, 36, AZUL)
    g.fillStyle = AMARELO; g.strokeStyle = VERMELHO; g.lineWidth = 3
    g.beginPath(); g.moveTo(272, 144); g.lineTo(268, 110); g.lineTo(285, 124); g.lineTo(299, 102); g.lineTo(313, 124); g.lineTo(330, 110); g.lineTo(326, 144); g.closePath(); g.fill(); g.stroke()
    bloco(g, "SHHH!!!", 340, 100, 160, 46, VERMELHO, { gira: -0.06, c: BRANCO, lc: 2 })
    const planos = [["GRÁTIS", "gritos"], ["PLUS", "sussurros"], ["PREMIUM", "nada. nada mesmo."]]
    planos.forEach(([t, d], k) => {
      const x = 12 + k * 166, top = k === 2
      if (top) retan(g, x - 3, 149, 162, 76, VERMELHO)
      retan(g, x, 152, 156, 70, top ? AMARELO : AZUL)
      bloco(g, t, x + 8, 158, 140, 26, top ? VERMELHO : BRANCO)
      bloco(g, d, x + 8, 190, 140, 22, top ? PRETO : AMARELO, { peso: "700" })
    })
    bloco(g, p.slogan, 12, 227, 340, 15, AZUL, { al: "left", maxX: 3 })
    miudo(g, "*o silêncio pode conter anúncios.", 12, 244, 340, 10, AZUL)
    marca(g, 380, 230, 120, 18, AZUL)
  },
  // VIDA AUTOPLAY: tocador com rolo de filme, o play gigante e a barra quase no fim
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    retan(g, 0, 0, W, H, p.cor)
    retan(g, 0, 0, W, 26, "#2a0f00"); retan(g, 0, 230, W, 26, "#2a0f00")
    for (let x = 6; x < 366; x += 24) arred(g, x, 6, 12, 14, 3, BRANCO)
    marca(g, 380, 5, 120, 16, AMARELO)
    for (let k = 0; k < 4; k++) bloco(g, `EP. ${8412 + k}`, k * 128 + 10, 236, 108, 14, k === 3 ? AMARELO : BRANCO)
    disco(g, 92, 128, 78, AMARELO); disco(g, 92, 128, 66, VERMELHO)
    g.fillStyle = BRANCO; g.beginPath(); g.moveTo(68, 88); g.lineTo(136, 128); g.lineTo(68, 168); g.closePath(); g.fill()
    bloco(g, a, 178, 32, 322, 66, BRANCO, { s: PRETO, dx: 5, dy: 5 })
    bloco(g, b, 178, 100, 322, 48, PRETO)
    bloco(g, p.slogan, 178, 152, 322, 34, BRANCO, { c: "#7a1200", lc: 2 })
    retan(g, 178, 192, 322, 12, BRANCO); retan(g, 178, 192, 312, 12, VERMELHO); disco(g, 490, 198, 10, AMARELO)
    bloco(g, "PRÓXIMO EM 3... 2... 1...", 178, 208, 222, 18, AMARELO, { al: "left", c: "#7a1200", lc: 1 })
    miudo(g, "*não dá pra pular", 410, 210, 90, 14, BRANCO)
  },
  // MEMÓRIA NUVEM: a nuvem enorme e a tabela de preço das suas lembranças
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    retan(g, 0, 0, W, H, "#1aa8ff")
    const nuvem = "#b8d4f0"
    for (const [x, y, r] of [[90, 70, 56], [180, 58, 70], [270, 74, 56], [330, 125, 42], [30, 125, 40]]) disco(g, x, y, r, nuvem)
    arred(g, 30, 64, 320, 110, 20, nuvem)
    bloco(g, a, 44, 44, 272, 60, AZUL)
    bloco(g, b, 64, 108, 232, 54, VERMELHO, { c: BRANCO, lc: 2 })
    arred(g, 376, 10, 128, 172, 10, AMARELO)
    const lista = [["INFÂNCIA", "5 GB GRÁTIS"], ["1º BEIJO", "R$ 9,90/MÊS"], ["SUA MÃE", "R$ 29,90/MÊS"], ["VOCÊ", "SOB CONSULTA"]]
    lista.forEach(([t, d], k) => {
      bloco(g, t, 386, 16 + k * 41, 108, 15, PRETO, { al: "left" })
      bloco(g, d, 386, 33 + k * 41, 108, 16, VERMELHO, { al: "left" })
    })
    estouro(g, 352, 28, 34, 25, 12, VERMELHO, BRANCO)
    bloco(g, "BACKUP!", 326, 20, 52, 16, AMARELO)
    bloco(g, p.slogan, 14, 186, 486, 28, BRANCO, { c: AZUL, lc: 2 })
    miudo(g, "*lembranças não pagas serão apagadas. as boas primeiro.", 14, 220, 346, 14, PRETO)
    marca(g, 14, 237, 146, 16, BRANCO)
    for (let k = 0; k < 3; k++) seta(g, 392 + k * 46, 236, 14, -Math.PI / 2, k === 1 ? AMARELO : VERMELHO)
  },
  // CÉU AZUL™: o anúncio é a própria tela: moldura de TV, céu, sol e estoque acabando
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    retan(g, 0, 0, W, H, VERMELHO)
    const ceu = g.createLinearGradient(0, 12, 0, 216)
    ceu.addColorStop(0, "#0a3cff"); ceu.addColorStop(1, p.cor)
    g.fillStyle = ceu; g.fillRect(12, 12, 488, 204)
    estouro(g, 424, 88, 62, 42, 14, AMARELO, VERMELHO, 0.2)
    bloco(g, "AGORA", 396, 72, 56, 15, VERMELHO); bloco(g, "COM SOL*", 390, 90, 68, 15, VERMELHO)
    retan(g, 12, 12, 488, 22, AMARELO)
    bloco(g, "ÚLTIMAS TELAS! 4K! HDR! SEM PÁSSAROS!", 20, 16, 472, 14, PRETO, { maxX: 3 })
    bloco(g, a, 30, 38, 270, 84, BRANCO, { s: AZUL, dx: 5, dy: 5, al: "left" })
    bloco(g, b, 30, 124, 310, 74, BRANCO, { s: AZUL, dx: 5, dy: 5, al: "left" })
    miudo(g, "*sol vendido separadamente. chuva só no plano família.", 30, 202, 310, 11, BRANCO)
    estouro(g, 428, 182, 42, 32, 12, BRANCO, VERMELHO, 0.15)
    bloco(g, "40 m²", 402, 170, 52, 24, VERMELHO)
    bloco(g, p.slogan, 18, 222, 350, 26, BRANCO)
    marca(g, 380, 226, 116, 18, AMARELO)
  },
  // OPINIÃO PRONTA: a cédula já preenchida, com CONCORDO em todas as linhas
  (g, p) => {
    const [a, b] = p.nome.split(" ")
    retan(g, 0, 0, W, H, "#a8dc00")
    bloco(g, a, 14, 12, 320, 76, PRETO, { al: "left" })
    arred(g, 14, 92, 320, 68, 8, VERMELHO)
    bloco(g, b, 24, 97, 300, 58, AMARELO)
    g.save(); g.translate(425, 88); g.rotate(0.05)
    retan(g, -70, -78, 140, 156, "#d8dde6")
    for (let k = 0; k < 5; k++) {
      const y = -66 + k * 28, ok = k < 4
      retan(g, -60, y, 20, 20, ok ? PRETO : "#9aa1ad"); retan(g, -57, y + 3, 14, 14, "#d8dde6")
      if (ok) { g.strokeStyle = VERMELHO; g.lineWidth = 4; g.beginPath(); g.moveTo(-58, y + 10); g.lineTo(-51, y + 17); g.lineTo(-39, y - 2); g.stroke() }
      bloco(g, ok ? "CONCORDO" : "DISCORDO", -32, y + 2, 94, 16, ok ? PRETO : "#9aa1ad", { al: "left" })
    }
    g.restore()
    pilha(g, quebra(p.slogan, 2), 14, 166, 320, 56, PRETO)
    miudo(g, "*opinião sujeita a mudança sem aviso, conforme o patrocinador.", 14, 226, 320, 13, PRETO)
    marca(g, 14, 241, 136, 13, PRETO)
    estouro(g, 430, 212, 42, 32, 14, VERMELHO, PRETO)
    bloco(g, "NÃO", 408, 196, 44, 15, BRANCO); bloco(g, "PENSE!", 402, 213, 56, 16, AMARELO)
  },
  // CARRINHO CHEIO: encarte de supermercado, com o afeto em promoção
  (g, p) => {
    retan(g, 0, 0, W, H, p.cor)
    for (let l = 0; l < 7; l++) for (let c = 0; c < 26; c++) if ((l + c) % 2) retan(g, c * 20, 76 + l * 18, 20, 18, "#ff6fa8")
    retan(g, 0, 0, W, 76, VERMELHO)
    bloco(g, p.nome, 10, 8, 492, 60, BRANCO, { s: PRETO, dx: 4, dy: 4, maxX: 3 })
    const ofertas = [["AFETO", "R$ 9,99"], ["CULPA", "LEVE 3"], ["VAZIO", "-50%"], ["PAZ", "ESGOTOU"]]
    ofertas.forEach(([t, d], k) => {
      const x = 66 + k * 124
      estouro(g, x, 140, 58, 46, 16, k % 2 ? AZUL : AMARELO, VERMELHO, k * 0.2)
      bloco(g, t, x - 34, 118, 68, 16, k % 2 ? AMARELO : PRETO)
      bloco(g, d, x - 40, 138, 80, 30, k % 2 ? BRANCO : VERMELHO)
    })
    g.strokeStyle = PRETO; g.lineWidth = 5; g.lineJoin = "round"; g.lineCap = "round"
    g.beginPath(); g.moveTo(14, 208); g.lineTo(26, 208); g.lineTo(36, 238); g.lineTo(78, 238); g.lineTo(86, 216); g.lineTo(30, 216); g.stroke()
    disco(g, 44, 249, 5, PRETO); disco(g, 72, 249, 5, PRETO)
    bloco(g, p.slogan, 96, 204, 406, 32, PRETO)
    miudo(g, "*parcelamos em 48x o que você sentir.", 96, 239, 266, 13, PRETO)
    marca(g, 372, 238, 130, 15, VERMELHO)
  },
]
