import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"
import { PALCOS_CARREIRA, PALCOS_CONFIG, cacheNoPalco, estrelasDaNota, estrelasTotais, menuDo, nivelDe, palcoPorId, registrarShow, travaDo } from "../app/linha/disco/palcos"
import { cacheDoShow } from "../app/linha/economia"
import type { HistoriaDisco } from "../app/linha/disco/historia"

// (T20) os palcos como Guitar Hero: cada palco com o seu menu de músicas, as
// estrelas, os níveis até o topo e o cachê que sobe com o palco e a fama.
const PASTA = "test-results/palcos"
const CARREIRA: HistoriaDisco = { fase: "carreira", holo: true, feitas13: ["dbee", "oficina"] }
const COM_LIVE: HistoriaDisco = { ...CARREIRA, portas: ["shows-live"] }

test("as regras: estrelas, níveis, o menu e o cachê", () => {
  // terminar já vale 1 estrela; cantar perfeito, 5
  expect(estrelasDaNota(0)).toBe(1)
  expect(estrelasDaNota(1)).toBe(5)
  expect(estrelasDaNota(0.6)).toBe(3)
  // sem a missão do LU2CA, só a calçada (nível 1); com ela, as estrelas abrem os de cima
  expect(nivelDe(CARREIRA)).toBe(1)
  expect(travaDo(CARREIRA, PALCOS_CARREIRA[1]).t).toBe(PALCOS_CONFIG.precisaDoLive ? "live" : "estrelas")
  expect(nivelDe(COM_LIVE)).toBe(1)
  // só a Nectar (a música dele) já leva até o topo: ela está em todos os palcos
  let h = COM_LIVE
  for (const p of PALCOS_CARREIRA) { expect(p.musicas).toContain("nectar"); h = registrarShow(h, p.id, "nectar", 1).h }
  expect(nivelDe(h)).toBe(PALCOS_CARREIRA.length)
  // a melhor estrela fica (cantar pior depois não tira)
  expect(registrarShow(h, "calcada", "nectar", 0).h).toBe(h)
  expect(estrelasTotais(h)).toBe(5 * PALCOS_CARREIRA.length)
  // o menu: as que as missões não liberaram ficam trancadas
  const menu = menuDo(COM_LIVE, palcoPorId("calcada")!)
  expect(menu.find((m) => m.faixa === "nectar")!.livre).toBe(true)
  expect(menu.find((m) => m.faixa === "chuva")!.livre).toBe(false)
  // o cachê: o do T03 (nota e fama) vezes o palco; mais alto paga mais
  const base = cacheDoShow(0.8, 40)
  expect(cacheNoPalco(base, palcoPorId("torres")!)).toBeGreaterThan(cacheNoPalco(base, palcoPorId("calcada")!))
  expect(cacheNoPalco(base, palcoPorId("calcada")!)).toBe(base)
  // a proposta: os palcos sobem a cidade (o primeiro na rua, o último nas torres)
  expect(PALCOS_CARREIRA[0].altura).toBe("rua")
  expect(PALCOS_CARREIRA.at(-1)!.altura).toBe("torres")
})

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
const save = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "{}"))

test("abre um palco, escolhe a música no menu, canta, ganha nível e Água$", async ({ page }) => {
  test.setTimeout(180_000)
  mkdirSync(PASTA, { recursive: true })
  const erros = await abrir(page, "palcos")
  const palcos = page.locator(".l-palcos")
  await expect(palcos).toBeVisible({ timeout: 30_000 })
  await expect(palcos.locator(".l-palcos-nivel")).toHaveText(/nível 1 de 5/)
  await page.screenshot({ path: `${PASTA}/1-palcos.png` })
  const antes = await save(page)
  const neonAntes = antes.agua ?? 0
  // o palco de cima ainda está fechado; o menu da calçada tem a Nectar
  await expect(palcos.locator("li.is-fechado [data-palco=bar]")).toBeVisible()
  await palcos.locator("[data-palco=calcada]").click()
  await palcos.locator(".l-palcos-menu button[data-faixa=nectar]").click()
  await expect(palcos).toBeHidden()
  // o show: o prelúdio (pula), as opções, cantar
  await expect(page.locator(".l-show.is-preludio")).toBeVisible({ timeout: 30_000 })
  await expect(page.locator(".l-show-topo small").first()).toContainText(/calçada/, { timeout: 10_000 }).catch(() => {})
  await page.mouse.click(200, 420)
  const banda = page.locator(".l-show-banda")
  await expect(banda).toBeVisible()
  await expect(page.locator(".l-show-topo small")).toContainText("na calçada")
  await banda.locator("button", { hasText: "cantar" }).click()
  await expect(page.locator(".l-show-carrega")).toBeHidden({ timeout: 60_000 })
  // canta: equilibra a agulha com ↑ ↓ até o fim dos 22 s
  for (let i = 0; i < 12; i++) {
    await page.keyboard.down(i % 2 ? "ArrowDown" : "ArrowUp")
    await page.waitForTimeout(400)
    await page.keyboard.up(i % 2 ? "ArrowDown" : "ArrowUp")
    await page.waitForTimeout(600)
  }
  await page.screenshot({ path: `${PASTA}/2-cantar.png` })
  const fim = page.locator(".l-show-fim")
  await expect(fim).toBeVisible({ timeout: 40_000 })
  await page.screenshot({ path: `${PASTA}/3-fim.png` })
  await fim.locator("button").click()
  // o jornal e o save: estrelas na calçada, o nível 2 (o bar abriu) e o Água$ entrou
  await expect(page.locator(".l-show")).toBeHidden()
  const depois = await save(page)
  expect(depois.disco.palcos["calcada:nectar"]).toBeGreaterThanOrEqual(1)
  expect(depois.agua).toBeGreaterThan(neonAntes)
  expect(nivelDe(depois.disco)).toBe(2)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${PASTA}/4-subiu.png` })
  expect(erros).toEqual([])
})

test("palcos.topo: no alto das torres, nível 5, o menu do topo", async ({ page }) => {
  mkdirSync(PASTA, { recursive: true })
  const erros = await abrir(page, "palcos.topo")
  const palcos = page.locator(".l-palcos")
  await expect(palcos).toBeVisible({ timeout: 30_000 })
  await expect(palcos.locator(".l-palcos-nivel")).toHaveText(/nível 5 de 5/)
  await expect(palcos.locator("li.is-sel [data-palco=torres]")).toBeVisible()
  await expect(palcos.locator(".l-palcos-menu button[data-faixa=nectar]")).toBeVisible()
  await page.screenshot({ path: `${PASTA}/5-topo.png` })
  expect(erros).toEqual([])
})
