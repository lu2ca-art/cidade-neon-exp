// (T19) mede o show (o Guitar Driver dentro do jogo): o prelúdio e cada instrumento.
// O show é 2D (canvas), por cima da Kombi pausada (frameloop "never"): o que pesa é
// o desenho de cada quadro. Mede o tempo de trabalho de cada quadro (a soma dos
// callbacks de requestAnimationFrame) e o intervalo entre quadros.
//   bun run build && PORT=3119 bun run start   (pela fila de build)
//   DPR=2 node scripts/desempenho/show.mjs [voz,guitarra,baixo]
import { chromium } from "playwright"

const BASE = process.env.BASE ?? "http://localhost:3119"
const DPR = +(process.env.DPR ?? 2)
const W = +(process.env.W ?? 1280), H = +(process.env.H ?? 800)
const MODOS = (process.argv[2] ?? "voz,guitarra,baixo").split(",")
const SEG = +(process.env.SEG ?? 8)

const relogio = () => {
  const s = { trab: [], intervalos: [], ult: 0, ligado: false }
  window.__show = s
  const raf = window.requestAnimationFrame.bind(window)
  let quadro = 0, acumulado = 0
  window.requestAnimationFrame = (cb) => raf((t) => {
    if (t !== quadro) {
      if (s.ligado && quadro) { s.trab.push(acumulado); s.intervalos.push(t - quadro) }
      quadro = t; acumulado = 0
    }
    const t0 = performance.now()
    try { cb(t) } finally { acumulado += performance.now() - t0 }
  })
}
const resumo = (a) => {
  const o = [...a].sort((x, y) => x - y)
  const q = (p) => o[Math.min(o.length - 1, Math.floor(o.length * p))] ?? 0
  return { n: a.length, media: +(a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(2), p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +(o[o.length - 1] ?? 0).toFixed(2) }
}

const browser = await chromium.launch({ headless: true, channel: "chrome", executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] })
const resultado = {}
for (const modo of ["preludio", ...MODOS]) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR })
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.addInitScript(relogio)
  const erros = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.goto(`${BASE}/linha?mapa=disco&parte=missao.lu2ca.show${process.env.Q ?? ""}`)
  await page.locator(".l-btn-entrar").click({ timeout: 30_000 }).catch(() => {})
  await page.locator(".l-show.is-preludio").waitFor({ timeout: 60_000 })
  if (modo === "preludio") {
    await page.evaluate(() => { window.__show.ligado = true })
    await page.locator(".l-show.is-preludio").waitFor({ state: "detached", timeout: 20_000 })
  } else {
    await page.evaluate(() => window.__cnPreludio?.())
    const nome = { voz: "cantar", guitarra: "guitarra", baixo: "baixo" }[modo]
    await page.locator(".l-show-banda button", { hasText: nome }).first().click({ timeout: 20_000 })
    // espera o show começar (o carregando sumir) e a contagem passar
    await page.locator(".l-show-carrega").waitFor({ state: "detached", timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(modo === "guitarra" ? 3500 : 500)
    if (modo === "baixo") await page.keyboard.down("ArrowUp")
    if (modo === "voz") await page.keyboard.down("ArrowUp")
    await page.evaluate(() => { window.__show.ligado = true })
    await page.waitForTimeout(SEG * 1000)
    await page.keyboard.up("ArrowUp")
  }
  const s = await page.evaluate(() => ({ trab: window.__show.trab, intervalos: window.__show.intervalos, canvas: [...document.querySelectorAll(".l-show canvas")].map((c) => `${c.width}x${c.height}`) }))
  resultado[modo] = { trabalho: resumo(s.trab), intervalo: resumo(s.intervalos), canvas: s.canvas.join(","), erros: erros.length }
  await page.close()
}
await browser.close()
console.log(JSON.stringify({ DPR, viewport: `${W}x${H}`, ...resultado }, null, 1))
