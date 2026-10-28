import { expect, test, type Page } from "@playwright/test"
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import type { HistoriaDisco } from "../app/linha/disco/historia"
import { IDS13, MISSOES13, abrirPorta } from "../app/linha/disco/portas"
import { SHOWS_XENOM, albumLiberado, cumpriu, lerShowXenom, notaDosJurados, registrarXenom, showXenom, xenomAberto, xenomDaMissao } from "../app/linha/disco/xenom"

// (T21) os 4 shows do subúrbio xenom: cada missão do subúrbio libera o show
// da faixa dela no Guitar Driver; cada show é um multiverso com a sua regra e
// o seu objetivo, e paga prestígio e grana. Dirige a cena 3D: no Mac, metal.
test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] } })

const PASTA = "test-results/xenom"
const SUBURBIO = IDS13.filter((id) => MISSOES13[id].onde === "suburbio")

test("as regras: uma faixa por missão do subúrbio, o objetivo, o pagamento e o álbum", () => {
  // as 4 missões do subúrbio, cada uma com o seu show (4 faixas e 4 regras diferentes)
  expect(SUBURBIO).toHaveLength(4)
  for (const m of SUBURBIO) expect(xenomDaMissao(m)).not.toBeNull()
  expect(new Set(SHOWS_XENOM.map((x) => x.faixa)).size).toBe(4)
  expect(new Set(SHOWS_XENOM.map((x) => x.regra.t)).size).toBe(4)
  // a música e as notas de cada um existem (o corte de 22 s e o chart)
  for (const x of SHOWS_XENOM) {
    expect(existsSync(`public${x.src}`)).toBe(true)
    const c = JSON.parse(readFileSync(`public/gd2/xenom-${x.id}.json`, "utf8"))
    expect(c.guitarra.medio.length).toBeGreaterThan(30)
    expect(c.guitarra.medio.every(([t, l]: number[]) => t > 0 && t < 22 && l >= 0 && l < 4)).toBe(true)
  }
  // fechado antes da missão; a porta da missão abre o show
  let h: HistoriaDisco = { fase: "carreira", holo: true, feitas13: ["dbee", "oficina"] }
  const dez = SHOWS_XENOM.find((x) => x.missao === "tuneis")!
  expect(xenomAberto(h, dez)).toBe(false)
  expect(xenomAberto(h, SHOWS_XENOM.find((x) => x.missao === "dbee")!)).toBe(true)
  h = abrirPorta(h, "tuneis")
  expect(xenomAberto(h, dez)).toBe(true)
  // o objetivo de cada tipo
  const gata = SHOWS_XENOM.find((x) => x.regra.t === "espelho")!
  const boom = SHOWS_XENOM.find((x) => x.regra.t === "explosao")!
  const tedio = SHOWS_XENOM.find((x) => x.regra.t === "cinza")!
  expect(cumpriu(gata, { nota: 0.6, maxSeq: 0, galera: 0 })).toBe(true)
  expect(cumpriu(gata, { nota: 0.2, maxSeq: 99, galera: 1 })).toBe(false)
  expect(cumpriu(boom, { nota: 0.1, maxSeq: 20, galera: 0 })).toBe(true)
  expect(cumpriu(tedio, { nota: 0.1, maxSeq: 0, galera: 0.7 })).toBe(true)
  expect(notaDosJurados(0.73)).toBe(7.5)
  // paga: o cachê vezes o multiverso; a primeira vez cumprida, o bônus e o prestígio; depois, só o cachê
  const r1 = registrarXenom(h, "dez", { nota: 0.9, maxSeq: 30, galera: 0.9 }, 100)
  expect(r1.cumpriu && r1.primeira).toBe(true)
  expect(r1.neon).toBe(Math.round(100 * dez.paga) + dez.bonus)
  expect(r1.prestigio).toBe(dez.prestigio)
  const r2 = registrarXenom(r1.h, "dez", { nota: 0.9, maxSeq: 30, galera: 0.9 }, 100)
  expect(r2.primeira).toBe(false)
  expect(r2.neon).toBe(Math.round(100 * dez.paga))
  expect(r2.h.xenom!.dez.vezes).toBe(2)
  // não cumpriu: paga o cachê, sem bônus
  const r0 = registrarXenom(h, "dez", { nota: 0.1, maxSeq: 1, galera: 0 }, 100)
  expect(r0.cumpriu).toBe(false)
  expect(r0.prestigio).toBe(0)
  // as 4 cumpridas: o álbum
  let hh = h
  let album = false
  for (const x of SHOWS_XENOM) { const r = registrarXenom(hh, x.id, { nota: 1, maxSeq: 99, galera: 1 }, 50); hh = r.h; album = album || r.album }
  expect(albumLiberado(hh)).toBe(true)
  expect(album).toBe(true)
  expect(lerShowXenom(showXenom("gata"))!.faixa).toBe("Gata Mia")
})

const save = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "{}"))
async function abrir(page: Page, parte: string) {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto(`/linha?mapa=disco&parte=${parte}`)
  const entrar = page.locator(".l-btn-entrar")
  await expect(entrar).toBeVisible({ timeout: 60_000 })
  await entrar.click()
  return erros
}

test("no jogo: a missão dos túneis libera o show 10 D3 10, que abre no multiverso dele e paga", async ({ page }) => {
  test.setTimeout(240_000)
  mkdirSync(PASTA, { recursive: true })
  // (T57) o jogo dos túneis é descer a boca pras trincheiras (a página do T13); a volta
  // com a corrida feita (de=tuneis&corrida=1) fecha o jogo e a porta abre
  const erros = await abrir(page, "missao.tuneis&de=tuneis&corrida=1")
  const r = page.locator(".l-recompensa")
  await expect(r).toBeVisible({ timeout: 30_000 })
  await expect(r.locator(".l-recompensa-xenom")).toContainText("10 D3 10")
  await page.screenshot({ path: `${PASTA}/1-porta.png` })
  expect((await save(page)).disco.feitas13).toContain("tuneis")
  // "tocar agora": os palcos, com o show dos túneis aberto e o da quadra ainda fechado
  await r.locator("[data-xenom-ir=dez]").click()
  const palcos = page.locator(".l-palcos")
  await expect(palcos).toBeVisible({ timeout: 15_000 })
  const xenom = palcos.locator(".l-xenom")
  await expect(xenom.locator("button[data-xenom=dez]")).toBeVisible()
  await expect(xenom.locator("li.is-fechada", { hasText: "Tédio" })).toContainText("abre na missão do Alohan")
  await xenom.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${PASTA}/2-palcos.png` })
  const antes = await save(page)
  await xenom.locator("button[data-xenom=dez]").click()
  await expect(palcos).toBeHidden()
  // o prelúdio do multiverso, e direto o Guitar Driver (sem escolher instrumento)
  await expect(page.locator(".l-show.is-preludio")).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${PASTA}/3-preludio.png` })
  await page.mouse.click(200, 420)
  await expect(page.locator(".l-show-banda")).toHaveCount(0)
  await expect(page.locator(".l-show-carrega")).toBeHidden({ timeout: 60_000 })
  await expect(page.locator(".l-show-topo small")).toContainText("o multiverso dos jurados")
  await expect(page.locator(".l-show-topo b")).toContainText("10 D3 10")
  // toca: as 4 teclas no ritmo, até o fim dos 22 s
  const fim = page.locator(".l-show-fim")
  for (let i = 0; i < 80 && !(await fim.isVisible()); i++) {
    const k = "dfjk"[i % 4]
    await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k)
    await page.waitForTimeout(250)
    if (i === 20) await page.screenshot({ path: `${PASTA}/4-show.png` })
  }
  await expect(fim).toBeVisible({ timeout: 40_000 })
  await expect(fim.locator(".l-xenom-jurados")).toContainText("os jurados")
  await expect(fim.locator(".l-xenom-objetivo")).toBeVisible()
  await page.screenshot({ path: `${PASTA}/5-fim.png` })
  await fim.locator("button").click()
  // pagou: a grana (o cachê vezes o multiverso) e o prestígio (a popularidade); o show ficou no save
  await page.waitForFunction(() => !JSON.parse(localStorage.getItem("cn-linha-222") ?? "{}").disco?.show, null, { timeout: 10_000 })
  const depois = await save(page)
  expect(depois.neon ?? 0).toBeGreaterThan(antes.neon ?? 0)
  expect(depois.popularidade ?? 0).toBeGreaterThan(antes.popularidade ?? 0)
  expect(depois.disco.xenom.dez.vezes).toBe(1)
  expect(erros).toEqual([])
})

test("os 4 multiversos abrem com o tema deles (o link xenom.<id>)", async ({ page }) => {
  test.setTimeout(300_000)
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  for (const x of SHOWS_XENOM) {
    await page.goto(`/linha?mapa=disco&parte=xenom.${x.id}`)
    await page.locator(".l-btn-entrar").click({ timeout: 60_000 })
    await expect(page.locator(".l-show.is-preludio")).toBeVisible({ timeout: 30_000 })
    await page.mouse.click(200, 420)
    await expect(page.locator(".l-show-carrega")).toBeHidden({ timeout: 60_000 })
    await expect(page.locator(".l-show-topo small")).toContainText(x.multiverso)
    await expect(page.locator(".l-show-topo b")).toContainText(x.faixa)
    await page.waitForTimeout(6000)
    await page.screenshot({ path: `${PASTA}/tema-${x.id}.png` })
  }
  expect(erros).toEqual([])
})
