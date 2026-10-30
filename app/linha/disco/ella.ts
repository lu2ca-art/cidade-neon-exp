// A MISSÃO DA ELLA (T22, coordenadas do dono em 29/10). A casa dela é a galeria:
// enorme, proibida (como a planta). Ela mostra a planta do Criador, achada nos
// aposentos dele e cultivada aqui; virou moda depois que ele partiu; a gente
// guardou amostras, então é a mesma planta (e é ela que salva o mundo no final:
// isso NÃO é dito, regra de ouro 6). Perto dela dá vontade de criar. A Ella
// guarda o segredo e convida a pintar ali mesmo. Entrou, só sai depois de
// passar por tudo (regra 9): o diálogo, a planta, os quadros, pintar, o som.
//
// Tudo o que é RASCUNHO mora aqui, num lugar só: as falas (o dono aprova ou
// reescreve), o que cada quadro e a planta contam, e os números do pintar. A
// sala em 3D é interior/salas/GaleriaElla.tsx; o pintar reaproveita o som da
// tela de app/galeria/pintar/som.ts (cada cor é um instrumento) e a obra vai
// pra parede da galeria de verdade (app/galeria/obras.ts).

import type { Cena } from "../cenas"
import type { Coisa } from "../interior/comum"

export const ELLA_COR = "#4fc3ff"

// ── a planta (o gesto "planta"): tocar no que chamar a atenção. RASCUNHO ──
export const PLANTA: Coisa[] = [
  { id: "vaso", pos: [0, 0.55, -6.2], raio: 0.32, falas: [{ texto: "um vaso de barro rachado. na etiqueta, à mão: \"dos aposentos dele\"", tipo: "acao" }] },
  { id: "folhas", pos: [0.05, 1.45, -6.2], raio: 0.38, falas: [{ texto: "as folhas viram devagar pro seu lado. não tem vento aqui dentro", tipo: "acao" }] },
  { id: "amostras", pos: [1.25, 1.15, -6.55], raio: 0.3, falas: [{ texto: "potinhos de vidro numa prateleira. semente, galho, terra. cada um com uma data", tipo: "acao" }] },
]
// quantas coisas da planta precisa ver pra seguir
export const PLANTA_PRECISA = 3

// ── os quadros que ela guardou (o gesto "quadros"). RASCUNHO ──
// `lado`: a parede (-1 esquerda, 1 direita); `z`: onde no salão; `cores`: a
// pintura provisória (gerada em código até os quadros de verdade chegarem)
export interface QuadroElla { id: string; lado: -1 | 1; z: number; y: number; larg: number; alto: number; cores: string[]; falas: Coisa["falas"] }
export const QUADROS: QuadroElla[] = [
  { id: "cidade", lado: -1, z: 1.6, y: 2.3, larg: 1.6, alto: 2.1, cores: ["#0b0f1e", "#ff3fb0", "#2fe8ff", "#5dffa0"], falas: [{ texto: "uma cidade de cabeça pra baixo. as raízes pro céu", tipo: "acao" }] },
  { id: "janela", lado: 1, z: 1.2, y: 2.1, larg: 1.2, alto: 1.6, cores: ["#10141c", "#4fc3ff", "#e6f0ff", "#2a3550"], falas: [{ texto: "uma mulher de costas, na janela. chove dentro do quarto", tipo: "acao" }, { de: "Ella", texto: "esse é meu. pula", tipo: "fala" }] },
  { id: "rio", lado: -1, z: -1.4, y: 2.0, larg: 2.2, alto: 1.3, cores: ["#06121a", "#4fc3ff", "#5dffa0", "#ffe0a8"], falas: [{ texto: "um rio cheio, no meio do deserto. azul demais pra ser lembrança", tipo: "acao" }] },
  { id: "kombi", lado: 1, z: -1.8, y: 1.9, larg: 1.1, alto: 0.9, cores: ["#f2eefa", "#ff6a35", "#3a4cff", "#ffc857"], falas: [{ texto: "uma kombi voando. traço de criança", tipo: "acao" }] },
  { id: "branco", lado: -1, z: -4.2, y: 2.4, larg: 1.3, alto: 1.7, cores: ["#efe8da"], falas: [{ texto: "uma tela branca. só a assinatura, embaixo", tipo: "acao" }] },
  { id: "flor", lado: 1, z: -4.6, y: 2.6, larg: 1.5, alto: 1.5, cores: ["#14121c", "#b38cff", "#5dffa0", "#ff3fb0"], falas: [{ texto: "a mesma planta, pintada de memória por alguém que nunca viu ela", tipo: "acao" }] },
]
// quantos quadros precisa olhar pra seguir (os outros ficam pra quando voltar)
export const QUADROS_PRECISA = 3

// ── pintar (o gesto "pintar"): a tela em branco no cavalete, os potes de tinta ──
export const PINTAR = {
  // as cores dos potes: são cores da paleta do pintar (som.ts), cada uma toca um
  // instrumento (a tela é creme, que toca como o branco: por isso não tem pote branco)
  potes: ["#4fc3ff", "#ff6a35", "#5dffa0", "#b38cff", "#ff3fb0", "#ffc857"],
  // a espessura do pincel, em pixels da tela (512 × 640)
  pincel: 14,
  // quantas pinceladas até o prego acender (dá pra pendurar)
  minimo: 8,
  // o bpm da tela tocando, depois de pendurada (uma volta inteira)
  bpm: 92,
  // o nome com que a obra vai pra parede da galeria
  nome: "na casa da ella",
}

// ── A CENA (as falas: RASCUNHO, minúsculas e secas; o dono aprova) ──
// a voz dela (plano-vozes.md): suave, baixa, frases que terminam antes do fim;
// nunca "tô bem"; bordão "deixa molhar". Sempre chuva atrás da voz.
export const CENA_GALERIA_ELLA: Cena = {
  lugar: "escondido",
  titulo: "a casa da ella",
  missao: "chuva",
  passos: [
    { t: "acao", texto: "uma porta de ferro, sem placa. dentro, um salão enorme. quadros até o teto. chove no vidro lá em cima" },
    { t: "fala", de: "Ella", texto: "entra. fecha devagar" },
    { t: "fala", de: "Ella", texto: "aqui é proibido. tudo aqui" },
    { t: "acao", texto: "um balde embaixo de cada goteira. ninguém joga a chuva fora" },
    { t: "fala", de: "Ella", texto: "vem. lá no fundo" },
    { t: "gesto", id: "planta" },
    { t: "fala", de: "Ella", texto: "era dele. do criador" },
    { t: "fala", de: "Ella", texto: "tava nos aposentos dele quando ele partiu" },
    { t: "fala", de: "Ella", texto: "depois virou moda. todo mundo queria uma muda. aí proibiram" },
    { t: "fala", de: "Ella", texto: "a gente guardou as amostras. é a mesma. eu sei que é" },
    { t: "fala", de: "Ella", texto: "chega perto. sente?" },
    { t: "acao", texto: "uma coceira nas mãos. vontade de fazer alguma coisa. qualquer coisa" },
    { t: "fala", de: "Ella", texto: "ninguém sabe que ela tá aqui. agora vc sabe" },
    { t: "fala", de: "Ella", texto: "esses eu guardei. ninguém mais ia guardar" },
    { t: "gesto", id: "quadros" },
    { t: "nucleo", texto: "acervo sem curadoria detectado. 0 visualizações ✓" },
    { t: "fala", de: "Ella", texto: "tem uma tela em branco ali. é sua" },
    { t: "fala", de: "Ella", texto: "perto dela sai sozinho" },
    { t: "gesto", id: "pintar" },
    { t: "acao", texto: "ela pendura a sua do lado das dela. a tela toca" },
    { t: "fala", de: "Ella", texto: "…" },
    { t: "fala", de: "Ella", texto: "deixa molhar" },
    {
      t: "escolha",
      opcoes: [
        { label: "por que vc me mostrou?", tom: "dormindo", resposta: [{ de: "Ella", texto: "alguém tinha que ver" }] },
        { label: "e se descobrirem?", tom: "acordando", resposta: [{ de: "Ella", texto: "descobrem. ela fica" }] },
        { label: "ela era dele mesmo?", tom: "acordado", resposta: [{ de: "Ella", texto: "era" }, { de: "Ella", texto: "e ele nem sabe o que deixou" }] },
      ],
    },
    { t: "acao", texto: "lá fora, a chuva continua. aqui dentro, menos" },
    { t: "fim" },
  ],
}
