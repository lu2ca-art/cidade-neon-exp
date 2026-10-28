import { expect, test } from "@playwright/test"

// ?parte= abre o jogo num ponto da jornada (parteTeste.ts): cada parte carrega sem erro
// e com o save daquela parte
const PARTES: [string, string | null][] = [
  ["minhoca", null], ["casa", "casa"], ["dunas", "dunas"], ["bar", "bar"], ["oficina", "oficina"],
  ["nectar", "nectar"], ["carreira.feira", "carreira"], ["missao.sexta", "carreira"], ["missao.chuva", "carreira"], ["livre", "livre"],
  // (T02) as 13 missões: o meio da carreira e uma de cada jeito (peça na rua, prova, Guitar ao vivo, só "em breve", subúrbio)
  ["carreira.meio", "carreira"], ["missao.nizzy", "carreira"], ["missao.xeriff", "carreira"], ["missao.lu2ca", "carreira"], ["missao.ella", "carreira"], ["missao.quadra", "carreira"],
]

for (const [parte, fase] of PARTES) {
  test(`?parte=${parte}`, async ({ page }) => {
    const erros: string[] = []
    page.on("pageerror", (e) => erros.push(e.message))
    await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
    await page.goto(`/linha?mapa=disco&parte=${parte}`)
    await page.waitForTimeout(3000)
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "null"))
    if (fase) expect(save?.disco?.fase).toBe(fase)
    expect(page.url()).not.toContain("parte=")
    const entrar = page.locator(".l-btn-entrar")
    if (await entrar.isVisible().catch(() => false)) { await entrar.click(); await page.waitForTimeout(4000) }
    expect(erros).toEqual([])
  })
}
