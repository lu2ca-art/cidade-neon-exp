import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/tmp/linha-shots"
// ORÇAMENTO das salas: roda cada sala e falha (código 1) se alguma passar do limite.
// uso: bun orcamento.mjs            (todas)    bun orcamento.mjs bar   (uma)
const LIMITE = { luzes: 10, triangulos: 60000, malhas: 160 }
const TODAS = ["bar", "balada", "vagao", "escondido", "beco", "topo", "shows", "posto", "drewboy"]
const QUAL = process.argv[2]
const FASE1 = ["copo", "sexta", "chuva", "dopamina", "ontem"]
const base = { nome: "teste", estacao: "chuva", pesos: {}, linha: "", xp: 0, dias: [], sinal: 400, freq: "linha", logs: {}, recordes: {}, legado: [], melhorVolta: 0, jogados: {}, perfil: "estrada", itens: [], ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 1, acordado: 3 }, reliquias: ["muda"], completos: ["grupo", "abertura"], ecosVistos: [] }
const S = {
  bar: { save: { objetos: [], pausas: { copo: 8 }, fio: ["copo"], freq: "linha", reliquias: [] }, via: "linha", u: 1528, L: 3772, x: 5 },
  balada: { save: { objetos: ["copo"], itens: ["carona:sexta"], pausas: { sexta: 15 }, fio: ["sexta"], freq: "linha" }, via: "linha", u: 2185, L: 3772, x: 5 },
  vagao: { save: { objetos: FASE1, itens: ["carona:nectar"], pausas: { nectar: 12 }, fio: ["nectar"], freq: "linha", reliquias: ["muda", "espelho"] }, via: "linha", u: 2293, L: 3772, x: -5 },
  escondido: { save: { objetos: ["copo"], itens: ["agua:0"], pausas: { chuva: 19 }, fio: ["chuva"], freq: "suburbio" }, via: "suburbio", u: 1300, L: 1754, x: -5 },
  beco: { save: { objetos: ["copo", "dopamina"], pausas: {}, fio: ["chuva"], freq: "crypto", tons: { dormindo: 0, acordando: 0, acordado: 3 } }, via: "crypto", u: 1300, L: 2150, x: -5, voltas: 1 },
  topo: { save: { objetos: ["copo"], pausas: { dopamina: 15 }, fio: ["dopamina"], freq: "crypto" }, via: "crypto", u: 950, L: 2150, x: 5 },
  shows: { save: { objetos: ["copo"], itens: ["pagina:0", "pagina:1", "pagina:2"], pausas: { ontem: 15 }, fio: ["ontem"], freq: "live" }, via: "live", u: 1250, L: 2064, x: 5 },
  posto: { save: { objetos: FASE1, pausas: { nectar: 5 }, fio: ["nectar"], freq: "linha" }, via: "linha", u: 3110, L: 3772, x: 5 },
  drewboy: { save: { objetos: ["copo"], pausas: { sexta: 9 }, fio: ["sexta"], freq: "suburbio" }, via: "suburbio", u: 560, L: 1754, x: -5 },
  dbee: { save: { objetos: [...FASE1, "nectar"], pausas: { ojala: 10 }, fio: ["chuva"], freq: "linha", reliquias: ["muda", "relicario", "espelho", "letra"] }, via: "linha", u: 3260, L: 3772, x: 5, viagem: true },
}[QUAL]
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/AudioContext/.test(m.text())) erros.push(m.text().slice(0, 200)) })
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (sessionStorage.getItem("ok")) return; sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify(s)) }, { ...base, ...S.save, completos: [...base.completos, ...S.save.objetos], ecosVistos: S.save.objetos })
const shot = (nome) => page.screenshot({ path: `${DIR}/s-${QUAL}-${nome}.png`, timeout: 90000 }).catch(() => {})
const clicar = async (loc) => { const bb = await loc.boundingBox().catch(() => null); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000)
await page.click(".l-btn-entrar"); await page.waitForTimeout(6000)
if (S.voltas) for (let v = 0; v < S.voltas; v++) { await page.evaluate(([via, f]) => { window.__via(via, f); window.__irPara(f, 0); window.__vel(25) }, [S.via, (S.u - 60) / S.L]); await page.waitForTimeout(9000) }
await page.evaluate(([via, f, x]) => { window.__via(via, f); window.__irPara(f, x); window.__vel(0) }, [S.via, S.u / S.L, S.x])
if (S.viagem) {
  for (let i = 0; i < 20 && !(await page.locator(".l-estrada-fora").count()); i++) await page.waitForTimeout(500)
  await page.mouse.move(200, 400); await page.mouse.down(); await page.evaluate(() => window.__viagem(1250)); await page.waitForTimeout(6000)
  for (let i = 0; i < 60 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(1000)
  await page.mouse.up()
}
for (let i = 0; i < 30 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(500)
await page.waitForTimeout(5000)
for (let k = 0; k < 20 && !(await page.evaluate(() => !!window.__sala)); k++) await page.waitForTimeout(500)
const m = await page.evaluate(() => window.__sala ? window.__sala() : null)
console.log(QUAL.padEnd(10), JSON.stringify(m))
await browser.close()
