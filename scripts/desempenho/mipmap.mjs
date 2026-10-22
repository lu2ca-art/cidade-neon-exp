// quem chama gl.generateMipmap durante a corrida (perf-006): a textura ligada,
// o tamanho, quantas vezes, e de qual THREE.Texture/material ela é (via __gl.properties, só com ?medir)
import { chromium } from "playwright"
import { semear, entrarDirigindo } from "./save.mjs"

const mapa = process.argv[2] ?? "disco"
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: +(process.env.DPR ?? 2) })
await page.addInitScript(() => {
  localStorage.setItem("cidade-neon-analytics-consent", "essential")
  window.__mip = new Map() // WebGLTexture -> { n, ms, pilha }
  window.__mipT0 = Infinity
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    const p = C.prototype, o = p.generateMipmap
    p.generateMipmap = function (alvo) {
      const tex = this.getParameter(alvo === this.TEXTURE_2D ? this.TEXTURE_BINDING_2D : this.TEXTURE_BINDING_CUBE_MAP)
      const t = performance.now(); const r = o.call(this, alvo); const d = performance.now() - t
      if (t > window.__mipT0) {
        const g = window.__mip.get(tex) ?? { n: 0, ms: 0, pilha: new Error().stack.split("\n").slice(2, 9).map((l) => l.trim().replace(/https?:\/\/[^/]+/, "")).join(" | ") }
        g.n++; g.ms += d; window.__mip.set(tex, g)
      }
      return r
    }
  }
})
await semear(page)
await page.goto(`${process.env.BASE ?? "http://localhost:3110"}/linha?mapa=${mapa}&medir${process.env.Q ?? ""}`)
await page.locator(".l-btn-entrar").click({ timeout: 20_000, force: true }).catch(() => {})
await entrarDirigindo(page, 14_000)
await page.waitForTimeout(3000)
await page.evaluate(() => { window.__mipT0 = performance.now() })
const DUR = +(process.env.DUR ?? 10_000)
await page.waitForTimeout(DUR)
const r = await page.evaluate((DUR) => {
  const gl = window.__gl, quadros = gl.info.render.frame
  // textura do three -> quem usa
  const donos = new Map()
  const ver = (tex, onde) => { if (!tex?.isTexture) return; const w = gl.properties.get(tex).__webglTexture; if (w) donos.set(w, { tex, onde: [...(donos.get(w)?.onde ?? []), onde] }) }
  window.__cena.traverse((o) => {
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    for (const m of ms) for (const [k, v] of Object.entries(m)) ver(v, `${o.type}:${o.name || o.parent?.name || "?"} ${m.type}.${k}`)
    if (m => 0) for (const m of ms) if (m.uniforms) for (const [k, u] of Object.entries(m.uniforms)) ver(u.value, `${o.type}:${o.name || "?"} ${m.type}.uniforms.${k}`)
  })
  return [...window.__mip].sort((a, b) => b[1].n - a[1].n).map(([w, g]) => {
    const d = donos.get(w), t = d?.tex, img = t?.image
    return { porSeg: +(g.n / (DUR / 1000)).toFixed(1), n: g.n, ms: +g.ms.toFixed(1), tex: t ? `${t.constructor.name} "${t.name}" ${img?.width}x${img?.height} ${img?.constructor?.name} genMip=${t.generateMipmaps} min=${t.minFilter} rt=${!!t.isRenderTargetTexture}` : "(não achei no grafo)", onde: d ? [...new Set(d.onde)].slice(0, 5) : [], pilha: g.pilha }
  })
}, DUR)
console.log(`generateMipmap em ${DUR} ms:`)
for (const x of r) console.log(JSON.stringify(x, null, 1))
await browser.close()
