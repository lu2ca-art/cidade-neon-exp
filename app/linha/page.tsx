"use client"

// CIDADE NEON — o celular, redesenhado.
//
// entrada → a chegada na cidade (de Kombi, até o Núcleo cortar a música e
// a cor) → D-Bee no N3XO → grupo "linha 222" (qual estação você
// é) → o celular: todos os apps abertos desde o começo (os novos e os da
// versão anterior), a Kombi pra rodar a cidade quando quiser, e os níveis
// liberando coisa nova aos poucos.

import { registrarRacha } from "./disco/corredores"
import { placarComCorrida, type ResultadoRua } from "./disco/corridaRua"
import { useCallback, useEffect, useInsertionEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react"
import "./linha.css"
import { ESTACOES, NIVEIS, dataCurta, estacao as getEstacao, lancada, missao, nivelDe, UNTITLED, type EstacaoId, type ProvaId } from "./data"
import { ROTEIROS, VOZES, jogoVelho, type ChatId } from "./roteiros"
import { VAZIO, carregar, gravar, hoje, type Item, type Save } from "./estado"
import { decidirModoSave } from "./chaveSave"
import { ARQUIVO, type FreqId } from "./radio"
import { TODAS_FAIXAS, ehDoLugar, proxima } from "./programa"
import { Chat, type Destino } from "./chat"
import { MISSOES, abertas, alvoDe, ativa, etapaDe, type Alvo, POPULARIDADE } from "./missoes"
import { CenaLugar, type ResultadoCena } from "./cena"
import { CENA_INICIO, CENA_MUBARAK_DREW, cenaDe, type Reliquia } from "./cenas"
import { CENA_GALERIA_ELLA } from "./disco/ella"
import { GESTOS_3D, precarregarSala, temSala } from "./interior/registro"
import { ouvirSala } from "./interior/bus"
import { LUGARES, type LugarId } from "./lugares"
import type { IconeMapa } from "./estrada/Mapa"
import { agoraDaMissao } from "./disco/agora"
import { proximaFreq } from "./radio"
import { InvasaoNucleo, type Invasao } from "./nucleo"
import { Prova } from "./provas"
import { Jardim, Violao } from "./recursos"
import type { Cinema, Corrida as CorridaTipo, Stats } from "./estrada/Corrida"
import { qualMapa } from "./estrada/qualMapa"
import { Chegada } from "./chegada"
import { LigacaoNaKombi, type Transcricao } from "./ligacao"
import { LIGACOES, ligacaoDaMissao, sortearModo, type Ligacao } from "./ligacoes"
import { APPS, AppJanela, AppTopo, Fliperama, Home, LEGADO, N3xo, Objetos, Ouvir, chamados, legadoFeito, type AppId, type Chamado } from "./os"
import { Bloqueio, Entrada, Final, Mapa, Radio } from "./telas"
import { aoChegarNoSuburbio, definirZonaSom } from "./disco/radioAntiga"
import { introDe } from "./disco/introMissoes"
import { IntroMissao } from "./disco/IntroMissao"
import { CHEGADA_MISSAO, INTRO_ADIADA, lerGuia } from "./estrada/alvoMissao"
import { abafar, abaixarUmPouco, audioCtx, fazerMusica, disco, fonteSom, ligarChuva, moeda, mudo, pistaSom, player, silenciarKombi, somCena, trilha, voz } from "./som"
import { TRILHA_PROPRIA_DAS_MISSOES, somDaMissao, somDoLugar } from "./disco/sons"
import { track } from "@/lib/analytics"
import { Plataformas, PreSave } from "./plataformas"
import { Loja } from "./loja"
import { ENTRADAS, IDS_ABERTOS, ehAberto, type LugarAberto } from "./disco/abertos"
import { Cadeado, PARAM_TRANCA } from "./Trancado"
import type { Categoria } from "./economia-rascunho"
import type { AppDef } from "./os"
import { PostoDentro } from "./posto"
import { ACERVO } from "./discos"
import { cacheDoShow, comprar, comprarMelhoria, ganhar, gastar } from "./economia"
import { PAGA, POSTO } from "./economia-rascunho"
import { EVENTO_CADERNO } from "./Caderno"
import type { Onde } from "./parte"
import { aplicarParteDeTeste, parteAberta } from "./parteTeste"
import { BLOCOS, ITENS, NEON_POR_ITEM, PRIMEIRA, blocoAtual, emTutorial, feito, ligou, type ItemTutorial } from "./tutorial"
import dynamic from "next/dynamic"
import { CANTEIROS, ESPECIES, canteiroPorId } from "./estrada/canteiros"
import { abertoAgora, abreAs, ehDia, horaDaHistoria, turnoDe, virouODia } from "./relogio"
import { limparDaCidade } from "./paginas"
import { atalhoPorId, atalhosLiberados, type Ir as IrAtalho } from "../teste/atalhos"
import { perderViolao, tomarJetpack } from "./disco/historia"
import { CHAO_LUGARES, CENA_BAR_PROLOGO, CENA_CASA_DISCO, CENA_CASA_HOLO, CENA_CASA_INSTRUMENTOS, CENA_CASA_TAMBOR, CENA_CASA_VISITA, CHEGADA, casaNoLogin, comHistoria, historiaAtiva, historiaDe, horaDaChegada, type LugarChao } from "./disco/historia"
import { CONFIG_QUEBRA, FALAS_QUEBRA, consertar, quebrada, quebrar, sortearQuebra } from "./disco/quebra"
import { CONFIG_PERSEGUICAO, FALAS_PERSEGUICAO, emPerseguicao, escolherVeiculo, kombiJogada, metroFeito, veiculosLiberados, perseguir, podePerseguir, veiculoDe, veiculoPorId } from "./disco/perseguicao"
import { CENA_OFICINA, FALAS_OFICINA, LIXO, MECANICO, OBJETIVO_OFICINA, OFICINA_CFG, alvoOficina, lixoDe, passoOficina, pecasCatadas, pecasFaltando } from "./disco/oficina"
import { Goteira, Montagem, Pagamento } from "./disco/OficinaTelas"
import { definirChaoAtivos, ehPeca } from "./disco/achados"
import { Violao as ViolaoMundo } from "./disco/Violao"
import { emMetro, entrarNoMetro, podeMetro, type PassoMetro } from "./disco/metro"
import { MetroFuga } from "./disco/MetroFuga"
import { GRAFITES as GRAFITES_T12 } from "./grafite/grafites"
import { CENA_BAR_VISITA, cenaVisita, donaDaFaixa, facaMissao, pedidoDaPorta, trancaSinuca } from "./disco/vitrine"
import { carregarTrincheiras, limparVoltaDasTrincheiras, nascerNoTunel, subiuDoTunel, voltaDasTrincheiras } from "./disco/tuneis"
// (30/10) a volta do túnel: a Kombi esperou na porta
const FALA_VOLTA_TUNEL = "voltou lá de baixo. a kombi tava te esperando na porta. as raízes seguem lá"
import type { EventoHistoria } from "./estrada/Corrida"
import { InicioDisco } from "./disco/Inicio"
import { DUR as DUR_MINHOCA, Minhoca } from "./disco/Minhoca"
import { VISOR, Visor, type VisorId } from "./disco/Visor"
import { TvHolo } from "./disco/TvHolo"
import { Freq } from "./disco/Freq"
import { type FaixaShow, type ResultadoShow } from "./disco/Show"
import { faixaXenom, lerShowXenom, registrarXenom, showXenom, XENOM_CONFIG } from "./disco/xenom"
import { Show } from "./disco/ShowBanda"
import { Jornal, calcularManchete } from "./disco/Jornal"
import type { HistoriaDisco, Manchete } from "./disco/historia"
import { aplicarRecompensa } from "./disco/recompensas"
import { linhaRecompensa } from "./disco/instrumentos"
import { IDS13, ehMissao13, MISSOES13, alvo13, checklist13, concluir, contarEvento, disponiveis, emTeste, feita13, instrumentosGanhos, ordemDe, kombiNoConserto, portaAberta, normalizarMissao, ofertas13, pecaAgora13, pecaFeita, sincronizar, trancado, type CenaId, type MissaoId, type Oferta13, type PortaId, type Recompensa13 } from "./disco/portas"
import { FinalTela } from "./disco/FinalTela"
import { definirFinalFeito, type MomentoFinal } from "./disco/final"
import { motoLiberada } from "./estrada/zonas"
import { Peca } from "./disco/pecas/Peca"
import { brilhar } from "./disco/brilho"
import { avisarRadio, notch } from "./estrada/Holo"
import { definirContextoRadio, ligarRadiosPorZona, radioFreq, registrarTocador } from "./disco/radios"
import { vib } from "./som-carro"
import { RecompensaHolo } from "./disco/TutorialHolo"
import { CONFIG_TUTORIAL, faltaRecompensaHolo } from "./disco/tutorialConf"
import { TrilhaPedras } from "./disco/TrilhaPedrasTela"
import { trilhaEnsina } from "./disco/trilhaPedras"
import { Letra } from "./disco/Letra"
import { letraDe } from "./disco/letras"
import { Palcos } from "./disco/MenuPalcos"
import { NIVEL_MAX, cacheNoPalco, lerShowDoPalco, nomeDoPalco, registrarShow, showDoPalco, PALCOS_CARREIRA } from "./disco/palcos"
import { COR_PISTA } from "./disco/historia"
import { PingPong } from "./disco/PingPong"
import "../ginasio/ginasio.css"
import { guardarCapsula, guitarLivre } from "./disco/capsula"
import { luzDasPistas, pistasFeitas } from "./estrada/atos"
import { PISTAS, type PistaId } from "./estrada/pistas"
import { definirMemoriaDbee, ouvirMemoriaDbee } from "./disco/sugestoesDbee"

// PASSO 1 da otimização: os ambientes 3D vêm em pedaços separados do pacote,
// baixados só quando a pessoa chega neles (a estrada ao entrar na Kombi, a
// sala ao passar na frente do lugar, a viagem no ep. 3). A tela inicial, o
// celular e as conversas abrem sem three.js.
const Corrida = dynamic(() => import("./estrada/Corrida").then((m) => m.Corrida), { ssr: false })
// (T10) a quadra: o basquete (3D) e o B4TIDA só carregam quando a peça abre
const Basquete = dynamic(() => import("../ginasio/basquete").then((m) => m.Basquete), { ssr: false })
const BatidaMissao = dynamic(() => import("./disco/BatidaMissao").then((m) => m.BatidaMissao), { ssr: false })
const Interior = dynamic(() => import("./interior/Interior").then((m) => m.Interior), { ssr: false })
const Viagem = dynamic(() => import("./viagem").then((m) => m.Viagem), { ssr: false })
// (T63) as trincheiras (os túneis do T11, a corrida do T13, as motos do T14), dentro do jogo
const Trincheiras = dynamic(carregarTrincheiras, { ssr: false })
// (vitrine, 02/11) a sinuca do bar do subúrbio, no treino: só baixa quando abre
const SinucaBar = dynamic(() => import("./disco/SinucaBar").then((m) => m.SinucaBar), { ssr: false })
// (T64, lote D) o grafite das trincheiras (puxa o geo.ts delas: só baixa junto)
const GrafiteTrincheiras = dynamic(() => import("./disco/Grafite").then((m) => m.GrafiteTrincheiras), { ssr: false })
// (T64, 06/11) o trem parado no salão do metrô das trincheiras: a fuga de novo (só baixa lá embaixo)
// os 3 grafites da parede (os mesmos de trincheiras/geo.ts GRAFITES_NA_PAREDE; só os ids, sem puxar o 3D)
const GRAFITES_IDS = GRAFITES_T12.slice(0, 3).map((g) => g.id)
const MetroTuneis = dynamic(() => import("./disco/MetroTuneis").then((m) => m.MetroTuneis), { ssr: false })

// (leveza B) o save no localStorage: no máximo uma gravação a cada ~3 s
const ESPERA_GRAVAR = 3000

type ChatRoteiro = Exclude<ChatId, "ojala" | "swav" | "rollercoaster">

type Volta = { t: "home" } | { t: "app"; id: AppId } | { t: "corrida"; destino: null }

// quanto NEON rende acordar uma pessoa (uma missão inteira)
// cada missão completa vale 50 NEON; cada item do tutorial, 10 (LU2CA, 05/10)
const NEON_POR_PESSOA = PAGA.pessoaAcordada // (T03) economia-rascunho.ts
// o tutorial: depois de resgatar o Mubarak, levar ele até a casa do Drewboy
const levarDrewboy = (s: Save) => emTutorial(s) && s.objetos.includes("copo") && !feito(s, "drewboy")
// o tutorial: chegou na cidade, encher o tanque no posto
const irAoPosto = (s: Save) => emTutorial(s) && feito(s, "tanque") && !feito(s, "posto")
// o combustível (06/10, LU2CA)
const PRECO_TANQUE = POSTO.tanque // (T03) economia-rascunho.ts
const PRECO_GALAO = POSTO.galao
const GALAO = 0.35 // o quanto um galão põe no tanque (dá pra chegar na cidade)

type Tela =
  | { t: "entrada" }
  | { t: "bloqueio" }
  | { t: "chegada" }
  | { t: "deserto" }
  // o COMEÇO (05/10): a casa da D-Bee, longe de tudo, e a reta até a cidade
  | { t: "casa" }
  | { t: "reta" }
  | { t: "chat"; id: ChatRoteiro; volta: Volta }
  | { t: "home" }
  | { t: "app"; id: AppId }
  | { t: "corrida"; destino: EstacaoId | null }
  | { t: "final" }

type Aviso = { id: number; titulo: string; texto: string; cor: string }

// (T02) AS 13 MISSÕES (disco/portas.ts): arte → jogo → a porta abre → a
// recompensa. A história do save, com as faixas antigas já feitas contando
function hist13(s: Save) { return sincronizar(historiaDe(s), s.objetos) }
// (T49, lote D) os instrumentos ganhos que ele ainda não viu na casa da D-Bee
const instrumentosNovos = (h: HistoriaDisco) => instrumentosGanhos(h).filter((x) => !(h.instrumentosVistos ?? []).includes(x))
// a luz das pistas (as torres, atos.ts): a missão da cidade só aparece com a pista acesa
const luzDoSave = (s: Save) => luzDasPistas(pistasFeitas(s.objetos))
// (21/10, a feira) a missão de agora na carreira: a que ele PEGOU na feira; sem
// ela, nenhuma: a feira oferece
function missaoDoSave(s: Save): MissaoId | null {
  const h = hist13(s)
  if (h.fase !== "carreira") return null
  const id = normalizarMissao(h.missao)
  return id && !feita13(h, id) ? id : null
}
// as ofertas da feira: as disponíveis que ele não pegou
function feiraDoSave(s: Save): Oferta13[] {
  const h = hist13(s)
  if (h.fase !== "carreira") return []
  const pega = missaoDoSave(s)
  return ofertas13(h, disponiveis(h, luzDoSave(s)).filter((id) => id !== pega))
}
// (T02) o show não fecha mais missão: é o Guitar Driver aberto agora. "rua:<faixa>"
// = a oportunidade na rua (paga); "missao:<id>" = a peça de tocar ao vivo (a do LU2CA)
function confShow(id: string): { faixa: FaixaShow; lugar: string; cor: string; palco: string } | null {
  // (T21) um show do subúrbio xenom: "xenom:<id>" (disco/xenom.ts), no palco do multiverso dele
  const xs = lerShowXenom(id)
  if (xs) return { faixa: faixaXenom(xs.id), lugar: `no ${xs.multiverso.replace(/^o /, "")}`, cor: xs.cor, palco: xs.gd }
  // (T20) um palco da carreira: "palco:<palco>:<faixa>" (disco/palcos.ts)
  const pc = lerShowDoPalco(id)
  if (pc) return { faixa: pc.faixa, lugar: nomeDoPalco(pc.palco).no, cor: pc.palco.cor, palco: pc.palco.gd }
  if (id.startsWith("rua:")) {
    const p = PISTAS.find((x) => x.id === id.slice(4))
    return p ? { faixa: p.id, lugar: "na rua", cor: COR_PISTA[p.faixa] ?? "#ffc857", palco: "rua" } : null
  }
  if (id.startsWith("missao:")) {
    const m = MISSOES13[id.slice(7) as MissaoId]
    const como = m && [m.arte.como, m.jogo.como].find((c) => c?.t === "show")
    if (!m || !como || como.t !== "show") return null
    const lugar = m.lugar.lugar ? LUGARES[m.lugar.lugar] : null
    return { faixa: como.faixa, lugar: lugar?.no ?? "no subúrbio", cor: m.cor, palco: m.lugar.lugar ?? "rua" }
  }
  return null
}

// (leveza B) uma função que não muda entre os redesenhos e chama sempre a versão
// mais nova (o <Corrida> e a <Cena> não redesenham por função nova à toa)
function useFixo<A extends unknown[], R>(f: (...a: A) => R): (...a: A) => R {
  const ref = useRef(f)
  useInsertionEffect(() => { ref.current = f })
  return useCallback((...a: A) => ref.current(...a), [])
}
// (leveza B) o mesmo objeto enquanto o conteúdo for o mesmo (dados simples, sem função)
function useMesmo<T>(v: T): T {
  const k = JSON.stringify(v) ?? ""
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => v, [k])
}

// (leveza B) a hora que a estrada mostra (o letreiro do holo) anda a cada 10 s
// aqui dentro: só a estrada redesenha, a página não (a hora mora numa ref)
function RelogioVivo({ hora, ouvinteRef, children }: { hora: number; ouvinteRef: RefObject<((h: number) => void) | null>; children: (hora: number) => ReactNode }) {
  const [h, setH] = useState(hora)
  // o save mudou a hora (marco, dormir, a chegada): segue o save
  const [doSave, setDoSave] = useState(hora)
  if (hora !== doSave) { setDoSave(hora); setH(hora) }
  useEffect(() => {
    ouvinteRef.current = setH
    return () => { if (ouvinteRef.current === setH) ouvinteRef.current = null }
  }, [ouvinteRef])
  return <>{children(h)}</>
}

export default function LinhaPage() {
  // o caderno do dono aberto pausa a corrida (Caderno.tsx)
  const [caderno, setCaderno] = useState(false)
  useEffect(() => {
    const f = (e: Event) => setCaderno(!!(e as CustomEvent<{ aberto: boolean }>).detail?.aberto)
    window.addEventListener(EVENTO_CADERNO, f)
    return () => window.removeEventListener(EVENTO_CADERNO, f)
  }, [])
  const [save, setSave] = useState<Save>(VAZIO)
  const saveRef = useRef(save)
  useEffect(() => { saveRef.current = save }, [save])
  // (mapa-disco, LU2CA 20/10) a história nova manda no disco (disco/historia.ts):
  // enquanto ela está ativa, a narrativa antiga (ligações, invasões, o tutorial
  // do posto, as conversas chamando) fica quieta
  const [D] = useState(() => qualMapa() === "disco")
  const hist = historiaDe(save)
  const HIST = D && historiaAtiva(hist)
  // o buraco de minhoca rolando (B4)
  const [minhoca, setMinhoca] = useState(false)
  // (22/10, 2.1) os fachos do túnel seguem por cima da queda, freando, uns 2,6 s
  const [rastroMinhoca, setRastroMinhoca] = useState(false)
  // (T37) este login cai na casinha (quem já passou por ela): a Corrida faz a chegada
  const [chegadaLogin, setChegadaLogin] = useState(false)
  // (disco, B15b) o visualizador: os links de fora abrem dentro do jogo
  const [visor, setVisor] = useState<VisorId | null>(null)
  // (disco, B8) o jornal do dia seguinte ao show
  const [jornal, setJornal] = useState<Manchete | null>(null)
  // (21/10, "uma missão = uma música") acabou a missão de uma linha: o destaque
  // de ouvir a faixa lá fora ou comprar o disco, no holo (depois do jornal; logo some)
  const [ouvirFim, setOuvirFim] = useState<{ pista: PistaId; id: number } | null>(null)
  const [atalhoTeste, setAtalhoTeste] = useState<IrAtalho | null>(null)
  const [pronto, setPronto] = useState(false)
  const [tela, setTela] = useState<Tela>({ t: "entrada" })
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [semSom, setSemSom] = useState(false)
  const [xpFlutua, setXpFlutua] = useState<{ id: number; n: number } | null>(null)
  const [radio, setRadio] = useState<{ titulo: string; tocando: boolean } | null>(null)
  const nivelAnt = useRef<number | null>(null)
  const [provaDev, setProvaDev] = useState<ProvaId | null>(null)
  const [corridaDev, setCorridaDev] = useState(false)
  // a estrada, uma vez aberta, fica montada por baixo de tudo: o celular
  // sobe por cima e, ao fechar, a Kombi continua exatamente de onde parou
  const [estrada, setEstrada] = useState(false)
  // o Núcleo invadindo (janelas de vírus por cima de tudo)
  const [invasao, setInvasao] = useState<Invasao | null>(null)
  const [destinoEstrada, setDestinoEstrada] = useState<EstacaoId | null>(null)
  // a chegada: a Kombi anda sozinha (cinema) e a cidade perde a cor até a
  // conversa com a D-Bee acabar
  const [cinema, setCinema] = useState<Cinema>(null)
  const [cinza, setCinza] = useState(false)
  // a chegada: o grupo 222 rola na ilha da Kombi, mensagem por mensagem.
  // null = não está rolando; número = a próxima mensagem
  const [introGrupo, setIntroGrupo] = useState<number | null>(null)
  const [falaIntro, setFalaIntro] = useState<{ id: number; de: string; texto: string; ensina?: boolean } | null>(null)
  // conversa rolando no painel da Kombi (dirigindo). Quando precisa do
  // celular de verdade, vira tela cheia com a MESMA conversa
  const [aoVivo, setAoVivo] = useState<ChatRoteiro | null>(null)
  // a conversa aberta porque desceu na estação (destrava o passo "chegar")
  const [naEstacao, setNaEstacao] = useState(false)
  // a cena de um lugar rolando (encostou na vaga): a câmera corta pra lá
  // inicio: a casa da D-Bee na abertura (CENA_INICIO)
  const [cena, setCena] = useState<{ lugar: LugarId; missao: EstacaoId; pegar: boolean; inicio?: boolean; especial?: "mubarak-drew" | "disco-casa" | "disco-bar" | "disco-oficina" | "ella-galeria" | "dbee-instrumentos" | "visita-bar" | "visita" } | null>(null)
  // a viagem pra fora da cidade (ep. 3): antes da cena de um lugar `fora`
  // dentro de uma sala (ou na viagem pra fora) a estrada sai da tela e libera
  // a memória; ao voltar, a Kombi reaparece onde estava (Corrida: RETOMAR)
  const [voltaDaSala, setVoltaDaSala] = useState(false)
  // o painel MISSÕES: tudo que está aberto + "ir agora"
  const [painelMissoes, setPainelMissoes] = useState(false)
  // dentro do posto (posto.tsx): primeira = a apresentação do LU2CA
  const [noPosto, setNoPosto] = useState<{ primeira: boolean } | null>(null)
  // (T47, lote D) o elevador de terror: a sala própria (como o posto), passeio
  // livre. Abre na porta da torre (chao:torre) ou no ?parte=elevador; fecha no
  // fim-gesto da sala (chegou no fundo do andar)
  const [noElevador, setNoElevador] = useState(false)
  const [falaElevador, setFalaElevador] = useState<string | null>(null)
  const abrirPostoRef = useRef(() => {})
  // conversas que chegaram numa pergunta no painel: esperam no N3XO (não
  // chamam de novo na estrada até a pessoa abrir e responder)
  const [adiadas, setAdiadas] = useState<string[]>([])
  const [teleporte, setTeleporte] = useState<{ chave: number; area: FreqId; lugar?: LugarId; frac?: number } | null>(null)
  const [viagem, setViagem] = useState<{ lugar: LugarId; missao: EstacaoId; pegar: boolean; chegou?: boolean } | null>(null)
  // (T63) lá embaixo, nas trincheiras: "descendo" = o escuro da porta (a estrada ainda na cena); depois, só as trincheiras
  const [trincheiras, setTrincheiras] = useState<{ missao: MissaoId | null; descendo: boolean } | null>(null)
  // (T64, 06/11) a fuga do metrô aberta lá embaixo (o trem do salão): as trincheiras pausam
  const [metroTuneis, setMetroTuneis] = useState(false)
  // o Núcleo vindo atrás depois de uma cena que mexeu com ele
  const [perseguido, setPerseguido] = useState(false)
  // a ilha do topo virou bifurcação: a conversa do painel se recolhe
  const [bifurcando, setBifurcando] = useState(false)
  // vídeo do //LOOP que alguém mandou: o app abre direto nele
  const [rotaLoop, setRotaLoop] = useState<string | undefined>(undefined)
  // ligação de voz rolando por cima da estrada (ligacoes.ts)
  // missao/tarefa: é a conversa de uma missão virando ligação (ligacoes.ts)
  const [ligacao, setLigacao] = useState<{ lig: Ligacao; missao?: EstacaoId; tarefa?: number } | null>(null)
  useEffect(() => {
    if (tela.t !== "corrida") return
     
    setEstrada(true)
    setDestinoEstrada(tela.destino)
  }, [tela])

  useEffect(() => {
    // (notas 04/11) qual save vale nesta aba: o de verdade, ou o de teste (?parte, ?teste=1)
    decidirModoSave()
    // ?parte=casa (fora da produção): o save pronto daquela parte da jornada (parteTeste.ts)
    aplicarParteDeTeste()
    const s = carregar()
    const h = hoje()
    // (dbee-sugere) a memória da D-Bee vem do save
    definirMemoriaDbee(s.dbee)
    // hidratação do localStorage: só existe no cliente, depois do mount
     
    setSave(s.dias.includes(h) ? s : { ...s, dias: [...s.dias, h].slice(-60) })
    setPronto(true)
    // voltando de um lugar que é página (paginas.ts): direto pra estrada, onde estava
    if (new URLSearchParams(location.search).get("volta") === "cidade" && (s.casa || s.estacao)) {
      audioCtx()
      limparDaCidade()
      setVoltaDaSala(true)
      setTela({ t: "corrida", destino: null })
    }
    // atalho de teste (/teste): fora da produção, a Kombi aparece num ponto
    if (atalhosLiberados()) setAtalhoTeste(atalhoPorId(new URLSearchParams(location.search).get("atalho"))?.ir ?? null)
    // (T03) ?parte=loja: o jogo abre com a loja no celular (só fora da produção)
    if (atalhosLiberados() && new URLSearchParams(location.search).get("app") === "loja") setTela({ t: "app", id: "loja" })
    // (T20) ?parte=palcos: o menu dos palcos abre assim que ele entra no jogo
    if (atalhosLiberados() && new URLSearchParams(location.search).get("app") === "palcos") palcosAoEntrar.current = true
    // (T07) ?parte=casa.holo: a cena da casa começa na entrega do holo
    if (atalhosLiberados() && new URLSearchParams(location.search).get("cena") === "holo") setCenaHolo(true)
    // (T06) ?parte=casa.tambor: a cena da casa começa no tambor
    if (atalhosLiberados() && new URLSearchParams(location.search).get("cena") === "tambor") setCenaTambor(true)
    // (T63) ?parte=missao.tuneis.trincheiras: ele já começa lá embaixo, nas trincheiras
    if (atalhosLiberados() && new URLSearchParams(location.search).get("descer") === "tuneis") descerAoEntrar.current = true
    // (lote D) ?parte=elevador / casa.instrumentos / recompensa.instrumento…: o que abre ao entrar no jogo
    if (atalhosLiberados()) abrirAoEntrar.current = new URLSearchParams(location.search).get("abrir")
    if (process.env.NODE_ENV !== "production") {
      const q = new URLSearchParams(location.search)
      setProvaDev(q.get("prova") as ProvaId | null)
      setCorridaDev(q.has("corrida"))
    }
    track("place_entered", { place_id: "linha-222", place_type: "linha" })
  }, [])

  // (leveza B) o save vai pro localStorage com folga: a primeira mudança marca e,
  // até ESPERA_GRAVAR depois, grava uma vez só (o JSON inteiro). Ao sair da
  // página, esconder a aba, abrir um app ou o caderno: grava na hora
  const gravarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gravarSujo = useRef(false)
  // (leveza B) a hora (a cada 10 s) e o tanque (a cada 3 s) que a estrada manda
  // moram aqui; o save só recebe nos marcos (troca de turno, virada do dia,
  // tanque na reserva/cheio/seco). O localStorage grava sempre com eles
  const vivo = useRef<{ hora?: number; tanque?: number }>({})
  // (leveza B) o sinal de cada orb junta aqui e sobe junto, no máximo 1 vez por
  // segundo (ou na hora: trocou de bairro/rádio, ou chegou água)
  const sinalPend = useRef<{ total: number; freq?: string } | null>(null)
  const sinalTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // o save com o que ainda mora nas refs (vale pras contas que leem a hora ou o tanque)
  const comVivo = useCallback((s: Save): Save => {
    const v = vivo.current
    const hora = v.hora ?? s.hora, tanque = v.tanque ?? s.tanque
    return hora === s.hora && tanque === s.tanque ? s : { ...s, hora, tanque }
  }, [])
  // o que vai pro disco: o save com o que ainda mora nas refs (o sinal juntando também)
  const gravarComo = useRef((s: Save) => s)
  gravarComo.current = (s: Save) => {
    const p = sinalPend.current
    const v = comVivo(s)
    return p ? { ...v, sinal: p.total, freq: p.freq ?? v.freq } : v
  }
  const gravarJa = useCallback(() => {
    if (gravarTimer.current) { clearTimeout(gravarTimer.current); gravarTimer.current = null }
    if (!gravarSujo.current) return
    gravarSujo.current = false
    gravar(gravarComo.current(saveRef.current))
  }, [])
  const agendarGravar = useCallback(() => {
    gravarSujo.current = true
    if (!gravarTimer.current) gravarTimer.current = setTimeout(gravarJa, ESPERA_GRAVAR)
  }, [gravarJa])
  useEffect(() => {
    if (pronto) agendarGravar()
  }, [save, pronto, agendarGravar])
  useEffect(() => {
    const sair = () => gravarJa()
    const escondeu = () => { if (document.visibilityState === "hidden") gravarJa() }
    window.addEventListener("pagehide", sair)
    document.addEventListener("visibilitychange", escondeu)
    return () => {
      window.removeEventListener("pagehide", sair)
      document.removeEventListener("visibilitychange", escondeu)
      gravarJa()
    }
  }, [gravarJa])
  // o caderno e os apps do celular (janelas) leem o save do localStorage: abriu, grava antes
  useEffect(() => { if (caderno) gravarJa() }, [caderno, gravarJa])
  useEffect(() => { if (tela.t === "app") gravarJa() }, [tela.t, gravarJa])
  // o sinal juntado sobe pro save (antes de qualquer conta que some no sinal)
  const assentarSinal = useCallback(() => {
    if (sinalTimer.current) { clearTimeout(sinalTimer.current); sinalTimer.current = null }
    const p = sinalPend.current
    if (!p) return
    sinalPend.current = null
    setSave((s) => ({ ...s, sinal: p.total, freq: p.freq ?? s.freq }))
  }, [])
  useEffect(() => () => { if (sinalTimer.current) clearTimeout(sinalTimer.current) }, [])
  const onSinal = useCallback((total: number, freq?: FreqId) => {
    sinalPend.current = { total, freq: freq ?? sinalPend.current?.freq }
    if (freq) assentarSinal()
    else if (!sinalTimer.current) { sinalTimer.current = setTimeout(assentarSinal, 1000); agendarGravar() }
  }, [assentarSinal, agendarGravar])
  // a água já chega juntada da estrada (1 vez por segundo): sobe na hora, e leva o sinal junto
  const onAgua = useCallback((d: number) => {
    assentarSinal()
    setSave((s) => ({ ...s, agua: Math.max(0, (s.agua ?? 0) + d) }))
  }, [assentarSinal])
  // mudou no save por outro caminho (a chegada, o posto, o galão): a ref segue o save
  useEffect(() => { vivo.current.hora = save.hora }, [save.hora])
  useEffect(() => { vivo.current.tanque = save.tanque }, [save.tanque])
  const horaViva = useCallback(() => vivo.current.hora ?? saveRef.current.hora ?? 18, [])
  // o relógio da estrada na tela (o letreiro do holo) segue a cada 10 s sem redesenhar a página
  const ouvinteHora = useRef<((h: number) => void) | null>(null)
  const onHora = useCallback((h: number) => {
    const antes = vivo.current.hora ?? saveRef.current.hora ?? 18
    vivo.current.hora = h
    ouvinteHora.current?.(h)
    const virou = virouODia(antes, h)
    if (virou || turnoDe(antes) !== turnoDe(h)) setSave((s) => ({ ...s, hora: h, dia: virou ? (s.dia ?? 1) + 1 : s.dia ?? 1 }))
    else agendarGravar()
  }, [agendarGravar])
  // (o zero sempre sobe: antes o último pouquinho nunca virava 0 e a Kombi ficava na reserva pra sempre)
  const onTanque = useCallback((n: number) => {
    const salvo = saveRef.current.tanque ?? 1
    const antes = vivo.current.tanque ?? salvo
    vivo.current.tanque = n
    const marco = (n <= 0 && salvo > 0) || Math.abs(salvo - n) >= 0.05 || (n < 0.1) !== (salvo < 0.1) || (n > 0.97) !== (salvo > 0.97)
    if (marco) setSave((s) => ({ ...s, tanque: n }))
    else if (Math.abs(antes - n) >= 0.005) agendarGravar()
  }, [agendarGravar])

  const atualizar = useCallback((f: (s: Save) => Save) => setSave(f), [])
  // (dbee-sugere) a D-Bee lembrou de algo (sugeriu, ele fez, ouviu uma rua inteira): vai pro save
  useEffect(() => ouvirMemoriaDbee((m) => setSave((s) => ({ ...s, dbee: m }))), [])

  // os avisos entram em FILA (um não apaga o outro: o LU2CA no posto e o
  // +10 NEON chegando juntos)
  const filaAvisos = useRef<{ titulo: string; texto: string; cor: string }[]>([])
  const avisando = useRef(false)
  const proximoAviso = useCallback(function proximo() {
    const a = filaAvisos.current.shift()
    if (!a) { avisando.current = false; return }
    avisando.current = true
    const id = Date.now() + Math.random()
    setAviso({ id, ...a })
    setTimeout(() => { setAviso((x) => (x?.id === id ? null : x)); setTimeout(proximo, 250) }, 4200)
  }, [])
  const palcosAoEntrar = useRef(false)
  const descerAoEntrar = useRef(false)
  const abrirAoEntrar = useRef<string | null>(null)
  const avisar = useCallback((titulo: string, texto: string, cor = "#2fe8ff") => {
    // (LU2CA 22/10) no disco, fora os avisos de texto do sistema ("missão aceita", "+neon",
    // "regado"...): só passa quem fala (um personagem). O resto o "?" explica
    if (D && !VOZES[titulo]) return
    // o mesmo aviso de novo, enquanto ainda tá na fila: não repete
    if (filaAvisos.current.some((a) => a.titulo === titulo && a.texto === texto)) return
    filaAvisos.current.push({ titulo, texto, cor })
    if (!avisando.current) proximoAviso()
  }, [proximoAviso, D])

  const ganharXp = useCallback((n: number) => {
    setSave((s) => ganhar(s, n))
    setXpFlutua({ id: Date.now(), n })
  }, [])

  // app com som próprio aberto (//LOOP, clipes, B4TIDA…): o vinil/rádio
  // pausa e volta de onde parou quando ele fecha
  const appComSom = tela.t === "app" && !!APPS.find((a) => a.id === tela.id)?.rota
  const retomar = useRef(false)
  useEffect(() => {
    if (appComSom) {
      if (player.tocando) { retomar.current = true; player.pausar() }
    } else if (retomar.current) {
      retomar.current = false
      player.retomar()
    }
  }, [appComSom])

  // dinheiro caiu na conta: o som da moedinha
  const neonAntes = useRef<number | null>(null)
  useEffect(() => {
    const n = save.neon ?? 0
    if (pronto && neonAntes.current !== null && n > neonAntes.current) moeda()
    if (pronto) neonAntes.current = n
  }, [save.neon, pronto])

  // a música abafada (LU2CA): dentro de um lugar (a missão) e com o telefone
  // tocando, o rádio e o disco seguem mais baixos e sem agudo
  // (música contínua, 03/11) com a faixa da pista tocando, a cena não abafa: a
  // faixa vira o instrumental dela, limpo (ver pistaSom.missao lá embaixo)
  // (trilha sonora, 05/11; bíblia 9) a trilha não para e faz parte do cenário: numa
  // cena (sala, casa, missão) a música segue no lugar, só um pouco mais baixa (sem abafar)
  const emCena = !!cena
  useEffect(() => {
    if (!emCena) return
    abaixarUmPouco(true)
    return () => abaixarUmPouco(false)
  }, [emCena])
  // (trilha sonora, 05/11) a exceção: tocar os instrumentos na casa da D-Bee é FAZER
  // música. A do jogo para (fade) e volta de onde estava quando ele sai
  const tocandoInstrumentos = cena?.especial === "dbee-instrumentos"
  useEffect(() => {
    if (!tocandoInstrumentos) return
    fazerMusica(true)
    return () => fazerMusica(false)
  }, [tocandoInstrumentos])
  const telefone = !!ligacao
  useEffect(() => {
    if (!telefone) return
    abafar(true)
    return () => abafar(false)
  }, [telefone])

  // o que a rádio tá tocando, pro widget da home
  useEffect(() => player.ouvir((s) => {
    if (!s.src) return setRadio(null)
    const todas = [...TODAS_FAIXAS, ...ARQUIVO]
    setRadio({ titulo: todas.find((x) => x.src === s.src)?.titulo ?? "…", tocando: s.tocando })
  }), [])

  // o widget da home toca a mesma programação da estrada (programa.ts)
  const proxRadio = useRef<(id: FreqId, entrada?: boolean) => void>(() => {})
  // (rádios, 05/11) entrada = a troca de estação pela zona: a música entra em fade
  const tocarRadio = useCallback((id: FreqId, entrada = false) => {
    if (ehDoLugar(id, player.src, save.objetos)) return player.tocar(player.src!, () => proxRadio.current(id))
    const p = proxima(id, save.objetos, { nome: save.nome, objetos: save.objetos, carregando: null })
    if (!p) return
    // o locutor (as vinhetas da Xenom, a Cidade Neon): legenda curta no display da rádio e no notch
    if (D && p.vinheta) {
      avisarRadio(p.vinheta.de, p.vinheta.texto, 5000)
      notch(p.vinheta.texto, p.vinheta.cor)
      if (p.vinheta.audio) voz.tocar("vinheta-radio", p.vinheta.audio)
    }
    player.tocar(p.faixa.src, () => proxRadio.current(D ? radioFreq.get() : id), 1, entrada ? 1.2 : 0)
  }, [save.objetos, save.nome, D])
  useEffect(() => { proxRadio.current = tocarRadio }, [tocarRadio])
  // (rádios, 05/11) as duas rádios: a estação muda com a zona (disco/radios.ts). A
  // página toca quando a estrada não está montada (túneis, salas); montada, a estrada
  // registra o tocador dela por cima
  useEffect(() => {
    if (!D) return
    const sair = ligarRadiosPorZona()
    const solta = registrarTocador((f, entrada) => proxRadio.current(f, entrada), true)
    return () => { solta(); sair() }
  }, [D])
  useEffect(() => { if (D) definirContextoRadio({ h: hist, objetos: save.objetos }) }, [D, hist, save.objetos])

  // O Núcleo invade: 1ª vez depois da 2ª missão (dá pra repelir), 2ª depois
  // da 3ª (derruba a 222 — o primeiro apagão). E só: é um easter egg, duas
  // vezes no percurso inteiro (LU2CA 16/10: "está exagerado"; a 222 é uma
  // máquina de desenvolvimento humano, não o Núcleo invadindo toda hora).
  // Nunca no meio de uma conversa.
  const podeInvadir = !HIST && (tela.t === "corrida" || tela.t === "home") && !invasao && !ligacao && !aoVivo && !cinema && !save.nucleo.caido
  useEffect(() => {
    if (!pronto || !podeInvadir) return
    const n = save.nucleo.invasoes
    const obj = save.objetos.length
    if ((n === 0 && obj >= 2) || (n === 1 && obj >= 3)) {
      const t = setTimeout(() => setInvasao({ id: Date.now(), forte: n === 1 }), 5000)
      return () => clearTimeout(t)
    }
  }, [pronto, podeInvadir, save.nucleo.invasoes, save.objetos.length, tela.t])


  // O RELÓGIO DA CIDADE (relogio.ts, 13/10): dormir na Kombi pula pras 8h do
  // dia seguinte; cochilar (de dia) pula pras 19h. A tela escurece e mostra
  // o dia novo.
  const [saltoHora, setSaltoHora] = useState<{ h: number; id: number } | null>(null)
  // dormir e cochilar: o relógio só pula, sem animação (LU2CA, 14/10); quem
  // conta o dia novo é a virada das 8h (onHora)
  const pularPara = useCallback((h: number) => setSaltoHora({ h, id: Date.now() }), [])

  // os apps de dentro do celular (GUITAR DRIVER…) pagam e cobram em NEON: o
  // celular é o banco. O app pede (delta), o jogo confere o saldo e responde.
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      // a popularidade (o Guitar Driver: cada show bom, a cidade te conhece mais)
      if (e.data?.tipo === "cn-pop") {
        const delta = Math.round(Number(e.data.delta) || 0)
        const nova = Math.max(0, Math.min(100, (saveRef.current.popularidade ?? 0) + delta))
        if (delta) setSave((s) => ({ ...s, popularidade: nova }))
        ;(e.source as Window | null)?.postMessage({ tipo: "cn-pop-ok", popularidade: nova, id: e.data.id }, window.location.origin)
        return
      }
      if (e.data?.tipo !== "cn-neon") return
      const delta = Math.round(Number(e.data.delta) || 0)
      const atual = saveRef.current.neon ?? 0
      const ok = delta >= 0 || atual + delta >= 0
      if (ok && delta) setSave((s) => (delta > 0 ? ganhar(s, delta) : gastar(s, -delta) ?? s))
      ;(e.source as Window | null)?.postMessage({ tipo: "cn-neon-saldo", neon: ok ? atual + delta : atual, ok, id: e.data.id }, window.location.origin)
    }
    window.addEventListener("message", h)
    return () => window.removeEventListener("message", h)
  }, [])
  // dirigindo: quem chama a próxima missão manda mensagem na tela da Kombi
  // (não precisa pegar o celular pra começar a conversa)
  const quemChama = !save.nucleo.caido ? ativa(save, nivelDe(save)) : null
  // o tutorial (tutorial.ts): ninguém chama antes da D-Bee apresentar o
  // Mubarak (bloco 2)
  const tut = emTutorial(save)
  const blocoTut = tut ? blocoAtual(save) : BLOCOS.length
  // e até o fim do tutorial, só a primeira pessoa chama
  const tutLibera = !tut || (quemChama === PRIMEIRA && blocoTut >= 1 && feito(save, "posto"))
  // a história só chama do entardecer até as 4h (relogio.ts)
  const chamaNaEstrada = !HIST && horaDaHistoria(save.hora ?? 18) && tutLibera && !!quemChama && !adiadas.includes(quemChama) && etapaDe(save, quemChama) === "chamado" && !save.completos.includes(quemChama) && save.pausas[quemChama] === undefined
  // A CHEGADA: o grupo 222 rola na ilha, uma mensagem a cada ~3,4 s, sem
  // travar nada. Acabou (ou a pessoa abriu e leu): o grupo fica feito, com
  // tudo no histórico, e a D-Bee LIGA. Desligou: ela escreve (a abertura)
  useEffect(() => {
    if (introGrupo === null || tela.t !== "corrida" || ligacao) return
    const falas = ROTEIROS.grupo.passos.flatMap((p) => (p.t === "msg" && p.de ? [{ de: p.de, texto: typeof p.texto === "string" ? p.texto : "" }] : p.t === "nucleo" ? [{ de: "NÚCLEO", texto: p.texto }] : []))
    const t = setTimeout(() => {
      if (introGrupo >= falas.length) {
        setIntroGrupo(null)
        setSave((s) => {
          if (s.completos.includes("grupo")) return s
          const log: Item[] = ROTEIROS.grupo.passos.flatMap((p): Item[] => (p.t === "msg" ? [{ k: "msg", texto: typeof p.texto === "string" ? p.texto : "", de: p.de }] : p.t === "nucleo" ? [{ k: "nucleo", texto: p.texto }] : p.t === "sistema" ? [{ k: "sistema", texto: p.texto }] : []))
          return { ...s, completos: [...s.completos, "grupo"], logs: { ...s.logs, grupo: log } }
        })
        return
      }
      setFalaIntro({ id: Date.now(), ...falas[introGrupo] })
      setIntroGrupo(introGrupo + 1)
    }, introGrupo === 0 ? 1200 : 3600)
    return () => clearTimeout(t)
  }, [introGrupo, tela.t, ligacao])
  const ligaPrimeira = !HIST && save.completos.includes("grupo") && !save.completos.includes("abertura") && save.pausas.abertura === undefined && !save.ligacoes.includes("dbee-0")
  useEffect(() => {
    if (!pronto || tela.t !== "corrida" || introGrupo !== null || invasao || aoVivo || ligacao || !ligaPrimeira) return
    const t = setTimeout(() => setLigacao({ lig: LIGACOES["dbee-0"] }), 4000)
    return () => clearTimeout(t)
  }, [pronto, tela.t, introGrupo, invasao, aoVivo, ligacao, ligaPrimeira])

  // a primeira vez na Kombi depois da abertura, a D-Bee LIGA (antes de
  // qualquer um mandar mensagem)
  const ligaDbee = !HIST && save.completos.includes("abertura") && !save.ligacoes.includes("dbee-1")
  useEffect(() => {
    if (!pronto || tela.t !== "corrida" || cinema || invasao || aoVivo || ligacao || !ligaDbee) return
    const t = setTimeout(() => setLigacao({ lig: LIGACOES["dbee-1"] }), 2500)
    return () => clearTimeout(t)
  }, [pronto, tela.t, cinema, invasao, aoVivo, ligacao, ligaDbee])
  const fimLigacao = useCallback((atendeu: boolean, dito: Transcricao) => {
    setLigacao((l) => {
      if (!l) return null
      const { lig, missao: m, tarefa } = l
      if (m && atendeu && tarefa !== undefined) {
        // a ligação foi o começo da conversa: o pedido tá aceito, a conversa
        // fica parada no pedido (como se tivesse sido por texto) e o que foi
        // dito vira histórico no N3XO
        const log: Item[] = [{ k: "sistema", texto: `ligação de voz · ${lig.quem}` }, ...dito.map((d) => ({ k: "msg" as const, texto: d.texto, eu: d.eu }))]
        setSave((s) => ({ ...s, ligacoes: [...new Set([...s.ligacoes, lig.id])], pausas: { ...s.pausas, [m]: tarefa }, logs: { ...s.logs, [m]: log } }))
        track("mission_step", { mission_id: `linha-${m}`, step: "ligacao:pedido", perfil: save.perfil ?? "?", fio_pos: save.fio.indexOf(m) })
      } else if (m) {
        // não atendeu: a pessoa escreve (o painel pega)
        setSave((s) => ({ ...s, modos: { ...s.modos, [m]: "texto" } }))
        setTimeout(() => avisar(lig.quem, lig.recado, getEstacao(m).cor), 300)
      } else {
        const extra = lig.id === "dbee-0" ? ["dbee-1"] : []
        setSave((s) => ({ ...s, ligacoes: [...new Set([...s.ligacoes, lig.id, ...extra])] }))
        if (!atendeu) setTimeout(() => avisar(lig.quem, lig.recado, "#3d7bff"), 300)
        // a primeira ligação: em seguida ela escreve
        if (lig.id === "dbee-0") setTimeout(() => setTela({ t: "chat", id: "abertura", volta: { t: "corrida", destino: null } }), atendeu ? 600 : 2400)
      }
      return null
    })
  }, [avisar, save.perfil, save.fio])
  useEffect(() => {
    if (!pronto || tela.t !== "corrida" || cinema || invasao || aoVivo || ligacao || ligaDbee || !chamaNaEstrada || !quemChama) return
    const t = setTimeout(() => {
      // lido na hora (o save muda a cada orb; não pode reiniciar o timer)
      const save = saveRef.current
      // todo mundo escreve (06/10, LU2CA: ninguém é obrigado a responder — as
      // mensagens chegam no painel; responde se quiser, ali ou no N3XO).
      // Ligação de voz fica só pra história da D-Bee
      if (!save.modos[quemChama]) setSave((s) => ({ ...s, modos: { ...s.modos, [quemChama]: "texto" }, ultimoModo: "texto" }))
      track("mission_started", { mission_id: `linha-${quemChama}`, place_id: "linha-kombi-texto" })
      setAoVivo(quemChama as ChatRoteiro)
    }, 3500)
    return () => clearTimeout(t)
  }, [pronto, tela.t, cinema, invasao, aoVivo, ligacao, ligaDbee, chamaNaEstrada, quemChama])

  // ATO 2 (a crise): pegou a coisa no mapa → a pessoa escreve no painel,
  // dirigindo (a conversa anda do "tarefa" até o "chegar")
  const etapaChama = quemChama ? etapaDe(save, quemChama) : null
  const criseDe = !save.nucleo.caido && quemChama && (etapaChama === "entrega" || etapaChama === "lugar") && save.pausas[quemChama] !== undefined
    && ROTEIROS[quemChama as keyof typeof ROTEIROS]?.passos[save.pausas[quemChama]!]?.t === "tarefa" ? quemChama : null
  // na carona: a pessoa já entrou na Kombi e a conversa ainda tá na 1ª parada
  // → a crise chega no caminho (uns 25 s depois, dirigindo)
  const passosChama = quemChama ? ROTEIROS[quemChama as keyof typeof ROTEIROS]?.passos : undefined
  const criseCarona = !save.nucleo.caido && quemChama && MISSOES[quemChama]?.carona && save.itens.includes(`carona:${quemChama}`)
    && save.pausas[quemChama] !== undefined && passosChama && save.pausas[quemChama] === passosChama.findIndex((x) => x.t === "lugar") ? quemChama : null
  const crise = HIST ? null : criseDe ?? criseCarona
  useEffect(() => {
    if (!pronto || tela.t !== "corrida" || cinema || invasao || aoVivo || ligacao || !crise) return
    const t = setTimeout(() => setAoVivo(crise as ChatRoteiro), criseCarona ? 25000 : 2500)
    return () => clearTimeout(t)
  }, [pronto, tela.t, cinema, invasao, aoVivo, ligacao, crise, criseCarona])

  const fimInvasao = useCallback((venceu: boolean) => {
    setInvasao(null)
    assentarSinal()
    setSave((s) => ({ ...s, sinal: s.sinal + (venceu ? 8 : 0), nucleo: { invasoes: s.nucleo.invasoes + 1, caido: !venceu } }))
    track("mission_step", { mission_id: "linha-nucleo", step: venceu ? "invasao:repelida" : "invasao:caiu", perfil: save.perfil ?? "?", fio_pos: -1 })
    if (venceu) avisar("D-Bee", "vc segurou eles. +8 de sinal", "#3d7bff")
    else setTimeout(() => avisar("D-Bee", "derrubaram a 222. religa a antena no centro, de kombi", "#3d7bff"), 400)
  }, [avisar, save.perfil, assentarSinal])

  // a caça: a partir da 3ª missão, carregar o contrabando (o que foi buscado,
  // ou alguém de carona) até a estação atrai os carros brancos do Núcleo.
  // Pego = a coisa volta pro lugar de origem (busca de novo; sem game over)
  const alvoAgora = save.nucleo.caido ? null : alvoDe(save, nivelDe(save))
  const cacado = alvoAgora?.t === "entrega" && save.objetos.length >= 2
  // (T63) nas trincheiras a estrada sai da cena (a memória e a GPU ficam pra elas); na volta, retoma
  // (T64, lote D) a fuga do metrô tem o 3D dela: o mundo sai de cena (nada de dois canvas juntos)
  // (05/11) a fuga só aparece com ele dentro do jogo (depois do "continuar"); na tela
  // de entrada fica esperando. Só o atalho de teste ?parte=metro abre direto nela
  const noMetro = HIST && emMetro(hist) && (tela.t !== "entrada" || parteAberta === "metro")
  const emSala = (!!cena && temSala(cena.lugar)) || !!viagem || !!noPosto || noElevador || noMetro || (!!trincheiras && !trincheiras.descendo)
  // entrou numa sala: a próxima estrada que montar retoma de onde parou;
  // foi pra outra tela (celular, início): a estrada começa do jeito normal
  const [emSalaAnt, setEmSalaAnt] = useState(emSala)
  if (emSala !== emSalaAnt) { setEmSalaAnt(emSala); if (emSala) setVoltaDaSala(true) }
  if (voltaDaSala && !emSala && tela.t !== "corrida" && tela.t !== "chegada") setVoltaDaSala(false)

  // a sala do lugar da missão começa a baixar enquanto a Kombi ainda está
  // longe (o beco também, quando ele fica liberado)
  const lugarDoAlvo = alvoAgora?.t === "lugar" ? alvoAgora.lugar : null
  useEffect(() => { if (lugarDoAlvo) precarregarSala(lugarDoAlvo) }, [lugarDoAlvo])
  // a estrada baixa em segundo plano assim que a tela inicial abriu
  useEffect(() => {
    const ir = () => { void import("./estrada/Corrida") }
    const w = window as Window & { requestIdleCallback?: (f: () => void) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(ir)
    else setTimeout(ir, 1500)
  }, [])

  const apreender = useCallback(() => {
    setSave((s) => {
      const a = alvoDe(s, nivelDe(s))
      if (!a || a.t !== "entrega") return s
      const item = MISSOES[a.missao]?.busca?.item
      return item ? { ...s, itens: s.itens.filter((k) => !k.startsWith(`${item}:`)) } : s
    })
    track("mission_step", { mission_id: "linha-nucleo", step: "caca:pego", perfil: save.perfil ?? "?", fio_pos: -1 })
  }, [save.perfil])

  // o beco (lugar secreto): libera depois do terraço da Notti, até achar o
  // relicário. Quantas voltas no mirante até ele aparecer depende do tom:
  // quem tá acordado vê de primeira; quem dorme dá três voltas
  const tomMaior = (["acordado", "acordando", "dormindo"] as const).reduce((a, b) => ((save.tons?.[b] ?? 0) > (save.tons?.[a] ?? 0) ? b : a), "dormindo" as "acordado" | "acordando" | "dormindo")
  // ep. 3: a delação derrubou a 222. Do chamado da D-Bee até a casa dela,
  // sem rádio e a cidade cinza (a provação: o silêncio mais longo do jogo)
  const apagao = save.pausas.ojala !== undefined && !save.objetos.includes("ojala")
  const becoLivre = save.objetos.includes("dopamina") && !(save.reliquias ?? []).includes("relicario")
  useEffect(() => { if (becoLivre) precarregarSala("beco") }, [becoLivre])
  const segredo = useMemo(() => (becoLivre ? { id: "beco" as LugarId, voltas: tomMaior === "acordado" ? 1 : tomMaior === "acordando" ? 2 : 3 } : null), [becoLivre, tomMaior])

  // encostou devagar na vaga do lugar da missão: a cena começa
  const barFechou = useRef(0)
  // (T02) chegou no lugar da missão pegada (a função mora mais embaixo: chegouNaMissao)
  const chegouRef = useRef<(m: MissaoId) => void>(() => {})
  // (missões claras, 02/11) nesta visita ao lugar já abriu uma peça (ou a porta):
  // a tentativa repetida (parado no lugar) não reabre o que ele fechou de
  // propósito. Zera a cada chegada nova (saiu do raio e voltou)
  const visitaAbriu = useRef<MissaoId | null>(null)
  const abrirPortaRef = useRef<(m: MissaoId) => void>(() => {})
  const abrirCena = useCallback((id: LugarId, repete = false) => {
    // (disco) a história manda: cada fase abre só o lugar dela
    if (D && historiaAtiva(historiaDe(saveRef.current))) {
      const h = historiaDe(saveRef.current)
      if (cinema) return
      // (saiu do bar agora: não reabre parado na porta; tem que dar uma volta)
      // (T04) a oficina não está mais nas pistas: o passo dela é no chão (chao:oficina)
      // (T02) a carreira: chegou no lugar da missão pegada: a peça de agora (ou a porta)
      if (h.fase === "carreira" && Date.now() - barFechou.current > 8000) {
        const m = missaoDoSave(saveRef.current)
        if (m && alvo13(hist13(saveRef.current), m)?.lugar === id) {
          if (repete && visitaAbriu.current === m) return
          if (!repete) visitaAbriu.current = null
          chegouRef.current(m)
        }
        // (notas 04/11) a casa da D-Bee não abre mais por aqui (a vaga numa pista da
        // cidade): ela é só no deserto, pelo chão ("chao:casa", no onHistoria)
        return
      }
      if (id === "bar" && h.fase === "bar" && Date.now() - barFechou.current > 8000) {
        setAoVivo(null)
        setCinema("lugar")
        setCena({ lugar: "bar", missao: "copo", pegar: false, especial: "disco-bar" })
      }
      return
    }
    // cada lugar tem a sua hora (relogio.ts): fora dela, fechado
    const hr = LUGARES[id]?.horario ?? "noite"
    const h = horaViva()
    if (!abertoAgora(hr, h)) {
      avisar(LUGARES[id].nome, turnoDe(h) === "ocio" ? "a cidade dorme. só música até as 8h" : `fechado agora. abre às ${abreAs(hr)}`, "#8a93b8")
      return
    }
    // o tutorial: o pin do posto abre a bomba
    if (id === "posto" && irAoPosto(saveRef.current)) { abrirPostoRef.current(); return }
    // o tutorial: chegou na casa do Drewboy com o Mubarak de carona — a cena
    // dele agradecendo (CENA_MUBARAK_DREW)
    if (id === "casa-drewboy" && levarDrewboy(saveRef.current)) {
      if (cinema) return
      setAoVivo(null)
      setCinema("lugar")
      setCena({ lugar: "casa-drewboy", missao: "copo", pegar: false, especial: "mubarak-drew" })
      return
    }
    if (id === "beco") {
      const s = saveRef.current
      if (cinema || !s.objetos.includes("dopamina") || (s.reliquias ?? []).includes("relicario")) return
      setAoVivo(null)
      setCinema("lugar")
      setCena({ lugar: id, missao: "dopamina", pegar: false })
      track("mission_step", { mission_id: "linha-beco", step: "cena:beco", perfil: s.perfil ?? "?", fio_pos: -1 })
      return
    }
    const a = alvoDe(saveRef.current, nivelDe(saveRef.current))
    if (!a || a.t !== "lugar" || a.lugar !== id || cinema) return
    if (!cenaDe(id)) return
    setAoVivo(null)
    setCinema("lugar")
    // fora da cidade: primeiro a estrada (viagem.tsx), a cena é na chegada
    if (LUGARES[id].fora) setViagem({ lugar: id, missao: a.missao, pegar: a.pegar })
    else setCena({ lugar: id, missao: a.missao, pegar: a.pegar })
    track("mission_step", { mission_id: `linha-${a.missao}`, step: `cena:${id}`, perfil: saveRef.current.perfil ?? "?", fio_pos: saveRef.current.fio.indexOf(a.missao) })
  }, [cinema, avisar, D, horaViva])
  // (disco) o fim do prólogo: bebeu = a noite volta (o loop); recusou = a oficina
  // (T02) saiu da oficina: a Kombi solar + turbo, a água foi toda. É a porta da
  // missão da oficina (as melhorias da Kombi): a recompensa e, sem show, o jogo segue
  // (T09) a missão da oficina: a cena (ele chega só com o plano) abre a bancada (a
  // arte); depois o painel no lixão e a goteira (o jogo); de volta, o pagamento em
  // água e a porta (as melhorias da Kombi). Na Nectar antiga (o mapa de antes), a
  // cena segue fechando o passo dela como sempre
  const [oficinaTela, setOficinaTela] = useState<"bancada" | "goteira" | "pagar" | "conserto" | null>(null)
  const fimOficina = useCallback((r: ResultadoCena) => {
    setCena(null)
    setCinema(null)
    if (!r.completa) return
    const h0 = historiaDe(saveRef.current)
    if (h0.fase === "oficina") {
      setSave((s) => comHistoria(s, (h) => ({ ...h, oficina: { ...(h.oficina ?? {}), cena: true } })))
      // (T57) a reciclagem é no mundo: o lixo bom está espalhado no lixão (a luz mostra onde)
      setTimeout(() => setFalaIntro({ id: Date.now(), de: MECANICO.nome, texto: FALAS_OFICINA.catar, ensina: true }), 900)
      return
    }
    setSave((s) => comHistoria({ ...s, agua: 0 }, (h) => ({ ...h, ...(h.fase === "nectar" ? { nectar: "flores" as const, floresIni: h.flores ?? 0 } : {}), mods: [...new Set([...(h.mods ?? []), "solar", "turbo", "propulsao"])] })))
    setTimeout(() => setFalaIntro({ id: Date.now(), de: MECANICO.nome, texto: "volta sempre. e rega as flores no caminho: a água volta" }), 2500)
  }, [])
  // a porta da oficina: pago o mecânico, o motor sai montado (solar + turbo + propulsão),
  // a porta abre (a recompensa) e a Kombi já pode subir
  const montarMotor = () => {
    setOficinaTela(null)
    setSave((s) => comHistoria(s, (h) => ({ ...h, mods: [...new Set([...(h.mods ?? []), "solar", "turbo", "propulsao"])] })))
    abrirPortaRef.current("oficina")
    setSave((s) => comHistoria(s, (h) => ({ ...h, fase: "subir" })))
    // (T07, T41: D13) com o Nexo ensinando, o "segura o espaço" é um passo do tutorial
    if (!(CONFIG_TUTORIAL.quem === "nexo" && trilhaEnsina({ ...historiaDe(saveRef.current), fase: "subir" }))) setTimeout(() => setFalaIntro({ id: Date.now(), de: MECANICO.nome, texto: FALAS_OFICINA.voa, ensina: true }), 2500)
  }
  const fimBarFeito = useRef(false)
  const fimBarDisco = useCallback((r: ResultadoCena) => {
    // (a cena pode avisar o fim duas vezes: beber e sair) conta uma vez só
    if (fimBarFeito.current) return
    fimBarFeito.current = true
    barFechou.current = Date.now()
    setTimeout(() => { fimBarFeito.current = false }, 1500)
    setCena(null)
    setCinema(null)
    if (r.loop) {
      setSave((s) => ({ ...s, loops: { ...(s.loops ?? {}), bar: (s.loops?.bar ?? 0) + 1 }, copos: r.copo === undefined ? s.copos : [...new Set([...(s.copos ?? []), r.copo])] }))
      // (começo novo, 05/11) a noite volta pro começo: o bar abre de novo (as falas
      // de "volta"). Antes ele ficava parado na porta, com o "Agora: aqui", e o bar só
      // reabria saindo uns 80 m e voltando, sem nada dizer isso
      setTimeout(() => {
        if (historiaDe(saveRef.current).fase !== "bar") return
        setCena((c) => c ?? { lugar: "bar", missao: "copo", pegar: false, especial: "disco-bar" })
        setCinema((x) => x ?? "lugar")
      }, 2200)
      return
    }
    // saiu no meio, sem escolher: nada muda (o bar continua esperando)
    if (!r.completa) return
    // (T02) negou os copos: sai do bar direto pro jogo (sem show); a próxima é a oficina
    setSave((s) => comHistoria({ ...s, loops: { ...(s.loops ?? {}), bar: 0 } }, (h) => ({ ...h, fase: "oficina", show: undefined })))
    setTimeout(() => setFalaIntro({ id: Date.now(), de: "D-Bee", texto: "a kombi não sobe assim. tem uma oficina aqui embaixo: a luz laranja" }), 1500)
  }, [])
  const fimCena = useCallback((r: ResultadoCena) => {
    const c = cena
    setCena(null)
    setViagem(null)
    setCinema(null)
    if (!c) return
    const est = c.missao
    // escolha errada (o bar: beber): a missão fica aberta, nada se ganha, e o
    // mundo estranha (loops → Corrida)
    if (r.loop) {
      setSave((s) => ({ ...s, loops: { ...(s.loops ?? {}), [c.lugar]: (s.loops?.[c.lugar] ?? 0) + 1 }, copos: r.copo === undefined ? s.copos : [...new Set([...(s.copos ?? []), r.copo])] }))
      avisar("a noite voltou pro começo", "a missão continua aberta", "#ffc857")
      track("mission_step", { mission_id: `linha-${est}`, step: `loop:${c.lugar}`, perfil: saveRef.current.perfil ?? "?", fio_pos: saveRef.current.fio.indexOf(est) })
      return
    }
    assentarSinal()
    setSave((s) => {
      let objetos = s.objetos
      let sinal = s.sinal
      if (r.objeto && !objetos.includes(r.objeto)) {
        objetos = [...objetos, r.objeto]
        // o mp3 do Mubarak pega frequência: enche o sinal da próxima rádio
        if (r.objeto === "copo") sinal = proximaFreq(s.sinal)?.custo ?? s.sinal
      }
      const pausas = { ...s.pausas }
      if (r.objeto) delete pausas[est]
      const itens = c.pegar && !s.itens.includes(`carona:${est}`) ? [...s.itens, `carona:${est}`] : s.itens
      const completos = r.objeto && !s.completos.includes(est) ? [...s.completos, est] : s.completos
      const reliquias = [...new Set([...(s.reliquias ?? []), ...r.reliquias])]
      const logs = r.objeto ? { ...s.logs, [est]: [...(s.logs[est] ?? []), { k: "sistema" as const, texto: `o resto aconteceu ${LUGARES[c.lugar].no}` }] } : s.logs
      // o violão ficou no trem (ep. 2): o app VIOLÃO tranca até o GUITAR DRIVER
      const violao = r.perdeViolao ? false : s.violao
      // acordar alguém rende NEON (a rede te devolve)
      const neon = (s.neon ?? 0) + (r.objeto ? NEON_POR_PESSOA : 0)
      // e a cidade te conhece mais (em silêncio)
      const novo = !!r.objeto && !s.objetos.includes(r.objeto)
      const popularidade = Math.min(100, (s.popularidade ?? 0) + (novo ? POPULARIDADE[r.objeto!] ?? 0 : 0))
      return { ...s, objetos, sinal, pausas, itens, completos, reliquias, logs, violao, neon, popularidade }
    })
    if (r.objeto) {
      track("mission_completed", { mission_id: `linha-${est}`, duration_ms: 0 })
      setTimeout(() => avisar(`+${NEON_POR_PESSOA} neon`, "a rede te devolve. gasta na loja de discos", "#ffc857"), 1200)
      // AS LIBERAÇÕES (13/10, LU2CA): cada pessoa acordada libera a faixa dela
      // na 222 e no Guitar Driver, e o lugar vira palco. Só a PRIMEIRA vez é
      // mostrada (o tutorial do ato 1); depois a pessoa descobre sozinha.
      const primeira = saveRef.current.objetos.length === 0
      if (primeira) {
        const e = getEstacao(r.objeto)
        setTimeout(() => avisar(`${e.faixa.toLowerCase()} entrou na 222`, `e ${LUGARES[c.lugar].nome} virou palco no guitar driver`, e.cor), 5800)
      }
    }
    if (r.caca) {
      setPerseguido(true)
      setTimeout(() => setPerseguido(false), 60000)
    }
  }, [cena, avisar, assentarSinal])

  // saiu da casa da D-Bee (a abertura): o tanque cheio, o tutorial começa.
  // O começo antigo (o grupo rolando, as ligações dbee-0/1, a abertura com o
  // quiz) não acontece: o grupo fica no histórico do N3XO, o violão (que tava
  // na casa) vem junto e a primeira pessoa é o Mubarak
  const fimInicio = useCallback(() => {
    setCena(null)
    setCinema(null)
    setSave((s) => {
      const grupo: Item[] = ROTEIROS.grupo.passos.flatMap((p): Item[] => (p.t === "msg" ? [{ k: "msg", texto: typeof p.texto === "string" ? p.texto : "", de: p.de }] : p.t === "nucleo" ? [{ k: "nucleo", texto: p.texto }] : p.t === "sistema" ? [{ k: "sistema", texto: p.texto }] : []))
      return {
        // (a missão do Mubarak NÃO vem aceita: a pessoa aceita no painel)
        ...s, casa: true, violao: true, tutorial: s.tutorial ?? [],
        // a D-Bee: o galão (despejado no tanque, dá pra chegar na cidade);
        // os 25 NEON caem na conta na cena ("toma aqui")
        tanque: GALAO, galao: "vazio",
        completos: [...new Set([...s.completos, "grupo" as const, "abertura" as const])],
        ligacoes: [...new Set([...s.ligacoes, "dbee-0", "dbee-1"])],
        logs: { ...s.logs, grupo },
      }
    })
    track("mission_step", { mission_id: "linha-inicio", step: "casa:fim", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
  }, [])

  // o Mubarak agradeceu na casa do Drewboy: o fim da missão do tutorial
  const fimMubarakDrew = useCallback(() => {
    setCena(null)
    setCinema(null)
    setSave((s) => ({ ...s, tutorial: [...new Set([...(s.tutorial ?? []), "drewboy"])] }))
    track("mission_step", { mission_id: "linha-tutorial", step: "drewboy", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
  }, [])

  // (T03) a loja: discos, instrumentos, carros e roupas, em neon$ (economia.ts).
  // O id é "categoria:nome" ("disco:rock", "roupa:bone")
  const comprarNaLoja = (id: string) => {
    const s = saveRef.current
    const r = comprar(s, id)
    if (!r.ok) return false
    setSave((x) => { const y = comprar(x, id); return y.ok ? y.save : x })
    track("mission_step", { mission_id: "linha-loja", step: `comprou:${id}`, perfil: s.perfil ?? "?", fio_pos: -1 })
    return true
  }

  const religar = useCallback(() => {
    assentarSinal()
    setSave((s) => ({ ...s, sinal: s.sinal + 10, nucleo: { ...s.nucleo, caido: false } }))
    track("mission_step", { mission_id: "linha-nucleo", step: "antena:religou", perfil: save.perfil ?? "?", fio_pos: -1 })
  }, [save.perfil, assentarSinal])

  // subir de nível é um momento — não um número mudando em silêncio
  const nivel = nivelDe(save)
  // regou um canteiro da Ella: +2 neon, quantos já foram regados alguma vez e,
  // com todos, a conquista
  const regouCanteiro = useCallback((id: string) => {
    const s0 = saveRef.current
    const regadas = { ...s0.regadas, [id]: s0.dia ?? 1 }
    const total = CANTEIROS.length, feitos = CANTEIROS.filter((c) => regadas[c.id] !== undefined).length
    const conquista = feitos >= total && !(s0.conquistas ?? []).includes("jardim-da-ella")
    setSave((s) => ({ ...ganhar(s, PAGA.regarCanteiro), regadas: { ...s.regadas, [id]: s.dia ?? 1 }, conquistas: conquista ? [...(s.conquistas ?? []), "jardim-da-ella"] : s.conquistas }))
    const c = canteiroPorId(id)
    if (conquista) avisar("conquista · o jardim da Ella", `você regou os ${total} canteiros da cidade`, "#ffc857")
    else avisar(c ? `${ESPECIES[c.especie].nome} · regado` : "regado", `${feitos} de ${total} canteiros da Ella · +${PAGA.regarCanteiro} neon`, c ? ESPECIES[c.especie].cor : "#2fe8ff")
  }, [avisar])
  const regadasHoje = useMemo(() => Object.entries(save.regadas ?? {}).filter(([, d]) => d === (save.dia ?? 1)).map(([id]) => id), [save.regadas, save.dia])
  const listaMissoes = useMemo(() => {
    const l = abertas(save, nivel)
    // no tutorial, só a primeira pessoa (as outras abrem quando ele acaba)
    return emTutorial(save) ? (feito(save, "posto") ? l.filter((m) => m.id === PRIMEIRA) : []) : l
  }, [save, nivel])

  // (T02) a carreira: a missão pegada (das 13), a checklist dela (arte, jogo, a porta) e pra onde ir
  const h13 = useMemo(() => hist13(save), [save])
  const missaoCarreira = useMemo(() => missaoDoSave(save), [save])
  const m13 = missaoCarreira ? MISSOES13[missaoCarreira] : null
  const passos13 = useMemo(() => (missaoCarreira ? checklist13(h13, missaoCarreira) : []), [h13, missaoCarreira])
  const lugar13 = missaoCarreira ? alvo13(h13, missaoCarreira) : null
  // (21/10) a feira: o que a cidade precisa agora (pegar ou largar). Largar uma
  // oferta só tira ela da frente até a próxima missão acabar
  const feira = useMemo(() => feiraDoSave(save), [save])
  const [largadas, setLargadas] = useState<MissaoId[]>([])
  // (21/10, o mapa que ensina) tocou no cartão de uma oferta: a pista dela brilha no mapa (some em 6 s)
  const [focoFeira, setFocoFeira] = useState<PistaId | null>(null)
  useEffect(() => { if (!focoFeira) return; const t = setTimeout(() => setFocoFeira(null), 6000); return () => clearTimeout(t) }, [focoFeira])
  const nFeitas = (h13.feitas13 ?? []).length
  useEffect(() => { setLargadas([]) }, [nFeitas])
  const feiraVisivel = feira.filter((o) => !largadas.includes(o.id))
  // (trilha de pedras) o que a trilha precisa do save: a fase, o que já viu, a missão
  const passoTrilha = passos13.find((x) => x.estado === "agora")?.nome ?? ""
  const feitasCidade = (h13.feitas13 ?? []).filter((x) => x !== "dbee" && x !== "oficina").length
  const baseTrilha = useMemo(() => ({ fase: hist.fase, holo: hist.holo, feitos: hist.tutorial ?? [], missao: missaoCarreira, ofertas: feiraVisivel.length, feitasCidade, passo: passoTrilha }), [hist.fase, hist.holo, hist.tutorial, missaoCarreira, feiraVisivel.length, feitasCidade, passoTrilha])
  // (missões claras, 02/11) chegou no lugar de uma missão disponível, sem outra
  // pegada: pega e já começa ali (a Corrida só chama sem missão ativa)
  const pegarAqui = (id: string) => {
    if (!ehMissao13(id) || missaoDoSave(saveRef.current) || !feiraDoSave(saveRef.current).some((o) => o.id === id)) return
    // pegou: ela vira o alvo e o gatilho de chegada (já dentro do raio) abre a
    // peça sozinho, uma vez (chamar aqui também abriria duas vezes)
    visitaAbriu.current = null
    pegarMissao(id)
  }
  const pegarMissao = (id: MissaoId) => {
    setSave((s) => comHistoria(s, (h) => ({ ...h, missao: id })))
    setLargadas((l) => l.filter((x) => x !== id))
    track("mission_step", { mission_id: `disco-${id}`, step: "pegou", perfil: save.perfil ?? "?", fio_pos: -1 })
  }
  const fecharOuvir = useCallback(() => setOuvirFim(null), [])
  const largarMissao = () => {
    const m = missaoCarreira
    setSave((s) => comHistoria(s, (h) => ({ ...h, missao: undefined })))
    if (m) setLargadas((l) => [...l, m])
  }
  const alvoChao: LugarChao | null = !HIST ? null : hist.fase === "bar" ? "bar" : hist.fase === "oficina" ? alvoOficina(hist) : hist.fase === "nectar" && hist.nectar === "oficina" ? "oficina" : quebrada(hist) ? "oficina" : lugar13?.chao ?? null
  const [pingpong, setPingpong] = useState(false)
  // (T29) o final passando agora: o momento em que ele começou (disco/Final.tsx toca o resto)
  const [finalAgora, setFinalAgora] = useState<MomentoFinal | null>(null)
  // (trilha sonora, 05/11) a introdução da missão aberta (o balão por cima do mundo)
  // (revisão 05/11) m0/ativa0: a distância até o lugar e a missão pegada quando o balão abriu
  const [introMissao, setIntroMissao] = useState<{ id: MissaoId; quem: string; texto: string; m0: number; ativa0: MissaoId | null } | null>(null)
  const introVista = useRef(new Set<MissaoId>())
  // (revisão 05/11) a introdução é da missão de agora, ali. Trocou de missão (o mapa,
  // o celular) ou foi embora do lugar: o balão fecha (antes ficava, e o "bora" abria a
  // peça no meio da cidade ou descia pro túnel de longe). Os links de teste que abrem
  // de longe seguem valendo: conta o quanto ele se afastou desde que o balão abriu
  // (começo novo, 05/11) trocou de missão (ou largou): o "depois" da outra não vale mais
  useEffect(() => {
    if (INTRO_ADIADA.missao && INTRO_ADIADA.missao !== missaoCarreira) { INTRO_ADIADA.missao = ""; INTRO_ADIADA.texto = ""; INTRO_ADIADA.toque = null }
  }, [missaoCarreira])
  useEffect(() => {
    if (!introMissao) return
    if (missaoCarreira !== introMissao.ativa0) { setIntroMissao(null); return }
    const iv = setInterval(() => {
      const m = lerGuia().metros
      if (m >= 0 && m > Math.max(0, introMissao.m0) + CHEGADA_MISSAO.avisar) setIntroMissao(null)
    }, 500)
    return () => clearInterval(iv)
  }, [introMissao, missaoCarreira])
  // (T10) a quadra: o B4TIDA aberto (a arte) e o basquete (o jogo, ou a quadra livre depois da porta)
  const [batidaMissao, setBatidaMissao] = useState<{ missao: MissaoId; clima: string } | null>(null)
  const [basquete, setBasquete] = useState<{ n: number; pontos: number; tempo: number; livre: boolean } | null>(null)
  const quadraLivreEm = useRef(0)
  // (T57) o que mais vale no chão agora, além do alvo: as peças que faltam no
  // lixão (catando: pega passando, qualquer uma) e a boca do túnel (depois da subida)
  const chaoExtra = !HIST ? "" : [...(hist.fase === "oficina" && passoOficina(hist) === "catar" ? pecasFaltando(hist) : []), ...(hist.fase === "carreira" || hist.fase === "livre" ? ["tuneis", "torre"] : hist.fase !== "minhoca" ? ["tuneis", "torre"] : []), ...(["oficina", "subir", "nectar", "carreira", "livre"].includes(hist.fase) ? ["bar", ...IDS_ABERTOS] : []), ...((hist.fase === "carreira" || hist.fase === "livre") && instrumentosNovos(h13).length ? ["casa"] : [])].join(",")
  useEffect(() => {
    definirChaoAtivos(chaoExtra ? (chaoExtra.split(",") as LugarChao[]) : [])
    return () => definirChaoAtivos([])
  }, [chaoExtra])
  // (disco) pra onde a história manda agora (a coluna de luz, a vaga, o mapa)
  const alvoDisco: Alvo | null = hist.fase === "bar" ? null
    : hist.fase === "nectar" && hist.nectar === "galao" ? { t: "lugar", missao: "nectar", lugar: "posto", pegar: false }
    : lugar13?.lugar ? { t: "lugar", missao: "sexta", lugar: lugar13.lugar, pegar: false }
    // (notas 04/11) o instrumento novo não vira alvo na cidade: fica guardado e a
    // D-Bee pede pra tocar quando ele chegar na casa dela (chaoExtra "casa")
    : null
  // o Guitar Driver aberto agora (na rua, ou a peça de tocar ao vivo de uma missão)
  const showAgora = HIST && hist.show && confShow(hist.show) && !cena && tela.t === "corrida" ? hist.show : null
  const showConf = showAgora ? confShow(showAgora)! : null
  // (T19) a peça de escrever a letra aberta agora (a arte do LU2CA)
  const letraAgora = (() => {
    if (!HIST || !hist.aberta13 || cena || tela.t !== "corrida") return null
    const [mid, qual] = hist.aberta13.split(":") as [MissaoId, "arte" | "jogo"]
    const como = MISSOES13[mid]?.[qual]?.como
    const conf = como?.t === "letra" ? letraDe(como.faixa) : null
    return conf && como?.t === "letra" ? { missao: mid, qual, faixa: como.faixa, conf } : null
  })()
  // (T15–T25, T16) a peça de agora que abre por cima do jogo (disco/pecas/): a
  // dança, a vinheta, a trilha, a máquina, o clipe, a horta, o prato, o disco, a sinuca
  const cenaAgora = (() => {
    if (!HIST || !hist.aberta13 || cena || tela.t !== "corrida") return null
    const [mid, qual] = hist.aberta13.split(":") as [MissaoId, "arte" | "jogo"]
    const como = MISSOES13[mid]?.[qual]?.como
    return como?.t === "cena" ? { missao: mid, qual, id: como.id as CenaId } : null
  })()
  // (T15–T25, T16) o que ainda está trancado (a porta de cada missão abre) e a
  // Kombi no conserto (a missão do Drew vai de patins)
  const trancasCorrida = useMemo(() => {
    if (!HIST) return undefined
    const t: Partial<Record<"ginasio" | "radio" | "fliperama" | "parque" | "canteiros", string>> = {}
    // (vitrine, 02/11) o aviso já vem como pedido: "faça a missão do Notti pra jogar"
    const par: [keyof typeof t, PortaId, string][] = [["ginasio", "ginasio", "jogar"], ["radio", "radio-frequencias", "sintonizar"], ["fliperama", "fliperama", "jogar"], ["parque", "parque", "andar"], ["canteiros", "canteiros", "regar"]]
    for (const [k, porta, pra] of par) { const m = pedidoDaPorta(h13, porta, pra); if (m) t[k] = m }
    return t
  }, [HIST, h13])
  // (T27) a Kombi quebrou: também fica no conserto (a mesma ida de patins)
  const kombiQuebrou = HIST && quebrada(h13)
  const noConserto = HIST && (kombiNoConserto(h13) || kombiQuebrou)
  // (T28) a perseguição da Kombi, uma vez só (disco/perseguicao.ts)
  const perseguicaoAgora = HIST && emPerseguicao(h13)
  // (T64) os 3 veículos só depois do metrô (perseguicao.ts: veiculosLiberados)
  const semKombi = HIST && veiculosLiberados(h13)
  // (T64, lote D) O METRÔ: a Kombi foi jogada (a perseguição no "escolher"): tomam o
  // jetpack (o evento jetpackTomado vai pro save; a Corrida lê temJetpack) e a fuga
  // começa. Na fuga ele perde o violão (perdeuViolao: save.violao = false)
  // (05/11) só começa depois que ele toca em "continuar" (entrou no jogo), como as
  // outras cenas: antes começava ao abrir, por cima da tela de entrada
  const metroPode = HIST && podeMetro(h13) && tela.t === "corrida"
  useEffect(() => {
    if (!metroPode) return
    setSave((s) => comHistoria(s, (h) => {
      const p = entrarNoMetro(h)
      return p.eventos.includes("jetpackTomado") ? tomarJetpack(p.h) : p.h
    }))
    setFalaIntro({ id: Date.now(), de: "222 FM", texto: FALAS_PERSEGUICAO.jetpack })
  }, [metroPode])
  const fimMetroPasso = (p: PassoMetro) => {
    const perdeu = p.eventos.includes("perdeuViolao")
    setSave((s) => {
      const s2 = comHistoria(s, (h) => { const x = { ...h, metro: p.h.metro }; return perdeu ? perderViolao(x) : x })
      return perdeu ? { ...s2, violao: false } : s2
    })
  }
  const sairDoMetro = () => {
    // fugiu: a 222 e, mais pra frente, os 3 veículos
    if (metroFeito(hist13(saveRef.current))) setTimeout(() => setFalaIntro({ id: Date.now(), de: "222 FM", texto: FALAS_PERSEGUICAO.depoisMetro }), 1200)
  }
  const veiculoAgora = HIST ? veiculoDe(h13)?.id ?? null : null
  const podeVirPolicia = HIST && podePerseguir(h13, save.popularidade ?? 0)
  // (T02) a peça aberta agora (o ping pong, o show, a prova), a recompensa na tela e a rua
  const pecaAberta = useRef<{ missao: MissaoId; qual: "arte" | "jogo" } | null>(null)
  const [provaMissao, setProvaMissao] = useState<{ missao: MissaoId; qual: "arte" | "jogo"; id: ProvaId; cor: string } | null>(null)
  // (trilha de pedras, 05/11) a tela "a porta abriu" saiu: o que liberou brilha no mapa
  // (mostrarLiberou, logo abaixo). Fica o nome, pra quem ainda pergunta "tem tela por cima?"
  const recompensa = null as Recompensa13 | null
  // (T07) o tutorial do holo: a tela lá fora e os passos feitos (no save, recarregar não perde)
  const [cenaHolo, setCenaHolo] = useState(false)
  const [cenaTambor, setCenaTambor] = useState(false)
  // (trilha de pedras) as pedras feitas entram juntas, no save (recarregar não repete)
  const marcarTutorial = useCallback((ids: string[]) => setSave((s) => comHistoria(s, (h) => { const novas = ids.filter((id) => !(h.tutorial ?? []).includes(id)); return novas.length ? { ...h, tutorial: [...(h.tutorial ?? []), ...novas] } : h })), [])
  const [rua, setRua] = useState(false)
  useEffect(() => {
    if (palcosAoEntrar.current && tela.t === "corrida" && !cena) { palcosAoEntrar.current = false; setRua(true) }
  }, [tela.t, cena])
  // onde o dono está (o caderno lê isso pra dizer a parte do jogo de cada nota)
  useEffect(() => {
    ;(window as unknown as { __cnOnde?: Onde }).__cnOnde = { tela: tela.t, cena: !!cena, show: showAgora ?? null, jornal: !!jornal, visor: visor ?? null, pingpong, celular: tela.t === "home" || tela.t === "app" || tela.t === "chat" }
  }, [tela.t, cena, showAgora, jornal, visor, pingpong])
  // A PORTA ABRE: a missão fica feita, a recompensa entra no save (a faixa no
  // Guitar Driver, a referência no BATIDA, o neon$) e aparece grande na tela.
  // A missão da cidade acende a pista dela pra sempre (o objeto da faixa: as torres)
  const PORTA_CALADA: MissaoId[] = ["dbee", "oficina"]
  // O QUE LIBEROU, NO LUGAR (sem a tela "a porta abriu"): as missões novas e o lugar
  // da que acabou brilham no mapa (disco/brilho.ts) e o nome curto passa no notch;
  // a música da missão fica (o "ouvir até o fim", pequeno, no canto)
  const mostrarLiberou = (r: Recompensa13, novas: string[]) => {
    brilhar([r.missao, ...novas], r.cor)
    const nomes = [...r.abriu.filter((a) => !a.emBreve).map((a) => a.nome), ...(r.guitar ? [`${r.guitar.nome} no Guitar Driver`] : [])]
    vib([20, 40, 20])
    notch(nomes.length ? `abriu · ${nomes[0]}${nomes.length > 1 ? ` +${nomes.length - 1}` : ""}` : `✓ ${r.quem}`, r.cor)
    if (r.neon > 0) setTimeout(() => notch(`+${r.neon} neon$`, r.cor), 400)
    // (T49, 06/11) a recompensa secundária: uma linha só, "+ o udu" (toca na casa da D-Bee)
    if (r.instrumento) { const ins = r.instrumento.id; setTimeout(() => notch(`${linhaRecompensa(ins)} · na casa da D-Bee`, r.cor), 800) }
    const m = MISSOES13[r.missao]
    if (m.faixa && m.onde === "cidade") { const f = m.faixa; setTimeout(() => setOuvirFim({ pista: f, id: Date.now() }), 4500) }
  }
  const abrirPortaDe = (id: MissaoId) => {
    const s0 = saveRef.current
    // (T30) a recompensa inteira (grana, faixa do Guitar Driver, referência do B4TIDA,
    // as portas) é aplicada num lugar só: disco/recompensas.ts
    const { recompensa: r, save: s1 } = aplicarRecompensa(s0, id)
    if (!r) return
    setSave((s) => aplicarRecompensa(s, id).save)
    // (notas 03/11, o dono: "uma página que abre na lata mostrando tudo que liberou —
    // não gosto de nada super explicado") no começo (a D-Bee, antes do bar; a oficina)
    // a porta abre calada: a recompensa entra no save, sem a tela por cima do jogo.
    // (trilha de pedras, 05/11) nas da cidade também não tem mais tela: o que abriu
    // brilha no próprio lugar do mapa e o nome curto passa no notch
    if (!PORTA_CALADA.includes(id)) mostrarLiberou(r, feiraDoSave(s1).map((o) => o.id).filter((x) => !feiraDoSave(s0).some((o) => o.id === x)))
    track("mission_step", { mission_id: `disco-${id}`, step: "porta", perfil: s0.perfil ?? "?", fio_pos: -1 })
  }
  // (T63) desceu a rampa da boca do túnel: a porta escurece e, lá embaixo, as
  // trincheiras (no mesmo jogo, sem trocar de página). A estrada sai da cena
  // quando o escuro cobre tudo. (30/10, o dono) A Kombi fica parada lá fora,
  // na porta: ele desce sem ela
  const descerTrincheiras = (missao: MissaoId | null) => {
    if (trincheiras) return
    setAoVivo(null)
    setTrincheiras({ missao, descendo: true })
    setTimeout(() => setTrincheiras((t) => (t ? { ...t, descendo: false } : t)), 800)
  }
  // subiu de volta: a Kombi está na porta, onde ficou parada. Correu uma volta
  // inteira lá embaixo = o jogo da missão dos túneis fica feito (e a porta segue)
  const subirDasTrincheiras = (correu: boolean) => {
    subiuDoTunel()
    const missao = trincheiras?.missao ?? null
    setTrincheiras(null)
    const pc = pecaAgora13(hist13(saveRef.current), "tuneis")
    if (correu && missao === "tuneis" && missaoDoSave(saveRef.current) === "tuneis" && pc?.peca.como?.t === "trincheiras") setTimeout(() => pecaFeitaNaMissaoRef.current("tuneis", pc.qual), 600)
    else setTimeout(() => setFalaIntro({ id: Date.now(), de: "222 FM", texto: FALA_VOLTA_TUNEL }), 1200)
  }
  // (T64, lote D) assinou um grafite: fica no save; todos assinados = a arte dos
  // túneis feita (ainda lá embaixo: a corrida, o jogo, segue dali)
  const assinouGrafite = async (id: string) => {
    const { todosAssinados } = await import("./disco/Grafite")
    setSave((s) => comHistoria(s, (h) => {
      const grafites = [...new Set([...(h.grafites ?? []), id])]
      const h2 = { ...h, grafites }
      const pc = missaoDoSave(s) === "tuneis" ? pecaAgora13(sincronizar(h2, s.objetos), "tuneis") : null
      return pc?.peca.como?.t === "grafite" && todosAssinados(grafites) ? concluir(h2, "tuneis", pc.qual) : h2
    }))
    track("mission_step", { mission_id: "disco-tuneis", step: `grafite:${id}`, perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
  }
  // chegou no lugar da missão: abre a peça de agora; sem peça (feitas ou "em breve"), a porta
  const chegouNaMissao = (id: MissaoId, semIntro = false) => {
    if (recompensa || pingpong || provaMissao || showAgora || letraAgora || batidaMissao || basquete || cenaAgora || cena || trincheiras || finalAgora || (introMissao && !semIntro)) return
    // (começo novo) abriu (o balão ou a peça): o "toca pra começar" do notch sai
    if (INTRO_ADIADA.missao === id) { INTRO_ADIADA.missao = ""; INTRO_ADIADA.texto = ""; INTRO_ADIADA.toque = null }
    const pc = pecaAgora13(hist13(saveRef.current), id)
    visitaAbriu.current = id
    if (!pc) { abrirPortaDe(id); return }
    const como = pc.peca.como
    barFechou.current = Date.now()
    if (!como || como.t === "historia" || como.t === "evento") return
    // (bloco 1 · D) chegar já é a peça (o caminho de patins e jetpack até o Drew): fica feita e a próxima segue
    if (como.t === "chegar") { pecaFeitaNaMissao(id, pc.qual); return }
    // (trilha sonora, 05/11; bíblia 9) nenhum jogo surge do nada: antes da peça, quem
    // pede fala o porquê (disco/introMissoes.ts), no mundo, com a música tocando. Toque pra começar
    if (!semIntro) {
      const h = hist13(saveRef.current)
      const jaViu = introVista.current.has(id) || ordemDe(id).some((q) => pecaFeita(h, id, q))
      const fala = introDe(id, jaViu)
      if (fala) { setAoVivo(null); setIntroMissao({ id, ...fala, m0: lerGuia().metros, ativa0: missaoDoSave(saveRef.current) }); return }
    }
    pecaAberta.current = { missao: id, qual: pc.qual }
    if (como.t === "pingpong") setPingpong(true)
    else if (como.t === "show") setSave((s) => comHistoria(s, (x) => ({ ...x, show: `missao:${id}` })))
    else if (como.t === "prova") setProvaMissao({ missao: id, qual: pc.qual, id: como.id, cor: MISSOES13[id].cor })
    else if (como.t === "letra" || como.t === "cena") setSave((s) => comHistoria(s, (x) => ({ ...x, aberta13: `${id}:${pc.qual}` })))
    else if (como.t === "batida") setBatidaMissao({ missao: id, clima: como.clima })
    else if (como.t === "basquete") setBasquete({ n: 1, pontos: como.pontos, tempo: como.tempo, livre: false })
    // (T57) desceu a rampa da boca do túnel: a corrida é lá embaixo, nas trincheiras
    else if (como.t === "trincheiras") descerTrincheiras(id)
    // (T64, lote D) o grafite: nas paredes das trincheiras (assinar todos faz a arte)
    else if (como.t === "grafite") descerTrincheiras(id)
    // (T22) a casa da pessoa: entra e só sai depois de passar por tudo
    else if (como.t === "casa") entrarNaCasa(id)
    // (T29) o final: a sequência na casa da D-Bee (disco/final.ts)
    else if (como.t === "final") abrirFinal("sinal")
  }
  // (T29) O FINAL: o jogo atrás com as faixas de cinema, a câmera roteirizada
  // (estrada/FinalNove.tsx) e a tela dos momentos (disco/FinalTela.tsx). Acabou: as
  // duas peças do final ficam feitas e a porta (o mundo depois) abre, ali mesmo
  const abrirFinal = (m: MomentoFinal) => {
    setAoVivo(null)
    setIntroMissao(null)
    setCinema("lugar")
    setFinalAgora(m)
    track("mission_step", { mission_id: "disco-final", step: `final:${m}`, perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
  }
  const fimFinal = () => {
    setFinalAgora(null)
    setCinema(null)
    setSave((s) => comHistoria(s, (h) => ordemDe("final").reduce<HistoriaDisco>((x, q) => concluir(x, "final", q), h)))
    track("mission_step", { mission_id: "disco-final", step: "final:fim", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
    setTimeout(() => chegouRef.current("final"), 900)
  }
  // (T22) a casa de uma missão (a galeria da Ella): a sala em 3D e a cena dela.
  // As peças que apontam pra casa ficam feitas juntas no fim (fimCasaMissao)
  const casaAberta = useRef<MissaoId | null>(null)
  const entrarNaCasa = (id: MissaoId) => {
    const lugar = MISSOES13[id].lugar.lugar
    if (!lugar) return
    casaAberta.current = id
    setAoVivo(null)
    setCinema("lugar")
    setCena({ lugar, missao: MISSOES13[id].faixa ?? "chuva", pegar: false, especial: "ella-galeria" })
    track("mission_step", { mission_id: `disco-${id}`, step: "casa", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
  }
  const fimCasaMissao = (r: ResultadoCena) => {
    const id = casaAberta.current
    casaAberta.current = null
    pecaAberta.current = null
    setCena(null)
    setCinema(null)
    if (!id || !r.completa) return
    const casa = (q: "arte" | "jogo") => MISSOES13[id][q].como?.t === "casa"
    setSave((s) => comHistoria(s, (h) => ordemDe(id).filter(casa).reduce<HistoriaDisco>((x, q) => concluir(x, id, q), { ...h, aberta13: undefined })))
    // ainda no lugar: a porta (a recompensa) abre direto
    setTimeout(() => chegouRef.current(id), 900)
  }
  // a peça acabou bem: fica feita e, ainda no lugar, a próxima (ou a porta) segue direto
  const pecaFeitaNaMissao = (id: MissaoId, qual: "arte" | "jogo") => {
    pecaAberta.current = null
    setSave((s) => comHistoria(s, (h) => concluir(h, id, qual)))
    setTimeout(() => {
      const h = hist13(saveRef.current)
      if (normalizarMissao(h.missao) === id && !feita13(h, id) && alvo13(h, id)) chegouRef.current(id)
    }, 900)
  }
  // (trilha sonora, 05/11) o "bora" da introdução: abre a peça (já sem a introdução)
  const chegouSemIntro = useRef<(m: MissaoId) => void>(() => {})
  useEffect(() => { chegouSemIntro.current = (m) => chegouNaMissao(m, true) })
  const pecaFeitaNaMissaoRef = useRef(pecaFeitaNaMissao)
  const abrirFinalRef = useRef<(m: MomentoFinal) => void>(() => {})
  useEffect(() => { chegouRef.current = chegouNaMissao; abrirPortaRef.current = abrirPortaDe; pecaFeitaNaMissaoRef.current = pecaFeitaNaMissao; abrirFinalRef.current = abrirFinal })
  // (T29) o final já visto neste save: o quintal da D-Bee fica com a Kombi e o mato (FinalNove.tsx)
  const finalFeito = HIST && feita13(hist13(save), "final")
  useEffect(() => { definirFinalFeito(!!finalFeito) }, [finalFeito])
  // (T63) ?parte=missao.tuneis.trincheiras: entrou no jogo, desce direto (sem dirigir até a boca)
  useEffect(() => {
    if (!HIST || !descerAoEntrar.current || tela.t !== "corrida" || cena) return
    descerAoEntrar.current = false
    const u = new URL(location.href); u.searchParams.delete("descer"); history.replaceState(history.state, "", u.pathname + u.search + u.hash)
    // (T64) com a missão dos túneis feita (ou não pegada), desce livre (grafite.livre, metro.tuneis)
    const h0 = hist13(saveRef.current)
    if (feita13(h0, "tuneis") || normalizarMissao(h0.missao) !== "tuneis") setTimeout(() => descerTrincheiras(null), 1500)
    else setTimeout(() => chegouRef.current("tuneis"), 1500)
  }, [HIST, tela.t, cena])
  // (lote D) os links de teste novos: entrou no jogo, a parte abre direto
  useEffect(() => {
    const qual = abrirAoEntrar.current
    if (!HIST || !qual || tela.t !== "corrida" || cena) return
    abrirAoEntrar.current = null
    const u = new URL(location.href); u.searchParams.delete("abrir"); history.replaceState(history.state, "", u.pathname + u.search + u.hash)
    setTimeout(() => {
      if (qual === "elevador") abrirElevadorRef.current()
      else if (qual === "casa") abrirCasaInstrumentosRef.current()
      else if (qual === "recompensa") abrirPortaRef.current("mubarak")
      // (T29) ?parte=final e final.<momento>: a sequência começa direto naquele momento
      else if (qual.startsWith("final:")) abrirFinalRef.current(qual.slice(6) as MomentoFinal)
      // (vitrine) o túnel no começo e a sinuca do bar
      else if (qual === "tunel") descerTrincheiras(null)
      else if (qual === "sinuca") setSinucaBar(true)
      else if (qual.startsWith("visita:")) visitarSalaRef.current(qual.slice(7) as LugarId)
    }, 1200)
  }, [HIST, tela.t, cena])
  // (T47) o elevador: abre (como o posto) e fecha no fim-gesto da sala; as falas
  // que a sala manda (bus.ts) aparecem na legenda dele
  const abrirElevador = () => {
    if (cinema || cena || noPosto || noElevador) return
    setAoVivo(null)
    setPainelMissoes(false)
    setFalaElevador(null)
    setNoElevador(true)
    track("mission_step", { mission_id: "linha-elevador", step: "entrou", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
  }
  const abrirElevadorRef = useRef(abrirElevador)
  useEffect(() => { abrirElevadorRef.current = abrirElevador })
  useEffect(() => {
    if (!noElevador) return
    let t: ReturnType<typeof setTimeout> | undefined
    const sair = ouvirSala((sn) => {
      if (sn.t === "fala") setFalaElevador(sn.texto)
      else if (sn.t === "fim-gesto") t = setTimeout(() => { setNoElevador(false); setFalaElevador(null); barFechou.current = Date.now() }, 3500)
    })
    return () => { sair(); if (t) clearTimeout(t) }
  }, [noElevador])
  // (T63) as trincheiras baixam antes: com a missão dos túneis pegada, ou já no subúrbio
  useEffect(() => { if (HIST && missaoCarreira === "tuneis") void carregarTrincheiras() }, [HIST, missaoCarreira])
  // (T57) voltou das trincheiras pela boca do túnel: se correu uma volta lá
  // embaixo, o jogo da missão dos túneis fica feito (e a porta segue)
  const voltouTuneis = useRef(false)
  useEffect(() => {
    if (!HIST || voltouTuneis.current || tela.t !== "corrida" || cena) return
    const v = voltaDasTrincheiras()
    if (!v) return
    voltouTuneis.current = true
    limparVoltaDasTrincheiras()
    const pc = pecaAgora13(hist13(saveRef.current), "tuneis")
    if (v.corrida && missaoDoSave(saveRef.current) === "tuneis" && pc?.peca.como?.t === "trincheiras") pecaFeitaNaMissao("tuneis", pc.qual)
    else setTimeout(() => setFalaIntro({ id: Date.now(), de: "222 FM", texto: FALA_VOLTA_TUNEL }), 1200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [HIST, tela.t, cena])
  // (T10) o link de teste (?parte=missao.quadra.batida / .basquete) deixa a peça marcada aberta no save: abre aqui
  useEffect(() => {
    if (!HIST || !hist.aberta13 || cena || tela.t !== "corrida") return
    const [mid, qual] = hist.aberta13.split(":") as [MissaoId, "arte" | "jogo"]
    const como = MISSOES13[mid]?.[qual]?.como
    if (como?.t !== "batida" && como?.t !== "basquete" && como?.t !== "casa") return
    setSave((s) => comHistoria(s, (x) => ({ ...x, aberta13: undefined })))
    pecaAberta.current = { missao: mid, qual }
    // (T22) ?parte=missao.ella.casa: direto dentro da casa
    if (como.t === "casa") { entrarNaCasa(mid); return }
    if (como.t === "batida") setBatidaMissao({ missao: mid, clima: como.clima })
    else setBasquete({ n: 1, pontos: como.pontos, tempo: como.tempo, livre: false })
  }, [HIST, hist.aberta13, cena, tela.t])
  // (T15–T25, T16) só fora da produção, pros testes: chegar no lugar da missão
  // pegada, terminar a peça aberta (o ping pong, a sinuca, a máquina) e contar um evento da rua
  useEffect(() => {
    if (!D || !atalhosLiberados()) return
    const w = window as unknown as { __cnMissao?: unknown }
    w.__cnMissao = {
      chegou: () => { const m = missaoDoSave(saveRef.current); if (m) chegouRef.current(m) },
      fimPeca: () => {
        const h = hist13(saveRef.current)
        const aberta = h.aberta13 ? (h.aberta13.split(":") as [MissaoId, "arte" | "jogo"]) : null
        const p = pecaAberta.current ?? (aberta ? { missao: aberta[0], qual: aberta[1] } : null)
        if (!p) return false
        setPingpong(false); setProvaMissao(null)
        setSave((s) => comHistoria(s, (x) => ({ ...x, aberta13: undefined })))
        pecaFeitaNaMissao(p.missao, p.qual)
        return true
      },
      evento: (e: "montanha" | "flor") => eventoDaRua(e),
    }
    return () => { delete w.__cnMissao }
  })
  // (T40) o SOM DA MISSÃO (J2: 5). Entrou no lugar da missão (a cena, o ping pong),
  // a música da Kombi cala e entra o som dela; saiu, a Kombi volta (a trilha sai
  // em fade, sem estalo). O arquivo é carregado antes, quando a missão é pegada
  useEffect(() => { fonteSom.discoPadrao = ACERVO.faixas.map((f) => f.src) }, [])
  // (T63) nas trincheiras, o som dos túneis (10 D3 10)
  const somAgora = cena ? somDoLugar(cena.lugar) : pingpong ? somDaMissao("drew") : trincheiras && !trincheiras.descendo ? somDaMissao("tuneis") : null
  // (música contínua, 03/11) com a faixa de uma pista tocando, a missão NÃO troca
  // de música: a mesma faixa passa pro instrumental no mesmo ponto (abaixo). A
  // trilha da missão só entra sem faixa de pista (o deserto: casa, dunas)
  // (notas 04/11) a rádio ligada manda: nos túneis, nas salas e nas cenas ela
  // segue tocando e o som da missão não entra por cima (a faixa da rua já fica muda por baixo)
  const radioManda = D && fonteSom.get() === "radio" && !!radio?.tocando
  // (trilha sonora, 05/11; bíblia 9) desligado: a missão não troca a música que está
  // tocando (TRILHA_PROPRIA_DAS_MISSOES em disco/sons.ts volta a regra antiga)
  useEffect(() => {
    if (!TRILHA_PROPRIA_DAS_MISSOES || !somAgora || pistaSom.tocando || radioManda) return
    silenciarKombi(true)
    trilha.entrar(somAgora)
    return () => { trilha.sair(); silenciarKombi(false) }
  }, [somAgora, radioManda])
  // (trilha sonora, 05/11; bíblia 9) chegou do deserto no subúrbio Xenom: a rádio
  // liga sozinha (com o filtro de rádio antigo, radioAntiga.ts). Uma vez só, gravada
  // no save; depois respeita se ele desligou
  useEffect(() => aoChegarNoSuburbio(() => {
    const s = saveRef.current
    if (!HIST || historiaDe(s).radioXenom) return
    setSave((x) => comHistoria(x, (h) => ({ ...h, radioXenom: true })))
    // (começo novo, 05/11) gravado na hora (não espera a folga do save): fechou a aba logo
    // depois, a volta não liga a rádio de novo nem perde que ela já ligou
    gravar(gravarComo.current(comHistoria(s, (h) => ({ ...h, radioXenom: true }))))
    // auto = true: a estrada (Corrida) põe a programação da frequência pra tocar (em fade
    // de 2 s, sem chiado). (começo novo) O disco antigo sai antes, em fade de 2 s
    if (fonteSom.get() === "disco" && disco.tocando) disco.sairEmFade(2, () => { if (fonteSom.get() === "disco") fonteSom.set("radio", true) })
    else fonteSom.set("radio", true)
  }), [HIST])
  // nas trincheiras (lá embaixo) a rádio também soa antiga; subiu, a estrada diz a zona de novo
  useEffect(() => { if (trincheiras && !trincheiras.descendo) definirZonaSom("tuneis") }, [trincheiras])
  // (notas 04/11) liga/desliga a rádio fora da estrada (os túneis, as salas): o mesmo do holo
  const alternarRadioLivre = () => {
    if (radioManda) fonteSom.set("off")
    else {
      fonteSom.set("radio")
      if (fonteSom.get() === "radio") tocarRadio(D ? radioFreq.get() : (save.freq as FreqId) || "linha")
    }
    // a faixa da rua (que mora na página) fica muda por baixo da rádio, como na estrada
    pistaSom.estado(false, fonteSom.get() === "radio")
  }
  // a faixa da pista vive na página (não na estrada, que desmonta numa sala): sai da página, para
  useEffect(() => () => pistaSom.parar(), [])
  // (só baixa o som da missão se ele vai tocar: sem faixa de pista, no deserto)
  useEffect(() => { if (TRILHA_PROPRIA_DAS_MISSOES && missaoCarreira && !pistaSom.tocando) trilha.preparar(somDaMissao(missaoCarreira)) }, [missaoCarreira])
  // (T22) a casa da missão pegada começa a baixar enquanto a Kombi ainda está longe
  useEffect(() => {
    if (!missaoCarreira) return
    const m = MISSOES13[missaoCarreira]
    const como = [m.jogo.como, m.arte.como].find((c) => c?.t === "casa")
    if (como?.t === "casa" && emTeste(hist13(saveRef.current), missaoCarreira)) precarregarSala(como.sala)
  }, [missaoCarreira])
  // um evento da rua conta pra peça de agora (a montanha-russa da Nizzy…)
  const eventoDaRua = (e: "montanha" | "flor") => setSave((s) => (historiaDe(s).fase === "carreira" ? comHistoria(s, (h) => contarEvento(h, e)) : s))
  const fimShow = (r: ResultadoShow) => {
    const id = hist.show!, conf = confShow(id)!
    const popAntes = saveRef.current.popularidade ?? 0
    // (T03) o cachê do show vem da economia (a nota e a fama de antes)
    // (T20) num palco da carreira: o cachê vezes o palco, a melhor estrela e o nível
    const pc = lerShowDoPalco(id)
    const base = cacheDoShow(r.nota, popAntes)
    // (T21) um show xenom: o cachê vezes o multiverso; cumpriu a missão a primeira vez, o bônus e o prestígio
    const xs = lerShowXenom(id)
    const rx = xs ? registrarXenom(hist13(saveRef.current), xs.id, { nota: r.nota, maxSeq: r.maxSeq ?? 0, galera: r.galera ?? 0 }, base) : null
    if (xs && rx) {
      const mx = { ...calcularManchete(r, xs.faixa, conf.lugar, popAntes, Date.now()), neon: rx.neon }
      setSave((s) => comHistoria({ ...ganhar(s, mx.neon), popularidade: Math.min(100, (s.popularidade ?? 0) + mx.pop + rx.prestigio) }, (h) => ({ ...registrarXenom(h, xs.id, { nota: r.nota, maxSeq: r.maxSeq ?? 0, galera: r.galera ?? 0 }, base).h, show: undefined, shows: [...(h.shows ?? []), mx] })))
      if (rx.primeira) setTimeout(() => avisar("222 FM", `missão cumprida ${conf.lugar} · +${rx.neon} neon$ · +${rx.prestigio + mx.pop} de prestígio`, xs.cor), 300)
      if (rx.album) setTimeout(() => avisar("222 FM", `os 4 multiversos cumpridos: o álbum ${XENOM_CONFIG.album.nome} é seu, no untitled`, xs.cor), 2400)
      setJornal(mx)
      return
    }
    const faixaDoJornal = pc ? pc.faixa : id.startsWith("rua:") ? id.slice(4) : id
    const m = { ...calcularManchete(r, faixaDoJornal, conf.lugar, popAntes, Date.now()), neon: pc ? cacheNoPalco(base, pc.palco) : base }
    const reg = pc ? registrarShow(hist13(saveRef.current), pc.palco.id, pc.faixa, r.nota) : null
    setSave((s) => comHistoria({ ...ganhar(s, m.neon), popularidade: Math.min(100, (s.popularidade ?? 0) + m.pop) }, (h) => ({ ...(pc ? registrarShow(h, pc.palco.id, pc.faixa, r.nota).h : h), show: undefined, shows: [...(h.shows ?? []), m] })))
    if (reg && reg.nivel > reg.nivelAntes) {
      const novo = PALCOS_CARREIRA[reg.nivel - 1]
      setTimeout(() => avisar(`nível ${reg.nivel} de ${NIVEL_MAX}`, reg.nivel === NIVEL_MAX ? `você chegou no topo: ${nomeDoPalco(novo).nome}` : `abriu ${nomeDoPalco(novo).nome}`, novo.cor), 400)
    }
    // a peça de uma missão (tocar ao vivo): conta como feita e a missão segue
    if (id.startsWith("missao:")) {
      // (a peça vem do save: recarregar a página no meio do show não perde a missão)
      const mid = normalizarMissao(id.slice(7))
      const pc = mid ? pecaAgora13(hist13(saveRef.current), mid) : null
      if (mid && pc?.peca.como?.t === "show") pecaFeitaNaMissao(mid, pc.qual)
      else pecaAberta.current = null
      return
    }
    // o show na rua: o trampo. Paga, e o jornal do dia seguinte fala dele
    setJornal(m)
  }
  // o que o anel do holo diz (curto: o lugar, não a explicação)
  const objetivoDisco = hist.fase === "dunas" ? "o subúrbio" : hist.fase === "bar" ? "o bar · o subúrbio" : hist.fase === "oficina" ? `${OBJETIVO_OFICINA[passoOficina(hist)]}${passoOficina(hist) === "catar" ? ` · ${pecasCatadas(hist).length}/${LIXO.length}` : ""}` : hist.fase === "subir" ? "a cidade · lá em cima"
    : hist.fase === "nectar" ? ({ quebra: "a pista da nectar", regar: `as flores · ${Math.max(0, 3 - ((hist.flores ?? 0) - (hist.floresIni ?? 0)))}`, galao: "o posto", oficina: "a oficina", show: "o jardim", flores: `o jardim · ${Math.max(0, 5 - ((hist.flores ?? 0) - (hist.floresIni ?? 0)))}`, feita: null } as Record<string, string | null>)[hist.nectar ?? "quebra"]
    : m13 ? (passos13.find((x) => x.estado === "agora")?.nome.split(" · ")[1] ?? m13.quem)
    : feira.length ? `pega uma missão no mapa · ${feira.length}` : null
  // (22/10, o Omnitrix) a checklist da missão pegada gira em volta da bolinha (o anel do holo)
  const checklistHolo = useMemo(() => {
    if (!HIST || !m13) return null
    return { chave: m13.id, cor: m13.cor, titulo: `${m13.quem}${m13.faixa ? ` · ${PISTAS.find((x) => x.id === m13.faixa)!.faixa}` : ""}`, nome: m13.quem, passos: passos13, agora: agoraDaMissao(h13, m13.id) }
  }, [HIST, m13, passos13, h13])
  // (22/10) as missões moram no mapa: um ícone por missão com pista (a pegada, ou as ofertas da feira) e,
  // no painel do mapa, as opções pra clicar (a checklist da de agora, ou a feira)
  // (missões claras, 02/11) o ícone fica no LUGAR da missão (o mesmo ponto do
  // gatilho: estrada/alvoMissao.ts), não mais na pista da faixa. A pegada: maior,
  // pulsando, "AGORA · quem"; as que dá pra pegar: o nome; as feitas: apagadas
  const mapaMissoes = useMemo<IconeMapa[] | null>(() => {
    if (!HIST || hist.fase !== "carreira") return null
    const ic = (id: MissaoId, x: Partial<IconeMapa>, lugar: IconeMapa["lugar"]): IconeMapa => ({ id, faixa: MISSOES13[id].quem, cor: MISSOES13[id].cor, agora: false, icone: MISSOES13[id].faixa ?? undefined, lugar, ...x })
    const out: IconeMapa[] = []
    for (const id of IDS13) if (id !== "final" && feita13(h13, id)) out.push(ic(id, { feita: true }, MISSOES13[id].lugar))
    for (const o of feiraVisivel) out.push(ic(o.id, {}, MISSOES13[o.id].lugar))
    if (m13 && lugar13) out.push(ic(m13.id, { agora: true, faixa: `AGORA · ${m13.quem}` }, lugar13))
    return out
  }, [HIST, hist.fase, m13, lugar13, feiraVisivel, h13])
  const painelMissao13 = m13 ? (
    <section className="l-missoes-agora" style={{ ["--cor" as string]: m13.cor }}>
      <small>agora · {m13.quem}{m13.faixa ? ` · ${PISTAS.find((x) => x.id === m13.faixa)!.faixa}` : ""}</small>
      <ul className="l-missoes-check">
        {/* (T42, J2:32) só o próximo passo */}
        {passos13.filter((x, i, l) => x === (l.find((y) => y.estado === "agora") ?? l.find((y) => y.estado !== "feita"))).map((x) => <li key={x.nome} className={`is-${x.estado === "em breve" ? "breve" : x.estado}`}><i aria-hidden="true">{x.estado === "feita" ? "✓" : ""}</i>{x.nome}<em>{x.estado === "agora" ? (lugar13 ? "agora" : "agora · na rua") : x.estado === "em breve" ? "em breve" : ""}</em></li>)}
      </ul>
      <button type="button" className="l-feira-largar" onClick={largarMissao}>largar essa missão</button>
    </section>
  ) : null
  // (T02, J2: 23, 26) a rua: cantar (Guitar Driver) e fazer beat, abertos desde o começo
  const ruaBotoes = HIST && hist.fase === "carreira" ? (
    <div className="l-rua-bts">
      <small className="l-missoes-sub">na rua · ganhar uma grana</small>
      <button type="button" data-fecha-mapa onClick={() => setRua(true)}>cantar · Guitar Driver</button>
      <button type="button" data-fecha-mapa onClick={() => abrirApp("batida")}>fazer um beat · B4TIDA</button>
    </div>
  ) : null
  const mapaPainel = !mapaMissoes ? null : m13 ? <>{painelMissao13}{ruaBotoes}</> : (
    <>
      {feiraVisivel.length ? (
        <FeiraOfertas ofertas={feiraVisivel} onPegar={(id) => { setFocoFeira(null); pegarMissao(id) }} onLargar={(id) => { setFocoFeira(null); setLargadas((l) => [...l, id]) }} onFoco={(o) => setFocoFeira(o.faixa)} foco={focoFeira} />
      ) : null}
      {ruaBotoes}
    </>
  )
  // o tutorial depois do bar: o Mubarak vai de carona até a casa do Drewboy
  const alvoTut: Alvo | null = irAoPosto(save) ? { t: "lugar", missao: "nectar", lugar: "posto", pegar: false }
    : levarDrewboy(save) ? { t: "lugar", missao: "copo", lugar: "casa-drewboy", pegar: false } : null
  // O POSTO: passou devagar em frente (ou o pin do tutorial). Da primeira
  // vez, o LU2CA tá lá (RASCUNHO das falas, a partir do que o LU2CA contou:
  // se impressiona com a Kombi, nunca te viu na cidade)
  useEffect(() => {
    abrirPostoRef.current = () => {
      if (cinema || cena || noPosto) return
      setAoVivo(null)
      setPainelMissoes(false)
      setNoPosto({ primeira: !(saveRef.current.tutorial ?? []).includes("lu2ca-posto") })
    }
  }, [cinema, cena, noPosto])
  const sairDoPosto = useCallback(() => {
    const primeira = noPosto?.primeira
    setNoPosto(null)
    // o item "Encha o tanque no posto" (e os +10) só conta saindo — lá dentro
    // o saldo tem que zerar no tanque (o galão dá "saldo insuficiente")
    setSave((x) => (emTutorial(x) && (comVivo(x).tanque ?? 0) > 0.97 ? { ...x, tutorial: [...new Set([...(x.tutorial ?? []), "posto"])] } : x))
    if (primeira) {
      setSave((x) => ({ ...x, tutorial: [...new Set([...(x.tutorial ?? []), "lu2ca-posto"])] }))
      // a loja de discos chama (rascunho): o disco novo que ele falou
      setTimeout(() => avisar("LOJA", "tem disco novo na prateleira · abre no celular", "#ffc857"), 2500)
    }
  }, [noPosto, avisar, comVivo])
  const encherTanque = useCallback(() => setSave((s0) => {
    const s = comVivo(s0)
    const pago = (s.tanque ?? 1) > 0.97 ? null : gastar(s, PRECO_TANQUE)
    if (!pago) return s
    track("mission_step", { mission_id: "linha-posto", step: "tanque", perfil: s.perfil ?? "?", fio_pos: -1 })
    return { ...pago, tanque: 1 }
  }), [comVivo])
  const encherGalao = () => setSave((s) => { const pago = s.galao !== "vazio" ? null : gastar(s, PRECO_GALAO); return pago ? { ...pago, galao: "cheio" } : s })

  // a missão de agora e o resumo da caixa (no canto da tela)
  const missaoAgora = quemChama ? listaMissoes.find((m) => m.id === quemChama) ?? null : null
  const itemAgora = tut && blocoTut < BLOCOS.length ? BLOCOS[blocoTut].itens.find((i) => !feito(save, i)) ?? null : null
  // alguém escreveu e a conversa espera resposta no N3XO
  const esperaN3xo = !!quemChama && adiadas.includes(quemChama) && save.pausas[quemChama] === undefined
  const resumoMissao = esperaN3xo
    ? { rotulo: itemAgora ? BLOCOS[blocoTut].titulo : "missão", texto: `${getEstacao(quemChama!).personagem} te escreveu · responde no N3XO`, cor: getEstacao(quemChama!).cor }
    : itemAgora
    ? { rotulo: BLOCOS[blocoTut].titulo, texto: ITENS[itemAgora].texto, cor: blocoTut === 0 ? "#3d7bff" : getEstacao(PRIMEIRA).cor }
    : missaoAgora
    ? { rotulo: `missão · ${getEstacao(missaoAgora.id).personagem}`, texto: missaoAgora.texto, cor: getEstacao(missaoAgora.id).cor }
    : listaMissoes.length
    ? { rotulo: "missões", texto: "tem gente precisando de você", cor: "#ffc857" }
    : null

  // ── o TUTORIAL (tutorial.ts) ──
  // a D-Bee liga antes de cada bloco
  const ligaTut = tut && blocoTut < BLOCOS.length && !ligou(save, blocoTut)
  useEffect(() => {
    if (!pronto || !ligaTut || tela.t !== "corrida" || emSala || cinema || invasao || aoVivo || ligacao) return
    const lig = BLOCOS[blocoTut].lig
    if (!lig) return
    // a história: uns 10 s depois de sair da casa da D-Bee (mais natural)
    const t = setTimeout(() => setLigacao({ lig: LIGACOES[lig] }), blocoTut === 0 ? 10000 : 2500)
    return () => clearTimeout(t)
  }, [pronto, ligaTut, blocoTut, tela.t, emSala, cinema, invasao, aoVivo, ligacao])
  // a HISTÓRIA da D-Bee em partes (ligacoes.ts): a 2ª, a 3ª e a 4ª chegam
  // depois da 1ª, da 2ª e da 3ª missão (de volta na estrada, uns segundos depois)
  const proxHistoria = save.ligacoes.includes("dbee-historia-1")
    ? (["dbee-historia-2", "dbee-historia-3", "dbee-historia-4"] as const).find((id, k) => save.objetos.length >= k + 1 && !save.ligacoes.includes(id)) ?? null
    : null
  useEffect(() => {
    if (!pronto || !proxHistoria || tela.t !== "corrida" || emSala || cinema || invasao || aoVivo || ligacao) return
    const t = setTimeout(() => setLigacao({ lig: LIGACOES[proxHistoria] }), 8000)
    return () => clearTimeout(t)
  }, [pronto, proxHistoria, tela.t, emSala, cinema, invasao, aoVivo, ligacao])
  const marcarTut = useCallback((i: ItemTutorial) => setSave((s) => ((s.tutorial ?? []).includes(i) ? s : { ...s, tutorial: [...(s.tutorial ?? []), i] })), [])
  // cada item marcado: +10 NEON. Tudo feito: a cidade é sua
  const feitosTut = useRef<Set<ItemTutorial> | null>(null)
  useEffect(() => {
    if (!pronto || !tut) return
    const agora = new Set(BLOCOS.flatMap((b) => b.itens).filter((i) => feito(save, i)))
    const antes = feitosTut.current
    feitosTut.current = agora
    if (!antes) return
    const novo = [...agora].find((i) => !antes.has(i))
    // (sem cleanup: o save muda o tempo todo e não pode cancelar o aviso)
    // acordar alguém já tem o aviso dos 50 NEON: o do item vem depois
    if (novo) setTimeout(() => {
      setSave((s) => ({ ...s, neon: (s.neon ?? 0) + NEON_POR_ITEM }))
      avisar(`+${NEON_POR_ITEM} neon`, ITENS[novo].texto, "#ffc857")
    }, novo === "mubarak" ? 5600 : 900)
    if (novo && blocoAtual(save) >= BLOCOS.length) {
      setTimeout(() => {
        setSave((s) => ({ ...s, tutorial: [...new Set([...(s.tutorial ?? []), "fim"])], foco: undefined }))
        avisar("a cidade é sua", "tem gente esperando em cada canto. as missões tão abertas", "#ffc857")
        track("mission_completed", { mission_id: "linha-tutorial", duration_ms: 0 })
      }, 5600)
    }
  }, [save, pronto, tut, avisar])
  const irAgora = (m: (typeof listaMissoes)[number]) => {
    setPainelMissoes(false)
    // quem estava chamando e não é a escolhida espera (chama de novo depois)
    if (aoVivo && aoVivo !== m.id) setAoVivo(null)
    // aceitar (06/10, LU2CA): sem corte — a missão vira a selecionada e o
    // lugar fica marcado no mapa; o caminho é a pessoa que faz
    setSave((s) => ({ ...s, foco: m.id }))
    avisar("missão aceita", m.texto, getEstacao(m.id).cor)
    track("mission_step", { mission_id: `linha-${m.id}`, step: "aceitar", perfil: save.perfil ?? "?", fio_pos: save.fio.indexOf(m.id) })
  }
  useEffect(() => {
    if (!pronto) return
    if (nivelAnt.current !== null && nivel > nivelAnt.current) {
      const n = NIVEIS[nivel]
      avisar(`nível ${n.nome}`, `libera ${n.libera}`, "#ffc857")
      try { navigator.vibrate?.([20, 40, 20, 40, 60]) } catch {}
      track("mission_completed", { mission_id: `linha-nivel-${n.nome}`, duration_ms: 0 })
    }
    nivelAnt.current = nivel
  }, [nivel, pronto, avisar])

  // minigames da versão anterior: quem completa ganha luz e sinal (uma vez)
  const conferirLegado = useCallback(() => {
    const feitos = legadoFeito()
    assentarSinal()
    setSave((s) => {
      const novos = LEGADO.filter((l) => feitos.includes(l.id) && !s.legado.includes(l.id))
      if (!novos.length) return s
      const luz = novos.reduce((t, l) => t + l.luz, 0)
      const sinal = novos.reduce((t, l) => t + l.sinal, 0)
      setTimeout(() => {
        setXpFlutua({ id: Date.now(), n: luz })
        avisar(novos.map((l) => l.nome).join(" + "), `completo · +${luz} neon`, "#ffc857")
      }, 0)
      return { ...s, legado: [...s.legado, ...novos.map((l) => l.id)], neon: (s.neon ?? 0) + luz, sinal: s.sinal + sinal }
    })
  }, [avisar, assentarSinal])

  // já fez o quiz = está dentro da cidade
  const dentro = !!save.estacao || !!save.casa

  const entrar = () => {
    audioCtx()
    // (mapa-disco) a história nova: save novo começa no buraco de minhoca; o
    // resto entra direto na Kombi, onde estava
    if (D) {
      // (T37, J1: "toda vez que a pessoa entrar, ela vai passar por ele") todo
      // login passa pelo buraco de minhoca; quem já passou pela casa cai nela de
      // novo (CHEGADA.casaNoLogin) e segue dali
      const f0 = historiaDe(saveRef.current).fase
      if (f0 === "minhoca") {
        // (T40, J2: 5) a música da Kombi já vem tocando desde o buraco de minhoca:
        // entra em fade, distorcida, e vai ficando limpa até o fim da queda
        fonteSom.set("disco")
        disco.entradaMinhoca(DUR_MINHOCA / 1000)
        disco.tocarLista(ACERVO.faixas.map((f) => f.src))
        setMinhoca(true)
        return
      }
      // (começo novo, 05/11) reabrir na casa ou nas dunas: o disco antigo volta a tocar
      // (antes ficava mudo até a rádio Xenom ligar no subúrbio)
      if (f0 === "casa" || f0 === "dunas") { fonteSom.set("disco"); disco.tocarLista(ACERVO.faixas.map((f) => f.src)) }
      if (f0 === "casa") { setMinhoca(true); return }
      // (T57) quem volta das trincheiras sai da boca do túnel, sem a chegada do login
      // (notas 04/11) a chegada do login agora é só o link de teste dela (CHEGADA.casaNoLogin = "nunca")
      if (!nascerNoTunel() && (parteAberta === "chegada" || (casaNoLogin(historiaDe(saveRef.current)) && !parteAberta))) { player.pausar(); setChegadaLogin(true); setMinhoca(true); return }
      player.pausar()
      setEstrada(true)
      setTela({ t: "corrida", destino: null })
      return
    }
    ligarChuva()
    if (dentro) {
      // a Kombi é a tela principal: entra direto na estrada
      player.pausar()
      setTela({ t: "corrida", destino: null })
      conferirLegado()
    } else if (save.pausas.abertura !== undefined) {
      // voltou da leitura NECTAR: a D-Bee continua de onde parou
      setTela({ t: "chat", id: "abertura", volta: { t: "home" } })
    } else if (save.completos.includes("abertura")) {
      // save antigo: abertura feita, quiz (que era no grupo) não. O quiz agora
      // mora na conversa da D-Bee — recomeça ela.
      setSave((s) => {
        const logs = { ...s.logs }
        delete logs.abertura
        delete logs.grupo
        return { ...s, completos: s.completos.filter((c) => c !== "abertura" && c !== "grupo"), logs }
      })
      setTela({ t: "chat", id: "abertura", volta: { t: "home" } })
    } else if (!save.casa) {
      // primeira vez: a abertura, no deserto do mapa (Corrida, abertura).
      // A primeira coisa: o toca-discos liga com os discos antigos (LU2CA)
      fonteSom.set("disco")
      disco.tocarLista(ACERVO.faixas.map((f) => f.src))
      setEstrada(true)
      setTela({ t: "corrida", destino: null })
    } else {
      // já passou pela casa: entra na cidade de Kombi, não pelo celular
      setCinema("rodando")
      setEstrada(true)
      setTela({ t: "chegada" })
    }
  }

  // (disco) o buraco de minhoca acabou: a Kombi cai no deserto, perto da casa
  const fimMinhoca = () => {
    setMinhoca(false)
    setRastroMinhoca(true)
    setTimeout(() => setRastroMinhoca(false), 2700)
    // (T37, J1/J2: 4: "refletir o céu atual da hora") o céu da chegada é o da hora
    // de quem joga (CHEGADA.ceu; antes era sempre 16h30, de tarde)
    const hr = horaDaChegada(vivo.current.hora ?? saveRef.current.hora)
    const primeira = historiaDe(saveRef.current).fase === "minhoca"
    setSave((s) => ({ ...(primeira ? comHistoria(s, (h) => ({ ...h, fase: "casa" as const })) : s), hora: hr }))
    setSaltoHora({ h: hr, id: Date.now() })
    setEstrada(true)
    setTela({ t: "corrida", destino: null })
  }
  // (disco) a história avisa da estrada: chegou na casa, pousou na cidade…
  // (T09, só fora da produção) os testes chegam num lugar do chão sem dirigir até lá
  const onHistoriaTeste = useRef<(e: EventoHistoria) => void>(() => {})
  useEffect(() => {
    if (!atalhosLiberados()) return
    ;(window as unknown as { __cnChao?: (id: LugarChao) => void }).__cnChao = (id) => onHistoriaTeste.current(`chao:${id}`)
    // (T27) forçar a quebra da Kombi (teste): sem sorteio
    ;(window as unknown as { __cnQuebrar?: () => void }).__cnQuebrar = () => setSave((s) => comHistoria(s, quebrar))
    // (T28) começar a perseguição da Kombi agora (teste): sem esperar o gatilho
    ;(window as unknown as { __cnPerseguir?: () => void }).__cnPerseguir = () => setSave((s) => comHistoria(s, perseguir))
  }, [])
  // (vitrine) o bar do subúrbio: a porta perto (o botão), a visita e a sinuca aberta
  const [portaBar, setPortaBar] = useState(false)
  const [sinucaBar, setSinucaBar] = useState(false)
  // (música contínua, 03/11) missão, peça ou cena começou no meio da faixa: o
  // instrumental da MESMA faixa no MESMO ponto (crossfade); terminou, volta a
  // completa se ela ainda não acabou. Nada disso pausa a faixa
  // (trilha sonora, 05/11) as peças, a letra e o basquete também (antes cortavam a música)
  const momentoMissao = !!cena || pingpong || !!trincheiras || !!provaMissao || !!oficinaTela || sinucaBar || !!showAgora || !!cenaAgora || !!letraAgora || !!basquete
  // (começo novo, 05/11) cena/peça/sala aberta: a rádio troca de faixa sem chiado e sem vinheta
  const somDeCena = momentoMissao || !!cinema || emSala
  useEffect(() => { somCena.aberta = somDeCena }, [somDeCena])
  useEffect(() => () => { somCena.aberta = false }, [])
  useEffect(() => {
    if (!momentoMissao) return
    pistaSom.missao(true)
    return () => pistaSom.missao(false)
  }, [momentoMissao])
  const entrarNoBar = () => {
    if (cena || cinema) return
    setPortaBar(false)
    setAoVivo(null)
    setCinema("lugar")
    setCena({ lugar: "bar", missao: "copo", pegar: false, especial: "visita-bar" })
  }
  const fimVisita = () => {
    setCena(null)
    setCinema(null)
    barFechou.current = Date.now()
  }
  // (06/11) os lugares do chão que abrem uma experiência: a porta perto e a página aberta
  const [portaChao, setPortaChao] = useState<LugarAberto | null>(null)
  const portaChaoT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [janelaChao, setJanelaChao] = useState<{ app: AppDef; rota: string } | null>(null)
  // entrou num app do celular pelo mundo (a loja, o jardim): o "voltar" volta pra estrada
  const doMundo = useRef(false)
  const [lojaAba, setLojaAba] = useState<Categoria>("disco")
  const voltarDoApp = () => { setTela(doMundo.current ? { t: "corrida", destino: null } : { t: "home" }); doMundo.current = false; setLojaAba("disco") }
  // saiu do app por outro caminho (home, outra tela): o "voltar" não leva mais pra estrada
  useEffect(() => { if (tela.t !== "app") doMundo.current = false }, [tela.t])
  const fecharJanelaChao = useCallback(() => { setJanelaChao(null); barFechou.current = Date.now() }, [])
  const trancaChao = (id: LugarAberto): string | null => {
    const E = ENTRADAS[id]
    return "porta" in E && E.porta ? pedidoDaPorta(hist13(saveRef.current), E.porta, E.pra ?? "entrar") : null
  }
  const entrarNoChao = (id: LugarAberto) => {
    setPortaChao(null)
    if (cena || cinema) return
    const E = ENTRADAS[id] as (typeof ENTRADAS)[LugarAberto]
    const tranca = trancaChao(id)
    if (E.t === "basquete") {
      if (tranca) { avisar("QUADRA", tranca, CHAO_LUGARES.quadra.cor); return }
      if (pingpong || batidaMissao) return
      quadraLivreEm.current = Date.now()
      setBasquete((b) => b ?? { n: 1, pontos: 0, tempo: 60, livre: true })
      return
    }
    if (E.t === "app") {
      doMundo.current = true
      if ("aba" in E && E.aba) setLojaAba(E.aba)
      abrirApp(E.app)
      return
    }
    setAoVivo(null)
    const c = CHAO_LUGARES[id]
    setJanelaChao({ app: { id: E.icone, nome: c.nome, cor: c.cor, rota: E.rota, pagina: 0, desc: E.nome }, rota: `${E.rota}${tranca ? `?${PARAM_TRANCA}=${encodeURIComponent(tranca)}` : ""}` })
  }
  const fimVisitaBar = () => {
    setCena(null)
    setCinema(null)
    barFechou.current = Date.now()
    setSinucaBar(true)
  }
  const onHistoria = (e: EventoHistoria) => {
    const h = historiaDe(saveRef.current)
    // (T37) a chegada de um login acabou na porta: a D-Bee acenou, o jogo segue dali
    if (e === "chegou") setChegadaLogin(false)
    // (T49, lote D) o login chega na casa da D-Bee: com instrumento novo, entra e toca
    if (e === "chegou" && h.fase === "carreira" && !cena && instrumentosNovos(hist13(saveRef.current)).length) setTimeout(() => abrirCasaInstrumentosRef.current(), 400)
    if (e === "casa" && h.fase === "casa" && !cena) {
      setCinema("lugar")
      setCena({ lugar: "casa-dbee", missao: "ojala", pegar: false, especial: "disco-casa" })
    }
    if (e === "cidade" && h.fase === "dunas") {
      // (T02) a missão da D-Bee: a travessia era o jogo (o drift e o holo). A porta
      // abre (o holo e o violão) e a recompensa aparece; depois, o bar
      setSave((s) => comHistoria(s, (x) => ({ ...concluir(x, "dbee", "jogo"), fase: "bar" })))
      abrirPortaDe("dbee")
      // (RASCUNHO, B18) a D-Bee pelo rádio: o bar é no subúrbio, embaixo das pistas
      setTimeout(() => setFalaIntro({ id: Date.now(), de: "D-Bee", texto: "chegou. o bar é aí embaixo: o letreiro laranja. alguém te espera" }), 1500)
    }
    // (B18) o subúrbio no chão: o bar (missão 1), a oficina (missão 2), o palco
    // (T47, lote D) a porta da torre: o elevador de terror (passeio livre)
    // (vitrine, 02/11) em toda fase depois da chegada (antes só na carreira e na cidade livre)
    if (e === "chao:torre" && h.fase !== "minhoca" && !cena && !recompensa && !trincheiras) abrirElevadorRef.current()
    if (e === "chao:bar" && h.fase === "bar" && !cena) { setAoVivo(null); setCinema("lugar"); setCena({ lugar: "bar", missao: "copo", pegar: false, especial: "disco-bar" }) }
    if (e === "chao:oficina" && h.fase === "nectar" && h.nectar === "oficina" && !cena) { setAoVivo(null); setCinema("lugar"); setCena({ lugar: "oficina", missao: "nectar", pegar: false, especial: "disco-oficina" }) }
    // (T09) a missão da oficina: cada chegada abre o passo de agora
    if (h.fase === "oficina" && !cena && !oficinaTela && e.startsWith("chao:")) {
      const p = passoOficina(h)
      if (e === "chao:oficina" && p === "chegar") { setAoVivo(null); setCinema("lugar"); setCena({ lugar: "oficina", missao: "nectar", pegar: false, especial: "disco-oficina" }) }
      else if (e === "chao:oficina" && p === "reciclar") setOficinaTela("bancada")
      else if (e === "chao:oficina" && p === "montar") setOficinaTela("pagar")
      // (T57) pegou uma peça no lixão (passando, sem parar): com as quatro, de volta pra oficina
      else if (p === "catar" && ehPeca(e.slice(5)) && pecasFaltando(h).includes(e.slice(5) as never)) {
        const id = e.slice(5), it = lixoDe(id)!
        const falta = pecasFaltando(h).length - 1
        setSave((s) => comHistoria(s, (x) => ({ ...x, oficina: { ...(x.oficina ?? {}), pecas: [...new Set([...(x.oficina?.pecas ?? []), id])], ...(id === "painel" ? { painel: true as const } : {}) } })))
        moeda()
        setFalaIntro({ id: Date.now(), de: MECANICO.nome, texto: falta ? `${it.nome}: ${FALAS_OFICINA.pegou} (${LIXO.length - falta}/${LIXO.length})` : FALAS_OFICINA.catou })
        track("mission_step", { mission_id: "disco-oficina", step: `peca-${id}`, perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
      }
      else if (e === "chao:goteira" && p === "goteira") setOficinaTela("goteira")
    }
    // (T27) o sorteio da Kombi quebrar (o Corrida chama de tempos em tempos, rodando de verdade)
    if (e === "sorteio-quebra" && !cena && !oficinaTela && !recompensa) {
      const r = sortearQuebra(h, Math.random())
      if (r.h !== h) setSave((s) => comHistoria(s, () => r.h))
    }
    // (T28) o gatilho da perseguição: a fama e o movimento passaram do ponto e o jogador
    // rodou um tempo de verdade (o Corrida avisa). Uma vez só
    if (e === "perseguicao" && !cena && !oficinaTela && !recompensa && podePerseguir(h, saveRef.current.popularidade ?? 0)) setSave((s) => comHistoria(s, perseguir))
    // (T27) a Kombi quebrada espera na oficina: chegou lá, o mecânico cobra o conserto (em água)
    if (e === "chao:oficina" && quebrada(h) && !cena && !oficinaTela) { setAoVivo(null); setOficinaTela("conserto") }
    // (T02) o chão do subúrbio (a quadra, os túneis): chegou no lugar da missão pegada
    if (e.startsWith("chao:") && h.fase === "carreira") {
      const m = missaoDoSave(saveRef.current)
      if (m && alvo13(hist13(saveRef.current), m)?.chao === e.slice(5)) chegouNaMissao(m)
      // (T57) desceu a rampa da boca do túnel (sem a missão dos túneis): as trincheiras, pra passear
      else if (e === "chao:tuneis" && !cena && !recompensa && !trincheiras) descerTrincheiras(null)
      // (T10) a quadra livre agora é pelo botão "entrar · a quadra" (abaixo, os lugares abertos)
    }
    // (notas 04/11) chegou na casa da D-Bee (no deserto), sem missão lá: com
    // instrumento novo, ela pede pra tocar. Só aqui; nunca no meio da cidade
    if (e === "chao:casa" && (h.fase === "carreira" || h.fase === "livre") && !cena && !recompensa && !trincheiras && !chegadaLogin) {
      const m = missaoDoSave(saveRef.current)
      const daMissao = m && alvo13(hist13(saveRef.current), m)?.chao === "casa"
      if (!daMissao && instrumentosNovos(hist13(saveRef.current)).length) abrirCasaInstrumentosRef.current()
    }
    // (vitrine, 02/11) a boca do túnel leva pra dentro SEMPRE: antes só valia na
    // carreira (no começo e na cidade livre a rampa não fazia nada). Fora da
    // carreira desce pra passear; a corrida mostra o cadeado se ainda não abriu
    if (e === "chao:tuneis" && h.fase !== "carreira" && h.fase !== "minhoca" && !cena && !recompensa && !trincheiras) descerTrincheiras(null)
    // (vitrine) o bar do subúrbio depois do prólogo: a porta aberta (o botão "entrar"), a sinuca no fundo
    if (e === "chao:bar" && h.fase !== "bar" && !cena && !recompensa && !trincheiras && Date.now() - barFechou.current > 8000) {
      setPortaBar(true)
      setTimeout(() => setPortaBar(false), 8000)
    }
    // (06/11) os lugares do chão que abrem uma experiência (disco/abertos.ts): o
    // botão "entrar", como o bar. Quando é o lugar da missão de agora, a missão manda
    const idA = e.startsWith("chao:") ? e.slice(5) : ""
    if (ehAberto(idA) && idA !== alvoChao && h.fase !== "minhoca" && !cena && !recompensa && !trincheiras && !janelaChao && Date.now() - barFechou.current > 8000) {
      setPortaChao(idA)
      clearTimeout(portaChaoT.current)
      portaChaoT.current = setTimeout(() => setPortaChao(null), 8000)
    }
    // (B18) subiu pra cidade (pousou numa pista): a carreira (a Nectar acesa)
    if (e === "subiu" && h.fase === "subir") {
      setSave((s) => comHistoria(s, (x) => ({ ...x, fase: "carreira" })))
      setTimeout(() => setFalaIntro({ id: Date.now(), de: "222 FM", texto: "uma kombi velha subiu do subúrbio. voando. alguém viu isso?" }), 1500)
    }
    // (27/10) a D-Bee deu o drone (nas dunas): a subida mostrada não se repete
    if (e === "drone") setSave((s) => comHistoria(s, (x) => ({ ...x, drone: true })))
    // (a Nectar, B9) a Kombi quebrou → regar 3 flores de patins → o galão → a oficina → o show → o jardim
    if (e === "quebrou" && h.fase === "nectar") setSave((s) => comHistoria(s, (x) => ({ ...x, nectar: "regar", floresIni: x.flores ?? 0 })))
    if (e === "flor") eventoDaRua("flor")
    if (e === "flor") {
      const flores = (h.flores ?? 0) + 1
      if (h.fase === "nectar" && h.nectar === "regar" && flores - (h.floresIni ?? 0) >= 3) {
        setSave((s) => comHistoria(s, (x) => ({ ...x, flores, nectar: "galao" })))
        setTimeout(() => setFalaIntro({ id: Date.now(), de: "222 FM", texto: "alguém deixou um galão no posto dessa pista. com um bilhete. sem nome" }), 1800)
      } else if (h.fase === "nectar" && (h.nectar === "flores" || h.nectar === "show") && flores - (h.floresIni ?? 0) >= 5) {
        // a Nectar feita: o objeto dela no save; Sexta-Feira e DopaminA acendem
        setSave((s) => comHistoria({ ...s, objetos: s.objetos.includes("nectar") ? s.objetos : [...s.objetos, "nectar"] }, (x) => ({ ...x, flores, nectar: "feita", fase: "carreira" })))
        setTimeout(() => setFalaIntro({ id: Date.now(), de: "222 FM", texto: "a pista das flores tá florindo. e duas pistas acenderam lá do outro lado. quem fez isso?" }), 1500)
      } else setSave((s) => comHistoria(s, (x) => ({ ...x, flores })))
    }
    if (e === "galao" && h.fase === "nectar" && h.nectar === "galao") setSave((s) => comHistoria(s, (x) => ({ ...x, nectar: "oficina" })))
  }
  onHistoriaTeste.current = onHistoria
  // (disco) saiu da casa da D-Bee com o holo: as dunas, com o disco antigo tocando
  const fimCasaDisco = () => {
    setCena(null)
    setCinema(null)
    // (T02) a arte da missão da D-Bee (o tambor, na cena) ficou feita
    // (T07) com o tutorial, o holo já vem com o mapa (o drone): é ele que ensina a subir
    setSave((s) => comHistoria(s, (h) => ({ ...concluir(h, "dbee", "arte"), fase: "dunas", holo: true, ...(CONFIG_TUTORIAL.ligado ? { drone: true } : {}) })))
    // (T09, J2: 18) a D-Bee dá a água dela (não precisa): é o que paga o mecânico
    setSave((s) => (historiaDe(s).aguaDbee ? s : comHistoria(ganhar(s, OFICINA_CFG.aguaDaDbee, "agua"), (h) => ({ ...h, aguaDbee: true }))))
    setTimeout(() => avisar(`+${OFICINA_CFG.aguaDaDbee} de água`, `D-Bee: ${FALAS_OFICINA.dbeeAgua}`, "#4fc3ff"), 1200)
    fonteSom.set("disco")
    disco.tocarLista(ACERVO.faixas.map((f) => f.src))
  }

  // (T49, lote D) a volta na casa da D-Bee: os instrumentos ganhos no banco. Com
  // novo, a cena pede pra tocar cada novo; sem novo, a visita livre. No fim, todos ficam vistos
  const casaNovos = useRef(false)
  const abrirCasaInstrumentos = () => {
    if (cena || cinema) return
    casaNovos.current = instrumentosNovos(hist13(saveRef.current)).length > 0
    setAoVivo(null)
    setCinema("lugar")
    setCena({ lugar: "casa-dbee", missao: "ojala", pegar: false, especial: "dbee-instrumentos" })
    track("mission_step", { mission_id: "disco-instrumentos", step: "casa", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
  }
  const abrirCasaInstrumentosRef = useRef(abrirCasaInstrumentos)
  useEffect(() => { abrirCasaInstrumentosRef.current = abrirCasaInstrumentos })
  const fimCasaInstrumentos = () => {
    setCena(null)
    setCinema(null)
    barFechou.current = Date.now()
    setSave((s) => comHistoria(s, (h) => ({ ...h, instrumentosVistos: instrumentosGanhos(h) })))
  }

  const abrirChat = (id: ChatId, volta: Volta = { t: "home" }, estacaoAqui = false) => {
    setNaEstacao(estacaoAqui)
    const e = ESTACOES.find((x) => x.id === id)
    if (e) {
      // uma missão de cada vez, na ordem do fio: só abre a conversa de quem
      // já te chamou
      const a = ativa(save, nivel)
      const conhece = save.objetos.includes(e.id) || save.pausas[e.id] !== undefined || a === e.id
      if (!conhece) {
        const m = missao(e, nivel)
        const agora = a ? getEstacao(a) : null
        avisar(
          `estação ${e.n}`,
          !m.ok && m.motivo === "data" && e.lancamento
            ? `no escuro até ${dataCurta(e.lancamento)}`
            : agora ? `ainda n é a vez daqui. quem te chama agora é ${agora.personagem}` : "ainda ninguém acordou aqui",
          e.cor,
        )
        return
      }
      if (!save.completos.includes(id) && save.pausas[id] === undefined) track("mission_started", { mission_id: `linha-${id}`, place_id: "linha-222" })
    }
    // se essa conversa tava no painel da Kombi, ela sobe pro celular inteira
    if (aoVivo === id) setAoVivo(null)
    setTela({ t: "chat", id: id as ChatRoteiro, volta })
  }

  // (vitrine) o aviso do app aberto ainda trancado (a loja, o fliperama)
  const [trancaApp, setTrancaApp] = useState<string | null>(null)
  const abrirApp = (id: AppId) => {
    const a = APPS.find((x) => x.id === id)!
    setTrancaApp(null)
    if (a.nivel !== undefined && nivel < a.nivel) {
      avisar(a.nome, `abre no nível ${NIVEIS[a.nivel].nome}`, a.cor)
      return
    }
    // (T16, T18, T23) no jogo com história, o lugar que a porta de uma missão abre
    // fica trancado até ela (portas.ts, CONFIG13.trancar): a loja, as frequências, o fliperama
    if (HIST) {
      const porta = ({ loja: "loja-discos", radio: "radio-frequencias", freq: "radio-frequencias", sintonia: "radio-frequencias", fliperama: "fliperama" } as Partial<Record<AppId, PortaId>>)[id]
      // (vitrine, 02/11) trancado abre do mesmo jeito: a loja e o fliperama mostram
      // o que tem, com o cadeado e o que libera; o FR3Q_ (as prévias) abre e avisa.
      // Só a SINT0NIA (trocar de frequência) segue fechada até a porta
      const msg = porta ? pedidoDaPorta(hist13(saveRef.current), porta, id === "loja" ? "comprar" : id === "fliperama" ? "jogar" : "sintonizar") : null
      setTrancaApp(msg)
      if (msg) { avisar(a.nome, msg, a.cor); if (id === "sintonia") return }
    }
    // recurso de missão: abre com o objeto daquela estação
    // (o violão vem da D-Bee, no fim da leitura NECTAR)
    if (a.precisa && !(a.id === "violao" ? save.violao : save.objetos.includes(a.precisa))) {
      const e = getEstacao(a.precisa)
      // (vitrine, parte 2) o violão e o jardim abrem do mesmo jeito: dá pra ver, com o aviso do que libera
      const h = hist13(saveRef.current)
      const dona = a.id === "violao" ? "dbee" as const : donaDaFaixa(a.precisa)
      const msg = HIST
        ? (a.id === "violao" && feita13(h, "dbee") ? "o violão ficou no metrô · a guitarra está na loja" : dona ? facaMissao(dona, a.id === "violao" ? "tocar" : "regar") : "abre com uma missão da cidade")
        : save.objetos.length || save.pausas[a.precisa] !== undefined ? `abre quando ${e.personagem} te der ${e.objetoNome}` : "abre com uma missão da cidade"
      avisar(a.nome, msg, a.cor)
      if (a.id === "violao" || a.id === "jardim") { setTrancaApp(msg); setTela({ t: "app", id }); return }
      return
    }
    if (id === "violao") setSave((s) => ({ ...s, jogados: { ...s.jogados, violao: 1 } }))
    // (T02, J2: 23, 26) no disco, o GUITAR DRIVER é aberto desde o começo: cantar
    // na rua, com as músicas que as missões já liberaram (a cápsula do tempo do
    // fim, B13, segue guardando os shows)
    if (D && id === "guitar") {
      if (guitarLivre(saveRef.current)) guardarCapsula(saveRef.current)
      setRua(true)
      return
    }
    // (disco, LU2CA 21/10) o app RÁDIO 222 e o [UNTITLED] morreram: quem chegar
    // neles por outro caminho cai no FR3Q_ (a rádio mora no holograma do holo)
    if (D && (id === "radio" || id === "untitled")) { setVisor("freq"); return }
    // (disco) os de fora abrem no visualizador do holo (a página não sai)
    if (D && id in VISOR) { setVisor(id as VisorId); return }
    if (a.link) {
      track("external_link_click", { destination: a.link.includes("instagram") ? "instagram" : a.link.includes("untitled") ? "untitled" : "other", place_id: "linha-home" })
      window.open(`${a.link}${a.link.includes("?") ? "&" : "?"}utm_source=cidade-neon&utm_medium=game&utm_campaign=linha-222`, "_blank")
      return
    }
    if (id === "kombi") return setTela({ t: "corrida", destino: null })
    if (id === "fliperama") setSave((s) => ({ ...s, jogados: { ...s.jogados, visto: 1 } }))
    setTela({ t: "app", id })
  }

  const onChamado = (c: Chamado) => {
    if ("chat" in c.acao) abrirChat(c.acao.chat)
    else abrirApp(c.acao.app)
  }

  // a conversa do painel precisou do celular: sobe em tela cheia (e, quando
  // acabar ou pausar, volta pra estrada)
  const painelPraTela = useCallback(() => {
    setAoVivo((id) => {
      if (id) setTela({ t: "chat", id, volta: { t: "corrida", destino: null } })
      return null
    })
  }, [])
  const adiarPainel = useCallback(() => {
    setAoVivo((id) => {
      if (id) setAdiadas((a) => (a.includes(id) ? a : [...a, id]))
      return null
    })
  }, [])
  const fimPainel = useCallback((para: Destino) => {
    const id = aoVivo
    setAoVivo(null)
    if (id && ESTACOES.some((e) => e.id === id) && para !== "estrada") track("mission_completed", { mission_id: `linha-${id}`, duration_ms: 0 })
    // na estrada, o fim (ou o pedido aceito) só fecha o painel: quem vem
    // depois chama de novo por aqui mesmo
  }, [aoVivo])

  const fimChat = (id: ChatId, para: Destino, volta: Volta) => {
    // acabou a conversa com a D-Bee: a cor volta e a Kombi é sua
    if (id === "abertura") {
      setCinema(null)
      setCinza(false)
      // a D-Bee te soltou na cidade: já mostra quem precisa de você
      setTimeout(() => setPainelMissoes(true), 1800)
    }
    // leu o grupo na chegada: volta pra Kombi (a D-Bee liga daqui a pouco)
    if (id === "grupo" && !save.completos.includes("abertura")) return setTela({ t: "corrida", destino: null })
    // pausa: a conversa pediu uma coisa que está no mapa
    // "pegar a kombi" JÁ é aceitar a missão: vai direto, e o som que tava
    // tocando (o vinil) segue sem cortar
    if (para === "estrada") {
      return setTela({ t: "corrida", destino: null })
    }
    if (ESTACOES.some((e) => e.id === id)) track("mission_completed", { mission_id: `linha-${id}`, duration_ms: 0 })
    // o fim da linha: quando as seis missões estão feitas (não mais ao fechar
    // a do LU2CA, que agora é a primeira)
    const feitos = new Set([...saveRef.current.objetos, ...(ESTACOES.some((e) => e.id === id) ? [id as EstacaoId] : [])])
    if (ESTACOES.some((e) => e.id === id) && feitos.size >= 6) setTela({ t: "final" })
    // o grupo acabou: a D-Bee chama no privado
    else if (para === "abertura") setTela({ t: "chat", id: "abertura", volta })
    else if (para === "missao") {
      // a próxima pessoa do fio te chama na estrada: volta pra Kombi e a
      // conversa chega no painel (dirigindo). Sem Kombi ainda: abre a conversa
      const a = ativa(save, nivel)
      if (a && save.estacao) setTela({ t: "corrida", destino: null })
      else if (a) setTela({ t: "chat", id: a as ChatRoteiro, volta: { t: "home" } })
      else setTela({ t: "home" })
    }
    else if (para === "grupo") setTela({ t: "chat", id: "grupo", volta: { t: "home" } })
    else setTela(volta)
  }

  const descer = (id: EstacaoId, st: Stats) => {
    void st
    // a conversa abre por cima; fechando, volta pra estrada
    abrirChat(id, { t: "corrida", destino: null }, true)
  }

  // o ícone do celular: pega o celular (a estrada pausa por baixo)
  const sairDaCorrida = () => setTela({ t: "home" })

  const alternarSom = () => {
    const m = !semSom
    setSemSom(m)
    mudo(m)
  }

  // (leveza B) as props do <Corrida>: funções fixas e objetos que só mudam quando o conteúdo muda
  const cOnHistoria = useFixo(onHistoria)
  const cOnComprar = useFixo((id: Parameters<typeof comprarMelhoria>[1]) => setSave((s) => { const r = comprarMelhoria(s, id); return r.ok ? r.save : s }))
  const cOnAbertura = useFixo(() => { setCinema("lugar"); setCena({ lugar: "casa-dbee", missao: "ojala", pegar: false, inicio: true }) })
  const cOnArea = useFixo((id: string) => { if (id === "circuito:linha" && emTutorial(saveRef.current)) marcarTut("tanque") })
  const cOnDica = useFixo((d: string) => setSave((s) => (s.dicas.includes(d) ? s : { ...s, dicas: [...s.dicas, d] })))
  const cOnApreendido = useFixo(apreender)
  const cOnReligar = useFixo(religar)
  const cOnPosto = useFixo(() => abrirPostoRef.current())
  const cOnRegar = useFixo(regouCanteiro)
  const cOnMontanha = useFixo((n: number) => { setSave((s) => ganhar(s, n)); if (n >= 2) eventoDaRua("montanha") })
  const cOnAbastecer = useFixo((o: "tanque" | "galao" | "despejar"): boolean => {
    const s0 = comVivo(saveRef.current)
    // de patins (a gasolina acabou): o galão vai direto no tanque; se já tinha um cheio, só despeja
    if (o === "despejar") {
      const tinha = s0.galao === "cheio"
      if (!tinha && (s0.neon ?? 0) < PRECO_GALAO) return false
      setSave((s) => ({ ...s, neon: (s.neon ?? 0) - (tinha ? 0 : PRECO_GALAO), galao: "vazio", tanque: Math.min(1, (comVivo(s).tanque ?? 0) + GALAO) }))
      return true
    }
    if (o === "tanque" ? (s0.neon ?? 0) < PRECO_TANQUE || (s0.tanque ?? 1) > 0.97 : (s0.neon ?? 0) < PRECO_GALAO || s0.galao !== "vazio") return false
    if (o === "tanque") encherTanque(); else encherGalao()
    return true
  })
  const cOnApp = useFixo(abrirApp)
  const cOnMissoes = useFixo(() => setPainelMissoes(true))
  const cOnFuga = useFixo((n: number) => setSave((s) => ({ ...s, popularidade: Math.min(100, (s.popularidade ?? 0) + n) })))
  const cOnRacha = useFixo((r: Parameters<typeof registrarRacha>[1]) => setSave((s) => registrarRacha(s, r)))
  // (05/11) a corrida de rua do subúrbio: o melhor tempo no save e, na primeira vitória, o neon$
  const cOnCorridaRua = useFixo((r: ResultadoRua) => setSave((s) => { const { placar, premio } = placarComCorrida(s.ruaSuburbio, r); return { ...ganhar(s, premio), ruaSuburbio: placar } }))
  const cOnPerseguicao = useFixo((...[e, id]: Parameters<NonNullable<ComponentProps<typeof CorridaTipo>["onPerseguicao"]>>) => {
    if (e === "jogada") setSave((s) => comHistoria(s, kombiJogada))
    else if (id) {
      setSave((s) => comHistoria(s, (h) => escolherVeiculo(h, id)))
      const v = veiculoPorId(id)
      if (v) setTimeout(() => setFalaIntro({ id: Date.now(), de: "222 FM", texto: v.nome }), 900)
    }
  })
  const cOnPegarAqui = useFixo(pegarAqui)
  const cOnMapaIcone = useFixo((id: string) => { const f = ehMissao13(id) ? MISSOES13[id].faixa : (id as PistaId); if (f) setFocoFeira(f) })
  const cOnPegar = useFixo((k: string) => setSave((s) => (s.itens.includes(k) ? s : { ...s, itens: [...s.itens, k] })))
  const cOnDescer = useFixo(descer)
  const cOnSair = useFixo(sairDaCorrida)
  const cOnVaga = useFixo(abrirCena)
  // (vitrine, parte 2) as salas da cidade fora da missão e a casa da D-Bee: visita livre
  const visitarSala = (id: LugarId) => {
    if (cena || cinema || recompensa || trincheiras) return
    if (id === "casa-dbee") { abrirCasaInstrumentosRef.current(); return }
    const base = cenaDe(id)
    if (!base) return
    setAoVivo(null)
    setCinema("lugar")
    setCena({ lugar: id, missao: base.missao, pegar: false, especial: "visita" })
  }
  const cOnVisitar = useFixo(visitarSala)
  const visitarSalaRef = useRef(visitarSala)
  useEffect(() => { visitarSalaRef.current = visitarSala })
  const cOnIlha = useFixo(() => {
    // o grupo rolando: abre a conversa inteira; depois disso, a
    // ilha abre o celular (como o ícone)
    if (introGrupo !== null) {
      setIntroGrupo(null)
      setTela({ t: "chat", id: "grupo", volta: { t: "corrida", destino: null } })
    } else sairDaCorrida()
  })
  const cOnVolta = useFixo((t: number) => setSave((s) => ({ ...s, melhorVolta: s.melhorVolta ? Math.min(s.melhorVolta, t) : t })))
  const cHistoria = useMesmo(D ? hist : null)
  const cTrancas = useMesmo(trancasCorrida)
  const cAlvo = useMesmo(HIST ? alvoDisco : save.nucleo.caido ? null : alvoTut ?? alvoDe(save, nivel))
  const cChecklistHolo = useMesmo(checklistHolo)
  const cMapaMissoes = useMesmo(mapaMissoes)
  const cMissaoHolo = useMesmo(HIST ? (objetivoDisco ? { texto: objetivoDisco, cor: "#e0ff4f", n: 1 } : null) : resumoMissao ? { texto: listaMissoes.length > 1 && !missaoAgora ? "" : resumoMissao.texto, cor: resumoMissao.cor, n: listaMissoes.length } : listaMissoes.length ? { texto: "", cor: "#ffc857", n: listaMissoes.length } : null)

  if (!pronto) return <div className="l-raiz" />

  // atalho de desenvolvimento: /linha?corrida=1 abre direto a estrada
  if (process.env.NODE_ENV !== "production" && corridaDev) {
    return (
      <div className="l-raiz">
        <div className="l-palco">
          <Corrida save={save} nivel={nivel} destino={null} onSinal={onSinal} onDescer={() => {}} onSair={() => {}} />
        </div>
      </div>
    )
  }

  // atalho de desenvolvimento: /linha?prova=regar mostra só a prova
  if (process.env.NODE_ENV !== "production" && provaDev) {
    const e = ESTACOES.find((x) => x.prova === provaDev)
    return (
      <div className="l-raiz">
        <div className="l-palco" onPointerDown={() => audioCtx()}>
          <div className="l-chat" style={{ ["--cor" as string]: e?.cor }}>
            <div className="l-chat-corpo">
              <Prova id={provaDev} cor={e?.cor ?? "#2fe8ff"} onFim={(p) => avisar("prova", p ? "pulou" : "feita ✓")} />
            </div>
          </div>
          {aviso && <div key={`aviso-${aviso.id}`} className="l-aviso" style={{ ["--cor" as string]: aviso.cor }}><b>{aviso.titulo}</b><span>{aviso.texto}</span></div>}
        </div>
      </div>
    )
  }

  const app = tela.t === "app" ? APPS.find((a) => a.id === tela.id)! : null
  // o celular aberto por cima da estrada: a Kombi segue sozinha, devagar
  const celularAberto = estrada && (tela.t === "home" || tela.t === "app" || tela.t === "chat")
  const corridaPausada = (tela.t !== "corrida" && tela.t !== "chegada" && !celularAberto) || !!visor || !!showAgora || !!jornal || pingpong || caderno || !!recompensa || rua || !!provaMissao || !!letraAgora || !!oficinaTela || !!trincheiras || sinucaBar || !!janelaChao

  // (disco) o óculos de realidade aumentada: a tela larga no desktop e o
  // celular translúcido por cima da cidade (LU2CA 19/10)
  const ar = qualMapa() === "disco"
  return (
    <div className={`l-raiz ${ar ? "is-ar" : ""}`}>
      <div className="l-palco">
        {/* camada de baixo: a estrada (pausa quando o celular está aberto) */}
        {(estrada || tela.t === "corrida") && !emSala && (
          <RelogioVivo hora={save.hora ?? 18} ouvinteRef={ouvinteHora}>{(horaTela) => (
          <Corrida
            save={save}
            nivel={nivel}
            destino={tela.t === "corrida" ? tela.destino : destinoEstrada}
            pausado={corridaPausada}
            celular={celularAberto}
            retomar={voltaDaSala}
            teleporte={teleporte}
            abertura={!D && !save.casa}
            historia={cHistoria}
            chegada={D && chegadaLogin}
            trancas={cTrancas}
            noConserto={noConserto}
            quebrou={kombiQuebrou}
            sorteioMs={HIST && CONFIG_QUEBRA.ligada && !cena && !oficinaTela ? CONFIG_QUEBRA.cadaMs : 0}
            alvoChao={alvoChao}
            pistaFoco={focoFeira}
            onHistoria={cOnHistoria}
            // (B10, T03) a oficina: o mecânico é pago em água, só desempenho (o preço vem da economia)
            onComprar={cOnComprar}
            onAbertura={cOnAbertura}
            onArea={cOnArea}
            limitado={!!invasao}
            cacado={cacado || perseguido}
            conversa={!!aoVivo}
            onBifurca={setBifurcando}
            dicas={save.dicas}
            onDica={cOnDica}
            onApreendido={cOnApreendido}
            caido={save.nucleo.caido}
            onReligar={cOnReligar}
            onSinal={onSinal}
            alvo={cAlvo}
            levando={levarDrewboy(save) ? "copo" : null}
            tanque={save.tanque ?? 1}
            onTanque={onTanque}
            onPosto={cOnPosto}
            hora={horaTela}
            onHora={onHora}
            dia={save.dia ?? 1}
            saltoHora={saltoHora}
            regadas={regadasHoje}
            onRegar={cOnRegar}
            onMontanha={cOnMontanha}
            onAbastecer={cOnAbastecer}
            postoAberto={!!noPosto}
            atalho={atalhoTeste}
            onApp={cOnApp}
            onMissoes={cOnMissoes}
            agua={save.agua ?? 0}
            onFuga={cOnFuga}
            onRacha={cOnRacha}
            onCorridaRua={cOnCorridaRua}
            perseguicao={perseguicaoAgora}
            esperaPolicia={podeVirPolicia && !cena && !oficinaTela ? CONFIG_PERSEGUICAO.esperaMs : 0}
            semKombi={semKombi}
            veiculo={veiculoAgora}
            onPerseguicao={cOnPerseguicao}
            onAgua={onAgua}
            checklistHolo={cChecklistHolo}
            mapaMissoes={cMapaMissoes}
            mapaPainel={mapaPainel}
            onMapaIcone={cOnMapaIcone}
            onPegarAqui={cOnPegarAqui}
            missaoHolo={cMissaoHolo}
            onPegar={cOnPegar}
            avisos={chamados(save, nivel).filter((c) => c.id === "ecos" || c.id === "antena" || c.id.startsWith("est-")).length}
            onDescer={cOnDescer}
            onSair={cOnSair}
            onVaga={cOnVaga}
            onVisitar={HIST && hist.fase === "carreira" && !chegadaLogin && !minhoca ? cOnVisitar : undefined}
            segredo={segredo}
            // (B18) as cenas do chão do subúrbio não puxam a câmera pra fachada da pista
            cenaLugar={cena && cena.especial !== "disco-oficina" && cena.especial !== "visita-bar" && !(cena.especial === "disco-bar" && hist.fase === "bar") ? cena.lugar : null}
            // (disco, a história) a cidade quieta: só quem a história põe pra falar
            intro={HIST || (!D && !save.completos.includes("abertura"))}
            fala={falaIntro}
            onIlha={cOnIlha}
            onVolta={cOnVolta}
            cinema={cinema}
            cinza={cinza}
            noiteRepete={save.objetos.includes("copo") ? 0 : (save.loops?.bar ?? 0)}
            foraDoAr={apagao}
          />
          )}</RelogioVivo>
        )}
        {/* O RELÓGIO (13/10): de dia dá pra cochilar até a noite; de noite e
            na madrugada, dormir na Kombi (o dia seguinte começa às 8h) */}
        {tela.t === "corrida" && !emSala && !cinema && !ligacao && save.casa && (
          ehDia(save.hora ?? 18)
            ? <button type="button" className="l-dormir" onClick={() => pularPara(19)}>cochilar até a noite</button>
            : (save.hora ?? 18) >= 19 || (save.hora ?? 18) < 8
              ? <button type="button" className="l-dormir" onClick={() => pularPara(8)}>dormir na kombi</button>
              : null
        )}
        {/* AS MISSÕES NUMA CAIXA SÓ (LU2CA, 05/10): no canto, o que fazer agora
            e a bolinha com quantas estão abertas; tocando, a atual (ou a
            checklist do tutorial) e as disponíveis */}
        {tela.t === "corrida" && !emSala && !cinema && !painelMissoes && resumoMissao && !HIST && (
          <button type="button" className="l-caixa-missao" style={{ ["--cor" as string]: resumoMissao.cor }} onClick={() => setPainelMissoes(true)}>
            <small>{resumoMissao.rotulo}</small>
            <b>{resumoMissao.texto}</b>
            {listaMissoes.length > 0 && <em aria-label={`${listaMissoes.length} missões`}>{listaMissoes.length}</em>}
          </button>
        )}
        {/* (B19) no disco, o painel das missões é a checklist da missão de agora */}
        {painelMissoes && HIST && tela.t === "corrida" && !emSala && (
          <div className="l-missoes is-disco" role="dialog" aria-label="Missão">
            <header><b>missão</b><button type="button" onClick={() => setPainelMissoes(false)} aria-label="Fechar">×</button></header>
            {painelMissao13 ?? (feira.length ? null : (
              <section className="l-missoes-agora" style={{ ["--cor" as string]: "#e0ff4f" }}>
                <small>agora</small>
                <p>{objetivoDisco ?? "o mapa está aberto: explora"}</p>
              </section>
            ))}
            {!m13 && feira.length > 0 && <small className="l-missoes-sub">a cidade precisa</small>}
            {!m13 && feira.length > 0 && <FeiraOfertas ofertas={feira} onPegar={(id) => { pegarMissao(id); setPainelMissoes(false) }} />}
            {ruaBotoes}
          </div>
        )}
        {/* (22/10) a feira saiu da tela: mora no mapa (o anel e o mapa abrem a mesma tela) */}
        {painelMissoes && !HIST && !ligacao && tela.t === "corrida" && !emSala && (
          <div className="l-missoes" role="dialog" aria-label="Missões">
            <header><b>missões</b><button type="button" onClick={() => setPainelMissoes(false)} aria-label="Fechar">×</button></header>
            {tut ? (
              <section className="l-missoes-agora">
                <small>{BLOCOS[Math.min(blocoTut, BLOCOS.length - 1)].titulo}</small>
                <ul className="l-missoes-check">
                  {BLOCOS[Math.min(blocoTut, BLOCOS.length - 1)].itens.map((i) => (
                    <li key={i} className={feito(save, i) ? "is-ok" : ""}><i aria-hidden="true">{feito(save, i) ? "✓" : ""}</i>{ITENS[i].texto}</li>
                  ))}
                </ul>
              </section>
            ) : missaoAgora ? (
              <section className="l-missoes-agora" style={{ ["--cor" as string]: getEstacao(missaoAgora.id).cor }}>
                <small>agora · {getEstacao(missaoAgora.id).personagem}</small>
                <p>{missaoAgora.texto}</p>
              </section>
            ) : null}
            {listaMissoes.length > 0 && <small className="l-missoes-sub">disponíveis</small>}
            <ul>
              {listaMissoes.map((m) => {
                const e = getEstacao(m.id)
                return (
                  <li key={m.id} style={{ ["--cor" as string]: e.cor }}>
                    <span className="l-missoes-quem">{e.personagem}<small>{m.etapa === "chamado" ? "quer falar com você" : m.etapa === "busca" ? "buscar no mapa" : m.etapa === "pegar" ? "buscar alguém" : "te espera"}</small></span>
                    <p>{m.texto}</p>
                    {save.foco === m.id ? <em className="l-missoes-sel">selecionada</em> : <button type="button" onClick={() => irAgora(m)}>aceitar</button>}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        {/* (T47, lote D) o elevador de terror: a sala própria; fecha no fim-gesto */}
        {noElevador && (
          <>
            <Interior key="sala:elevador" lugar="elevador" objetos={save.objetos} />
            {falaElevador && <div className="l-dica3d"><small>{falaElevador}</small></div>}
          </>
        )}
        {noPosto && (
          <>
            <Interior key="sala:posto" lugar="posto" objetos={save.objetos} />
            <PostoDentro
              primeira={noPosto.primeira}
              neon={save.neon ?? 0}
              tanque={save.tanque ?? 1}
              galao={save.galao}
              precoTanque={PRECO_TANQUE}
              precoGalao={PRECO_GALAO}
              onEncherTanque={encherTanque}
              onEncherGalao={encherGalao}
              onPresente={(n) => setSave((x) => ganhar(x, n))}
              onSair={sairDoPosto}
            />
          </>
        )}
        {tela.t === "chegada" && (
          <Chegada
            onParar={() => setCinema("parando")}
            onCinza={() => setCinza(true)}
            onAbrir={() => {
              setCinema(null)
              // a cor volta aqui: o cinza é só o susto da chegada
              setTimeout(() => setCinza(false), 2500)
              setTela({ t: "corrida", destino: null })
              if (!save.completos.includes("grupo") && jogoVelho()) setIntroGrupo(0)
            }}
          />
        )}
        {tela.t === "entrada" && (D ? <InicioDisco save={save} onEntrar={entrar} /> : <Entrada save={save} onEntrar={entrar} />)}
        {minhoca && <Minhoca onFim={fimMinhoca} dur={chegadaLogin ? CHEGADA.minhocaMsVolta : CHEGADA.minhocaMs} />}
        {rastroMinhoca && <Minhoca saida onFim={() => {}} />}
        {showAgora && <Show key={showAgora} faixa={showConf!.faixa} lugar={showConf!.lugar} palco={showConf!.palco} cor={showConf!.cor} popularidade={save.popularidade ?? 0} letra={hist.letras?.[showConf!.faixa]} onFim={fimShow} />}
        {/* (T19) a arte do LU2CA: escrever a letra (rascunho, disco/letras.ts); a estrofe vai pro show */}
        {letraAgora && <Letra conf={letraAgora.conf} cor={MISSOES13[letraAgora.missao].cor} quem={MISSOES13[letraAgora.missao].quem} onFim={(linhas: string[]) => {
          const l = letraAgora
          // a letra fica no save e, ainda no palco, a próxima peça segue direto na mesma
          // gravação (o show ao vivo: sem esperar o relógio, que num aparelho lento chega antes do save)
          setSave((s) => comHistoria(s, (x) => {
            const h = concluir({ ...x, aberta13: undefined, letras: { ...(x.letras ?? {}), [l.faixa]: linhas } }, l.missao, l.qual)
            const prox = pecaAgora13(h, l.missao)
            return prox?.peca.como?.t === "show" ? { ...h, show: `missao:${l.missao}` } : h
          }))
          barFechou.current = Date.now()
          track("mission_step", { mission_id: `disco-${l.missao}`, step: "letra", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
          // (sem show depois: a porta ou a próxima peça seguem pelo caminho de sempre)
          if (l.qual === "arte" && MISSOES13[l.missao].jogo.como?.t === "show") pecaAberta.current = { missao: l.missao, qual: "jogo" }
          else pecaFeitaNaMissao(l.missao, l.qual)
        }} />}
        {/* (T10) a arte da quadra: o Alohan apresenta o B4TIDA; entregou o instrumental, o basquete segue direto */}
        {batidaMissao && <BatidaMissao cor={MISSOES13[batidaMissao.missao].cor} quem={MISSOES13[batidaMissao.missao].quem} clima={batidaMissao.clima} onFim={() => {
          const b = batidaMissao
          setBatidaMissao(null)
          barFechou.current = Date.now()
          pecaAberta.current = null
          track("mission_step", { mission_id: `disco-${b.missao}`, step: "batida", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
          pecaFeitaNaMissao(b.missao, "arte")
        }} />}
        {/* (T10) o jogo da quadra: basquete. Fez os pontos, a peça fica feita; senão joga de novo. Depois da porta, a quadra é livre */}
        {basquete && (
          <div className="l-basquete" style={{ position: "absolute", inset: 0, zIndex: 74 }}>
            <div className="gi-raiz" style={{ position: "absolute" }}>
              <Basquete key={basquete.n} tempo={basquete.tempo} onFim={(pontos, cestas) => {
                const b = basquete
                barFechou.current = Date.now()
                if (b.livre) {
                  setBasquete(null)
                  setSave((s) => ({ ...ganhar(s, Math.floor(pontos / 6)), popularidade: Math.min(100, (s.popularidade ?? 0) + (pontos >= 12 ? 1 : 0)) }))
                  avisar("QUADRA", `${pontos} pontos · ${cestas} cestas`, "#ff6a35")
                  return
                }
                if (pontos < b.pontos) { setBasquete({ ...b, n: b.n + 1 }); avisar("QUADRA", `faz ${b.pontos} pontos pra passar · de novo`, "#ff6a35"); return }
                setBasquete(null)
                const p = pecaAberta.current
                pecaAberta.current = null
                if (p) pecaFeitaNaMissao(p.missao, p.qual)
              }} />
            </div>
          </div>
        )}
        {/* (T15–T25, T16) as peças das missões das pessoas (disco/pecas/): acabou, a próxima (ou a porta) segue sozinha */}
        {/* (T29) o final: a legenda de cada momento ou o filme da despedida, com o jogo atrás */}
        {finalAgora && <FinalTela inicio={finalAgora} onFim={fimFinal} />}
        {introMissao && <IntroMissao quem={introMissao.quem} texto={introMissao.texto} cor={MISSOES13[introMissao.id].cor}
          onBora={() => { const id = introMissao.id; introVista.current.add(id); setIntroMissao(null); setTimeout(() => chegouSemIntro.current(id), 0) }}
          onDepois={() => {
            // (começo novo, 05/11) "depois": no raio do lugar, o notch chama de volta
            const { id, quem } = introMissao
            INTRO_ADIADA.missao = id
            INTRO_ADIADA.texto = `a missão ${/^(Ella|Nizzy|D-Bee)$/.test(quem) ? "da" : "do"} ${quem} tá aqui · toca pra começar`
            INTRO_ADIADA.toque = () => { INTRO_ADIADA.missao = ""; INTRO_ADIADA.texto = ""; INTRO_ADIADA.toque = null; chegouRef.current(id) }
            setIntroMissao(null)
          }} />}
        {cenaAgora && <Peca key={`${cenaAgora.missao}:${cenaAgora.qual}`} id={cenaAgora.id} qual={cenaAgora.qual} cor={MISSOES13[cenaAgora.missao].cor} quem={MISSOES13[cenaAgora.missao].quem} onFim={(ok, obra) => {
          const c = cenaAgora
          setSave((s) => comHistoria(s, (x) => ({ ...x, aberta13: undefined, obras13: obra ? { ...(x.obras13 ?? {}), [`${c.missao}:${c.qual}`]: obra } : x.obras13 })))
          barFechou.current = Date.now()
          track("mission_step", { mission_id: `disco-${c.missao}`, step: c.id, perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
          if (ok) pecaFeitaNaMissao(c.missao, c.qual)
        }} />}
        {pingpong && <PingPong cor={MISSOES13[pecaAberta.current?.missao ?? "xeriff"].cor} onFim={(venceu) => {
          setPingpong(false)
          barFechou.current = Date.now()
          const p = pecaAberta.current
          pecaAberta.current = null
          if (venceu) {
            setSave((s) => ({ ...ganhar(s, 10), popularidade: Math.min(100, (s.popularidade ?? 0) + 3) }))
            if (p) pecaFeitaNaMissao(p.missao, p.qual)
          }
        }} />}
        {/* (T02) a peça de uma missão que é um minijogo do fliperama (sintonizar, respirar…) */}
        {provaMissao && (
          <div className="l-prova-missao" role="dialog" aria-label={`a missão de ${MISSOES13[provaMissao.missao].quem}`} onPointerDown={(e) => e.stopPropagation()}>
            <small>{MISSOES13[provaMissao.missao].quem} · {MISSOES13[provaMissao.missao][provaMissao.qual].nome}</small>
            <Prova id={provaMissao.id} cor={provaMissao.cor} onFim={() => {
              // (pular também vale: a prova tem o "pular, sem culpa" dela; nada trava)
              const p = provaMissao
              setProvaMissao(null)
              barFechou.current = Date.now()
              pecaFeitaNaMissao(p.missao, p.qual)
            }} />
          </div>
        )}
        {/* (T09) a missão da oficina: a bancada (a arte), o painel e a goteira (o jogo), o pagamento (a porta) */}
        {oficinaTela === "bancada" && <Montagem onFim={() => {
          setOficinaTela(null)
          setSave((s) => comHistoria(s, (h) => concluir(h, "oficina", "arte")))
          setTimeout(() => setFalaIntro({ id: Date.now(), de: MECANICO.nome, texto: FALAS_OFICINA.goteira }), 900)
          track("mission_step", { mission_id: "disco-oficina", step: "montagem", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
        }} />}
        {oficinaTela === "goteira" && <Goteira onFim={(gotas) => {
          setOficinaTela(null)
          setSave((s) => comHistoria(s, (h) => concluir({ ...h, oficina: { ...(h.oficina ?? {}), tanque: gotas } }, "oficina", "jogo")))
          setTimeout(() => setFalaIntro({ id: Date.now(), de: MECANICO.nome, texto: FALAS_OFICINA.voltar }), 900)
          track("mission_step", { mission_id: "disco-oficina", step: "goteira", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
        }} />}
        {oficinaTela === "conserto" && <Pagamento agua={save.agua ?? 0} preco={CONFIG_QUEBRA.precoAgua} titulo="o conserto" sub={`a Kombi quebrou · ${MECANICO.nome}`} fala={FALAS_QUEBRA.pagar} falaPago={FALAS_QUEBRA.pago} falaFiado={FALAS_QUEBRA.fiado} botao="pegar a Kombi →" onPago={(n) => setSave((s) => gastar(s, n, "agua") ?? s)} onFim={() => { setOficinaTela(null); setSave((s) => comHistoria(s, consertar)) }} />}
        {oficinaTela === "pagar" && <Pagamento agua={save.agua ?? 0} onPago={(n) => setSave((s) => gastar(s, n, "agua") ?? s)} onFim={montarMotor} />}
        {/* (T64, lote D) a fuga do metrô: no lugar do mundo (o canvas dele sai, emSala) */}
        {noMetro && <MetroFuga historia={h13} onPasso={fimMetroPasso} onSair={sairDoMetro} />}
        {/* (T64, lote D) o violão: o botão aparece com o disco, a rádio ou a faixa da rua tocando; sem o violão, com o cadeado e o que libera */}
        {D && tela.t === "corrida" && <ViolaoMundo temViolao={!!save.violao} tranca={HIST ? (feita13(h13, "dbee") ? "o violão ficou no metrô · a guitarra está na loja" : facaMissao("dbee", "tocar")) : null} escondido={emSala || !!cena || !!cinema || !!oficinaTela || !!trincheiras || !!recompensa || pingpong || !!provaMissao || !!showAgora || !!letraAgora || !!batidaMissao || !!basquete || !!cenaAgora || celularAberto || !!visor || !!jornal} />}
        {/* (T07, J1: 6) lá fora, o holo com destaque (o que é e como funciona); depois, o tutorial passo a passo */}
        {HIST && tela.t === "corrida" && !cena && !minhoca && faltaRecompensaHolo(hist) && <RecompensaHolo onSeguir={() => setSave((s) => comHistoria(s, (h) => ({ ...h, drone: true, tutorial: [...new Set([...(h.tutorial ?? []), "recompensa"])] })))} />}
        {/* (notas 03/11, 16:09) a trilha de pedras: o tutorial vivo, uma pedra por vez, presa na coisa real (disco/trilhaPedras.ts) */}
        {HIST && tela.t === "corrida" && <TrilhaPedras base={baseTrilha} pausado={!!cena || !!introMissao || !!trincheiras || !!recompensa || faltaRecompensaHolo(hist) || pingpong || !!provaMissao || !!showAgora || !!visor || celularAberto || !!jornal || rua || !!oficinaTela || !!letraAgora} onFeito={marcarTutorial} />}
        {/* (T02, J2: 23) a rua: o Guitar Driver aberto desde o começo, com as músicas que as missões liberaram */}
        {rua && <Palcos h={h13} onFechar={() => setRua(false)} onTocar={(palco, f) => { setRua(false); setSave((s) => comHistoria(s, (x) => ({ ...x, show: showDoPalco(palco, f) }))) }} onXenom={(id) => { setRua(false); setSave((s) => comHistoria(s, (x) => ({ ...x, show: showXenom(id) }))) }} />}
        {jornal && <Jornal m={jornal} cor={confShow(`rua:${jornal.missao}`)?.cor ?? "#ffc857"} onFechar={() => setJornal(null)} />}
        {ouvirFim && !jornal && tela.t === "corrida" && <OuvirFim key={ouvirFim.id} pista={ouvirFim.pista} quando={ouvirFim.id} onFechar={fecharOuvir} />}
        {visor && <Visor id={visor} onFechar={() => setVisor(null)}>{visor === "freq" ? <Freq save={save} /> : undefined}</Visor>}
        {/* (05/11, bíblia §7) a TV do holo: o vídeo da faixa no YouTube, num canto (só existe aberta) */}
        <TvHolo />
        {tela.t === "bloqueio" && <Bloqueio onAbrir={() => setTela({ t: "chat", id: save.completos.includes("grupo") ? "abertura" : "grupo", volta: { t: "home" } })} />}
        {(tela.t === "chat" || aoVivo) && (
          <Chat
            key={tela.t === "chat" ? tela.id : aoVivo!}
            id={tela.t === "chat" ? tela.id : aoVivo!}
            modo={tela.t === "chat" ? "tela" : "painel"}
            save={save}
            atualizar={atualizar}
            // (06/10, LU2CA: o dinheiro começa do zero — só missão completa
            // paga aqui; responder, ligar e provas não dão NEON)
            onXp={(n, motivo) => { if (motivo === "objeto" || motivo === "estação") setSave((s) => ({ ...s, neon: (s.neon ?? 0) + n })) }}
            onFim={tela.t === "chat" ? (para) => fimChat(tela.id, para, tela.volta) : fimPainel}
            onVoltar={tela.t === "chat" && dentro ? () => setTela(tela.volta) : undefined}
            onPrecisaTela={painelPraTela}
            onAdiar={tela.t === "chat" ? undefined : adiarPainel}
            onLoop={(v) => { setRotaLoop(v ? `/tiktok/feed?v=${v}` : undefined); abrirApp("loop") }}
            jeito="texto"
            naEstacao={tela.t === "chat" && naEstacao}
            oculto={(tela.t !== "chat" && tela.t !== "corrida") || (tela.t === "corrida" && bifurcando)}
          />
        )}
        {tela.t === "home" && (
          <Home
            save={save}
            nivel={nivel}
            onApp={abrirApp}
            onChamado={onChamado}
            radioTocando={radio}
            onRadioToggle={() => {
              if (radio?.tocando) return fonteSom.set("off")
              fonteSom.set("radio") // o disco para: os dois juntos não
              // (T40) fora das pistas a rádio não pega: ficou o disco
              if (fonteSom.get() === "radio") tocarRadio(D ? radioFreq.get() : (save.freq as FreqId) || "linha")
            }}
          />
        )}

        {tela.t === "app" && app?.rota && (
          <AppJanela app={app} rota={tela.id === "loop" ? rotaLoop : undefined} onFechar={() => { setRotaLoop(undefined); setTela({ t: "home" }); setTimeout(conferirLegado, 300) }} />
        )}
        {tela.t === "app" && tela.id === "n3xo" && (
          <N3xo save={save} nivel={nivel} onChat={(id) => abrirChat(id, { t: "app", id: "n3xo" })} onVoltar={() => setTela({ t: "home" })} />
        )}
        {tela.t === "app" && tela.id === "linha" && (
          <Mapa
            save={save}
            nivel={nivel}
            atualizar={atualizar}
            onVoltar={() => setTela({ t: "home" })}
            onGrupo={() => abrirChat("grupo", { t: "app", id: "linha" })}
            onViajar={(id) => { player.pausar(); setTela({ t: "corrida", destino: id }) }}
            onEstacao={(id) => abrirChat(id, { t: "app", id: "linha" })}
            onFinal={() => setTela({ t: "final" })}
          />
        )}
        {tela.t === "app" && tela.id === "radio" && (
          <section className="l-appnativo">
            <AppTopo titulo="RÁDIO 222" cor="#ff3fb0" onVoltar={() => setTela({ t: "home" })} />
            <Radio save={save} atualizar={atualizar} onFechar={() => setTela({ t: "home" })} embutido />
          </section>
        )}
        {tela.t === "app" && tela.id === "fliperama" && (
          <Fliperama
            save={save}
            tranca={trancaApp}
            onApp={abrirApp}
            onVoltar={() => setTela({ t: "home" })}
            onJogou={(id, pulou) => {
              setSave((s) => ({ ...s, jogados: { ...s.jogados, [id]: (s.jogados[id] ?? 0) + 1 } }))
            }}
          />
        )}
        {tela.t === "app" && tela.id === "jardim" && (
          <Jardim save={save} atualizar={atualizar} tranca={trancaApp} onVoltar={voltarDoApp} />
        )}
        {tela.t === "app" && tela.id === "violao" && <Violao tranca={trancaApp} onVoltar={() => setTela({ t: "home" })} />}
        {tela.t === "app" && tela.id === "ouvir" && <Ouvir onVoltar={() => setTela({ t: "home" })} />}
        {tela.t === "app" && tela.id === "loja" && <Loja save={save} comprar={trancaApp ? () => { avisar("LOJA", trancaApp, "#ffc857"); return false } : comprarNaLoja} tranca={trancaApp} aba0={lojaAba} onVoltar={voltarDoApp} />}
        {tela.t === "app" && tela.id === "objetos" && (
          <Objetos save={save} onVoltar={() => setTela({ t: "home" })} onChat={(id) => abrirChat(id, { t: "app", id: "objetos" })} onUsarGalao={() => setSave((s) => (s.galao === "cheio" ? { ...s, galao: "vazio", tanque: Math.min(1, (comVivo(s).tanque ?? 0) + GALAO) } : s))} />
        )}

        {tela.t === "final" && <Final save={save} onVoltar={() => setTela({ t: "home" })} />}

        {(tela.t === "home" || tela.t === "chat" || tela.t === "bloqueio" || tela.t === "chegada") && (
          <button type="button" className="l-som" onClick={alternarSom} aria-label={semSom ? "ligar som" : "desligar som"}>
            {semSom ? "som off" : "som on"}
          </button>
        )}
        {tela.t !== "entrada" && tela.t !== "bloqueio" && tela.t !== "chegada" && tela.t !== "home" && tela.t !== "corrida" && dentro && (
          <button type="button" className="l-home-bar" onClick={() => setTela({ t: "home" })} aria-label="início" />
        )}
        {cena && cenaDe(cena.lugar) && (
          <Interior key={`sala:${cena.lugar}:${cena.especial ?? ""}`} lugar={cena.lugar} sala={cena.especial === "ella-galeria" ? "galeria-ella" : undefined} objetos={save.objetos} inicio={!!cena.inicio} copos={save.copos} popularidade={save.popularidade ?? 0} disco={cena.especial === "disco-casa" || cena.especial === "disco-bar" || cena.especial === "visita-bar" || cena.especial === "dbee-instrumentos"} instrumentos={cena.lugar === "casa-dbee" ? instrumentosGanhos(h13) : undefined} novos={cena.especial === "dbee-instrumentos" ? instrumentosNovos(h13) : undefined} />
        )}
        {cena && (
          <CenaLugar
            key={`${cena.lugar}:${cena.missao}:${cena.inicio ? "inicio" : cena.especial ?? ""}`}
            gestos3d={GESTOS_3D[cena.especial === "ella-galeria" ? "galeria-ella" : cena.lugar] ?? []}
            loops={save.loops?.[cena.lugar] ?? 0}
            cena={cena.especial === "visita" ? cenaVisita(cena.lugar, h13) : cena.especial === "visita-bar" ? CENA_BAR_VISITA : cena.especial === "ella-galeria" ? CENA_GALERIA_ELLA : cena.especial === "disco-casa" ? (cenaHolo ? CENA_CASA_HOLO : cenaTambor ? CENA_CASA_TAMBOR : CENA_CASA_DISCO) : cena.especial === "dbee-instrumentos" ? (casaNovos.current ? CENA_CASA_INSTRUMENTOS : CENA_CASA_VISITA) : cena.especial === "disco-bar" ? CENA_BAR_PROLOGO : cena.especial === "disco-oficina" ? CENA_OFICINA : cena.inicio ? CENA_INICIO : cena.especial === "mubarak-drew" ? CENA_MUBARAK_DREW : cenaDe(cena.lugar)!}
            memoria={save.objetos.length}
            objetos={save.objetos}
            reliquias={(save.reliquias ?? []) as Reliquia[]}
            tom={tomMaior}
            semSom={semSom}
            onLinha={(texto) => setSave((s) => ({ ...s, linha: texto }))}
            onTom={(tom) => setSave((s) => ({ ...s, tons: { ...s.tons, [tom]: (s.tons?.[tom] ?? 0) + 1 } }))}
            onFim={cena.especial === "visita" ? fimVisita : cena.especial === "visita-bar" ? fimVisitaBar : cena.especial === "ella-galeria" ? fimCasaMissao : cena.especial === "disco-casa" ? fimCasaDisco : cena.especial === "dbee-instrumentos" ? fimCasaInstrumentos : cena.especial === "disco-bar" ? fimBarDisco : cena.especial === "disco-oficina" ? fimOficina : cena.inicio ? fimInicio : cena.especial === "mubarak-drew" ? fimMubarakDrew : fimCena}
            onNeon={(n) => setSave((s) => ganhar(s, n))}
          />
        )}
        {/* (T63) a porta do túnel: escurece; lá embaixo, as trincheiras (a estrada sai da cena) */}
        {trincheiras?.descendo && <div className="l-tunel-desce"><p>a Kombi fica aqui fora. você desce sem ela</p></div>}
        {portaBar && tela.t === "corrida" && !cena && !sinucaBar && <button type="button" className="l-regar-btn is-pagina" style={{ ["--cor" as string]: "#ff6a35" }} onPointerDown={(e) => e.stopPropagation()} onClick={entrarNoBar}>entrar · o bar</button>}
        {portaChao && tela.t === "corrida" && !cena && !janelaChao && (() => {
          const t = trancaChao(portaChao)
          return <button type="button" className="l-regar-btn is-pagina is-chao" style={{ ["--cor" as string]: CHAO_LUGARES[portaChao].cor }} onPointerDown={(e) => e.stopPropagation()} onClick={() => entrarNoChao(portaChao)}>{t && <Cadeado />}entrar · {ENTRADAS[portaChao].nome}{t ? " · ver" : ""}</button>
        })()}
        {janelaChao && <div className="l-janela-mundo"><AppJanela app={janelaChao.app} rota={janelaChao.rota} onFechar={fecharJanelaChao} /></div>}
        {sinucaBar && <SinucaBar tranca={trancaSinuca(h13)} onSair={() => { setSinucaBar(false); barFechou.current = Date.now() }} />}
        {trincheiras && !trincheiras.descendo && <Trincheiras noJogo={{ missao: trincheiras.missao, onSubir: subirDasTrincheiras, pausado: metroTuneis, tranca: HIST && hist.fase !== "carreira" && hist.fase !== "livre" ? "chegue na cidade pra correr" : null, motos: HIST && motoLiberada(hist) }} />}
        {/* (notas 04/11) a rádio livre: fora da estrada (túneis, salas) ela também liga */}
        {D && emSala && !trincheiras?.descendo && <button type="button" className={`l-radio-livre${radioManda ? " is-on" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={alternarRadioLivre}>{radioManda ? "rádio · desligar" : "rádio · ligar"}</button>}
        {/* (T64, lote D) os grafites das paredes: perto de um, o botão; assinar todos faz a arte dos túneis */}
        {trincheiras && !trincheiras.descendo && <GrafiteTrincheiras assinados={hist.grafites ?? []} onAssinou={assinouGrafite} escondido={metroTuneis}
          tag={hist.tagLivre ?? null} livre={HIST && (feita13(hist, "tuneis") || GRAFITES_IDS.every((g) => (hist.grafites ?? []).includes(g)))} trancaLivre={facaMissao("tuneis", "pintar a sua tag")}
          onTag={(t) => setSave((s) => comHistoria(s, (h) => ({ ...h, tagLivre: t })))} />}
        {/* (T64, 06/11) o trem do salão do metrô: depois da fuga de quando te pegam, a fuga de novo; antes, o cadeado */}
        {HIST && trincheiras && !trincheiras.descendo && <MetroTuneis liberado={metroFeito(hist)} onAberto={setMetroTuneis} />}
        {viagem && (
          <Viagem
            chegou={!!viagem.chegou}
            onFim={() => {
              // com a sala por dentro, a estrada some; sem ela, fica de fundo
              setViagem(temSala(viagem.lugar) ? null : { ...viagem, chegou: true })
              setCena({ lugar: viagem.lugar, missao: viagem.missao, pegar: viagem.pegar })
            }}
          />
        )}
        {ligacao && <LigacaoNaKombi key={ligacao.lig.id} lig={ligacao.lig} onFim={fimLigacao} onTom={(tom) => setSave((s) => ({ ...s, tons: { ...s.tons, [tom]: (s.tons?.[tom] ?? 0) + 1 } }))} />}
        {invasao && <InvasaoNucleo key={invasao.id} inv={invasao} onFim={fimInvasao} />}
        {aviso && (
          <div key={`aviso-${aviso.id}`} className="l-aviso" style={{ ["--cor" as string]: aviso.cor }}>
            <b>{aviso.titulo}</b>
            <span>{aviso.texto}</span>
          </div>
        )}
        {xpFlutua && tela.t !== "corrida" && <div key={`xp-${xpFlutua.id}`} className="l-xp-flutua">+{xpFlutua.n} neon</div>}
      </div>
    </div>
  )
}

// (21/10) as ofertas da feira: quem pede, o que a cidade precisa, o primeiro
// passo e a música a que leva; pegar (vira a missão de agora) ou largar
function FeiraOfertas({ ofertas, onPegar, onLargar, onFoco, foco }: { ofertas: Oferta13[]; onPegar: (id: MissaoId) => void; onLargar?: (id: MissaoId) => void; onFoco?: (o: Oferta13) => void; foco?: PistaId | null }) {
  return (
    <ul className="l-feira-lista">
      {ofertas.map((o) => {
        const emFoco = !!foco && foco === o.faixa
        return (
          <li key={o.id} ref={emFoco ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined} className={emFoco ? "is-foco" : ""} style={{ ["--cor" as string]: o.cor }} onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; onFoco?.(o) }}>
            <span className="l-feira-quem">{o.quem}<small>leva {o.leva}{o.feitas ? ` · ${o.feitas}/${o.total}` : ""}</small></span>
            <p>{o.pedido}</p>
            <em>{o.primeiro}</em>
            <div className="l-feira-bts">
              <button type="button" data-fecha-mapa onClick={() => onPegar(o.id)}>pegar</button>
              {onLargar && <button type="button" className="is-largar" onClick={() => onLargar(o.id)}>largar</button>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// (21/10) o fim da missão de uma linha: a faixa é dele agora. Ouvir lá fora (as
// plataformas; a que ainda não saiu, o pré-save e a data) ou comprar o disco
function OuvirFim({ pista, quando, onFechar }: { pista: PistaId; quando: number; onFechar: () => void }) {
  const p = PISTAS.find((x) => x.id === pista)!
  const saiu = !!p.voz && (!p.lancamento || new Date(p.lancamento).getTime() <= quando)
  // some sozinho 14 s depois de APARECER (ele só monta com o jornal já fechado)
  useEffect(() => {
    const t = setTimeout(onFechar, 14000)
    return () => clearTimeout(t)
  }, [onFechar])
  return (
    <aside className="l-ouvir-fim" style={{ ["--cor" as string]: COR_PISTA[p.faixa] ?? "#ffc857" }} aria-label={`ouvir a ${p.faixa}`}>
      <button type="button" className="l-ouvir-fim-x" onClick={onFechar} aria-label="Fechar">×</button>
      <small>a missão acabou · a música fica</small>
      <b>{p.faixa}</b>
      {saiu ? <Plataformas faixa={pista} lugar="disco-fim-missao" compacto /> : (
        <p>sai {new Date(p.lancamento ?? quando).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })} <PreSave faixa={pista} lugar="disco-fim-missao" /></p>
      )}
      <a className="l-ouvir-fim-disco" href={UNTITLED} target="_blank" rel="noopener noreferrer" onClick={() => track("external_link_click", { destination: "untitled", track_id: pista, place_id: "disco-fim-missao" })}>comprar o disco ↗</a>
    </aside>
  )
}
