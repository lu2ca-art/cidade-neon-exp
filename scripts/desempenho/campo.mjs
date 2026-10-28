// (T43) mede o tempo de quadro com a Kombi grudada no campo de força dos prédios:
// a cada 2,5 s ela é posta a 14 m de um prédio isolado (no chão, fora da pista),
// apontando pra parede, e desliza por ela. Compara com a cerca desligada:
//   NOPROF=1 DPR=2 DUR=20000 node scripts/desempenho/campo.mjs            (com a cerca)
//   Q=&semcampo NOPROF=1 DPR=2 DUR=20000 node scripts/desempenho/campo.mjs (sem o desenho)
import { chromium } from "playwright"
import { semear, entrarDirigindo } from "./save.mjs"

const URL = `${process.env.BASE ?? "http://localhost:3110"}/linha?mapa=disco&medir${process.env.Q ?? ""}`
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: +(process.env.W ?? 1280), height: +(process.env.H ?? 800) }, deviceScaleFactor: +(process.env.DPR ?? 1) })
await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
await semear(page)
page.on("pageerror", (e) => console.log("ERRO", e.message))
await page.goto(URL)
await page.locator(".l-btn-entrar").click({ timeout: 20_000, force: true }).catch(() => {})
await entrarDirigindo(page, 12_000)
await page.waitForFunction(() => !!window.__colisores && !!window.__jogo, null, { timeout: 30_000 })
// os prédios isolados, com a Kombi cabendo no chão do lado
const alvos = await page.evaluate(() => {
  const c = window.__colisores, M = window.__M, P = 9, out = []
  for (let k = 0; k < c.length && out.length < 12; k += P) {
    const [bx, bz, tx, tz, hw, hd, , y0, topo] = c.slice(k, k + P)
    if (hw < 5 || hd < 7 || topo - y0 < 12) continue
    const nx = tz, nz = -tx, px = bx + nx * (hw + 14), pz = bz + nz * (hw + 14), ch = M.chaoEm(px, pz)
    if (ch < y0 || ch > topo - 6 || M.pousar(px, pz, ch + 1, 0, 0)) continue
    out.push([px, pz, ch, Math.atan2(-nx, -nz) + 0.3])
  }
  return out
})
console.log("prédios", alvos.length)
await page.evaluate((alvos) => {
  const s = { q: [], ult: performance.now(), i: 0, t: performance.now() }
  window.__campo = s
  const loop = (t) => {
    s.q.push(t - s.ult); s.ult = t
    if (t - s.t > 2500) { s.t = t; const [x, z, y, r] = alvos[s.i++ % alvos.length]; Object.assign(window.__jogo, { voo: true, ar: false, wx: x, wz: z, y, vy: 0, rumo: r, v: 24 }) }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}, alvos)
await page.waitForTimeout(1500)
await page.evaluate(() => { window.__campo.q = [] })
await page.waitForTimeout(+(process.env.DUR ?? 20_000))
const r = await page.evaluate(() => {
  const q = window.__campo.q.slice(1).sort((a, b) => a - b), med = q.reduce((a, b) => a + b, 0) / q.length
  return { quadros: q.length, msMedio: +med.toFixed(1), p50: +q[Math.floor(q.length / 2)].toFixed(1), p95: +q[Math.floor(q.length * 0.95)].toFixed(1), draws: window.__gl.info.render.calls }
})
await page.keyboard.up("ArrowUp")
await page.screenshot({ path: process.env.FOTO ?? "campo.png" }).catch(() => {})
console.log(JSON.stringify(r))
await browser.close()
