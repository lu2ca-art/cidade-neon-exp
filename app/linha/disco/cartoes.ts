// OS CARTÕES DAS MISSÕES (16/11, o dono, episodios.md "O mapa, os cartões e a
// traição"): um cartão por personagem, com a recompensa por ele, uma breve
// descrição do crime, a foto e um mini checklist do que a pessoa encontra e do
// que libera. O mapa ilustrado (MapaCartoes.tsx) e a feira do holo leem daqui.
//
// O QUE O DONO REESCREVE fica todo em CARTOES, logo abaixo: um campo por
// personagem. O resto (o checklist, onde fica, se está aberto) é DERIVADO da
// sequência (episodios.ts) e das missões (portas.ts), sem texto novo.
//
// A escolha (liberar ou entregar) e a explosão são de outra frente: o cartão já
// tem o lugar delas (MapaCartoes.tsx, `l-cartao-escolha`), sem botão.

import type { PistaId } from "../estrada/pistas"
import type { HistoriaDisco, LugarChao } from "./historia"
import type { LugarId } from "../lugares"
import { EPISODIOS, MARCOS, episodioFeito, episodiosAbertos, etapaAgora, nomeDaMusica, numeroDe, pecaDoEpFeita, quemAbre, type Episodio } from "./episodios"
import { MISSOES13, PORTAS, feita13, ordemDe, pecaFeita, type MissaoId } from "./portas"
import { INSTRUMENTOS_ANCESTRAIS } from "./instrumentos"

// ═══ O QUE O DONO ESCREVE (RASCUNHO, tudo) ═══
// - crime: escrito SÓ a partir da bíblia §11 e do episodios.md (o que cada um
//   faz no jogo); nenhuma história nova. Troque à vontade.
// - recompensa: quanto vale entregar a pessoa, em Água$. Número de rascunho.
// - foto: o caminho de uma imagem (ex.: "/personagens/dbee.webp") quando os
//   modelos do Tripo chegarem. null = o retrato ilustrado na cor dela.
export interface TextoCartao { crime: string; recompensa: number; foto: string | null }
export const CARTOES: Record<PistaId, TextoCartao> = {
  // D-Bee · bíblia §11 e ep. 1: veio do deserto na Kombi; declama a história do mundo; ensina instrumentos ancestrais
  nectar: { crime: "Veio do deserto de Kombi. Declama a história do mundo como ele é e ensina a tocar instrumentos ancestrais.", recompensa: 300, foto: null },
  // Mubarak · bíblia §11 e ep. 2: fala do Núcleo e da cidade; o revolucionário; o mecânico
  dopamina: { crime: "Fala coisas subversivas sobre a cidade e o Núcleo. É o revolucionário. Monta motor com o que acha no lixão.", recompensa: 500, foto: null },
  // Alohan · bíblia §11 e ep. 3: beats, samplear o mundo, o ginásio
  copo: { crime: "Faz beats sampleando os sons do mundo e leva a galera pro ginásio.", recompensa: 200, foto: null },
  // Nizzy · ep. 4: os rachas na cidade, a loja de discos
  ojala: { crime: "Os rachas na cidade. E a loja de discos.", recompensa: 350, foto: null },
  // Tony Gordo · ep. 5: a feira, paga com a Água$ do deserto
  swav: { crime: "A feira na rua, paga com a água rara do deserto.", recompensa: 250, foto: null },
  // Drew · bíblia §11 e ep. 6: o grafite, a roupa, as corridas nos túneis
  sexta: { crime: "Grafite nas paredes e corridas na cidade e nos túneis. Se veste e se desafia sem medo.", recompensa: 400, foto: null },
  // Ella · ep. 7 e portas.ts: a casa-galeria proibida, a planta, as flores
  ontem: { crime: "A casa-galeria proibida, a planta e as flores.", recompensa: 450, foto: null },
  // Notti · bíblia §13: tocar violão no trem começa a fuga do guarda
  rollercoaster: { crime: "Toca violão no metrô.", recompensa: 300, foto: null },
  // LU2CA · ep. 9 e "a entrega" (16/11): o racha; visto com um veículo desconhecido pela cidade
  chuva: { crime: "O racha. Visto andando pela cidade com um veículo desconhecido.", recompensa: 900, foto: null },
}

// ── o que o jogo deriva (sem texto novo) ──
export type EstadoCartao = "feito" | "aberto" | "trancado"
export interface ItemChecklist { texto: string; feito: boolean; tipo: "joga" | "libera" }
export interface IconeCartao { chave: string; ep: PistaId; missao: MissaoId | null; lugar: { lugar?: LugarId; chao?: LugarChao }; cor: string; feito: boolean }
export interface Cartao {
  ep: Episodio
  n: number
  quem: string
  cor: string
  musica: string
  texto: TextoCartao
  estado: EstadoCartao
  // trancado: o que abre ("abre no ep. 3 · Copo Americano (Alohan)")
  cadeado: string | null
  joga: ItemChecklist[]
  libera: ItemChecklist[]
  // a missão de agora deste personagem (a que dá pra marcar no mapa), ou null
  proxima: MissaoId | null
}

// as peças-marco do ep. 1 acontecem no bar
const LUGAR_DO_MARCO: Partial<Record<string, LugarChao>> = { copos: "bar", mubarak: "bar", "show-nectar": "bar" }

export function cartaoDe(h: HistoriaDisco, ep: Episodio): Cartao {
  const feito = episodioFeito(h, ep)
  const aberto = !feito && episodiosAbertos(h).some((e) => e.id === ep.id)
  const joga: ItemChecklist[] = []
  const libera: ItemChecklist[] = []
  let proxima: MissaoId | null = null
  for (const p of ep.pecas) {
    if (p.t === "marco") { joga.push({ texto: MARCOS[p.id].nome, feito: MARCOS[p.id].feito(h), tipo: "joga" }); continue }
    const m = MISSOES13[p.id], mf = feita13(h, p.id)
    for (const qual of ordemDe(p.id)) joga.push({ texto: m[qual].nome, feito: mf || pecaFeita(h, p.id, qual), tipo: "joga" })
    for (const a of m.abre) libera.push({ texto: PORTAS[a].nome, feito: mf, tipo: "libera" })
    const ins = m.recompensa.instrumento
    if (ins) libera.push({ texto: `${INSTRUMENTOS_ANCESTRAIS[ins].nome}, instrumento ancestral`, feito: mf, tipo: "libera" })
    if (!proxima && !pecaDoEpFeita(h, p)) proxima = p.id
  }
  libera.push({ texto: `${nomeDaMusica(ep)} no Guitar Driver e no MP3`, feito, tipo: "libera" })
  return {
    ep, n: numeroDe(ep), quem: ep.quem, cor: ep.cor, musica: nomeDaMusica(ep), texto: CARTOES[ep.id],
    estado: feito ? "feito" : aberto ? "aberto" : "trancado",
    cadeado: feito || aberto ? null : quemAbreAntes(h, ep),
    joga, libera, proxima: aberto ? proxima : null,
  }
}

// trancado: diz o episódio de agora (o que falta pra chegar neste)
function quemAbreAntes(h: HistoriaDisco, ep: Episodio): string {
  const et = etapaAgora(h)
  const antes = EPISODIOS.find((e) => e.etapa === et && !episodioFeito(h, e))
  return antes && antes.etapa < ep.etapa ? `abre depois do ${quemAbre(antes).replace(/^abre no /, "")}` : "abre mais adiante na sequência"
}

export const cartoesDe = (h: HistoriaDisco): Cartao[] => EPISODIOS.map((e) => cartaoDe(h, e))

// os ícones do mapa: um por missão (e o bar do ep. 1), no lugar dela. Tocar abre o cartão do personagem
export function iconesDosCartoes(h: HistoriaDisco): IconeCartao[] {
  const out: IconeCartao[] = []
  const vistos = new Set<string>()
  for (const ep of EPISODIOS) for (const p of ep.pecas) {
    const lugar = p.t === "missao" ? MISSOES13[p.id].lugar : LUGAR_DO_MARCO[p.id] ? { chao: LUGAR_DO_MARCO[p.id] } : null
    if (!lugar) continue
    const chave = `${ep.id}:${lugar.lugar ?? lugar.chao}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    out.push({ chave, ep: ep.id, missao: p.t === "missao" ? p.id : null, lugar, cor: ep.cor, feito: pecaDoEpFeita(h, p) })
  }
  return out
}

// as iniciais do retrato ilustrado ("Tony Gordo" → "TG", "D-Bee" → "DB")
export const iniciais = (nome: string) => nome.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase()
