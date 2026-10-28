import { expect, test } from "@playwright/test"

// (T48) o Suburbandas abre com a foto nova (render de cena tratado) e, com `imagem` na manchete, mostra o arquivo
test("o jornal abre com a foto nova, sem erro", async ({ page }) => {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.goto("/teste/jornal")
  const cv = page.locator(".l-jornal canvas")
  await expect(cv).toBeVisible()
  expect(await cv.evaluate((c: HTMLCanvasElement) => c.width)).toBe(960)
  // a foto tem tons (não é uma tela chapada de 2 cores, como o meio-tom antigo)
  const cores = await cv.evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data
    const set = new Set<number>(); for (let i = 0; i < d.length; i += 4 * 97) set.add(d[i] >> 4)
    return set.size
  })
  expect(cores).toBeGreaterThan(8)
  expect(erros).toEqual([])
})

test("uma manchete com imagem de arquivo mostra a imagem", async ({ page }) => {
  await page.goto("/teste/jornal?imagem=/images/album-cover.jpg")
  const img = page.locator(".l-jornal img.l-jornal-img")
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0)
  await expect(page.locator(".l-jornal canvas")).toHaveCount(0)
})

test("imagem quebrada cai de volta na foto de cena", async ({ page }) => {
  await page.goto("/teste/jornal?imagem=/nao-existe.jpg")
  await expect(page.locator(".l-jornal canvas")).toBeVisible()
})
