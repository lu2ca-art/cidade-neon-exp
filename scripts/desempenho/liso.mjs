// lisura: a velocidade da câmera quadro a quadro (em dev, window.__cam)
// com engasgos aleatórios de 0–15 ms injetados (o navegador real)
import { chromium } from "playwright"

const porta = process.argv[2], mapa = process.argv[3] ?? "disco"
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
await page.goto(`${process.env.BASE ?? `http://localhost:${porta}`}/linha?mapa=${mapa}&medir`)
await page.locator(".l-btn-entrar").click({ timeout: 30_000, force: true }).catch(() => {})
await page.waitForFunction(() => window.__cam && window.__cena, null, { timeout: 180_000 })
await page.waitForTimeout(10_000)
await page.keyboard.down("ArrowUp")
await page.waitForTimeout(6000)
const r = await page.evaluate(async () => {
  const cam = window.__cam
  const am = []
  let ant = null, tAnt = 0
  // engasgo: trabalho falso de 0–15 ms em ~1 de cada 3 quadros
  let ativo = true
  const engasga = () => { if (!ativo) return; if (Math.random() < 0.33) { const t = performance.now() + Math.random() * 15; while (performance.now() < t) {} } requestAnimationFrame(engasga) }
  requestAnimationFrame(engasga)
  await new Promise((ok) => {
    const t0 = performance.now()
    const q = (t) => {
      // lê depois que o quadro do jogo rodou (o R3F roda antes neste mesmo rAF): usa a posição no próximo
      const p = cam.position.clone()
      if (ant) am.push({ d: p.distanceTo(ant), dt: (t - tAnt) / 1000 })
      ant = p; tAnt = t
      if (t - t0 < 10000) requestAnimationFrame(q); else ok()
    }
    requestAnimationFrame(q)
  })
  ativo = false
  // velocidade por quadro; o "tranco" = quanto ela muda de um quadro pro outro
  const v = am.filter((x) => x.dt > 0).map((x) => x.d / x.dt)
  const med = v.reduce((a, b) => a + b, 0) / v.length
  const dif = v.slice(1).map((x, i) => Math.abs(x - v[i]))
  dif.sort((a, b) => a - b)
  const p = (l, f) => l[Math.floor(l.length * f)]
  return { quadros: v.length, velMedia: +med.toFixed(1), tranco_med: +(p(dif, 0.5) / med * 100).toFixed(1), tranco_p95: +(p(dif, 0.95) / med * 100).toFixed(1), tranco_max: +(dif[dif.length - 1] / med * 100).toFixed(1) }
})
console.log(JSON.stringify(r))
await browser.close()
