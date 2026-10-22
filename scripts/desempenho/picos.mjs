// o que roda DENTRO dos picos de script (perfil de CPU cruzado com os quadros longos)
import { chromium } from "playwright"
import { semear, entrarDirigindo } from "./save.mjs"

const mapa = process.argv[2] ?? "disco"
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] })
browser.on("disconnected", () => console.log("### BROWSER DESCONECTOU"))
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: +(process.env.DPR ?? 2) })
page.on("crash", () => console.log("### PÁGINA CRASH"))
await page.addInitScript(() => {
  localStorage.setItem("cidade-neon-analytics-consent", "essential")
  window.__loaf = []
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__loaf.push(e.toJSON()) }).observe({ type: "long-animation-frame", buffered: true })
})
await semear(page)
await page.goto(`${process.env.BASE ?? "http://localhost:3110"}/linha?mapa=${mapa}&medir${process.env.Q ?? ""}`)
await page.locator(".l-btn-entrar").click({ timeout: 20_000, force: true }).catch(() => {})
await entrarDirigindo(page, 14_000)
await page.waitForTimeout(3000)
const cdp = await page.context().newCDPSession(page)
await cdp.send("Profiler.enable")
await cdp.send("Profiler.setSamplingInterval", { interval: 250 })
const antes = await page.evaluate(() => performance.now())
await cdp.send("Profiler.start")
const depois = await page.evaluate(() => performance.now())
await page.waitForTimeout(+(process.env.DUR ?? 30_000))
const { profile } = await cdp.send("Profiler.stop")
const loaf = await page.evaluate((t0) => window.__loaf.filter((e) => e.startTime > t0).map((e) => ({ s: e.startTime, d: e.duration, scr: e.scripts.reduce((a, s) => a + s.duration, 0) })), antes)
await browser.close()

// relógio do perfil (µs) -> performance.now (ms)
const off = (antes + depois) / 2 - profile.startTime / 1000
const nos = new Map(profile.nodes.map((n) => [n.id, n]))
const pai = new Map()
for (const n of profile.nodes) for (const c of n.children ?? []) pai.set(c, n.id)
const nome = (id) => { const cf = nos.get(id).callFrame; return `${cf.functionName || "(anon)"} ${cf.url.split("/").pop()}:${cf.lineNumber}:${cf.columnNumber}` }
const picos = loaf.filter((e) => e.scr > 40)
console.log("picos de script:", picos.map((p) => `${Math.round(p.s)}(${Math.round(p.scr)}ms)`).join(" "))
let t = profile.startTime
const inc = new Map(), self = new Map()
let total = 0
profile.samples.forEach((id, i) => {
  t += profile.timeDeltas[i]
  const ms = t / 1000 + off
  if (!picos.some((p) => ms >= p.s && ms <= p.s + p.d)) return
  const dt = (profile.timeDeltas[i + 1] ?? 250) / 1000
  total += dt
  self.set(nome(id), (self.get(nome(id)) ?? 0) + dt)
  const vistos = new Set()
  for (let x = id; x !== undefined; x = pai.get(x)) { const k = nome(x); if (vistos.has(k)) continue; vistos.add(k); inc.set(k, (inc.get(k) ?? 0) + dt) }
})
console.log(`tempo amostrado dentro dos picos: ${Math.round(total)} ms`)
console.log("--- inclusivo")
for (const [k, v] of [...inc].sort((a, b) => b[1] - a[1]).slice(0, 35)) console.log(`${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`)
console.log("--- próprio")
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`${(v / total * 100).toFixed(1).padStart(5)}%  ${k}`)
