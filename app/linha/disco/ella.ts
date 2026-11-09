// A MISSÃO DA ELLA (T22, coordenadas do dono em 29/10; a ordem, T22b, 30/10).
// A casa dela é a galeria: enorme, proibida (como a planta). Entrou, só sai
// depois de passar por tudo (regra 9), nesta ordem:
//   1. o FILMINHO: a Ella fala da planta do Criador (FILME_ELLA, abaixo). Hoje
//      é o provisório (as falas em legenda, a câmera chegando devagar na
//      planta); amanhã é vídeo de IA (T70): o arquivo entra em FILME_ELLA.video
//   2. conhecer a GALERIA: os quadros que ela guardou (o gesto "quadros")
//   3. PINTAR, iluminado pela planta: a planta é a luz da tela (o gesto "pintar")
//
// Tudo o que é RASCUNHO mora aqui, num lugar só: o roteiro do filme e as falas
// (o dono aprova ou reescreve), o que cada quadro conta e os números do
// pintar. A sala em 3D é interior/salas/GaleriaElla.tsx; o pintar reaproveita
// o som da tela de app/galeria/pintar/som.ts (cada cor é um instrumento) e a
// obra vai pra parede da galeria de verdade (app/galeria/obras.ts).

import type { Cena } from "../cenas"
import type { Coisa } from "../interior/comum"
import type { Filme } from "../estrada/ganchoCena"

export const ELLA_COR = "#4fc3ff"

// ── 1. O FILMINHO (T22b, o dono em 30/10). RASCUNHO do roteiro ──
// A Ella fala da planta. O Criador deixou nela o que sabia (conhecimento
// escondido) e dizia que ela salvaria o mundo do mal que já estava previsto.
// Ela conta o que ouviu dizer; não sabe que quem está ali é ele.
// A voz dela (plano-vozes.md): suave, baixa, frases que terminam antes do fim.
// ~44 s: 3 de imagem + as falas (39) + 2 de imagem. Chuva no vidro o tempo todo.
export const FILME_ELLA: Filme = {
  id: "ella-planta",
  // ── O VÍDEO (T70) ENTRA AQUI: "/cenas/ella-planta.mp4" (public/cenas/ella-planta.mp4) ──
  video: null,
  abertura: 3,
  fecho: 2,
  falas: [
    { de: "Ella", texto: "essa era dele. do criador", seg: 4 },
    { de: "Ella", texto: "tava nos aposentos dele quando ele partiu", seg: 4 },
    { de: "Ella", texto: "ele não deixou livro. nem carta. deixou ela", seg: 5 },
    { de: "Ella", texto: "o que ele sabia, ele guardou aqui dentro. numa folha. onde ninguém ia procurar", seg: 6 },
    { de: "Ella", texto: "ele dizia que vinha um mal. que já tava previsto", seg: 5 },
    { de: "Ella", texto: "e que ela ia salvar o mundo disso", seg: 5 },
    { de: "Ella", texto: "depois virou moda. depois proibiram. essa é a mesma. eu guardei", seg: 6 },
    { texto: "as folhas viram devagar pro seu lado. não tem vento aqui dentro", seg: 4, tipo: "acao" },
  ],
}

// ── os quadros que ela guardou (o gesto "quadros") ──
// (09/11) Todos de domínio público (a lista com fonte e licença em
// public/creditos-dominio-publico.txt). `lado`: a parede (-1 esquerda, 1 direita);
// `z`: onde no salão; `larg`/`alto`: a tela; `img`: o arquivo, já na proporção da
// tela (a obra inteira, sem cortar, com margem escura se precisar). Os ids são os
// nomes das telas no modelo (tela_<id>); os três sem tela no modelo ganham moldura
// no código. `cores`: só pro script do Blender (as telas empilhadas nas estantes).
// O que aparece ao tocar é o crédito da obra.
export interface QuadroElla { id: string; lado: -1 | 1; z: number; y: number; larg: number; alto: number; cores: string[]; img: string; falas: Coisa["falas"] }
const placa = (titulo: string, autor: string, ano: string): Coisa["falas"] => [{ texto: `${titulo}. ${autor}, ${ano}`, tipo: "acao" }]
const IMG = (nome: string) => `/galeria/ella/${nome}.webp`
export const QUADROS: QuadroElla[] = [
  { id: "paisagem", lado: -1, z: 5.0, y: 2.6, larg: 1.36, alto: 1.0, cores: ["#3a4a5a", "#7f8f9a", "#2a3a1e", "#c9b28a"], img: IMG("paisagem"), falas: placa("Paisagem no Brasil", "Frans Post", "c. 1665–69") },
  { id: "brasil", lado: 1, z: 4.7, y: 2.7, larg: 1.5, alto: 0.99, cores: ["#46525c", "#8fa0a8", "#2c3a1a", "#b0a070"], img: IMG("brasil"), falas: placa("Paisagem brasileira", "Frans Post", "1650") },
  { id: "maracuja", lado: 1, z: 2.55, y: 2.6, larg: 0.89, alto: 1.4, cores: ["#3a3a2e", "#b03a2a", "#6a7a4a", "#d8d0c0"], img: IMG("maracuja"), falas: placa("Beija-flor e maracujá", "Martin Johnson Heade", "c. 1875–85") },
  { id: "cidade", lado: -1, z: 1.6, y: 2.3, larg: 1.6, alto: 2.1, cores: ["#0b0f1e", "#ff3fb0", "#2fe8ff", "#5dffa0"], img: IMG("cidade"), falas: placa("Natureza-morta com flores sobre mármore", "Rachel Ruysch", "1716") },
  { id: "janela", lado: 1, z: 1.2, y: 2.1, larg: 1.2, alto: 1.6, cores: ["#10141c", "#4fc3ff", "#e6f0ff", "#2a3550"], img: IMG("janela"), falas: placa("Rosas", "Vincent van Gogh", "1890") },
  { id: "rio", lado: -1, z: -1.4, y: 2.0, larg: 2.2, alto: 1.3, cores: ["#06121a", "#4fc3ff", "#5dffa0", "#ffe0a8"], img: IMG("rio"), falas: placa("Vista de Olinda", "Frans Post", "1662") },
  { id: "kombi", lado: 1, z: -1.8, y: 1.9, larg: 1.1, alto: 0.9, cores: ["#f2eefa", "#ff6a35", "#3a4cff", "#ffc857"], img: IMG("kombi"), falas: placa("Íris", "Vincent van Gogh", "1890") },
  { id: "branco", lado: -1, z: -4.2, y: 2.4, larg: 1.3, alto: 1.7, cores: ["#efe8da"], img: IMG("branco"), falas: placa("Natureza-morta vanitas", "Jacques de Gheyn II", "1603") },
  { id: "flor", lado: 1, z: -4.6, y: 2.6, larg: 1.5, alto: 1.5, cores: ["#14121c", "#b38cff", "#5dffa0", "#ff3fb0"], img: IMG("flor"), falas: placa("Orquídea Cattleya e três beija-flores", "Martin Johnson Heade", "1871") },
]
// 2. conhecer a galeria: a câmera leva você por todos, um de cada vez
export const QUADROS_PRECISA = QUADROS.length

// ── 3. pintar (o gesto "pintar"): a tela em branco no cavalete, do lado da
// planta (ela é a luz da pintura), os potes de tinta ──
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
    // 1. o filme (CenaFilme.tsx toca; a sala põe a câmera devagar na planta)
    { t: "gesto", id: "filme", filme: "ella-planta" },
    { t: "fala", de: "Ella", texto: "ninguém sabe que ela tá aqui. agora vc sabe" },
    { t: "fala", de: "Ella", texto: "e esses eu guardei. ninguém mais ia guardar" },
    // 2. a galeria
    { t: "gesto", id: "quadros" },
    { t: "nucleo", texto: "acervo sem curadoria detectado. 0 visualizações ✓" },
    { t: "fala", de: "Ella", texto: "tem uma tela em branco ali. do lado dela. é sua" },
    { t: "fala", de: "Ella", texto: "a luz é dela. perto dela sai sozinho" },
    // 3. pintar, na luz da planta
    { t: "gesto", id: "pintar" },
    { t: "acao", texto: "ela pendura a sua do lado das dela. a tela toca" },
    { t: "fala", de: "Ella", texto: "…" },
    { t: "fala", de: "Ella", texto: "deixa molhar" },
    {
      t: "escolha",
      opcoes: [
        { label: "por que vc me mostrou?", tom: "dormindo", resposta: [{ de: "Ella", texto: "alguém tinha que ver" }] },
        { label: "e se descobrirem?", tom: "acordando", resposta: [{ de: "Ella", texto: "descobrem. ela fica" }] },
        { label: "ela era dele mesmo?", tom: "acordado", resposta: [{ de: "Ella", texto: "era" }, { de: "Ella", texto: "às vezes eu acho que ele ainda volta pra buscar" }] },
      ],
    },
    { t: "acao", texto: "lá fora, a chuva continua. aqui dentro, menos" },
    { t: "fim" },
  ],
}
