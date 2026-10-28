// experimentos A/B com o drone no alto, na MESMA página (a carga da máquina varia
// muito entre rodadas): inventário do que está visível e janelas de 5 s com
// alternâncias (EXP=base,semLinhas,volta,basico,volta,fisico,desfis,semMesh...).
// Sem o contador de draws do medir.mjs (que embrulha cada draw e infla o quadro).
// BASE=http://localhost:3130 EXP=base,semMesh node scripts/desempenho/exp-drone.mjs (PRINT=prefixo: um png por janela)
import { chromium } from "playwright"
import { semear, entrarDirigindo } from "./save.mjs"
const URL = `${process.env.BASE ?? "http://localhost:3110"}/linha?mapa=disco&medir${process.env.Q ?? ""}`
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required", "--disable-frame-rate-limit=false"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
await semear(page)
await page.addInitScript(() => { let u = performance.now(); window.__q = []; const f = (t) => { window.__q.push(t - u); u = t; requestAnimationFrame(f) }; requestAnimationFrame(f) })
page.on("pageerror", (e) => console.log("ERRO", e.message))
await page.goto(URL)
await page.locator(".l-btn-entrar").click({ timeout: 20_000, force: true }).catch(() => {})
await entrarDirigindo(page, 12_000)
await page.locator(".l-mapa-mini").click({ force: true }); await page.waitForTimeout(3000)
const inv = await page.evaluate(() => {
  const cena = window.__cena, m = {}
  const vis = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true }
  cena.traverse((o) => {
    if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite) || !vis(o)) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    const g = o.geometry, n = g ? (g.index ? g.index.count : g.attributes.position?.count ?? 0) : 0
    let nome = o.name || o.parent?.name || ""; 
    const k = `${o.type}|${mats.map((x) => x.type + (x.transparent ? "T" : "") + (x.blending === 2 ? "+" : "")).join(",")}|${nome}`
    const e = (m[k] ??= { n: 0, idx: 0 }); e.n++; e.idx += n * (o.isInstancedMesh ? o.count : 1)
  })
  return Object.entries(m).sort((a, b) => b[1].n - a[1].n).slice(0, 45).map(([k, v]) => `${String(v.n).padStart(4)} ${String(Math.round(v.idx / 3)).padStart(8)}t  ${k}`).join("\n")
})
console.log(inv)
console.log("dpr", await page.evaluate(() => window.__gl.getPixelRatio()))
const janela = async (nome, fn) => {
  if (fn) await page.evaluate(fn)
  await page.waitForTimeout(1500)
  await page.evaluate(() => { window.__q = [] })
  await page.waitForTimeout(5000)
  const r = await page.evaluate(() => { const q = window.__q.slice(1).sort((a, b) => a - b); return [q.reduce((a, b) => a + b, 0) / q.length, q[Math.floor(q.length * 0.5)], q[Math.floor(q.length * 0.95)], window.__gl.info.render.calls] })
  console.log(nome.padEnd(14), r.map((x) => x.toFixed(1)).join("  "))
}
const exps = (process.env.EXP ?? "base").split(",")
const F = {
  base: null,
  semLinhas: () => { window.__esc = []; window.__cena.traverse((o) => { if (o.isLine && o.visible) { o.visible = false; window.__esc.push(o) } }) },
  volta: () => { for (const o of window.__esc ?? []) o.visible = true; window.__esc = []; window.__cena.overrideMaterial = null },
  basico: () => { let B; window.__cena.traverse((o) => { if (!B && o.material?.type === "MeshBasicMaterial") B = o.material.constructor }); window.__cena.overrideMaterial = new B({ color: 0x050508 }) },
  semTransp: () => { window.__esc = []; window.__cena.traverse((o) => { const m = o.material; if (o.visible && m && !Array.isArray(m) && m.transparent && !o.isSprite) { o.visible = false; window.__esc.push(o) } }) },
  semInst: () => { window.__esc = []; window.__cena.traverse((o) => { if (o.isInstancedMesh && o.visible) { o.visible = false; window.__esc.push(o) } }) },
  fisico: () => { let Std; window.__cena.traverse((o) => { if (!Std && o.material?.type === "MeshStandardMaterial") Std = o.material.constructor }); window.__fis = []; window.__cena.traverse((o) => { if (o.material?.type === "MeshPhysicalMaterial") { const n = new Std(); n.copy(o.material); window.__fis.push([o, o.material]); o.material = n } }) },
  desfis: () => { for (const [o, m] of window.__fis ?? []) o.material = m; window.__fis = [] },
  semMesh: () => { window.__esc = []; window.__cena.traverse((o) => { if ((o.isMesh || o.isLine || o.isPoints) && o.visible) { o.visible = false; window.__esc.push(o) } }) },
}
for (const e of exps) { await janela(e, F[e]); if (process.env.PRINT) await page.screenshot({ path: `${process.env.PRINT}-${e}.png` }) }
await browser.close()
