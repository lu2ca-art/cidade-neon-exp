import { expect, test } from "@playwright/test"
import type { HistoriaDisco } from "../app/linha/disco/historia"
import { MISSOES13, abrirPorta, alvo13, checklist13, concluir, passoAgora, pecaAgora13, portaAberta, recompensaDe, PORTAS } from "../app/linha/disco/portas"

// (T10) a missão do Alohan na quadra: a arte (o instrumental no B4TIDA) → o jogo (o basquete) → a porta
// (a quadra e o B4TIDA) → a recompensa. Primeiro a lógica, sem navegador; depois a missão de verdade.
const CARREIRA: HistoriaDisco = { fase: "carreira", holo: true, feitas13: ["dbee", "oficina"] }

test("a quadra: arte → jogo → porta, sem peça em breve", () => {
  let h: HistoriaDisco = { ...CARREIRA, missao: "quadra" }
  expect(MISSOES13.quadra.arte.como).toEqual({ t: "batida", clima: "ontem" })
  expect(MISSOES13.quadra.jogo.como?.t).toBe("basquete")
  expect(checklist13(h, "quadra").map((x) => x.estado)).toEqual(["agora", "depois", "depois"])
  expect(alvo13(h, "quadra")).toEqual({ chao: "quadra" })
  expect(pecaAgora13(h, "quadra")?.qual).toBe("arte")
  h = concluir(h, "quadra", "arte")
  expect(passoAgora(h, "quadra")).toBe("jogo")
  expect(pecaAgora13(h, "quadra")?.peca.como?.t).toBe("basquete")
  h = concluir(h, "quadra", "jogo")
  expect(passoAgora(h, "quadra")).toBe("porta")
  // a porta abre a quadra e o B4TIDA, e libera a faixa dele
  expect(portaAberta(h, "quadra")).toBe(false)
  h = abrirPorta(h, "quadra")
  expect(portaAberta(h, "quadra")).toBe(true)
  expect(portaAberta(h, "batida-estudio")).toBe(true)
  expect(h.guitar).toContain("ontem")
  expect(h.batida).toContain("ontem")
  expect(PORTAS.quadra.existe && PORTAS["batida-estudio"].existe).toBe(true)
  expect(recompensaDe("quadra").abriu.every((a) => !a.emBreve)).toBe(true)
  // as outras missões seguem como estavam (o Drew ainda pula a arte "em breve")
  expect(passoAgora({ ...CARREIRA, missao: "drew" }, "drew")).toBe("jogo")
})

test("a missão de verdade: o B4TIDA (toca e mexe) → o basquete (6 pontos) → a porta", async ({ page }) => {
  test.setTimeout(240_000)
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto("/linha?mapa=disco&parte=missao.quadra.batida")
  const entrar = page.locator(".l-btn-entrar")
  if (await entrar.isVisible({ timeout: 30_000 }).catch(() => false)) await entrar.click()
  // a arte: o estúdio abre dentro da janela do Alohan, já com a música; entregar trancado
  const janela = page.locator(".l-batida-missao")
  await expect(janela).toBeVisible({ timeout: 30_000 })
  const entregar = janela.locator("[data-entregar]")
  await expect(entregar).toBeDisabled()
  const estudio = page.frameLocator("iframe[title=B4TIDA]")
  await expect(estudio.locator(".es-faixa").first()).toBeVisible({ timeout: 30_000 })
  expect(await estudio.locator(".es-faixa").count()).toBeGreaterThanOrEqual(3)
  // tocar sozinho não basta; mexer na música também
  await estudio.locator(".es-play").click()
  await expect(janela.locator("i.is-ok")).toHaveCount(1)
  await expect(entregar).toBeDisabled()
  await estudio.locator(".es-ms").first().click()
  await expect(entregar).toBeEnabled()
  await entregar.click()
  await expect(janela).toHaveCount(0)
  // a arte ficou feita no save e o basquete segue direto
  await expect(page.locator(".gi-jogo")).toBeVisible({ timeout: 20_000 })
  const arte = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "{}").disco)
  expect(arte.passos13).toContain("quadra:arte")
  // o jogo: três cestas limpas (arrastar até a faixa da força perfeita e soltar) = 6 pontos
  const alvo = page.locator(".gi-jogo")
  const caixa = (await alvo.boundingBox())!
  const x = caixa.x + caixa.width / 2, y0 = caixa.y + caixa.height * 0.85
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(x, y0)
    await page.mouse.down()
    await page.mouse.move(x, y0 - caixa.height * 0.45 * 0.64, { steps: 6 })
    await page.mouse.up()
    await expect(page.locator(".gi-placar b")).toHaveText(String((i + 1) * 2), { timeout: 15_000 })
    await page.waitForTimeout(1200)
  }
  // o tempo acaba (45 s): "continuar" entrega a peça e a porta abre
  await expect(page.locator(".gi-fim")).toBeVisible({ timeout: 60_000 })
  await page.locator(".gi-btn").click()
  const rec = page.locator(".l-recompensa")
  await expect(rec).toBeVisible({ timeout: 20_000 })
  await expect(rec).toContainText("a quadra")
  await expect(rec).toContainText("BATIDA", { ignoreCase: true })
  const fim = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "{}").disco)
  expect(fim.feitas13).toContain("quadra")
  expect(fim.portas).toEqual(expect.arrayContaining(["quadra", "batida-estudio"]))
  expect(fim.guitar).toContain("ontem")
  expect(erros).toEqual([])
})
