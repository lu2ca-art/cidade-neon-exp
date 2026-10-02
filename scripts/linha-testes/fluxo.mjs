// joga o fluxo novo da Linha 222: chegada de Kombi → abertura+quiz → 1ª missão (pedido) →
// estrada → busca → entrega → prova → recompensa → gancho
import { chromium } from "playwright-core"

const EXE = process.env.CHROME ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = process.env.SHOTS ?? "./shots"
const BASE = process.env.BASE ?? "http://localhost:3222"
const ESCOLHA = Number(process.env.ESCOLHA ?? 0) // qual opção do quiz clicar sempre

const browser = await chromium.launch({
  executablePath: EXE,
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
})
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []
page.on("pageerror", (e) => erros.push("pageerror: " + e.message))
page.on("console", (m) => { if (m.type() === "error") erros.push("console: " + m.text().slice(0, 200)) })
await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
const shot = (n) => page.screenshot({ path: `${DIR}/${n}.png` })
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") || "{}"))

// avança a conversa até ter botão/opção/input/prova esperando
async function conversar(maxMs = 60000, opcao = ESCOLHA) {
  const t0 = Date.now()
  while (Date.now() - t0 < maxMs) {
    const corpo = page.locator(".l-chat-corpo")
    if (await corpo.count()) await corpo.click({ position: { x: 10, y: 10 } }).catch(() => {})
    await page.waitForTimeout(250)
    const ops = page.locator(".l-opcao")
    if (await ops.count()) { await ops.nth(Math.min(opcao, (await ops.count()) - 1)).click(); continue }
    const inp = page.locator(".l-input input")
    if (await inp.count()) { await inp.fill(process.env.NOME ?? "teste"); await page.click(".l-input button"); continue }
    if (await page.locator(".l-prova:not(.is-feita)").count()) return "prova"
    if (await page.locator(".l-tarefa-acoes").count()) return "tarefa"
    if (await page.locator(".l-btn-fim").count()) return "fim"
  }
  return "timeout"
}

await page.goto(`${BASE}/linha`)
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("cidade-neon-analytics-consent", "essential") })
await page.goto(`${BASE}/linha`)
await page.waitForTimeout(1500)
await page.getByText("Só o essencial").click().catch(() => {})
await page.click(".l-btn-entrar")
// a chegada de Kombi: pula o cinema e toca na mensagem da D-Bee
await page.waitForTimeout(4000)
await shot("01-chegada")
await page.click(".l-chegada-pular")
await page.click(".l-chegada-cel .l-notif")
console.log("abertura:", await conversar())
await shot("02-revelacao")
const s1 = await save()
console.log("estacao", s1.estacao, "perfil", s1.perfil, "fio", s1.fio?.join(">"), "completos", s1.completos)
console.log("botão fim:", await page.locator(".l-btn-fim").textContent())
await page.click(".l-btn-fim")
await page.waitForTimeout(600)
console.log("1ª missão:", await page.locator(".l-chat-quem b").textContent(), "→", await conversar())
await shot("03-tarefa")
const s2 = await save()
console.log("pausas", JSON.stringify(s2.pausas))

// home no meio da busca: a central mostra só o passo
await page.locator(".l-tarefa-acoes .l-btn-ghost").click()
await page.waitForTimeout(700)
await shot("04-home-busca")
console.log("banner:", (await page.locator(".l-os-banner").textContent().catch(() => "—")))

// estrada
await page.locator(".l-os-banner").click()
await page.waitForTimeout(5000)
await shot("05-estrada")
const marcos = await page.evaluate(() => window.__marcos?.())
console.log("marcos", JSON.stringify(marcos))
console.log("hud missao:", await page.locator(".l-hud-missao").textContent().catch(() => "—"))
console.log("hud rota:", await page.locator(".l-hud-falta").textContent().catch(() => "—"))
await page.evaluate(() => window.__sinal?.(200))
for (const m of marcos ?? []) {
  const via = m.via.replace("circuito:", "")
  await page.evaluate(([v, f]) => { window.__via(v, f - 0.004); window.__irPara(f - 0.004, 0) }, [via, m.f])
  await page.waitForTimeout(4500)
}
await shot("06-pegou")
const s3 = await save()
console.log("itens", s3.itens)
await page.waitForTimeout(2000)
console.log("destino hud:", await page.locator(".l-hud-rota").textContent().catch(() => "—"))
// sai da estrada e entrega pela conversa (o celular também serve)
await page.click(".l-hud-sair")
await page.waitForTimeout(800)
console.log("banner entrega:", await page.locator(".l-os-banner").textContent().catch(() => "—"))
await shot("07-home-entrega")
const id = s2.fio[0]
await page.evaluate((i) => window.dispatchEvent(new CustomEvent("x", { detail: i })), id)
await page.click(".l-os-dock .l-os-central")
await page.waitForTimeout(500)
await page.locator(".l-central li button").first().click()
await page.waitForTimeout(3000)
await shot("08-hudentrega")
// dev: pula direto pra estação — sai e abre pelo N3XO
await page.click(".l-hud-sair")
await page.waitForTimeout(600)
await page.locator(".l-os-dock button").nth(1).click()
await page.waitForTimeout(600)
await shot("09-n3xo")
await page.locator(".l-n3xo li button").filter({ hasNotText: "linha 222" }).filter({ hasNotText: "sabe ontem" }).first().click()
console.log("retomada:", await conversar())
await shot("10-prova")
// pula a prova (o botão aparece com 20s)
await page.waitForTimeout(21000)
await page.locator(".l-prova-pular").click().catch(() => {})
console.log("depois da prova:", await conversar())
await shot("11-recompensa")
await page.locator(".l-objeto").scrollIntoViewIfNeeded().catch(() => {})
await page.locator(".l-objeto").screenshot({ path: `${DIR}/11b-card.png` }).catch(() => {})
console.log("fim:", await page.locator(".l-btn-fim").textContent().catch(() => "—"))
const s4 = await save()
console.log("objetos", s4.objetos, "sinal", s4.sinal, "proxima ativa → botão acima")
console.log("ERROS", erros.slice(0, 10))
await browser.close()
