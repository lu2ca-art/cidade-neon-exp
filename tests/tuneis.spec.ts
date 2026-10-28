import { expect, test, type Page } from "@playwright/test"
import { BOCA, QUADRA, chaoEm, fundoBoca, naBoca } from "../app/linha/estrada/chao"
import { CHAO_LUGARES } from "../app/linha/disco/historia"
import { MISSOES13 } from "../app/linha/disco/portas"
import { saidaDoTunel, voltaDasTrincheiras } from "../app/linha/disco/tuneis"

// (T57) a boca do túnel de verdade no subúrbio: o chão desce numa rampa até a
// porta escura; lá embaixo, ela leva às trincheiras (a página do T11/T13) e a
// volta sai da boca. E a quadra é um piso de verdade (o chão assenta nele).

test("T57: a rampa é o chão mesmo (a física desce junto) e a quadra é plana", () => {
  const no = (s: number) => [BOCA.x + BOCA.ax * s, BOCA.z + BOCA.az * s] as const
  // lá em cima, a rampa ainda não desceu; lá embaixo, desceu o fundo inteiro
  expect(fundoBoca(...no(-BOCA.comp - 1))).toBe(0)
  expect(fundoBoca(...no(-2))).toBeCloseTo(BOCA.fundo, 1)
  // descendo sempre (sem degrau)
  let antes = chaoEm(...no(-BOCA.comp)), pior = 0
  for (let s = -BOCA.comp + 1; s <= -BOCA.plano; s++) { const h = chaoEm(...no(s)); pior = Math.max(pior, antes - h); expect(h).toBeLessThanOrEqual(antes + 0.3); antes = h }
  expect(pior).toBeLessThan(0.5) // no máximo 0,5 m por metro: a Kombi desce rodando
  // a porta só vale lá embaixo, dentro da vala
  expect(naBoca(...no(-3))).toBe(true)
  expect(naBoca(...no(-BOCA.comp + 2))).toBe(false)
  expect(naBoca(BOCA.x + BOCA.az * 20, BOCA.z - BOCA.ax * 20)).toBe(false)
  // o ponto da missão dos túneis é a porta
  expect(CHAO_LUGARES.tuneis.x).toBe(BOCA.x)
  // a quadra: o chão é o piso (plano) e a volta dele assenta sem degrau
  const h0 = chaoEm(QUADRA.x, QUADRA.z)
  for (const [a, b] of [[8, 14], [-8, -14], [8, -14], [0, 0]]) expect(chaoEm(QUADRA.x + a * Math.cos(QUADRA.rot) + b * Math.sin(QUADRA.rot), QUADRA.z - a * Math.sin(QUADRA.rot) + b * Math.cos(QUADRA.rot))).toBeCloseTo(h0, 3)
  // a missão dos túneis: o jogo é descer pras trincheiras
  expect(MISSOES13.tuneis.jogo.como).toEqual({ t: "trincheiras" })
  expect(voltaDasTrincheiras("?mapa=disco&de=tuneis&corrida=1")).toEqual({ corrida: true })
  expect(voltaDasTrincheiras("?mapa=disco")).toBeNull()
  // a volta sai no alto da rampa, fora da vala
  const sd = saidaDoTunel()
  expect(fundoBoca(sd.x, sd.z)).toBe(0)
})

const saveDe = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "null"))
async function abrir(page: Page, url: string) {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto(url)
  await page.waitForTimeout(2500)
  const entrar = page.locator(".l-btn-entrar")
  if (await entrar.isVisible().catch(() => false)) { await entrar.click(); await page.waitForTimeout(3000) }
  await page.waitForFunction(() => !!(window as unknown as { __jogo?: unknown }).__jogo, null, { timeout: 60_000 })
  return erros
}

test("entrar na boca do túnel leva às trincheiras; a volta sai da boca e conta a corrida", async ({ page }) => {
  test.setTimeout(240_000)
  // a missão dos túneis pegada; a volta (de=tuneis) já põe a Kombi no alto da rampa
  const erros = await abrir(page, "/linha?mapa=disco&parte=missao.tuneis&de=tuneis&medir")
  const pos = () => page.evaluate(() => { const j = (window as unknown as { __jogo: { wx: number; wz: number; y: number } }).__jogo; return { x: j.wx, z: j.wz, y: j.y } })
  const sd = saidaDoTunel()
  const p0 = await pos()
  expect(Math.hypot(p0.x - sd.x, p0.z - sd.z)).toBeLessThan(30)
  // desce a rampa: a Kombi vai pro fundo (a física pisa na vala) e a porta leva às trincheiras
  const s = -BOCA.plano + 1, fx = BOCA.x + BOCA.ax * s, fz = BOCA.z + BOCA.az * s
  await page.evaluate(([x, z]) => { const j = (window as unknown as { __jogo: { wx: number; wz: number; v: number; ar: boolean } }).__jogo; j.wx = x; j.wz = z; j.v = 0; j.ar = false }, [fx, fz])
  await page.waitForURL(/\/teste\/trincheiras\?volta=disco&missao=tuneis/, { timeout: 30_000 })
  // lá embaixo: as trincheiras, com a subida de volta pro subúrbio
  const subir = page.locator("a[data-subir]").first()
  await expect(subir).toBeVisible({ timeout: 60_000 })
  await expect(subir).toHaveAttribute("href", "/linha?mapa=disco&de=tuneis")
  // a volta depois de uma corrida inteira (a corrida em si é testada no corrida-tuneis.spec):
  // sai da boca do túnel e o jogo da missão fica feito; a porta abre
  await page.goto("/linha?mapa=disco&de=tuneis&corrida=1&medir")
  const entrar = page.locator(".l-btn-entrar")
  if (await entrar.isVisible({ timeout: 10_000 }).catch(() => false)) await entrar.click()
  await expect(page.locator(".l-recompensa")).toBeVisible({ timeout: 60_000 })
  const sv = await saveDe(page)
  expect(sv.disco.passos13).toContain("tuneis:jogo")
  expect(sv.disco.feitas13).toContain("tuneis")
  // a barra fica limpa (recarregar não repete a volta)
  expect(page.url()).not.toContain("de=tuneis")
  expect(erros).toEqual([])
})
