// mede o metrô (T26) em /teste/metro: tempo de quadro (média, p50, p95, pior), o
// trabalho do jogo por quadro (passos da física + desenho) e as draw calls, no
// celular simulado e no computador (DPR 2). O piloto joga sozinho (com um erro de
// vez em quando: às vezes foge, às vezes é pego) e recomeça até dar o tempo.
// Uso (com o build rodando): node scripts/desempenho/metro.mjs [porta] [pasta-dos-prints]
import { chromium } from "playwright"

const porta = process.argv[2] ?? "3126"
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
  await page.goto(`http://localhost:${porta}/teste/metro?auto=0.04&semente=11`)
  await page.waitForFunction(() => !!window.__metro)
  await page.waitForTimeout(1200)
  await page.evaluate(() => window.__metro.zerar())
  const quadros = [], trabalho = [], draws = []
  let tris = 0, dpr = 0, fugas = 0, pegos = 0, print = false
  const t0 = Date.now()
  const juntar = async () => { const m = await page.evaluate(() => window.__metro.medidas()); quadros.push(...m.quadros.slice(1)); trabalho.push(...m.trabalho); draws.push(...m.draws); tris = Math.max(tris, m.tris); dpr = m.dpr }
  while (Date.now() - t0 < DUR) {
    const e = await page.evaluate(() => window.__metro.estado())
    if (!print && e.progresso > 0.45) { await page.screenshot({ path: `${out}/metro-perf-${p.nome}.png` }); print = true }
    if (e.fase === "pulou" || e.fase === "pego") {
      await page.waitForTimeout(1300)
      await juntar()
      if (e.fase === "pulou") fugas++; else pegos++
      await page.getByRole("button", { name: "de novo" }).click()
      await page.waitForTimeout(600)
      await page.evaluate(() => window.__metro.zerar())
      continue
    }
    await page.waitForTimeout(250)
  }
  await juntar()
  const longos = quadros.filter((x) => x > 25).length
  console.log(JSON.stringify({
    perfil: p.nome, cpuLenta: p.cpu, viewport: p.viewport, dprAparelho: p.deviceScaleFactor, dprDesenho: dpr,
    quadro: est(quadros), trabalho: est(trabalho), quadrosAcimaDe25ms: longos,
    draws: est(draws), triangulos: tris, fugas, pegos, erros,
  }, null, 1))
  await ctx.close()
}
await browser.close()
