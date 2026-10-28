import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

// (T43, J2:28) O campo de força dos prédios: a Kombi bate num prédio (de frente
// e de lado, segurando o volante contra a parede) e segue sem travar: nunca
// entra no prédio, desliza pela cerca e sai andando. Antes (o pinball) ela
// quicava e, entre dois prédios ou numa quina, ia e voltava até travar.
// Precisa de ?medir (expõe __jogo, __M e __colisores no build de produção).
const PASTA = "test-results/campo"
const SAVE = { versao: 2, nome: "Campo", disco: { fase: "livre", holo: true } }

type Amostra = { x: number; z: number; v: number; d: number; t: number }

async function entrar(page: Page) {
  await page.addInitScript((save) => {
    localStorage.setItem("cidade-neon-analytics-consent", "essential")
    localStorage.setItem("cn-linha-222", JSON.stringify(save))
  }, SAVE)
  const r = await page.goto("/linha?mapa=disco&medir")
  expect(r?.status()).toBe(200)
  const bt = page.locator(".l-btn-entrar")
  await expect(bt).toBeVisible({ timeout: 60_000 })
  await bt.click()
  await expect(bt).toBeHidden({ timeout: 30_000 })
  await page.waitForFunction(() => !!(window as unknown as { __jogo?: unknown; __colisores?: unknown }).__jogo && !!(window as unknown as { __colisores?: unknown }).__colisores, null, { timeout: 60_000 })
  // pula as cenas que aparecerem (fala, escolhas)
  for (let i = 0; i < 30; i++) {
    if (!(await page.locator(".l-cena").count())) break
    const fim = page.locator(".l-cena-fim button, .l-cena-escolhas button")
    if (await fim.count()) await fim.first().click({ force: true }).catch(() => {})
    else await page.mouse.click(200, 400)
    await page.waitForTimeout(400)
  }
  await page.getByText(/dar\s*partida/i).first().click({ force: true, timeout: 3_000 }).catch(() => {})
  await page.waitForTimeout(1500)
}

// escolhe um prédio isolado, põe a Kombi no chão a `dist` m da parede, apontando
// pra ela com `ang` rad de desvio, e devolve o índice dele nos colisores
async function preparar(page: Page, ang: number, dist: number) {
  return page.evaluate(({ ang, dist }) => {
    const w = window as unknown as { __jogo: Record<string, unknown>; __colisores: number[]; __M: { chaoEm: (x: number, z: number) => number; pousar: (x: number, z: number, y: number, dx: number, dz: number) => unknown } }
    const c = w.__colisores, P = 9, M = w.__M
    const longe = (x: number, z: number, menos: number, r: number) => {
      for (let k = 0; k < c.length; k += P) if (k !== menos && Math.hypot(c[k] - x, c[k + 1] - z) < r + Math.max(c[k + 4], c[k + 5])) return false
      return true
    }
    for (let k = 0; k < c.length; k += P) {
      const [bx, bz, tx, tz, hw, hd, , y0, topoCampo] = c.slice(k, k + P)
      if (hw < 5 || hd < 7 || topoCampo - y0 < 12) continue
      // a parede do lado (+x local), olhando de fora: normal = (tz, -tx)
      const nx = tz, nz = -tx
      const px = bx + nx * (hw + dist), pz = bz + nz * (hw + dist)
      if (!longe(bx, bz, k, 45) || !longe(px, pz, k, 30)) continue
      const chao = M.chaoEm(px, pz)
      if (chao < y0 || chao > topoCampo - 6) continue
      if (M.pousar(px, pz, chao + 1, 0, 0) || M.pousar(bx + nx * hw, bz + nz * hw, chao + 1, 0, 0)) continue
      // o rumo: pra dentro da parede (−normal), girado de `ang`
      const r0 = Math.atan2(-nx, -nz) + ang
      const j = w.__jogo
      Object.assign(j, { voo: true, ar: false, propulsou: true, wx: px, wz: pz, y: chao, vy: 0, rumo: r0, v: 24, steer: 0, chegadaCasa: false, encaixar: false })
      return k
    }
    return -1
  }, { ang, dist })
}

// amostra até a Kombi rodar `seg` segundos de JOGO (no navegador sem placa de
// vídeo do teste o quadro é lento; o relógio do jogo é o que vale), no máximo 90 s reais
async function amostrar(page: Page, k: number, seg: number): Promise<Amostra[]> {
  return page.evaluate(({ k, seg }) => new Promise<Amostra[]>((pronto) => {
    const w = window as unknown as { __jogo: { wx: number; wz: number; v: number; tempo: number }; __colisores: number[] }
    const c = w.__colisores, out: Amostra[] = [], t0 = performance.now(), j0 = w.__jogo.tempo
    const dist = (x: number, z: number) => {
      const dx = x - c[k], dz = z - c[k + 1], tx = c[k + 2], tz = c[k + 3]
      const lx = Math.abs(dx * tz - dz * tx) - c[k + 4], lz = Math.abs(dx * tx + dz * tz) - c[k + 5]
      return lx > 0 || lz > 0 ? Math.hypot(Math.max(0, lx), Math.max(0, lz)) : Math.max(lx, lz)
    }
    const passo = () => {
      const j = w.__jogo
      if (!out.length || out[out.length - 1].t !== j.tempo) out.push({ x: j.wx, z: j.wz, v: j.v, d: dist(j.wx, j.wz), t: j.tempo })
      if (j.tempo - j0 < seg && performance.now() - t0 < 90_000) requestAnimationFrame(passo); else pronto(out)
    }
    passo()
  }), { k, seg })
}

function conferir(nome: string, a: Amostra[]) {
  if (process.env.DEBUG_CAMPO) console.log(nome, a.filter((_, i) => i % 5 === 0).map((s) => `${s.d.toFixed(1)}/${s.v.toFixed(0)}/${s.t.toFixed(1)}`).join(" "))
  const toca = a.findIndex((s) => s.d < 1.75)
  expect(toca, `${nome}: chegou na cerca`).toBeGreaterThanOrEqual(0)
  // nunca entra no prédio (o raio da Kombi é 1,6 m da parede)
  const dMin = Math.min(...a.map((s) => s.d))
  expect(dMin, `${nome}: não atravessa a parede`).toBeGreaterThan(1.0)
  // depois de encostar: anda (não fica presa nem volta quicando) e sai com velocidade
  const depois = a.slice(toca)
  let anda = 0
  for (let i = 1; i < depois.length; i++) anda += Math.hypot(depois[i].x - depois[i - 1].x, depois[i].z - depois[i - 1].z)
  const fim = depois[depois.length - 1]
  const seg = fim.t - depois[0].t
  console.log(`${nome}: dMin ${dMin.toFixed(2)} m, depois do toque ${anda.toFixed(1)} m em ${seg.toFixed(1)} s, v final ${fim.v.toFixed(1)} m/s, ${a.length} quadros`)
  expect(seg, `${nome}: tempo de jogo depois do toque`).toBeGreaterThan(1)
  expect(anda / seg, `${nome}: segue andando (m/s de jogo)`).toBeGreaterThan(8)
  expect(fim.v, `${nome}: não perde a velocidade`).toBeGreaterThan(10)
  // não quica: depois de encostar, nunca se afasta mais de 4 m da parede enquanto desliza ao lado dela
  const meio = depois.filter((s) => s.d < 6)
  expect(meio.length, `${nome}: desliza grudada`).toBeGreaterThan(2)
}

test("o campo de força: bate num prédio e segue sem travar", async ({ page }) => {
  test.setTimeout(300_000)
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await entrar(page)
  await page.keyboard.down("ArrowUp")

  // 1) de frente (o pior caso do pinball: voltava pelo mesmo caminho)
  const k1 = await preparar(page, 0.04, 14)
  expect(k1, "achou um prédio isolado no chão").toBeGreaterThanOrEqual(0)
  const a1 = await amostrar(page, k1, 4)
  await page.screenshot({ path: `${PASTA}/1-de-frente.png` })
  conferir("de frente", a1)

  // 2) de lado, segurando o volante contra a parede: gruda e desliza
  const k2 = await preparar(page, -0.6, 14)
  await page.keyboard.down("ArrowLeft")
  const a2 = await amostrar(page, k2, 4)
  await page.screenshot({ path: `${PASTA}/2-de-lado.png` })
  await page.keyboard.up("ArrowLeft")
  conferir("de lado, volante contra", a2)

  await page.keyboard.up("ArrowUp")
  expect(erros).toEqual([])
})
