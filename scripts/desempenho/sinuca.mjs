// mede a sinuca (T17) em /teste/sinuca: tempo de quadro (média, p50, p95, pior) e o
// trabalho do jogo por quadro (física + desenho), no celular simulado e no desktop.
// Uso (com o build rodando): node scripts/desempenho/sinuca.mjs [porta] [pasta-dos-prints]
// O jogo inteiro roda: a quebra, você (tacadas no automático) e o Mubarak pensando e jogando.
import { chromium } from "playwright"

const porta = process.argv[2] ?? "3117"
const out = process.argv[3] ?? "."
const DUR = +(process.env.DUR ?? 30_000)
const PERFIS = [
  { nome: "celular", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, cpu: 4 },
  { nome: "desktop", viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false, cpu: 1 },
]
const est = (l) => {
  const q = l.slice().sort((a, b) => a - b), n = q.length
  const med = q.reduce((a, b) => a + b, 0) / Math.max(1, n)
  return { n, media: +med.toFixed(2), p50: +q[Math.floor(n * 0.5)].toFixed(2), p95: +q[Math.floor(n * 0.95)].toFixed(2), p99: +q[Math.floor(n * 0.99)].toFixed(2), pior: +q[n - 1].toFixed(2) }
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined, channel: process.env.CHROME_PATH ? undefined : "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] })
for (const p of PERFIS) {
  const ctx = await browser.newContext({ viewport: p.viewport, deviceScaleFactor: p.deviceScaleFactor, isMobile: p.isMobile, hasTouch: p.hasTouch })
  const page = await ctx.newPage()
  const erros = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  if (p.cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.cpu }) }
  await page.goto(`http://localhost:${porta}/teste/sinuca?modo=mubarak`)
  await page.waitForFunction(() => !!window.__sinuca)
  await page.waitForTimeout(1500)
  // o primeiro toque (acorda o som, como um jogador de verdade antes da quebra)
  const vp = p.viewport
  if (p.hasTouch) await page.touchscreen.tap(vp.width * 0.8, vp.height * 0.5); else await page.mouse.click(vp.width * 0.8, vp.height * 0.5)
  // parado (mirando, nada mexendo): quanto custa a mesa quieta
  await page.evaluate(() => window.__sinuca.zerar())
  await page.waitForTimeout(3000)
  const parado = await page.evaluate(() => window.__sinuca.medidas())
  // jogando
  await page.evaluate(() => { window.__sinuca.zerar(); window.__sinuca.tacar(0, 1) })
  const t0 = Date.now()
  let tacadasVoce = 1, vezesIA = 0, ultimaFase = ""
  while (Date.now() - t0 < DUR) {
    const e = await page.evaluate(() => window.__sinuca.estado())
    if (e.fim) { await page.evaluate(() => window.__sinuca.jogo.novo()); continue }
    if (e.fase === "ia" && ultimaFase !== "ia") vezesIA++
    ultimaFase = e.fase
    if (e.fase === "mirar" && e.vez === 0) { await page.evaluate(() => window.__sinuca.tacar(window.__sinuca.jogo.ang + (Math.random() - 0.5) * 0.05, 0.35 + Math.random() * 0.4)); tacadasVoce++ }
    await page.waitForTimeout(250)
  }
  const m = await page.evaluate(() => window.__sinuca.medidas())
  await page.screenshot({ path: `${out}/sinuca-perf-${p.nome}.png` })
  const longos = m.quadros.filter((x) => x > 25).length
  console.log(JSON.stringify({
    perfil: p.nome, cpuLenta: p.cpu, viewport: p.viewport, dpr: p.deviceScaleFactor,
    jogando: { quadro: est(m.quadros.slice(1)), trabalho: est(m.trabalho), quadrosAcimaDe25ms: longos, tacadasVoce, vezesIA },
    parado: { quadro: est(parado.quadros.slice(1)), trabalho: est(parado.trabalho) },
    erros,
  }, null, 1))
  await ctx.close()
}
await browser.close()
