// AS MENSAGENS DOS AMIGOS NO NOTCH (09/11, bíblia §14 e §11): os textos, num arquivo só.
//
// ═══ RASCUNHO: o dono revisa e reescreve tudo aqui ═══
// Só dica de mecânica que existe no jogo, com o jeito de cada um. Nada de trama.
// Frase curta: o notch não cresce, a frase longa rola de lado.
//
// PRA MEXER: cada linha é uma mensagem.
//   id     não repita dentro da mesma pessoa (o save conta quantas vezes passou)
//   texto  sem o nome (o notch põe "Mubarak: …"). {no} = o palco aberto ("no bar")
//   alvo   (opcional) tocar na frase marca esse lugar no mapa; nome = o nome no GPS
//   se     (opcional) só vale quando isso for verdade no save
// Quem entra na lista e quando: disco/amigos.ts.

import { EPISODIOS, episodioFeito } from "./episodios"
import type { HistoriaDisco } from "./historia"
import type { AlvoDbee } from "./sugestoesDbee"

export type QuemAmigo = "D-Bee" | "Mubarak" | "LU2CA" | "Alohan" | "Nizzy" | "Tony Gordo" | "Drew" | "Ella" | "Notti"
export interface MsgAmigo { id: string; texto: string; alvo?: AlvoDbee; nome?: string; se?: (h: HistoriaDisco) => boolean }

// (09/11, episodios.md, "O povo e a revolução") RASCUNHO: a revolução vai esquentando
// com os episódios. Só as ideias do dono: o povo se juntar, a união, derrubar a opressão
// dos robôs e do Núcleo, a água, a água como motor e não só pra esfriar, desligar o
// abastecimento e fritar o Núcleo de dentro pra fora.
const depoisDe = (id: string) => (h: HistoriaDisco) => {
  const ep = EPISODIOS.find((e) => e.id === id)
  return !!ep && episodioFeito(h, ep)
}

export const MENSAGENS_AMIGOS: Record<QuemAmigo, MsgAmigo[]> = {
  // a guia: o que fazer e como (o holo e o mapa). O resto dela mora em sugestoesDbee.ts
  "D-Bee": [
    { id: "mapa", texto: "toca no mapa: cada ícone é uma missão. marcou, aceitou" },
    { id: "anel", texto: "a missão de agora gira em volta do mapa. toca nela e vê os passos" },
    { id: "ajuda", texto: "não sabe o que é um botão? toca no ?, depois nele" },
    { id: "camera", texto: "o olhinho em cima do óculos troca a câmera: de fora ou no volante" },
    // (RASCUNHO, o povo) a guia declama: a cola entre todo mundo
    { id: "povo-plateia", texto: "viu a plateia? cada show junta mais gente. é disso que a gente precisa", se: depoisDe("nectar") },
    { id: "povo-junto", texto: "sozinho ninguém muda nada. o povo junto muda", se: depoisDe("copo") },
    { id: "povo-canto", texto: "o Núcleo manda porque cada um tá no seu canto. a gente precisa se juntar", se: depoisDe("swav") },
    { id: "povo-agua", texto: "a água que esfria o Núcleo é a água que falta pro povo", se: depoisDe("sexta") },
    { id: "povo-plano", texto: "dá pra desligar o abastecimento. sem água, o Núcleo frita de dentro pra fora", se: depoisDe("ontem") },
    { id: "povo-todos", texto: "é o povo todo junto ou não é ninguém", se: depoisDe("rollercoaster") },
  ],
  // os macetes e o dizer não
  Mubarak: [
    { id: "largar", texto: "missão ruim? no mapa tem \"largar essa missão\". dizer não também é jogada" },
    { id: "gotas", texto: "macete: a cada 100 gotas, duas viagens rápidas. ninguém te conta isso" },
    { id: "mortal", texto: "no ar, os dois lados da tela juntos: mortal. manobra enche o turbo" },
    { id: "turbo", texto: "turbo duplo aqui na oficina: drift e voo enchem mais rápido", alvo: { t: "chao", chao: "oficina" }, nome: "a oficina" },
    { id: "mangueira", texto: "compra a mangueira na oficina: rega as flores sem descer da Kombi", alvo: { t: "chao", chao: "oficina" }, nome: "a oficina" },
    { id: "sinuca", texto: "a mesa do Copo tá livre. sinuca é ângulo, não força", alvo: { t: "chao", chao: "bar" }, nome: "o Copo" },
    // (RASCUNHO, o povo) o revolucionário: subversivo, cada vez mais direto
    { id: "povo-ate", texto: "robô manda, povo obedece. até quando?", se: depoisDe("dopamina") },
    { id: "povo-nao", texto: "o Núcleo só existe porque ninguém disse não. junto, a gente diz", se: depoisDe("copo") },
    { id: "povo-motor", texto: "teu motor roda com água. o Núcleo só usa ela pra esfriar. percebeu a diferença?", se: depoisDe("swav") },
    { id: "povo-corta", texto: "corta o abastecimento e o Núcleo esquenta sozinho. só falta gente", se: depoisDe("sexta") },
    { id: "povo-frita", texto: "fecha a água e ele frita de dentro pra fora. com o povo junto, isso acaba", se: depoisDe("rollercoaster") },
  ],
  // precisa de banda: chama pros palcos abertos da carreira
  LU2CA: [
    { id: "banda", texto: "tô sem banda. abre o Guitar Driver e vem tocar comigo {no}" },
    { id: "palco", texto: "{no} tem palco e falta você. perde o medo e sobe" },
    { id: "nivel", texto: "o nível quem escolhe é você, desde o primeiro play. vem" },
    { id: "instrumento", texto: "guitarra, baixo, bateria ou teclado. ou só canta comigo" },
    { id: "suburbio", texto: "no palco do subúrbio tem show. cola comigo", alvo: { t: "chao", chao: "palco" }, nome: "o palco" },
    // (RASCUNHO, o povo)
    { id: "povo-chega", texto: "show pequeno também é show. mas cada um que chega muda tudo", se: depoisDe("nectar") },
    { id: "povo-junta", texto: "cada show tem mais gente. é assim que o povo se junta", se: depoisDe("ontem") },
  ],
  // os beats e o movimento
  Alohan: [
    { id: "camadas", texto: "abre o B4TIDA e toca nos quadrados: a música sobe por camadas" },
    { id: "estudio", texto: "o estúdio tá aberto. bora produzir?", alvo: { t: "chao", chao: "batida" }, nome: "o estúdio" },
    { id: "piloto", texto: "liga o piloto do lado do GPS e faz o beat com as mãos livres" },
    { id: "quadra", texto: "a quadra tá liberada. basquete livre quando quiser", alvo: { t: "chao", chao: "quadra" }, nome: "a quadra" },
    { id: "ginasio", texto: "no ginásio tem basquete e pingue-pongue. escolhe", alvo: { t: "chao", chao: "ginasio" }, nome: "o ginásio" },
    { id: "patins", texto: "de patins, segura o propulsor: jato nas costas. no ar, o turbo é dash" },
    { id: "povo-batida", texto: "batida junta gente. e gente junta muda o jogo", se: depoisDe("copo") }, // (RASCUNHO, o povo)
  ],
  // (a definir nos episódios) os rachas, a loja de discos e as guitarras
  Nizzy: [
    { id: "racha", texto: "emparelha com um carro mexido: pisca \"tirar um racha\". aceita" },
    { id: "prestigio", texto: "racha ganho dá grana e fama. e fama sobe o cachê do show" },
    { id: "loja", texto: "a loja de discos é a do vinil gigante. garimpa", alvo: { t: "chao", chao: "discos" }, nome: "os discos" },
    { id: "guitarras", texto: "na loja tem guitarra, baixo e teclado. junta a grana" },
    { id: "povo-lado", texto: "tem cada vez mais gente do nosso lado. isso incomoda o Núcleo", se: depoisDe("ojala") }, // (RASCUNHO, o povo)
  ],
  // (a definir nos episódios) a água e o que ela compra
  "Tony Gordo": [
    { id: "gotas", texto: "gota na pista vira água. água paga a oficina e rega as flores" },
    { id: "canteiros", texto: "os canteiros ficam no oeste. flor gosta de água", alvo: { t: "chao", chao: "flores" }, nome: "as flores" },
    { id: "luxo", texto: "quer um carro igual ao meu? o de luxo tá na loja. se tiver grana" },
    { id: "povo-feira", texto: "a feira inteira sabe quem segura a água. falta se juntar", se: depoisDe("swav") }, // (RASCUNHO, o povo)
  ],
  // se expressar e se desafiar sem medo
  Drew: [
    { id: "brecho", texto: "o brechó tem roupa na arara. veste o que te dá medo", alvo: { t: "chao", chao: "brecho" }, nome: "o brechó" },
    { id: "parede", texto: "achou parede livre nos túneis? toca em pintar e assina", alvo: { t: "chao", chao: "tuneis" }, nome: "os túneis" },
    { id: "corrida", texto: "corrida de rua perto do bar, de moto ou de patins. sem medo", alvo: { t: "chao", chao: "bar" }, nome: "perto do bar" },
    { id: "povo-medo", texto: "sem medo de se juntar. o Núcleo conta com o seu medo", se: depoisDe("sexta") }, // (RASCUNHO, o povo)
  ],
  // (a definir nos episódios) a galeria e pintar
  Ella: [
    { id: "pintar", texto: "na galeria dá pra pintar. cada cor é um instrumento…", alvo: { t: "chao", chao: "galeria" }, nome: "a galeria" },
    { id: "parede", texto: "o que você pinta fica na parede da galeria. de verdade…" },
    { id: "povo-rosto", texto: "cada rosto novo no show é menos poder pros robôs…", se: depoisDe("ontem") }, // (RASCUNHO, o povo)
  ],
  // os instrumentos, respirar e silenciar
  Notti: [
    { id: "violao", texto: "tá tocando música? abre o violão ali do lado e segue o tom da faixa", se: (h) => !h.perdeuViolao },
    { id: "guitarra", texto: "no show, a guitarra é o Guitar Driver: uma coluna, uma nota" },
    { id: "baixo", texto: "o baixo é a corda: sobe e desce e pega as faixas coloridas" },
    { id: "respira", texto: "quando o afinador disser respira, respira" },
    { id: "silencio", texto: "o óculos desliga o holo (H). às vezes a estrada basta" },
    // (RASCUNHO, o povo)
    { id: "povo-respira", texto: "união não é gritar. é respirar junto", se: depoisDe("rollercoaster") },
    { id: "povo-silencio", texto: "silêncio. é isso que o Núcleo vai ouvir quando a água parar", se: depoisDe("rollercoaster") },
  ],
}
