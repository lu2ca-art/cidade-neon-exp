import { expect, test, type Page } from "@playwright/test"
import type { HistoriaDisco } from "../app/linha/disco/historia"
import { CHAO_FIXOS, CHAO_LUGARES } from "../app/linha/disco/historia"
import { LIXO, MECANICO, OFICINA_CFG, PLANO, alvoOficina, pagamentoMotor, passoOficina, pecasFaltando, sonsDoContador } from "../app/linha/disco/oficina"
import { PECAS_CHAO } from "../app/linha/disco/achados"
import { abrirPorta, checklist13, concluir, feita13, portaAberta } from "../app/linha/disco/portas"
import { PAGINAS } from "../app/linha/paginas"
import { LUGARES } from "../app/linha/lugares"
import { saveDoJogo } from "./saveDoJogo"

// (T04, T09) a oficina só no subúrbio e a missão dela: a cena (só o plano) → a
// reciclagem (a arte; T57: catar o lixo espalhado no lixão, no mundo, e a
// oficina monta) → a goteira (o jogo) → o mecânico pago em água → a porta (as
// melhorias da Kombi)

test("T04: a oficina não está mais na cidade nem vende pintura", () => {
  expect(PAGINAS.map((p) => p.id)).not.toContain("oficina")
  expect(LUGARES.oficina.soChao).toBe(true)
  expect(CHAO_FIXOS).toContain("oficina")
})

test("T09: os passos da missão, na ordem, e pra onde cada um manda", () => {
  let h: HistoriaDisco = { fase: "oficina", holo: true, passos13: ["dbee:arte", "dbee:jogo"] }
  expect(passoOficina(h)).toBe("chegar")
  expect(alvoOficina(h)).toBe("oficina")
  h = { ...h, oficina: { cena: true } }
  // (T57) catar: o lixo está espalhado no lixão; o alvo é a próxima peça da rota
  expect(passoOficina(h)).toBe("catar")
  expect(alvoOficina(h)).toBe("painel")
  expect(checklist13(h, "oficina").map((x) => x.estado)).toEqual(["agora", "depois", "depois"])
  h = { ...h, oficina: { ...h.oficina, pecas: ["painel", "ventilador"] } }
  expect(pecasFaltando(h)).toEqual(["lavadora", "radio"])
  expect(alvoOficina(h)).toBe("lavadora")
  h = { ...h, oficina: { ...h.oficina, pecas: [...PECAS_CHAO] } }
  // com as quatro: de volta pra oficina, que monta (a arte)
  expect(passoOficina(h)).toBe("reciclar")
  expect(alvoOficina(h)).toBe("oficina")
  h = concluir(h, "oficina", "arte")
  expect(passoOficina(h)).toBe("goteira")
  expect(alvoOficina(h)).toBe("goteira")
  h = concluir(h, "oficina", "jogo")
  expect(passoOficina(h)).toBe("montar")
  expect(alvoOficina(h)).toBe("oficina")
  h = abrirPorta(h, "oficina")
  expect(feita13(h, "oficina")).toBe(true)
  expect(portaAberta(h, "kombi-melhorias")).toBe(true)
  expect(passoOficina(h)).toBe("feita")
  expect(alvoOficina(h)).toBeNull()
  // os achados ficam fora dos lugares fixos (o mapa, os feixes do drone)
  for (const id of [...PECAS_CHAO, "goteira"] as const) expect(CHAO_FIXOS).not.toContain(id)
  // save de antes do T57 (o painel já achado no T09, sem pecas): o painel conta
  expect(pecasFaltando({ fase: "oficina", holo: true, oficina: { cena: true, painel: true } })).not.toContain("painel")
})

test("T09: o mecânico é pago em água, e o contador pinga a cada 10", () => {
  // a água da D-Bee paga o serviço inteiro (J2: 18)
  expect(OFICINA_CFG.aguaDaDbee).toBeGreaterThanOrEqual(OFICINA_CFG.precoMotor)
  expect(pagamentoMotor(OFICINA_CFG.aguaDaDbee)).toEqual({ de: 60, para: 0, pago: 60, falta: 0 })
  expect(pagamentoMotor(85)).toEqual({ de: 85, para: 25, pago: 60, falta: 0 })
  // faltou água: ele monta com o que tem (nada trava)
  expect(pagamentoMotor(23)).toEqual({ de: 23, para: 0, pago: 23, falta: 37 })
  expect(pagamentoMotor(-4).pago).toBe(0)
  // 60 → 0: passa por 50, 40, 30, 20, 10 e 0 (J2: 19)
  expect(sonsDoContador(60, 0)).toBe(6)
  expect(sonsDoContador(85, 25)).toBe(6)
  expect(sonsDoContador(5, 0)).toBe(1)
  // (T57) o lixo do lixão: as quatro peças, cada uma vira uma peça do plano, e cada uma tem lugar no chão
  expect(LIXO.map((l) => l.id).sort()).toEqual([...PECAS_CHAO].sort())
  expect(PLANO).toHaveLength(4)
  for (const l of LIXO) expect(CHAO_LUGARES[l.id]).toBeTruthy()
  expect(MECANICO.nome.length).toBeGreaterThan(0)
  expect(CHAO_LUGARES.painel && CHAO_LUGARES.goteira).toBeTruthy()
})

// ── no navegador: a missão inteira pelos links ?parte=oficina.* ──
// (04/11) o ?parte= grava no save de teste: lê o save que a aba está usando
const saveDe = saveDoJogo
const chegar = (page: Page, id: string) => page.evaluate((x) => (window as unknown as { __cnChao: (id: string) => void }).__cnChao(x), id)

async function abrir(page: Page, parte: string) {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto(`/linha?mapa=disco&parte=${parte}`)
  await page.waitForTimeout(2500)
  const entrar = page.locator(".l-btn-entrar")
  if (await entrar.isVisible().catch(() => false)) { await entrar.click(); await page.waitForTimeout(3000) }
  await page.waitForFunction(() => typeof (window as unknown as { __cnChao?: unknown }).__cnChao === "function")
  return erros
}

// (T57) pegar as peças no deserto completa a reciclagem: a Kombi passa por cada
// uma (a mesma checagem da Corrida que vale dirigindo ou de patins; o teste só
// põe a Kombi no lugar) e, de volta na oficina, ela monta
const kombiEm = (page: Page, x: number, z: number) => page.evaluate(([x, z]) => {
  const j = (window as unknown as { __jogo: { wx: number; wz: number; v: number; ar: boolean } }).__jogo
  j.wx = x; j.wz = z; j.v = 0; j.ar = false
}, [x, z])
test("?parte=oficina.catar: pegar as peças no lixão completa a reciclagem", async ({ page }) => {
  test.setTimeout(180_000)
  const erros = await abrir(page, "oficina.catar&medir")
  await page.waitForFunction(() => !!(window as unknown as { __jogo?: unknown }).__jogo)
  // as quatro estão na cena, espalhadas
  await expect.poll(() => page.evaluate(() => {
    const c = (window as unknown as { __cena: { getObjectByName: (n: string) => unknown } }).__cena
    return ["painel", "lavadora", "ventilador", "radio"].filter((id) => !!c.getObjectByName(`peca-${id}`)).length
  }), { timeout: 30_000 }).toBe(4)
  for (const [i, l] of LIXO.entries()) {
    const p = CHAO_LUGARES[l.id]
    await kombiEm(page, p.x + 4, p.z + 3)
    await expect.poll(async () => ((await saveDe(page)).disco.oficina?.pecas ?? []).length, { timeout: 20_000 }).toBe(i + 1)
    // pegou: sumiu da cena
    await expect.poll(() => page.evaluate((id) => !!(window as unknown as { __cena: { getObjectByName: (n: string) => unknown } }).__cena.getObjectByName(`peca-${id}`), l.id)).toBe(false)
  }
  const s0 = await saveDe(page)
  expect(s0.disco.oficina.painel).toBe(true)
  expect(s0.disco.passos13 ?? []).not.toContain("oficina:arte")
  // de volta na oficina: ela monta (sem toque, só o "seguir" no fim)
  const of = CHAO_LUGARES.oficina
  await kombiEm(page, of.x + 6, of.z + 6)
  const monta = page.getByRole("dialog", { name: "a oficina monta" })
  await expect(monta).toBeVisible({ timeout: 20_000 })
  await monta.getByRole("button", { name: "seguir →" }).click({ timeout: 20_000 })
  await expect(monta).toBeHidden()
  // (leveza B) o save vai pro localStorage com folga (até 3 s depois da mudança): espera ele
  await expect.poll(async () => (await saveDe(page)).disco.passos13 ?? [], { timeout: 15_000 }).toContain("oficina:arte")
  expect(erros).toEqual([])
})

test("?parte=oficina.goteira: o jogo", async ({ page }) => {
  const erros = await abrir(page, "oficina.goteira")
  // a goteira: o balde vai pra coluna da gota até o tanque encher
  await chegar(page, "goteira")
  const got = page.getByRole("dialog", { name: "a goteira" })
  await expect(got).toBeVisible()
  const fim = Date.now() + 60_000
  while (Date.now() < fim) {
    if (await got.getByRole("button", { name: "levar a água →" }).isVisible().catch(() => false)) break
    const col = await got.locator(".l-oficina-coluna").evaluateAll((els) => els.findIndex((e) => e.querySelector(".l-oficina-gota")))
    if (col >= 0) await got.locator(".l-oficina-coluna").nth(col).click()
    await page.waitForTimeout(150)
  }
  await got.getByRole("button", { name: "levar a água →" }).click()
  await expect.poll(async () => (await saveDe(page)).disco.passos13 ?? [], { timeout: 15_000 }).toContain("oficina:jogo")
  const s = await saveDe(page)
  expect(s.disco.oficina.tanque).toBe(OFICINA_CFG.gotasDaGoteira)
  expect(erros).toEqual([])
})

test("?parte=oficina.pagar: o mecânico pago em água e a porta das melhorias (calada)", async ({ page }) => {
  const erros = await abrir(page, "oficina.pagar")
  expect((await saveDe(page)).agua).toBe(60)
  await chegar(page, "oficina")
  const pg = page.getByRole("dialog", { name: "o pagamento do mecânico" })
  await expect(pg).toBeVisible()
  // a água sai do save na hora; o contador desce na tela até 0
  await expect.poll(async () => (await saveDe(page)).agua, { timeout: 15_000 }).toBe(0)
  // (no GitHub, sem placa de vídeo, os primeiros segundos depois de chegar são lentos:
  // o contador leva ~3 s no Mac e passou de 10 s lá; a regra é a mesma, só a folga cresce)
  await expect(pg.locator("[data-agua]")).toHaveAttribute("data-agua", "0", { timeout: 30_000 })
  await pg.getByRole("button", { name: "montar o motor →" }).click()
  await expect(pg).toBeHidden()
  // (notas 03/11) a porta da oficina abre calada: sem a tela "a porta abriu" por
  // cima do jogo, a recompensa (as melhorias da Kombi) entra direto no save
  // (leveza B: o save grava com folga, até 3 s depois)
  await expect.poll(async () => (await saveDe(page)).disco.fase, { timeout: 15_000 }).toBe("subir")
  const s = await saveDe(page)
  expect(s.disco.feitas13).toContain("oficina")
  expect(s.disco.portas).toContain("kombi-melhorias")
  expect(s.disco.mods).toEqual(expect.arrayContaining(["solar", "turbo", "propulsao"]))
  await expect(page.getByRole("dialog", { name: "a porta abriu" })).toHaveCount(0)
  expect(erros).toEqual([])
})
