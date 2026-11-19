// mede o /teste/trincheiras (T11): o patinador no piloto automático dá a volta
// no triângulo; tempo de quadro (média, p50, p95, o pior), draw calls,
// triângulos e programas compilados no meio. Mesmo jeito do medir.mjs:
// build de produção, Chrome headless com GPU de verdade (Metal), DPR 2.
//   NOPROF=1 DPR=2 DUR=30000 node scripts/desempenho/trincheiras.mjs [saida]
import { chromium } from "playwright"
import fs from "node:fs"

const out = process.argv[2] ?? "."
const URL = `${process.env.BASE ?? "http://localhost:3110"}/teste/trincheiras?medir&auto${process.env.Q ?? ""}`

const contador = () => {
  const s = { draws: 0, tris: 0, quadros: [], dc: [], tr: [], links: 0 }
  window.__perf = s
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const p = C.prototype
    for (const nome of ["drawElements", "drawArrays", "drawElementsInstanced", "drawArraysInstanced"]) {
      const orig = p[nome]
      p[nome] = function (...a) {
        s.draws++
        const inst = nome.endsWith("Instanced") ? a[a.length - 1] : 1
        const count = nome.startsWith("drawElements") ? a[1] : a[2]
        if (a[0] === 4) s.tris += (count / 3) * inst
        return orig.apply(this, a)
      }
    }
    const origL = p.linkProgram
    p.linkProgram = function (pr) { s.links++; return origL.call(this, pr) }
  }
  let ult = performance.now()
  const loop = (t) => { s.quadros.push(t - ult); ult = t; s.dc.push(s.draws); s.tr.push(s.tris); s.draws = 0; s.tris = 0; requestAnimationFrame(loop) }
  requestAnimationFrame(loop)
}

const browser = await chromium.launch({ headless: true, channel: "chrome", executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] })
const page = await browser.newPage({ viewport: { width: +(process.env.W ?? 1280), height: +(process.env.H ?? 800) }, deviceScaleFactor: +(process.env.DPR ?? 2) })
await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
await page.addInitScript(contador)
const erros = []
page.on("pageerror", (e) => { erros.push(e.message); console.log("ERRO", e.message) })
await page.goto(URL)
await page.waitForFunction(() => window.__estado && window.__estado().dist > 50, null, { timeout: 60_000 })
await page.waitForTimeout(4000) // assenta (shaders, densidade)
await page.evaluate(() => { const s = window.__perf; s.quadros = []; s.dc = []; s.tr = []; s.links0 = s.links; window.__dens = []; setInterval(() => window.__gl && window.__dens.push(window.__gl.getPixelRatio()), 1000) })
const cdp = await page.context().newCDPSession(page)
if (!process.env.NOPROF) { await cdp.send("Profiler.enable"); await cdp.send("Profiler.start") }
await page.waitForTimeout(+(process.env.DUR ?? 20_000))
if (!process.env.NOPROF) { const { profile } = await cdp.send("Profiler.stop"); fs.writeFileSync(`${out}/trincheiras.cpuprofile`, JSON.stringify(profile)) }
const r = await page.evaluate(() => {
  const s = window.__perf
  const q = s.quadros.slice(1), o = [...q].sort((a, b) => a - b)
  const med = (l) => l.reduce((a, b) => a + b, 0) / Math.max(1, l.length)
  return {
    quadros: q.length, msMedio: +med(q).toFixed(1), p50: +o[Math.floor(o.length * 0.5)].toFixed(1), p95: +o[Math.floor(o.length * 0.95)].toFixed(1), pior: +o[o.length - 1].toFixed(1),
    acima33: q.filter((x) => x > 33.4).length,
    drawsMed: Math.round(med(s.dc.slice(1))), drawsMax: Math.max(...s.dc.slice(1)), trisMed: Math.round(med(s.tr.slice(1))),
    programasNoMeio: s.links - s.links0, densidades: [...new Set(window.__dens)].join(" "),
    estado: window.__estado(),
  }
})
await page.screenshot({ path: `${out}/trincheiras.png` }).catch(() => {})
console.log(JSON.stringify({ ...r, erros: erros.length }, null, 1))
await browser.close()
