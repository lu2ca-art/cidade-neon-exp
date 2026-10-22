// o save de quem mede: por padrão o "livre" (quem já jogava, disco/historia.ts),
// pra o jogo abrir na cidade e a Kombi dirigir. Com save novo o jogo abre na
// história do começo (casinha parada, 65 draws) e os números não servem.
// SAVE=novo mede o começo de propósito.
export const comSave = () => (process.env.SAVE ?? "livre") !== "novo"

export async function semear(page) {
  if (!comSave()) return
  await page.addInitScript(() => localStorage.setItem("cn-linha-222", JSON.stringify({ versao: 2, nome: "Medir", disco: { fase: "livre", holo: true } })))
}

// pula as cenas (diálogo, escolhas, fim) até não ter cena por ~5 s
async function pula(page, max) {
  let vazio = 0
  for (let i = 0; i < max && vazio < 8; i++) {
    if (!(await page.locator(".l-cena").count())) { vazio++; await page.waitForTimeout(700); continue }
    vazio = 0
    if (await page.locator(".l-cena-fim button").count()) await page.locator(".l-cena-fim button").first().click({ force: true }).catch(() => {})
    else if (await page.locator(".l-cena-escolhas button").count()) await page.locator(".l-cena-escolhas button").first().click({ force: true }).catch(() => {})
    else await page.mouse.click(640, 400)
    await page.waitForTimeout(500)
  }
}

// depois do "entrar": pula as cenas, dá partida e segura ArrowUp.
// Sem save "livre", só espera `espera` ms e acelera (o comportamento antigo).
export async function entrarDirigindo(page, espera = 12_000) {
  if (!comSave()) { await page.waitForTimeout(espera); await page.keyboard.down("ArrowUp"); return }
  await page.waitForTimeout(8_000)
  await pula(page, 60)
  await page.getByText(/dar\s*partida/i).first().click({ force: true, timeout: 5_000 }).catch(() => {})
  await page.keyboard.down("ArrowUp")
  await page.waitForTimeout(3_000)
  await pula(page, 200)
  await page.waitForTimeout(8_000)
  if (await page.locator(".l-cena").count()) console.log("(aviso: ainda tem cena aberta antes de medir)")
}
