import { expect, test } from "@playwright/test"
import { luzDasPistas, pistasFeitas } from "../app/linha/estrada/atos"
import type { HistoriaDisco } from "../app/linha/disco/historia"
import {
  CONFIG13, IDS13, MISSOES13, abrirPorta, alvo13, checklist13, concluir, contarEvento, disponiveis, feita13, musicasDoGuitar,
  kombiNoConserto, normalizarMissao, passoAgora, recompensaDe, sincronizar, trancado,
} from "../app/linha/disco/portas"

// (T02) o modelo das 13 missões, sem navegador: arte → jogo → a porta → a recompensa,
// a peça "em breve" que não trava, a feira e as músicas do Guitar Driver
const CARREIRA: HistoriaDisco = { fase: "carreira", holo: true }
const luz = (objetos: string[]) => luzDasPistas(pistasFeitas(objetos as never))

test("as 13 portas da tabela", () => {
  expect(IDS13).toHaveLength(13)
  expect(IDS13.filter((id) => MISSOES13[id].onde === "suburbio")).toEqual(["dbee", "oficina", "quadra", "tuneis"])
  // cada faixa do Vol.1 é liberada uma vez só no Guitar Driver (a Nectar já vem aberta)
  const faixas = IDS13.map((id) => MISSOES13[id].recompensa.guitar).filter(Boolean)
  expect(new Set(faixas).size).toBe(faixas.length)
  expect(faixas).not.toContain(CONFIG13.musicasDoInicio[0])
})

test("arte e jogo na ordem da missão → porta, com a peça em breve pulando", () => {
  // (T15, A3+A4 30/10) o Drew: primeiro o jogo (de patins e jetpack até ele), depois a arte (a moda reciclada)
  let h: HistoriaDisco = { ...CARREIRA, missao: "drew" }
  expect(passoAgora(h, "drew")).toBe("jogo")
  expect(checklist13(h, "drew").map((x) => x.estado)).toEqual(["agora", "depois", "depois"])
  expect(checklist13(h, "drew").map((x) => x.nome.split(" · ")[0])).toEqual(["o jogo", "a arte", "a porta"])
  expect(alvo13(h, "drew")).toEqual({ lugar: "casa-drewboy" })
  expect(kombiNoConserto(h)).toBe(true)
  h = concluir(h, "drew", "jogo")
  expect(passoAgora(h, "drew")).toBe("arte")
  h = concluir(h, "drew", "arte")
  expect(passoAgora(h, "drew")).toBe("porta")
  expect(trancado(h, "ginasio")).toBe("abre na missão do Drew")
  h = abrirPorta(h, "drew")
  expect(feita13(h, "drew")).toBe(true)
  expect(passoAgora(h, "drew")).toBeNull()
  expect(h.missao).toBeUndefined()
  expect(h.portas).toContain("ginasio")
  expect(trancado(h, "ginasio")).toBeNull()
  expect(kombiNoConserto(h)).toBe(false)
  expect(musicasDoGuitar(h)).toEqual(expect.arrayContaining(["nectar", "sexta"]))
  // a peça "em breve" não trava: (hoje todas existem) com o grafite dos túneis
  // desligado, a arte deles vira "em breve" e a missão pula direto pro jogo
  const tuneis: HistoriaDisco = { ...CARREIRA, missao: "tuneis" }
  expect(passoAgora(tuneis, "tuneis")).toBe("arte")
  const antes = CONFIG13.grafiteNoMapa
  try {
    CONFIG13.grafiteNoMapa = false
    expect(passoAgora(tuneis, "tuneis")).toBe("jogo")
    expect(checklist13(tuneis, "tuneis").map((x) => x.estado)).toEqual(["em breve", "agora", "depois"])
    expect(passoAgora(concluir(tuneis, "tuneis", "jogo"), "tuneis")).toBe("porta")
  } finally { CONFIG13.grafiteNoMapa = antes }
})

test("(T22) a casa da Ella: o jogo e a arte na casa dela, depois a porta; (soNoTeste) só joga com o link de teste", () => {
  // (bloco 1 · A7, 30/10) o dono aprovou: a casa da Ella entrou no mapa (saiu de soNoTeste)
  expect(CONFIG13.soNoTeste).not.toContain("ella")
  // primeiro olhar (o jogo), depois pintar (a arte), na casa dela
  let h: HistoriaDisco = { ...CARREIRA, missao: "ella" }
  expect(passoAgora(h, "ella")).toBe("jogo")
  expect(checklist13(h, "ella").map((x) => x.estado)).toEqual(["agora", "depois", "depois"])
  expect(MISSOES13.ella.jogo.como).toEqual({ t: "casa", sala: "galeria-ella" })
  expect(MISSOES13.ella.arte.como).toEqual({ t: "casa", sala: "galeria-ella" })
  expect(alvo13(h, "ella")).toEqual({ lugar: "escondido" })
  h = concluir(concluir(h, "ella", "jogo"), "ella", "arte")
  expect(passoAgora(h, "ella")).toBe("porta")
  h = abrirPorta(h, "ella")
  expect(h.portas).toContain("galeria")
  expect(h.guitar).toContain("chuva")
  // a regra 5 continua valendo pra próxima casa nova: em soNoTeste, no mapa as
  // peças da casa ficam "em breve" (a porta direto); com o link de teste (teste13), joga
  const antes = [...CONFIG13.soNoTeste]
  try {
    CONFIG13.soNoTeste.push("ella")
    expect(passoAgora({ ...CARREIRA, missao: "ella" }, "ella")).toBe("porta")
    expect(checklist13({ ...CARREIRA, missao: "ella" }, "ella").map((x) => x.estado)).toEqual(["em breve", "em breve", "agora"])
    expect(passoAgora({ ...CARREIRA, missao: "ella", teste13: ["ella"] }, "ella")).toBe("jogo")
  } finally { CONFIG13.soNoTeste.splice(0, CONFIG13.soNoTeste.length, ...antes) }
})

test("(T25) o Tony: o jogo antes da arte; (T24) o parque abre pra missão da Nizzy", () => {
  let h: HistoriaDisco = { ...CARREIRA, missao: "tony" }
  expect(passoAgora(h, "tony")).toBe("jogo")
  expect(checklist13(h, "tony").map((x) => x.nome.split(" · ")[0])).toEqual(["o jogo", "a arte", "a porta"])
  h = concluir(h, "tony", "jogo")
  expect(passoAgora(h, "tony")).toBe("arte")
  expect(trancado(CARREIRA, "parque")).toBe("abre na missão da Nizzy")
  expect(trancado({ ...CARREIRA, missao: "nizzy" }, "parque")).toBeNull()
  expect(trancado({ fase: "livre", holo: true }, "loja-discos")).toBeNull()
  expect(trancado(CARREIRA, "loja-discos")).toBe("abre na missão do Mubarak")
})

test("a peça na rua conta eventos e não precisa de lugar", () => {
  // (T24) a arte (o clipe) acontece no palco dela; depois o jogo é na rua
  let h: HistoriaDisco = { ...CARREIRA, missao: "nizzy" }
  expect(passoAgora(h, "nizzy")).toBe("arte")
  expect(alvo13(h, "nizzy")).toEqual({ lugar: "palco-rollercoaster" })
  h = concluir(h, "nizzy", "arte")
  expect(alvo13(h, "nizzy")).toBeNull()
  h = contarEvento(h, "flor") // outro evento: não conta
  expect(passoAgora(h, "nizzy")).toBe("jogo")
  h = contarEvento(h, "montanha")
  expect(passoAgora(h, "nizzy")).toBe("porta")
  expect(alvo13(h, "nizzy")).toEqual({ lugar: "palco-rollercoaster" })
})

test("a feira: o LU2CA primeiro na cidade, o subúrbio aberto, a final por último", () => {
  const ini = disponiveis(CARREIRA, luz([]))
  expect(ini).toEqual(expect.arrayContaining(["quadra", "tuneis", "lu2ca"]))
  expect(ini).not.toContain("drew") // a pista da Sexta-Feira ainda apagada (as torres)
  expect(ini).not.toContain("xeriff") // pede o LU2CA antes
  expect(ini).not.toContain("final")
  const h = abrirPorta(CARREIRA, "lu2ca")
  expect(disponiveis(h, luz(["nectar"]))).toContain("xeriff")
  // tudo feito: só sobra a final
  let fim: HistoriaDisco = CARREIRA
  for (const id of IDS13) if (id !== "final") fim = abrirPorta(fim, id)
  expect(disponiveis(fim, null)).toEqual(["final"])
})

test("save antigo: a faixa feita conta e a missão pegada era a faixa", () => {
  expect(normalizarMissao("sexta")).toBe("drew")
  expect(normalizarMissao("chuva")).toBe("ella")
  expect(feita13(sincronizar(CARREIRA, ["copo"]), "mubarak")).toBe(true)
  // a recompensa diz o que ainda não existe: (T63) as corridas nos túneis já estão no jogo;
  // (05/11) a moto também (sai da Kombi e volta pra ela, liberada nesta porta)
  const r = recompensaDe("tuneis")
  expect(Object.fromEntries(r.abriu.map((a) => [a.id, a.emBreve]))).toEqual({ corridas: false, motos: false })
  // e o que é "em breve" vem de PORTAS[..].existe
  expect(recompensaDe("final").abriu.every((a) => typeof a.emBreve === "boolean")).toBe(true)
})
