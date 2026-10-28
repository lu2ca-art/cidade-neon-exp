// desempenho do grafite (T12): headless, GPU de verdade (Metal), DPR 2, celular e desktop.
// quadros = intervalo entre quadros (rAF); trabalhoJs = o que o código do grafite gasta em cada quadro.
// (o headless pode travar o rAF em 30 Hz: nesse caso olhe o trabalhoJs e os quadros acima do intervalo)
// uso: node scripts/desempenho/grafite.mjs 3112   (contra `next start`)
import { chromium } from "playwright"
const porta = process.argv[2] ?? "3112"
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--disable-frame-rate-limit", "--disable-gpu-vsync", "--autoplay-policy=no-user-gesture-required"] })
const resultado = {}
for (const [nome, vp] of [["celular 390x844 dpr2", { width: 390, height: 844 }], ["desktop 1280x800 dpr2", { width: 1280, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto(`http://localhost:${porta}/teste/grafite`)
  for (let g = 0; g < 3; g++) {
    await page.locator(".gf-item").nth(g).click()
    await page.waitForFunction(() => window.__grafite?.estado === "esperando")
    const pts = await page.evaluate(() => window.__grafite.pontos)
    const box = await page.locator(".gf-fx").boundingBox()
    await page.mouse.move(box.x + pts[0][0], box.y + pts[0][1]); await page.mouse.down()
    for (let i = 1; i < pts.length; i++) await page.mouse.move(box.x + pts[i][0], box.y + pts[i][1], { steps: 10 })
    await page.mouse.up()
    await page.waitForFunction(() => window.__grafite?.estado === "pronto", null, { timeout: 30000 })
    const q = (await page.evaluate(() => window.__grafite.quadros)).slice(3)
    const o = [...q].sort((a, b) => a - b)
    const tr = (await page.evaluate(() => window.__grafite.trabalho)).slice(3).sort((a, b) => a - b)
    const f = (x) => +x.toFixed(2)
    resultado[`${nome} / grafite ${g + 1}`] = { quadros: q.length, mediaMs: f(q.reduce((a, b) => a + b, 0) / q.length), p50Ms: f(o[Math.floor(o.length * 0.5)]), p95Ms: f(o[Math.floor(o.length * 0.95)]), piorMs: f(o[o.length - 1]), acima20ms: q.filter((x) => x > 20).length, trabalhoJsMediaMs: f(tr.reduce((a, b) => a + b, 0) / tr.length), trabalhoJsP95Ms: f(tr[Math.floor(tr.length * 0.95)]), trabalhoJsPiorMs: f(tr[tr.length - 1]) }
  }
  await ctx.close()
}
await browser.close()
console.log(JSON.stringify(resultado, null, 1))
