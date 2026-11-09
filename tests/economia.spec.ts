import { expect, test } from "@playwright/test"
import { VAZIO, type Save } from "../app/linha/estado"
import { CATALOGO, VERSAO_ECONOMIA, cacheDoShow, comprar, comprarMelhoria, ganhar, gastar, migrarEconomia, saldo, tem } from "../app/linha/economia"
import { MELHORIAS, PAGA, PRECO_DISCO, ROUPAS } from "../app/linha/economia-rascunho"
import { IDS13, recompensaDe } from "../app/linha/disco/portas"

// (T03) a economia: ganhar (missão e show), gastar (loja e oficina) e o save antigo migrado
const novo = (x: Partial<Save> = {}): Save => ({ ...VAZIO, economia: VERSAO_ECONOMIA, ...x })

test("ganhar: a missão e o show pagam Água$", () => {
  // a recompensa de cada missão vem do rascunho da economia
  for (const id of IDS13) expect(recompensaDe(id).neon).toBe(PAGA.missao[id])
  let s = ganhar(novo(), recompensaDe("drew").neon)
  expect(saldo(s)).toBe(PAGA.missao.drew)
  // o show: nota boa e fama pagam mais; nunca negativo; sempre inteiro
  expect(cacheDoShow(0, 0)).toBe(PAGA.show.fixo)
  expect(cacheDoShow(1, 80)).toBeGreaterThan(cacheDoShow(1, 0))
  expect(cacheDoShow(1, 0)).toBeGreaterThan(cacheDoShow(0.2, 0))
  expect(Number.isInteger(cacheDoShow(0.37, 41))).toBe(true)
  s = ganhar(s, cacheDoShow(1, 100))
  expect(saldo(s)).toBe(PAGA.missao.drew + cacheDoShow(1, 100))
  // ganhar zero ou negativo não mexe
  expect(ganhar(s, -50)).toBe(s)
  // a água é outra conta
  expect(saldo(ganhar(s, 7, "agua"), "agua")).toBe(7)
})

test("gastar: a loja vende discos, instrumentos, carros e roupas", () => {
  const cats = new Set(CATALOGO.map((i) => i.cat))
  expect([...cats].sort()).toEqual(["carro", "disco", "instrumento", "roupa"])
  let s = novo({ agua: 300 })
  // o disco vai pro toca-discos da Kombi (save.discos)
  const disco = CATALOGO.find((i) => i.cat === "disco")!
  let r = comprar(s, disco.id)
  expect(r.ok).toBe(true)
  if (!r.ok) return
  s = r.save
  expect(saldo(s)).toBe(300 - PRECO_DISCO)
  expect(s.discos).toEqual([disco.id.slice(6)])
  expect(tem(s, disco.id)).toBe(true)
  // não compra duas vezes
  expect(comprar(s, disco.id)).toEqual({ ok: false, motivo: "ja-tem" })
  // uma roupa vai pras compras
  const roupa = CATALOGO.find((i) => i.cat === "roupa")!
  r = comprar(s, roupa.id)
  expect(r.ok).toBe(true)
  if (!r.ok) return
  s = r.save
  expect(s.compras).toContain(roupa.id)
  // sem grana, nada muda
  const carro = CATALOGO.filter((i) => i.cat === "carro").sort((a, b) => b.preco - a.preco)[0]
  expect(comprar(s, carro.id)).toEqual({ ok: false, motivo: "sem-grana" })
  expect(gastar(s, saldo(s) + 1)).toBeNull()
  expect(comprar(s, "carro:nao-existe")).toEqual({ ok: false, motivo: "nao-existe" })
})

test("gastar: o mecânico é pago em água, só desempenho", () => {
  const m = MELHORIAS[0]
  let s = novo({ agua: m.agua + 7 })
  const r = comprarMelhoria(s, m.id)
  expect(r.ok).toBe(true)
  if (!r.ok) return
  s = r.save
  expect(saldo(s)).toBe(7) // (§15) a mesma moeda paga a oficina
  expect(s.disco?.mods).toContain(m.id)
  expect(comprarMelhoria(s, m.id)).toEqual({ ok: false, motivo: "ja-tem" })
  // nada estético: a oficina não vende pintura
  expect(comprarMelhoria(novo({ agua: 999 }), "pintura")).toEqual({ ok: false, motivo: "nao-existe" })
})

test("save antigo: migra sem perder nada", () => {
  const antigo = { ...VAZIO, economia: undefined, neon: 12.7, agua: -3, popularidade: 140, discos: ["rock", "rock", "acervo", "pop"] } as unknown as Save
  const s = migrarEconomia(antigo, 40)
  expect(s.agua).toBe(53) // 13 do neon$ + os 40 do Guitar Driver guardados fora (a água quebrada vale 0)
  expect("neon" in s).toBe(false)
  expect(s.popularidade).toBe(100)
  expect(s.discos).toEqual(["rock", "pop"])
  expect(s.compras).toEqual([])
  expect(s.economia).toBe(VERSAO_ECONOMIA)
  // migrado não migra de novo
  expect(migrarEconomia(s)).toBe(s)
})

test("save antigo: o neon$ soma na água uma vez só (§15)", () => {
  const v1 = { ...VAZIO, economia: 1, neon: 300, agua: 45 } as Save
  const s = migrarEconomia(v1)
  expect(s.agua).toBe(345)
  expect("neon" in s).toBe(false)
  expect(s.economia).toBe(VERSAO_ECONOMIA)
  // de novo (o carregar roda toda vez), e com o JSON gravado: não soma mais
  expect(migrarEconomia(s).agua).toBe(345)
  expect(migrarEconomia(JSON.parse(JSON.stringify(s))).agua).toBe(345)
  // a conta do Guitar Driver guardada fora entra no mesmo saldo
  expect(migrarEconomia(s, 30).agua).toBe(375)
  // aba velha que gravou neon num save já migrado: soma, sem perder
  expect(migrarEconomia({ ...s, neon: 5 }).agua).toBe(350)
})

test("save antigo no navegador: o carregar migra e a loja compra", async ({ page }) => {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => {
    localStorage.setItem("cidade-neon-analytics-consent", "essential")
    if (sessionStorage.getItem("semeado")) return
    sessionStorage.setItem("semeado", "1")
    // um save de antes da economia: discos repetidos, neon quebrado e a grana do Guitar Driver fora do jogo
    localStorage.setItem("cn-linha-222", JSON.stringify({ versao: 2, casa: true, neon: 99.6, agua: 5, discos: ["rock", "rock"], disco: { fase: "carreira", holo: true } }))
    localStorage.setItem("cn-gd-neon", "30")
  })
  await page.goto("/linha?mapa=disco")
  await page.waitForTimeout(3000)
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "null"))
  expect(s.agua).toBe(135)
  expect("neon" in s).toBe(false)
  expect(s.discos).toEqual(["rock"])
  expect(s.economia).toBe(VERSAO_ECONOMIA)
  expect(s.disco.fase).toBe("carreira")
  expect(await page.evaluate(() => localStorage.getItem("cn-gd-neon"))).toBeNull()
  expect(erros).toEqual([])
})

test("?parte=loja: a loja abre, troca de aba e compra uma roupa", async ({ page }) => {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto("/linha?mapa=disco&parte=loja")
  const loja = page.locator(".l-loja")
  await expect(loja).toBeVisible({ timeout: 30_000 })
  await expect(page.locator(".l-loja-saldo")).toContainText("420")
  await page.locator(".l-loja-abas button", { hasText: "roupas" }).click()
  await page.locator('[data-item="roupa:bone"]').click()
  await page.locator(".l-loja-btn.is-comprar").click()
  await expect(page.locator(".l-loja-ok")).toBeVisible()
  await page.waitForTimeout(500)
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "null"))
  expect(s.compras).toContain("roupa:bone")
  expect(s.agua).toBe(460 - ROUPAS.find((r) => r.id === "bone")!.preco)
  await page.locator(".l-loja-fechar").click()
  await page.locator(".l-loja-abas button", { hasText: "carros" }).click()
  await page.screenshot({ path: "test-results/economia-loja-carros.png" })
  expect(erros).toEqual([])
})
