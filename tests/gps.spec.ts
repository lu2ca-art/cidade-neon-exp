import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

// (T42) O GPS e o mapa. Precisa de ?medir (expõe __jogo e __M no build de produção).
// 1) o GPS (a barra em cima) aponta pro alvo da missão;
// 2) o checklist pelo mapa (o anel e o drone) mostra só o próximo passo;
// 3) a viagem rápida leva ao minijogo; os lugares de uma pista ficam espaçados por igual;
// 4) o automático infinito anda sozinho sem parar.
const PASTA = "test-results/gps"

type W = { __jogo: Record<string, number | boolean | undefined>; __M: { onde: (k: string) => { via: number; u: number } | null; vias: { L: number }[]; pistas: { nome: string; ida: number }[]; chaoEm: (x: number, z: number) => number } }

async function entrar(page: Page, parte: string) {
  await page.addInitScript(() => { localStorage.setItem("cidade-neon-analytics-consent", "essential") })
  const r = await page.goto(`/linha?mapa=disco&caderno&parte=${parte}&medir`)
  expect(r?.status()).toBe(200)
  const bt = page.locator(".l-btn-entrar")
  await expect(bt).toBeVisible({ timeout: 60_000 })
  await bt.click()
  await expect(bt).toBeHidden({ timeout: 30_000 })
  await page.waitForFunction(() => !!(window as unknown as { __jogo?: unknown }).__jogo, null, { timeout: 60_000 })
  // pula as cenas que aparecerem (fala, escolhas)
  for (let i = 0; i < 30; i++) {
    if (!(await page.locator(".l-cena").count())) break
    const fim = page.locator(".l-cena-fim button, .l-cena-escolhas button")
    if (await fim.count()) await fim.first().click({ force: true }).catch(() => {})
    else await page.mouse.click(200, 400)
    await page.waitForTimeout(400)
  }
  // responde as conversas do N3XO que abrirem por cima (cobrem o mapa)
  for (let i = 0; i < 16; i++) {
    const op = page.locator(".l-painel-ops button, .l-opcoes button")
    if (!(await op.count())) { if (i > 3) break; await page.waitForTimeout(700); continue }
    await op.first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(900)
  }
  await page.getByText(/dar\s*partida/i).first().click({ force: true, timeout: 3_000 }).catch(() => {})
  await page.waitForTimeout(800)
}

// o ângulo esperado (graus; negativo = à esquerda): a mesma conta de um GPS de bússola
const esperado = (px: number, pz: number, rumo: number, ax: number, az: number) => {
  const dif = Math.atan2(ax - px, az - pz) - rumo
  return (-Math.atan2(Math.sin(dif), Math.cos(dif)) * 180) / Math.PI
}

test("o GPS aponta pro alvo da missão", async ({ page }) => {
  test.setTimeout(240_000)
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  // a oficina do subúrbio: o alvo é o lugar do chão (CHAO_LUGARES.oficina)
  await entrar(page, "oficina")
  const alvo = page.locator(".l-gps-alvo")
  await expect(alvo.locator("svg")).toBeVisible({ timeout: 20_000 })
  const OF = { x: -560, z: -626 }
  // a Kombi parada no chão, 200 m de um lado do alvo, girando em volta de si
  for (const [dx, dz, rumo] of [[0, 200, Math.PI], [0, 200, Math.PI + 0.9], [0, 200, Math.PI - 0.6], [150, 0, Math.PI / 2], [150, 0, -Math.PI / 2]] as const) {
    const px = OF.x + dx, pz = OF.z + dz
    // uma tecla qualquer: "tem gente dirigindo" (o piloto de 6 s não gira a Kombi no meio da conta)
    await page.keyboard.press("Shift")
    await page.evaluate(({ px, pz, rumo }) => {
      const w = window as unknown as W
      Object.assign(w.__jogo, { voo: true, ar: false, propulsou: true, wx: px, wz: pz, y: w.__M.chaoEm(px, pz), vy: 0, rumo, v: 0, steer: 0, encaixar: false })
    }, { px, pz, rumo })
    await page.waitForTimeout(400)
    // o ângulo do GPS e a pose da Kombi no mesmo instante
    const agora = await page.evaluate(() => { const j = (window as unknown as W).__jogo; return { ang: Number(document.querySelector<HTMLElement>(".l-gps-alvo")!.dataset.ang), x: j.wx as number, z: j.wz as number, rumo: j.rumo as number } })
    const ang = agora.ang
    const exp = esperado(agora.x, agora.z, agora.rumo, OF.x, OF.z)
    console.log(`rumo ${rumo.toFixed(2)}: GPS ${ang}°, esperado ${exp.toFixed(1)}°`)
    expect(Math.abs(ang - exp), `o ícone no ângulo do alvo (rumo ${rumo.toFixed(2)})`).toBeLessThan(4)
    // o ícone na barra: no meio quando mira, pro lado certo quando não
    const x = await alvo.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)
    if (Math.abs(exp) < 6) { expect(Math.abs(x)).toBeLessThan(12); await expect(alvo).toHaveClass(/is-mira/) }
    else expect(Math.sign(x), "o ícone do lado do alvo").toBe(Math.sign(exp))
    if (Math.abs(exp) > 100) await expect(alvo).toHaveClass(/is-borda/)
  }
  await page.screenshot({ path: `${PASTA}/1-gps.png` })
  expect(erros).toEqual([])
})

test("o checklist pelo mapa mostra só o próximo passo", async ({ page }) => {
  test.setTimeout(240_000)
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await entrar(page, "missao.drew")
  // o 1º toque no mapa abre a checklist no anel: um passo só
  await page.locator("button.l-mapa-mini").click({ force: true })
  const sals = page.locator(".l-holo-salsicha li")
  await expect(sals.first()).toBeAttached({ timeout: 10_000 })
  expect(await sals.count()).toBe(1)
  const passo = (await sals.first().innerText()).replace(/^▸/, "").split(" · ")[0].trim()
  // o 2º toque: o mapa de longe (o drone). Abre com o painel da missão (a checklist: um passo só)
  // ou, fechado o painel, com o cartão do próximo passo
  await page.locator("button.l-mapa-mini").click({ force: true })
  await expect(page.locator(".l-drone")).toBeVisible({ timeout: 10_000 })
  const lis = page.locator(".l-drone .l-mapa-missoes .l-missoes-check li")
  const botao = page.locator(".l-drone-botoes button[aria-label='as missões']")
  if (!(await lis.count())) await botao.click()
  await expect(lis.first()).toBeVisible()
  expect(await lis.count()).toBe(1)
  await expect(lis.first()).toContainText(passo)
  await page.screenshot({ path: `${PASTA}/2a-drone-painel.png` })
  await botao.click()
  const card = page.locator(".l-drone .l-proximo")
  await expect(card).toBeVisible({ timeout: 10_000 })
  await expect(card.locator("b")).toContainText(passo)
  await expect(card.locator("small")).toContainText(/\d de \d/)
  await page.screenshot({ path: `${PASTA}/2b-drone-proximo.png` })
  expect(erros).toEqual([])
})

test("a viagem rápida leva ao minijogo; os lugares espalhados por igual", async ({ page }) => {
  test.setTimeout(240_000)
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await entrar(page, "carreira.meio")
  // os lugares de cada pista: a distância entre um e o próximo é sempre a mesma
  const passos = await page.evaluate(() => {
    const M = (window as unknown as W).__M
    const chaves = ["lugar:bar", "lugar:casa-drewboy", "lugar:balada", "lugar:beco", "lugar:escondido", "lugar:topo", "lugar:casa-shows", "lugar:posto", "lugar:palco-swav", "lugar:palco-nectar", "lugar:palco-rollercoaster", "lugar:palco-copo", "lugar:plataforma", "pagina:fliperama", "pagina:galeria", "pagina:ginasio", "pagina:shows", "parque", "bomba:bomba-mirante", "bomba:bomba-arena", "bomba:bomba-avenida", ...M.pistas.map((p) => `missao:${p.nome}`)]
    const por = new Map<number, Set<number>>()
    for (const k of chaves) { const o = M.onde(k); if (!o) continue; if (!por.has(o.via)) por.set(o.via, new Set()); por.get(o.via)!.add(Math.round(o.u)) }
    return [...por.entries()].map(([via, us]) => { const s = [...us].sort((a, b) => a - b); return { L: M.vias[via].L, d: s.slice(1).map((u, i) => u - s[i]) } })
  })
  for (const p of passos) for (const d of p.d) expect(Math.abs(d - p.d[0]), "o mesmo espaço entre os lugares da pista").toBeLessThan(3)
  expect(passos.some((p) => p.d.length >= 3), "uma pista com vários lugares").toBe(true)

  // o drone (o mapa de longe) e a viagem rápida pro primeiro minijogo da lista
  await page.locator("button.l-mapa-mini").click({ force: true })
  await expect(page.locator(".l-drone")).toBeVisible({ timeout: 10_000 })
  const painel = page.locator(".l-drone .l-mapa-missoes")
  if (await painel.count()) await page.locator(".l-drone-botoes button[aria-label='as missões']").click()
  const bt = page.locator(".l-drone .l-rapidas button").first()
  await expect(bt).toBeVisible({ timeout: 10_000 })
  const chave = (await bt.getAttribute("data-chave"))!
  const nome = (await bt.locator("b").innerText()).trim()
  await page.screenshot({ path: `${PASTA}/3-rapidas.png` })
  await bt.click()
  await expect(page.locator(".l-drone")).toBeHidden({ timeout: 10_000 })
  await page.waitForTimeout(300)
  const r = await page.evaluate((chave) => { const w = window as unknown as W; return { j: { via: w.__jogo.via as number, u: w.__jogo.u as number }, o: w.__M.onde(chave)! } }, chave)
  console.log(`viagem rápida: ${nome} (${chave}) → via ${r.j.via}, ${Math.round(r.o.u - r.j.u)} m antes`)
  expect(r.j.via, `na pista de ${nome}`).toBe(r.o.via)
  expect(r.o.u - r.j.u, `logo antes de ${nome}`).toBeGreaterThan(0)
  expect(r.o.u - r.j.u).toBeLessThan(90)
  // o GPS aponta pro lugar (a marca)
  await expect(page.locator(".l-gps-barra")).toHaveAttribute("aria-label", new RegExp(nome))
  expect(erros).toEqual([])
})

test("o automático infinito anda sozinho sem parar", async ({ page }) => {
  test.setTimeout(240_000)
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await entrar(page, "livre")
  const auto = page.locator(".l-gps-auto")
  await expect(auto).toBeVisible({ timeout: 20_000 })
  await auto.click()
  await expect(auto).toHaveAttribute("aria-pressed", "true")
  // 12 s de jogo: anda o tempo todo (sem tocar em nada)
  const r = await page.evaluate(() => new Promise<{ seg: number; anda: number; vMin: number }>((pronto) => {
    const j = (window as unknown as W).__jogo
    const t0 = j.tempo as number, p0 = performance.now()
    let anda = 0, u = j.u as number, via = j.via as number, vMin = Infinity
    const passo = () => {
      if ((j.via as number) === via) anda += Math.abs((j.u as number) - u)
      u = j.u as number; via = j.via as number
      const seg = (j.tempo as number) - t0
      if (seg > 4) vMin = Math.min(vMin, j.v as number)
      if (seg < 12 && performance.now() - p0 < 120_000) requestAnimationFrame(passo); else pronto({ seg, anda, vMin })
    }
    passo()
  }))
  console.log(`infinito: ${r.anda.toFixed(0)} m em ${r.seg.toFixed(1)} s de jogo, v mínima ${r.vMin.toFixed(1)} m/s`)
  expect(r.anda / r.seg, "anda sozinha").toBeGreaterThan(8)
  expect(r.vMin, "não para").toBeGreaterThan(5)
  await auto.click()
  await expect(auto).toHaveAttribute("aria-pressed", "false")
  expect(erros).toEqual([])
})
