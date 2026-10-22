// As partes do jogo, em ordem, com nome de gente (22/10). Cada nota do caderno
// sai com a parte em que o dono estava; o mapa das melhorias
// (projetos/cidade-neon/mapa-do-jogo.md no repo LU2CA) usa estes mesmos ids.

export type Onde = {
  tela?: string
  cena?: boolean
  show?: string | null
  jornal?: boolean
  visor?: string | null
  pingpong?: boolean
  celular?: boolean
}

type Historia = { fase?: string; nectar?: string; missao?: string; show?: string }

const FASES: Record<string, string> = {
  minhoca: "o buraco de minhoca",
  casa: "a casinha da D-Bee (o holo)",
  dunas: "a travessia das dunas",
  bar: "o prólogo no bar",
  oficina: "a oficina",
  subir: "a subida pra cidade",
  nectar: "Nectar",
  carreira: "a carreira",
  livre: "a cidade (livre)",
}

const PASSOS_NECTAR: Record<string, string> = {
  quebra: "a Kombi quebra",
  regar: "regar as flores de patins",
  galao: "o galão no posto",
  oficina: "a oficina (solar e turbo)",
  show: "o show",
  flores: "o jardim",
  feita: "feita",
}

const PISTAS: Record<string, string> = {
  ontem: "Sabe Ontem?", copo: "Copo Americano", swav: "Swav", sexta: "Sexta-Feira",
  rollercoaster: "Rollercoaster", dopamina: "DopaminA", chuva: "CHUVA", ojala: "Ojalá", nectar: "Nectar",
}

export function parteDe(h: Historia | undefined, onde: Onde | undefined): { id: string; nome: string } {
  const o = onde ?? {}
  if (!o.tela || o.tela === "entrada") return { id: "inicio", nome: "a página inicial" }
  const fase = h?.fase ?? "livre"
  let id = fase
  let nome = FASES[fase] ?? fase
  if (fase === "nectar" && h?.nectar) { id = `nectar.${h.nectar}`; nome = `Nectar › ${PASSOS_NECTAR[h.nectar] ?? h.nectar}` }
  if ((fase === "carreira" || fase === "livre") && h?.missao) { id = `missao.${h.missao}`; nome = `missão ${PISTAS[h.missao] ?? h.missao}` }
  else if (fase === "carreira") { id = "carreira.feira"; nome = "a carreira › a feira (sem missão)" }
  // o que está aberto por cima
  const em = o.show ? `o show${PISTAS[o.show] ? ` (${PISTAS[o.show]})` : ""}`
    : o.pingpong ? "o ping pong" : o.jornal ? "o jornal" : o.visor ? `o visor (${o.visor})` : o.celular ? "o holo/celular"
    : o.cena ? "uma cena" : o.tela !== "corrida" && o.tela !== "chegada" ? `a tela ${o.tela}` : ""
  const sub = o.show ? "show" : o.pingpong ? "pingpong" : o.jornal ? "jornal" : o.visor ? "visor" : o.celular ? "holo" : o.cena ? "cena" : o.tela !== "corrida" && o.tela !== "chegada" ? `tela-${o.tela}` : ""
  return sub ? { id: `${id}/${sub}`, nome: `${nome} › ${em}` } : { id, nome }
}
