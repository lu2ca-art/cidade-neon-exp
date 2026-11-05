import { expect, test } from "@playwright/test"
import { saveDoJogo, saveReal } from "./saveDoJogo"

// ?parte= abre o jogo num ponto da jornada (parteTeste.ts): cada parte carrega sem erro
// e com o save daquela parte. (notas 04/11, chaveSave.ts) o save pronto vai pro save
// de TESTE: o save de verdade do jogador fica intocado
const PARTES: [string, string | null][] = [
  ["minhoca", null], ["casa", "casa"], ["dunas", "dunas"], ["bar", "bar"], ["oficina", "oficina"],
  ["nectar", "nectar"], ["carreira.feira", "carreira"], ["missao.sexta", "carreira"], ["missao.chuva", "carreira"], ["livre", "livre"],
  // (T02) as 13 missões: o meio da carreira e uma de cada jeito (peça na rua, prova, Guitar ao vivo, só "em breve", subúrbio)
  ["carreira.meio", "carreira"], ["missao.nizzy", "carreira"], ["missao.xeriff", "carreira"], ["missao.lu2ca", "carreira"], ["missao.lu2ca.letra", "carreira"], ["missao.lu2ca.show", "carreira"], ["missao.ella", "carreira"], ["missao.ella.casa", "carreira"], ["missao.quadra", "carreira"], ["missao.quadra.batida", "carreira"], ["missao.quadra.basquete", "carreira"], ["missao.tuneis.trincheiras", "carreira"],
  // (T03) a loja aberta, com grana
  ["loja", "carreira"],
  // (T09) a missão da oficina, passo a passo, e a lojinha das melhorias depois dela
  ["oficina.bancada", "oficina"], ["oficina.painel", "oficina"], ["oficina.goteira", "oficina"], ["oficina.pagar", "oficina"], ["oficina.loja", "subir"],
  // (T20) os palcos: o menu aberto (o começo e o topo)
  ["palcos", "carreira"], ["palcos.topo", "carreira"],
  // (T37) a chegada de um login (save existente): o túnel e a casinha
  ["chegada", "carreira"],
  // (T07) a entrega do holo (a cena da casa a partir dela) e o tutorial do voo
  ["casa.holo", "casa"], ["subir.voo", "subir"],
  // (T06) o tambor de verdade: a cena da casa a partir do tambor
  ["casa.tambor", "casa"],
  // (T27) a Kombi que quebra: antes e já na oficina
  ["quebra", "carreira"], ["quebra.oficina", "carreira"],
  // (T28) a perseguição da Kombi: a polícia já atrás e, depois, a hora de escolher o veículo
  ["perseguicao", "carreira"], ["perseguicao.escolher", "carreira"],
  // (T44) os rachas: a cidade livre com um carro do mecânico logo à frente
  ["rachas", "livre"],
  // (T61) a rotatória de cima: chegando na central e numa torre da ponta
  ["torre", "carreira"], ["torre.ponta", "carreira"],
  // (T59) a Kombi por dentro: a cidade livre na 1ª pessoa
  ["kombi.dentro", "livre"],
]

for (const [parte, fase] of PARTES) {
  test(`?parte=${parte}`, async ({ page }) => {
    const erros: string[] = []
    page.on("pageerror", (e) => erros.push(e.message))
    // um save de verdade qualquer, que o link de teste não pode tocar
    const REAL = JSON.stringify({ versao: 2, casa: true, neon: 7, disco: { fase: "carreira", holo: true } })
    await page.addInitScript((real) => {
      localStorage.setItem("cidade-neon-analytics-consent", "essential")
      if (!localStorage.getItem("cn-linha-222")) localStorage.setItem("cn-linha-222", real)
    }, REAL)
    await page.goto(`/linha?mapa=disco&parte=${parte}`)
    await page.waitForTimeout(3000)
    const save = await saveDoJogo(page)
    if (fase) expect(save?.disco?.fase).toBe(fase)
    expect(await saveReal(page)).toBe(REAL)
    expect(page.url()).not.toContain("parte=")
    const entrar = page.locator(".l-btn-entrar")
    if (await entrar.isVisible().catch(() => false)) { await entrar.click(); await page.waitForTimeout(4000) }
    expect(await saveReal(page)).toBe(REAL)
    expect(erros).toEqual([])
  })
}
