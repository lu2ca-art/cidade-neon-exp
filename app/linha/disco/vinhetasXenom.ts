// AS VINHETAS DA RÁDIO XENOM (RASCUNHO, 05/11; bíblia §6: "no subúrbio, a rádio do
// subúrbio fala do que acontece lá e serve de gancho pras missões de lá").
//
// O locutor da Xenom fala entre uma música e outra. Ainda sem voz: a fala passa
// como legenda curta no display da rádio (holo) e no notch, ~5 s. Quando houver a
// voz gravada, é só pôr o arquivo em `audio` (ex.: "/audio/vinhetas/xenom-mubarak-1.mp3"):
// o jogo toca a voz por cima (a música abaixa sozinha) e a legenda continua.
//
// ── COMO FUNCIONA (pro dono reescrever à vontade) ──
// - `missao` + `quando`: a vinheta só entra se a missão estiver nesse estado agora
//     "disponivel" = dá pra pegar e ele ainda não pegou (o gancho)
//     "ativa"      = ele pegou e ainda não terminou (o lembrete)
//     "feita"      = já fez (o subúrbio comenta depois)
// - `fase`: só nessa fase da história (antes da carreira: bar, oficina, subir…)
// - sem nada disso: clima geral, entra a qualquer hora
// - a rádio escolhe sozinha: a missão ativa e as disponíveis primeiro (2 de cada
//   3 vinhetas), o clima no meio. Mexer na escolha: disco/radios.ts (vinhetaXenom)
//
// Curtas (cabem em ~5 s de leitura), gíria leve, sem explicar mecânica.

import type { FaseDisco } from "./historia"
import type { MissaoId, PortaId } from "./portas"
import type { LugarChao } from "./historia"

export interface VinhetaXenom {
  id: string
  texto: string
  /** a voz gravada (null até gravar) */
  audio: string | null
  missao?: MissaoId
  quando?: "disponivel" | "ativa" | "feita"
  fase?: FaseDisco
  /** (06/11) fala de um lugar do chão do subúrbio (só pra quem lê; entra com o clima) */
  lugar?: LugarChao
  /** (06/11) só depois que essa porta abriu (o lugar trancado não é anunciado como aberto) */
  porta?: PortaId
}

/** o nome que aparece no display enquanto o locutor fala */
export const LOCUTOR_XENOM = "RÁDIO XENOM"

const v = (id: string, texto: string, extra: Partial<VinhetaXenom> = {}): VinhetaXenom => ({ id, texto, audio: null, ...extra })

export const VINHETAS_XENOM: VinhetaXenom[] = [
  // ── as missões do subúrbio ──
  // a oficina (o mecânico)
  v("oficina-1", "o mecânico tá catando sucata no lixão de novo. diz que dá motor. eu acredito", { missao: "oficina", quando: "disponivel" }),
  v("oficina-2", "tem uma kombi parada na oficina sem motor. alguém leva umas peças pro velho?", { missao: "oficina", quando: "ativa" }),
  v("oficina-3", "a goteira da oficina virou combustível. só no xenom mesmo", { missao: "oficina", quando: "feita" }),
  // a quadra (Alohan)
  v("quadra-1", "a quadra tá vazia faz tempo. o Alohan diz que falta o beat. quem faz?", { missao: "quadra", quando: "disponivel" }),
  v("quadra-2", "o Alohan tá na quadra montando um som. diz que se tiver beat, a galera volta", { missao: "quadra", quando: "disponivel" }),
  v("quadra-3", "galera, o Alohan ainda tá esperando o beat lá na quadra. não deixa ele no vácuo", { missao: "quadra", quando: "ativa" }),
  v("quadra-4", "a quadra encheu ontem. teve beat, teve jogo, teve gente. lembrei de antes", { missao: "quadra", quando: "feita" }),
  // os túneis
  v("tuneis-1", "embaixo das raízes tão correndo de novo. bmx, patins, skate. cada um escolhe o caminho", { missao: "tuneis", quando: "disponivel" }),
  v("tuneis-2", "dizem que tem parede limpa nos túneis esperando um nome. o seu, quem sabe", { missao: "tuneis", quando: "disponivel" }),
  v("tuneis-3", "os túneis tão chamando. desce pelo elevador e não olha pra trás", { missao: "tuneis", quando: "ativa" }),
  v("tuneis-4", "tem um nome novo pintado lá embaixo. ninguém sabe de quem é. eu sei", { missao: "tuneis", quando: "feita" }),

  // ── o subúrbio fofocando da cidade (o gancho pra subir) ──
  v("drew-1", "o Drew de novo em casa numa sexta. se arrumando pro espelho. alguém tira esse menino de lá", { missao: "drew", quando: "disponivel" }),
  v("drew-2", "o Drew tá montando um look e não sai de casa. vai lá dar uma força", { missao: "drew", quando: "ativa" }),
  v("mubarak-1", "tão dizendo que o Mubarak tá procurando um disco raro lá no bar do copo…", { missao: "mubarak", quando: "disponivel" }),
  v("mubarak-2", "o Mubarak quer te mostrar um vinil antigo. de quando a gente ouvia de verdade", { missao: "mubarak", quando: "disponivel" }),
  v("mubarak-3", "o copo do Mubarak continua cheio. ele ainda tá te esperando pra escolher o som", { missao: "mubarak", quando: "ativa" }),
  v("xeriff-1", "a polícia lá de cima fala numa frequência que ninguém pega. o Xeriff quer pegar", { missao: "xeriff", quando: "disponivel" }),
  v("xeriff-2", "o Xeriff tá na plataforma. não confia em ninguém. nem em mim. vai lá", { missao: "xeriff", quando: "ativa" }),
  v("lu2ca-1", "tem um palco vazio na rua da Nectar esperando alguém subir", { missao: "lu2ca", quando: "disponivel" }),
  v("lu2ca-2", "o palco da Nectar tá montado. só falta você", { missao: "lu2ca", quando: "ativa" }),
  v("ella-1", "a Ella pinta escondida e não mostra pra ninguém. tem coragem guardada ali", { missao: "ella", quando: "disponivel" }),
  v("ella-2", "a Ella deixou a porta aberta. não repara na bagunça", { missao: "ella", quando: "ativa" }),
  v("notti-1", "o fliperama lá no topo apagou e ninguém percebeu. o Notti percebeu", { missao: "notti", quando: "disponivel" }),
  v("notti-2", "o Notti ainda tá tentando acordar as máquinas. uma ficha só, ele disse", { missao: "notti", quando: "ativa" }),
  v("nizzy-1", "a montanha-russa parou bem no meio. a Nizzy tá lá com a câmera na mão", { missao: "nizzy", quando: "disponivel" }),
  v("nizzy-2", "a Nizzy ainda tá no parque. o sobe e desce não volta sozinho", { missao: "nizzy", quando: "ativa" }),
  v("tony-1", "o Tony Gordo reclamou que lá em cima tudo tem gosto de nada. tem horta atrás do restaurante", { missao: "tony", quando: "disponivel" }),
  v("tony-2", "a horta do Tony tá esperando água. sem pressa, que é assim que fica bom", { missao: "tony", quando: "ativa" }),
  v("final-1", "os nove tão nos pontos. a D-Bee tá vindo. vai chover na cidade", { missao: "final", quando: "disponivel" }),
  v("final-2", "é hoje. a D-Bee aciona a chuva. ninguém fica em casa", { missao: "final", quando: "ativa" }),

  // ── as fases da história (antes da carreira) ──
  v("fase-bar", "tem forasteiro no bar. chegou do deserto numa kombi velha. pede um copo pra ele", { fase: "bar" }),
  v("fase-oficina", "a kombi do forasteiro tá na oficina. motor? que motor", { fase: "oficina" }),
  v("fase-subir", "a kombi tá pronta. a cidade fica lá em cima. o elevador fica no anel", { fase: "subir" }),
  v("fase-nectar", "lá em cima já tão falando de você. sobe com calma", { fase: "nectar" }),

  // ── (06/11) os lugares do chão do subúrbio e o que rola lá (entram no lugar do
  // clima, alternando com ele; a rádio não repete as últimas) ──
  v("lugar-ginasio-1", "o ginásio lá no fundo tá com a luz acesa. tem gente jogando até tarde", { lugar: "ginasio", porta: "ginasio" }),
  v("lugar-ginasio-2", "o arco do ginásio voltou a piscar. quem passa ali sai suado", { lugar: "ginasio", porta: "ginasio" }),
  v("lugar-galeria-1", "abriu quadro novo na galeria, perto da oficina. entra, que é de graça", { lugar: "galeria", porta: "galeria" }),
  v("lugar-galeria-2", "na galeria tem parede que só mostra o que você não quer ver. vai lá ver", { lugar: "galeria", porta: "galeria" }),
  v("lugar-discos-1", "chegou caixa de vinil na loja de discos. o vinil gigante na porta não deixa errar", { lugar: "discos" }),
  v("lugar-discos-2", "na loja de discos tem lado b que nem o núcleo sabe que existe", { lugar: "discos" }),
  v("lugar-batida-1", "o estúdio da batida tá com as caixas ligadas. faz um beat e traz pra gente tocar", { lugar: "batida", porta: "batida-estudio" }),
  v("lugar-batida-2", "batida nova saindo do estúdio. o grave chega aqui na rádio", { lugar: "batida", porta: "batida-estudio" }),
  v("lugar-flores-1", "os canteiros lá no oeste tão floridos. alguém anda regando escondido", { lugar: "flores" }),
  v("lugar-flores-2", "no meio da poeira tem flor nascendo. passa nos canteiros e leva uma muda", { lugar: "flores" }),
  v("lugar-brecho-1", "o brechó pendurou roupa nova na arara. coisa de antes do núcleo", { lugar: "brecho" }),
  v("lugar-brecho-2", "quer mudar o visual? o brechó do subúrbio tem jaqueta que já viu de tudo", { lugar: "brecho" }),
  v("lugar-palco-1", "o palco do subúrbio tá montado hoje. o show da noite começa quando você chegar", { lugar: "palco" }),
  v("lugar-quadra-1", "a quadra tá aberta. cesta, alambrado e o Alohan no som. joga uma", { lugar: "quadra", porta: "quadra" }),
  v("lugar-tuneis-1", "lá embaixo nos túneis sobrou tinta. parede limpa é convite", { lugar: "tuneis", missao: "tuneis", quando: "feita" }),
  v("lugar-metro-1", "o trem da linha 9 continua parado no salão dos túneis. dizem que o guarda ainda tá lá dentro", { lugar: "tuneis", missao: "tuneis", quando: "feita" }),

  // ── clima geral do subúrbio ──
  v("clima-1", "69.9, rádio xenom. aqui embaixo o sinal do núcleo chega fraco. aproveita"),
  v("clima-2", "no xenom a festa é na garagem. traz o som que a gente traz o resto"),
  v("clima-3", "esfriou no subúrbio. fecha a janela da kombi e aumenta o rádio"),
  v("clima-4", "se você tá ouvindo isso, ainda tá acordado. a gente também"),
  v("clima-5", "o núcleo apagou o nome dessas músicas. a música ficou. toca aí"),
  v("clima-6", "tem poeira do deserto entrando pelas frestas de novo. normal"),
  v("clima-7", "rádio xenom, a que pega embaixo das raízes também"),
  v("clima-8", "essa vai pra quem tá dirigindo sem saber pra onde"),
]
