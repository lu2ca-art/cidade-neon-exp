// os quadros longos (Long Animation Frames, Chrome): quem gastou o tempo
import { chromium } from "playwright"

const mapa = process.argv[2] ?? "disco"
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: +(process.env.DPR ?? 2) })
await page.addInitScript(() => {
  localStorage.setItem("cidade-neon-analytics-consent", "essential")
  window.__loaf = []
  window.__up = []
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const p = C.prototype
    for (const nome of ["texImage2D", "texSubImage2D", "compressedTexImage2D", "texStorage2D", "texImage3D", "bufferData", "generateMipmap"]) {
      const o = p[nome]
      p[nome] = function (...a) {
        const t = performance.now(); const r = o.apply(this, a); const d = performance.now() - t
        let tam = ""
        if (nome === "texImage2D") { const src = a[a.length - 1]; tam = a.length >= 9 ? `${a[3]}x${a[4]}` : src && (src.width ? `${src.width}x${src.height}` : "") }
        if (nome === "texStorage2D") tam = `${a[3]}x${a[4]} lv${a[1]}`
        if (nome === "bufferData") tam = a[1] && a[1].byteLength ? `${Math.round(a[1].byteLength / 1024)}KB` : String(a[1])
        window.__up.push({ t: Math.round(t), nome, tam, d: +d.toFixed(1) })
        return r
      }
    }
  }
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__loaf.push(e.toJSON()) }).observe({ type: "long-animation-frame", buffered: true })
})
await page.goto(`${process.env.BASE ?? "http://localhost:3110"}/linha?mapa=${mapa}&medir${process.env.Q ?? ""}`)
await page.locator(".l-btn-entrar").click({ timeout: 20_000, force: true }).catch(() => {})
await page.waitForTimeout(14_000)
await page.keyboard.down("ArrowUp")
await page.waitForTimeout(3000)
const t0 = await page.evaluate(() => performance.now())
await page.waitForTimeout(25_000)
const r = await page.evaluate((t0) => {
  const l = window.__loaf.filter((e) => e.startTime > t0 && e.duration > 30)
  // por quadro: tempo em script, em render (desenho/layout) e o maior script
  const quadros = l.map((e) => {
    const scr = e.scripts.reduce((a, s) => a + s.duration, 0)
    const top = [...e.scripts].sort((a, b) => b.duration - a.duration)[0]
    return { t: Math.round(e.startTime), dur: Math.round(e.duration), script: Math.round(scr), render: Math.round(e.startTime + e.duration - e.renderStart), bloqueio: Math.round(e.blockingDuration), top: top ? `${top.invoker || top.invokerType} ${top.sourceFunctionName || ""} ${(top.sourceURL || "").split("/").pop()}:${top.sourceCharPosition} (${Math.round(top.duration)}ms)` : "-" }
  })
  // os scripts que mais aparecem nos quadros longos
  const porScript = new Map()
  for (const e of l) for (const s of e.scripts) { const k = `${s.invoker || s.invokerType} ${s.sourceFunctionName || ""} ${(s.sourceURL || "").split("/").pop()}`; const g = porScript.get(k) ?? { n: 0, ms: 0 }; g.n++; g.ms += s.duration; porScript.set(k, g) }
  const ups = window.__up.filter((u) => u.t > t0)
  const perto = (q) => ups.filter((u) => u.t >= q.t - 5 && u.t <= q.t + q.dur).map((u) => `${u.nome}${u.tam ? " " + u.tam : ""}${u.d > 2 ? " (" + u.d + "ms)" : ""}`)
  quadros.forEach((q) => { const p = perto(q); q.ups = p.length ? `${p.length} uploads: ${[...new Set(p)].slice(0, 6).join(", ")}` : "" })
  return { ups: ups.length, upsGrandes: ups.filter((u) => u.nome !== "bufferData" || parseInt(u.tam) > 200).slice(0, 30).map((u) => `${u.t} ${u.nome} ${u.tam} ${u.d}ms`), n: l.length, quadros: quadros.slice(0, 25), porScript: [...porScript].sort((a, b) => b[1].ms - a[1].ms).slice(0, 12).map(([k, g]) => `${Math.round(g.ms)}ms em ${g.n}x  ${k}`) }
}, t0)
console.log("quadros longos (>30 ms) em 25 s:", r.n)
for (const q of r.quadros) console.log(`${q.t} ${q.dur}ms  script ${q.script} render ${q.render}  | ${q.ups}`)
console.log("--- uploads (fora bufferData pequeno):", r.ups, "no total")
console.log(r.upsGrandes.join("\n"))
console.log("--- por script")
console.log(r.porScript.join("\n"))
await browser.close()
