// mede o /linha num mapa: draw calls, triângulos, tempo de quadro e perfil de CPU
import { chromium } from "playwright"
import fs from "node:fs"

const mapa = process.argv[2] ?? "disco"
const out = process.argv[3] ?? "."
const URL = `${process.env.BASE ?? "http://localhost:3110"}/linha?mapa=${mapa}&medir${process.env.Q ?? ""}`

const contador = () => {
  const s = { draws: 0, tris: 0, quadros: [], dc: [], tr: [] }
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
  }
  s.links = []
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const p = C.prototype, origS = p.shaderSource, origL = p.linkProgram, origA = p.attachShader
    const src = new WeakMap(), prog = new WeakMap()
    p.shaderSource = function (sh, code) { src.set(sh, code); return origS.call(this, sh, code) }
    p.attachShader = function (pr, sh) { const l = prog.get(pr) ?? []; l.push(sh); prog.set(pr, l); return origA.call(this, pr, sh) }
    p.linkProgram = function (pr) {
      const code = (prog.get(pr) ?? []).map((sh) => src.get(sh) ?? "").join("\n")
      const nome = (code.match(/#define SHADER_NAME (\S+)/) ?? [])[1] ?? "custom"
      const luzes = (code.match(/(PointLight pointLights|DirectionalLight directionalLights|SpotLight spotLights|HemisphereLight hemisphereLights)\[ ?\d+ ?\]/g) ?? []).join(",")
      const sh = (code.match(/#define (USE_SHADOWMAP|USE_INSTANCING|USE_FOG|USE_MAP|USE_EMISSIVEMAP|USE_COLOR|USE_ENVMAP)/g) ?? []).map((x) => x.slice(12)).join(",")
      s.links.push({ t: Math.round(performance.now()), nome, luzes, sh, code: code.length > 0 ? code.slice(code.indexOf('void main'), code.indexOf('void main') + 400) + ' ||| ' + (code.match(/uniform [^;]+;/g) ?? []).filter((u) => !/modelMatrix|viewMatrix|projectionMatrix|cameraPosition|isOrthographic|normalMatrix|modelViewMatrix|fog|toneMapping/.test(u)).slice(0, 12).join(' ') : '' })
      return origL.call(this, pr)
    }
  }
  let ult = performance.now()
  s.longos = []
  const loop = (t) => {
    if (t - ult > 50) s.longos.push([Math.round(t), Math.round(t - ult)])
    s.quadros.push(t - ult); ult = t
    s.dc.push(s.draws); s.tr.push(s.tris); s.draws = 0; s.tris = 0
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required", "--disable-frame-rate-limit=false"] })
const page = await browser.newPage({ viewport: { width: +(process.env.W ?? 1280), height: +(process.env.H ?? 800) }, deviceScaleFactor: +(process.env.DPR ?? 1) })
await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
await page.addInitScript(contador)
page.on("pageerror", (e) => console.log("ERRO", e.message))
await page.goto(URL)
await page.locator(".l-btn-entrar").click({ timeout: 20_000, force: true }).catch(() => console.log("(sem botão: entrou sozinho)"))
await page.waitForTimeout(12_000)
const cdp = await page.context().newCDPSession(page)
await cdp.send("Profiler.enable")
await cdp.send("Profiler.setSamplingInterval", { interval: 200 })
if (process.env.ARRANQUE) await cdp.send("Profiler.start")
// acelera
await page.keyboard.down("ArrowUp")
await page.waitForTimeout(3000)
if (process.env.ARRANQUE) { const { profile } = await cdp.send("Profiler.stop"); fs.writeFileSync(`${out}/arranque.cpuprofile`, JSON.stringify(profile)) }
await page.evaluate(() => { const s = window.__perf; s.quadros = []; s.dc = []; s.tr = []; s.t0 = performance.now(); s.linksAntes = s.links.length })
if (!process.env.NOPROF) await cdp.send("Profiler.start")
await page.evaluate(() => { window.__dens = []; setInterval(() => window.__gl && window.__dens.push(window.__gl.getPixelRatio()), 1000) })
await page.waitForTimeout(+(process.env.DUR ?? 12_000))
console.log("densidades", await page.evaluate(() => window.__dens.join(" ")))
const { profile } = process.env.NOPROF ? { profile: { nodes: [], samples: [], timeDeltas: [] } } : await cdp.send("Profiler.stop")
const r = await page.evaluate(() => {
  const s = window.__perf
  const q = s.quadros.slice(1).sort((a, b) => a - b)
  const med = (l) => l.reduce((a, b) => a + b, 0) / Math.max(1, l.length)
  return {
    quadros: q.length, msMedio: +med(q).toFixed(1), p50: +q[Math.floor(q.length * 0.5)].toFixed(1), p95: +q[Math.floor(q.length * 0.95)].toFixed(1),
    drawsMed: Math.round(med(s.dc.slice(1))), trisMed: Math.round(med(s.tr.slice(1))),
    estado: window.__estado ? window.__estado() : null,
    links: s.links, longos: s.longos, t0: s.t0,
  }
})
await page.keyboard.up("ArrowUp")
await page.screenshot({ path: `${out}/${mapa}.png`, timeout: 60_000 }).catch(() => console.log("(sem screenshot)"))
fs.writeFileSync(`${out}/${mapa}.cpuprofile`, JSON.stringify(profile))
// os nós mais quentes (self time)
const nos = new Map(profile.nodes.map((n) => [n.id, n]))
const self = new Map()
const dts = profile.timeDeltas
profile.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (dts[i] ?? 0)))
const porFunc = new Map()
for (const [id, t] of self) {
  const cf = nos.get(id).callFrame
  const k = `${cf.functionName || "(anon)"} ${cf.url.split("/").pop()}:${cf.lineNumber}:${cf.columnNumber}`
  porFunc.set(k, (porFunc.get(k) ?? 0) + t)
}
const total = [...porFunc.values()].reduce((a, b) => a + b, 0)
const top = [...porFunc].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, t]) => `${((t / total) * 100).toFixed(1).padStart(5)}%  ${k}`)
const { links, longos, t0, ...resto } = r; console.log('t0', Math.round(t0), 'longos', JSON.stringify(longos)); console.log(JSON.stringify(resto, null, 1)); fs.writeFileSync(`${out}/${mapa}-links.json`, JSON.stringify(links, null, 1)); console.log("programas compilados:", links.length)
console.log(top.join("\n"))
await browser.close()
