"use client"

// A corrida da Linha 222, em 3D — jogabilidade inspirada no Horizon Drive
// (Shopify, R3F): a Kombi vive em coordenadas da via (u = distância,
// x = lateral), sem motor de física. Pista larga, curvas inclinadas como
// pista de corrida, parede macia (raspa e segue, nunca trava), pulos nas
// rampas, turbo no chão, orbs em colares, confete.
//
// O mapa é feito de lugares (ver mundo.ts): cada frequência da rádio tem o
// seu circuito, na sua altura, com a sua cara. Você fica ali, ouvindo
// aquela rádio, volta após volta. No fim de cada volta a pista abre numa
// bifurcação de três: uma saída de cada lado, o meio fica — e no meio da
// saída a rádio sintoniza a do destino.
// Rádio trancada = faixa com barreira até juntar sinal na estrada.

import { NOME_TURNO, SEG_POR_HORA, abertoAgora, abreAs, ehDia, horaTexto, turnoDe } from "../relogio"
import { PAGINAS, marcarDaCidade, trancadaPelaHistoria, type LugarPagina } from "../paginas"
import { Fachadas } from "./Fachadas"
import { Bombas } from "./Bombas"
import { BOMBAS, pertoDe } from "./postos"
import { useRouter } from "next/navigation"
import { Embacado } from "./Embacado"
import { Respirar } from "./Respirar"
import { chovendo } from "../clima"
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Cupula, Kombi222 } from "./Kombi222"
import { Patinador } from "./Patins"
import { MODELOS, montarModelos } from "./carros"
import { FloresAsfalto } from "./FloresAsfalto"
import { POR_VEZ, guardarFlores, levaDe, lerFlores, type FlorAsfalto } from "./floresDaRua"
import { geoRelevoRede, montarMundoRede, type MundoRede } from "./mundoRede"
import { V_TORRE, geoChaoDisco, montarMundoDisco, naEspiral as naEspiralParte, naTorre, naTorreDaPonta, type MundoDisco, type SinaisEspiral } from "./mundoDisco"
import { TorreCentral } from "./Torre"
import { Portoes } from "./Portoes"
import { Monumentos } from "./Monumentos"
import { VELO, intensidade } from "./velo"
import { geoJoia, matJoia } from "./joia"
import { CASA, QUEDA, RAIO_CASA, SAIDA_CASA, FALAS_DUNAS, FALAS_DUNAS_SUB, SUBURBIO, CHAO_LUGARES, RAIO_CHAO, semVoo, type HistoriaDisco, type LugarChao } from "../disco/historia"
import { LugaresChao } from "../disco/LugaresChao"
import { CasaDeserto } from "../disco/CasaDeserto"
import { OficinaLoja, Perfil } from "../disco/Perfil"
import { ROBOS, Robos } from "../disco/Robos"
import { guitarLivre } from "../disco/capsula"
import { luzDasPistas, pistasFeitas, type Luz } from "./atos"
import { lixoNoChao } from "./chao"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { CompilaSemTravar, LuzesProximas, compilarSemTravar } from "./luzes"
import { DPR, ResolucaoDinamica } from "./resolucao"
import { NIVEIS, QUALIDADE } from "./qualidade"
import { MedirAparelho } from "./MedirAparelho"
import { qualMapa } from "./qualMapa"
import { OculosMapa } from "./Oculos"
import { HoloAjuda, HoloAnel, HoloApps, HoloClima, HoloDestaque, HoloIcones, HoloIlha, HoloLetreiro, HoloMissao, HoloSom, type ChecklistHolo, type Clima } from "./Holo"
import type { AppId } from "../os"
import { PISTAS, faixaDaPista, velocidade as velPista, type Pista as PistaFaixa } from "./pistas"
import { calcularRota } from "./rota"
import { astros, ceuNaHora } from "../ceu"
import { corNeon, corPintura, lerEstilo } from "../../oficina/estilo"
import { Cabine, OLHO } from "./Cabine"
import { Cinema } from "./Cinema"
import { Seguro } from "./Seguro"
import { Suburbio } from "./Suburbio"
import { KombiHerbal } from "./KombiHerbal"
import { Capa } from "../capa"
import { discosDaKombi } from "../discos"
import { Metro, montarMetro } from "./Metro"
import { LUGARES, VAGA, type Lugar, type LugarId } from "../lugares"
import { Lugares, poseLugar, type PoseLugar } from "./Lugares"
import { ESPECIES, Flores, canteiroPerto, canteiroPorId } from "./Flores"
import type { Ir as IrAtalho } from "../../teste/atalhos"
import { Mapa, type Marca } from "./Mapa"
import { Parque, areaDoParque, novoPasseio, pertoDoParque, type PasseioParque } from "./Parque"
import { Prova } from "../provas"
import { ESTACOES, dataCurta, estacao as getEstacao, lancada, missao, type EstacaoId } from "../data"
import { VOZES } from "../roteiros"
import { VINIS, FREQUENCIAS, freqsLiberadas, proximaFreq, type FreqId, type Frequencia } from "../radio"
import { TODAS_FAIXAS, ehDoLugar, proxima } from "../programa"
import type { Save } from "../estado"
import { chiadoCamera, chiadoCurto, disco, estatica, fonteSom, gota, nomeDoTom, player, tomDaMusica, vento, type Fonte, definirTom, pistaSom, disco as discoPainel } from "../som"
import { MARCHAS, montarMotor, tremor, vib } from "../som-carro"
import { MEIA, PASSO, amostra, du, mundo as noMundo, novaAmostra, pontoI, suave, type Pista } from "./pista"
import { ABRE, CK, FAIXA, distritoDe, montarMundo, posicao, rumo, saidaEm, territorio, type Faixa, type Mundo, type Via } from "./mundo"
import { MISSOES, areaDaMissao, areaDoPasso, type Alvo } from "../missoes"
import { fita, texAsfalto, texBrilho, texJanelas, texTexto, texTurbo } from "./geo"
import { DISTRITOS, hexRgb, type Distrito } from "./distritos"
import { FRASE_GERAL, Outdoors, type Outdoor } from "./Outdoors"

// (16/10, LU2CA: "aumentar a velocidade como um todo") 46 → 55,6 m/s; (17/10,
// REA do Horizon Drive: "a Kombi está muito lenta") 69,4 m/s = 250 km/h de verdade
const VMAX = 69.4 // m/s
// o velocímetro marca numa escala própria: 110 km/h de verdade aparecem como
// 60; os patins (150 de verdade) marcam ~82 e a Kombi a 250 marca ~136
const K_VEL = 60 / 110
// drift: velocidade mínima pra finta derrubar a aderência, quanto peso tem
// que estar carregado no lado de fora, e o ângulo máximo da carroceria
const VDRIFT = 20 // ~72 km/h
const PESO_FINTA = 0.3
const DERIVA_MAX = 0.95 // ~54°
// fumaça nas rodas no drift: ligada de novo em 15/10 (referências novas do
// LU2CA: CarX Drift Racing 3 e Drift Max Pro, fumaça grossa no drift)
const FUMACA = true
// a pontuação do drift (CarX/Drift Max): os pontos sobem enquanto a Kombi anda
// de lado, o multiplicador cresce com o drift seguido e tudo só conta quando
// o drift acaba limpo (encostar no muro perde o que estava em jogo)
const DRIFT_JUNTA = 1.2 // s pra emendar um drift no outro sem perder o combo
const VTURBO = 88
// o soco do Horizon: 30 m/s² parado, suavizando até a máxima (0 → 216 km/h em ~4,5 s)
const ACEL = 30
const FREIO = 30
const G = 24
// (LU2CA 21/10 (2)) no mapa-disco, a gravidade da Terra: tudo cai a 9,8 m/s²
// (a Kombi, o pulo, o propulsor solto, os carros arremessados)
const G_TERRA = 9.8
// o pulo no disco: os mesmos 2,5 m de altura, na gravidade da Terra (~1,4 s no ar)
const V_PULO_TERRA = Math.sqrt(2 * G_TERRA * 2.5)

export interface Stats {
  tempo: number
  vmax: number
  orbs: number
  quase: number
  sinal: number
  ar: number
  voltas: number
}

interface Props {
  save: Save
  nivel: number
  destino: EstacaoId | null
  // pra onde a missão manda agora (buscar uma coisa num lugar, ou levar na estação)
  alvo?: Alvo | null
  onPegar?: (chave: string) => void
  // quantas coisas te chamando no celular (bolinha no ícone)
  avisos?: number
  // celular aberto por cima: a estrada congela (e continua dali ao fechar)
  pausado?: boolean
  // o Núcleo invadindo: a estrada segue, mas ele limita o motor
  limitado?: boolean
  // carregando contrabando (o item da missão, ou alguém de carona): os carros
  // brancos do Núcleo caçam a Kombi. Pego = a coisa volta pro lugar de origem
  cacado?: boolean
  onApreendido?: () => void
  // tem conversa rolando no painel (ela ocupa a ilha)
  conversa?: boolean
  // a ilha virou bifurcação: a conversa se recolhe enquanto isso
  onBifurca?: (b: boolean) => void
  // dicas que o jogo já deu (tutorial do rádio × toca-discos)
  dicas?: string[]
  onDica?: (id: string) => void
  // o Núcleo derrubou a 222: sem rádio, cidade cinza, missão = religar a antena
  caido?: boolean
  onReligar?: () => void
  onSinal: (total: number, freq?: FreqId) => void
  onDescer: (id: EstacaoId, s: Stats) => void
  onSair: (s: Stats) => void
  onVolta?: (tempo: number) => void
  // abertura: a Kombi anda sozinha pela cidade, sem HUD, câmera de cinema
  // ("rodando"); "parando" encosta e estaciona. Sem cinema = jogo normal.
  cinema?: Cinema
  // a cidade sem cor (o Núcleo apagou tudo) — sem derrubar a 222
  cinza?: boolean
  // a chegada (antes da D-Bee): a cidade fica quieta (sem falas soltas nem
  // tutorial) e quem fala na ilha é o grupo, de fora (fala)
  intro?: boolean
  fala?: { id: number; de: string; texto: string } | null
  // tocar na ilha quando ela mostra uma mensagem
  onIlha?: () => void
  // encostou devagar na vaga de um lugar (a cena começa)
  onVaga?: (id: LugarId) => void
  // o lugar secreto liberado (o beco): aparece depois de `voltas` passadas
  segredo?: { id: LugarId; voltas: number } | null
  // a 222 saiu do ar (ep. 3, a delação): sem rádio até o fim da missão
  foraDoAr?: boolean
  // saiu do bar errado N vezes: o mundo repete a noite (mais bonito, mais vazio)
  noiteRepete?: number
  // voltando de uma sala: reaparece onde estava
  retomar?: boolean
  // "ir agora" do painel MISSÕES: corta pra perto do lugar (chave muda = vai)
  teleporte?: { chave: number; area: FreqId; lugar?: LugarId; frac?: number } | null
  // A ABERTURA (05/10, LU2CA): o jogo começa no deserto, uns metros antes da
  // casa da D-Bee, com o combustível na reserva. Ele acaba em frente à casa;
  // a pessoa desce e anda até a porta (onAbertura = chegou na porta)
  abertura?: boolean
  onAbertura?: () => void
  // o celular aberto (LU2CA): a Kombi segue sozinha, devagar, e não para
  celular?: boolean
  // mudou de via (o id: "circuito:linha", "deserto"…)
  onArea?: (id: string) => void
  // quem vai de carona na Kombi fora das missões de carona (o tutorial: o
  // Mubarak indo pra casa do Drewboy)
  levando?: EstacaoId | null
  // o tanque (0–1): gasta andando; seco, a Kombi vai na reserva (devagar)
  tanque?: number
  onTanque?: (n: number) => void
  // passou devagar em frente ao posto: a bomba
  onPosto?: () => void
  // a hora do jogo (0–24) e o aviso pra guardar
  hora?: number
  onHora?: (h: number) => void
  // o dia da cidade (relogio.ts) e um salto de hora (dormir/cochilar)
  dia?: number
  saltoHora?: { h: number; id: number } | null
  // as flores da Ella regadas hoje (Flores.tsx) e o aviso de que regou
  regadas?: string[]
  onRegar?: (id: string) => void
  // uma volta na montanha-russa do parque (Parque.tsx): o NEON que ela paga
  onMontanha?: (neon: number) => void
  // abastecer numa bomba de rua (bombas.ts): devolve se deu (tinha neon)
  onAbastecer?: (o: "tanque" | "galao" | "despejar") => boolean
  // o posto do LU2CA está aberto (pra Kombi seguir quando ele fechar)
  postoAberto?: boolean
  // atalho de teste (/teste): aparece neste ponto, com a polícia ou o vidro embaçado
  atalho?: IrAtalho | null
  // (disco, o holo) abrir um app do sistema, o painel das missões, e a missão do anel
  onApp?: (id: AppId) => void
  onMissoes?: () => void
  missaoHolo?: { texto: string; cor: string; n: number } | null
  // (21/10 (2)) a checklist da missão pegada: o widget que vira o ponto de luz
  checklistHolo?: ChecklistHolo | null
  // (disco) a água: o saldo (save) e o que entra/sai (as gotas, a polícia)
  agua?: number
  onAgua?: (d: number) => void
  // (20/10) fugiu da polícia: a popularidade sobe (mais gente, mais neon$ nos shows)
  onFuga?: (pontos: number) => void
  // a cena de um lugar está rolando: a câmera de cinema olha pra ele
  cenaLugar?: LugarId | null
  // (disco, LU2CA 20/10) a história nova (disco/historia.ts): a fase manda em
  // onde a Kombi começa, se o holo existe, e o que acontece no deserto
  historia?: HistoriaDisco | null
  onHistoria?: (e: EventoHistoria) => void
  // (B10) comprar uma modificação na oficina (com água)
  onComprar?: (id: string, preco: number) => void
  // (B18) o lugar do chão do subúrbio pra onde a história manda agora
  alvoChao?: LugarChao | null
  // (LU2CA 21/10 (3)) a música é o TEMA da missão: na carreira (soTema), a
  // missão pegada (temaMissao) toca o instrumental até ele achar a linha dela;
  // na linha, a música toca UMA vez; depois, o instrumental de novo. Sem missão,
  // nenhuma faixa de pista: só os discos
  soTema?: boolean
  temaMissao?: string | null
  // (21/10, o mapa que ensina) a pista em foco no mapa (tocou na oferta da feira)
  pistaFoco?: string | null
}
export type EventoHistoria = "casa" | "cidade" | "robo" | "quebrou" | "flor" | "galao" | "subiu" | `chao:${LugarChao}`

const SEM_FLORES: string[] = []

export type Cinema = "rodando" | "parando" | "lugar" | null
const VCINEMA = 22 // m/s: de boa, ~80 km/h

type Jogo = {
  via: number
  u: number; x: number; v: number; vx: number; steer: number
  y: number; vy: number; ar: boolean; tAr: number
  turboT: number; carga: number; shake: number; flash: number
  // drift: ângulo da carroceria em relação a pra onde ela anda (rad), a
  // velocidade com que esse ângulo gira, o lado do drift (0 = com
  // aderência), o peso carregado num lado (a "mola" da finta), o último lado
  // apertado e quanto tempo de drift de verdade (vira mini-turbo)
  deriva: number; giro: number; drift: 0 | 1 | -1; peso: number; ladoAnt: number; driftT: number
  // a pontuação do drift: em jogo, multiplicador, quando o último drift acabou,
  // o total da noite e o recado do HUD
  dPts: number; dMult: number; dFim: number; dTotal: number; dMsg: string; dMsgT: number; dRaspa: number
  // caça do Núcleo: distância do carro branco mais perto (m, atrás)
  cacaGap?: number
  // as batidas no trânsito (06/10, LU2CA): cada uma acende uma estrela; na
  // 3ª a polícia vem. As estrelas apagam devagar sem bater
  batidas?: number
  batidaT?: number
  procurado?: boolean
  // chegada num lugar novo: a música nova entra de uma vez, com o cenário
  impacto: number; soco: boolean
  tempo: number; voltaIni: number; voltas: number
  chegando: boolean; parado: boolean; encaixar?: boolean
  // a Kombi desligada (LU2CA 15/10): 10 s sem tocar em nada, ou chegou numa
  // missão; só anda de novo com "dar partida"
  desligada?: boolean
  // o mapa novo: pediu o retorno (troca pra outra mão da mesma rua)
  retorno?: boolean
  tVolta?: number // parado, segurando freio + um lado: quanto tempo (meia-volta)
  // o pulo (17/10, mapa 2.0: barra de espaço / toque duplo, a movimentação do inFamous)
  pulou?: boolean; tPulo?: number
  // (disco, passo 3) o voo: solta da pista e voa livre (wx, wz, rumo); a energia
  // do propulsor (0–1, volta andando na pista); propulsou = este voo usou o propulsor
  voo?: boolean; energia?: number; propulsou?: boolean
  // (21/10) há quanto tempo o propulsor está empurrando (o empuxo cresce em ~0,4 s);
  // quique = a última batida de pinball (não quica duas vezes no mesmo encosto)
  tProp?: number; quique?: number
  // o modo arcade (17/10, LU2CA: "arcade, divertido, psicodélico, fidget"):
  // o combo de anéis, a onda psicodélica (0–1) e o giro da Kombi no ar
  combo?: number; comboT?: number; psi?: number; giroAr?: number
  // as manobras no ar (19/10): o giro e o mortal com inércia, o combo de manobras, o dash do patins
  vGiro?: number; flipAr?: number; vFlip?: number; trComboN?: number; trComboT?: number; dashou?: boolean
  // (19/10) o EMBALO: a velocidade ganha com drift, manobra e voo, sem teto
  // (m/s acima da velocidade da pista; cai devagar, o muro e o freio comem);
  // vBase = a velocidade da pista agora (a polícia e o helicóptero medem por ela)
  embalo?: number; vBase?: number
  // (20/10) o HYPERLAPSE: chegou a 4× a velocidade da pista, pula pra 10× e o
  // controle sai da mão (só vai, na via onde está); hyperT = há quanto tempo.
  // tresT = há quanto tempo acima de 3× (8 s despista o helicóptero)
  hyper?: boolean; hyperT?: number; tresT?: number; fugaGrande?: boolean
  // (21/10) a Kombi indo sozinha pra missão pegada (ninguém tocou faz 6 s)
  piloto?: boolean
  // a direção livre (mapa novo): onde a Kombi está no mundo e pra onde aponta
  wx?: number; wz?: number; rumo?: number; livreOk?: boolean; livreFora?: boolean
  lvVia?: number; lvU?: number // onde a direção livre deixou a Kombi no quadro passado
  // encostando pra fazer algo na beira (regar as flores, a montanha-russa):
  // para, sem o "chegou"
  encostando?: boolean
  // atalho de teste: segura parada uns segundos depois de aparecer
  segura?: boolean
  // com o mapa grande aberto a Kombi espera parada
  noMapa?: boolean
  sintonizou: boolean
  // bifurcação: o lado que a pessoa marcou (0 = fica) e em qual divisão
  escolha: 0 | 1 | -1; escolhaU: number
  st: Stats
  pegos: Set<number>
  // a vaga do lugar da missão: já avisou que tá chegando? já encostou?
  vagaAvisou?: string
  naVaga?: string | false // em qual vaga já encostou (não reabre a cena parado nela)
  segAnt?: number
  segPassou?: number
  naSeg?: boolean
}

// (LU2CA 21/10 (2), o PINBALL) a Kombi no mundo livre (voo ou direção livre)
// bateu num prédio: o rumo espelha na parede (como a bola no pinball) e ela
// segue, perdendo pouco; um baque por batida (não treme encostada)
function quicar(j: Jogo, emp: [number, number], kombi: THREE.Object3D | null) {
  const L = Math.hypot(emp[0], emp[1])
  if (!L || j.rumo === undefined) return
  const nx = emp[0] / L, nz = emp[1] / L
  const dx = Math.sin(j.rumo), dz = Math.cos(j.rumo), dn = dx * nx + dz * nz
  if (dn >= 0) return // já está saindo da parede
  const rx = dx - 2 * dn * nx, rz = dz - 2 * dn * nz
  j.rumo = Math.atan2(rx, rz)
  if (j.tempo - (j.quique ?? -9) > 0.35) {
    j.quique = j.tempo
    j.v *= 1 - 0.12 * Math.abs(dn)
    j.shake = Math.max(j.shake, 0.35 * Math.abs(dn) + 0.1)
    if (kombi) vib(16)
  }
}

// ponto de busca de uma missão no mapa (a coluna de luz com a coisa)
export type Marco = { chave: string; via: number; u: number; cor: string }

type Evs = {
  via: (i: number) => void
  vaga: (id: LugarId) => void
  radio: (id: FreqId) => void
  falar: (de: string, t: string) => void
  popup: (t: string, cor: string) => void
  sinal: (n: number, rotulo: string, cor: string) => void
  portal: (id: EstacaoId) => void
  pegar: (chave: string) => void
  anel: () => void
  caca: (e: "comecou" | "pego" | "despistou" | "perdeu" | "fim") => void
  estrelas: (n: number) => void
  chegou: () => void
  piloto: (on: boolean) => void
  volta: (t: number) => void
  hud: (j: Jogo) => void
}

// toqueE/toqueD: um toque de cada lado, guardado até o próximo quadro (um
// toque mais curto que um quadro não pode se perder — é ele que marca a
// saída na bifurcação)
// gas: acelerador (no computador é manual; no celular é automático)
// freio: freia e, parada, dá ré. Drift não tem botão: é a finta (ver Cena)
type Input = { semVoo?: boolean; ambos?: boolean; ambosAntes?: boolean; mods?: string[]; esq: boolean; dir: boolean; gas: boolean; freio: boolean; turbo: boolean; toqueE: boolean; toqueD: boolean; mao: boolean; ultimo: number; pulo?: boolean; ultimoToque?: number; ultimoEspaco?: number; propulsor?: boolean; espacoDesde?: number; propulsorBotao?: boolean; semHolo?: boolean }
// mola amortecida crítica (a SmoothDamp da Unity): chega no alvo em ~`tempo`
// segundos sem passar dele e sem tranco quando o alvo muda. A velocidade fica em o[k]
function amortece<K extends string>(atual: number, alvo: number, o: Record<K, number>, k: K, tempo: number, dt: number) {
  const w = 2 / Math.max(1e-4, tempo), x = w * dt
  const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
  const d = atual - alvo
  const t = (o[k] + w * d) * dt
  o[k] = (o[k] - w * t) * e
  return alvo + (d + t) * e
}
// a menor diferença entre dois ângulos (−π a π)
const angDif = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b))
const VRE = 15 // ré: m/s
// celular: acelerador automático (dois polegares já cuidam de virar/drift/ré)
// as marcas do velocímetro (0–140 km/h, 270°)
const DIAL = Array.from({ length: 15 }, (_, k) => {
  const a = ((-135 + k * (270 / 14)) * Math.PI) / 180
  const sx = Math.sin(a), cy = -Math.cos(a)
  return { k, x1: 50 + sx * 44, y1: 50 + cy * 44, x2: 50 + sx * (k % 2 ? 40 : 37), y2: 50 + cy * (k % 2 ? 40 : 37), tx: 50 + sx * 29, ty: 50 + cy * 29 }
})
const toqueTela = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
// medição (só com ?medir): ?dpr=1.25 fixa a densidade de pixels do canvas
const testeMedir = typeof window !== "undefined" && /[?&]medir/.test(location.search)
const testeMedirAparelho = typeof window !== "undefined" && /[?&]medirAparelho/.test(location.search)
const testeDpr = (() => { if (typeof window === "undefined" || !/[?&]medir/.test(location.search)) return null; const v = Number(new URLSearchParams(location.search).get("dpr")); return v > 0 ? v : null })()

const freqDe = (id: FreqId) => FREQUENCIAS.find((f) => f.id === id)!
const lugarDe = (d: FreqId) => territorio(d).lugar
const praDe = (d: FreqId) => territorio(d).pra
// saída aberta = rádio do destino já destravada
// as saídas ficam todas abertas (06/10): rádio é outra coisa, a estrada não tranca
const aberta = (f: Faixa, nLib: number) => { void f; void nLib; return true }

type Garfo = { via: number; u: number; esq?: Faixa; dir?: Faixa }
type ItemGuia = { k: string; d: number; cor: string; rot: string; tipo: "estacao" | "alvo" | "garfo" | "chegada" | "item" }

export function Corrida({ save, nivel, destino: destinoInicial, alvo = null, onPegar, avisos = 0, pausado = false, limitado = false, cacado = false, onApreendido, dicas = [], onDica, conversa = false, onBifurca, caido = false, onReligar, onSinal, onDescer, onSair, onVolta, cinema = null, cinza = false, intro = false, fala = null, onIlha, onVaga, cenaLugar = null, segredo = null, foraDoAr = false, noiteRepete = 0, retomar = false, teleporte = null, abertura = false, onAbertura, onArea, celular = false, levando = null, tanque = 1, onTanque, onPosto, hora = 18, onHora, dia = 1, saltoHora = null, regadas = SEM_FLORES, onRegar, onMontanha, onAbastecer, postoAberto = false, atalho = null, onApp, onMissoes, missaoHolo = null, checklistHolo = null, agua = 0, onAgua, onFuga, historia = null, onHistoria, onComprar, alvoChao = null, soTema = false, temaMissao = null, pistaFoco = null }: Props) {
  const M = useMemo(() => mundo(), [])
  // voltando de uma sala: a Kombi reaparece onde estava (RETOMAR, guardado ao desmontar)
  const [retomada] = useState(() => (retomar ? RETOMAR : null))
  useEffect(() => { RETOMAR = null }, [])
  const centro = M.vias[M.circuito.linha]
  const [fonte, setFonte] = useState(false)
  // levando a coisa pra estação = a estação vira o destino
  const [destino, setDestino] = useState<EstacaoId | null>(destinoInicial ?? (alvo && (alvo.t === "entrega" || alvo.t === "visita") ? alvo.missao : null))
  const destinoRef = useRef(destino)
  useEffect(() => { destinoRef.current = destino }, [destino])
  const alvoRef = useRef(alvo)
  useEffect(() => { alvoRef.current = alvo }, [alvo])
  const alvoChave = alvo ? `${alvo.t}:${alvo.missao}:${alvo.t === "busca" ? alvo.faltam.join(",") : ""}` : ""
  const missaoAlvo = alvo ? MISSOES[alvo.missao] ?? null : null
  // onde a missão manda: o lugar da busca, ou o centro (onde moram as estações)
  const lugarAlvo: FreqId | null = caido ? "linha" : alvo ? (alvo.t === "busca" ? alvo.busca.onde : alvo.t === "lugar" ? LUGARES[alvo.lugar].area : "linha") : null
  // os lugares da cidade: onde fica cada um (fachada, vaga, câmera)
  const poses = useMemo(() => Object.fromEntries(Object.values(LUGARES).map((l) => [l.id, poseLugar(M, l)])) as Record<LugarId, PoseLugar>, [M])
  const lugarDaMissao: LugarId | null = !caido && alvo?.t === "lugar" ? alvo.lugar : null
  // o destino que você marcou no mapa (senão, o mapa aponta a missão)
  const [marca, setMarca] = useState<Marca | null>(null)
  // os ANÉIS (17/10, mapa 2.0): cada 100 que você pega viram duas viagens
  // rápidas pelo mapa. Ficam guardados no aparelho
  // a dica do mapa 2.0 (nas 3 primeiras entradas, fora da abertura): o que é novo
  const [dica2, setDica2] = useState(() => {
    if (abertura) return false
    try { return Number(localStorage.getItem("cn-dica-mapa2b") ?? 0) < 3 } catch { return false }
  })
  useEffect(() => {
    if (!dica2) return
    try { localStorage.setItem("cn-dica-mapa2b", String(Number(localStorage.getItem("cn-dica-mapa2b") ?? 0) + 1)) } catch {}
    const t = setTimeout(() => setDica2(false), 9000)
    return () => clearTimeout(t)
  }, [dica2])
  // (disco) a água: cada gota soma na hora aqui e vai pro save a cada segundo
  // (o save grava a cada mudança: gota a gota seria pesado)
  const [aguaPend, setAguaPend] = useState(0)
  const aguaVista = agua + aguaPend
  const aguaRef = useRef(aguaVista)
  const onAguaRef = useRef(onAgua)
  const onFugaRef = useRef(onFuga)
  useEffect(() => { aguaRef.current = aguaVista; onAguaRef.current = onAgua; onFugaRef.current = onFuga }, [aguaVista, onAgua, onFuga])
  useEffect(() => {
    if (!aguaPend) return
    const t = setTimeout(() => { onAguaRef.current?.(aguaPend); setAguaPend(0) }, 1000)
    return () => clearTimeout(t)
  }, [aguaPend])
  const [aneis, setAneis] = useState<{ total: number; viagens: number }>(() => {
    try { const a = JSON.parse(localStorage.getItem("cn-aneis") ?? "null"); if (a && typeof a.total === "number") return a } catch {}
    return { total: 0, viagens: 0 }
  })
  useEffect(() => { try { localStorage.setItem("cn-aneis", JSON.stringify(aneis)) } catch {} }, [aneis])
  const marcaRef = useRef<Marca | null>(null)
  useEffect(() => { marcaRef.current = marca }, [marca])
  // a vaga que vale agora (encostar nela começa a cena)
  const vagaRef = useRef<{ id: LugarId; via: number; u: number; lado: 1 | -1; nome: string; cor: string; quem: string } | null>(null)
  useEffect(() => {
    if (!lugarDaMissao) { vagaRef.current = null; return }
    const l = LUGARES[lugarDaMissao]
    const p = poses[lugarDaMissao]
    vagaRef.current = { id: l.id, via: p.via, u: p.u, lado: p.lado, nome: l.nome, cor: l.cor, quem: l.gente[0]?.quem ?? "" }
  }, [lugarDaMissao, poses])
  // o lugar secreto: sem aviso nem guia; a Cena conta as passadas
  const segredoRef = useRef<{ id: LugarId; via: number; u: number; lado: 1 | -1; voltas: number } | null>(null)
  const segId = segredo?.id ?? null
  const segVoltas = segredo?.voltas ?? 0
  useEffect(() => {
    if (!segId) { segredoRef.current = null; return }
    const p = poses[segId]
    segredoRef.current = { id: segId, via: p.via, u: p.u, lado: p.lado, voltas: segVoltas }
  }, [segId, segVoltas, poses])
  const camLugarRef = useRef<PoseLugar | null>(null)
  useEffect(() => { camLugarRef.current = cenaLugar ? poses[cenaLugar] : null }, [cenaLugar, poses])
  const conversaRef = useRef(conversa)
  useEffect(() => { conversaRef.current = conversa }, [conversa])
  const caidoRef = useRef(caido)
  useEffect(() => { caidoRef.current = caido }, [caido])
  const foraRef = useRef(foraDoAr)
  useEffect(() => { foraRef.current = foraDoAr }, [foraDoAr])
  const lugarAlvoRef = useRef(lugarAlvo)
  useEffect(() => { lugarAlvoRef.current = lugarAlvo }, [lugarAlvo])
  const marcos = useMemo<Marco[]>(() => {
    // a antena da 222: no centro, um terço do caminho
    if (caido) {
      const C = M.vias[M.circuito.linha]
      return [{ chave: "antena", via: M.circuito.linha, u: C.livre[0] + 0.33 * (C.livre[1] - C.livre[0]), cor: "#e6f0ff" }]
    }
    if (!alvo || alvo.t !== "busca") return []
    const vi = M.circuito[alvo.busca.onde]
    const C = M.vias[vi]
    const cor = getEstacao(alvo.missao).cor
    return alvo.faltam.map((k) => ({ chave: `${alvo.busca.item}:${k}`, via: vi, u: C.livre[0] + alvo.busca.em[k] * (C.livre[1] - C.livre[0]), cor }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [M, alvoChave, caido])
  const marcosRef = useRef(marcos)
  useEffect(() => { marcosRef.current = marcos }, [marcos])
  // a busca terminou no meio da corrida: a estação vira destino na hora.
  // E o contrário: a missão virou busca (a pessoa já falou com quem chamou
  // e pegou a Kombi) — a estação deixa de ser destino, senão a Kombi leva
  // de volta lá pra "descer" e confirmar de novo
  useEffect(() => {
    if ((alvo?.t === "busca" || alvo?.t === "lugar") && destinoRef.current === alvo.missao) setDestino(null)
    if (alvo && (alvo.t === "entrega" || alvo.t === "visita") && !destinoRef.current) setDestino(alvo.missao)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvoChave])

  const onHistoriaRef = useRef(onHistoria)
  useEffect(() => { onHistoriaRef.current = onHistoria }, [onHistoria])
  const input = useRef<Input>({ esq: false, dir: false, gas: false, freio: false, turbo: false, toqueE: false, toqueD: false, mao: false, ultimo: 0 })
  const [jogo0] = useState(() => {
    const ret = retomarJogo(M, retomada)
    const j = ret ?? novoJogo(M, destino, save.estacao, abertura)
    // (disco, a história) a Kombi cai do buraco de minhoca no deserto, perto da
    // casa; depois da casa, sai dela de frente pra cidade (dirigindo nas dunas)
    // (B18) no bar e na oficina (o subúrbio, no chão) ela reaparece no subúrbio
    const noSub = historia && (historia.fase === "bar" || historia.fase === "oficina")
    if ("disco" in M && historia && (historia.fase === "casa" || historia.fase === "dunas" || noSub)) {
      const MD = M as MundoDisco, p = historia.fase === "casa" ? QUEDA : noSub ? { x: SUBURBIO.x + 40, z: SUBURBIO.z + 60, rumo: Math.atan2(-SUBURBIO.x, -SUBURBIO.z) } : SAIDA_CASA
      j.voo = true; j.wx = p.x; j.wz = p.z; j.rumo = p.rumo; j.propulsou = true; j.encaixar = false
      const ch = MD.chaoEm(p.x, p.z)
      if (historia.fase === "casa") { j.ar = true; j.tAr = 0; j.y = ch + 70; j.vy = -6; j.v = 16 } else { j.ar = false; j.y = ch + 0.3; j.v = 0 }
    }
    return j
  })
  // a abertura: onde a casa fica e em que pé a pessoa está
  const casaPose = poses["casa-dbee"]
  const aberturaRef = useRef<Abertura>({ ativa: abertura, via: casaPose.via, u: LUGARES["casa-dbee"].u, porta: new THREE.Vector3(casaPose.porta.x, casaPose.vaga.y, casaPose.porta.z), fase: "dirige", pe: 0, semGas: false, t0: 0, de: null, onPorta: () => {} })
  const onAberturaRef = useRef(onAbertura)
  useEffect(() => { onAberturaRef.current = onAbertura }, [onAbertura])
  const onAreaRef = useRef(onArea)
  const areaRua = useRef<string | null>(null)
  useEffect(() => { onAreaRef.current = onArea }, [onArea])
  useEffect(() => {
    aberturaRef.current.ativa = abertura
    aberturaRef.current.onPorta = () => onAberturaRef.current?.()
  }, [abertura])
  // o ponteiro do combustível: na abertura, a reserva até secar
  // (combAgora é calculado depois de abFase)
  // o que a tela mostra da abertura (o tanque, a dica de andar)
  const [abFase, setAbFase] = useState<{ fase: Abertura["fase"]; semGas: boolean }>({ fase: "dirige", semGas: false })
  // o combustível: um ref (gasta a cada frame); o page guarda de tempos em tempos
  const postoPose = poses.posto
  // voltando de dentro do posto, a Kombi tá parada na frente dele: não abre de novo
  // (17/10, LU2CA: a Kombi virou ELÉTRICA, com painéis solares: não acaba,
  // não abastece) fora da abertura o "tanque" é a bateria, sempre cheia
  const combRef = useRef<Comb>({ tanque: abertura ? tanque : 1, via: postoPose.via, u: LUGARES.posto.u, avisou: jogo0.via === postoPose.via && Math.abs(du(M.vias[jogo0.via], jogo0.u, LUGARES.posto.u)) < 60, onPosto: () => {}, t: 0 })
  const onTanqueRef = useRef(onTanque)
  useEffect(() => { onTanqueRef.current = onTanque }, [onTanque])
  useEffect(() => { combRef.current.onPosto = () => onPosto?.() }, [onPosto])
  // encheu no posto (ou usou o galão): o page manda o novo nível
  useEffect(() => { if (!abertura && Math.abs(tanque - combRef.current.tanque) > 0.04) combRef.current.tanque = 1 }, [tanque, abertura])
  const hudComb = useRef<SVGLineElement>(null)
  const horaRef = useRef(hora)
  const onHoraRef = useRef(onHora)
  // dormir/cochilar: a hora pula (e o céu vai junto)
  useEffect(() => {
    if (!saltoHora) return
    horaRef.current = saltoHora.h
    onHoraRef.current?.(saltoHora.h)
  }, [saltoHora])
  // o relógio na tela (lido do ref, sem render a cada quadro)
  const hudRelogio = useRef<HTMLElement>(null)
  const hudTurno = useRef<HTMLElement>(null)
  useEffect(() => {
    const t = setInterval(() => {
      const h = horaRef.current
      if (hudRelogio.current) hudRelogio.current.textContent = horaTexto(h)
      if (hudTurno.current) { const tn = turnoDe(h); hudTurno.current.textContent = `dia ${dia} · ${NOME_TURNO[tn]}`; hudTurno.current.dataset.turno = tn }
    }, 500)
    return () => clearInterval(t)
  }, [dia])
  useEffect(() => { onHoraRef.current = onHora }, [onHora])
  const horaT = useRef(0)
  const hudCombBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!abertura) return
    const iv = setInterval(() => {
      const a = aberturaRef.current
      setAbFase((x) => (x.fase === a.fase && x.semGas === a.semGas ? x : { fase: a.fase, semGas: a.semGas }))
    }, 200)
    // silêncio absoluto: só o vento (e o motor)
    const w = vento()
    return () => { clearInterval(iv); w?.parar() }
  }, [abertura])
  const jogo = useRef<Jogo>(jogo0)
  // as flores da Ella: de dia, chegando num canteiro, dá pra regar
  const [canteiro, setCanteiro] = useState<string | null>(null)
  const [regando, setRegando] = useState<string | null>(null)
  // os lugares que são páginas (paginas.ts): perto de qual, quais abertos, e
  // a entrada (a cutscene espera a página carregar em paralelo)
  const router = useRouter()
  const [paginaPerto, setPaginaPerto] = useState<string | null>(null)
  const missaoLugarRef = useRef<LugarId | null>(null)
  useEffect(() => { missaoLugarRef.current = lugarDaMissao }, [lugarDaMissao])
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})
  const [entrando, setEntrando] = useState<LugarPagina | null>(null)
  // o posto e as bombas: perto de qual, e abastecendo numa bomba (o painel)
  const [pertoComb, setPertoComb] = useState<string | null>(null)
  const [naBomba, setNaBomba] = useState(false)
  const [msgBomba, setMsgBomba] = useState("")
  const [esperandoPosto, setEsperandoPosto] = useState(false)
  // a gasolina acabou: de patins até o posto ou uma bomba, e volta com o galão
  const [dePatins, setDePatins] = useState(false)
  // as flores do asfalto (mapa novo, LU2CA 16/10): só de patins; 10 por vez, sem fim
  const [flores, setFlores] = useState(() => lerFlores())
  const leva = useMemo(() => ("ligacoes" in M ? levaDe(M, flores.geracao) : []), [M, flores.geracao])
  const levaPos = useMemo(() => leva.map((f) => { const C = M.vias[f.via], i = Math.max(0, Math.min(C.n - 1, Math.floor(f.u / 2))); return { f, x: C.px[i], z: C.pz[i] } }), [M, leva])
  const [regandoFlor, setRegandoFlor] = useState<{ id: string; desde: number } | null>(null)
  const [florPerto, setFlorPerto] = useState<FlorAsfalto | null>(null)
  const [msgFlor, setMsgFlor] = useState("")
  // teste (fora da produção): leva até a flor k da leva
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    ;(window as unknown as Record<string, unknown>).__irFlor = (k: number) => {
      const f = leva[k]; if (!f) return null
      const j = jogo.current; j.via = f.via; j.u = Math.max(0, f.u - 4); j.x = f.lado * 3; j.v = 0; j.encaixar = true
      return { id: f.id, especie: f.especie }
    }
  }, [leva])
  const floresRef = useRef(new Set<string>())
  const mangueiraRef = useRef(false)
  const mangueiraT = useRef(0)
  const regarFlorRef = useRef<(f: FlorAsfalto) => void>(() => {})
  useEffect(() => { floresRef.current = new Set(flores.regadas.map((f) => f.id)) }, [flores])
  const regarFlor = (f: FlorAsfalto) => {
    // (disco, LU2CA 19/10) regar é com água: uma gota de água por flor
    if ("disco" in M) {
      if (aguaRef.current < 1) { setMsgFlor("sem água · as gotas da pista são água"); setTimeout(() => setMsgFlor(""), 2600); return }
      onAguaRef.current?.(-1)
      onHistoriaRef.current?.("flor")
    }
    setRegandoFlor({ id: f.id, desde: performance.now() })
    vib([10, 20, 10])
    setTimeout(() => {
      setFlores((e) => {
        const desta = [...e.desta, f.id]
        const nova = desta.length >= POR_VEZ
        const prox = { geracao: nova ? e.geracao + 1 : e.geracao, regadas: [...e.regadas, f], desta: nova ? [] : desta }
        guardarFlores(prox)
        if (nova) { setMsgFlor(`nasceram mais ${POR_VEZ} flores pela cidade`); setTimeout(() => setMsgFlor(""), 3500) }
        return prox
      })
      onMontanha?.(1)
      setRegandoFlor(null)
    }, 1700)
  }
  useEffect(() => { regarFlorRef.current = regarFlor })
  const [seco, setSeco] = useState(false)
  const [pertoKombi, setPertoKombi] = useState(false)
  // a Kombi desligada: no lugar da ré, "dar partida"
  const [desligada, setDesligada] = useState(false)
  // (21/10) a Kombi indo sozinha pra missão (o aviso pequeno no canto)
  const [piloto, setPiloto] = useState(false)
  const viajar = () => {
    const j = jogo.current
    if (!marca || aneis.viagens <= 0 || (aberturaRef.current.ativa && !("disco" in M)) || j.chegando) return false
    j.via = marca.via; j.u = Math.max(0, marca.u - 70); j.x = 0; j.v = Math.min(j.v, 20); j.encaixar = true; j.livreOk = false
    evs.current?.via(marca.via)
    setAneis((a) => ({ ...a, viagens: a.viagens - 1 }))
    vib([20, 30, 60])
    return true
  }
  const darPartida = () => { jogo.current.desligada = false; input.current.ultimo = performance.now(); vib([20, 30, 20]); setDesligada(false) }
  useEffect(() => {
    // qualquer toque ou tecla conta como "tem gente dirigindo"
    const vivo = () => { input.current.ultimo = performance.now() }
    vivo()
    window.addEventListener("pointerdown", vivo); window.addEventListener("keydown", vivo)
    return () => { window.removeEventListener("pointerdown", vivo); window.removeEventListener("keydown", vivo) }
  }, [])
  const [msgPatins, setMsgPatins] = useState("")
  const postoJaAbriu = useRef(false)
  const abastecer = (onde: string) => {
    jogo.current.encostando = true
    if (onde === "posto") {
      setEsperandoPosto(true)
      setTimeout(() => onPosto?.(), 900)
      // o posto não abriu (uma cena no meio): a Kombi não fica presa
      setTimeout(() => { if (!postoJaAbriu.current) { jogo.current.encostando = false; setEsperandoPosto(false) } }, 3000)
    }
    else {
      // o painel abre com a Kombi parada do lado da bomba
      const espera = setInterval(() => { if (Math.abs(jogo.current.v) < 1) { clearInterval(espera); setNaBomba(true) } }, 200)
    }
  }
  // o posto abriu e fechou: a Kombi segue
  useEffect(() => {
    if (postoAberto) postoJaAbriu.current = true
    else if (postoJaAbriu.current) {
      postoJaAbriu.current = false
      jogo.current.encostando = false
      setEsperandoPosto(false)
    }
  }, [postoAberto])
  const [carregou, setCarregou] = useState(false)
  // a câmera da entrada: do outro lado da rua, olhando a fachada (como nas cenas)
  const camEntrada = useRef<{ cam: THREE.Vector3; olhar: THREE.Vector3 } | null>(null)
  const entrar = (lp: LugarPagina) => {
    jogo.current.encostando = true
    const pose = poseLugar(M, { area: lp.area, u: lp.u, lado: lp.lado } as Lugar, `pagina:${lp.id}`)
    camEntrada.current = { cam: pose.cam.clone(), olhar: pose.porta.clone().setY(pose.porta.y + 2.5) }
    setEntrando(lp); setCarregou(false)
    router.prefetch(lp.rota)
    // a cena dura pelo menos 3,2 s (o tempo de ver o letreiro e a fachada)
    const pagina = CARREGAR_PAGINA[lp.id]().catch(() => null).then(() => setCarregou(true))
    void Promise.all([pagina, new Promise((r) => setTimeout(r, 3200))]).then(() => { marcarDaCidade(); router.push(`${lp.rota}?de=cidade`) })
  }
  // a montanha-russa: perto (dá pra andar) ou andando
  const passeio = useRef<PasseioParque>(novoPasseio())
  const [parque, setParque] = useState<"perto" | "andando" | null>(null)
  const [fotoParque, setFotoParque] = useState("")
  const hudMontanha = useRef<HTMLElement>(null)
  const andarMontanha = () => {
    const pq = passeio.current
    jogo.current.encostando = true
    pq.bracos = false
    pq.fim = (r) => {
      jogo.current.encostando = false
      const ganho = 2 + (r.bracos >= 0.9 ? 4 : 0)
      setFotoParque(`${r.bracos >= 0.9 ? "a foto da descida: braços pra cima" : "a foto da descida"} · ${Math.round(r.velMax * 3.6)} km/h · +${ganho} neon`)
      setTimeout(() => setFotoParque(""), 4500)
      onMontanha?.(ganho)
    }
    pq.andando = true
    setParque("andando")
  }
  useEffect(() => {
    const t = setInterval(() => {
      const j = jogo.current
      const c = ehDia(horaRef.current) && !("ligacoes" in M) ? canteiroPerto(M, j.via, j.u) : null
      setCanteiro(c && !regadas.includes(c.id) ? c.id : null)
      const pq = passeio.current
      setParque(pq.andando ? "andando" : abertoAgora("noite", horaRef.current) && pertoDoParque(M, j.via, j.u) ? "perto" : null)
      // os lugares que são páginas: aberto agora? a Kombi está chegando?
      const ab: Record<string, boolean> = {}
      let pp: string | null = null
      for (const lp of PAGINAS) {
        ab[lp.id] = abertoAgora(lp.horario, horaRef.current)
        // a missão aponta pra esse lugar: quem manda é a cena dela
        if (lp.lugar && lp.lugar === missaoLugarRef.current) continue
        const V = M.vias[j.via]
        const op = posicao(M, `pagina:${lp.id}`, lp.area, lp.u, lp.lado)
        if (op.via !== j.via) continue
        let d = op.u - j.u
        if (V.fechada) d = ((d % V.L) + V.L * 1.5) % V.L - V.L / 2
        if (d > -20 && d < 90) pp = lp.id
      }
      setAbertos((a) => (PAGINAS.every((lp) => a[lp.id] === ab[lp.id]) ? a : ab))
      setPaginaPerto(pp)
      // o posto (sempre aberto) e as bombas de rua
      const Vb = M.vias[j.via]
      let combustivel: string | null = null
      const oPosto = posicao(M, "lugar:posto", LUGARES.posto.area, LUGARES.posto.u, LUGARES.posto.lado)
      if (oPosto.via === j.via && pertoDe(Vb.L, !!Vb.fechada, oPosto.u, j.u)) combustivel = "posto"
      for (const bb of BOMBAS) { const ob = posicao(M, `bomba:${bb.id}`, bb.area, bb.u, bb.lado); if (ob.via === j.via && pertoDe(Vb.L, !!Vb.fechada, ob.u, j.u)) combustivel = bb.id }
      // (Kombi solar: ninguém abastece mais; o posto segue como lugar das missões)
      void combustivel
      setPertoComb(null)
      setDesligada(!!j.desligada)
      {
        // de patins: a flor do asfalto mais perto (a menos de 8 m) que ainda espera água
        const cb = combRef.current
        let fp: FlorAsfalto | null = null
        if (cb.patins && cb.aqui) { let dm = 10; for (const p of levaPos) { if (floresRef.current.has(p.f.id)) continue; const d = Math.hypot(p.x - cb.aqui.x, p.z - cb.aqui.z); if (d < dm) { dm = d; fp = p.f } } }
        // (B10) a mangueira de bombeiro: da Kombi, as flores a até 14 m da pista bebem sozinhas
        else if (mangueiraRef.current && cb.aqui && performance.now() - mangueiraT.current > 1800) {
          for (const p of levaPos) {
            if (floresRef.current.has(p.f.id) || Math.hypot(p.x - cb.aqui.x, p.z - cb.aqui.z) > 14) continue
            mangueiraT.current = performance.now()
            regarFlorRef.current(p.f)
            break
          }
        }
        setFlorPerto((a) => (a?.id === fp?.id ? a : fp))
      }
      {
        const cb = combRef.current
        setSeco(false)
        setPertoKombi(!!(cb.patins && cb.parada && cb.aqui && cb.aqui.distanceTo(cb.parada.pos) < 18))
      }

      if (pq.andando && hudMontanha.current) hudMontanha.current.textContent = String(Math.round(pq.v * 3.6))
    }, 300)
    return () => clearInterval(t)
  }, [M, regadas, levaPos])
  // ao sair da tela, guarda onde a Kombi estava
  useEffect(() => () => {
    const j = jogo.current
    RETOMAR = { via: M.vias[j.via].id, u: j.u, x: j.x, naVaga: j.naVaga, naSeg: j.naSeg }
  }, [M])
  const cinemaRef = useRef<Cinema>(cinema)
  useEffect(() => { cinemaRef.current = cinema }, [cinema])
  // respirar com o Núcleo na cola (Respirar.tsx): a Cena diz quando pode
  const respiroRef = useRef({ pode: false, feito: false })
  const [respirando, setRespirando] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setRespirando((x) => (x === respiroRef.current.pode ? x : respiroRef.current.pode)), 300)
    return () => clearInterval(t)
  }, [])
  // o clima (clima.ts): a chuva vem em pancadas. O vidro embaça só com a
  // Kombi PARADA na chuva (LU2CA, 14/10: "momentos bem específicos", tipo a
  // gasolina acabar no meio da chuva): uns 5 s parada e começam os dois
  // estágios; andando, desembaça sozinho. Uma vez por parada.
  const climaRef = useRef({ chove: false, k: 0 })
  const embacaRef = useRef(false)
  const [pedidoEmbaca, setPedidoEmbaca] = useState<number | null>(null)
  useEffect(() => {
    let paradoT = 0, disparou = false
    const t = setInterval(() => {
      const j = jogo.current as Jogo & { encostando?: boolean; noMapa?: boolean }, c = climaRef.current
      // (disco) voando/andando nas dunas sem pista embaixo também é deserto (nunca chove)
      const MDc = "disco" in M ? (M as MundoDisco) : null
      const deserto = M.vias[j.via]?.id === "deserto" || (!!MDc && !!j.voo && j.wx !== undefined && Math.hypot(j.wx, j.wz!) > 1300)
      c.chove = !deserto && chovendo(dia, horaRef.current)
      // parada de verdade: não conta quando a parada já tem outra coisa na tela
      const ocupado = !!cinemaRef.current || !!j.encostando || !!j.noMapa || respiroRef.current.pode
      const parado = c.chove && Math.abs(j.v) < 0.8 && !ocupado
      if (Math.abs(j.v) > 3) { paradoT = 0; disparou = false }
      paradoT = parado ? paradoT + 0.5 : 0
      if (paradoT >= 5 && !disparou) { disparou = true; setPedidoEmbaca(Date.now()) }
      embacaRef.current = parado
    }, 500)
    return () => clearInterval(t)
  }, [M, dia])
  const hudVel = useRef<HTMLSpanElement>(null)
  const hudMarcha = useRef<HTMLSpanElement>(null)
  const hudDrift = useRef<HTMLDivElement>(null)
  const hudProg = useRef<HTMLDivElement>(null)
  const hudSinal = useRef<HTMLDivElement>(null)
  const hudTurbo = useRef<HTMLDivElement>(null)
  const hudEnergia = useRef<HTMLDivElement>(null) // (disco) a energia do propulsor
  const hudRota = useRef<HTMLSpanElement>(null)
  const hudGarfoM = useRef<HTMLElement>(null)
  const hudGarfoT = useRef<HTMLSpanElement>(null)
  const hudParado = useRef<HTMLDivElement>(null)
  const hudAgulha = useRef<HTMLElement>(null)
  const hudOdo = useRef<HTMLElement>(null)
  const odo = useRef({ m: 0, t: 0 })
  const garfoEls = useRef<(HTMLDivElement | null)[]>([])
  const garfoChave = useRef("")
  const [garfo, setGarfo] = useState<Garfo | null>(null)
  useEffect(() => { onBifurca?.(!!garfo) }, [garfo, onBifurca])
  // etiquetas das placas: em cada área, quem tem missão em aberto lá (a
  // começar: onde está a coisa; começada: onde é o próximo passo)
  const tagsArea = useMemo(() => {
    const out: Partial<Record<FreqId, { nome: string; cor: string }[]>> = {}
    for (const e of ESTACOES) {
      const m = MISSOES[e.id]
      if (!m || save.objetos.includes(e.id) || !missao(e, nivel).ok) continue
      const area = save.pausas[e.id] !== undefined ? areaDoPasso(save, e.id) : areaDaMissao(e.id)
      ;(out[area] ??= []).push({ nome: e.personagem, cor: e.cor })
    }
    return out
  }, [save, nivel])

  // guia de rota (substitui o mapa): itens à frente, posição atualizada a cada quadro
  const [guia, setGuia] = useState<ItemGuia[]>([])
  const guiaChave = useRef("")
  const guiaEls = useRef(new Map<string, HTMLElement>())
  const mapaCarro = useRef<SVGCircleElement>(null)
  const hudTom = useRef<HTMLElement>(null)

  // falas em FILA: a ilha mostra uma de cada vez
  const [toasts, setToasts] = useState<{ id: number; de: string; texto: string; ms: number }[]>([])
  useEffect(() => {
    const t0 = toasts[0]
    if (!t0) return
    const t = setTimeout(() => setToasts((l) => l.filter((x) => x.id !== t0.id)), t0.ms)
    return () => clearTimeout(t)
  }, [toasts])
  const [popup, setPopup] = useState<{ id: number; txt: string; cor: string } | null>(null)
  // sinal pego: nada de texto no meio da tela — o cartão da rádio pisca e,
  // nos lances grandes (quase, voou), uma etiqueta pequena sai do medidor
  const [tag, setTag] = useState<{ id: number; txt: string; cor: string } | null>(null)
  const radioBtn = useRef<HTMLButtonElement>(null)
  // passando por uma estação: o nome dela aparece no cartão da rádio
  const [passando, setPassando] = useState<{ id: EstacaoId; t: number } | null>(null)
  const [travou, setTravou] = useState<Frequencia | null>(null)
  const [freq, setFreq] = useState<FreqId>(() => {
    const v = M.vias[jogo0.via]
    return v.tipo === "circuito" ? v.t : v.de ?? v.t
  })
  const [viaAtual, setViaAtual] = useState(() => jogo0.via)
  // (disco) no box da central: o elevador troca de linha (de andar)
  const discoM = "disco" in M ? (M as MundoDisco) : null
  const ehDisco = !!discoM
  // (LU2CA 20/10) os atos: só as pistas disponíveis acendem o neon; as feitas
  // ficam acesas pra sempre; o resto, apagado (a torre é sempre acesa)
  const luzPistas = useMemo(() => (discoM ? luzDasPistas(pistasFeitas(save.objetos)) : null), [discoM, save.objetos])
  const viaApagada = useMemo(() => {
    if (!discoM || !luzPistas) return null
    return discoM.vias.map((_, vi) => { const f = discoM.info[vi]; return !!f && f.pista >= 0 && luzPistas[discoM.pistas[f.pista].nome] === "apagada" })
  }, [discoM, luzPistas])
  // (21/10, o mapa que ensina) as vias das pistas disponíveis (pulsam no mapa) e as da pista em foco
  const viaAberta = useMemo(() => {
    if (!discoM || !luzPistas) return null
    return discoM.vias.map((_, vi) => { const f = discoM.info[vi]; return !!f && f.pista >= 0 && luzPistas[discoM.pistas[f.pista].nome] === "aberta" })
  }, [discoM, luzPistas])
  const viaFoco = useMemo(() => {
    const nome = pistaFoco ? PISTAS.find((p) => p.id === pistaFoco)?.faixa : null
    if (!discoM || !nome) return null
    return discoM.vias.map((_, vi) => { const f = discoM.info[vi]; return !!f && f.pista >= 0 && discoM.pistas[f.pista].nome === nome })
  }, [discoM, pistaFoco])
  // (disco) na torre (as espirais): o óculos não precisa do painel de missão
  const naCentral = !!discoM && (naTorre(discoM.info[viaAtual]) || naTorreDaPonta(discoM.info[viaAtual]))
  // a próxima saída da espiral (no fim do trecho onde a Kombi está)
  const placaEspiral = (() => {
    if (!discoM || discoM.info[viaAtual]?.parte !== "sobe") return null
    const prox = (M as MundoDisco).ligacoes.saidas[M.vias[viaAtual].rede!.para] ?? []
    const vi = prox.find((v) => discoM.info[v]?.parte === "saida")
    if (vi === undefined || viaApagada?.[vi]) return null
    const p = discoM.pistas[discoM.info[vi].pista]
    return { nome: p.nome, cor: p.cor, lado: discoM.ladoSaida.get(vi) ?? 1 }
  })()
  // (disco) o óculos no lugar do celular: ligado por padrão, o botão liga e desliga
  const [oculosLigado, setOculos] = useState(() => { try { return localStorage.getItem("cn-oculos") !== "off" } catch { return true } })
  // (LU2CA 20/10) antes de a D-Bee dar o holo, ele não existe: nem o óculos no
  // canto, nem o turbo e o propulsor (a Kombi velha ainda não tem)
  const holoOk = !historia || historia.holo
  const oculos = oculosLigado && holoOk
  useEffect(() => { input.current.semHolo = !!discoM && !holoOk }, [discoM, holoOk])
  // (B18) antes da oficina do subúrbio a Kombi não voa (nem tem turbo)
  const voaNao = !!discoM && semVoo(historia)
  useEffect(() => { input.current.semVoo = voaNao }, [voaNao])
  // (B10) as modificações compradas com água valem na física (o propulsor, o turbo)
  const mods = useMemo(() => historia?.mods ?? [], [historia?.mods])
  useEffect(() => { input.current.mods = mods; mangueiraRef.current = mods.includes("mangueira") }, [mods])
  const [perfil, setPerfil] = useState(false)
  // (LU2CA 21/10) celular (em pé ou deitado): os widgets do holo numa ilha só
  const [holoCelular, setHoloCelular] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 600px), (max-height: 480px)").matches)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px), (max-height: 480px)")
    const f = () => setHoloCelular(mq.matches)
    mq.addEventListener("change", f)
    return () => mq.removeEventListener("change", f)
  }, [])
  const [oficinaAberta, setOficinaAberta] = useState(false)
  const alternarOculos = () => setOculos((o) => { try { localStorage.setItem("cn-oculos", o ? "off" : "on") } catch {} ; chiadoCurto(); return !o })
  // (o holo) o clima de onde a Kombi está: a pista (o nome dela), a torre ou,
  // voando sem pista embaixo, o deserto (que nunca chove)
  const lerClima = useCallback((): Clima => {
    const j = jogo.current, MD = "disco" in M ? (M as MundoDisco) : null
    const f = MD?.info[j.via]
    const deserto = MD ? !!j.voo && j.wx !== undefined && !MD.pousar(j.wx, j.wz!, j.y, 0, 0) : M.vias[j.via]?.id === "deserto"
    const regiao = deserto ? "deserto" : f && f.pista >= 0 ? MD!.pistas[f.pista].nome : f && f.torre === 0 ? "a central" : f ? "a torre" : "a cidade"
    return { chove: !deserto && chovendo(dia, horaRef.current), deserto, regiao, hora: horaRef.current }
  }, [M, dia])
  // o "?" do holo: tocar numa coisa diz o que ela é
  const [ajuda, setAjuda] = useState(false)
  const sairAjuda = useCallback(() => setAjuda(false), [])
  // o clique semi-longo do turbo e do propulsor: segurou SEMI_LONGO ms, aciona
  const SEMI_LONGO = 260
  const armados = useRef(new Map<HTMLElement, number>())
  const armar = (el: HTMLElement, f: () => void) => {
    el.classList.add("is-armando")
    armados.current.set(el, window.setTimeout(() => { armados.current.delete(el); el.classList.remove("is-armando"); el.classList.add("is-ativo"); f(); vib(14) }, SEMI_LONGO))
  }
  const desarmar = (el: HTMLElement) => {
    const t = armados.current.get(el)
    if (t !== undefined) { clearTimeout(t); armados.current.delete(el) }
    el.classList.remove("is-armando", "is-ativo")
  }
  const [faixa, setFaixa] = useState("")
  // tocando um vinil da Kombi (não uma faixa da rádio): o cartão diz isso
  const discoRef = useRef(false)
  // câmera: de fora (atrás da Kombi) ou de dentro (primeira pessoa). Lembra
  const [dentro, setDentro] = useState(() => { try { return localStorage.getItem("cn-linha-cam") === "dentro" } catch { return false } })
  const dentroRef = useRef(dentro)
  // a troca é um corte suave: a tela apaga, a câmera muda no escuro e volta,
  // com um chiado de rádio quase inaudível por baixo
  const fadeCam = useRef<HTMLDivElement>(null)
  const trocando = useRef(false)
  const [usouCam, setUsouCam] = useState(() => { try { return localStorage.getItem("cn-linha-cam") !== null } catch { return true } })
  const irDePatins = () => {
    fadeCam.current?.classList.add("is-on")
    setTimeout(() => {
      if (dentroRef.current) { dentroRef.current = false; setDentro(false) }
      combRef.current.patins = true; combRef.current.parada = null
      jogo.current.v = 0; jogo.current.encostando = false
      setDePatins(true)
      setTimeout(() => fadeCam.current?.classList.remove("is-on"), 120)
    }, 350)
  }
  // sair da Kombi a qualquer hora (LU2CA 16/10): ela fica estacionada, você
  // segue de patins; perto dela de novo, "voltar pra Kombi"
  const entrarNaKombi = () => {
    fadeCam.current?.classList.add("is-on")
    setTimeout(() => {
      const c = combRef.current, p = c.parada, j = jogo.current
      if (p) { const mudou = j.via !== p.via; j.via = p.via; j.u = p.u; j.x = p.x; if (mudou) evs.current?.via(p.via) }
      j.v = 0; j.vx = 0; j.encaixar = true
      c.patins = false; c.parada = null
      setDePatins(false); setPertoKombi(false)
      setTimeout(() => fadeCam.current?.classList.remove("is-on"), 150)
    }, 300)
  }
  const voltarComGalao = () => {
    if (!onAbastecer?.("despejar")) { setMsgPatins("sem neon pro galão (10)"); setTimeout(() => setMsgPatins(""), 2500); return }
    fadeCam.current?.classList.add("is-on")
    setMsgPatins("voltando pra Kombi com o galão…")
    setTimeout(() => {
      const c = combRef.current, p = c.parada, j = jogo.current
      if (p) { const mudou = j.via !== p.via; j.via = p.via; j.u = p.u; j.x = p.x; if (mudou) evs.current?.via(p.via) }
      j.v = 0; j.vx = 0; j.encostando = false; j.encaixar = true
      c.patins = false; c.parada = null
      setDePatins(false); setMsgPatins("")
      setTimeout(() => fadeCam.current?.classList.remove("is-on"), 200)
    }, 1400)
  }
  // (disco, a missão da Nectar, LU2CA 19–20/10) a Kombi quebra: patins; regar 3
  // flores; o galão que a D-Bee deixou no posto (ela não fala: um bilhete); a oficina
  const nectarPasso = discoM && historia?.fase === "nectar" ? historia.nectar ?? null : null
  const kombiQuebrada = nectarPasso === "quebra" || nectarPasso === "regar" || nectarPasso === "galao"
  const [pertoPostoNectar, setPertoPostoNectar] = useState(false)
  useEffect(() => {
    if (nectarPasso !== "galao") return
    const t = setInterval(() => {
      const cb = combRef.current, pp = poses.posto
      setPertoPostoNectar(!!(cb.patins && cb.aqui && Math.hypot(cb.aqui.x - pp.vaga.x, cb.aqui.z - pp.vaga.z) < 22))
    }, 300)
    return () => clearInterval(t)
  }, [nectarPasso, poses])
  const pegarGalaoDbee = () => {
    fadeCam.current?.classList.add("is-on")
    setMsgPatins("o galão. um bilhete colado: \"achei petróleo. — D\"")
    setTimeout(() => {
      const c = combRef.current, p = c.parada, j = jogo.current
      if (p) { const mudou = j.via !== p.via; j.via = p.via; j.u = p.u; j.x = p.x; if (mudou) evs.current?.via(p.via) }
      j.v = 0; j.vx = 0; j.encostando = false; j.encaixar = true
      c.patins = false; c.parada = null
      setDePatins(false); setMsgPatins("")
      onHistoriaRef.current?.("galao")
      setTimeout(() => fadeCam.current?.classList.remove("is-on"), 200)
    }, 2200)
  }
  const trocarCamera = useCallback(() => {
    if (trocando.current) return
    trocando.current = true
    setUsouCam(true)
    chiadoCamera()
    fadeCam.current?.classList.add("is-on")
    setTimeout(() => {
      setDentro((d) => {
        const n = !d
        dentroRef.current = n
        try { localStorage.setItem("cn-linha-cam", n ? "dentro" : "fora") } catch {}
        return n
      })
      setTimeout(() => {
        fadeCam.current?.classList.remove("is-on")
        trocando.current = false
      }, 90)
    }, 260)
  }, [])
  const [portal, setPortal] = useState<{ id: EstacaoId; t: number } | null>(null)
  const [bairro, setBairro] = useState<{ id: FreqId; t: number } | null>(null)
  const [painel, setPainel] = useState(false)
  const [chegou, setChegou] = useState<Stats | null>(null)
  const [dica, setDica] = useState(true)
  const [prox, setProx] = useState(() => proximaFreq(save.sinal))
  const [nLib, setNLib] = useState(() => freqsLiberadas(save.sinal).length)
  const sinalRef = useRef(save.sinal)
  const freqRef = useRef(freq)
  useEffect(() => { freqRef.current = freq }, [freq])
  const corRadio = useRef(freqDe("linha").cor)
  useEffect(() => { corRadio.current = freqDe(freq).cor }, [freq])
  const nLibRef = useRef(nLib)
  useEffect(() => { nLibRef.current = nLib }, [nLib])
  const toastId = useRef(0)
  // turbo: nível cúmplice, ou o relógio da Notti (recompensa da missão)
  // o turbo é de todo mundo desde o começo (06/10); os anéis carregam
  const temTurbo = true

  useEffect(() => {
    let vivo = true
    document.fonts.load('40px "Outward"').finally(() => vivo && setFonte(true))
    const t = setTimeout(() => setDica(false), 5000)
    return () => { vivo = false; clearTimeout(t) }
  }, [])

  const falar = useCallback((de: string, texto: string, ms = 3600) => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-3), { id, de, texto, ms }])
    gota(6)
  }, [])

  // (disco, a história) o deserto: chegar na casa; nas dunas, a D-Bee pelo rádio
  // (curto, na hora certa) e pousar numa pista = chegou na cidade
  const fase = discoM ? historia?.fase ?? null : null
  // (B18) o começo novo (o subúrbio no chão); quem já estava nas dunas antes dele segue igual
  const novoComeco = true
  useEffect(() => {
    if (fase !== "casa" && fase !== "dunas" && fase !== "subir") return
    const ditas = new Set<string>()
    let t = 0, avisou = false
    const diz = (q: (typeof FALAS_DUNAS)[number]["quando"]) => {
      if (ditas.has(q)) return
      ditas.add(q)
      ;(novoComeco ? FALAS_DUNAS_SUB : FALAS_DUNAS).filter((f) => f.quando === q).forEach((f, k) => setTimeout(() => falar(f.de, f.texto, 5200), k * 5600))
    }
    const iv = setInterval(() => {
      const j = jogo.current
      t += 0.3
      if (fase === "casa") {
        if (avisou || !j.voo || j.ar || j.wx === undefined) return
        // chegou na porta: a Kombi para sozinha (a cena começa)
        if (Math.hypot(j.wx - CASA.x, j.wz! - CASA.z) < RAIO_CASA + Math.min(20, Math.abs(j.v) * 0.3)) { avisou = true; j.v = 0; onHistoriaRef.current?.("casa") }
        return
      }
      // (B18) subindo pra cidade: pousou numa pista = chegou lá em cima
      if (fase === "subir") { if (!j.voo && !avisou) { avisou = true; onHistoriaRef.current?.("subiu") } return }
      // as dunas: no começo novo, chegar no subúrbio (no chão, embaixo das pistas)
      if (novoComeco) {
        if (j.wx !== undefined && Math.hypot(j.wx - SUBURBIO.x, j.wz! - SUBURBIO.z) < SUBURBIO.r && !avisou) { avisou = true; onHistoriaRef.current?.("cidade"); return }
      } else if (!j.voo) { if (!avisou) { avisou = true; onHistoriaRef.current?.("cidade") } return }
      const r = Math.hypot(j.wx ?? 0, j.wz ?? 0)
      if (t > 2) diz("inicio")
      if (t > 12 && j.drift) diz("drift")
      if (t > 22 && !ditas.has("drift") && !j.ar) diz("drift")
      if (j.carga >= 1) diz("turbo")
      if (!novoComeco && (t > 40 || r < 1700)) diz("voo")
      if (r < 1350) diz("cidade")
      if (r < 1050) diz("perto")
      if (j.wx !== undefined && ROBOS.some((b) => b.vivo && Math.hypot(b.x - j.wx!, b.z - j.wz!) < 160)) diz("robo")
    }, 300)
    return () => clearInterval(iv)
  }, [fase, falar, novoComeco])
  // (B18) chegou num lugar do chão do subúrbio (o bar, a oficina, o palco)
  useEffect(() => {
    if (!alvoChao || pausado) return
    let dentro = false
    const iv = setInterval(() => {
      const j = jogo.current, l = CHAO_LUGARES[alvoChao]
      if (!j.voo || j.wx === undefined) { dentro = false; return }
      const d = Math.hypot(j.wx - l.x, j.wz! - l.z)
      if (d > RAIO_CHAO * 3) dentro = false
      if (!dentro && d < RAIO_CHAO && !j.ar) { dentro = true; j.v = 0; onHistoriaRef.current?.(`chao:${alvoChao}`) }
    }, 250)
    return () => clearInterval(iv)
  }, [alvoChao, pausado])
  // (B12) espatifou um robô no deserto: as peças voam; um prêmio pequeno (água: a tecnologia dele)
  const roboRef = useRef<() => void>(() => {})
  useEffect(() => {
    roboRef.current = () => {
      if ("disco" in M) setAguaPend((x) => x + 2)
      setPopup({ id: Math.random(), txt: "+2 água", cor: "#4fc3ff" })
      onHistoriaRef.current?.("robo")
    }
  }, [M])
  // (a Nectar) uns segundos rodando depois do show do bar, a Kombi velha pifa:
  // fumaça, para, e ele desce de patins (o patins e as manobras entram aqui)
  const quebrouRef = useRef(false)
  useEffect(() => {
    if (nectarPasso !== "quebra" || pausado || quebrouRef.current) return
    const t = setTimeout(() => {
      quebrouRef.current = true
      const j = jogo.current
      j.v = 0; j.shake = 1; j.flash = 0.4
      vib([60, 40, 120])
      falar("222 FM", "essa kombi tossiu. motor velho a gasolina, num mundo sem gasolina", 4800)
      setTimeout(() => { irDePatins(); falar("222 FM", "de patins então. segura o espaço: o jato. no ar, vira: gira", 5600) }, 1500)
      onHistoriaRef.current?.("quebrou")
    }, 9000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nectarPasso, pausado])
  // a noite repete: de tempos em tempos a 222 estranha junto com a pessoa
  useEffect(() => {
    if (!noiteRepete) return
    const frases = ["a mesma noite. de novo.", "tá tudo tão bonito. tá tudo tão vazio.", "alguém ainda tá no bar.", "vc já ouviu essa música. n ouviu?"]
    let k = 0
    const iv = setInterval(() => { if (!cinemaRef.current) falar("222 FM", frases[k++ % frases.length]) }, 70000)
    return () => clearInterval(iv)
  }, [noiteRepete, falar])
  // ── SOM: rádio OU toca-discos (nunca os dois). O disco é analógico:
  // nada interrompe; o rádio é a 222 (locutor, Núcleo, estreias, sintonia)
  const [aparelho, setAparelho] = useState<Fonte>(fonteSom.get())
  const fonteRef = useRef(aparelho)
  useEffect(() => fonteSom.ouvir((f) => { fonteRef.current = f; setAparelho(f) }), [])
  const [discoAgora, setDiscoAgora] = useState<{ src: string | null; tocando: boolean }>({ src: disco.src, tocando: disco.tocando })
  useEffect(() => disco.ouvir(setDiscoAgora), [])
  useEffect(() => { discoRef.current = discoAgora.tocando }, [discoAgora.tocando])
  const [estante, setEstante] = useState(false)
  // o que tá tocando no toca-discos: "faixa · disco"
  const discoInfo = (() => {
    for (const d of discosDaKombi(save.discos ?? [])) {
      const f = d.faixas.find((x) => x.src === discoAgora.src)
      if (f) return { titulo: `${f.titulo} · ${d.titulo}` }
    }
    return VINIS.find((v) => v.src === discoAgora.src) ?? null
  })()

  // mensagem que vem de fora (o grupo na chegada): entra na ilha
  const introRef = useRef(intro)
  useEffect(() => { introRef.current = intro }, [intro])
  useEffect(() => {
    if (fala) falar(fala.de, fala.texto, 3000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fala?.id])

  // TUTORIAL do som: o jogo ensina rádio × toca-discos na hora certa
  const temMusicaNoRadio = save.objetos.length > 0
  useEffect(() => {
    if (pausado || cinemaRef.current || intro || (historia && historia.fase !== "livre")) return
    if (!dicas.includes("disco-1") && !temMusicaNoRadio && aparelho !== "disco") {
      const t = setTimeout(() => {
        onDica?.("disco-1")
        falar("D-Bee", "a 222 tá fora do ar. mas tem um toca-discos aqui dentro, analógico, o núcleo não alcança. aperta DISCO lá embaixo e escolhe um", 10000)
      }, 4000)
      return () => clearTimeout(t)
    }
    if (!dicas.includes("radio-1") && temMusicaNoRadio && aparelho !== "radio") {
      const t = setTimeout(() => {
        onDica?.("radio-1")
        falar("222 FM", "a 222 voltou com uma música que vc ganhou. aperta RÁDIO lá embaixo (o disco para: os dois juntos não dá)", 10000)
      }, 3000)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausado, temMusicaNoRadio, aparelho, dicas.length, intro])
  // ganhou música nova ouvindo disco: o disco não para; só avisa
  const nObj = useRef(save.objetos.length)
  useEffect(() => {
    if (save.objetos.length > nObj.current && fonteRef.current !== "radio") {
      const e = getEstacao(save.objetos[save.objetos.length - 1])
      falar("222 FM", `estreia na 222: ${e.faixa}. liga o RÁDIO pra ouvir`, 7000)
    }
    nObj.current = save.objetos.length
  }, [save.objetos, falar])

  // rádio: toca a frequência do lugar onde você está
  // rádio: a programação do lugar onde você está (programa.ts) — sacola
  // sem repetição, estreias e vinhetas do locutor entre as músicas
  const proxFaixa = useRef<(id: FreqId) => void>(() => {})
  const tocarProxima = useCallback((id: FreqId, vol = 1) => {
    if (fonteRef.current !== "radio") return
    if (caidoRef.current || foraRef.current) { player.pausar(); setFaixa(foraRef.current ? "a 222 saiu do ar" : ""); return }
    const a = alvoRef.current
    const carregando = a?.t === "entrega" ? MISSOES[a.missao]?.busca?.nome ?? null : null
    const p = proxima(id, save.objetos, { nome: save.nome, objetos: save.objetos, carregando })
    if (!p) { setFaixa(""); return }
    const tocar = () => {
      setFaixa(p.faixa.titulo)
      player.tocar(p.faixa.src, () => proxFaixa.current(freqRef.current), vol)
    }
    if (!p.vinheta) return tocar()
    // entre uma música e outra: um chiado de dial e o locutor (ou o Núcleo)
    chiadoCurto()
    falar(p.vinheta.de, p.vinheta.texto)
    if (p.estreia) {
      jogo.current.flash = 0.7
      confeteRef.current?.(getEstacao(p.estreia).cor, 70)
    }
    setTimeout(tocar, 900)
     
  }, [save.objetos, save.nome, falar])
  useEffect(() => { proxFaixa.current = (id) => tocarProxima(id) }, [tocarProxima])
  useEffect(() => {
    // liga o rádio ao entrar no carro (efeito externo: áudio)
     
    // na abertura (cinema) quem manda no som é a chegada: vinil, depois o
    // rádio procurando a frequência
    // voltando de um lugar com a música rolando (abafada): segue a mesma
    if (!cinemaRef.current && !player.tocando) tocarProxima(freqRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confeteRef = useRef<((cor: string, n: number) => void) | null>(null)

  // celular aberto → estrada congela; fechou → a rádio volta (uma conversa
  // pode ter tocado um áudio no lugar dela) e as teclas voltam a valer
  // caiu com a estrada aberta: a rádio sai do ar na hora (efeito externo: áudio)
  useEffect(() => {
    if (caido || foraDoAr) player.pausar()
  }, [caido, foraDoAr])
  // a 222 voltou ao ar (o fim do ep. 3): a rádio religa sozinha (efeito externo: áudio)
  const foraAnt = useRef(foraDoAr)
  useEffect(() => {
    if (foraAnt.current && !foraDoAr) proxFaixa.current(freqRef.current)
    foraAnt.current = foraDoAr
  }, [foraDoAr])
  const cacadoRef = useRef(cacado)
  useEffect(() => { cacadoRef.current = cacado }, [cacado])
  const hudCacaBarra = useRef<HTMLDivElement>(null)
  const sirene = useRef<HTMLDivElement>(null)
  const [cacando, setCacando] = useState(false)
  const [estrelas, setEstrelas] = useState(0)
  const limitadoRef = useRef(limitado)
  useEffect(() => { limitadoRef.current = limitado }, [limitado])
  const celularRef = useRef(celular)
  useEffect(() => { celularRef.current = celular }, [celular])
  const pausadoRef = useRef(pausado)
  useEffect(() => {
    pausadoRef.current = pausado
    if (pausado) {
      input.current.esq = input.current.dir = input.current.freio = false
      toques.current.clear()
      return
    }
    // a música do lugar que ficou pausada continua de onde parou; se uma
    // conversa tocou outra coisa, entra a próxima da programação
    if (caidoRef.current || cinemaRef.current) return
    if (ehDoLugar(freqRef.current, player.src, save.objetos)) {
      if (!player.tocando) player.tocar(player.src!, () => proxFaixa.current(freqRef.current))
      setFaixa(TODAS_FAIXAS.find((f) => f.src === player.src)?.titulo ?? "")
    }
    else tocarProxima(freqRef.current)
    player.volume(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausado])
  // "ir de kombi" pra uma estação pelo mapa do celular: vira o destino
  // a 222 caiu: a missão da vez espera, o destino some (a antena é o alvo)
  const [caidoAnt, setCaidoAnt] = useState(caido)
  if (caido !== caidoAnt) {
    setCaidoAnt(caido)
    if (caido) setDestino(null)
  }
  const [destinoAnt, setDestinoAnt] = useState(destinoInicial)
  if (destinoInicial !== destinoAnt) {
    setDestinoAnt(destinoInicial)
    if (destinoInicial) setDestino(destinoInicial)
  }
  const descerAqui = (id: EstacaoId, st: Stats) => {
    setChegou(null)
    setPortal(null)
    setDestino(null)
    jogo.current.chegando = false
    jogo.current.parado = false
    onDescer(id, st)
  }
  const flashEl = useRef<HTMLDivElement>(null)
  const hudFreq = useRef<HTMLSpanElement>(null)

  // minimapa: a cidade inteira vista de cima
  // minimapa: SÓ a estrada em que você está (as placas guiam o resto)
  const minimapa = useMemo(() => {
    const proj = M.vias.map((v) => {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
      for (let i = 0; i < v.n; i += 4) {
        minX = Math.min(minX, v.px[i]); maxX = Math.max(maxX, v.px[i])
        minZ = Math.min(minZ, v.pz[i]); maxZ = Math.max(maxZ, v.pz[i])
      }
      const esc = Math.min(150 / Math.max(1, maxX - minX), 54 / Math.max(1, maxZ - minZ))
      const ox = 80 - ((maxX - minX) * esc) / 2
      const oz = 30 - ((maxZ - minZ) * esc) / 2
      const P = (i: number): [number, number] => [ox + (v.px[i] - minX) * esc, oz + (v.pz[i] - minZ) * esc]
      let d = ""
      for (let i = 0; i < v.n; i += 6) {
        const [x, y] = P(i)
        d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
      }
      const [x, y] = P(v.fechada ? 0 : v.n - 1)
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`
      return { d, P, cor: distritoDe(v.t).luz[0] }
    })
    return {
      proj,
      ponto: (vi: number, u: number) => {
        const v = M.vias[vi]
        return proj[vi].P(Math.max(0, Math.min(v.n - 1, Math.floor(u / PASSO))))
      },
    }
  }, [M])

  const onVagaRef = useRef(onVaga)
  useEffect(() => { onVagaRef.current = onVaga }, [onVaga])
  // eventos que a cena dispara
  const evs = useRef<Evs>(null as unknown as Evs)
  useEffect(() => {
    evs.current = {
      anel: () => {
        setAneis((a) => {
          const total = a.total + 1
          return { total, viagens: a.viagens + (total % 100 === 0 ? 2 : 0) }
        })
        // (LU2CA 19/10) quanto mais flores, mais água aparece: a cada 5 flores
        // regadas pela cidade, cada gota vale uma a mais (RASCUNHO da regra)
        if ("disco" in M) setAguaPend((x) => x + 1 + Math.floor(floresRef.current.size / 5))
      },
      vaga: (id) => onVagaRef.current?.(id),
      // na chegada a cidade fica quieta: só o grupo fala
      falar: (de, t) => { if (!introRef.current) falar(de, t) },
      popup: (txt, cor) => setPopup({ id: Math.random(), txt, cor }),
      sinal: (n, rotulo, cor) => {
        const antes = sinalRef.current
        sinalRef.current += n
        jogo.current.st.sinal += n
        const r = radioBtn.current
        if (r) { r.classList.remove("is-pega"); void r.offsetWidth; r.classList.add("is-pega") }
        if (n > 1) setTag({ id: Math.random(), txt: rotulo, cor })
        const p = proximaFreq(antes)
        if (p && sinalRef.current >= p.custo) {
          // rádio nova: a saída pro lugar dela abre na próxima bifurcação
          jogo.current.flash = 1
          confeteRef.current?.(p.cor, 160)
          vib([30, 40, 30, 40, 120])
          setTravou(p)
          setNLib(freqsLiberadas(sinalRef.current).length)
          setTimeout(() => setTravou(null), 4200)
          if (!introRef.current) setTimeout(() => falar("D-Bee", `vc achou a ${p.freq}. o núcleo odeia essa`), 1800)
        }
        onSinal(sinalRef.current)
        setProx(proximaFreq(sinalRef.current))
      },
      via: (i) => {
        const v = M.vias[i]
        setViaAtual(i)
        onAreaRef.current?.(v.id)
        // (disco) a música é a da pista (toca-discos): a rádio não sintoniza sozinha
        if ("disco" in M) return
        // no mapa novo cada rua é uma via: só conta como chegar num bairro quando o bairro muda
        if (v.tipo === "rua") { if (areaRua.current === v.t) return; areaRua.current = v.t }
        else if (v.tipo !== "circuito") return
        setBairro({ id: v.t, t: Date.now() })
        flashEl.current?.style.setProperty("--cor", freqDe(v.t).cor)
        vib([15, 30, 15])
        if (freqRef.current !== v.t) {
          setFreq(v.t)
          freqRef.current = v.t
          tocarProxima(v.t)
        }
        player.volume(1)
        onSinal(sinalRef.current, v.t)
      },
      radio: (id) => {
        setFreq(id)
        freqRef.current = id
        tocarProxima(id, 0.2)
        gota(4)
      },
      estrelas: (n) => setEstrelas(n),
      caca: (e) => {
        if (e === "comecou") {
          setCacando(true)
          // (rascunho da voz do Núcleo: batidas no trânsito)
          falar("NÚCLEO", cacadoRef.current ? "veículo transportando conteúdo não licenciado. aguarde a otimização ✓" : "colisões registradas. veículo em processo de otimização ✓")
          vib([60, 40, 60])
        } else if (e === "pego") {
          setCacando(false)
          jogo.current.flash = 0.8
          jogo.current.shake = 1.2
          vib([90, 40, 160])
          // (LU2CA 19/10) a polícia leva a quinta parte da sua água
          const perda = "disco" in M ? Math.floor(aguaRef.current / 5) : 0
          if (perda > 0) onAguaRef.current?.(-perda)
          setPopup({ id: Math.random(), txt: perda > 0 ? `a polícia levou ${perda} de água` : "conteúdo apreendido", cor: "#e6f0ff" })
          if (cacadoRef.current) {
            falar("NÚCLEO", "conteúdo apreendido e devolvido à origem. obrigado pela colaboração ✓")
            onApreendido?.()
          } else falar("NÚCLEO", "veículo identificado. desta vez, só um aviso ✓")
        } else if (e === "despistou") {
          setCacando(false)
          confeteRef.current?.("#2fe8ff", 60)
          // (LU2CA 20/10) a fuga dá popularidade; a fuga grande (o helicóptero
          // despistado na velocidade) dá muito mais
          const grande = !!jogo.current.fugaGrande
          jogo.current.fugaGrande = false
          onFugaRef.current?.(grande ? 6 : 2)
          setPopup({ id: Math.random(), txt: grande ? "despistou o helicóptero · +6 popularidade" : "despistou · +2 popularidade", cor: "#2fe8ff" })
          falar("222 FM", grande ? "ninguém alcança essa kombi. a cidade inteira viu" : "a kombi despistou o núcleo. respeito")
          evs.current.sinal(5, "despistou · +5", "#2fe8ff")
        } else if (e === "perdeu") {
          setCacando(false)
          falar("222 FM", "trocou de rua, eles perderam o rastro. por enquanto")
        } else setCacando(false)
      },
      pegar: (chave) => {
        if (chave === "antena") {
          onReligar?.()
          jogo.current.flash = 1
          jogo.current.impacto = 1
          confeteRef.current?.("#2fe8ff", 160)
          vib([40, 30, 40, 30, 120])
          setPopup({ id: Math.random(), txt: "222 FM no ar", cor: "#2fe8ff" })
          caidoRef.current = false
          setTimeout(() => {
            tocarProxima(freqRef.current)
            falar("222 FM", "voltamos. o núcleo derrubou a gente e alguém religou na mão. essa vai pra você")
          }, 600)
          return
        }
        const a = alvoRef.current
        if (!a || a.t !== "busca") return
        const k = Number(chave.split(":")[1])
        const e = getEstacao(a.missao)
        onPegar?.(chave)
        confeteRef.current?.(e.cor, 90)
        jogo.current.flash = 0.6
        vib([30, 40, 30, 40, 90])
        setPopup({ id: Math.random(), txt: a.faltam.length > 1 ? `${a.busca.nome} · ${a.busca.em.length - a.faltam.length + 1}/${a.busca.em.length}` : `${a.busca.nome} ✓`, cor: e.cor })
        const fala = a.busca.pega[Math.min(k, a.busca.pega.length - 1)]
        setTimeout(() => falar(fala.de, fala.texto), 700)
        // o silêncio do mirante: a rádio some de verdade por uns segundos
        if (a.busca.item === "silencio") {
          player.volume(0)
          setTimeout(() => player.volume(1), 4000)
        }
        if (a.faltam.length <= 1) setTimeout(() => falar(e.personagem, `agora traz aqui. estação ${e.n}, segue a coluna de luz`), 4200)
      },
      portal: (id) => {
        if ((id === alvoRef.current?.missao || id === destinoRef.current) && !save.objetos.includes(id)) setPortal({ id, t: Date.now() })
        else setPassando({ id, t: Date.now() })
        // passar por uma estação é uma nota no tom da música, não festa
        gota(getEstacao(id).n + 1)
      },
      chegou: () => setChegou({ ...jogo.current.st, tempo: jogo.current.tempo }),
      piloto: (on) => setPiloto(on),
      volta: (t) => {
        falar("Notti", `volta em ${t.toFixed(1)}s!!`)
        onVolta?.(t)
      },
      hud: (j) => {
        const kmh = Math.abs(j.v) * 3.6 * K_VEL
        if (hudVel.current) hudVel.current.textContent = String(Math.round(kmh))
        if (hudAgulha.current) hudAgulha.current.style.transform = `rotate(${-135 + Math.min(1, kmh / 140) * 270}deg)`
        // o odômetro: quanto a Kombi andou nesta viagem
        const agora = performance.now()
        if (odo.current.t) odo.current.m += Math.abs(j.v) * Math.min(0.2, (agora - odo.current.t) / 1000)
        odo.current.t = agora
        if (hudOdo.current) hudOdo.current.textContent = (odo.current.m / 1000).toFixed(1).padStart(6, "0")
        // o ponteiro do combustível (na abertura: a reserva até secar)
        const ab = aberturaRef.current
        const nivelComb = ab.ativa ? (ab.semGas ? 0 : 0.06) : combRef.current.tanque
        hudComb.current?.setAttribute("transform", `rotate(${-80 + nivelComb * 160} 30 30)`)
        hudCombBox.current?.classList.toggle("is-reserva", nivelComb < 0.1)
        if (!ab.ativa && agora - combRef.current.t > 3000) { combRef.current.t = agora; onTanqueRef.current?.(combRef.current.tanque) }
        if (agora - horaT.current > 10000) { horaT.current = agora; onHoraRef.current?.(horaRef.current) }
        // computador: parado sem acelerar → mostra como anda
        hudParado.current?.classList.toggle("is-on", !toqueTela && !dentroRef.current && Math.abs(j.v) < 0.5 && !j.chegando && !input.current.gas && j.tempo > 1.5)
        if (hudMarcha.current) {
          const pct = j.v / VMAX
          let m = 1
          while (m < MARCHAS.length - 1 && pct > MARCHAS[m]) m++
          hudMarcha.current.textContent = j.v < -0.3 ? "R" : j.drift ? "DRIFT" : `${m}ª`
        }
        if (hudDrift.current) {
          const em = j.dPts > 0, msg = j.tempo < j.dMsgT ? j.dMsg : ""
          // (a manobra no ar: "★nome|+pontos")
          const man = !em && msg.startsWith("★") ? msg.slice(1).split("|") : null
          hudDrift.current.classList.toggle("is-on", em || !!msg)
          hudDrift.current.classList.toggle("is-ganhou", !em && (msg.startsWith("+") || !!man))
          hudDrift.current.classList.toggle("is-perdeu", !em && (msg.startsWith("bateu") || msg === "caiu torto"))
          const [b, i, sm] = hudDrift.current.children as unknown as HTMLElement[]
          b.textContent = em ? Math.round(j.dPts).toLocaleString("pt-BR") : man ? man[0] : msg.startsWith("+") ? msg : ""
          i.textContent = em ? `×${j.dMult.toFixed(1)}` : man ? man[1] : ""
          sm.textContent = em ? msg : man ? "" : msg.startsWith("+") ? `drift · ${j.dTotal.toLocaleString("pt-BR")} na noite` : msg
        }
        const V = M.vias[j.via]
        const d = destinoRef.current
        let txt = ""
        let prog = 0
        if (V.tipo === "circuito") {
          const us = V.faixas.map((f) => f.u)
          const prox = us.filter((u) => u > j.u)
          const uG = prox.length ? Math.min(...prox) : V.L + Math.min(...us)
          const garfo = uG - j.u
          prog = j.u / V.L
          // cartão da bifurcação: as três opções, acende a do lado em que
          // o carro está
          // com conversa no painel, o cartão só toma a ilha nos últimos 330 m
          // (onde o toque marca a saída): na cidade as descidas vêm a cada
          // ~650 m e a conversa ficava escondida quase o tempo todo
          const chave = garfo < (conversaRef.current ? 330 : 450) ? `${j.via}:${uG % V.L}` : ""
          if (chave !== garfoChave.current) {
            garfoChave.current = chave
            const u0 = uG % V.L
            setGarfo(chave ? { via: j.via, u: u0, esq: V.faixas.find((f) => f.u === u0 && f.lado < 0), dir: V.faixas.find((f) => f.u === u0 && f.lado > 0) } : null)
          }
          if (chave) {
            if (hudGarfoM.current) hudGarfoM.current.textContent = `${Math.round(garfo)}m`
            // depois de marcar o lado, o cartão trava nele (e a Kombi vai sozinha)
            const vai = j.escolha ? j.escolha + 1 : j.x < -MEIA * 0.35 ? 0 : j.x > MEIA * 0.35 ? 2 : 1
            garfoEls.current.forEach((el, k) => {
              el?.classList.toggle("is-vai", k === vai)
              el?.classList.toggle("is-trava", k === vai && !!j.escolha)
            })
            if (hudGarfoT.current) {
              const f = j.escolha ? V.faixas.find((x) => x.u === uG % V.L && x.lado === j.escolha) : null
              hudGarfoT.current.textContent = f ? `✓ saindo ${praDe(f.para)} · ${f.lado > 0 ? "←" : "→"} desfaz` : "um toque pro lado da saída"
            }
          }
          const la = lugarAlvoRef.current
          const ma = alvoRef.current
          if (la && ma && V.t !== la) {
            // a missão está em outro lugar: aponta a saída certa
            const pra = rumo(V.t, la)!
            const f = V.faixas.find((x) => x.para === pra)
            const lado = f ? (f.lado < 0 ? "←" : "→") : ""
            txt = f && !aberta(f, nLibRef.current)
              ? `a saída ${praDe(pra)} abre com ${freqDe(pra).custo} de sinal · pega os orbs`
              : `${lado} saída ${praDe(pra)} em ${Math.round(f ? (f.u - j.u + V.L) % V.L : garfo)}m`
          } else if (ma?.t === "busca" && V.t === la) {
            const us = marcosRef.current.filter((m) => m.via === j.via).map((m) => (m.u >= j.u ? m.u - j.u : V.L - j.u + m.u))
            if (us.length) {
              txt = `${ma.busca.nome} em ${Math.round(Math.min(...us))}m`
              prog = 1 - Math.min(1, Math.min(...us) / V.L)
            }
          } else if (d && V.t === "linha") {
            const alvo = centro.estacoes.find((e) => e.id === d)!.u
            const falta = alvo >= j.u ? alvo - j.u : V.L - j.u + alvo
            txt = `${Math.round(falta)}m`
            prog = 1 - Math.min(1, falta / (V.L * 0.5))
          } else if (d) txt = `saída → pra cidade neon em ${Math.round(garfo)}m`
          else if (V.t === "linha" && garfo > 700) {
            const px = V.estacoes.find((e) => e.u > j.u)
            txt = px ? `próxima: ${getEstacao(px.id).faixa.toLowerCase()} · ${Math.round(px.u - j.u)}m` : `bifurcação em ${Math.round(garfo)}m`
          } else txt = `bifurcação em ${Math.round(garfo)}m`
        } else {
          if (garfoChave.current) { garfoChave.current = ""; setGarfo(null) }
          prog = j.u / V.L
          txt = `faltam ${Math.round(V.L - j.u)}m`
        }
        if (hudRota.current) hudRota.current.textContent = txt
        if (hudProg.current) hudProg.current.style.transform = `scaleX(${prog})`
        const p = proximaFreq(sinalRef.current)
        const lib = freqsLiberadas(sinalRef.current)
        const ant = lib[lib.length - 1]?.custo ?? 0
        if (hudSinal.current) hudSinal.current.style.transform = `scaleY(${p ? (sinalRef.current - ant) / (p.custo - ant) : 1})`
        // (disco: as barras do módulo são verticais)
        const eixo = "disco" in M ? "scaleY" : "scaleX"
        if (hudTurbo.current) hudTurbo.current.style.transform = `${eixo}(${j.turboT > 0 ? Math.min(1, j.turboT / 2.2) : j.carga})`
        if (hudEnergia.current) hudEnergia.current.style.transform = `${eixo}(${j.energia ?? 1})`
        // a sirene sobe da borda de baixo: quanto mais perto, mais forte
        if (sirene.current) sirene.current.style.opacity = j.cacaGap === undefined ? "0" : String(Math.max(0, Math.min(0.9, 1 - j.cacaGap / 180)))
        if (hudCacaBarra.current) hudCacaBarra.current.style.transform = `scaleX(${Math.max(0, Math.min(1, 1 - (j.cacaGap ?? 250) / 250))})`
        if (flashEl.current) flashEl.current.style.opacity = String(Math.min(0.85, j.flash))
        // dial girando: da frequência de onde veio até a de pra onde vai
        if (hudFreq.current && V.tipo === "saida") {
          const p = j.u / V.L
          if (p > 0.45) {
            const a0 = parseFloat(freqDe(V.de!).freq)
            const b0 = parseFloat(freqDe(V.t).freq)
            const q = Math.min(1, (p - 0.45) / 0.5)
            const ruido = (Math.random() - 0.5) * 6 * (1 - q)
            hudFreq.current.textContent = `${(a0 + (b0 - a0) * q + ruido).toFixed(1)} FM`
          }
        }
        if (hudTom.current) {
          const tom = tomDaMusica()
          const base = V.tipo === "saida" ? `sintonizando ${freqDe(V.t).freq}…` : "troca pelo caminho"
          hudTom.current.textContent = tom && V.tipo !== "saida" ? `${nomeDoTom(tom)} · ${base}` : base
        }
        // guia de rota: o que vem nos próximos 1200 m desta estrada
        {
          const JAN = 1200
          const dist = (u: number) => (V.fechada ? (((u - j.u) % V.L) + V.L) % V.L : u - j.u)
          const it: ItemGuia[] = []
          if (V.tipo === "circuito") {
            // as bolinhas são GUIA DE MISSÃO, não o mapa: só aparece a
            // estação de quem tá te esperando (as outras ficam no escuro)
            for (const e of V.estacoes) {
              if (e.id !== alvoRef.current?.missao || alvoRef.current.t === "busca") continue
              const est = getEstacao(e.id)
              it.push({ k: `e${e.id}`, d: dist(e.u), cor: est.cor, rot: String(est.n), tipo: "alvo" })
            }
            for (const u of new Set(V.faixas.map((f) => f.u))) it.push({ k: `f${u}`, d: dist(u), cor: "#ffc857", rot: "saídas", tipo: "garfo" })
          } else it.push({ k: "chega", d: V.L - j.u, cor: freqDe(V.t).cor, rot: lugarDe(V.t), tipo: "chegada" })
          // o lugar da missão (a vaga) também entra no guia
          const vg = vagaRef.current
          if (vg && vg.via === j.via) it.push({ k: `l${vg.id}`, d: dist(vg.u), cor: vg.cor, rot: vg.nome, tipo: "alvo" })
          for (const m of marcosRef.current) if (m.via === j.via) it.push({ k: `m${m.chave}`, d: dist(m.u), cor: m.cor, rot: m.chave === "antena" ? "antena" : "missão", tipo: "item" })
          const vis = it.filter((x) => x.d > 0 && x.d < JAN)
          const chave = vis.map((x) => x.k).join(",")
          if (chave !== guiaChave.current) { guiaChave.current = chave; setGuia(vis) }
          for (const x of vis) {
            const el = guiaEls.current.get(x.k)
            if (el) el.style.left = `${(x.d / JAN) * 100}%`
          }
        }
      },
    }
  })

  // ir agora (painel MISSÕES): um corte preto e a Kombi reaparece ~140 m
  // antes do lugar, já andando — passar na frente entra na missão
  const telChave = teleporte?.chave ?? 0
  useEffect(() => {
    if (!teleporte) return
    const viaLugar = teleporte.lugar ? LUGARES[teleporte.lugar].via : undefined
    const vi = viaLugar ? M.vias.findIndex((v) => v.id === viaLugar) : M.circuito[teleporte.area]
    const C = M.vias[vi]
    if (!C) return
    let u: number
    if (teleporte.lugar) u = LUGARES[teleporte.lugar].u - 140
    else if (teleporte.frac !== undefined) u = C.livre[0] + teleporte.frac * (C.livre[1] - C.livre[0]) - 140
    else u = C.livre[0]
    u = ((u % C.L) + C.L) % C.L
    const t = setTimeout(() => {
      const j = jogo.current
      j.via = vi; j.u = u; j.x = 0; j.v = 14; j.vx = 0
      j.naVaga = false; j.vagaAvisou = undefined; j.encaixar = true
      evs.current?.via(vi)
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telChave])

  // atalho de teste (/teste): a Kombi reaparece no ponto, já andando
  useEffect(() => {
    if (!atalho) return
    const t = setTimeout(() => {
      const vi = M.circuito[atalho.area], C = M.vias[vi]
      if (!C) return
      const j = jogo.current
      j.via = vi; j.u = ((atalho.u % C.L) + C.L) % C.L; j.x = 0; j.v = atalho.parado ? 0 : 12; j.vx = 0
      if (atalho.parado) { j.segura = true; setTimeout(() => { jogo.current.segura = false }, 10000) }
      j.naVaga = false; j.vagaAvisou = undefined; j.encaixar = true
      evs.current?.via(vi)
      if (atalho.procurado) { j.batidas = 3; j.procurado = true; evs.current.estrelas(3) }
      if (atalho.embacar) setTimeout(() => setPedidoEmbaca(Date.now()), 2500)
    }, 900)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atalho])

  // atalhos de desenvolvimento: __irPara(0.9) anda na via atual,
  // __via("crypto", 0.5) teleporta pra um lugar (ou "linha>crypto")
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    // teste: a velocidade da Kombi (m/s), ex. 0 pra estacionar na vaga
    w.__vel = (v: number) => { jogo.current.v = v }
    w.__irPara = (f: number, x?: number) => {
      const j = jogo.current
      j.u = f * M.vias[j.via].L
      if (x !== undefined) { j.x = x; j.v = Math.max(j.v, 30) }
      j.encaixar = true
    }
    w.__via = (id: string, f = 0) => {
      const i = M.vias.findIndex((v) => v.id === id || v.id === `circuito:${id}`)
      if (i < 0) return
      const j = jogo.current
      j.via = i
      j.u = f * M.vias[i].L
      j.x = 0
      j.sintonizou = false
      j.encaixar = true
      evs.current?.via(i)
    }
    // (mapa novo) leva a Kombi pra perto de uma coisa da tabela: "lugar:bar", "pagina:ginasio", "flor:linha-1", "parque"
    ;(w as Record<string, unknown>).__irAte = (chave: string, antes = 60) => {
      const o = M.onde?.(chave); if (!o) return null
      const j = jogo.current
      j.via = o.via; j.u = Math.max(0, o.u - antes); j.x = 0; j.encaixar = true
      evs.current?.via(o.via)
      return { via: M.vias[o.via].id, u: o.u }
    }
    ;(w as Record<string, unknown>).__marcar = (chave: string) => { const o = M.onde?.(chave); if (o) setMarca({ via: o.via, u: o.u, nome: chave, cor: "#5dffa0" }); return o }
    ;(w as Record<string, unknown>).__irRetorno = () => {
      if (!("ligacoes" in M)) return null
      const r = (M as MundoRede).ligacoes.rede.retornos[3], vi = 2 * r.aresta, j = jogo.current
      j.via = vi; j.u = Math.max(0, r.f * M.vias[vi].L - 70); j.x = 0; j.encaixar = true; evs.current?.via(vi)
      return M.vias[vi].id
    }
    // (disco) teste: a Kombi voando h metros acima de uma via (pra conferir o pouso)
    ;(w as Record<string, unknown>).__voarSobre = (id: string, f = 0.5, h = 15) => {
      const vi = M.vias.findIndex((v) => v.id === id); if (vi < 0) return null
      const v = M.vias[vi], i = Math.floor(f * (v.n - 1)), j = jogo.current
      j.voo = true; j.ar = true; j.propulsou = true; j.tAr = 0; j.vy = 0
      j.wx = v.px[i]; j.wz = v.pz[i]; j.y = v.py[i] + h; j.rumo = Math.atan2(v.tx[i], v.tz[i])
      return { y: j.y }
    }
    w.__tom = () => tomDaMusica()
    // teste: a hora do jogo (0–24)
    w.__hora = (h: number) => { horaRef.current = h }
    // teste: a polícia vem (3 estrelas)
    w.__procurado = () => { const j = jogo.current; j.batidas = 3; j.procurado = true; evs.current.estrelas(3) }
    w.__pular = () => proxFaixa.current(freqRef.current)
    w.__estacoes = () => M.vias[M.circuito.linha].estacoes.map((e) => ({ id: e.id, f: e.u / M.vias[M.circuito.linha].L }))
    // pontos de busca da missão: [{ chave, via (id), u, f (fração do loop) }]
    w.__marcos = () => marcosRef.current.map((m) => ({ chave: m.chave, via: M.vias[m.via].id, u: Math.round(m.u), f: m.u / M.vias[m.via].L }))
    if (M.conflitos.length) console.warn("pistas se encostando:", M.conflitos)
    w.__sinal = (n: number) => evs.current?.sinal(n, `+${n}`, "#fff")
    w.__estado = () => {
      const j = jogo.current
      return { t: +j.tempo.toFixed(2), via: M.vias[j.via].id, u: Math.round(j.u), L: Math.round(M.vias[j.via].L), x: +j.x.toFixed(2), v: Math.round(j.v), deriva: +j.deriva.toFixed(2), giro: +j.giro.toFixed(2), drift: j.drift, peso: +j.peso.toFixed(2), vx: +j.vx.toFixed(1), turbo: +j.turboT.toFixed(2), src: player.src, caca: j.cacaGap === undefined ? null : Math.round(j.cacaGap), inp: { ...input.current }, ar: j.ar, dPts: Math.round(j.dPts), tVolta: j.tVolta, retorno: j.retorno, tipo: M.vias[j.via].tipo, wx: j.wx && +j.wx.toFixed(1), wz: j.wz && +j.wz.toFixed(1), rumo: j.rumo && +j.rumo.toFixed(2), fora: j.livreFora, y: +j.y.toFixed(2), vy: +j.vy.toFixed(1), voo: !!j.voo, en: j.energia && +j.energia.toFixed(2) }
    }
    return () => { delete w.__vel; delete w.__irPara; delete w.__via; delete w.__tom; delete w.__sinal; delete w.__estado; delete w.__marcos; delete w.__estacoes; delete w.__pular; delete w.__hora; delete w.__procurado }
  }, [M])

  // toque: metade esquerda/direita vira, as duas freiam
  const toques = useRef(new Map<number, "esq" | "dir">())
  const longo = useRef(new Map<number, { x0: number; y0: number; t: number }>())
  const soltarLongo = (id: number) => { const l = longo.current.get(id); if (l) { clearTimeout(l.t); longo.current.delete(id) } }
  const atualizarToque = () => {
    const l = [...toques.current.values()]
    const e = l.includes("esq")
    const d = l.includes("dir")
    if (e && !d && !input.current.esq) input.current.toqueE = true
    if (d && !e && !input.current.dir) input.current.toqueD = true
    input.current.esq = e && !d
    input.current.dir = d && !e
    // (LU2CA 21/10) os dois lados ao mesmo tempo = freio (no chão) ou a manobra (no ar: o mortal)
    input.current.ambos = e && d
  }
  useEffect(() => {
    const tecla = (ev: KeyboardEvent, on: boolean) => {
      if (pausadoRef.current || cinemaRef.current) return
      const k = ev.key.toLowerCase()
      if (k === "arrowleft" || k === "a") {
        if (on && !ev.repeat) input.current.toqueE = true
        input.current.esq = on
      } else if (k === "arrowright" || k === "d") {
        if (on && !ev.repeat) input.current.toqueD = true
        input.current.dir = on
      }
      else if (k === "arrowup" || k === "w") { input.current.gas = on; if (on) jogo.current.desligada = false }
      else if (k === "arrowdown" || k === "s") input.current.freio = on
      else if ((k === "shift" || k === "e") && on) input.current.turbo = true
      // (17/10) o espaço é o PULO; o freio de mão fica no Q (e no X)
      // (17/10, LU2CA) espaço = turbo; dois espaços seguidos (até 0,3 s) = pulo
      else if (k === " ") {
        // (disco) SEGURAR o espaço = propulsor (o toque curto continua sendo o turbo)
        if (!on) input.current.espacoDesde = 0
        else if (!ev.repeat) input.current.espacoDesde = performance.now()
        if (on && !ev.repeat) {
          const agora = performance.now()
          if (agora - (input.current.ultimoEspaco ?? 0) < 300) { input.current.pulo = true; input.current.ultimoEspaco = 0 }
          else { input.current.turbo = true; input.current.ultimoEspaco = agora }
        }
      }
      else if (k === "q" || k === "x") input.current.mao = on
      // F (como no GTA): sai da Kombi, ou volta pra ela quando está perto
      else if (k === "f" && on && !ev.repeat) document.querySelector<HTMLButtonElement>(".l-sair-kombi, .l-regar-btn.is-voltar")?.click()
      else if (k === "c" && on && !ev.repeat) trocarCamera()
      // (disco) H: liga e desliga o holo
      else if (k === "h" && on && !ev.repeat && ehDisco && !input.current.semHolo) { setAjuda(false); alternarOculos() }
      else return
      ev.preventDefault()
    }
    const kd = (e: KeyboardEvent) => tecla(e, true)
    const ku = (e: KeyboardEvent) => tecla(e, false)
    window.addEventListener("keydown", kd)
    window.addEventListener("keyup", ku)
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku) }
  }, [trocarCamera, ehDisco])

  // a missão fala com você quando a estrada começa: o que buscar e onde
  const falouDe = useRef("")
  useEffect(() => {
    const a = alvoRef.current
    // (disco) a história fala do jeito dela (o rádio); a fala antiga da missão não
    if (historia && historia.fase !== "livre") return
    if (!a || pausado || falouDe.current === alvoChave) return
    falouDe.current = alvoChave
    const e = getEstacao(a.missao)
    const t = setTimeout(() => falar(e.personagem, a.t === "busca" ? `${a.busca.lugar}. segue a coluna de luz` : a.t === "visita" ? `${MISSOES[a.missao]?.chamado ?? "vem aqui"}. segue a coluna de luz` : "tô te esperando. segue a coluna de luz"), 1800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvoChave, pausado])
  // carona: quem está na Kombi conversa no caminho
  useEffect(() => {
    const a = alvoRef.current
    const fala = a?.t === "entrega" ? MISSOES[a.missao]?.busca?.caminho : a?.t === "lugar" && !a.pegar && MISSOES[a.missao]?.carona ? MISSOES[a.missao]?.caminho : undefined
    if (!a || !fala) return
    let i = 0
    const quem = getEstacao(a.missao).personagem
    const t = setInterval(() => falar(quem, fala[i++ % fala.length]), 17000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvoChave])
  useEffect(() => {
    if (!bairro) return
    const t = setTimeout(() => setBairro(null), 3800)
    return () => clearTimeout(t)
  }, [bairro])

  const fq = freqDe(freq)
  // (o holo) a rádio: o mesmo pros widgets do computador e a ilha do celular
  const radioHolo = { ligada: aparelho === "radio", freq: fq.freq, faixa: caido ? "sem sinal" : faixa || "fora do ar", cor: fq.cor, id: freq, sinal: save.sinal }
  const ligarRadioHolo = () => { if (aparelho === "radio") fonteSom.set("off"); else { fonteSom.set("radio"); setTimeout(() => tocarProxima(freqRef.current), 0) } }
  // (LU2CA 20/10) a SINT0NIA virou o menu da rádio: sintonizar liga a rádio na frequência
  const sintonizarHolo = (id: FreqId) => { chiadoCurto(); setFreq(id); freqRef.current = id; fonteSom.set("radio"); setTimeout(() => tocarProxima(id), 0) }
  const V = M.vias[viaAtual]
  const lugarAqui = V.tipo === "circuito" ? territorio(V.t).lugar : `indo ${praDe(V.t)}`
  const dest = destino ? getEstacao(destino) : null
  const portalE = portal ? getEstacao(portal.id) : null
  const portalMissao = portalE ? missao(portalE, nivel) : null
  // descer na estação só quando ela te espera (visita ou entrega) — no meio
  // da busca, passar por ela não pede nada
  const podeDescerPortal = !!portalE && !save.objetos.includes(portalE.id) && (
    alvo?.missao === portalE.id ? alvo.t === "entrega" || alvo.t === "visita" : portalE.id === destino && !!portalMissao?.ok
  )
  const passandoE = passando ? getEstacao(passando.id) : null
  useEffect(() => {
    if (!passando) return
    const t = setTimeout(() => setPassando(null), 3200)
    return () => clearTimeout(t)
  }, [passando])
  const bairroF = bairro ? freqDe(bairro.id) : null

  useEffect(() => {
    if (!portal) return
    const t = setTimeout(() => setPortal(null), 8000)
    return () => clearTimeout(t)
  }, [portal])

  return (
    <div className={`l-viagem ${voaNao ? "is-sem-voo" : ""} ${discoM && holoCelular ? "is-holo-celular" : ""} ${discoM && !holoOk ? "is-sem-holo" : ""} ${entrando ? "is-entrando" : ""} ${parque === "andando" ? "is-montanha" : ""} ${celular ? "is-celular" : ""} ${pausado ? "is-pausada" : ""} ${caido ? "is-caida" : ""} ${cinema ? "is-cinema" : ""} ${cinza ? "is-cinza" : ""} ${noiteRepete ? "is-repete" : ""} ${foraDoAr ? "is-apagao" : ""} ${discoM ? `is-disco ${oculos ? "is-holo" : "is-holo-off"}` : ""}`}>
      {fonte && (
        <Canvas
          className="l-viagem-cvs"
          dpr={testeDpr ?? DPR.v ?? 1}
          frameloop={pausado ? "never" : "always"}
          gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
          camera={{ fov: 60, near: 0.1, far: 3200 }}
          onPointerDown={(e) => {
            if (cinemaRef.current) return
            const r = (e.target as HTMLElement).getBoundingClientRect()
            // toque duplo (dois toques em menos de 0,3 s): pula
            const agora = performance.now()
            if (agora - (input.current.ultimoToque ?? 0) < 300) { input.current.pulo = true; input.current.ultimoToque = 0 } else input.current.ultimoToque = agora
            // toque LONGO (segurou ~0,55 s sem arrastar): turbo, uma vez por toque
            const id = e.pointerId, x0 = e.clientX, y0 = e.clientY
            longo.current.set(id, { x0, y0, t: window.setTimeout(() => { if (longo.current.has(id)) { input.current.turbo = true; vib(20); longo.current.delete(id) } }, 550) })
            toques.current.set(e.pointerId, e.clientX - r.left < r.width / 2 ? "esq" : "dir")
            atualizarToque()
          }}
          onPointerMove={(e) => { const l = longo.current.get(e.pointerId); if (l && Math.hypot(e.clientX - l.x0, e.clientY - l.y0) > 24) { clearTimeout(l.t); longo.current.delete(e.pointerId) } }}
          onPointerUp={(e) => { soltarLongo(e.pointerId); toques.current.delete(e.pointerId); atualizarToque() }}
          onPointerCancel={(e) => { soltarLongo(e.pointerId); toques.current.delete(e.pointerId); atualizarToque() }}
          onPointerLeave={(e) => { soltarLongo(e.pointerId); toques.current.delete(e.pointerId); atualizarToque() }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Cena tags={tagsArea} M={M} jogo={jogo} input={input} evs={evs} destinoRef={destinoRef} temTurbo={temTurbo} confeteRef={confeteRef} nivel={nivel} objetos={save.objetos} nLib={nLib} nLibRef={nLibRef} marcos={marcos} marcosRef={marcosRef} estacaoAlvo={alvo?.missao ?? null} corRadio={corRadio} pausado={pausado} cinemaRef={cinemaRef} limitadoRef={limitadoRef} cacadoRef={cacadoRef} dentroRef={dentroRef} discoRef={discoRef} disco={discoAgora.tocando} fonteRef={fonteRef} onTocaDiscos={() => setEstante(true)} carona={levando ? levando : (alvo?.t === "entrega" && alvo.missao === "sexta") || (alvo?.t === "lugar" && !alvo.pegar && MISSOES[alvo.missao]?.carona) ? alvo.missao : null} lugarAlvoRef={lugarAlvoRef} vagaRef={vagaRef} camLugarRef={camLugarRef} lugarAlvoId={lugarDaMissao} cenaLugar={cenaLugar} segredoRef={segredoRef} aberturaRef={aberturaRef} celularRef={celularRef} combRef={combRef} horaRef={horaRef} abertos={abertos} paginaPerto={paginaPerto} camEntrada={camEntrada} climaRef={climaRef} regadas={regadas} passeio={passeio} respiroRef={respiroRef} marcaRef={marcaRef} floresAsf={{ leva, regadas: flores.regadas, regando: regandoFlor, visivel: dePatins || mods.includes("mangueira") }} viaApagada={viaApagada} luzPistas={luzPistas} faseHistoria={fase} alvoChao={alvoChao} soTema={soTema} temaMissao={temaMissao} onRobo={roboRef} semPaineis={!!historia && historia.fase !== "livre" && !(historia.mods ?? []).includes("solar")} />
        </Canvas>
      )}

      {respirando && <Respirar jaSabe={dicas.includes("respirar")} onAprendeu={() => onDica?.("respirar")} onFeito={() => { respiroRef.current.feito = true }} />}
      {/* o vidro embaça de noite na chuva (Embacado.tsx) */}
      {!abertura && !dePatins && <Embacado pedido={pedidoEmbaca} podeRef={embacaRef} jaSabe={dicas.includes("embacado")} onAprendeu={() => onDica?.("embacado")} />}
      {abertura && abFase.fase === "ape" && <small className="l-abertura-dica">segura a tela ou ↑ pra andar até a porta</small>}
      <div ref={flashEl} className="l-flash" />
      <div ref={fadeCam} className="l-fade-cam" />
      <div className="l-hud-topo">
        {/* o carro é a tela principal; o celular é um toque */}
        {discoM ? (
          // (disco) desligado: o óculos (liga o holo). Ligado: no lugar dele, o
          // "?" (toca nele e depois numa coisa: diz o que ela é) e o desligar
          oculos ? (
            <>
              <button type="button" data-info="ajuda" className={`l-hud-cel is-ajuda ${ajuda ? "is-on" : ""}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => setAjuda((x) => !x)} aria-label="o que é cada coisa">
                ?{avisos > 0 && <em>{avisos}</em>}
              </button>
              <button type="button" data-info="desligar" className="l-hud-cel is-oculos is-on" onPointerDown={(e) => e.stopPropagation()} onClick={() => { setAjuda(false); alternarOculos() }} aria-label="desligar o holo">
                <svg width="22" height="18" viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="6" width="10" height="8" rx="3" /><rect x="16" y="6" width="10" height="8" rx="3" /><path d="M12 9.5c1.3-1 2.7-1 4 0M2 8 0.8 5.5M26 8l1.2-2.5" /></svg>
              </button>
            </>
          ) : (
            <button type="button" className="l-hud-cel is-oculos" onPointerDown={(e) => e.stopPropagation()} onClick={alternarOculos} aria-label="ligar o holo">
              <svg width="22" height="18" viewBox="0 0 28 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="6" width="10" height="8" rx="3" /><rect x="16" y="6" width="10" height="8" rx="3" /><path d="M12 9.5c1.3-1 2.7-1 4 0M2 8 0.8 5.5M26 8l1.2-2.5" /></svg>
              {avisos > 0 && <em>{avisos}</em>}
            </button>
          )
        ) : (
        <button type="button" className="l-hud-cel" onPointerDown={(e) => e.stopPropagation()} onClick={() => onSair({ ...jogo.current.st, tempo: jogo.current.tempo })} aria-label="abrir o celular">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></svg>
          {avisos > 0 && <em>{avisos}</em>}
        </button>
        )}
        <button type="button" data-info="camera" className={`l-hud-cam ${dentro ? "is-dentro" : ""} ${usouCam ? "" : "is-novo"}`} onPointerDown={(e) => e.stopPropagation()} onClick={trocarCamera} aria-label={dentro ? "câmera de fora" : "câmera de dentro"} title="câmera (C)">
          {dentro ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 16V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v7" /><path d="M3 16h18" /><circle cx="7.5" cy="17.5" r="1.6" /><circle cx="16.5" cy="17.5" r="1.6" /></svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="13" r="7" /><circle cx="12" cy="13" r="1.6" fill="currentColor" /><path d="M5.5 11h13M12 6v5" /></svg>
          )}
          <span>{dentro ? "de fora" : "1ª pessoa"}</span>
        </button>
        {/* guia de rota: a linha do que vem pela frente (as placas guiam
            na pista; aqui só a ordem das coisas e a distância) */}
        <div className="l-guia" style={{ ["--cor" as string]: fq.cor }}>
          <small className={`l-guia-lugar ${bairro ? "is-entrando" : ""}`}>{bairro ? `entrando em ${territorio(bairro.id).lugar}` : V.id === "deserto" ? "deserto" : V.tipo === "circuito" ? territorio(V.t).lugar : `indo ${praDe(V.t)}`}</small>
          <div className="l-guia-linha">
            <i className="l-guia-kombi" />
            {guia.map((x) => (
              <span key={x.k} ref={(el) => { if (el) guiaEls.current.set(x.k, el); else guiaEls.current.delete(x.k) }} className={`l-guia-it is-${x.tipo}`} style={{ ["--c" as string]: x.cor, left: `${(x.d / 1200) * 100}%` }}>
                <i />{x.tipo !== "estacao" && <b>{x.rot}</b>}{x.tipo === "estacao" && <em>{x.rot}</em>}
              </span>
            ))}
          </div>
        </div>
      </div>


      {/* PROCURADO: as estrelas (uma por batida; na 3ª a polícia vem) */}
      {(estrelas > 0 || cacando) && (
        <div className={`l-estrelas ${cacando ? "is-caca" : ""}`} aria-label={`procurado: ${cacando ? 3 : estrelas} estrelas`}>
          {[0, 1, 2].map((k) => <i key={k} className={k < (cacando ? 3 : estrelas) ? "is-on" : ""}>★</i>)}
        </div>
      )}
      <div ref={sirene} className="l-sirene" />
      {telChave > 0 && <div key={telChave} className="l-corte-teleporte" />}
      {caido && (
        <div className="l-hud-missao" style={{ ["--cor" as string]: "#3d7bff" }}>
          <small>D-Bee · urgente</small>
          <b>religar a antena da 222 no centro</b>
        </div>
      )}
      {piloto && <div className="l-hud-piloto" aria-live="polite">indo sozinha pra missão · toca pra assumir</div>}
      {!caido && alvo && missaoAlvo && (
        <div className="l-hud-missao" style={{ ["--cor" as string]: getEstacao(alvo.missao).cor }}>
          <small>{getEstacao(alvo.missao).personagem} · missão</small>
          <b>{alvo.t === "busca" ? missaoAlvo.tarefa : alvo.t === "lugar" ? (alvo.pegar ? `buscar ${LUGARES[alvo.lugar].no}` : `passa ${LUGARES[alvo.lugar].no}`) : alvo.t === "visita" ? `te chamou na estação ${getEstacao(alvo.missao).n}` : `levar ${missaoAlvo.busca?.nome ?? "a coisa"} na estação ${getEstacao(alvo.missao).n}`}</b>
          {alvo.t === "busca" && alvo.busca.em.length > 1 && <span>{alvo.busca.em.length - alvo.faltam.length}/{alvo.busca.em.length}</span>}
        </div>
      )}
      {popup && <div key={popup.id} className="l-popup" style={{ color: popup.cor }}>{popup.txt}</div>}

      {/* ILHA DINÂMICA: uma coisa de cada vez, se transformando —
          bifurcação > conversa (no painel) > falas (em fila) > PROCURADO > quieta */}
      {(() => {
        // na chegada, o grupo falando vem antes do aviso de bifurcação
        const modo = intro && toasts[0] ? "fala" : garfo ? "garfo" : conversa ? "conversa" : toasts[0] ? "fala" : cacando ? "procurado" : "quieta"
        const t0 = toasts[0]
        // (disco, holo ligado) a ilha quieta é o letreiro do N3XO
        const letreiro = modo === "quieta" && !!discoM && oculos
        const C = garfo ? M.vias[garfo.via] : null
        const op = (f: Faixa | undefined, k: number) => {
          if (!f) return <div key={k} ref={(el) => { garfoEls.current[k] = el }} className="l-garfo-op is-vazia" />
          const fr = freqDe(f.para)
          const ok = aberta(f, nLib)
          const minha = !!lugarAlvo && rumo(C!.t, lugarAlvo) === f.para
          // a saída pro deserto (mundo.ts): sem rádio, cor de areia
          if (M.vias[f.via]?.id === "deserto") return (
            <div key={k} ref={(el) => { garfoEls.current[k] = el }} className="l-garfo-op" style={{ ["--cor" as string]: "#e8b86a" }}>
              <i>{f.lado < 0 ? "←" : "→"}</i>
              <b>deserto</b>
              <small>sem rádio</small>
            </div>
          )
          return (
            <div key={k} ref={(el) => { garfoEls.current[k] = el }} className={`l-garfo-op ${ok ? "" : "is-trancada"} ${minha ? "is-rota" : ""}`} style={{ ["--cor" as string]: ok ? fr.cor : "#6a6f8c" }}>
              {minha && <em>missão</em>}
              <i>{f.lado < 0 ? "←" : "→"}</i>
              <b>{lugarDe(f.para)}</b>
              <small>{ok ? `${fr.freq} FM` : `trancada · ${fr.custo}`}</small>
              {ok && !!tagsArea[f.para]?.length && <span className="l-garfo-quem">{tagsArea[f.para]!.map((x) => <i key={x.nome} style={{ background: x.cor }}>{x.nome[0]}</i>)}</span>}
            </div>
          )
        }
        return (
          <div
            className={`l-ilha is-${modo} ${(modo === "fala" && onIlha) || (modo === "quieta" && letreiro) ? "is-clicavel" : ""} ${letreiro ? "is-letreiro" : ""}`}
            data-info={letreiro ? "ilha" : undefined}
            style={{ ["--cor" as string]: t0 ? VOZES[t0.de] ?? "#fff" : "#2fe8ff" }}
            onPointerDown={(modo === "fala" && onIlha) || letreiro ? (e) => e.stopPropagation() : undefined}
            onClick={modo === "fala" && onIlha ? onIlha : letreiro ? () => onApp?.("n3xo") : undefined}
          >
            {modo === "garfo" && C && (
              <div key="garfo" className="l-ilha-conteudo">
                <header>bifurcação em <b ref={hudGarfoM}>…</b> · <span ref={hudGarfoT}>um toque pro lado da saída</span></header>
                <div className="l-garfo-ops">
                  {op(garfo!.esq, 0)}
                  <div ref={(el) => { garfoEls.current[1] = el }} className={`l-garfo-op ${lugarAlvo === C.t ? "is-rota" : ""}`} style={{ ["--cor" as string]: freqDe(C.t).cor }}>
                    {lugarAlvo === C.t && <em>missão</em>}
                    <i>↑</i>
                    <b>fica</b>
                    <small>{freqDe(C.t).freq} FM</small>
                    {!!tagsArea[C.t]?.length && <span className="l-garfo-quem">{tagsArea[C.t]!.map((x) => <i key={x.nome} style={{ background: x.cor }}>{x.nome[0]}</i>)}</span>}
                  </div>
                  {op(garfo!.dir, 2)}
                </div>
              </div>
            )}
            {modo === "fala" && t0 && (
              <div key={t0.id} className="l-ilha-conteudo l-ilha-fala"><b>{t0.de}</b> {t0.texto}</div>
            )}
            {modo === "procurado" && (
              <div key="proc" className="l-ilha-conteudo l-ilha-proc">
                <b>PROCURADO</b><small>usa o turbo e abre distância</small>
                <div className="l-procurado-barra"><div ref={hudCacaBarra} /></div>
              </div>
            )}
            {modo === "quieta" && (letreiro ? <HoloLetreiro key="q" save={save} nivel={nivel} hora={hora} /> : <div key="q" className="l-ilha-conteudo l-ilha-quieta" />)}
          </div>
        )
      })()}

      {/* O PAINEL DA KOMBI (06/10, LU2CA): velocímetro com odômetro, o
          rádio/toca-discos e, do lado, combustível e turbo — juntos,
          como no painel de uma Kombi de verdade (o mesmo na 1ª pessoa). O saldo
          de NEON fica só no celular */}
      {/* o relógio da cidade (13/10): a hora e o dia */}
      {/* sem gasolina: os patins (a Kombi fica) */}
      {seco && !dePatins && !pertoComb && !entrando && !regando && parque !== "andando" && (
        <button type="button" className="l-regar-btn is-patins" onPointerDown={(e) => e.stopPropagation()} onClick={irDePatins}>a gasolina acabou · de patins até o posto</button>
      )}
      {/* (disco) a placa da espiral: chegando numa saída, "◀ Linha X" e "▲ subir" */}
      {placaEspiral && (
        <div className="l-placa-espiral" style={{ ["--c" as string]: placaEspiral.cor }} aria-live="polite">
          <span className={`is-sair ${placaEspiral.lado > 0 ? "is-dir" : "is-esq"}`}>{placaEspiral.lado > 0 ? "" : "◀ "}<b>{placaEspiral.nome}</b>{placaEspiral.lado > 0 ? " ▶" : ""}</span>
          <span className="is-subir">▲ subir</span>
          <small>na faixa colorida, sai · nas da esquerda, segue subindo</small>
        </div>
      )}
      {/* (disco) O HOLO (Holo.tsx): ligado, tudo nas bordas e o centro livre;
          desligado, nada. O mapa holográfico aparece subindo, no voo */}
      {discoM && oculos && <OculosMapa M={discoM} apagada={viaApagada} jogo={jogo as unknown as React.RefObject<{ via: number; u: number; x: number; y: number; voo?: boolean; wx?: number; wz?: number; rumo?: number }>} />}
      {discoM && oculos && (
        <>
          {holoCelular ? (
            // (LU2CA 21/10) no celular, os widgets numa ilha só (canto de baixo à esquerda)
            <HoloIlha radio={radioHolo} onLigar={ligarRadioHolo} onProxima={() => proxFaixa.current(freqRef.current)} onSintonizar={sintonizarHolo} ler={lerClima} onApp={(id) => onApp?.(id)} guitarLivre={guitarLivre(save)} />
          ) : (
            <>
              <HoloSom radio={radioHolo} onLigar={ligarRadioHolo} onProxima={() => proxFaixa.current(freqRef.current)} onSintonizar={sintonizarHolo} />
              <HoloDestaque onApp={(id) => onApp?.(id)} guitarLivre={guitarLivre(save)} />
              <HoloClima ler={lerClima} />
              <HoloIcones onApp={(id) => onApp?.(id)} />
              <HoloApps onApp={(id) => onApp?.(id)} />
            </>
          )}
          <HoloAnel missao={missaoHolo} onMissoes={() => onMissoes?.()} />
          <HoloMissao missao={checklistHolo} />
        </>
      )}
      {discoM && ajuda && oculos && <HoloAjuda ativa onSair={sairAjuda} />}
      {/* sair a qualquer hora / voltar pra Kombi */}
      {!dePatins && !seco && !entrando && !regando && parque !== "andando" && !naBomba && (
        <button type="button" data-info="sair" className="l-sair-kombi" onPointerDown={(e) => e.stopPropagation()} onClick={irDePatins}>sair da kombi</button>
      )}
      {dePatins && florPerto && !regandoFlor && (
        <button type="button" className="l-regar-btn is-flor" onPointerDown={(e) => e.stopPropagation()} onClick={() => regarFlor(florPerto)}>regar a flor</button>
      )}
      {msgFlor && <p className="l-pagina-fechada is-flor">{msgFlor}</p>}
      {/* (disco, a Nectar) a Kombi quebrada: o galão do posto e a água */}
      {dePatins && nectarPasso === "galao" && pertoPostoNectar && !msgPatins && (
        <button type="button" className="l-regar-btn is-bomba" onPointerDown={(e) => e.stopPropagation()} onClick={pegarGalaoDbee}>pegar o galão</button>
      )}
      {dePatins && pertoKombi && !msgPatins && !kombiQuebrada && (
        <button type="button" className="l-regar-btn is-voltar" onPointerDown={(e) => e.stopPropagation()} onClick={entrarNaKombi}>voltar pra Kombi</button>
      )}
      {dePatins && pertoComb && seco && (
        <button type="button" className="l-regar-btn is-bomba" onPointerDown={(e) => e.stopPropagation()} onClick={voltarComGalao}>encher o galão e voltar pra Kombi</button>
      )}
      {dePatins && !pertoComb && !pertoKombi && !msgPatins && <p className="l-pagina-fechada">{seco ? "de patins · o posto ou uma bomba no mapa" : "de patins · a Kombi ficou estacionada"}</p>}
      {msgPatins && <p className="l-pagina-fechada">{msgPatins}</p>}
      {pertoComb && !dePatins && !naBomba && !entrando && !regando && parque !== "andando" && !postoAberto && !esperandoPosto && (
        <button type="button" className="l-regar-btn is-bomba" onPointerDown={(e) => e.stopPropagation()} onClick={() => abastecer(pertoComb)}>
          {pertoComb === "posto" ? "abastecer · o posto" : "abastecer · a bomba"}
        </button>
      )}
      {naBomba && (
        <div className="l-bomba" onPointerDown={(e) => e.stopPropagation()}>
          <b>a bomba</b>
          <div className="l-bomba-tanque"><i style={{ width: `${Math.round(tanque * 100)}%` }} /></div>
          <small>tanque {Math.round(tanque * 100)}% · {save.neon ?? 0} neon</small>
          <button type="button" disabled={tanque > 0.97} onClick={() => setMsgBomba(onAbastecer?.("tanque") ? "tanque cheio" : "sem neon pra encher")}>encher o tanque · 25 neon</button>
          <button type="button" disabled={save.galao !== "vazio"} onClick={() => setMsgBomba(onAbastecer?.("galao") ? "galão cheio" : "sem neon pro galão")}>encher o galão · 10 neon</button>
          {msgBomba && <em>{msgBomba}</em>}
          <button type="button" className="is-seguir" onClick={() => { setNaBomba(false); setMsgBomba(""); jogo.current.encostando = false }}>seguir</button>
        </div>
      )}
      {discoM && perfil && <Perfil agua={aguaVista} neon={save.neon ?? 0} pop={save.popularidade ?? 0} mods={mods} onFechar={() => setPerfil(false)} />}
      {discoM && oficinaAberta && (
        <OficinaLoja agua={aguaVista} mods={mods} onComprar={(id, preco) => onComprar?.(id, preco)} onFechar={() => { setOficinaAberta(false); jogo.current.encostando = false }}
          onPintura={() => { setOficinaAberta(false); const lp = PAGINAS.find((x) => x.id === "oficina"); if (lp) entrar(lp) }} />
      )}
      {(() => {
        const lp = PAGINAS.find((x) => x.id === paginaPerto)
        if (!lp || entrando || regando || parque === "andando") return null
        if (trancadaPelaHistoria(lp, save.objetos)) return <p className="l-pagina-fechada">{lp.nome} · de portas fechadas</p>
        return abertos[lp.id]
          ? <button type="button" className="l-regar-btn is-pagina" style={{ ["--cor" as string]: lp.cor }} onPointerDown={(e) => e.stopPropagation()} onClick={() => { if (discoM && lp.id === "oficina" && holoOk) { jogo.current.encostando = true; setOficinaAberta(true) } else entrar(lp) }}>entrar · {lp.nome}</button>
          : <p className="l-pagina-fechada">{lp.nome} abre às {abreAs(lp.horario)}</p>
      })()}
      {entrando && (
        <div className="l-entrada-lugar" style={{ ["--cor" as string]: entrando.cor }}>
          <i className="l-faixa-cima" /><i className="l-faixa-baixo" />
          <div className="l-entrada-titulo"><b>{entrando.letreiro}</b><small>{entrando.chegada}</small></div>
          <span className={`l-entrada-barra${carregou ? " is-pronta" : ""}`} />
        </div>
      )}
      {parque === "perto" && !regando && (
        <button type="button" className="l-regar-btn is-parque" onPointerDown={(e) => e.stopPropagation()} onClick={andarMontanha}>andar na montanha-russa</button>
      )}
      {parque === "andando" && (
        <>
          <div className="l-montanha-hud"><b ref={hudMontanha}>0</b><small>km/h</small></div>
          <button type="button" className="l-montanha-bracos" style={{ touchAction: "none" }}
            onPointerDown={(e) => { e.stopPropagation(); passeio.current.bracos = true; e.currentTarget.classList.add("is-on") }}
            onPointerUp={(e) => { passeio.current.bracos = false; e.currentTarget.classList.remove("is-on") }}
            onPointerLeave={(e) => { passeio.current.bracos = false; e.currentTarget.classList.remove("is-on") }}
            onPointerCancel={(e) => { passeio.current.bracos = false; e.currentTarget.classList.remove("is-on") }}
          >braços</button>
        </>
      )}
      {fotoParque && <p className="l-montanha-foto">{fotoParque}</p>}
      {canteiro && !regando && parque !== "andando" && (
        <button type="button" className="l-regar-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => { jogo.current.encostando = true; setRegando(canteiro) }}>regar as flores</button>
      )}
      {regando && (
        <div className="l-ficha-fundo" onPointerDown={(e) => e.stopPropagation()}>
          <div className="l-fliper-jogo" style={{ ["--cor" as string]: ESPECIES[canteiroPorId(regando)?.especie ?? "rosa"].cor }}>
            <Prova id="regar" cor={ESPECIES[canteiroPorId(regando)?.especie ?? "rosa"].cor} onFim={(pulou) => { const id = regando; jogo.current.encostando = false; setRegando(null); if (!pulou) onRegar?.(id) }} />
          </div>
        </div>
      )}
      {parque !== "andando" && (
        <Mapa M={M} apagada={viaApagada} aberta={viaAberta} foco={viaFoco} pose={jogo} missao={lugarDaMissao} marca={marca} onMarcar={setMarca} onAberto={(a) => { jogo.current.noMapa = a }} viagens={aneis.viagens} onViajar={viajar} />
      )}
      <div className="l-combo" aria-hidden />
      {/* (disco) o hyperlapse: duas camadas de linhas de velocidade correndo pra fora */}
      {discoM && <div className="l-hyper" aria-hidden="true" style={{ opacity: 0 }}><i /><i /></div>}
      {dica2 && !cinema && (
        <div className="l-dica2" role="status">
          <b>novo</b>
          <span><kbd>espaço</kbd> 2× ou toque duplo: pula · vira no ar pra girar</span>
          <span><kbd>espaço</kbd> ou toque longo: turbo</span>
          <span>100 anéis = 2 viagens rápidas pelo mapa</span>
        </div>
      )}
      {discoM ? (
        <button type="button" className="l-aneis is-agua" data-info="agua" onPointerDown={(e) => e.stopPropagation()} onClick={() => setPerfil((x) => !x)} aria-label={`${aguaVista} de água, ${aneis.viagens} viagens rápidas`}><i />{aguaVista}{aneis.viagens > 0 && <b>⚡{aneis.viagens}</b>}</button>
      ) : (
        <div className="l-aneis" data-info="aneis" aria-label={`${aneis.total} anéis, ${aneis.viagens} viagens rápidas`}><i />{aneis.total % 100}<small>/100</small>{aneis.viagens > 0 && <b>⚡{aneis.viagens}</b>}</div>
      )}
      <div className="l-relogio" aria-label="relógio da cidade"><b ref={hudRelogio}>{horaTexto(hora)}</b><small ref={hudTurno}>dia {dia}</small></div>

      {/* (disco, LU2CA 19/10) o painel analógico sai: o rádio mora no óculos e o
          turbo e o propulsor ganham o módulo deles (l-propulsao) */}
      {discoM && (
        <div className="l-propulsao" onPointerDown={(e) => e.stopPropagation()}>
          {/* (LU2CA 19/10) um clique semi-longo aciona: o turbo dispara uma vez;
              o propulsor liga e voa enquanto segura (um toque à toa não faz nada) */}
          <button type="button" data-info="turbo" className="l-propulsao-bt is-turbo" aria-label="turbo"
            onPointerDown={(e) => { e.stopPropagation(); armar(e.currentTarget, () => { input.current.turbo = true }) }}
            onPointerUp={(e) => desarmar(e.currentTarget)} onPointerLeave={(e) => desarmar(e.currentTarget)} onPointerCancel={(e) => desarmar(e.currentTarget)}>
            <div className="l-propulsao-barra"><div ref={hudTurbo} /></div>
            <b>turbo</b>
          </button>
          <button type="button" data-info="propulsor" className="l-propulsao-bt is-propulsor" aria-label="propulsor"
            onPointerDown={(e) => { e.stopPropagation(); armar(e.currentTarget, () => { input.current.propulsorBotao = true }) }}
            onPointerUp={(e) => { desarmar(e.currentTarget); input.current.propulsorBotao = false }}
            onPointerLeave={(e) => { desarmar(e.currentTarget); input.current.propulsorBotao = false }}
            onPointerCancel={(e) => { desarmar(e.currentTarget); input.current.propulsorBotao = false }}>
            <div className="l-propulsao-barra"><div ref={hudEnergia} /></div>
            <b>propulsor</b>
          </button>
        </div>
      )}
      {!discoM && <div className="l-painel-kombi" onPointerDown={(e) => e.stopPropagation()}>
      {/* (disco, LU2CA 19/10) sem velocímetro nem odômetro: a velocidade é a da música */}
      {!discoM && <div className="l-hud-vel">
        {tag && <em key={tag.id} className="l-hud-tag" style={{ color: tag.cor }}>{tag.txt}</em>}
        <svg className="l-kombi-dial" viewBox="0 0 100 100" aria-hidden="true">
          {DIAL.map((t) => <line key={t.k} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.k % 2 ? "#6e675c" : "#e8e0cf"} strokeWidth={t.k % 2 ? 1 : 1.8} />)}
          {DIAL.filter((t) => t.k % 2 === 0).map((t) => <text key={`n${t.k}`} x={t.tx} y={t.ty} fill="#e8e0cf" fontSize="7.5" fontFamily="ui-monospace, monospace" textAnchor="middle" dominantBaseline="middle">{t.k * 10}</text>)}
        </svg>
        <i ref={hudAgulha} className="l-kombi-agulha" />
        <span ref={hudVel}>0</span>
        <small>km/h</small>
        <span ref={hudMarcha} className="l-hud-marcha">1ª</span>
        <em ref={hudOdo} className="l-kombi-odo">0000.0</em>
      </div>}

      {/* o aparelho da Kombi: RÁDIO ou TOCA-DISCOS (nunca os dois) */}
      <div ref={radioBtn as unknown as React.RefObject<HTMLDivElement>} className={`l-player is-${aparelho} ${V.tipo === "saida" && aparelho === "radio" ? "is-sintonizando" : ""}`} style={{ ["--cor" as string]: aparelho === "disco" ? "#ffc857" : fq.cor }} onPointerDown={(e) => e.stopPropagation()}>
        <div className="l-player-tela">
          {aparelho === "disco" ? (
            <>
              <span className="l-player-aparelho"><i className={`l-player-vinil ${discoAgora.tocando ? "is-gira" : ""}`} />TOCA-DISCOS</span>
              <b>{discoInfo ? discoInfo.titulo : "sem disco"}</b>
              <small>{discoAgora.tocando ? "analógico · nada interrompe" : "o disco acabou · escolhe outro"}</small>
              <span className="l-player-ctl">
                <button type="button" onClick={() => disco.proxima()} disabled={!discoAgora.tocando} aria-label="próxima faixa">⏭ próxima</button>
                <button type="button" onClick={() => { if (!dentro) trocarCamera(); setEstante(true) }}>trocar disco</button>
              </span>
            </>
          ) : aparelho === "radio" ? (
            <>
              <span ref={hudFreq} className="l-player-aparelho">{fq.freq} FM</span>
              {caido ? <b className="is-caida">sem sinal · o núcleo derrubou a 222</b>
                : passandoE ? <b key={passando!.t} className="is-estacao" style={{ color: passandoE.cor }}>estação {passandoE.n} · {passandoE.faixa.toLowerCase()}</b>
                : <b>{faixa || "fora do ar · cada missão traz uma música"}</b>}
              <small ref={hudTom}>troca pelo caminho</small>
            </>
          ) : (
            <>
              <span className="l-player-aparelho">DESLIGADO</span>
              <b>rádio ou disco?</b>
              <small>só um de cada vez</small>
            </>
          )}
        </div>
        <div className="l-player-bts">
          <button type="button" className={aparelho === "radio" ? "is-on" : ""} onClick={() => {
            if (aparelho === "radio") return fonteSom.set("off")
            fonteSom.set("radio")
            setTimeout(() => tocarProxima(freqRef.current), 0)
          }}>RÁDIO</button>
          <button type="button" className={aparelho === "disco" ? "is-on" : ""} onClick={() => {
            if (aparelho === "disco") return fonteSom.set("off")
            // o disco se escolhe DENTRO da Kombi: entra e olha pro toca-discos
            if (!dentro) trocarCamera()
            setEstante(true)
          }}>DISCO</button>
        </div>
      </div>

      <div className="l-kombi-dir">
        <div ref={hudCombBox} className="l-kombi-comb is-solar" aria-label={abertura ? "combustível" : "energia solar"}>
          <svg viewBox="0 0 60 34" aria-hidden="true">
            <path d="M6 30 A24 24 0 0 1 54 30" fill="none" stroke="#3a332c" strokeWidth="3" />
            <path d="M6 30 A24 24 0 0 1 12 14" fill="none" stroke={abertura ? "#ff5b3a" : "#3a332c"} strokeWidth="3" />
            {!abertura && <path d="M42 12 A24 24 0 0 1 54 30" fill="none" stroke="#5dffa0" strokeWidth="3" />}
            <text x="4" y="33" fill="#e8e0cf" fontSize="6" fontFamily="ui-monospace, monospace">{abertura ? "E" : "−"}</text>
            <text x="52" y="33" fill="#e8e0cf" fontSize="6" fontFamily="ui-monospace, monospace">{abertura ? "F" : "+"}</text>
            <line ref={hudComb} x1="30" y1="30" x2="30" y2="10" stroke={abertura ? "#ff6a35" : "#5dffa0"} strokeWidth="1.6" transform="rotate(80 30 30)" />
          </svg>
          <small>{abertura ? "R" : "☀"}</small>
        </div>
        <button
          type="button"
          className="l-hud-turbo"
          onPointerDown={(e) => { e.stopPropagation(); input.current.turbo = true }}
        >
          <div className="l-hud-turbo-barra"><div ref={hudTurbo} /></div>
          <span>turbo</span>
        </button>
        {/* (disco) o propulsor: segura pra voar (no teclado, segura o espaço) */}
        {"disco" in M && (
          <button
            type="button"
            className="l-hud-turbo is-propulsor"
            onPointerDown={(e) => { e.stopPropagation(); input.current.propulsorBotao = true }}
            onPointerUp={() => { input.current.propulsorBotao = false }}
            onPointerLeave={() => { input.current.propulsorBotao = false }}
            onPointerCancel={() => { input.current.propulsorBotao = false }}
          >
            <div className="l-hud-turbo-barra"><div ref={hudEnergia} /></div>
            <span>propulsor</span>
          </button>
        )}
      </div>
      </div>}

      {/* a pontuação do drift, no alto e no centro (CarX / Drift Max) */}
      <div ref={hudDrift} className="l-hud-drift" aria-hidden="true"><b /><i /><small /></div>

      <div ref={hudParado} className="l-hud-parado"><b>↑</b> ou <b>W</b> pra acelerar · <b>↓</b> dá ré</div>

      {/* celular: freio/ré (segurar). Drift é na direção: a finta */}
      {/* (disco, LU2CA 21/10) sem freio/ré nem freio de mão na tela: frear é tocar os
          dois lados; o "dar partida" só aparece com a Kombi parada (desligada) */}
      {discoM ? (desligada && !dePatins && (
        <div className="l-pedais" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" className="l-pedal is-partida" onPointerDown={(e) => e.stopPropagation()} onClick={darPartida}>dar<br />partida</button>
        </div>
      )) : (      <div className={`l-pedais ${dentro ? "is-oculto" : ""}`} onPointerDown={(e) => e.stopPropagation()}>
        {desligada && !dePatins ? (
          <button type="button" className="l-pedal is-partida" onPointerDown={(e) => e.stopPropagation()} onClick={darPartida}>dar<br />partida</button>
        ) : <button
          type="button"
          className="l-pedal is-re"
          onPointerDown={(e) => { e.stopPropagation(); input.current.freio = true }}
          onPointerUp={() => { input.current.freio = false }}
          onPointerCancel={() => { input.current.freio = false }}
          onPointerLeave={() => { input.current.freio = false }}
        >freio<br />ré</button>}
        <button
          type="button"
          className="l-pedal is-mao"
          onPointerDown={(e) => { e.stopPropagation(); input.current.mao = true }}
          onPointerUp={() => { input.current.mao = false }}
          onPointerCancel={() => { input.current.mao = false }}
          onPointerLeave={() => { input.current.mao = false }}
        >freio<br />de mão</button>
      </div>)}

      {dica && (
        <div className="l-hud-dica">
          <span>← segura</span>
          <span><span className="is-desk">↑ acelera · ↓ freia/ré · shift turbo · espaço freio de mão<br /></span>drift: freio de mão + vira, ou toque pra fora e vira pra dentro</span>
          <span>segura →</span>
        </div>
      )}

      {estante && (
        <div className="l-estante" onPointerDown={(e) => e.stopPropagation()}>
          <header>
            <b>os discos da kombi</b>
            <button type="button" onClick={() => setEstante(false)} aria-label="fechar">✕</button>
          </header>
          <p>escolhe um disco e põe pra tocar, do começo ao fim. disco é analógico: o núcleo não alcança</p>
          <ul>
            {discosDaKombi(save.discos ?? []).map((d) => {
              const srcs = d.faixas.map((f) => f.src)
              const esse = discoAgora.tocando && !!discoAgora.src && srcs.includes(discoAgora.src)
              const faixa = esse ? d.faixas.find((f) => f.src === discoAgora.src) : null
              return (
                <li key={d.id}>
                  <button type="button" className={esse ? "is-on" : ""} onClick={() => {
                    fonteSom.set("disco")
                    disco.tocarLista(srcs)
                    setEstante(false)
                    if (!dicas.includes("disco-2")) {
                      onDica?.("disco-2")
                      setTimeout(() => falar("D-Bee", "isso. disco nunca para, nem pro núcleo. rádio e disco não tocam juntos", 8000), 1500)
                    }
                  }}>
                    <i className="l-estante-capa"><Capa motivo={d.motivo} a={d.a} b={d.b} titulo="" size={44} /></i>
                    <span><b>{d.titulo}</b><small>{faixa ? `tocando: ${faixa.titulo}` : `${d.faixas.length} faixas`}</small></span>
                  </button>
                </li>
              )
            })}
          </ul>
          {!(save.discos ?? []).length && <small className="l-estante-loja">mais discos na LOJA DE DISCOS, no celular</small>}
        </div>
      )}

      {portalE && !chegou && podeDescerPortal && (
        <button
          key={portal!.t}
          type="button"
          className="l-descer"
          style={{ ["--cor" as string]: portalE.cor }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => descerAqui(portalE.id, { ...jogo.current.st, tempo: jogo.current.tempo })}
        >
          <small>estação {portalE.n} · {portalE.personagem}</small>
          <b>descer aqui →</b>
        </button>
      )}

      {chegou && dest && (
        <div className="l-chegada" style={{ ["--cor" as string]: dest.cor }}>
          <small>estação {dest.n}</small>
          <h2>{dest.faixa}</h2>
          <p className="l-chegada-cidade">{dest.cidade}</p>
          <dl>
            <div><dt>tempo</dt><dd>{chegou.tempo.toFixed(1)}s</dd></div>
            <div><dt>máx</dt><dd>{Math.round(chegou.vmax * 3.6 * K_VEL)} km/h</dd></div>
            <div><dt>sinal</dt><dd>+{chegou.sinal}</dd></div>
            <div><dt>no ar</dt><dd>{chegou.ar.toFixed(1)}s</dd></div>
          </dl>
          <button type="button" className="l-btn" onClick={() => descerAqui(dest.id, chegou)}>descer na estação</button>
          <button
            type="button"
            className="l-btn l-btn-ghost"
            onClick={() => { setChegou(null); setDestino(null); jogo.current.chegando = false; jogo.current.parado = false }}
          >
            continuar rodando
          </button>
        </div>
      )}
    </div>
  )
}

// PASSO 1 da otimização: dentro de uma sala a estrada SAI da tela (desmonta,
// libera a memória da placa de vídeo). O mundo montado fica em cache e a
// posição da Kombi fica guardada aqui, pra ela voltar no mesmo ponto
let MUNDO: Mundo | null = null
// o mapa novo (a rede de ruas do v5) atrás do /linha?mapa=novo; fica marcado na sessão
// (18/10, LU2CA: "a pior versão até hoje" — sem guard rail, a Kombi sai da rua
// e entra nos prédios, a cidade no chão) o mapa VELHO volta a ser o padrão; o
// 2.0 fica atrás do ?mapa=novo (marcado na aba) até ficar pronto; ?mapa=velho desfaz
export { qualMapa } from "./qualMapa"
function mundo() {
  if (MUNDO) return MUNDO
  const q = qualMapa()
  return (MUNDO = q === "disco" ? montarMundoDisco() : q === "novo" ? montarMundoRede() : montarMundo())
}
export interface Retomada { via: string; u: number; x: number; naVaga?: string | false; naSeg?: boolean }
let RETOMAR: Retomada | null = null

// as páginas robustas dos lugares: baixadas durante a cutscene de entrada
const CARREGAR_PAGINA: Record<LugarPagina["id"], () => Promise<unknown>> = {
  ginasio: () => import("../../ginasio/page"),
  galeria: () => import("../../galeria/GaleriaScene"),
  fliperama: () => import("../../fliperama/page"),
  shows: () => import("../../casa-de-shows/Show"),
  oficina: () => import("../../oficina/Elevador"),
}

export interface Comb {
  tanque: number
  via: number // onde fica o posto
  u: number
  avisou: boolean
  onPosto: () => void
  t: number // último aviso pro page (guardar no save)
  // a gasolina acabou e você foi de patins (Patins.tsx): onde a Kombi ficou
  patins?: boolean
  parada?: { pos: THREE.Vector3; quat: THREE.Quaternion; via: number; u: number; x: number } | null
  aqui?: THREE.Vector3 // onde você está agora (pra saber se está perto da Kombi parada)
}

export interface Abertura {
  ativa: boolean
  via: number
  u: number
  porta: THREE.Vector3 // a porta da casa, no chão
  fase: "dirige" | "parou" | "ape" | "porta"
  pe: number // 0..1 do caminho a pé
  semGas: boolean
  t0: number
  de: THREE.Vector3 | null // onde desceu da Kombi
  onPorta: () => void
}

// a pessoa a pé (a abertura): o mesmo corpo da gente das portas
function Caminhante({ abRef }: { abRef: React.MutableRefObject<Abertura> }) {
  const { scene } = useGLTF("/models/pessoa.glb")
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2c2838", emissive: "#e6f0ff", emissiveIntensity: 0.12, roughness: 0.75 }), [])
  const corpo = useMemo(() => {
    const g = scene.clone(true)
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = mat })
    return g
  }, [scene, mat])
  const g = useRef<THREE.Group>(null)
  const passo = useRef(0)
  const ant = useRef(0)
  useFrame((_, dt) => {
    const a = abRef.current
    if (!g.current) return
    const vis = !!a.de && (a.fase === "ape" || a.fase === "porta")
    g.current.visible = vis
    if (!vis || !a.de) return
    g.current.position.lerpVectors(a.de, a.porta, a.pe)
    g.current.rotation.y = Math.atan2(a.porta.x - a.de.x, a.porta.z - a.de.z)
    if (a.pe !== ant.current) passo.current += dt * 9
    ant.current = a.pe
    g.current.position.y += Math.abs(Math.sin(passo.current)) * 0.05
  })
  return <group ref={g} visible={false}><primitive object={corpo} /></group>
}

function retomarJogo(M: Mundo, r: Retomada | null): Jogo | null {
  if (!r) return null
  const i = M.vias.findIndex((v) => v.id === r.via)
  if (i < 0) return null
  const j = novoJogo(M, null, null)
  const C = M.vias[i]
  j.via = i
  j.u = Math.min(Math.max(0, r.u), C.L - 1)
  j.x = r.x
  j.y = C.py[Math.floor(j.u / PASSO)] ?? j.y
  // já encostou nesse lugar: não reabre a cena parada na porta
  j.naVaga = r.naVaga
  j.naSeg = r.naSeg
  j.encaixar = true
  return j
}

function novoJogo(M: Mundo, destino: EstacaoId | null, estacao: EstacaoId | null, abertura = false): Jogo {
  // a abertura: no deserto, uns 650 m antes da casa da D-Bee
  if (abertura) {
    const casa = LUGARES["casa-dbee"]
    const oc = posicao(M, "lugar:casa-dbee", casa.area, casa.u, casa.lado, casa.via)
    const di = oc.via
    const j = novoJogo(M, null, null)
    j.via = di
    j.u = Math.max(0, oc.u - 650)
    j.y = M.vias[di].py[Math.floor(j.u / PASSO)]
    return j
  }
  // começa sempre no centro (cidade neon, 222.0)
  const c = M.vias[M.circuito.linha]
  // (no mapa novo as estações ainda não têm lugar: começa no começo da rua)
  const u0 = Math.min(c.L - 50, (c.estacoes[0]?.u ?? 250) - 150)
  let u = u0
  const e = (id: EstacaoId) => c.estacoes.find((x) => x.id === id)
  // com destino: ~900m antes, pra dar gosto de chegar
  if (destino && e(destino)) u = Math.max(u0, e(destino)!.u - 900)
  else if (estacao && e(estacao)) u = e(estacao)!.u + 25
  return {
    via: M.circuito.linha,
    u, x: 0, v: 0, vx: 0, steer: 0, y: c.py[Math.floor(u / PASSO)], vy: 0, ar: false, tAr: 0,
    turboT: 0, carga: 0, shake: 0, flash: 0, deriva: 0, giro: 0, drift: 0, peso: 0, ladoAnt: 0, driftT: 0, dPts: 0, dMult: 1, dFim: 0, dTotal: 0, dMsg: "", dMsgT: 0, dRaspa: 0, impacto: 0, soco: false, tempo: 0, voltaIni: -1, voltas: 0,
    chegando: false, parado: false, sintonizou: false,
    escolha: 0, escolhaU: -1,
    st: { tempo: 0, vmax: 0, orbs: 0, quase: 0, sinal: 0, ar: 0, voltas: 0 },
    pegos: new Set(),
  }
}

/* eslint-disable react-hooks/immutability, react-hooks/purity --
   cena R3F: useFrame muta geometria, instâncias e uniforms do three.js a
   60fps por design; nada disso é estado do React */
/* ─── cena ──────────────────────────────────────────────── */
function Cena({
  tags,
  M, jogo, input, evs, destinoRef, temTurbo, confeteRef, nivel, objetos, nLib, nLibRef, marcos, marcosRef, estacaoAlvo, corRadio, pausado, cinemaRef, limitadoRef, cacadoRef, dentroRef, discoRef, disco, carona, lugarAlvoRef, fonteRef, onTocaDiscos, vagaRef, camLugarRef, lugarAlvoId, cenaLugar, segredoRef, aberturaRef, celularRef, combRef, horaRef, abertos, paginaPerto, camEntrada, climaRef, regadas, passeio, respiroRef, marcaRef, floresAsf, viaApagada, luzPistas, faseHistoria = null, onRobo, semPaineis = false, alvoChao = null, soTema = false, temaMissao = null,
}: {
  alvoChao?: LugarChao | null
  // (LU2CA 21/10 (3)) a música é o TEMA da missão: na carreira (soTema), a
  // missão pegada (temaMissao) toca o instrumental até ele achar a linha dela;
  // na linha, a música toca UMA vez; depois, o instrumental de novo. Sem missão,
  // nenhuma faixa de pista: só os discos
  soTema?: boolean
  temaMissao?: string | null
  semPaineis?: boolean
  faseHistoria?: string | null
  onRobo?: React.RefObject<() => void>
  segredoRef: React.MutableRefObject<{ id: LugarId; via: number; u: number; lado: 1 | -1; voltas: number } | null>
  aberturaRef: React.MutableRefObject<Abertura>
  celularRef: React.MutableRefObject<boolean>
  combRef: React.MutableRefObject<Comb>
  horaRef: React.MutableRefObject<number>
  abertos: Record<string, boolean>
  paginaPerto: string | null
  camEntrada: React.RefObject<{ cam: THREE.Vector3; olhar: THREE.Vector3 } | null>
  climaRef: React.RefObject<{ chove: boolean; k: number }>
  respiroRef: React.MutableRefObject<{ pode: boolean; feito: boolean }>
  marcaRef: React.RefObject<Marca | null>
  floresAsf: { leva: FlorAsfalto[]; regadas: FlorAsfalto[]; regando: { id: string; desde: number } | null; visivel: boolean }
  // (disco) as vias das pistas apagadas (o ato ainda não chegou nelas)
  viaApagada: boolean[] | null
  // (disco) a luz de cada pista (os monumentos dos atos acendem com ela)
  luzPistas: Record<string, Luz> | null
  fonteRef: React.MutableRefObject<Fonte>
  onTocaDiscos: () => void
  disco: boolean
  carona: EstacaoId | null
  lugarAlvoRef: React.MutableRefObject<FreqId | null>
  vagaRef: React.MutableRefObject<{ id: LugarId; via: number; u: number; lado: 1 | -1; nome: string; cor: string; quem: string } | null>
  camLugarRef: React.MutableRefObject<PoseLugar | null>
  lugarAlvoId: LugarId | null
  cenaLugar: LugarId | null
  dentroRef: React.MutableRefObject<boolean>
  discoRef: React.MutableRefObject<boolean>
  cacadoRef: React.MutableRefObject<boolean>
  limitadoRef: React.MutableRefObject<boolean>
  pausado: boolean
  cinemaRef: React.MutableRefObject<Cinema>
  corRadio: React.MutableRefObject<string>
  marcos: Marco[]
  marcosRef: React.MutableRefObject<Marco[]>
  regadas: string[]
  passeio: React.RefObject<PasseioParque>
  estacaoAlvo: EstacaoId | null
  // quem tem missão em aberto em cada área (etiqueta nas placas)
  tags: Partial<Record<FreqId, { nome: string; cor: string }[]>>
  M: Mundo
  jogo: React.MutableRefObject<Jogo>
  input: React.MutableRefObject<Input>
  evs: React.MutableRefObject<Evs>
  destinoRef: React.MutableRefObject<EstacaoId | null>
  temTurbo: boolean
  confeteRef: React.MutableRefObject<((cor: string, n: number) => void) | null>
  nivel: number
  objetos: EstacaoId[]
  nLib: number
  nLibRef: React.MutableRefObject<number>
}) {
  // o lugar secreto já apareceu (Lugares acende a vaga dele)
  const [revelado, setRevelado] = useState<LugarId | null>(null)
  const { camera, scene, gl } = useThree()
  // teste (fora da produção, ou com ?medir na URL): a cena e o renderizador, pra
  // medir o que pesa e a lisura (scripts de desempenho)
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && !/[?&]medir/.test(location.search)) return
    const w = window as unknown as Record<string, unknown>
    // (__jogo e __M: o teste põe a Kombi num ponto do mapa, ex. na espiral)
    w.__cena = scene; w.__gl = gl; w.__cam = camera; w.__jogo = jogo.current; w.__M = M
    w.__travas = () => ({ cine: cinemaRef.current, abertura: aberturaRef.current.ativa, patins: combRef.current.patins, inp: { ...input.current } })
  }, [scene, gl, camera, jogo, M, cinemaRef, aberturaRef, combRef, input])
  // (19/10, desempenho) o three compila o shader de cada material na 1ª vez que
  // ele aparece na tela: no meio da corrida, travava 1–3 s. Compila tudo antes,
  // sem travar (luzes.tsx); de novo depois que os modelos carregam
  useEffect(() => {
    const compilar = () => { void compilarSemTravar(gl, scene, camera, scene) }
    const ts = [0, 1500, 5000, 12000].map((ms) => window.setTimeout(compilar, ms))
    return () => ts.forEach(clearTimeout)
  }, [scene, gl, camera])
  const camMontanha = useRef<{ pos: THREE.Vector3; olhar: THREE.Vector3; up: THREE.Vector3 } | null>(null)
  // olhar em volta de dentro (como na drive-v2): arrasta → gira até ±150° e
  // ±60°; solta → fica 7 s parado ali e depois volta devagar pra frente
  const olhar = useRef({ yaw: 0, pitch: 0, alvoYaw: 0, alvoPitch: 0, arrastando: false, soltou: 0, x: 0, y: 0, id: -1 })
  // a câmera dinâmica (LU2CA 16/10: "como a do GTA 6"): o rumo dela atrasa em
  // relação ao da Kombi (nas curvas e no drift aparece a lateral), a distância
  // respira com a aceleração, olha pra dentro da curva, deita um pouco com ela,
  // e parada dá uma volta lenta de cinema
  const camDin = useRef({ f: new THREE.Vector3(0, 0, -1), vAnt: 0, puxa: 0, parada: 0, orbita: 0, roll: 0, lado: 0, ok: false, carF: new THREE.Vector3(), dir: new THREE.Vector3(), off: new THREE.Vector3(), offOk: false, yS: 0, ySok: false, enc: 1,
    cz: { ok: false, ant: false, patins: false, t: 1, yaw: 0, vYaw: 0, dist: 8, vDist: 0, alt: 3, vAlt: 0, y: 0, vY: 0, de: new THREE.Vector3(), deOlhar: new THREE.Vector3() } })
  useEffect(() => {
    const el = gl.domElement
    const YAW = (150 * Math.PI) / 180
    const PITCH = (60 * Math.PI) / 180
    const o = olhar.current
    const down = (e: PointerEvent) => {
      // de dentro: o dedo ou o mouse; de fora: só o mouse (no celular os dedos dirigem)
      if ((!dentroRef.current && e.pointerType !== "mouse") || (e.pointerType === "mouse" && e.button !== 0)) return
      o.arrastando = true; o.x = e.clientX; o.y = e.clientY; o.id = e.pointerId
    }
    const move = (e: PointerEvent) => {
      if (!o.arrastando || e.pointerId !== o.id) return
      o.alvoYaw = Math.max(-YAW, Math.min(YAW, o.alvoYaw - (e.clientX - o.x) * 0.006))
      o.alvoPitch = Math.max(-PITCH, Math.min(PITCH, o.alvoPitch - (e.clientY - o.y) * 0.005))
      o.x = e.clientX; o.y = e.clientY
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== o.id) return
      o.arrastando = false; o.id = -1; o.soltou = performance.now()
    }
    el.addEventListener("pointerdown", down)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      el.removeEventListener("pointerdown", down)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [gl, dentroRef])
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__olhar = (yaw: number, pitch = 0) => { const o = olhar.current; o.alvoYaw = yaw; o.alvoPitch = pitch; o.soltou = performance.now() }
    return () => { delete w.__olhar }
  }, [])
  const carro = useRef<THREE.Group>(null)
  const ceu = useRef<THREE.Mesh>(null)
  const a = useMemo(() => novaAmostra(), [])
  // (20/10) o nível de qualidade do aparelho (qualidade.ts): muda uma vez, quando a medida termina
  const [qual, setQual] = useState(QUALIDADE.nivel)
  const motor = useMemo(() => montarMotor(), [])
  const reduz = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, [])
  // (disco) a faixa de cada pista (a pista é o toca-discos) e qual está tocando
  const faixasDisco = useMemo<(PistaFaixa | null)[]>(() => ("disco" in M ? (M as MundoDisco).pistas.map((p) => PISTAS.find((x) => x.faixa === p.nome) ?? null) : []), [M])
  const pistaTocando = useRef(-1)
  const pistaEscura = useRef(false) // (os atos) a pista tocando agora está apagada?
  // (21/10 (3)) o tema da missão: o índice da pista dela e em que ponto a
  // música está (antes de achar a linha → tocando a voz uma vez → já tocou)
  const temaK = useMemo(() => (temaMissao ? faixasDisco.findIndex((f) => f?.id === temaMissao) : -1), [temaMissao, faixasDisco])
  const temaRef = useRef<{ k: number; voz: "antes" | "tocando" | "tocou"; chave: string }>({ k: -1, voz: "antes", chave: "" })
  useEffect(() => { temaRef.current = { k: temaK, voz: "antes", chave: "" } }, [temaK])
  const soTemaRef = useRef(soTema)
  useEffect(() => { soTemaRef.current = soTema }, [soTema])
  useEffect(() => () => pistaSom.parar(), [])
  const centro = M.vias[M.circuito.linha]
  // no mapa novo, as "voltas" de prédio e trânsito são as ruas (uma mão só)
  const circuitos = useMemo(() => M.vias.filter((v) => v.tipo === "circuito" || (v.tipo === "rua" && v.rede?.ida)), [M])
  const relevoNovo = useMemo(() => ("disco" in M ? geoChaoDisco() : "ligacoes" in M ? geoRelevoRede(M as MundoRede) : null), [M])
  // (disco, 20/10) o lixão: os carros despencados meio enterrados e os pneus
  // (duas malhas instanciadas pro lixão inteiro)
  const lixo = useMemo(() => {
    if (!("disco" in M)) return null
    const l = lixoNoChao((x, z) => M.livre(x, z, 3))
    const corpo = new THREE.BoxGeometry(2, 1.1, 4.4).translate(0, 0.55, 0)
    const cabine = new THREE.BoxGeometry(1.8, 0.8, 2.2).translate(0, 1.5, -0.2)
    const carroGeo = mergeGeometries([corpo, cabine], false)!
    const carros = new THREE.InstancedMesh(carroGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.35 }), Math.max(1, l.carros.length))
    l.carros.forEach((m, i) => { carros.setMatrixAt(i, m); carros.setColorAt(i, l.coresCarro[i]) })
    carros.count = l.carros.length
    const pneus = new THREE.InstancedMesh(new THREE.TorusGeometry(0.42, 0.18, 6, 12), new THREE.MeshStandardMaterial({ color: "#141217", roughness: 0.95 }), Math.max(1, l.pneus.length))
    l.pneus.forEach((m, i) => pneus.setMatrixAt(i, m))
    pneus.count = l.pneus.length
    return { carros, pneus }
  }, [M])

  useEffect(() => () => motor?.parar(), [motor])
  // a estática da sintonia (entre um lugar e outro)
  const chiado = useRef<ReturnType<typeof estatica>>(null)
  const calar = useCallback(() => { chiado.current?.parar(); chiado.current = null }, [])
  useEffect(() => () => calar(), [calar])
  useEffect(() => {
    if (pausado) { calar(); motor?.atualizar(0, false, false) }
  }, [pausado, calar, motor])

  const metro = useMemo(() => montarMetro(M), [M])
  const centrosLugares = useMemo(() => Object.values(LUGARES).map((l) => poseLugar(M, l).centro), [M])
  // o subúrbio mora no meio do anel da cidade: o centro e até onde vai o chão
  const centroSub = useMemo(() => {
    const v = M.vias[M.circuito.linha]
    let x = 0, z = 0
    for (let i = 0; i < v.n; i++) { x += v.px[i]; z += v.pz[i] }
    x /= v.n
    z /= v.n
    let r = Infinity
    for (let i = 0; i < v.n; i++) r = Math.min(r, Math.hypot(v.px[i] - x, v.pz[i] - z))
    return { x, z, r: r - MEIA - 4 }
  }, [M])
  const tex = useMemo(() => ({ asfalto: texAsfalto(), janelas: texJanelas(), brilho: texBrilho(), turbo: texTurbo() }), [])

  // cor de cada trecho: o lugar do circuito; nas saídas, metade de cada lado
  const distI = useCallback((v: Via, i: number): Distrito => distritoDe(v.tipo === "saida" && i < v.n / 2 ? v.de! : v.t), [])
  const rgb = useMemo(() => {
    const m = new Map<string, [number, number, number]>()
    for (const d of DISTRITOS) for (const c of [...d.trilho, ...d.luz]) m.set(c, hexRgb(c))
    return (c: string) => m.get(c) ?? hexRgb(c)
  }, [])

  // ── pista ──
  const geo = useMemo(() => {
    // (disco) a volta é o mesmo asfalto da ida: desenha uma vez só
    const vias = (M.vias as Via[]).filter((v) => !((v as Via & { disco?: boolean }).disco && v.rede && !v.rede.ida))
    const U = (i: number) => i * PASSO
    // nunca um trilho atravessando pista: some onde a pista divide, onde
    // outra encosta chegando, e no começo/fim das saídas (coladas no circuito)
    const divide = (v: Via, i: number, lado: number) => v.faixas.some((f) => f.lado === lado && Math.abs(i - Math.floor(f.u / PASSO)) <= 1)
    const chegando = (v: Via, i: number) => v.chegadas.some((c) => U(i) > c.u - 220 && U(i) < c.u + 10)
    // (disco) a borda de dentro de cada mão é o meio da pista: lá é linha, não guard rail
    const doDisco = (p: Pista) => !!(p as Via & { disco?: boolean }).disco
    // (desempenho) o desenho das pistas do disco usa uma amostra a cada 6 m (a física, a cada 2)
    const passoD = (p: Pista) => (doDisco(p) ? 3 : 1)
    // (os atos) pista apagada: o neon dela fica num cinza escuro
    const indice = new Map((M.vias as Via[]).map((v, i) => [v, i]))
    const corDe = (p: Pista) => (viaApagada?.[indice.get(p as Via) ?? -1] ? "#2a2838" : (p as Via & { cor?: string }).cor)
    const coresApagadas = new Set(viaApagada && "disco" in M ? (M as MundoDisco).pistas.filter((pp) => viaApagada[pp.ida]).map((pp) => pp.cor) : [])
    // o começo e o fim do balão: as duas pernas ainda se sobrepõem (sem trilho lá)
    // (e nas emendas da torre: as alças se separam da espiral e uma da outra)
    const gargalo = (p: Pista, i: number) => {
      const id = (p as Via).id, u = U(i)
      if (/:balao$/.test(id)) return u < 75 || u > p.L - 75
      // (alças: meia pista; a saída nasce em cima da espiral, a chegada morre nela)
      if (/:saida\d+$/.test(id)) return u < 35
      if (/:entrada\d+$/.test(id)) return u > p.L - 35
      return false
    }
    // (espiral) onde a borda de fora se abre pra uma alça: sem guard rail nem borda
    const abertoFora = (p: Pista, i: number) => ((p as Via & SinaisEspiral).abreFora ?? []).some(([a, b]) => U(i) >= a && U(i) <= b)
    const CIANO = hexRgb("#2fe8ff"), ROSA = hexRgb("#ff3fb0"), BRANCO: [number, number, number] = [1, 1, 1]
    const trilhoE = (p: Pista, i: number) => {
      const v = p as Via
      const u = U(i)
      if (doDisco(p)) return !gargalo(p, i)
      if (v.id === "deserto") return u > 90 && (u < 900 || u > v.L - 900) && u < v.L - 230
      if (v.tipo === "circuito") return !divide(v, i, -1)
      return !(v.lado! > 0 && u < 90) && u < v.L - 230
    }
    const trilhoD = (p: Pista, i: number) => {
      const v = p as Via
      const u = U(i)
      if (doDisco(p)) return !gargalo(p, i) && !abertoFora(p, i)
      if (v.id === "deserto") return u < 900 || u > v.L - 900
      if (v.tipo === "circuito") return !divide(v, i, 1) && !chegando(v, i)
      return !(v.lado! < 0 && u < 90)
    }
    const rails = (lado: number) => fita(vias, (p, i) => (lado < 0 ? p.esq[i] - 0.25 : p.dir[i] + 0.25), 0.75, 0, {
      passo: passoD,
      vertical: true,
      incluir: lado < 0 ? trilhoE : trilhoD,
      // (disco) o guard rail na cor da linha
      cor: (p, i) => (Math.floor(i / 10) % 2 ? rgb(corDe(p) ?? distI(p as Via, i).trilho[lado < 0 ? 0 : 1]) : [0.05, 0.05, 0.12]),
    })
    const semEmenda = (p: Pista, i: number) => {
      const v = p as Via
      if (v.tipo === "circuito") return !divide(v, i, -1) && !divide(v, i, 1)
      return U(i) > 60 && U(i) < v.L - 120
    }
    // tracejado que separa a faixa de saída da pista que fica
    const divisoria = (lado: number) => fita(circuitos, lado * MEIA - 0.12, lado * MEIA + 0.12, 0.045, {
      incluir: (p, i) => i % 5 < 3 && (p as Via).faixas.some((f) => f.lado === lado && U(i) > f.u - ABRE + 110 && U(i) < f.u),
    })
    return {
      chao: fita(vias, (p, i) => p.esq[i] - 0.25, (p, i) => p.dir[i] + 0.25, 0.01, { passo: passoD }),
      // (disco) cada mão tem 2 faixas: um tracejado só, no meio dela
      // (disco) 4 faixas: o tracejado separa as duas de cada sentido (±4,2 m)
      // (alças: meia pista, só o tracejado de dentro dela)
      faixas: [-MEIA / 3, MEIA / 3].map((x) => fita(vias, (p) => (doDisco(p) ? Math.sign(x) * 4.2 : x) - 0.1, (p) => (doDisco(p) ? Math.sign(x) * 4.2 : x) + 0.1, 0.04, { passo: passoD, incluir: (p, i) => i % 6 < 3 && (doDisco(p) ? !gargalo(p, i) && (x < 0 ? p.esq[i] < -4.2 : p.dir[i] > 4.2) : semEmenda(p, i)), cor: (p) => (doDisco(p) ? rgb(corDe(p)!) : CIANO) })),
      // (disco) as duas bordas na cor da linha
      bordas: [-1, 1].map((l) => fita(vias, (p, i) => (l < 0 ? p.esq[i] + 0.23 : p.dir[i] - 0.47), (p, i) => (l < 0 ? p.esq[i] + 0.47 : p.dir[i] - 0.23), 0.04, { passo: passoD, incluir: (p, i) => (doDisco(p) ? !gargalo(p, i) && !(l > 0 && abertoFora(p, i)) : semEmenda(p, i)), cor: (p) => (doDisco(p) ? rgb(corDe(p)!) : l < 0 ? CIANO : ROSA) })),
      // (disco, sinalização) na espiral, a faixa da direita pintada na cor da
      // linha nos 150 m antes da saída dela: quem está nela, sai
      pintaSaida: fita(vias.filter((v) => ((v as Via & SinaisEspiral).pintaSaida ?? []).length), 4.5, 7.8, 0.035, {
        incluir: (p, i) => ((p as Via & SinaisEspiral).pintaSaida ?? []).some((s) => U(i) >= s.u0 && U(i) < s.u1 && !coresApagadas.has(s.cor)),
        cor: (p, i) => rgb(((p as Via & SinaisEspiral).pintaSaida ?? []).find((s) => U(i) >= s.u0 && U(i) < s.u1)!.cor),
      }),
      // (disco) a linha contínua branca no meio (o canteiro é aberto: só pintura)
      linhasGarfo: [divisoria(-1), divisoria(1), fita(vias, -0.14, 0.14, 0.045, { passo: passoD, incluir: (p, i) => doDisco(p) && !gargalo(p, i) })],
      railE: rails(-1),
      railD: rails(1),
      saiaE: fita(vias, (p, i) => p.esq[i] - 0.25, 1.8, -1.8, { vertical: true, passo: passoD, incluir: (p, i) => semEmenda(p, i) && trilhoE(p, i) }),
      saiaD: fita(vias, (p, i) => p.dir[i] + 0.25, 1.8, -1.8, { vertical: true, passo: passoD, incluir: (p, i) => semEmenda(p, i) && trilhoD(p, i) }),
    }
  }, [M, circuitos, distI, rgb, viaApagada])

  // ── cidade: cada lugar com a sua arquitetura e a cor do seu gás ──
  const cidade = useMemo(() => {
    const r = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646 })()
    const d = new THREE.Object3D()
    const ESTILO: Record<Distrito["predio"], { n: number; h: [number, number]; w: [number, number]; off: [number, number]; brilho: number }> = {
      torres: { n: 190, h: [24, 175], w: [10, 28], off: [22, 110], brilho: 1.25 },
      casas: { n: 170, h: [5, 16], w: [7, 13], off: [14, 70], brilho: 1.1 },
      aberto: { n: 70, h: [20, 70], w: [10, 22], off: [40, 170], brilho: 1.4 },
      tunel: { n: 0, h: [0, 0], w: [0, 0], off: [0, 0], brilho: 0 },
      brancas: { n: 110, h: [60, 210], w: [8, 14], off: [24, 100], brilho: 1.6 },
      obra: { n: 50, h: [30, 120], w: [12, 24], off: [22, 90], brilho: 0 },
    }
    const noTunel = (v: Via, i: number) => {
      const tt = territorio(v.t).tunel
      return v.tipo === "circuito" && !!tt && i / v.n > tt[0] && i / v.n < tt[1]
    }
    const parqueChao = areaDoParque(M)
    const topos: number[] = []
    // (mapa novo, direção livre) o contorno de cada prédio: a Kombi não atravessa
    const colisores: number[] = []
    const ocupados: [number, number, number][] = [] // (B18) onde já tem prédio no disco
    // (19/10, desempenho) os prédios de todas as ruas com a mesma cara (a cor
    // da janela e o brilho do bairro) numa malha só: no disco eram ~100 malhas
    // (uma por via, cada uma com o seu material), ~100 draw calls por quadro
    const grupos = new Map<string, { mat: THREE.MeshStandardMaterial; mats: THREE.Matrix4[] }>()
    circuitos.forEach((C) => {
      const t = territorio(C.t)
      const ds = distritoDe(C.t)
      // (mapa novo) o estilo vem do BAIRRO de verdade da rua: o deserto caía
      // na mesma rádio da cidade e ganhava arranha-céu no meio da areia
      const PELO_BAIRRO: Record<string, Distrito["predio"]> = { cidade: "torres", suburbio: "casas", orla: "brancas", arena: "obra", mirante: "aberto", campo: "casas", deserto: "tunel" }
      const b0 = C.tipo === "rua" ? C.rede?.bairro : undefined
      const e = b0 && PELO_BAIRRO[b0] ? (b0 === "campo" ? { ...ESTILO.casas, n: 40 } : ESTILO[PELO_BAIRRO[b0]]) : ESTILO[t.predio]
      // (mapa 2.0, 17/10: "as proporções das avenidas em relação aos prédios,
      // o mapa antigo é muito bom nisso") nas ruas do mapa novo, mais prédios
      // e colados na calçada: o cânion do mapa antigo, não um horizonte longe
      const qt = Math.round(((e.n * C.L) / 2600) * (C.tipo === "rua" ? 1.7 : 1))
      const chave = `${ds.janela}|${e.brilho}`
      let gp = grupos.get(chave)
      if (!gp) {
      const mat = new THREE.MeshStandardMaterial({ color: "#0a0c1e", emissive: ds.janela, emissiveMap: tex.janelas, emissiveIntensity: e.brilho, roughness: 0.62, metalness: 0.35 })
      // janela em escala real: a textura repete pelo tamanho de cada prédio
      // (antes um prédio de 200 m tinha janelas de 7 m) e cada prédio começa
      // num ponto diferente dela; telhado sem janela
      mat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
          #ifdef USE_EMISSIVEMAP
            vec3 escala = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
            float largura = abs(normal.x) > 0.5 ? escala.z : escala.x;
            vec2 semente = fract(instanceMatrix[3].xz * vec2(0.0137, 0.0191));
            vEmissiveMapUv = vEmissiveMapUv * vec2(largura / 22.0, escala.y / 90.0) + semente;
            if (abs(normal.y) > 0.5) vEmissiveMapUv = vec2(0.0);
          #endif`)
      }
      gp = { mat, mats: [] }
      grupos.set(chave, gp)
      }
      const doGrupo = gp.mats
      let i = 0
      for (let tent = 0; i < qt && tent < qt * 10; tent++) {
        const k = Math.floor(r() * C.n)
        if (noTunel(C, k)) continue
        const lado = r() < 0.5 ? -1 : 1
        // (no mapa novo a fachada encosta na calçada: a 4 m da borda da rua,
        // alguns mais pra trás; no mapa de sempre, a conta de sempre)
        const rua = C.tipo === "rua"
        let off: number, h: number, w = 0
        if (rua) {
          w = e.w[0] + r() * (e.w[1] - e.w[0])
          off = C.dir[k] + w * 0.5 + 4 + r() * r() * (e.off[1] - e.off[0]) * 0.5
        } else off = MEIA + e.off[0] + r() * (e.off[1] - e.off[0])
        // o lado de DENTRO do anel da cidade (e o miolo do subúrbio) é o
        // subúrbio: sem torre ali (a Linha 9 passa por cima, a vista é lá pra baixo)
        if (!rua && (C === M.vias[M.circuito.linha] || C === M.vias[M.circuito.suburbio]) && lado < 0) continue
        h = e.h[0] + r() * r() * (e.h[1] - e.h[0])
        const bx = C.px[k] - C.tz[k] * lado * off
        const bz = C.pz[k] + C.tx[k] * lado * off
        if (!rua) w = e.w[0] + r() * (e.w[1] - e.w[0])
        if (!M.livre(bx, bz, rua ? w * 0.5 + 2.5 : 10 + w * 0.7)) continue
        if (centrosLugares.some((c) => Math.hypot(c.x - bx, c.z - bz) < 24 + w * 0.7)) continue
        // (B18, LU2CA 21/10: "separe mais os prédios", dirigir entre eles fluido)
        // no disco, cada prédio guarda uma folga de 16 m dos outros; o subúrbio
        // (no chão, embaixo das pistas) é de casas baixas e deixa os lugares livres
        if ("disco" in M) {
          if (ocupados.some(([ox, oz, or]) => Math.hypot(ox - bx, oz - bz) < or + w * 0.6 + 16)) continue
          if (Object.values(CHAO_LUGARES).some((l) => Math.hypot(l.x - bx, l.z - bz) < 34 + w * 0.6)) continue
          if (Math.hypot(bx - SUBURBIO.x, bz - SUBURBIO.z) < SUBURBIO.r + 60) { h = 5 + r() * 10; w = Math.min(w, 12) }
          ocupados.push([bx, bz, w * 0.6])
        }
        if (parqueChao.some((c) => Math.hypot(c.x - bx, c.z - bz) < 14 + w * 0.7)) continue
        // no mapa novo o prédio nasce no chão (o relevo do v5), não na água
        // (no disco, enterrado 4 m: as dunas inclinam)
        const y0 = "chao" in M ? (M as MundoRede).chao(bx, bz) - ("disco" in M ? 4 : 1) : -12
        d.position.set(bx, y0 + h / 2, bz)
        if (h > 85) topos.push(bx, y0 + h + 1.5, bz)
        d.rotation.set(0, Math.atan2(C.tx[k], C.tz[k]), 0)
        const fundo = e.w[0] + r() * (e.w[1] - e.w[0])
        d.scale.set(w, h, fundo)
        if (C.tipo === "rua") { const q = Math.hypot(C.tx[k], C.tz[k]) || 1; colisores.push(bx, bz, C.tx[k] / q, C.tz[k] / q, w * 0.5, fundo * 0.5, y0 + h) }
        d.updateMatrix()
        doGrupo.push(d.matrix.clone())
        i++
      }
    })
    const predios = [...grupos.values()].filter((g) => g.mats.length).map(({ mat, mats }) => {
      const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, mats.length)
      mats.forEach((x, k) => m.setMatrixAt(k, x))
      m.computeBoundingSphere()
      return m
    })

    // túnel (a arena): arcos com paredes, teto e fita de luz vermelha
    const tuneis: { C: Via; k0: number; k1: number }[] = []
    for (const C of circuitos) {
      const tt = territorio(C.t).tunel
      if (tt) tuneis.push({ C, k0: Math.floor(tt[0] * C.n), k1: Math.floor(tt[1] * C.n) })
    }
    const nA = tuneis.reduce((s, x) => s + Math.floor((x.k1 - x.k0) / 5), 0)
    const arcos = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#2a0c10", emissive: "#3a0508", emissiveIntensity: 0.9, roughness: 0.6 }), Math.max(1, nA * 3))
    const fitas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: "#ff2436", toneMapped: false }), Math.max(1, nA * 2))
    const q = new THREE.Vector3()
    let ia = 0
    for (const { C, k0, k1 } of tuneis) {
      for (let k = k0; k < k1 - 4; k += 5) {
        const rot = Math.atan2(C.tx[k], C.tz[k])
        const ban = C.bank[k]
        const pecas: [number, number, number, number, number][] = [
          [-(MEIA + 1.6), 4.6, 1, 9.2, 10.4],
          [MEIA + 1.6, 4.6, 1, 9.2, 10.4],
          [0, 9.4, MEIA * 2 + 4.2, 0.8, 10.4],
        ]
        pecas.forEach(([x, y, sx, sy, sz], jj) => {
          pontoI(C, k, x, y, q)
          d.position.copy(q)
          d.rotation.set(0, rot, 0)
          d.rotateZ(ban)
          d.scale.set(sx, sy, sz)
          d.updateMatrix()
          arcos.setMatrixAt(ia * 3 + jj, d.matrix)
        })
        for (const l of [-1, 1]) {
          pontoI(C, k, l * (MEIA + 1), 8.9, q)
          d.position.copy(q)
          d.rotation.set(0, rot, 0)
          d.scale.set(0.25, 0.12, 9)
          d.updateMatrix()
          fitas.setMatrixAt(ia * 2 + (l > 0 ? 1 : 0), d.matrix)
        }
        ia++
      }
    }
    arcos.count = ia * 3
    fitas.count = ia * 2

    // pilares embaixo de todas as vias
    const pil: [number, number, number, number][] = []
    // (só onde descer até a água não fura outra pista)
    // (no mapa novo as duas vias de uma rua passam no mesmo eixo: um sentido só)
    for (const v of M.vias) { if (v.tipo === "rua" && !v.rede?.ida) continue; for (let k = 0; k < v.n; k += 20) if (v.py[k] > -9 && M.vao(v.px[k], v.pz[k], v.py[k])) pil.push([v.px[k], v.py[k], v.pz[k], 0]) }
    const pilares = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1, 1.6), new THREE.MeshStandardMaterial({ color: "#10122a", roughness: 0.8 }), pil.length)
    pil.forEach(([x, y, z], i) => {
      const h = y + 12
      d.position.set(x, -12 + h / 2 - 1.8, z)
      d.rotation.set(0, 0, 0)
      d.scale.set(1, h, 1)
      d.updateMatrix()
      pilares.setMatrixAt(i, d.matrix)
    })

    // postes a cada 24m dos dois lados, na cor do lugar (no túnel a luz é a
    // fita do teto)
    // (nunca em cima de outra pista: somem onde a saída descola e onde
    // outra encosta chegando)
    const ks: { v: Via; k: number; lado: number }[] = []
    for (const [vi, v] of M.vias.entries()) {
      // (no mapa novo: um sentido só, e os postes a cada 40 m)
      if (v.tipo === "rua" && !v.rede?.ida) continue
      // (os atos, 20/10) a pista apagada é escura de verdade: sem poste aceso
      if (viaApagada?.[vi]) continue
      for (let k = 0; k < v.n; k += v.tipo === "rua" ? 20 : 12) {
        const u = k * PASSO
        if (v.tipo === "saida" && (u < 150 || u > v.L - 240)) continue
        // o deserto não tem poste (só perto da cidade)
        if (v.id === "deserto" && u > 900 && u < v.L - 900) continue
        if (noTunel(v, k)) continue
        for (const lado of [-1, 1]) {
          if ((v as Via & { disco?: boolean }).disco && (/:(balao|saida|entrada)$/.test(v.id) || /^disco:torre:/.test(v.id)) && (u < 75 || u > v.L - 75)) continue
          if (v.tipo === "circuito") {
            if (v.faixas.some((f) => f.lado === lado && u > f.u - 4 && u < f.u + 140)) continue
            if (lado > 0 && v.chegadas.some((c) => u > c.u - 240 && u < c.u + 10)) continue
          }
          ks.push({ v, k, lado })
        }
      }
    }
    const nL = ks.length
    const postes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 7.2, 0.16), new THREE.MeshStandardMaterial({ color: "#22243e" }), nL)
    const luzPos = new Float32Array(nL * 3)
    const luzCor = new Float32Array(nL * 3)
    const reflexos = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1.8, 11),
      new THREE.MeshBasicMaterial({ map: tex.brilho, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
      nL,
    )
    const c = new THREE.Color()
    let n = 0
    for (const { v, k, lado } of ks) {
      const ds = distI(v, k)
      {
        const borda = lado < 0 ? v.esq[k] : v.dir[k]
        pontoI(v, k, borda + lado * 0.9, 3.6, q)
        d.position.copy(q)
        d.rotation.set(0, 0, 0)
        d.scale.set(1, 1, 1)
        d.updateMatrix()
        postes.setMatrixAt(n, d.matrix)
        pontoI(v, k, borda - lado * 0.8, 7.1, q)
        luzPos.set([q.x, q.y, q.z], n * 3)
        c.set((v as Via & { cor?: string }).cor ?? ds.luz[(k / 12 + (lado > 0 ? 1 : 0)) % ds.luz.length])
        luzCor.set([c.r, c.g, c.b], n * 3)
        pontoI(v, k, borda - lado * 2, 0.05, q)
        d.position.copy(q)
        d.rotation.set(-Math.PI / 2, 0, Math.atan2(v.tx[k], v.tz[k]))
        d.updateMatrix()
        reflexos.setMatrixAt(n, d.matrix)
        reflexos.setColorAt(n, c)
        n++
      }
    }
    const luzes = new THREE.BufferGeometry()
    luzes.setAttribute("position", new THREE.BufferAttribute(luzPos, 3))
    luzes.setAttribute("color", new THREE.BufferAttribute(luzCor, 3))
    const luzMat = new THREE.PointsMaterial({ size: 3.6, map: tex.brilho, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })

    // outdoors do NÚCLEO na avenida
    const av = M.vias[M.circuito.full]
    const frases = ["OTIMIZE-SE ✓", "VOCÊ ESTÁ FELIZ ✓", "NÚCLEO", "NADA MUDOU ✓", "VOLTE AO FEED ✓"]
    const outdoors = frases.map((txt, jj) => {
      const k = Math.floor((0.12 + (jj / frases.length) * 0.7) * av.n)
      const lado = jj % 2 ? 1 : -1
      return {
        pos: pontoI(av, k, lado * (MEIA + 16), 14, new THREE.Vector3()),
        rot: Math.atan2(av.tx[k], av.tz[k]) + Math.PI + lado * -0.5,
        tex: texTexto([{ txt, tam: 120, cor: "#eef3ff" }]),
      }
    })

    // a luz vermelha de aviação no topo dos prédios altos (pisca no loop)
    const aviacao = new THREE.BufferGeometry()
    aviacao.setAttribute("position", new THREE.BufferAttribute(new Float32Array(topos), 3))
    const aviacaoMat = new THREE.PointsMaterial({ size: 5, map: tex.brilho, color: "#ff2a2a", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })

    return { predios, arcos, fitas, pilares, postes, luzes, luzMat, reflexos, outdoors, aviacao, aviacaoMat, colisores }
  }, [M, circuitos, tex, distI, centrosLugares, viaApagada])

  // ── colunas de luz: só onde a missão manda agora (a coisa pra buscar,
  // ou a estação de quem te chamou), dá pra ver de longe ──
  const colunas = useMemo(() => [
    ...centro.estacoes
      .filter(({ id }) => id === estacaoAlvo && !objetos.includes(id))
      .map(({ id, u }) => ({ id: id as string, cor: getEstacao(id).cor, item: false, pos: noMundo(centro, u, 0, 0, a, new THREE.Vector3()) })),
    ...marcos.map((m) => ({ id: m.chave, cor: m.cor, item: true, pos: noMundo(M.vias[m.via], m.u, 0, 0, a, new THREE.Vector3()) })),
  ], [M, centro, a, objetos, estacaoAlvo, marcos])

  // ── placas: cada bifurcação tem dois pórticos (aviso e "agora"), com
  // três placas — ← saída da esquerda, ↑ fica, saída da direita → ──
  const placas = useMemo(() => {
    const lista: {
      id: string; pos: THREE.Vector3; rot: number; topo: THREE.Texture
      paineis: { x: number; cor: string; tex: THREE.Texture; area?: FreqId }[]
    }[] = []
    const setas: { p: THREE.Vector3; rot: number; cor: string; op: number }[] = []
    const barreiras: { p: THREE.Vector3; rot: number }[] = []
    const MONO = "ui-monospace, monospace"
    for (const C of circuitos) {
      const aqui = freqDe(C.t)
      const us = [...new Set(C.faixas.map((f) => f.u))].sort((x, y) => y - x)
      us.forEach((uk, si) => {
        const lados = [C.faixas.find((f) => f.u === uk && f.lado < 0), undefined, C.faixas.find((f) => f.u === uk && f.lado > 0)]
        const paineis = lados.map((f, k) => {
          const x = (k - 1) * CK
          if (k === 1) return { x, cor: aqui.cor, area: C.t, tex: texTexto([{ txt: "↑", tam: 110, cor: aqui.cor }, { txt: territorio(C.t).lugar.toUpperCase(), tam: 62, cor: aqui.cor }, { txt: "fica · mais uma volta", tam: 40, cor: "#ffffff", fonte: MONO }], 512, 352) }
          // bifurcação de um lado só (as descidas pro subúrbio, a saída dele)
          if (!f) return null
          const fr = freqDe(f.para)
          const seta = f.lado < 0 ? "←" : "→"
          // a saída pro deserto (mundo.ts)
          if (M.vias[f.via]?.id === "deserto") return { x, cor: "#e8b86a", tex: texTexto([{ txt: seta, tam: 110, cor: "#e8b86a" }, { txt: "DESERTO", tam: 62, cor: "#e8b86a" }, { txt: "sem rádio", tam: 40, cor: "#ffffff", fonte: MONO }], 512, 352) }
          return aberta(f!, nLib)
            ? { x, cor: fr.cor, area: f!.para, tex: texTexto([{ txt: seta, tam: 110, cor: fr.cor }, { txt: lugarDe(f!.para).toUpperCase(), tam: 62, cor: fr.cor }, { txt: `${fr.freq} FM`, tam: 46, cor: "#ffffff", fonte: MONO }], 512, 352) }
            : { x, cor: "#555a77", tex: texTexto([{ txt: "TRANCADA", tam: 60, cor: "#8a8fae" }, { txt: lugarDe(f!.para).toUpperCase(), tam: 56, cor: "#8a8fae" }, { txt: `junta ${fr.custo} de sinal`, tam: 40, cor: "#b0b5d0", fonte: MONO }], 512, 352) }
        })
        const paineisOk = paineis.filter((x): x is NonNullable<typeof x> => !!x)
        // o aviso da segunda bifurcação do centro vem logo depois da primeira
        const antes = us.length > 1 && si === 0 ? 240 : 330
        for (const [dist, agora] of [[antes, false], [100, true]] as const) {
          // placa de aviso que cairia ANTES de outra bifurcação confunde
          // (parece apontar pra entrada de antes): só fica a do "agora"
          if (!agora && us.some((u2) => u2 < uk && u2 > uk - dist - 20)) continue
          const pos = noMundo(C, uk - dist, 0, 0, a, new THREE.Vector3())
          lista.push({
            id: `${C.id}:${uk}:${dist}`,
            pos,
            rot: Math.atan2(a.tx, a.tz),
            topo: texTexto([{ txt: agora ? "SAÍDAS · AGORA" : `SAÍDAS EM ${dist} M`, tam: 96, cor: "#ffc857" }], 1024, 128),
            paineis: paineisOk,
          })
        }
        // setas no chão: reto no meio, diagonal em cada faixa de saída
        for (const d0 of [90, 35]) {
          const u = uk - d0
          setas.push({ p: noMundo(C, u, 0, 0.06, a, new THREE.Vector3()), rot: Math.atan2(-a.tx, -a.tz), cor: aqui.cor, op: 0.8 })
          for (const f of [lados[0], lados[2]]) {
            if (!f) continue
            const ok = aberta(f, nLib)
            setas.push({ p: noMundo(C, u, f.lado * CK, 0.06, a, new THREE.Vector3()), rot: Math.atan2(-a.tx, -a.tz) - f.lado * 0.35, cor: ok ? freqDe(f.para).cor : "#444860", op: ok ? 0.95 : 0.35 })
          }
        }
        for (const f of [lados[0], lados[2]]) {
          if (!f || aberta(f, nLib)) continue
          barreiras.push({ p: noMundo(C, uk - 4, f.lado * CK, 0.9, a, new THREE.Vector3()), rot: Math.atan2(a.tx, a.tz) })
        }
      })
    }
    return { lista, setas, barreiras }
  }, [M, circuitos, a, nLib])

  // embaixo de cada placa, uma bolinha por missão em aberto naquela área:
  // a cor e a inicial de quem chama (sem nome)
  const tagTex = useMemo(() => {
    const out: Partial<Record<FreqId, THREE.Texture>> = {}
    for (const [area, q] of Object.entries(tags) as [FreqId, { nome: string; cor: string }[]][]) {
      if (!q.length) continue
      const c = document.createElement("canvas")
      c.width = 1024
      c.height = 112
      const g = c.getContext("2d")!
      const R = 44, passo = R * 2 + 26
      const x0 = 512 - ((q.length - 1) * passo) / 2
      q.forEach((x, i) => {
        const cx = x0 + i * passo
        g.beginPath()
        g.arc(cx, 56, R, 0, Math.PI * 2)
        g.fillStyle = x.cor
        g.fill()
        g.fillStyle = "#070817"
        g.font = "800 54px ui-sans-serif, system-ui, sans-serif"
        g.textAlign = "center"
        g.textBaseline = "middle"
        g.fillText(x.nome[0].toUpperCase(), cx, 59)
      })
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      out[area] = t
    }
    return out
  }, [tags])

  // faixa de saída pintada na cor da rádio (cinza se trancada) e muro
  // listrado na trancada (física: ver limite no loop)
  const pinturas = useMemo(() => {
    const U = (i: number) => i * PASSO
    const faixaEm = (p: Pista, i: number, lado: number) => (p as Via).faixas.find((f) => f.lado === lado && U(i) > f.u - ABRE + 40 && U(i) <= f.u)
    const pint = (lado: number) => fita(circuitos, lado > 0 ? MEIA + 0.4 : -(MEIA + FAIXA) + 0.4, lado > 0 ? MEIA + FAIXA - 0.4 : -MEIA - 0.4, 0.03, {
      incluir: (p, i) => !!faixaEm(p, i, lado),
      cor: (p, i) => {
        const f = faixaEm(p, i, lado)!
        return aberta(f, nLib) ? hexRgb(freqDe(f.para).cor) : [0.25, 0.26, 0.34]
      },
    })
    const muro = (lado: number) => fita(circuitos, lado * (MEIA + 0.25), 1.1, 0, {
      vertical: true,
      incluir: (p, i) => { const f = faixaEm(p, i, lado); return !!f && !aberta(f, nLib) },
      cor: (_p, i) => (i % 2 ? [1, 0.25, 0.35] : [0.95, 0.95, 1]),
    })
    return { faixas: [pint(-1), pint(1)], muros: [muro(-1), muro(1)] }
  }, [circuitos, nLib])

  // ── o rastro neon do pulo (o dash do inFamous): uma fita de luz que fica
  // no ar por onde a Kombi passou voando e apaga em ~1 s ──
  const rastro = useMemo(() => {
    const N = 90, pos = new Float32Array(N * 3), cor = new Float32Array(N * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(cor, 3))
    const mat = new THREE.PointsMaterial({ size: 0.9, map: tex.brilho, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    const pts = new THREE.Points(g, mat); pts.frustumCulled = false
    return { N, pos, cor, g, pts, cab: 0 }
  }, [tex])
  // ── os outdoors surrealistas (mapa novo): o chamado de cada missão perto
  // do lugar dela, e a frase do LU2CA nas vias rápidas ──
  const outdoors = useMemo<Outdoor[]>(() => {
    if (!("ligacoes" in M) || !M.onde) return []
    const CORES = ["#ff3fb0", "#2fe8ff", "#ffd84a", "#9b6bff", "#5dffa0", "#ff7a3d"]
    const l: Outdoor[] = []
    Object.values(MISSOES).forEach((ms, k) => {
      if (!ms?.lugar || !ms.chamado) return
      const o = M.onde!(`lugar:${ms.lugar}`); if (!o) return
      // 170 m antes do lugar; se o lugar fica no começo da rua, um pouco depois dele
      const L = M.vias[o.via].L
      l.push({ via: o.via, u: o.u > 200 ? o.u - 170 : Math.min(L - 20, o.u + 90), lado: -1, frase: ms.chamado, cor: CORES[k % CORES.length], forma: k })
    })
    let g = 0
    M.vias.forEach((v, vi) => {
      if (g >= 8 || !v.rede?.ida || !["expressa", "avenida", "orla"].includes(v.rede.tipo) || v.L < 800) return
      l.push({ via: vi, u: v.L * 0.35, lado: 1, frase: FRASE_GERAL, cor: CORES[(g + 3) % CORES.length], forma: g + 2 }); g++
    })
    return l
  }, [M])
  // ── orbs (todas as vias numa malha só) ──
  const orbs = useMemo(() => {
    const lista: { via: number; u: number; x: number; y: number }[] = []
    const porVia: number[][] = M.vias.map(() => [])
    M.vias.forEach((v, vi) => v.orbs.forEach((o) => { porVia[vi].push(lista.length); lista.push({ via: vi, u: o.u, x: o.x, y: o.y ?? 1.4 }) }))
    // (disco, LU2CA 19/10) no lugar dos anéis, GOTAS d'água: a coisa mais
    // valiosa num mundo seco. (LU2CA 20/10) a gota é uma JOIA: lapidada,
    // furta-cor, 1/8 da Kombi, com o tom da pista por cima (joia.ts)
    const m = "disco" in M
      ? new THREE.InstancedMesh(geoJoia(), matJoia(), lista.length)
      : new THREE.InstancedMesh(new THREE.TorusGeometry(0.75, 0.14, 6, 16), new THREE.MeshBasicMaterial({ color: "#2fe8ff", toneMapped: false }), lista.length) // (6×16: 192 triângulos por anel; eram 352)
    m.frustumCulled = false // (a esfera dela ficaria velha: quem escolhe os anéis perto é o useFrame)
    const pos = new Float32Array(lista.length * 3)
    const v3 = new THREE.Vector3()
    lista.forEach((o, i) => {
      noMundo(M.vias[o.via], o.u, o.x, o.y, a, v3)
      pos.set([v3.x, v3.y, v3.z], i * 3)
    })
    const halo = new THREE.BufferGeometry()
    halo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    const haloMat = new THREE.PointsMaterial({ size: "disco" in M ? 2.2 : 4, map: tex.brilho, color: "disco" in M ? "#e8f4ff" : "#2fe8ff", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: "disco" in M ? 0.45 : 0.6 })
    // (disco, LU2CA 20/10) cada gota na cor da pista dela
    const cores = "disco" in M ? lista.map((o) => new THREE.Color((M.vias[o.via] as Via & { cor?: string }).cor ?? "#4fc3ff")) : null
    if (cores) for (let i = 0; i < lista.length; i++) m.setColorAt(i, cores[i])
    return { m, pos, halo, haloMat, lista, porVia, cores }
  }, [M, a, tex])

  // ── turbos no chão ──
  const turbos = useMemo(() => {
    const lista: { via: number; u: number; x: number; p: THREE.Vector3; rot: number }[] = []
    M.vias.forEach((v, vi) => v.turbos.forEach((t) => {
      const p = noMundo(v, t.u, t.x, 0.06, a, new THREE.Vector3())
      // o +Y da textura (pra onde as setas apontam) alinhado com a tangente
      lista.push({ via: vi, u: t.u, x: t.x, p, rot: Math.atan2(-a.tx, -a.tz) })
    }))
    return lista
  }, [M, a])

  // ── tráfego: cada circuito com o seu ──
  // (direção livre) bater num prédio: devolve o empurrão pra fora, ou null
  const bater = useMemo(() => {
    const c = cidade.colisores, g = new Map<string, number[]>(), CEL = 24
    // (cada prédio: centro, rumo, meia largura, meio fundo e a altura do topo)
    for (let k = 0; k < c.length; k += 7) { const key = `${Math.floor(c[k] / CEL)},${Math.floor(c[k + 1] / CEL)}`; let l = g.get(key); if (!l) g.set(key, (l = [])); l.push(k) }
    // y: a altura de quem testa (a câmera numa pista elevada passa por cima do prédio baixo)
    return (x: number, z: number, raio: number, y = -Infinity): [number, number] | null => {
      const cx = Math.floor(x / CEL), cz = Math.floor(z / CEL)
      // a caixa do prédio, girada com a rua: z local = a tangente, x local = o lado
      let ex = 0, ez = 0, bateu = false
      for (let a2 = -2; a2 <= 2; a2++) for (let b2 = -2; b2 <= 2; b2++) for (const k of g.get(`${cx + a2},${cz + b2}`) ?? []) {
        if (y > c[k + 6] + 1) continue
        const dx = x + ex - c[k], dz = z + ez - c[k + 1], tx = c[k + 2], tz = c[k + 3], hw = c[k + 4], hd = c[k + 5]
        const lx = dx * tz - dz * tx, lz = dx * tx + dz * tz
        const qx = Math.max(-hw, Math.min(hw, lx)), qz = Math.max(-hd, Math.min(hd, lz))
        let px = lx - qx, pz = lz - qz, d = Math.hypot(px, pz)
        if (d >= raio) continue
        if (d < 1e-4) {
          // o centro entrou na caixa: sai pelo lado mais perto
          const sx = hw - Math.abs(lx), sz = hd - Math.abs(lz)
          if (sx < sz) { px = Math.sign(lx) || 1; pz = 0; d = -sx } else { px = 0; pz = Math.sign(lz) || 1; d = -sz }
        } else { px /= d; pz /= d }
        const m = raio - d
        ex += (px * tz + pz * tx) * m; ez += (-px * tx + pz * tz) * m; bateu = true
      }
      return bateu ? [ex, ez] : null
    }
  }, [cidade])
  const trafego = useMemo(() => {
    // (06/10: o dobro de carros; batida arremessa pro lado — vx, voo, giro)
    // (16/10: carros de verdade — carros.ts — e, no mapa novo, ~120 carros pela rede, cada um na mão dele)
    type Carro = { via: number; u: number; x: number; v: number; v0: number; x0: number; passou: boolean; bateu: number; vx: number; y: number; vy: number; giro: number; vgiro: number; caido: number; modelo: number; slot: number }
    const carros: Carro[] = []
    const rede = "ligacoes" in M
    const novo = (via: number, u: number, x: number, v: number) => carros.push({ via, u, x, v, v0: v, x0: x, passou: false, bateu: 0, vx: 0, y: 0, vy: 0, giro: 0, vgiro: 0, caido: 0, modelo: 0, slot: 0 })
    if (rede) {
      const ruas = M.vias.map((_, vi) => vi).filter((vi) => M.vias[vi].tipo === "rua" && M.vias[vi].rede!.tipo !== "terra" && M.vias[vi].L > 60)
      let sem = 31; const r = () => ((sem = (sem * 16807) % 2147483647) / 2147483647)
      for (let i = 0; i < 120; i++) { const vi = ruas[Math.floor(r() * ruas.length)], VV = M.vias[vi]; novo(vi, r() * VV.L, 2.4 + r() * 1.6, 11 + r() * 12) }
    } else circuitos.forEach((C) => {
      const vi = M.vias.indexOf(C)
      const q = Math.max(8, Math.round(C.L / 240))
      for (let i = 0; i < q; i++) novo(vi, (i / q) * C.L + 60, [-MEIA * 0.62, 0, MEIA * 0.62][i % 3], 20 + (i % 5) * 3.2)
    })
    // cada carro ganha um modelo e uma cor
    const modelos = montarModelos()
    const porModelo = modelos.map(() => 0)
    carros.forEach((c, i) => { c.modelo = i % 13 === 5 ? 5 : i % 5; c.slot = porModelo[c.modelo]++ })
    const malhas = modelos.map((m, k) => {
      const n = Math.max(1, porModelo[k])
      const pint = new THREE.InstancedMesh(m.pintada, new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.32 }), n)
      const esc = new THREE.InstancedMesh(m.escura, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.25 }), n)
      const luz = new THREE.InstancedMesh(m.luzes, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), n)
      const cor = new THREE.Color()
      for (let i = 0; i < n; i++) pint.setColorAt(i, cor.set(MODELOS[k].cores[(i * 7) % MODELOS[k].cores.length]))
      for (const im of [pint, esc, luz]) im.frustumCulled = false
      return [pint, esc, luz]
    })
    return { carros, malhas }
  }, [M, circuitos])
  // teste: a Kombi logo atrás de um carro do trânsito, mais rápida (bate)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__bater = () => {
      const j = jogo.current
      const c = trafego.carros.find((x) => x.via === j.via && x.caido <= 0)
      if (!c) return false
      const L = M.vias[j.via].L
      j.u = (c.u - 7 + L) % L; j.x = c.x; j.v = c.v + 14; j.encaixar = true
      return true
    }
    return () => { delete w.__bater }
  }, [trafego, jogo, M])

  // ── os carros brancos do Núcleo (a caça) ──
  const caca = useMemo(() => {
    const n = 3
    const corpo = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 1.25, 4.4), new THREE.MeshStandardMaterial({ color: "#eef3ff", emissive: "#9fb4ff", emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.2 }), n)
    const barra = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), n)
    const farol = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.18, 0.06), new THREE.MeshBasicMaterial({ color: "#dff4ff", toneMapped: false }), n * 2)
    corpo.count = 0; barra.count = 0; farol.count = 0
    const carros = Array.from({ length: n }, (_, i) => ({ u: 0, x: [2, -2, 0][i % 3], v: 0 }))
    // (LU2CA 19/10) o HELICÓPTERO: a 2× da velocidade da pista ele entra na caça
    const heli = new THREE.Group()
    const casco = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 3.2, 4, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#1a1d2e", metalness: 0.5, roughness: 0.3, emissive: "#22284a", emissiveIntensity: 0.4 }))
    const cauda = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 4.6).translate(0, 0.3, -4.2), casco.material)
    const helice = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.35), new THREE.MeshBasicMaterial({ color: "#4a5070" }))
    helice.position.y = 1.65
    const sirene = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.4), new THREE.MeshBasicMaterial({ color: "#ff3b4e", toneMapped: false }))
    sirene.position.set(0, -1.35, 0.6)
    // o holofote: um cone de luz do helicóptero até a Kombi
    // (só a face de fora: com a câmera dentro do cone ele some, não vira um borrão)
    const facho = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1, 18, 1, true).translate(0, -0.5, 0), new THREE.MeshBasicMaterial({ color: "#e8f0ff", transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, toneMapped: false }))
    heli.add(casco, cauda, helice, sirene)
    heli.visible = false; facho.visible = false
    heli.frustumCulled = false; facho.frustumCulled = false
    return { corpo, barra, farol, carros, ativa: false, via: -1, perdidoT: 0, longeT: 0, espera: 0, cor: new THREE.Color(), t: 0, heli, helice, sirene, facho, heliOn: false, heliT: 0, cobertoT: 0, heliPos: new THREE.Vector3() }
  }, [])

  // ── chuva (só visual), confete, faíscas ──
  const chuvaRef = useRef<THREE.LineSegments>(null)
  const chuva = useMemo(() => {
    const n = 700
    const pos = new Float32Array(n * 6)
    const base = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) base.set([(Math.random() - 0.5) * 70, Math.random() * 40, (Math.random() - 0.5) * 70], i * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return { n, pos, base, g }
  }, [])

  const confete = useMemo(() => {
    const n = 260
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.34), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), n)
    const s = Array.from({ length: n }, () => ({ vivo: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3() }))
    const d = new THREE.Object3D()
    d.scale.set(0, 0, 0)
    d.updateMatrix()
    for (let i = 0; i < n; i++) { m.setMatrixAt(i, d.matrix); m.setColorAt(i, new THREE.Color("#fff")) }
    return { m, s, d, prox: 0 }
  }, [])

  useEffect(() => {
    confeteRef.current = (cor: string, qt: number) => {
      const car = carro.current
      if (!car) return
      const cs = [new THREE.Color(cor), new THREE.Color("#ffffff"), new THREE.Color("#ffc857"), new THREE.Color("#2fe8ff")]
      for (let k = 0; k < qt; k++) {
        const i = confete.prox++ % confete.s.length
        const c = confete.s[i]
        c.vivo = 2.2 + Math.random()
        c.p.copy(car.position).add(new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 3, (Math.random() - 0.5) * 6))
        c.v.set((Math.random() - 0.5) * 9, 5 + Math.random() * 7, (Math.random() - 0.5) * 9)
        c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
        c.w.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12)
        confete.m.setColorAt(i, cs[k % cs.length])
      }
      if (confete.m.instanceColor) confete.m.instanceColor.needsUpdate = true
    }
    return () => { confeteRef.current = null }
  }, [confete, confeteRef])

  // drift: marca de pneu das 4 rodas no asfalto (anel que vai sobrescrevendo)
  // e fumaça saindo das 4
  const marcas = useMemo(() => {
    const n = 1600
    const m = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.3, 0.95),
      new THREE.MeshBasicMaterial({ color: "#030308", transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      n,
    )
    m.frustumCulled = false
    const zero = new THREE.Matrix4().makeScale(0, 0, 0)
    for (let i = 0; i < n; i++) m.setMatrixAt(i, zero)
    return { m, n, prox: 0 }
  }, [])
  const fumaca = useMemo(() => {
    const n = 160
    const pos = new Float32Array(n * 3).fill(-999)
    const vel = new Float32Array(n * 3)
    const vida = new Float32Array(n)
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return { n, pos, vel, vida, g, prox: 0 }
  }, [])
  const texFumaca = useMemo(() => texBrilho(), [])
  const RODAS = useMemo(() => [[-0.82, -1.35], [0.82, -1.35], [-0.82, 1.35], [0.82, 1.35]].map(([x, z]) => new THREE.Vector3(x, 0.03, z)), [])
  // (LU2CA 21/10: "no patins a linha do drift tem que ser os dois pés, não as quatro rodas")
  const PES = useMemo(() => [[-0.16, 0.06], [0.16, -0.06]].map(([x, z]) => new THREE.Vector3(x, 0.03, z)), [])
  // (LU2CA 21/10: "as linhas do drift mais contínuas, orgânicas") onde cada roda
  // (ou pé) deixou a última marca: a próxima liga daqui até onde ela está agora,
  // seguindo o caminho de verdade da roda (sem tracejado, sem quina na curva)
  const rastroPneu = useMemo(() => ({ ult: [0, 1, 2, 3].map(() => new THREE.Vector3()), ativo: false, pat: false }), [])

  const faiscas = useMemo(() => {
    const n = 90
    const pos = new Float32Array(n * 3)
    const vel = new Float32Array(n * 3)
    const vida = new Float32Array(n)
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return { n, pos, vel, vida, g, prox: 0 }
  }, [])

  // céu de cidade grande à noite: gradiente, poluição luminosa no horizonte
  // (sódio laranja + a cor do bairro), um teto de nuvens baixas acesas POR
  // BAIXO pela cidade e andando com o vento, a lua atravessando as nuvens
  // (borda prateada) e umas estrelas nos buracos
  const ceuMat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { sol: { value: new THREE.Vector3(0, -1, 0) }, lua: { value: new THREE.Vector3(0.4, 0.35, -0.85).normalize() }, tinta: { value: new THREE.Color("#4a1a30") }, nevoaC: { value: new THREE.Color("#1a0f24") }, tempo: { value: 0 }, topoC: { value: new THREE.Vector3(0.012, 0.014, 0.05) }, meioC: { value: new THREE.Vector3(0.05, 0.07, 0.2) }, noite: { value: 1 } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying vec3 vP; uniform vec3 sol; uniform vec3 lua; uniform vec3 tinta; uniform vec3 nevoaC; uniform float tempo; uniform vec3 topoC; uniform vec3 meioC; uniform float noite;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 5; k++){ v += a * ruido(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
      void main(){
        vec3 d = normalize(vP);
        float h = d.y;
        float hp = max(h, 0.0);
        // a hora do jogo (CEU_HORAS): de dia o céu clareia, de noite escurece
        vec3 topo = topoC;
        vec3 meio = meioC;
        vec3 c = mix(nevoaC, tinta, smoothstep(-0.04, 0.03, h));
        c = mix(c, meio, smoothstep(0.03, 0.25, h));
        c = mix(c, topo, smoothstep(0.25, 0.85, h));
        // poluição luminosa: a cidade acende o horizonte
        vec3 sodio = vec3(1.0, 0.46, 0.18);
        c += tinta * exp(-hp * 9.0) * 0.55 + sodio * exp(-hp * 16.0) * 0.16 * noite;
        // estrelas (só lá em cima)
        vec2 g = floor(d.xz / (hp + 0.15) * 260.0);
        float est = step(0.9965, hash(g)) * smoothstep(0.2, 0.5, h);
        c += vec3(0.75, 0.8, 1.0) * est * noite * (0.5 + 0.5 * sin(tempo * 3.0 + hash(g) * 40.0));
        // lua + halo
        float m = max(dot(d, lua), 0.0);
        vec3 luaC = vec3(0.85, 0.9, 1.0) * smoothstep(0.99935, 0.99965, m) * 1.6;
        vec3 halo = vec3(0.3, 0.36, 0.7) * pow(m, 48.0) * 0.55;
        c += (luaC + halo) * noite;
        // o sol: o disco, o brilho em volta e, baixo no céu, o horizonte pegando
        // fogo do lado dele (a hora dourada)
        float ss = max(dot(d, sol), 0.0);
        float acima = smoothstep(-0.08, 0.04, sol.y);
        float quente = 1.0 - smoothstep(0.02, 0.4, sol.y);
        vec3 solC = mix(vec3(1.0, 0.95, 0.86), vec3(1.0, 0.42, 0.14), quente);
        c += solC * (smoothstep(0.99925, 0.9996, ss) * 1.8 + pow(ss, 96.0) * 0.35 + pow(ss, 8.0) * 0.08) * acima;
        vec2 dh = normalize(d.xz + 1e-4), sh = normalize(sol.xz + 1e-4);
        c += solC * exp(-hp * 6.0) * pow(max(dot(dh, sh), 0.0), 3.0) * quente * acima * 0.55;
        // nuvens: um teto baixo, projetado num plano, andando com o vento
        vec2 uv = d.xz / (hp + 0.09) * 2.1 + vec2(tempo * 0.012, tempo * 0.005);
        float n = fbm(uv);
        float n2 = fbm(uv * 2.7 - tempo * 0.02);
        float cob = smoothstep(0.34, 0.7, n * 0.75 + n2 * 0.35) * smoothstep(0.0, 0.07, h);
        // a base da nuvem pega a luz da cidade; o alto fica escuro
        // de dia as nuvens clareiam (cinza-claro); de noite pegam a luz da cidade
        float dia = 1.0 - noite;
        vec3 nuvem = mix(tinta * 1.25 + sodio * 0.18 * noite + vec3(0.55, 0.57, 0.62) * dia, mix(vec3(0.035, 0.035, 0.08), vec3(0.6, 0.64, 0.72), dia), smoothstep(0.02, 0.55, h));
        nuvem *= 0.65 + 0.55 * n2;
        // borda prateada onde a lua bate
        nuvem += vec3(0.55, 0.62, 0.95) * pow(m, 10.0) * (1.0 - cob) * cob * 2.4;
        // no nascer e no pôr do sol a base das nuvens acende laranja
        nuvem += solC * (pow(ss, 3.0) * 0.8 + 0.18) * quente * acima;
        c = mix(c, nuvem, cob * 0.92);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }), [])

  useEffect(() => {
    scene.fog = new THREE.Fog("#1a0f24", 70, 950)
    scene.background = new THREE.Color("#1a0f24")
    return () => { scene.fog = null; camera.up.set(0, 1, 0) }
  }, [scene, camera])

  // ── loop ──
  const tmp = useMemo(() => ({
    f: new THREE.Vector3(), r: new THREE.Vector3(), up: new THREE.Vector3(), p: new THREE.Vector3(),
    cor: new THREE.Color(), alvo: new THREE.Vector3(), olhar: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), q2: new THREE.Vector3(),
    qYaw: new THREE.Quaternion(), qRoll: new THREE.Quaternion(), camOlhar: new THREE.Vector3(), d: new THREE.Object3D(),
    qMarca: new THREE.Quaternion(), qDeriva: new THREE.Quaternion(), roda: new THREE.Vector3(),
    qDeitar: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),
    sol: new THREE.Vector3(), lua: new THREE.Vector3(),
    y0: new THREE.Vector3(0, 1, 0), z0: new THREE.Vector3(0, 0, 1), x0: new THREE.Vector3(1, 0, 0), qFlip: new THREE.Quaternion(), camUp: new THREE.Vector3(0, 1, 0), upMix: new THREE.Vector3(),
    c1: new THREE.Color(), c2: new THREE.Color(),
  }), [])
  const hudN = useRef(0)
  const comboEl = useRef<HTMLElement | null>(null)
  // (disco) as linhas de velocidade do hyperlapse (no HUD, fora do canvas)
  const hyperEl = useRef<HTMLElement | null>(null)
  const hyperFase = useRef(0)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const ambRef = useRef<THREE.AmbientLight>(null)
  const dirRef = useRef<THREE.DirectionalLight>(null)
  const diaNevoa = useMemo(() => new THREE.Color("#7f93ad"), [])
  const desertoK = useRef(0)
  const alvoNevoa = useMemo(() => new THREE.Color(), [])
  const alvoCeu = useMemo(() => new THREE.Color(), [])
  const kTurbo = useRef(false)
  const kVel = useRef(0)
  const kEsterco = useRef(0)
  const kVolante = useRef(0)
  const kBalanco = useRef(0)
  const corpoK = useRef<THREE.Group>(null)
  const cabineG = useRef<THREE.Group>(null)
  const patinador = useRef<THREE.Group>(null)
  const kombiParada = useRef<THREE.Group>(null)
  // o estilo da oficina (pintura e neon de baixo)
  const [estiloK] = useState(() => lerEstilo())
  const kParadaT = useRef(false)
  const kParadaZero = useRef(0)
  const luzBaixo = useRef<THREE.PointLight>(null)
  const camInit = useRef(false)
  const falasT = useRef({ prox: 6, i: 0, raspa: 0 })

  // ── O RELÓGIO (19/10, LU2CA: "motores de movimento sincronizados com um
  // relógio por dentro"): a física anda em passos fixos de 1/120 s, quantos o
  // tempo pedir. A mesma Kombi a 30, 60 ou 144 quadros por segundo, e um quadro
  // atrasado não dá mais um pulo maior na física. A tela desenha a Kombi entre
  // os dois últimos passos (interpolada); a câmera e os efeitos seguem essa
  // pose, uma vez por quadro ──
  const relogio = useRef({ acc: 0, ok: false, p0: new THREE.Vector3(), q0: new THREE.Quaternion(), p1: new THREE.Vector3(), q1: new THREE.Quaternion(), f: new THREE.Vector3(), r: new THREE.Vector3(), up: new THREE.Vector3(), cine: cinemaRef.current, pct: 0, tq: null as number | null })
  const passo = (state: RootState, dt: number) => {
    const j = jogo.current
    const inp = input.current
    const ev = evs.current!
    j.tempo += dt
    let V = M.vias[j.via]

    // ── física na via ──
    amostra(V, j.u, a)
    const pct = j.v / VMAX
    const cine = cinemaRef.current
    if (cine) {
      // piloto automático: segue a pista no meio (nunca pega saída), sem
      // pressa; parando = encosta à direita e estaciona devagar
      const alvoX = cine === "lugar" ? j.x : cine === "parando" ? Math.min(MEIA * 0.4, a.dir - 2) : 0
      const alvoSteer = Math.max(-1, Math.min(1, (alvoX - j.x) / 3))
      j.steer += (alvoSteer - j.steer) * Math.min(1, dt * 3)
      j.escolha = 0
      if (cine === "lugar") j.v = Math.max(0, j.v - (8 + j.v * 0.6) * dt)
      else if (cine === "parando") j.v = Math.max(0, j.v - (2.6 + j.v * 0.12) * dt)
      else j.v += (VCINEMA - j.v) * Math.min(1, dt * 0.5)
      j.vx += (j.steer * (6 + 10 * Math.min(1, Math.abs(pct))) - j.vx) * Math.min(1, dt * 7)
      j.x += (j.vx - a.curv * j.v * Math.abs(j.v) * 0.035 * (1 - Math.min(0.75, Math.abs(a.bank) * 2.4))) * dt
    } else if (j.chegando || j.encostando || j.segura || j.noMapa) {
      j.v = Math.max(0, j.v - FREIO * 0.8 * dt)
      j.x += (0 - j.x) * dt * 1.5
      if (j.chegando && j.v < 0.5 && !j.parado) { j.parado = true; j.desligada = true; ev.chegou(); motor?.atualizar(0, false, false) }
    } else {
      // de dentro (primeira pessoa) a Kombi vai no AUTOMÁTICO: segue a pista
      // e pega sozinha a saída que leva pra missão; você só olha em volta
      // e com o celular aberto também: devagar, sem parar em lugar nenhum
      const noCel = celularRef.current
      // (LU2CA 21/10, a feira de missões) com uma missão pegada, 6 s sem tocar
      // em nada e a Kombi segue sozinha pra ela (a rota escolhe os cruzamentos e
      // ela encosta na vaga); qualquer toque devolve o volante
      const pilotoMissao = "disco" in M && !!vagaRef.current && j.naVaga !== vagaRef.current.id && !combRef.current.patins && !aberturaRef.current.ativa && inp.ultimo > 0 && performance.now() - inp.ultimo > 6000
      if (pilotoMissao !== !!j.piloto) { j.piloto = pilotoMissao; if (pilotoMissao) j.desligada = false; ev.piloto(pilotoMissao) }
      const auto = (dentroRef.current || noCel || pilotoMissao) && !cine
      // no automático, chegando na vaga da missão: encosta e freia sozinha
      const vgA = auto && !noCel ? vagaRef.current : null
      const dVaga = vgA && vgA.via === j.via ? du(V, j.u, vgA.u) : Infinity
      const encostando = !!vgA && dVaga > -VAGA / 2 && dVaga < 90
      const xAuto = encostando ? vgA!.lado * MEIA * 0.55 : 0
      let alvoSteer = auto ? Math.max(-1, Math.min(1, (xAuto - j.x) / 3)) : (inp.esq ? -1 : 0) + (inp.dir ? 1 : 0)
      // bifurcação: nos últimos 330m, um toque pro lado MARCA a saída e a
      // Kombi entra sozinha na faixa (antes tinha que acertar a faixa no
      // metro exato da divisão — era a trava). Toque do outro lado desmarca.
      let fProx: Faixa | null = null
      if (V.tipo === "circuito") {
        for (const f of V.faixas) {
          const dd = f.u - j.u
          if (dd > 0 && dd < 330 && (!fProx || f.u < fProx.u)) fProx = f
        }
      }
      if (fProx) {
        if (j.escolhaU !== fProx.u) { j.escolha = 0; j.escolhaU = fProx.u }
        const uk = fProx.u
        const lado = (l: 1 | -1) => V.faixas.find((f) => f.u === uk && f.lado === l)
        const pode = (l: 1 | -1) => { const f = lado(l); return !!f && aberta(f, nLibRef.current) }
        if (auto) {
          const la = lugarAlvoRef.current
          const pra = la ? rumo(V.t, la) : null
          const f = pra ? V.faixas.find((x) => x.u === uk && x.para === pra && aberta(x, nLibRef.current)) : undefined
          j.escolha = f ? f.lado : 0
        }
        if (!auto && inp.toqueD) j.escolha = j.escolha === -1 ? 0 : pode(1) ? 1 : j.escolha
        if (!auto && inp.toqueE) j.escolha = j.escolha === 1 ? 0 : pode(-1) ? -1 : j.escolha
        if (j.escolha && (auto || (!inp.esq && !inp.dir))) {
          const lim = j.escolha > 0 ? a.dir - 1.3 : a.esq + 1.3
          const alvoX = j.escolha > 0 ? Math.min(CK, lim) : Math.max(-CK, lim)
          alvoSteer = Math.max(-1, Math.min(1, (alvoX - j.x) / 2.5))
        }
      } else j.escolha = 0
      inp.toqueE = false
      inp.toqueD = false
      // (20/10) quanto mais rápido (múltiplos da pista), menos o volante segura;
      // no hyperlapse o controle sai da mão: ela só vai, na via onde está
      const multV = "disco" in M && j.vBase ? Math.max(1, j.v / j.vBase) : 1
      if (j.hyper) alvoSteer = 0
      else if (multV > 1.2) alvoSteer /= Math.sqrt(multV)
      j.steer += (alvoSteer - j.steer) * Math.min(1, dt * 7)
      // nos viadutos entre lugares a pista é expressa
      // invasão do Núcleo: a estrada não para, mas o motor fica limitado
      // tanque seco: a Kombi vai na reserva, bem devagar (dá pra chegar no posto)
      const seco = !aberturaRef.current.ativa && combRef.current.tanque <= 0
      // de patins: 150 km/h de verdade (o velocímetro marca ~82), sem turbo
      const patins = !!combRef.current.patins
      // (disco) a Kombi anda no dobro do BPM da faixa da pista (km/h); o turbo passa 25%
      const infV = faixasDisco.length ? (M as MundoDisco).info[j.via] : null
      const naEspiral = !!infV && naEspiralParte(infV.parte)
      const fxP = infV && !naEspiral ? faixasDisco[infV.pista] ?? null : null
      const vmax = patins ? 150 / 3.6 : naEspiral ? V_TORRE * (j.turboT > 0 && !seco ? 1.25 : 1) : fxP ? velPista(fxP) * (j.turboT > 0 && !seco ? 1.25 : 1) : (j.turboT > 0 && !seco ? VTURBO : VMAX) * (V.tipo === "saida" ? 1.2 : 1) * (limitadoRef.current ? 0.45 : 1) * (auto ? 0.78 : 1) * (noCel ? 0.5 : 1) * (seco ? 0.22 : 1)
      j.vBase = vmax
      // acelerador, freio e RÉ: perdeu a entrada, freia e volta de ré
      // a abertura: sem combustível o pedal não responde
      const ab = aberturaRef.current
      const abAqui = ab.ativa && j.via === ab.via
      // 10 s sem tocar em nada: tira o pé, freia devagar e desliga (no
      // automático da primeira pessoa e com o celular aberto ela segue)
      // (LU2CA 21/10) sem os botões de freio e de freio de mão: tocar os dois
      // lados da tela ao mesmo tempo freia (ré parado); no ar, é o mortal
      if (inp.ambos) { if (j.ar) { inp.mao = true; inp.freio = false } else { inp.freio = true; inp.mao = false } }
      else if (inp.ambosAntes) { inp.freio = false; inp.mao = false }
      inp.ambosAntes = !!inp.ambos
      if (inp.esq || inp.dir || inp.gas || inp.freio || inp.mao) inp.ultimo = performance.now()
      const ocioso = !auto && !abAqui && inp.ultimo > 0 && performance.now() - inp.ultimo > 10000
      if (ocioso && Math.abs(j.v) < 0.3) j.desligada = true
      const gas = !j.desligada && !ocioso && !(abAqui && (ab.semGas || ab.fase !== "dirige")) && (auto || inp.gas || (toqueTela && !inp.freio))
      if (j.desligada || ocioso) {
        j.v = Math.abs(j.v) < 0.3 ? 0 : j.v - Math.sign(j.v) * FREIO * 0.3 * dt
      } else if (inp.freio && !auto) {
        if (j.v > 0.8) j.v = Math.max(0, j.v - FREIO * dt)
        else j.v = Math.max(-VRE, j.v - 9 * dt)
      } else if (gas || j.turboT > 0) {
        if (j.v < 0) j.v = Math.min(0, j.v + FREIO * dt)
        else j.v += (ACEL * Math.max(0, 1 - j.v / vmax) + (j.turboT > 0 ? 16 : 0)) * dt
      } else {
        // solto: a Kombi vai perdendo embalo sozinha
        const atrito = (2.2 + 0.006 * j.v * j.v) * dt
        j.v = Math.abs(j.v) <= atrito ? 0 : j.v - Math.sign(j.v) * atrito
      }
      // (disco, LU2CA 19/10: "tirar o limite de velocidade que se pode ganhar
      // com os drifts e manobras") o EMBALO: acima da velocidade da pista, o que
      // veio de drift, manobra e voo não é puxado de volta; ele mesmo cai
      // devagar (~6%/s), e o que a Kombi perde (muro, freio) sai dele
      let emb = "disco" in M ? Math.min(j.embalo ?? 0, Math.max(0, j.v - vmax)) * Math.exp(-dt * 0.06) : 0
      // (20/10) o HYPERLAPSE: chegou a 4×, pula pra 10× (o salto) e continua
      // subindo (roda cada vez mais rápido); o freio tira ela de lá
      if ("disco" in M) {
        if (!j.hyper && j.v >= 4 * vmax && !j.ar) { j.hyper = true; j.hyperT = 0; j.v = 10 * vmax; emb = j.v - vmax; j.flash = 1; j.shake = 1.2; vib([30, 20, 30, 20, 120]); motor?.whoosh() }
        if (j.hyper) {
          j.hyperT = (j.hyperT ?? 0) + dt
          j.v *= 1 + 0.06 * dt
          emb = j.v - vmax
          j.vx = 0
          if (inp.freio || j.ar || j.v < 3 * vmax) { j.hyper = false; emb *= 0.5; j.v = vmax + emb }
        }
      }
      j.embalo = emb
      if (j.v > vmax + emb) j.v += (vmax + emb - j.v) * dt * 1.5
      if (encostando) j.v = Math.min(j.v, Math.max(2.5, dVaga * 0.3))
      // o tanque gasta andando (cheio dá uns 15 km)
      // (Kombi solar: a bateria não acaba)
      if (!aberturaRef.current.ativa) combRef.current.tanque = 1
      if (abAqui) {
        // o combustível acaba uns 110 m antes da casa: no embalo, para em frente
        const falta = ab.u - j.u
        if (falta < 110 && falta > -5) ab.semGas = true
        if (ab.semGas && ab.fase === "dirige") {
          const vPara = Math.sqrt(2 * 2.6 * Math.max(0, falta))
          j.v = Math.min(vPara, Math.max(j.v, Math.min(8, vPara)))
          if (falta < 0.6) { j.v = 0; ab.fase = "parou"; ab.t0 = j.tempo }
        }
        if (ab.fase !== "dirige") j.v = 0
      }
      j.v = Math.min(j.v, "disco" in M ? vmax * 30 : VTURBO * 1.08) // (disco: o hyperlapse vai longe)
      if (j.turboT > 0) j.turboT -= dt
      // DRIFT DE VERDADE — sem botão, é a finta (o "pêndulo" do rali):
      // virar pra um lado joga o PESO da Kombi pra aquele lado. Se, com o
      // peso ainda carregado e acima de VDRIFT, a direção vira de uma vez
      // pro outro lado, a traseira descarrega e as QUATRO rodas perdem
      // aderência juntas: a carroceria gira pra dentro da curva (deriva)
      // enquanto o embalo continua levando a Kombi pra onde ela ia — ela
      // anda de lado. Segurar pra dentro mantém o ângulo; contraesterçar
      // fecha (e, forte, joga o drift pro outro lado: pêndulo); soltar deixa
      // a aderência voltar e ela endireita sozinha.
      const lado = (inp.dir ? 1 : 0) - (inp.esq ? 1 : 0)
      const pesoAnt = j.peso
      j.peso += ((j.ar ? 0 : j.steer * Math.min(1, Math.max(0, pct) * 1.6)) - j.peso) * Math.min(1, dt * 4)
      if (!j.drift && (!patins || "disco" in M) && lado !== 0 && lado !== j.ladoAnt && !j.ar && j.v > VDRIFT && -lado * pesoAnt > PESO_FINTA) {
        // a finta: peso de um lado, volante pro outro. Quanto mais peso, mais
        // a carroceria gira de saída
        j.drift = lado as 1 | -1
        j.giro = lado * (1.4 + Math.abs(pesoAnt) * 2.2)
        j.driftT = 0
        j.shake = Math.max(j.shake, 0.18)
        vib([12, 18, 24])
      }
      // o freio de mão (Drift Max): segurando com a direção apertada, a
      // traseira solta na hora, sem precisar da finta
      if (!j.drift && (!patins || "disco" in M) && inp.mao && lado !== 0 && !j.ar && j.v > VDRIFT * 0.8) {
        j.drift = lado as 1 | -1
        j.giro = lado * 2.2
        j.driftT = 0
        j.v *= 0.97
        j.shake = Math.max(j.shake, 0.14)
        vib([10, 14, 20])
      }
      j.ladoAnt = lado
      const re = j.v < 0 ? -0.6 : 1
      if (j.drift) {
        const d = j.drift
        // torque na carroceria: pra dentro sustenta, contra fecha, solto =
        // só a aderência voltando (o -deriva) puxa ela de volta
        // (solto, os pneus voltam a morder: puxa bem mais forte pro reto)
        const torque = (lado === d ? 1.7 : lado === -d ? -2.6 : 0) * d * (0.6 + 0.4 * Math.min(1, pct * 1.5)) - j.deriva * (lado === d ? 2.4 : 7)
        j.giro += (torque - j.giro * 3) * dt
        j.deriva += j.giro * dt
        if (Math.abs(j.deriva) > DERIVA_MAX) { j.deriva = Math.sign(j.deriva) * DERIVA_MAX; j.giro *= -0.2 }
        // de lado, a Kombi carrega o embalo (resposta lenta) e vai sendo
        // empurrada pra onde o nariz aponta. Velocidade quase não cai (no
        // Horizon o carro segue a 170–200 mph atravessado): só um atrito leve
        // na proporção do ângulo
        const alvoVx = Math.sin(j.deriva) * Math.abs(j.v) * 0.6
        j.vx += (alvoVx - j.vx) * Math.min(1, dt * 1.8)
        j.v -= j.v * Math.abs(Math.sin(j.deriva)) * 0.06 * dt
        const ang = d * j.deriva
        if (ang > 0.2) {
          j.driftT += dt
          j.carga = Math.min(1, j.carga + dt * 0.22 * Math.min(1, ang / 0.5) * (inp.mods?.includes("turbo2") ? 1.5 : 1))
          // os pontos: ângulo × velocidade; o multiplicador sobe com o tempo de lado
          j.dMult = Math.min(5, j.dMult + dt * 0.1)
          j.dPts += ang * Math.abs(j.v) * dt * 12 * j.dMult
          const rotulo = ang > 0.65 ? "ângulo grande" : Math.abs(j.v) > 36 ? "rápido" : ang > 0.4 ? "bom ângulo" : ""
          if (rotulo) { j.dMsg = rotulo; j.dMsgT = j.tempo + 0.6 }
        }
        if (ang < 0.05 && lado === -d && -d * j.giro > 1.0 && j.v > VDRIFT) {
          // pêndulo: o contraesterço passou do ponto e a carroceria foi pro
          // outro lado com força — vira um drift pro outro lado
          j.drift = -d as 1 | -1
        } else if ((ang < 0.05 && lado !== d) || j.v < 10 || j.ar) {
          // aderência voltou
          if (j.driftT > 0.6) {
            j.turboT = Math.max(j.turboT, Math.min(1.8, 0.5 + j.driftT * 0.6))
            // (disco) o drift longo vira embalo (sem teto: drift atrás de drift acelera)
            if ("disco" in M) { const g = Math.min(12, j.driftT * 3.5); j.v += g; j.embalo = (j.embalo ?? 0) + g }
            j.flash = Math.max(j.flash, 0.35)
            motor?.whoosh()
            vib([15, 20, 40])
          }
          j.drift = 0
          j.driftT = 0
          j.giro = 0
          j.dFim = j.tempo
        }
      } else {
        // sem emendar outro drift a tempo, os pontos entram no total
        if (j.dPts > 0 && j.tempo - j.dFim > DRIFT_JUNTA) {
          const pts = Math.round(j.dPts)
          j.dTotal += pts; j.dMsg = `+${pts.toLocaleString("pt-BR")}`; j.dMsgT = j.tempo + 1.6
          j.dPts = 0; j.dMult = 1
        }
        j.deriva += (0 - j.deriva) * Math.min(1, dt * 5)
        // lateral com aderência: resposta rápida (Horizon); força centrífuga
        // leve — a curva inclinada segura boa parte dela
        const alvoVx = j.steer * (6 + 10 * Math.min(1, Math.abs(pct))) * re
        j.vx += (alvoVx - j.vx) * Math.min(1, dt * 7)
      }
      const segura = 1 - Math.min(0.75, Math.abs(a.bank) * 2.4)
      // (no hyperlapse ela fica travada na faixa: sem centrífuga, sem muro)
      if (j.hyper) j.vx = 0
      else if (!j.ar) j.x += (j.vx - a.curv * j.v * Math.abs(j.v) * 0.035 * segura) * dt
      else j.x += j.vx * 0.5 * dt
    }
    // ── A DIREÇÃO LIVRE (mapa novo, LU2CA 16/10: "liberdade de direção e
    // movimento pro carro"): a Kombi tem posição e rumo no mundo; a direção
    // vira o carro de verdade (fecha mais devagar, abre mais rápido), sobe na
    // calçada, corta por onde quiser; os prédios são obstáculo. A cada quadro
    // ela é projetada na rede (via, u, x): as missões, os lugares, o mapa, a
    // rota e o trânsito seguem lendo isso como sempre ──
    const MR = "ligacoes" in M ? (M as MundoRede) : null
    // (o disco é pista de Gran Turismo: parede invisível, sem direção livre)
    const livre = !!MR && !("disco" in M) && !cine && !aberturaRef.current.ativa && !j.chegando && !passeio.current.andando
    let trocou = false
    const uAnt = j.u
    if (livre && MR) {
      // alguém mudou a Kombi de lugar por fora (missão, atalho, viagem rápida,
      // cena): realinha com a rua em vez de voltar pro ponto antigo do mundo
      const mexeram = j.livreOk && (j.via !== j.lvVia || Math.abs(j.u - (j.lvU ?? j.u)) > 3)
      if (!j.livreOk || j.encaixar || mexeram) {
        const C0 = M.vias[j.via], i0 = Math.max(0, Math.min(C0.n - 1, Math.floor(j.u / PASSO)))
        j.wx = C0.px[i0] - C0.tz[i0] * j.x; j.wz = C0.pz[i0] + C0.tx[i0] * j.x; j.rumo = Math.atan2(C0.tx[i0], C0.tz[i0]) + (j.v < -0.5 ? Math.PI : 0)
        if (mexeram && !j.ar) { j.y = C0.py[i0]; j.vy = 0 }
        j.livreOk = true
      }
      // no automático (de dentro, celular aberto) ela segue a rua sozinha
      if (dentroRef.current || celularRef.current) {
        const dif = Math.atan2(Math.sin(Math.atan2(a.tx, a.tz) - j.rumo!), Math.cos(Math.atan2(a.tx, a.tz) - j.rumo!))
        j.steer += (Math.max(-1, Math.min(1, -dif * 2.5 - j.x * 0.12)) - j.steer) * Math.min(1, dt * 4)
      }
      // sem mexer na direção, em cima da rua, ela acompanha a curva sozinha
      // (como antes): a liberdade é pra quando você vira
      if (Math.abs(j.steer) < 0.08 && !j.livreFora && !j.drift) {
        const contra = Math.cos(Math.atan2(a.tx, a.tz) - j.rumo!) < 0
        // e volta devagar pro meio da faixa (de ré na rua, o lado inverte)
        const tang = Math.atan2(a.tx, a.tz) + (contra ? Math.PI : 0) + Math.max(-0.25, Math.min(0.25, j.x * 0.035)) * (contra ? -1 : 1)
        const dif = Math.atan2(Math.sin(tang - j.rumo!), Math.cos(tang - j.rumo!))
        if (Math.abs(dif) < 0.6) j.rumo! += dif * Math.min(1, dt * 3)
      }
      const vel = Math.abs(j.v)
      const giro = j.steer * Math.min(1, vel / 4) * (2.4 - 1.4 * Math.min(1, vel / 50)) * (j.drift ? 1.6 : 1) * (j.ar ? 0.25 : 1)
      j.rumo! -= giro * dt * (j.v < 0 ? -1 : 1)
      const sx = Math.sin(j.rumo!), cz = Math.cos(j.rumo!)
      let nx = j.wx! + sx * j.v * dt, nz = j.wz! + cz * j.v * dt
      const empurra = bater(nx, nz, 1.5)
      // (disco) o pinball: o prédio devolve a Kombi (nunca fica raspando nele)
      if (empurra && "disco" in M) { nx += empurra[0]; nz += empurra[1]; quicar(j, empurra, carro.current) }
      else if (empurra) {
        nx += empurra[0]; nz += empurra[1]
        j.dRaspa += dt
        if (j.dPts > 0 && j.dRaspa > 0.35) { j.dPts = 0; j.dMult = 1; j.dMsg = "bateu · perdeu o drift"; j.dMsgT = j.tempo + 1.4 }
        if (Math.abs(j.v) > 6) {
          j.v *= 1 - 1.4 * dt
          j.shake = Math.max(j.shake, 0.3)
          falasT.current.raspa -= dt
          if (falasT.current.raspa <= 0) { vib(18); falasT.current.raspa = 0.14 }
          soltarFaiscas(faiscas, carro.current, 1)
        }
      } else j.dRaspa = Math.max(0, j.dRaspa - dt)
      j.wx = nx; j.wz = nz
      const pr = MR.projetar(nx, nz, j.y, sx, cz)
      if (pr) {
        if (pr.via !== j.via) { j.via = pr.via; trocou = true; j.pegos.clear() }
        j.u = pr.u; j.x = pr.x; j.livreFora = Math.abs(pr.x) > pr.meia + 3
      }
      j.lvVia = j.via; j.lvU = j.u
      j.st.vmax = Math.max(j.st.vmax, j.v)
    }
    if (!livre) j.livreOk = false
    if (!livre && !j.voo) {
    // parede macia: raspa, solta faísca, perde um pouco de velocidade. Faixa
    // de saída trancada = muro no lugar da faixa
    let dirMax = a.dir
    let esqMin = a.esq
    if (V.tipo === "circuito") {
      for (const f of V.faixas) {
        if (j.u <= f.u - ABRE || j.u > f.u || aberta(f, nLibRef.current)) continue
        if (f.lado > 0) dirMax = Math.min(dirMax, MEIA)
        else esqMin = Math.max(esqMin, -MEIA)
      }
    }
    const limE = esqMin + 1.05
    const limD = dirMax - 1.05
    // (disco) longe do muro = a pista estreitou embaixo da Kombi (entrou numa
    // alça de meia pista, vindo da outra metade): ela desliza pra dentro em
    // ~0,4 s, sem tranco e sem raspar. Encostou no muro de verdade: raspa
    const fora = j.x < limE ? limE - j.x : j.x > limD ? j.x - limD : 0
    if (j.hyper && fora > 0) {
      // no hyperlapse ela não encosta no muro: só se ajeita pra dentro
      j.x += (j.x > limD ? -1 : 1) * Math.min(fora, 30 * dt)
    } else if ("disco" in M && fora > 1.2) {
      j.x += (j.x > limD ? -1 : 1) * Math.min(fora, Math.max(1, fora) * 6 * dt)
      j.vx *= 0.5
    } else if ("disco" in M && (j.x < limE || j.x > limD)) {
      // (LU2CA 21/10 (2), o PINBALL: "tudo é de material sintético inquebrável,
      // há um bounce [...] você nunca bate e fica travado") o guard rail devolve
      // a Kombi pro meio, quase sem perder velocidade; segurando o volante contra
      // ele, ela quica de novo (um baque por encosto)
      const lado = j.x > limD ? 1 : -1
      j.x = lado > 0 ? limD : limE
      const forte = j.tempo - (j.quique ?? -9) > 0.35
      j.vx = -lado * Math.max(Math.abs(j.vx) * 0.75, 3.5 + Math.abs(j.v) * 0.04)
      if (forte) {
        j.v *= 0.97
        j.quique = j.tempo
        j.shake = Math.max(j.shake, 0.22)
        vib(14)
        soltarFaiscas(faiscas, carro.current, lado)
      }
    } else if (j.x < limE || j.x > limD) {
      const lado = j.x > limD ? 1 : -1
      j.x = lado > 0 ? limD : limE
      j.vx = -lado * Math.abs(j.vx) * 0.25
      // ficou raspando no muro: o drift em jogo se perde (um toque leve passa)
      j.dRaspa += dt
      if (j.dPts > 0 && j.dRaspa > 0.35) { j.dPts = 0; j.dMult = 1; j.dMsg = "bateu · perdeu o drift"; j.dMsgT = j.tempo + 1.4 }
      if (j.v > 8) {
        j.v *= 1 - 0.55 * dt * ("disco" in M && j.vBase ? Math.max(1, j.v / j.vBase) : 1)
        j.shake = Math.max(j.shake, 0.25)
        falasT.current.raspa -= dt
        if (falasT.current.raspa <= 0) { vib(16); falasT.current.raspa = 0.14 }
        soltarFaiscas(faiscas, carro.current, lado)
      }
    }
    else j.dRaspa = Math.max(0, j.dRaspa - dt)
    j.st.vmax = Math.max(j.st.vmax, j.v)

    // a meia-volta (mapa novo): parado, segurando o freio e um lado por meio segundo
    if (V.tipo === "rua" && Math.abs(j.v) < 6 && inp.freio && (inp.esq || inp.dir)) {
      j.v = 0 // segura parada (sem dar ré) enquanto faz a manobra
      j.tVolta = (j.tVolta ?? 0) + dt
      if (j.tVolta > 0.5) { j.tVolta = 0; j.retorno = true }
    } else j.tVolta = 0
    if (j.retorno && V.tipo === "rua" && V.rede && V.rede.par < 0) j.retorno = false
    if (j.retorno && V.tipo === "rua" && V.rede) {
      j.retorno = false
      const par = V.rede.par
      // (o mesmo eixo: o lado da rua só espelha)
      j.via = par; j.u = Math.max(0, M.vias[par].L - j.u); j.x = -j.x; j.vx = 0; j.v = 0
      j.shake = Math.max(j.shake, 0.2); vib([20, 40, 20])
      V = M.vias[j.via]; ev.via(j.via)
    }
    j.u += j.v * dt
    // bifurcação: se o carro está na faixa de uma saída aberta, pega ela
    const f = V.tipo === "circuito" ? saidaEm(V, uAnt, j.u, j.x, (ff) => aberta(ff, nLibRef.current), j.escolha) : null
    if (V.tipo === "circuito" && V.faixas.some((ff) => uAnt < ff.u && j.u >= ff.u)) j.escolha = 0
    if (f) {
      trocou = true
      if (j.voltaIni >= 0) {
        j.voltas++
        j.st.voltas = j.voltas
        ev.volta(j.tempo - j.voltaIni)
      }
      j.pegos.clear()
      j.via = f.via
      j.u = j.u - f.u
      j.x -= f.lado * CK
      j.sintonizou = false
      vib([20, 30, 20])
    } else if (j.u >= V.L && V.tipo === "rua" && V.rede) {
      // o mapa novo: no cruzamento, a próxima rua (a mais reta; segurando
      // pro lado, a curva daquele lado). Rua sem saída: dá a volta pela outra mão
      const sobra = j.u - V.L
      trocou = true
      const sai = (M as MundoRede).ligacoes.saidas[V.rede.para]
      const cands = sai.filter((vi) => vi !== V.rede!.par)
      const tx = V.tx[V.n - 1], tz = V.tz[V.n - 1]
      const lado = (inp.dir ? 1 : 0) - (inp.esq ? 1 : 0)
      let prox = V.rede.par, melhor = -Infinity
      // com destino (o que você marcou no mapa, senão a vaga da missão): a rota escolhe
      const alvoR = marcaRef.current ?? vagaRef.current
      const rr = alvoR && !lado ? calcularRota(M, { via: j.via, u: V.L }, { via: alvoR.via, u: alvoR.u }) : null
      const pelaRota = rr?.trechos[1]?.via
      if (pelaRota !== undefined && cands.includes(pelaRota)) { melhor = Infinity; prox = pelaRota }
      // (disco) na espiral: a rota marcada decide; senão, sai quem está na
      // faixa pintada da linha (a da direita) ou vira pro lado da saída; virando
      // pro outro lado, ou nas faixas da esquerda, segue subindo
      if ("disco" in M) {
        const MD = M as MundoDisco
        const segue = cands.find((vi) => naEspiralParte(MD.info[vi]?.parte))
        const sai = cands.find((vi) => MD.info[vi]?.parte === "saida")
        if (segue !== undefined && sai !== undefined && !(pelaRota !== undefined && cands.includes(pelaRota))) {
          melhor = Infinity
          const ladoS = MD.ladoSaida.get(sai) ?? 1
          const naFaixa = j.x * ladoS > 4.4
          // (no hyperlapse ela só segue; a saída de uma pista apagada fica fechada)
          prox = !j.hyper && !viaApagada?.[sai] && (lado !== 0 ? Math.sign(lado) === ladoS : naFaixa) ? sai : segue
        }
      }
      for (const vi of cands) {
        if (melhor === Infinity) break
        const C = M.vias[vi], q8 = Math.min(C.n - 1, 8), reto = tx * C.tx[q8] + tz * C.tz[q8], direita = tx * C.tz[q8] - tz * C.tx[q8]
        const nota = lado === 0 ? reto : lado * direita * 2 + reto * 0.3
        if (nota > melhor) { melhor = nota; prox = vi }
      }
      j.via = prox
      j.u = Math.min(sobra, M.vias[prox].L - 1)
      j.pegos.clear()
    } else if (j.u >= V.L) {
      const sobra = j.u - V.L
      trocou = true
      if (V.tipo === "circuito") {
        // fim da volta (quem ficou)
        if (j.voltaIni >= 0) {
          j.voltas++
          j.st.voltas = j.voltas
          ev.volta(j.tempo - j.voltaIni)
        }
        j.pegos.clear()
        j.u = sobra
        j.voltaIni = j.tempo
      } else {
        // fim da saída: encosta no circuito do destino — e aqui é o
        // impacto: a música nova entra de uma vez (ev.via), com clarão na
        // cor da rádio, tranco na câmera e o cenário virando junto
        calar()
        j.impacto = 1
        j.flash = 1
        j.soco = true
        j.shake = Math.max(j.shake, 0.9)
        vib([40, 30, 90])
        j.via = M.circuito[V.t]
        j.u = V.chega!.u + sobra
        j.voltaIni = -1
        j.pegos.clear()
      }
    }
    // de ré passando do começo: no circuito dá a volta; numa saída, volta
    // pro lugar de onde saiu, na faixa da bifurcação
    if (j.u < 0 && V.tipo === "rua") { j.u = 0; j.v = Math.max(0, j.v) }
    else if (j.u < 0) {
      trocou = true
      if (V.tipo === "circuito") j.u += V.L
      else {
        const vi = M.circuito[V.de!]
        const fx = M.vias[vi].faixas.find((ff) => ff.via === j.via)
        calar()
        j.sintonizou = false
        player.volume(1)
        j.via = vi
        j.u = (fx?.u ?? 0) + j.u
        j.x += (fx?.lado ?? 0) * CK
        j.pegos.clear()
      }
    }
    }
    if (M.vias[j.via] !== V) {
      V = M.vias[j.via]
      ev.via(j.via)
    }

    // a saída é a sintonia: a música de onde você veio vai sumindo, a
    // estática sobe e o dial gira; a música nova só entra na CHEGADA
    // a estática só existe dentro da saída: saiu por qualquer caminho
    // (teleporte, atalho, troca de via), cala — antes ela ficava chiando presa
    if (V.tipo !== "saida" && chiado.current) calar()
    if (V.tipo === "saida") {
      const p = j.u / V.L
      const noRadio = fonteRef.current === "radio"
      if (!j.sintonizou && p >= 0.45 && noRadio) { j.sintonizou = true; calar(); chiado.current = estatica() }
      if (hudN.current % 3 === 0 && noRadio) {
        player.volume(p < 0.45 ? 1 : Math.max(0, 1 - (p - 0.45) / 0.3))
        if (chiado.current) {
          chiado.current.volume(Math.max(0, Math.min(0.2, ((p - 0.45) / 0.25) * 0.2)))
          chiado.current.sintonizar(700 + 2200 * Math.abs(Math.sin(p * 22)))
        }
      }
    }

    // pulos: se a pista cai mais rápido do que a gravidade, a Kombi voa
    amostra(V, j.u, a)
    let yPista = livre && MR && j.livreFora ? MR.chao(j.wx!, j.wz!) + 0.3 : a.y - j.x * Math.sin(a.bank)
    // ── (disco, passo 3) O VOO: segurando o propulsor a Kombi sobe; longe da
    // pista, solta dela e voa livre (vira com o volante); embaixo, a pista
    // mais alta é onde ela pousa (e a faixa daquela pista entra); sem pista
    // embaixo, o deserto ──
    const MD = "disco" in M ? (M as MundoDisco) : null
    let pouso: ReturnType<MundoDisco["pousar"]> = null
    if (MD) {
      if (j.encaixar) { j.voo = false; j.propulsou = false }
      j.energia = j.energia ?? 1
      inp.propulsor = ((!!inp.espacoDesde && performance.now() - inp.espacoDesde > 220) || !!inp.propulsorBotao) && !inp.semHolo && !inp.semVoo
      // (19/10, LU2CA: "nem o propulsor funciona") a abertura que trava aqui é
      // a do mapa velho: no disco ela nunca termina (a abertura do disco, o
      // deserto, a D-Bee e a oficina, ainda não existe), e o propulsor ficava
      // desligado pra sempre. No disco ela não trava
      // (LU2CA 19/10) de patins, o propulsor é o jato de ar das costas: sobe
      // mais seco, gasta mais rápido e recarrega mais rápido (é leve)
      const pat = !!combRef.current.patins
      const quer = inp.propulsor && !cine && !j.desligada
      if (quer && j.energia > 0) {
        // (LU2CA 21/10 (2): "os objetos saem do chão com velocidade acelerando,
        // não num tranco") sai do chão na velocidade do próprio chão (subindo a
        // rampa, sobe junto) e o empuxo cresce em ~0,4 s: começa equilibrando o
        // peso e vai até a força cheia (a mesma subida de antes, sobre 9,8 m/s²)
        if (!j.ar) { j.ar = true; j.tAr = 0; j.pulou = false; j.y = Math.max(j.y, yPista) + 0.05; j.vy = Math.max(j.vy, Math.max(0, a.ty * j.v) + 0.4); j.tProp = 0; motor?.whoosh(); vib(18) }
        j.tProp = (j.tProp ?? 0) + dt
        const e = Math.min(1, j.tProp / 0.4), suave = e * e * (3 - 2 * e)
        const teto = pat ? 13 : 16, cheio = G_TERRA + (pat ? 30 : 16)
        const empuxo = G_TERRA + 0.8 + (cheio - G_TERRA - 0.8) * suave * (1 - Math.max(0, j.vy) / (teto * 1.3))
        j.vy = Math.min(teto, j.vy + empuxo * dt)
        j.energia = Math.max(0, j.energia - (pat ? 0.34 : 0.22) * dt * (inp.mods?.includes("tanque") ? 0.65 : 1))
        j.propulsou = true
      } else if (!j.ar && !j.voo) j.energia = Math.min(1, j.energia + (pat ? 0.24 : 0.1) * dt) // a energia solar volta na pista
      // (LU2CA 20/10: "quando cai no deserto perde o poder de propulsão e fica
      // preso") no chão do deserto ela segue no modo voo (sem pista embaixo),
      // e a energia não voltava nunca. Lá é sol aberto: recarrega mais rápido
      else if (!j.ar && j.voo) j.energia = Math.min(1, j.energia + (pat ? 0.4 : 0.25) * dt)
      if (j.ar && j.propulsou && !j.voo && j.y - yPista > 3.5) {
        const p = carro.current!.position
        j.voo = true; j.wx = p.x; j.wz = p.z; j.rumo = Math.atan2(a.tx, a.tz)
      }
      if (j.voo) {
        j.rumo = (j.rumo ?? 0) - (inp.mao ? 0 : j.steer * dt * (j.ar ? 1.1 : 1.8))
        j.wx = j.wx! + Math.sin(j.rumo) * j.v * dt
        j.wz = j.wz! + Math.cos(j.rumo) * j.v * dt
        // (B15) o deserto é "infinito", mas o chão desenhado acaba a 4,5 km:
        // a 3,9 km o vento empurra de volta, devagar (nunca chega na borda)
        const rr = Math.hypot(j.wx, j.wz)
        if (rr > 3900) { const k = (rr - 3900) / rr; j.wx -= j.wx * k; j.wz -= j.wz * k; j.v *= 1 - 0.8 * dt }
        // os prédios: abaixo do topo, bate e escorrega
        const emp = bater(j.wx, j.wz, 1.6, j.y)
        if (emp) { j.wx += emp[0]; j.wz += emp[1]; quicar(j, emp, carro.current) }
        pouso = MD.pousar(j.wx, j.wz, j.y, Math.sin(j.rumo), Math.cos(j.rumo))
        // (LU2CA 20/10: "a exploração por propulsão bem livre, sem amarras aos
        // percursos uma vez no ar; onde ele quiser pousar, ele pode") sem ímã:
        // no ar a direção é só do player. Pousa onde cair: numa pista (acesa ou
        // apagada) ou nas dunas
        yPista = pouso ? pouso.y : MD.chaoEm(j.wx, j.wz) // (sem pista embaixo: as dunas)
      }
    }
    if (j.encaixar) { j.ar = false; j.y = yPista; j.vy = 0 } // teleporte (dev)
    // o PULO: do chão, quando quiser (não no meio de cena nem da abertura)
    j.tPulo = Math.max(0, (j.tPulo ?? 0) - dt)
    // (números da pesquisa de 17/10: 2,5 m de altura, topo em 0,35 s, a queda
    // 1,7× mais forte que a subida, ~0,6 s no ar; apertar até 0,12 s antes de
    // pousar ainda vale)
    // ("coyote time", pesquisa 17/10: até 0,1 s depois de a Kombi sair da
    // lombada sozinha, o pulo ainda vale e soma com o voo)
    const coyote = j.ar && !j.pulou && j.tAr < 0.1 && j.vy > -2
    if (inp.pulo && (!j.ar || coyote)) {
      inp.pulo = false
      if (!cine && !(aberturaRef.current.ativa && !("disco" in M)) && !j.chegando && j.tPulo <= 0 && !j.desligada) { // (no disco a abertura velha não trava o pulo)
        j.ar = true; j.tAr = 0; j.pulou = true
        j.vy = Math.max(0, coyote ? j.vy : 0) + (MD ? V_PULO_TERRA : 14.3)
        j.y = Math.max(j.y, yPista) + 0.05
        j.shake = Math.max(j.shake, 0.18)
        motor?.whoosh(); vib(14)
      }
    }
    if (inp.pulo && j.ar && j.tAr > 0.3 && j.vy < 0 && j.y - yPista > 2.2) inp.pulo = false // cedo demais: não guarda
    // ── AS MANOBRAS NO AR (LU2CA 19/10: "as manobras no ar aprimoradas") ──
    // no pulo, o volante gira a carroceria; segurando o freio de mão, o
    // mortal (de costas; com ↑, pra frente) e, junto com o volante, o
    // parafuso. No voo, só com o freio de mão (sem ele, o volante é o rumo).
    // Com inércia: a rotação acelera e freia, tem peso. De patins, mais ágil
    j.giroAr = j.giroAr ?? 0; j.vGiro = j.vGiro ?? 0; j.flipAr = j.flipAr ?? 0; j.vFlip = j.vFlip ?? 0
    if (j.ar) {
      const agil = combRef.current.patins ? 1.45 : 1
      const manobra = (!j.voo || inp.mao) && !(inp.propulsor && j.voo)
      // (num pulo de ~0,6 s, um 360 ou um mortal cabem se você entra na hora)
      const alvoG = manobra ? j.steer * 14 * agil : 0
      const alvoF = manobra && inp.mao ? (inp.gas && !inp.freio ? -1 : 1) * 13 * agil : 0
      // soltou: a carroceria se ajeita pro giro completo mais perto (passou da
      // metade, completa; antes, desfaz). Assim o pouso limpo depende de
      // soltar na hora, não de adivinhar a inércia
      const T = Math.PI * 2
      const prumoG = alvoG ? alvoG : (Math.round(j.giroAr / T) * T - j.giroAr) * 7
      const prumoF = alvoF ? alvoF : (Math.round(j.flipAr / T) * T - j.flipAr) * 7
      j.vGiro += (prumoG - j.vGiro) * Math.min(1, dt * 10)
      j.vFlip += (prumoF - j.vFlip) * Math.min(1, dt * 10)
      j.giroAr += j.vGiro * dt
      j.flipAr += j.vFlip * dt
    } else {
      j.vGiro = 0; j.vFlip = 0
      if (j.giroAr) { j.giroAr *= Math.exp(-dt * 9); if (Math.abs(j.giroAr) < 0.01) j.giroAr = 0 }
      if (j.flipAr) { j.flipAr *= Math.exp(-dt * 9); if (Math.abs(j.flipAr) < 0.01) j.flipAr = 0 }
    }
    // (patins) o dash: o turbo no ar empurra pra frente, uma vez por pulo
    if (inp.turbo && combRef.current.patins && j.ar && !j.dashou) {
      j.dashou = true; inp.turbo = false
      j.v += 14; j.vy = Math.max(j.vy, 2.5)
      j.flash = 0.3; motor?.whoosh(); vib([14, 10, 30])
    }
    if (j.ar) {
      j.vy -= (MD ? G_TERRA : j.pulou ? (j.vy > 0 ? 40.8 : 69) : G) * dt
      // (disco) sem o propulsor, a Kombi plana (desce até 10 m/s): dá tempo de mirar numa pista
      if (j.voo && !inp.propulsor) j.vy = Math.max(j.vy, -10)
      const yAntes = j.y
      j.y += j.vy * dt
      // (LU2CA 20/10, B15) subindo por baixo de uma pista, a Kombi bate no fundo
      // dela (não atravessa): trava a subida, tranco, faísca
      if (MD && j.vy > 0) {
        let px: number, pz: number
        if (j.voo && j.wx !== undefined) { px = j.wx; pz = j.wz! } else { amostra(V, j.u, a); px = a.x - a.tz * j.x; pz = a.z + a.tx * j.x }
        const TETO_K = 2.3, LAJE = 0.7 // a altura da Kombi e a espessura do asfalto
        const ty = MD.teto(px, pz, yAntes + TETO_K * 0.5)
        if (ty !== null && j.y + TETO_K > ty - LAJE) {
          j.y = ty - LAJE - TETO_K
          j.vy = -Math.min(6, 2 + j.vy * 0.3)
          j.shake = Math.max(j.shake, 0.5)
          if (carro.current) { soltarFaiscas(faiscas, carro.current, 1); soltarFaiscas(faiscas, carro.current, -1) }
          vib([20, 10, 30])
        }
      }
      j.tAr += dt
      if (j.y <= yPista) {
        const tempoAr = j.tAr
        j.ar = false
        j.y = yPista
        j.shake = Math.max(j.shake, Math.min(1.2, 0.3 + tempoAr))
        // pousou de um pulo: um empurrão pra frente (o embalo do inFamous) e um respiro antes do próximo
        // (pulinho no chão plano não dá turbo; voo de verdade, como no Crash, dá)
        if (j.pulou) { j.pulou = false; j.tPulo = 0.6 }
        // (disco) pousou do voo: numa pista (a via no sentido do rumo), ou no deserto
        if (j.voo && pouso) {
          j.voo = false
          const mudou = j.via !== pouso.via
          j.via = pouso.via; j.u = pouso.u; j.x = pouso.x; j.vx = 0
          if (mudou) { trocou = true; V = M.vias[j.via]; ev.via(j.via) }
        }
        j.propulsou = false
        j.dashou = false
        // o pouso julga a manobra: alinhado = o nome dela, turbo, onda e o
        // combo (manobra atrás de manobra, menos de 3 s, multiplica); torto =
        // cambaleia e perde o embalo (nunca capota: é pra dar vontade de tentar)
        {
          const T = Math.PI * 2
          const vg = Math.round((j.giroAr ?? 0) / T), sg = (j.giroAr ?? 0) - vg * T
          const vf = Math.round((j.flipAr ?? 0) / T), sf = (j.flipAr ?? 0) - vf * T
          if (vg || vf) {
            if (Math.abs(sg) < 0.9 && Math.abs(sf) < 0.75) {
              const ag = Math.abs(vg), af = Math.abs(vf)
              const nome = af && ag ? `parafuso ${ag * 360}°` : af ? `${af > 1 ? `${af}× ` : ""}mortal${vf > 0 ? " de costas" : ""}` : `${ag * 360}°`
              j.trComboN = j.tempo - (j.trComboT ?? -9) < 3 ? (j.trComboN ?? 0) + 1 : 1
              j.trComboT = j.tempo
              const mult = Math.min(5, j.trComboN)
              const pts = (2 * ag + 3 * af) * mult
              if (Math.abs(j.v) > 5) { const g = (5 * ag + 7 * af) * (1 + 0.25 * (mult - 1)); j.v += Math.sign(j.v) * g; j.embalo = (j.embalo ?? 0) + g }
              j.turboT = Math.max(j.turboT, 0.8 + 0.3 * af)
              j.carga = Math.min(1, j.carga + 0.1 * (ag + af))
              j.psi = Math.min(1, (j.psi ?? 0) + 0.45)
              ev.sinal(pts, `${nome}${mult > 1 ? ` ×${mult}` : ""}!`, af ? "#5dffa0" : "#ff5bd6")
              j.dMsg = `★${nome}${mult > 1 ? ` ×${mult}` : ""}|+${pts}`; j.dMsgT = j.tempo + 1.8
              vib([20, 20, 40])
            } else {
              j.trComboN = 0
              j.v *= 0.55
              j.shake = Math.max(j.shake, 1)
              j.dMsg = "caiu torto"; j.dMsgT = j.tempo + 1.4
              vib([60, 40, 60])
            }
          }
          j.giroAr = sg; j.flipAr = sf
        }
        if (tempoAr > 1) j.psi = Math.min(1, (j.psi ?? 0) + 0.25)
        // (o voo dá turbo: quanto mais tempo no ar, mais carga; e vira embalo)
        if (tempoAr > 0.75 && Math.abs(j.v) > 5) { const g = Math.min(8, tempoAr * 4); j.v += Math.sign(j.v) * g; j.embalo = (j.embalo ?? 0) + g; j.carga = Math.min(1, j.carga + ("disco" in M ? Math.min(0.5, tempoAr * 0.12) : 0.08)) }
        motor?.baque()
        vib(tempoAr > 0.6 ? [40, 30, 60] : 30)
        j.st.ar += tempoAr
        if (tempoAr > 0.5) {
          const n = Math.round(tempoAr * 3)
          ev.sinal(n, `voou ${tempoAr.toFixed(1)}s · +${n}`, "#ffc857")
          if (Math.random() < 0.5) ev.falar("Notti", "A KOMBI VOA???")
        }
        j.tAr = 0
      }
    } else {
      const vyPista = Math.max(-40, Math.min(40, (yPista - j.y) / Math.max(dt, 1e-4)))
      // (mapa novo: sem pulo automático — a rua que cai não lança a Kombi;
      // só o pulo do jogador tira ela do chão)
      // (disco, 20/10) nas dunas, sim: a crista lança a Kombi (o tutorial do voo)
      if ((!("ligacoes" in M) || ("disco" in M && !!j.voo)) && vyPista < j.vy - G * dt * 2.2 && j.v > 20 && !trocou) {
        j.ar = true
        j.tAr = 0
        motor?.whoosh()
      } else {
        j.vy = trocou ? j.vy : vyPista
        j.y = yPista
      }
    }

    // pontos de busca das missões: passou pela coluna, pegou
    if (!trocou) {
      for (const m of marcosRef.current) {
        if (m.via !== j.via || j.pegos.has(-1 - m.u)) continue
        if (uAnt < m.u && j.u >= m.u) {
          j.pegos.add(-1 - m.u)
          ev.pegar(m.chave)
        }
      }
    }

    // portais (só no centro)
    if (!trocou && V.estacoes.length) {
      for (const e of V.estacoes) {
        if (!(uAnt < e.u && j.u >= e.u)) continue
        // chegar no destino NÃO freia sozinho (GTA: o jogo nunca tira o
        // volante de você). Aparece "descer aqui"; passou reto, segue
        ev.portal(e.id)
      }
    }

    // orbs da via atual. (disco, LU2CA 19/10: "os anéis não estão todos
    // coletáveis") a ida e a volta são o MESMO asfalto: os anéis da outra mão
    // estão ali na frente, então também valem (u e x espelhados). E a largura
    // que pega é a da Kombi (~1 m de cada lado) mais o raio do anel
    const parO = "disco" in M && V.rede && V.rede.par >= 0 && !j.voo ? V.rede.par : -1
    for (const [vo, esp] of [[j.via, false], [parO, true]] as const) {
    if (vo < 0 || viaApagada?.[vo]) continue
    const Lp = M.vias[vo].L
    for (const i of orbs.porVia[vo]) {
      if (j.pegos.has(i)) continue
      const o = orbs.lista[i]
      const d = esp ? Lp - j.u - o.u : du(V, j.u, o.u)
      // (rápido e a 30 quadros/s a Kombi anda 2+ m por quadro: vale o trecho
      // entre o quadro passado e este, não só onde ela está agora)
      const dA = trocou ? d : esp ? Lp - uAnt - o.u : du(V, uAnt, o.u)
      const xo = esp ? -o.x : o.x
      if (d < 1.8 && Math.max(d, dA) > -1.5 && dA - d < 12 && Math.abs(xo - j.x) < 1.7 && Math.abs(j.y + 1 - (yPista + o.y)) < 2.6 + (j.ar ? 2 : 0)) {
        j.pegos.add(i)
        j.st.orbs++
        ev.anel()
        // o COMBO: anel atrás de anel (menos de 2,5 s) sobe a nota e a onda
        j.combo = j.tempo - (j.comboT ?? -9) < 2.5 ? (j.combo ?? 0) + 1 : 1
        j.comboT = j.tempo
        j.psi = Math.min(0.8, (j.psi ?? 0) + (j.combo >= 8 ? 0.16 : j.combo >= 5 ? 0.06 : 0.02))
        // o anel: carrega o turbo, toca uma nota no tom da música e conta
        // pra viagem rápida (a cada 100, duas viagens)
        if (!("disco" in M)) j.carga = Math.min(1, j.carga + 0.12) // (disco: a água não dá turbo)
        gota(Math.min(14, (j.combo ?? 1) - 1))
        vib(8)
      }
    }
    }

    // turbo no chão
    for (const t of turbos) {
      if (t.via !== j.via) continue
      const d = du(V, j.u, t.u)
      if (d > -3 && d < 3 && Math.abs(t.x - j.x) < 2.2 && j.turboT < 1.2 && !j.ar) {
        j.turboT = 1.8
        j.flash = 0.35
        motor?.whoosh()
        vib([20, 20, 50])
      }
    }
    if (inp.turbo && temTurbo && j.carga >= 1 && j.turboT <= 0 && !inp.semHolo && !inp.semVoo) {
      j.turboT = 2.4
      j.carga = 0
      j.flash = 0.4
      motor?.whoosh()
      vib([20, 20, 60])
    }
    inp.turbo = false

    // ── caça do Núcleo ──
    {
      const k = caca
      k.espera = Math.max(0, k.espera - dt)
      // estrelas: apagam uma a cada 25 s sem bater (não durante a caça)
      if (!j.procurado && (j.batidas ?? 0) > 0) {
        j.batidaT = (j.batidaT ?? 0) + dt
        if (j.batidaT > 25) { j.batidaT = 0; j.batidas = (j.batidas ?? 1) - 1; ev.estrelas(j.batidas) }
      }
      const quer = (cacadoRef.current || !!j.procurado) && !cine && k.espera <= 0
      if (quer && !k.ativa) {
        // aparecem no retrovisor, 140m atrás
        k.ativa = true
        k.via = j.via
        k.perdidoT = 0
        k.longeT = 0
        k.t = 0
        k.carros.forEach((c, i) => { c.u = j.u - 140 - i * 22; c.x = j.x + [2.2, -2.2, 0][i % 3]; c.v = Math.max(20, j.v) })
        ev.caca("comecou")
      } else if (!quer && k.ativa) {
        // entregou (ou a 222 caiu): a caça acaba sem alarde
        k.ativa = false
        j.cacaGap = undefined
        ev.caca("fim")
      }
      if (k.ativa) {
        k.t += dt
        // (LU2CA 19/10) a polícia começa 5% mais lenta e volta ao normal em
        // ~30 s; e acompanha a velocidade da pista onde você está (no disco,
        // cada pista tem a sua): fugir é questão de embalo
        const forca = Math.min(1, 0.95 + 0.05 * (k.t / 30))
        const vCap = Math.max(VMAX, j.vBase ?? VMAX) * 1.06 * forca
        if (k.via !== j.via) {
          // trocou de rua: eles vêm atrás (06/10: fugir ficou mais difícil) —
          // reaparecem atrás na rua nova, um pouco mais longe
          k.perdidoT += dt
          if (k.perdidoT > 1.2) {
            k.via = j.via
            k.perdidoT = 0
            k.carros.forEach((c, i) => { c.u = j.u - 120 - i * 20; c.v = Math.max(25, j.v * 0.9) })
          }
        } else {
          const CV = M.vias[k.via]
          let gap = Infinity
          for (const c of k.carros) {
            const d = -du(CV, j.u, c.u) // >0 = atrás da Kombi
            // longe: vêm rápido (nunca menos que 28 m/s, parado eles chegam);
            // perto: colam e encostam devagar
            // teto ABAIXO da velocidade máxima da Kombi: no talo dá pra fugir
            // (06/10: mais rápidos que a Kombi no talo; só o turbo abre distância)
            let alvoV = d > 30 ? Math.min(vCap, Math.max(30, Math.abs(j.v) + 12) * forca) : Math.max(4, Math.min(vCap, j.v + (d > 6 ? 4 : -1)))
            // você parou no escuro longe deles: perderam de vista, procuram devagar
            if (respiroRef.current.pode) alvoV = Math.min(alvoV, 4)
            c.v += (alvoV - c.v) * Math.min(1, dt * 1.4)
            c.u += c.v * dt
            if (CV.fechada) c.u = ((c.u % CV.L) + CV.L) % CV.L
            c.x += (j.x - c.x) * Math.min(1, dt * (d < 25 ? 1.8 : 0.6))
            gap = Math.min(gap, d)
            if (d > -2 && d < 3.6 && Math.abs(c.x - j.x) < 2.3 && !j.ar) {
              k.ativa = false
              k.espera = 12
              j.procurado = false; j.batidas = 0; j.batidaT = 0; ev.estrelas(0)
              j.v = Math.min(j.v, 10); j.embalo = 0
              j.cacaGap = undefined
              ev.caca("pego")
              break
            }
          }
          if (k.ativa) {
            j.cacaGap = gap
            // respirar (Respirar.tsx): parado e com eles longe, o círculo abre
            respiroRef.current.pode = Math.abs(j.v) < 1.2 && (respiroRef.current.pode ? gap > 40 : gap > 120)
            if (respiroRef.current.feito) {
              respiroRef.current.feito = false
              respiroRef.current.pode = false
              k.ativa = false; k.espera = 40; j.cacaGap = undefined; j.procurado = false; j.batidas = 0; j.batidaT = 0; ev.estrelas(0); ev.caca("despistou")
            }
            // o helicóptero: a 2× da velocidade da pista ele entra. Enquanto ele
            // te enxerga, a distância não despista. Ele te perde se você passar
            // uns segundos embaixo de outra pista, ou volta pra base em 45 s
            const MDh = "disco" in M ? (M as MundoDisco) : null
            if (MDh && !k.heliOn && j.v >= 2 * (j.vBase ?? VMAX)) {
              k.heliOn = true; k.heliT = 0; k.cobertoT = 0
              k.heliPos.copy(carro.current!.position).add(tmp.p.set(0, 70, 0))
              ev.popup("HELICÓPTERO", "#ff3b4e"); vib([40, 30, 40, 30, 80])
            }
            // (LU2CA 20/10) o helicóptero só é despistado na velocidade: 3× a
            // da pista por 8 s seguidos. Aí a caça inteira acaba (a fuga grande)
            if (k.heliOn) {
              k.heliT += dt
              j.tresT = j.v >= 3 * (j.vBase ?? VMAX) ? (j.tresT ?? 0) + dt : 0
              if (j.tresT >= 8) {
                k.heliOn = false; j.tresT = 0; j.fugaGrande = true
                k.ativa = false; k.espera = 40; j.cacaGap = undefined; j.procurado = false; j.batidas = 0; j.batidaT = 0; ev.estrelas(0); ev.caca("despistou")
              }
            }
            k.longeT = gap > 350 && !k.heliOn ? k.longeT + dt : 0
            if (k.longeT > 6) { k.ativa = false; k.espera = 40; j.cacaGap = undefined; j.procurado = false; j.batidas = 0; j.batidaT = 0; ev.estrelas(0); ev.caca("despistou") }
          }
        }
      }
      if (!k.ativa) { respiroRef.current.pode = false; k.heliOn = false }
      k.heli.visible = k.heliOn; k.facho.visible = k.heliOn
      if (k.heliOn) {
        const cp = carro.current!.position
        tmp.f.set(0, 0, -1).applyQuaternion(carro.current!.quaternion) // a frente da Kombi
        tmp.p.set(cp.x - tmp.f.x * 18, cp.y + 34, cp.z - tmp.f.z * 18)
        k.heliPos.lerp(tmp.p, Math.min(1, dt * 1.6))
        k.heli.position.copy(k.heliPos)
        k.heli.lookAt(cp.x, k.heliPos.y - 6, cp.z)
        k.helice.rotation.y += dt * 38
        ;(k.sirene.material as THREE.MeshBasicMaterial).color.set(Math.floor(state.clock.elapsedTime * 5) % 2 ? "#ff3b4e" : "#4f7bff")
        // o facho: do helicóptero até a Kombi (um cone esticado)
        const dx = cp.x - k.heliPos.x, dy = cp.y - k.heliPos.y, dz = cp.z - k.heliPos.z
        const L = Math.hypot(dx, dy, dz)
        k.facho.position.copy(k.heliPos)
        k.facho.scale.set(1, L, 1)
        k.facho.quaternion.setFromUnitVectors(tmp.y0, tmp.f.set(-dx / L, -dy / L, -dz / L))
      }
      const n = k.ativa ? k.carros.length : 0
      k.corpo.count = n; k.barra.count = n; k.farol.count = n * 2
      if (n) {
        const CV = M.vias[k.via]
        const pisca = Math.floor(state.clock.elapsedTime * 6) % 2
        k.carros.forEach((c, i) => {
          const p = noMundo(CV, c.u, c.x, 0.7, a, tmp.p)
          tmp.d.position.copy(p); tmp.d.rotation.set(0, Math.atan2(a.tx, a.tz), 0); tmp.d.scale.set(1, 1, 1); tmp.d.updateMatrix()
          k.corpo.setMatrixAt(i, tmp.d.matrix)
          tmp.d.position.set(p.x, p.y + 0.75, p.z); tmp.d.updateMatrix()
          k.barra.setMatrixAt(i, tmp.d.matrix)
          k.barra.setColorAt(i, k.cor.set((i + pisca) % 2 ? "#ffffff" : "#7aa2ff"))
          for (const l of [-1, 1]) {
            tmp.d.position.set(p.x + a.tx * 2.2 + -a.tz * l * 0.62, p.y, p.z + a.tz * 2.2 + a.tx * l * 0.62)
            tmp.d.updateMatrix()
            k.farol.setMatrixAt(i * 2 + (l > 0 ? 1 : 0), tmp.d.matrix)
          }
        })
        k.corpo.instanceMatrix.needsUpdate = true
        k.barra.instanceMatrix.needsUpdate = true
        if (k.barra.instanceColor) k.barra.instanceColor.needsUpdate = true
        k.farol.instanceMatrix.needsUpdate = true
      }
    }

    // tráfego
    const tr = trafego
    const rede = "ligacoes" in M ? (M as MundoRede).ligacoes : null
    const car0 = carro.current!.position
    for (let i = 0; i < tr.carros.length; i++) {
      const c = tr.carros[i]
      let CV = M.vias[c.via]
      // no mapa novo: quem vem na outra mão da MESMA rua também conta (contramão)
      const par = V.rede?.par === c.via
      const aqui = (c.via === j.via || par) && !j.voo
      const uRel = (u: number) => (par ? CV.L - u : u)
      const antes = du(V, j.u, uRel(c.u))
      if (rede && CV.rede) {
        c.u += c.v * dt
        if (c.u >= CV.L) {
          // a esquina: sai por outra rua daquele cruzamento (de preferência reto)
          const sai = rede.saidas[CV.rede.para].filter((vi) => vi !== CV.rede!.par && M.vias[vi].rede!.tipo !== "terra")
          let prox = CV.rede.par, melhor = -Infinity
          for (const vi of sai) { const C2 = M.vias[vi], nota = CV.tx[CV.n - 1] * C2.tx[0] + CV.tz[CV.n - 1] * C2.tz[0] + Math.random() * 0.9; if (nota > melhor) { melhor = nota; prox = vi } }
          c.u -= CV.L; c.via = prox; CV = M.vias[prox]; c.u = Math.min(c.u, CV.L - 1)
        }
        // longe demais de você: renasce numa rua por perto (a cidade tem gente perto de você sempre)
        if ((i + Math.floor(j.tempo * 10)) % 40 === 0) {
          const k = Math.min(CV.n - 1, Math.floor(c.u / PASSO))
          if (Math.hypot(CV.px[k] - car0.x, CV.pz[k] - car0.z) > 650) {
            for (let t = 0; t < 30; t++) {
              const vi = Math.floor(Math.random() * M.vias.length), W2 = M.vias[vi]
              if (W2.tipo !== "rua" || W2.rede!.tipo === "terra") continue
              const u = Math.random() * W2.L, q = Math.min(W2.n - 1, Math.floor(u / PASSO)), dd = Math.hypot(W2.px[q] - car0.x, W2.pz[q] - car0.z)
              if (dd > 140 && dd < 520) { c.via = vi; c.u = u; CV = W2; c.caido = 0; c.y = 0; c.giro = 0; c.x = c.x0; break }
            }
          }
        }
      } else c.u = (c.u + c.v * dt) % CV.L
      const d = du(V, j.u, uRel(c.u))
      const cx = par ? -c.x : c.x
      c.bateu = Math.max(0, c.bateu - dt)
      // arremessado: voa pro lado girando, cai, fica um tempo fora e volta
      if (c.caido > 0) {
        c.caido -= dt
        c.x += c.vx * dt
        c.vx *= Math.exp(-dt * 1.6)
        c.vy -= ("disco" in M ? G_TERRA : 22) * dt
        c.y = Math.max(0, c.y + c.vy * dt)
        if (c.y === 0) { c.vy = Math.abs(c.vy) * 0.25; c.vgiro *= 0.6 }
        c.giro += c.vgiro * dt
        c.v *= Math.exp(-dt * 2)
        if (c.caido <= 0) { c.x = c.x0; c.y = 0; c.vy = 0; c.vx = 0; c.giro = 0; c.v = c.v0; c.u = rede ? Math.random() * CV.L : (c.u + CV.L * 0.5) % CV.L }
      }
      if (aqui && c.caido <= 0 && Math.abs(d) < 3.6 && Math.abs(cx - j.x) < 1.85 && !j.ar && c.bateu <= 0 && !j.hyper) {
        // a batida (06/10, LU2CA): o carro da cidade voa pro lado, a Kombi segue
        c.bateu = 1
        c.caido = 7
        const lado = Math.sign(cx - j.x) || (Math.random() < 0.5 ? -1 : 1)
        // de frente (contramão) a batida é mais forte
        const forca = Math.min(1.6, 0.5 + Math.abs(j.v + (par ? c.v : -c.v)) / 25)
        c.vx = lado * (9 + 8 * forca)
        c.vy = 3 + 4 * forca
        c.vgiro = (Math.random() < 0.5 ? -1 : 1) * (3 + 4 * forca)
        // (disco, o pinball) a Kombi também quica pro outro lado, sem frear muito
        if ("disco" in M) { j.vx = -lado * (4 + 4 * forca); j.v *= 0.94 } else j.v *= 0.82
        j.shake = 1.1
        j.flash = 0.3
        motor?.baque()
        vib([50, 30, 80])
        // a estrela: na 3ª, a polícia vem
        if (!j.procurado) {
          j.batidas = Math.min(3, (j.batidas ?? 0) + 1)
          j.batidaT = 0
          ev.estrelas(j.batidas)
          if (j.batidas >= 3) j.procurado = true
        }
      }
      if (aqui && antes > 0 && d <= 0) {
        if (!c.passou && c.bateu <= 0 && Math.abs(cx - j.x) < 3.3 && j.v > 30) {
          j.st.quase++
          j.carga = Math.min(1, j.carga + 0.3)
          motor?.whoosh()
          vib(25)
          ev.sinal(3, "quase · +3", "#ff3fb0")
          if (j.st.quase === 1 || Math.random() < 0.3) ev.falar(["Notti", "Mubarak", "Drewboy"][j.st.quase % 3], ["KKKK QUASE", "doido", "respira mano"][j.st.quase % 3])
        }
        c.passou = true
      }
      if (d > 50) c.passou = false
      const p = noMundo(CV, c.u, c.x, 0.02, a, tmp.p)
      p.y += c.y
      tmp.d.position.copy(p)
      tmp.d.rotation.set(0, Math.atan2(a.tx, a.tz) + c.giro, c.caido > 0 ? Math.sin(c.giro) * 0.3 : 0)
      // (20/10) longe da câmera (além do que a qualidade do aparelho desenha) o carro some
      const cp = state.camera.position, dc2 = (p.x - cp.x) ** 2 + (p.z - cp.z) ** 2
      const sc = dc2 > QUALIDADE.carros * QUALIDADE.carros ? 0 : 1
      tmp.d.scale.set(sc, sc, sc)
      tmp.d.updateMatrix()
      for (const m of tr.malhas[c.modelo]) m.setMatrixAt(c.slot, tmp.d.matrix)
    }
    for (const ms of tr.malhas) for (const m of ms) m.instanceMatrix.needsUpdate = true

    // ── pose da Kombi: deita junto com a curva inclinada ──
    amostra(V, j.u, a)
    const vivo = (livre && !!j.livreOk) || !!j.voo
    const plano = vivo && (j.livreFora || !!j.voo)
    const fx = vivo ? Math.sin(j.rumo!) : a.tx, fz = vivo ? Math.cos(j.rumo!) : a.tz
    // (disco, 20/10) no chão das dunas ela acompanha o terreno: a rampa na
    // frente e a inclinação de lado (duas amostras de 2 m)
    let inclF = 0, inclR = 0
    if ("disco" in M && j.voo && !j.ar && j.wx !== undefined) {
      const MD2 = M as MundoDisco, h0 = MD2.chaoEm(j.wx, j.wz!)
      inclF = (MD2.chaoEm(j.wx + fx * 2, j.wz! + fz * 2) - h0) / 2
      inclR = (MD2.chaoEm(j.wx - fz * 2, j.wz! + fx * 2) - h0) / 2
    }
    const cb = plano ? 1 : Math.cos(a.bank)
    const sb = plano ? -inclR : Math.sin(a.bank)
    tmp.f.set(fx, j.ar ? Math.max(-0.2, Math.min(0.35, j.vy / Math.max(j.v, 1))) : plano ? inclF : a.ty, fz).normalize()
    tmp.r.set(-fz * cb, -sb, fx * cb).normalize()
    tmp.up.crossVectors(tmp.r, tmp.f).normalize()
    tmp.r.crossVectors(tmp.f, tmp.up).normalize()
    // base: x = direita, y = cima, z = trás (a Kombi aponta pra -Z)
    tmp.m.makeBasis(tmp.r, tmp.up, tmp.f.clone().negate())
    const car = carro.current!
    car.quaternion.setFromRotationMatrix(tmp.m)
    const yaw = (j.giroAr ?? 0) + (vivo ? -j.deriva - j.steer * 0.11 * Math.min(1, Math.abs(j.v) / 25) * Math.sign(j.v || 1) : -Math.atan2(j.vx, Math.max(Math.abs(j.v), 4)) * Math.sign(j.v || 1) - a.curv * j.v * Math.abs(j.v) * 0.0025 - j.deriva)
    tmp.qYaw.setFromAxisAngle(tmp.y0, yaw)
    tmp.qRoll.setFromAxisAngle(tmp.z0, j.steer * 0.05 * Math.min(1, pct))
    tmp.qFlip.setFromAxisAngle(tmp.x0, j.flipAr ?? 0)
    car.quaternion.multiply(tmp.qYaw).multiply(tmp.qFlip).multiply(tmp.qRoll)
    if (vivo) car.position.set(j.wx!, j.y + 0.02, j.wz!)
    else car.position.set(a.x - a.tz * j.x * cb, j.y + 0.02, a.z + a.tx * j.x * cb)
    {
      const cb2 = combRef.current
      if (cb2.patins && !cb2.parada) cb2.parada = { pos: car.position.clone(), quat: car.quaternion.clone(), via: j.via, u: j.u, x: j.x }
      ;(cb2.aqui ??= new THREE.Vector3()).copy(car.position)
      if (corpoK.current) corpoK.current.visible = !cb2.patins
      if (cabineG.current && cb2.patins) cabineG.current.visible = false
      if (patinador.current) patinador.current.visible = !!cb2.patins
      if (kombiParada.current) {
        kombiParada.current.visible = !!(cb2.patins && cb2.parada)
        if (cb2.parada) { kombiParada.current.position.copy(cb2.parada.pos); kombiParada.current.quaternion.copy(cb2.parada.quat) }
      }
    }
    return { cine, pct }
  }

  useFrame((state, dtRaw) => {
    const rl = relogio.current
    // o tempo do QUADRO (o instante em que ele vai pra tela, no ritmo do
    // monitor), não a hora em que o código rodou: depois de um quadro lento o
    // próximo começa atrasado, e o relógio do three contava esse atraso como
    // movimento (o tranco). document.timeline.currentTime = o carimbo do quadro
    const tq = typeof document !== "undefined" ? (document.timeline?.currentTime as number | null) : null
    const dtQ = tq != null && rl.tq != null && tq > rl.tq ? (tq - rl.tq) / 1000 : dtRaw
    rl.tq = tq
    const dt = Math.min(0.1, dtQ)
    const j = jogo.current
    const inp = input.current
    const ev = evs.current
    if (!ev) return
    const car = carro.current!
    const H = 1 / 120
    // no máximo 8 passos por quadro (a aba voltando do fundo não acelera o mundo)
    rl.acc = rl.ok ? Math.min(rl.acc + dt, 8 * H) : H // (o 1º quadro sempre dá um passo: a pose nasce)
    while (rl.acc >= H) {
      rl.p0.copy(rl.p1); rl.q0.copy(rl.q1)
      // a física lê a pose de verdade (o voo nasce dela), não a desenhada
      if (rl.ok) { car.position.copy(rl.p1); car.quaternion.copy(rl.q1) }
      const r = passo(state, H)
      rl.cine = r.cine; rl.pct = r.pct
      rl.p1.copy(car.position); rl.q1.copy(car.quaternion)
      rl.f.copy(tmp.f); rl.r.copy(tmp.r); rl.up.copy(tmp.up)
      // teleporte (ou o 1º passo): não desenha o caminho entre o antes e o depois
      if (!rl.ok || j.encaixar || rl.p0.distanceToSquared(rl.p1) > 25 * 25) { rl.p0.copy(rl.p1); rl.q0.copy(rl.q1); rl.ok = true }
      rl.acc -= H
    }
    // a pose desenhada: entre os dois últimos passos
    const alfa = rl.acc / H
    car.position.lerpVectors(rl.p0, rl.p1, alfa)
    car.quaternion.slerpQuaternions(rl.q0, rl.q1, alfa)
    tmp.f.copy(rl.f); tmp.r.copy(rl.r); tmp.up.copy(rl.up)
    const cine = rl.cine, pct = rl.pct
    const V = M.vias[j.via]
    amostra(V, j.u, a)
    const grave = faixasDisco.length ? pistaSom.grave() : player.grave()

    // as rodas derrapando (de patins, os dois pés): a marca contínua no chão e a fumaça
    const patM = !!combRef.current.patins
    if (j.drift && Math.abs(j.deriva) > 0.15 && !j.ar) {
      car.updateMatrixWorld()
      const forca = Math.min(1, Math.abs(j.deriva) / 0.6)
      const rodas = patM ? PES : RODAS
      const rp = rastroPneu
      if (rp.pat !== patM) { rp.ativo = false; rp.pat = patM }
      tmp.qMarca.copy(car.quaternion).invert() // pra levar o caminho da roda pro espaço da Kombi
      rodas.forEach((r, k) => {
        tmp.roda.copy(r).applyMatrix4(car.matrixWorld)
        const ult = rp.ult[k]
        const d = rp.ativo ? tmp.roda.distanceTo(ult) : 0
        // começou agora (ou teleportou): só guarda o ponto
        if (!rp.ativo || d > 4) { ult.copy(tmp.roda); return }
        if (d < 0.06) return
        // o pedaço vai do último ponto até aqui, deitado no plano da Kombi (pega a
        // inclinação da pista) e virado pro caminho da roda
        tmp.p.subVectors(tmp.roda, ult).applyQuaternion(tmp.qMarca)
        tmp.d.position.addVectors(tmp.roda, ult).multiplyScalar(0.5)
        tmp.d.quaternion.copy(car.quaternion).multiply(tmp.qDeriva.setFromAxisAngle(tmp.y0, Math.atan2(-tmp.p.x, -tmp.p.z))).multiply(tmp.qDeitar)
        tmp.d.scale.set(patM ? 0.38 : 1, (d + 0.1) / 0.95, 1)
        tmp.d.updateMatrix()
        marcas.m.setMatrixAt(marcas.prox++ % marcas.n, tmp.d.matrix)
        ult.copy(tmp.roda)
        if (FUMACA && !patM && Math.random() < 0.45 * forca) {
          const i = fumaca.prox++ % fumaca.n
          fumaca.pos.set([tmp.roda.x, tmp.roda.y + 0.25, tmp.roda.z], i * 3)
          fumaca.vel.set([(Math.random() - 0.5) * 2, 0.8 + Math.random() * 1.4, (Math.random() - 0.5) * 2], i * 3)
          fumaca.vida[i] = 0.6 + Math.random() * 0.5
        }
      })
      rp.ativo = true
      tmp.d.scale.set(1, 1, 1)
      marcas.m.instanceMatrix.needsUpdate = true
    } else rastroPneu.ativo = false
    for (let i = 0; i < fumaca.n; i++) {
      if (fumaca.vida[i] <= 0) { fumaca.pos[i * 3 + 1] = -999; continue }
      fumaca.vida[i] -= dt
      fumaca.pos[i * 3] += fumaca.vel[i * 3] * dt
      fumaca.pos[i * 3 + 1] += fumaca.vel[i * 3 + 1] * dt
      fumaca.pos[i * 3 + 2] += fumaca.vel[i * 3 + 2] * dt
    }
    fumaca.g.attributes.position.needsUpdate = true

    // o lugar da missão: avisa quando tá chegando, e PASSAR NA FRENTE dele
    // (em qualquer faixa, em qualquer velocidade) abre a cena — a Kombi
    // freia sozinha no modo cinema (page.tsx → cena.tsx)
    {
      const vg = vagaRef.current
      if (vg && !cine && !celularRef.current && j.via === vg.via) {
        const d = du(M.vias[j.via], j.u, vg.u)
        if (j.vagaAvisou !== vg.id && d > 0 && d < 260) {
          j.vagaAvisou = vg.id
          ev.falar(vg.quem || "222 FM", `${vg.nome} tá chegando, ${vg.lado > 0 ? "na direita" : "na esquerda"}. é só passar na frente`)
        }
        const naVaga = Math.abs(d) < VAGA / 2 + 10
        if (naVaga && j.naVaga !== vg.id) { j.naVaga = vg.id; ev.vaga(vg.id) }
        if (Math.abs(d) > VAGA) j.naVaga = false
      }
      // o posto: passou devagar em frente, abre a bomba
      const cb = combRef.current
      if (!cine && j.via === cb.via) {
        const dp = du(M.vias[j.via], j.u, cb.u)
        if (!cb.avisou && Math.abs(dp) < 16 && Math.abs(j.v) < 9) { cb.avisou = true; cb.onPosto() }
        if (Math.abs(dp) > 60) cb.avisou = false
      }
      // o lugar secreto (o beco): cada vez que você passa por ele conta uma
      // volta. Ninguém avisa; depois das voltas que o seu tom pede, a 222
      // sussurra e a vaga dele passa a valer
      const sg = segredoRef.current
      if (sg && !cine && j.via === sg.via) {
        const d = du(M.vias[j.via], j.u, sg.u)
        if (j.segAnt !== undefined && j.segAnt > 0 && d <= 0 && d > -40) {
          j.segPassou = (j.segPassou ?? 0) + 1
          if (j.segPassou >= sg.voltas && revelado !== sg.id) setRevelado(sg.id)
        }
        j.segAnt = d
        if (revelado === sg.id) {
          if (j.vagaAvisou !== sg.id && d > 0 && d < 200) {
            j.vagaAvisou = sg.id
            ev.falar("222 FM", "…tem um beco aí na esquerda, entre os letreiros. ninguém olha pra ele. passa na frente")
          }
          const naVaga = Math.abs(d) < VAGA / 2 + 10
          if (naVaga && !j.naSeg) { j.naSeg = true; ev.vaga(sg.id) }
          if (Math.abs(d) > VAGA) j.naSeg = false
        }
      }
    }

    // a abertura: parou, desce; segura e anda até a porta
    {
      const ab = aberturaRef.current
      if (ab.ativa && ab.fase === "parou" && j.tempo - ab.t0 > 0.9) {
        ab.de = car.position.clone().addScaledVector(tmp.r, 2.4)
        ab.de.y = ab.porta.y
        ab.fase = "ape"
      }
      if (ab.ativa && ab.fase === "ape" && ab.de && (inp.gas || toqueTela)) {
        ab.pe = Math.min(1, ab.pe + (1.7 / Math.max(1, ab.de.distanceTo(ab.porta))) * dt)
        // chegou na porta: bate (um respiro) e entra
        if (ab.pe >= 1) { ab.fase = "porta"; setTimeout(() => ab.onPorta(), 700) }
      }
    }
    // (disco) a pista é o toca-discos: entrou numa pista, a faixa dela; em
    // contato toca, parou ou saiu do chão, freia (scratch)
    // (LU2CA 19/10) cada pista toca a faixa dela em loop, venha de qual torre
    // vier e em qualquer velocidade; nas torres continua a que estava; entrou na
    // pista de outra faixa, a faixa muda junto (fade curto)
    // (a história, casa e dunas) no deserto ninguém tem pista: o disco antigo
    // da Kombi (a página liga) e o vento; a faixa da pista para
    const semPista = faseHistoria === "casa" || faseHistoria === "dunas"
    if (faixasDisco.length && semPista) { if (pistaSom.src) pistaSom.parar(); pistaTocando.current = -1 }
    else if (faixasDisco.length && soTemaRef.current) {
      // (LU2CA 21/10 (3)) A MÚSICA É O TEMA DA MISSÃO. Sem missão: nenhuma
      // faixa de pista, só os discos. Com missão: o instrumental (a base das
      // ruas) até ele achar a linha dela; entrou na linha, a música começa e
      // toca UMA vez (venha de onde vier depois); acabou, volta o instrumental
      const tm = temaRef.current
      const fx = tm.k >= 0 ? faixasDisco[tm.k] : null
      if (!fx) { if (pistaSom.src) pistaSom.parar(); pistaTocando.current = -1; tm.chave = "" }
      else {
        const inf = (M as MundoDisco).info[j.via]
        const naLinha = !!inf && inf.pista === tm.k && !viaApagada?.[j.via]
        if (tm.voz === "antes" && naLinha) tm.voz = "tocando"
        if (tm.voz === "tocando" && pistaSom.acabou) tm.voz = "tocou"
        const voz = tm.voz === "tocando"
        const chave = `${tm.k}:${voz ? "voz" : "base"}`
        if (chave !== tm.chave) {
          tm.chave = chave
          pistaTocando.current = tm.k
          pistaEscura.current = !voz
          if (fonteRef.current !== "radio") player.pausar()
          discoPainel.parar()
          pistaSom.entrar(voz ? faixaDaPista(fx) : fx.inst, 2, !voz)
          definirTom(fx.tom)
        }
        pistaSom.estado(!j.ar && !j.voo && !combRef.current.patins && !pausado, Math.abs(j.v), dt, fonteRef.current === "radio", !voz)
      }
    }
    else if (faixasDisco.length) {
      const inf = (M as MundoDisco).info[j.via]
      const naPista = !!inf && inf.pista >= 0
      const k = naPista ? inf.pista : pistaTocando.current
      // (os atos, 20/10) pista apagada: o instrumental, abafado
      const escura = naPista ? !!viaApagada?.[j.via] : pistaEscura.current
      if ((k !== pistaTocando.current || escura !== pistaEscura.current) && k >= 0) {
        pistaTocando.current = k
        pistaEscura.current = escura
        const fx = faixasDisco[k]
        if (fx) {
          if (fonteRef.current !== "radio") player.pausar()
          discoPainel.parar()
          pistaSom.entrar(escura ? fx.inst : faixaDaPista(fx), 2)
          definirTom(fx.tom)
        }
      }
      pistaSom.estado(!j.ar && !j.voo && !combRef.current.patins && !pausado, Math.abs(j.v), dt, fonteRef.current === "radio", pistaEscura.current)
    }
    // ── câmera: amortecida, abre com a velocidade, inclina com a curva ──
    const dePatins = !!combRef.current.patins
    const cd = camDin.current
    // (17/10, LU2CA: "a câmera tá muito insana de ruim, toda descontrolada")
    // no mapa novo, de fora: a câmera CALMA. Um atraso só (o rumo), a altura
    // suavizada (não pula com cada morro), sem balanço lateral, sem inclinação,
    // sem órbita parada, prédio no caminho resolvido devagar, tremida pequena
    const calma = "ligacoes" in M && !cine && !dentroRef.current
    {
      // o rumo da câmera: entre pra onde a Kombi anda e pra onde ela aponta (no
      // drift aponta mais pro lado), com atraso — a lateral aparece na curva
      cd.carF.set(0, 0, -1).applyQuaternion(car.quaternion).setY(0).normalize()
      // (17/10, LU2CA: "cuidado com a anulação da câmera e da dinâmica de
      // direção") a câmera segue pra onde a Kombi ANDA, quase nada pra onde
      // ela aponta: se girasse junto com o nariz, a virada e o drift sumiam
      // da tela. Assim o nariz entra na curva e a traseira escorrega na sua frente
      const livreCam = "ligacoes" in M && !!j.livreOk
      const alvoF = tmp.p.copy(tmp.f).setY(0).normalize().lerp(cd.carF, livreCam ? 0.04 : j.drift ? 0.3 : 0.12).normalize()
      if (!cd.ok || j.encaixar) { cd.f.copy(alvoF); cd.ok = true }
      cd.f.lerp(alvoF, 1 - Math.exp(-dt * (livreCam ? (j.drift ? 1.3 : 2) : j.drift ? 1.6 : 2.6))).normalize()
      // a aceleração empurra a câmera pra trás; a freada traz pra perto
      const acc = dt > 0 ? (j.v - cd.vAnt) / dt : 0
      cd.vAnt = j.v
      cd.puxa += (Math.max(-1.6, Math.min(2.4, acc * 0.09)) * (calma ? 0.35 : 1) - cd.puxa) * Math.min(1, dt * (calma ? 1.5 : 3))
      // parada: depois de uns segundos, a volta lenta de cinema
      cd.parada = Math.abs(j.v) < 0.6 ? cd.parada + dt : 0
      const alvoOrb = cd.parada > 3 && !calma ? (cd.parada - 3) * 0.13 : 0
      cd.orbita += (alvoOrb - cd.orbita) * Math.min(1, dt * (cd.parada > 3 ? 4 : 1.5))
      // o olhar livre (arrastar com o mouse) gira em volta; solta, volta sozinha
      const o = olhar.current
      if (!dentroRef.current) {
        if (!o.arrastando && o.soltou && performance.now() - o.soltou > 1600) { o.alvoYaw = 0; o.alvoPitch = 0 }
        o.yaw += (o.alvoYaw - o.yaw) * Math.min(1, dt * (o.arrastando ? 12 : 2.5))
        o.pitch += (o.alvoPitch - o.pitch) * Math.min(1, dt * (o.arrastando ? 12 : 2.5))
      }
      const vel = Math.max(0, Math.min(1.3, Math.abs(j.v) / VMAX))
      if (calma) {
        // (17/10, LU2CA: "uma câmera que acompanha o carro e o personagem como
        // nos jogos atuais") a câmera de perseguição do Horizon: um braço preso
        // atrás da Kombi, tudo em mola amortecida (sem tranco nem chicote). O
        // olhar é preso à Kombi, então ela fica no mesmo lugar da tela em
        // qualquer velocidade; só o rumo atrasa um pouco, e a curva aparece
        const cz = cd.cz
        const wNariz = livreCam ? (j.drift ? 0.15 : 0.06) : 0.12
        const yawAlvo = Math.atan2(tmp.f.x * (1 - wNariz) + cd.carF.x * wNariz, tmp.f.z * (1 - wNariz) + cd.carF.z * wNariz)
        const atrasD = dePatins ? 6.4 + vel * 1.4 : 8 + vel * 1.6 + cd.puxa
        const altoD = dePatins ? 2.5 - o.pitch * 2 : 2.9 - vel * 0.25 - o.pitch * 2.5
        if (!cz.ok || j.encaixar || !camInit.current) {
          cz.yaw = yawAlvo; cz.dist = atrasD; cz.alt = altoD; cz.y = car.position.y
          cz.vYaw = cz.vDist = cz.vAlt = cz.vY = 0; cz.ok = true; cz.t = 1
        }
        // o rumo: mais solto no drift (a Kombi atravessa na tela), firme no resto
        cz.yaw = amortece(cz.yaw, cz.yaw + angDif(yawAlvo, cz.yaw), cz, "vYaw", j.drift ? 0.32 : 0.2, dt)
        // e nunca atrasa demais: num giro forte (drift, freada virando) a Kombi
        // sairia da tela. O limite depende da largura (no celular em pé cabe menos)
        const aspecto = (camera as THREE.PerspectiveCamera).aspect || 1
        const lagMax = (j.drift ? 0.16 : 0.1) + 0.12 * Math.min(1.8, aspecto)
        const lag = angDif(yawAlvo, cz.yaw)
        if (Math.abs(lag) > lagMax) cz.yaw = yawAlvo - Math.sign(lag) * lagMax
        cz.dist = amortece(cz.dist, atrasD, cz, "vDist", 0.45, dt)
        cz.alt = amortece(cz.alt, altoD, cz, "vAlt", 0.3, dt)
        // a altura: segue morro e rua rápido; no pulo, fica pra trás (a Kombi sobe na tela)
        cz.y = amortece(cz.y, car.position.y, cz, "vY", j.ar ? 0.38 : 0.1, dt)
        cd.yS = cz.y
        cd.f.set(Math.sin(cz.yaw), 0, Math.cos(cz.yaw))
        cd.dir.copy(cd.f).applyAxisAngle(tmp.y0, o.yaw)
        cd.lado = 0; cd.roll = 0
        tmp.alvo.copy(car.position).setY(cz.y).addScaledVector(cd.dir, -cz.dist).addScaledVector(tmp.y0, cz.alt)
        // prédio no caminho: entra NA HORA (nunca atravessa parede) e volta devagar
        const dx = tmp.alvo.x - car.position.x, dz = tmp.alvo.z - car.position.z, L = Math.hypot(dx, dz)
        let fAlvo = 1
        for (let s2 = 2; s2 < L; s2 += 0.75) if (bater(car.position.x + (dx * s2) / L, car.position.z + (dz * s2) / L, 0.6, cz.y + 1.3 + (tmp.alvo.y - cz.y - 1.3) * (s2 / L))) { fAlvo = Math.min(1, Math.max(4, s2 - 1) / L); break }
        cd.enc = fAlvo < cd.enc ? fAlvo : cd.enc + (fAlvo - cd.enc) * Math.min(1, dt * 1.5)
        // desliza pelo próprio braço (do teto da Kombi até a câmera): o ângulo
        // fica o mesmo e ela continua no mesmo lugar da tela, só que maior
        tmp.q2.copy(car.position).setY(cz.y + 1.3)
        tmp.alvo.sub(tmp.q2).multiplyScalar(cd.enc).add(tmp.q2)
        // pra onde olha: à frente da Kombi, preso nela (sem atraso no mundo)
        tmp.olhar.copy(car.position).setY(cz.y).addScaledVector(cd.dir, dePatins ? 6 + vel * 3 : 7 + vel * 5).addScaledVector(tmp.y0, (dePatins ? 1.2 : 1.3) + o.pitch * 3)
        // voltando de uma cena, da entrada de um lugar, da montanha-russa ou
        // trocando Kombi ↔ patins: desliza do enquadramento antigo (não corta)
        if (!cz.ant || cz.patins !== dePatins) {
          if (camInit.current && cz.ok) { cz.t = 0; cz.de.subVectors(camera.position, car.position); cz.deOlhar.subVectors(tmp.camOlhar, car.position) }
          cz.patins = dePatins
        }
        if (cz.t < 1) {
          cz.t = Math.min(1, cz.t + dt / 0.9)
          const e = cz.t * cz.t * (3 - 2 * cz.t)
          tmp.alvo.sub(car.position).lerpVectors(cz.de, tmp.alvo, e).add(car.position)
          tmp.olhar.sub(car.position).lerpVectors(cz.deOlhar, tmp.olhar, e).add(car.position)
        }
      } else {
      // (REA Horizon: a câmera deles fica a 3 m) a nossa no meio-termo: mais
      // perto que antes (~10 m), sem colar (o LU2CA: "não deixar perto demais")
      // (17/10, sem o atraso que afastava a câmera na velocidade: a distância
      // agora é a de verdade. Na tela em pé do celular, a 8 m a Kombi tomava
      // meia tela — "não deixar perto demais")
      const atras = dePatins ? 5 + vel * 1.6 : calma ? 8.2 + vel * 2.4 + cd.puxa : 7.6 + vel * 3 + cd.puxa + (cd.parada > 3 ? 1.8 : 0)
      const alto = dePatins ? 2.2 : calma ? 3.0 - vel * 0.3 - o.pitch * 2.5 : 3.1 - vel * 0.45 + (cd.parada > 3 ? 0.7 : 0) - o.pitch * 2.5
      // a altura de referência: a da Kombi, suavizada (lombada e morro não sacodem)
      if (!cd.ySok || j.encaixar) { cd.yS = car.position.y; cd.ySok = true }
      cd.yS += (car.position.y - cd.yS) * Math.min(1, dt * (calma ? 4 : 30))
      cd.dir.copy(cd.f).applyAxisAngle(tmp.y0, cd.orbita + (dentroRef.current ? 0 : o.yaw))
      // a lateral: a câmera abre um pouco pro lado de fora da curva
      // (na direção livre, só o volante conta: a curvatura da rua sob a Kombi
      // não é a curva que ela está fazendo, e balançava a câmera à toa)
      cd.lado += ((livreCam ? j.steer * 1.1 * Math.min(1, vel * 1.5) : -a.curv * Math.abs(j.v) * 2.2 + j.steer * 0.6) - cd.lado) * Math.min(1, dt * 2)
      cd.lado = calma ? 0 : Math.max(-2.5, Math.min(2.5, cd.lado))
      tmp.alvo.copy(car.position)
      if (calma) tmp.alvo.y = cd.yS
      tmp.alvo.addScaledVector(cd.dir, -atras).addScaledVector(tmp.y0, alto).addScaledVector(tmp.r, cd.lado * 0.5)
      // (direção livre) a câmera não atravessa prédio: chega mais perto da Kombi
      if ("ligacoes" in M) {
        const dx = tmp.alvo.x - car.position.x, dz = tmp.alvo.z - car.position.z, L = Math.hypot(dx, dz)
        let fAlvo = 1
        for (let s2 = 2; s2 < L; s2 += 1) if (bater(car.position.x + (dx * s2) / L, car.position.z + (dz * s2) / L, 0.6)) { fAlvo = Math.min(1, Math.max(4, s2 - 1) / L); break }
        // chega perto e sobe DEVAGAR (e volta mais devagar ainda): antes era aos trancos
        cd.enc += (fAlvo - cd.enc) * Math.min(1, dt * (fAlvo < cd.enc ? 5 : 1.2))
        const f = cd.enc
        tmp.alvo.x = car.position.x + dx * f; tmp.alvo.z = car.position.z + dz * f; tmp.alvo.y += (1 - f) * 3.5
      }
      // a inclinação: deita de leve com a curva e com o drift
      cd.roll += ((calma ? 0 : -j.steer * 0.03 * vel - j.deriva * 0.05) - cd.roll) * Math.min(1, dt * 3)
      }
    }
    if (cine) {
      // câmera de cinema: baixa, de lado, girando devagar em volta da Kombi
      const ang = j.tempo * 0.11 + 0.5
      const raio = 9.5 - Math.min(1, j.v / VCINEMA) * 1.5
      tmp.alvo.copy(car.position).addScaledVector(tmp.f, -Math.cos(ang) * raio).addScaledVector(tmp.r, Math.sin(ang) * raio * 0.75).addScaledVector(tmp.up, 1.6 + Math.sin(j.tempo * 0.07) * 0.5)
    }
    // a cena de um lugar: a câmera corta pro outro lado da rua, olhando a porta
    const cl = cine === "lugar" ? camLugarRef.current : null
    if (cl) { tmp.alvo.copy(cl.cam); tmp.alvo.y += Math.sin(j.tempo * 0.35) * 0.12 }
    const primeira = dentroRef.current && !cine
    if (primeira) { car.updateMatrixWorld(); tmp.alvo.copy(OLHO).applyMatrix4(car.matrixWorld) }
    if (j.encaixar) { camInit.current = false; j.encaixar = false }
    const k = primeira || cl ? 1 : camInit.current ? 1 - Math.exp(-dt * (cine ? 1.6 : j.ar ? 3 : 5.5)) : 1
    // (17/10) de fora, o atraso fica no DESLOCAMENTO em relação à Kombi, não
    // na posição do mundo: perseguir um ponto com atraso fixo deixava a câmera
    // a 15–27 m a 250 km/h e colada parada. Assim a distância é a mesma em
    // qualquer velocidade e só as curvas e os balanços demoram a chegar
    const cdx = camDin.current
    if (calma) { cdx.offOk = false; camera.position.copy(tmp.alvo) }
    else if (!primeira && !cl && !cine) {
      tmp.p.copy(tmp.alvo).sub(car.position)
      if (!camInit.current || !cdx.offOk) { cdx.off.copy(tmp.p); cdx.offOk = true }
      cdx.off.lerp(tmp.p, 1 - Math.exp(-dt * (j.ar ? 3 : 4.5)))
      camera.position.copy(car.position).add(cdx.off)
    } else { cdx.offOk = false; camera.position.lerp(tmp.alvo, k) }
    tmp.olhar.copy(car.position).addScaledVector(tmp.f, cine ? 2.5 : 7).addScaledVector(tmp.up, cine ? 1.4 : 1.2)
    if (!cine && !dentroRef.current) {
      // de fora: olha à frente da Kombi (mais longe quanto mais rápido) e pra dentro da curva
      const vel = Math.min(1.3, Math.abs(j.v) / VMAX)
      if (!calma) tmp.olhar.copy(car.position).addScaledVector(camDin.current.dir, 5 + vel * 7).addScaledVector(tmp.y0, 1.1 + olhar.current.pitch * 3).addScaledVector(tmp.r, Math.max(-4, Math.min(4, a.curv * Math.abs(j.v) * 3)))
    }
    if (cl) tmp.olhar.copy(cl.porta)
    // de dentro: olha pela estrada à frente, virando um pouco pro lado da curva
    if (primeira) {
      const o = olhar.current
      if (!o.arrastando && o.soltou && performance.now() - o.soltou > 7000) { o.alvoYaw = 0; o.alvoPitch = 0 }
      const r = o.arrastando ? 14 : o.alvoYaw === 0 && o.alvoPitch === 0 ? 1.5 : 14
      o.yaw += (o.alvoYaw - o.yaw) * Math.min(1, dt * r)
      o.pitch += (o.alvoPitch - o.pitch) * Math.min(1, dt * r)
      const cp = Math.cos(o.pitch)
      tmp.olhar.copy(tmp.p.set(OLHO.x - Math.sin(o.yaw) * cp * 10, OLHO.y - 0.9 + Math.sin(o.pitch) * 10, OLHO.z - Math.cos(o.yaw) * cp * 10)).applyMatrix4(car.matrixWorld)
    }
    tmp.camOlhar.lerp(tmp.olhar, cl || primeira || calma ? 1 : camInit.current ? 1 - Math.exp(-dt * 9) : 1)
    tmp.upMix.copy(tmp.up).lerp(tmp.y0, calma ? 1 : 0.45).normalize()
    tmp.camUp.lerp(tmp.upMix, camInit.current ? 1 - Math.exp(-dt * 4) : 1).normalize()
    camera.up.copy(tmp.camUp)
    camInit.current = true
    const amp = reduz ? 0 : (j.shake * 0.12 + (j.turboT > 0 ? 0.03 : 0)) * (primeira ? 0.25 : calma ? 0.3 : 1)
    // tremida suave (ondas, não sorteio a cada quadro: aquilo virava chuvisco)
    camera.position.x += (Math.sin(j.tempo * 31) + Math.sin(j.tempo * 53.7) * 0.6) * amp * 0.32
    camera.position.y += (Math.sin(j.tempo * 37.3 + 1.7) + Math.sin(j.tempo * 61.1) * 0.6) * amp * 0.32
    camera.lookAt(tmp.camOlhar)
    if (!cine && !primeira && !reduz) {
      camera.rotateZ(camDin.current.roll)
      // acima de ~150 km/h: um tremor sutil (como a câmera no carro do GTA)
      const vel = Math.abs(j.v) / VMAX
      if (vel > 0.75 && !calma) { const t = j.tempo, k2 = (vel - 0.75) * 0.012; camera.rotateX(Math.sin(t * 37) * k2 + Math.sin(t * 23) * k2 * 0.6); camera.rotateY(Math.sin(t * 29) * k2 * 0.8) }
    }
    let apeCam = false
    {
      // a pé: a câmera atrás de quem anda, a porta na frente
      const ab = aberturaRef.current
      if (ab.ativa && ab.de && (ab.fase === "ape" || ab.fase === "porta")) {
        apeCam = true
        const p = tmp.p.lerpVectors(ab.de, ab.porta, ab.pe)
        const dirP = tmp.q2.subVectors(ab.porta, ab.de).setY(0).normalize()
        // de longe, do lado da estrada: a Kombi, a casa e quem anda entre
        // as duas no mesmo quadro (LU2CA, 06/10)
        tmp.alvo.copy(ab.de).addScaledVector(dirP, -12).setY(ab.de.y + 5.5)
        tmp.alvo.x += dirP.z * 4
        tmp.alvo.z -= dirP.x * 4
        camera.position.lerp(tmp.alvo, 1 - Math.exp(-dt * 2.5))
        tmp.olhar.lerpVectors(ab.de, ab.porta, 0.5).lerp(p, 0.35)
        tmp.olhar.y = p.y + 1.4
        camera.up.set(0, 1, 0)
        camera.lookAt(tmp.olhar)
      }
    }
    // a montanha-russa: a câmera vai pra trás do carrinho (terceira pessoa)
    // (posição, olhar e "cima" próprios, contínuos: a da Kombi recomeça a cada quadro)
    const pq = passeio.current
    if (pq.andando) {
      const mr = camMontanha.current ?? (camMontanha.current = { pos: camera.position.clone(), olhar: tmp.camOlhar.clone(), up: camera.up.clone() })
      mr.pos.lerp(pq.cam, 1 - Math.exp(-dt * 6))
      mr.olhar.lerp(pq.olhar, 1 - Math.exp(-dt * 10))
      mr.up.lerp(pq.up, 1 - Math.exp(-dt * 5)).normalize()
      camera.position.copy(mr.pos)
      camera.up.copy(mr.up)
      camera.lookAt(mr.olhar)
      tmp.camOlhar.copy(mr.olhar); tmp.camUp.copy(mr.up)
    } else camMontanha.current = null
    // entrando num lugar que é página: a câmera corta pro outro lado da rua
    const ce = camEntrada.current
    // a câmera calma sabe se foi ela quem enquadrou (pra voltar deslizando)
    camDin.current.cz.ant = calma && !ce && !pq.andando && !apeCam
    if (ce) {
      camera.position.lerp(ce.cam, 1 - Math.exp(-dt * 2.2))
      camera.up.set(0, 1, 0)
      camera.lookAt(ce.olhar)
    }
    // (LU2CA 20/10, B15: "o chão ainda é vazado") nas dunas a câmera ia pra baixo
    // da areia nas encostas (atrás da Kombi, morro acima) e via o chão por baixo,
    // vazado: ela nunca desce do chão
    if ("disco" in M && !ce) {
      const chC = (M as MundoDisco).chaoEm(camera.position.x, camera.position.z) + 1.8
      if (camera.position.y < chC) { camera.position.y = chC; camera.lookAt(car.position.x, car.position.y + 1.2, car.position.z) }
    }
    // teste (fora da produção): window.__vista = [x, y, z, olharX, olharY, olharZ]
    // segura a câmera num ponto (vista aérea pra conferir o mapa)
    if (process.env.NODE_ENV !== "production") {
      const vw = (window as unknown as { __vista?: number[] }).__vista
      if (vw) { camera.position.set(vw[0], vw[1], vw[2]); camera.up.set(0, 1, 0); camera.lookAt(vw[3], vw[4], vw[5]) }
    }
    // teste (fora da produção): onde a Kombi aparece na tela, quadro a quadro.
    // Liga com window.__camLog = [] (cada linha: x, y na tela, distância, km/h, dt)
    if (process.env.NODE_ENV !== "production") {
      const w = window as unknown as { __camLog?: number[][] }
      if (w.__camLog) {
        camera.updateMatrixWorld()
        const s = tmp.p.copy(car.position).project(camera)
        w.__camLog.push([+s.x.toFixed(4), +s.y.toFixed(4), +camera.position.distanceTo(car.position).toFixed(2), Math.round(j.v), +dt.toFixed(4)])
        if (w.__camLog.length > 4000) w.__camLog.shift()
      }
    }
    // (disco, 20/10) o HYPERLAPSE: a intensidade segue o múltiplo da velocidade
    // da pista; abre a câmera, a lente e as linhas de velocidade
    if ("disco" in M) {
      const mult = j.vBase ? Math.max(0, j.v / j.vBase) : 0
      const alvoK = intensidade(mult, !!j.hyper, j.hyperT ?? 0)
      VELO.k += (alvoK - VELO.k) * Math.min(1, dt * (alvoK > VELO.k ? 3 : 1.5))
      if (j.hyper) j.psi = Math.max(j.psi ?? 0, Math.min(1, 0.5 + (j.hyperT ?? 0) * 0.05))
      const hl = hyperEl.current ?? (hyperEl.current = document.querySelector<HTMLElement>(".l-hyper"))
      if (hl) {
        const k = VELO.k
        hyperFase.current += dt * (0.6 + k * k * 6)
        const op = Math.min(1, k * 1.1)
        if (op < 0.01) { if (hl.style.opacity !== "0") hl.style.opacity = "0" }
        else {
          hl.style.opacity = op.toFixed(3)
          const [a, b] = hl.children as unknown as HTMLElement[]
          const f1 = hyperFase.current % 1, f2 = (hyperFase.current + 0.5) % 1
          a.style.transform = `scale(${(1 + f1 * 1.6).toFixed(3)}) rotate(${(hyperFase.current * 3).toFixed(1)}deg)`
          a.style.opacity = (Math.sin(f1 * Math.PI)).toFixed(3)
          b.style.transform = `scale(${(1 + f2 * 1.6).toFixed(3)}) rotate(${(-hyperFase.current * 2).toFixed(1)}deg)`
          b.style.opacity = (Math.sin(f2 * Math.PI)).toFixed(3)
          hl.classList.toggle("is-hyper", !!j.hyper)
        }
      }
    }
    const cam = camera as THREE.PerspectiveCamera
    if (j.soco) { cam.fov += reduz ? 0 : 16; j.soco = false }
    const fovAlvo = pq.andando ? 64 + Math.min(14, pq.v * 0.5) : cl ? 40 : cine ? 50 : primeira ? 86 + pct * 6 + (j.turboT > 0 ? 5 : 0) : 60 + Math.min(1.3, Math.abs(pct)) * 18 + (j.turboT > 0 ? 10 : 0) + Math.max(0, camDin.current.puxa) * 1.5
    cam.fov += (fovAlvo + ("disco" in M ? Math.min(45, VELO.k * 24) : 0) - cam.fov) * Math.min(1, dt * 3)
    cam.updateProjectionMatrix()
    j.shake = Math.max(0, j.shake - dt * 2)
    j.flash = Math.max(0, j.flash - dt * 1.6)

    // céu acompanha a câmera
    if (ceu.current) ceu.current.position.copy(camera.position)
    // atmosfera do lugar: névoa, céu e luz mudam devagar; na saída, vai
    // misturando do lugar de onde veio pro lugar pra onde vai
    if (V.tipo === "saida") {
      // o cenário segura o lugar de onde veio e só vira no fim, junto com a música
      const s = 0.35 * suave((j.u / V.L - 0.6) / 0.4)
      const dA = distritoDe(V.de!)
      const dB = distritoDe(V.t)
      alvoNevoa.set(dA.nevoa).lerp(tmp.c1.set(dB.nevoa), s)
      alvoCeu.set(dA.ceu).lerp(tmp.c2.set(dB.ceu), s)
    } else {
      const ds = distritoDe(V.t)
      alvoNevoa.set(ds.nevoa)
      alvoCeu.set(ds.ceu)
    }
    // A HORA DO JOGO (relogio.ts): o dia inteiro em 20 min; muda o céu, a névoa e a luz
    horaRef.current = (horaRef.current + dt / SEG_POR_HORA) % 24
    const ch = ceuNaHora(horaRef.current)
    // o sol e a lua andam com a hora; a luz da cena vem de quem estiver no céu
    astros(horaRef.current, tmp.sol, tmp.lua)
    ceuMat.uniforms.sol.value.copy(tmp.sol)
    ceuMat.uniforms.lua.value.copy(tmp.lua)
    if (dirRef.current) {
      const deDia = tmp.sol.y > -0.05
      const fonteLuz = deDia ? tmp.sol : tmp.lua
      dirRef.current.position.copy(fonteLuz).multiplyScalar(500)
      const quente = 1 - Math.min(1, Math.max(0, (tmp.sol.y - 0.02) / 0.38))
      if (deDia) dirRef.current.color.setRGB(1, 0.93 - 0.4 * quente, 0.84 - 0.62 * quente)
      else dirRef.current.color.set("#b9ccff")
    }
    ceuMat.uniforms.topoC.value.set(ch.topo[0], ch.topo[1], ch.topo[2])
    ceuMat.uniforms.meioC.value.set(ch.meio[0], ch.meio[1], ch.meio[2])
    ceuMat.uniforms.noite.value = ch.noite
    alvoCeu.multiplyScalar(ch.tinta)
    alvoNevoa.lerp(diaNevoa, (1 - ch.noite) * 0.75)
    // (disco, as dunas) longe da cidade, sol aberto: a areia aparece (a luz da
    // cidade foi pensada pro asfalto escuro; no deserto ficava tudo preto)
    const noDeserto = "disco" in M && !!j.voo && j.wx !== undefined && Math.hypot(j.wx, j.wz!) > 1250
    desertoK.current += ((noDeserto ? 1 : 0) - desertoK.current) * Math.min(1, dt * 0.8)
    const dk = desertoK.current
    if (ambRef.current) ambRef.current.intensity = 0.35 * ch.luz * (1 + dk * 1.6)
    if (dirRef.current) dirRef.current.intensity = 0.9 * ch.luz * (1 + dk * 1.2)
    const kk = Math.min(1, dt * (0.9 + j.impacto * 9))
    j.impacto = Math.max(0, j.impacto - dt * 0.8)
    const fog = scene.fog as THREE.Fog | null
    if (fog) fog.color.lerp(alvoNevoa, kk)
    // no deserto a névoa vai longe: a cidade inteira lá no horizonte
    if (fog) {
      const longe = V.id === "deserto" || noDeserto
      fog.far += ((longe ? 3000 : 950) - fog.far) * Math.min(1, dt * 0.6)
      fog.near += ((longe ? 250 : 70) - fog.near) * Math.min(1, dt * 0.6)
    }
    ;(scene.background as THREE.Color | null)?.lerp(alvoNevoa, kk)
    ceuMat.uniforms.nevoaC.value.lerp(alvoNevoa, kk)
    ceuMat.uniforms.tinta.value.lerp(alvoCeu, kk)
    ceuMat.uniforms.tempo.value += dt
    // aviação: 1 s aceso, 1 s apagado, todos juntos (como na vida)
    cidade.aviacaoMat.opacity = Math.sin(ceuMat.uniforms.tempo.value * Math.PI) > 0 ? 1 : 0.08
    if (hemi.current) hemi.current.color.lerp(alvoCeu, kk * 0.5)

    // som: só o motor
    motor?.atualizar(Math.min(1.45, Math.abs(j.v) / VMAX), (cine ? cine === "rodando" : inp.gas || toqueTela || inp.freio) && !j.chegando, j.turboT > 0)
    // vibração leve enquanto acelera, mais forte quanto mais rápido (não no
    // cinema da chegada, não no ar, não freando)
    tremor(!cine && !j.ar && !j.chegando && !inp.freio && (inp.gas || toqueTela) && j.v > 1, Math.abs(j.v) / VMAX)

    // orbs: na cor da rádio que está tocando, batendo no grave da música
    const t = state.clock.elapsedTime
    const joia = "disco" in M
    if (joia) (orbs.m.material as THREE.ShaderMaterial).uniforms.tempo.value = t
    else {
      const corOrb = orbs.m.material as THREE.MeshBasicMaterial
      corOrb.color.lerp(tmp.c1.set(corRadio.current), 0.08)
      orbs.haloMat.color.copy(corOrb.color)
    }
    orbs.haloMat.size = joia ? 1.1 + grave * 1.4 : 3 + grave * 5
    // (a joia pulsa pouco: quem marca o grave é o halo)
    const bate = joia ? 1 + grave * 0.22 : 0.8 + grave * 0.75
    // (19/10, desempenho) só os anéis a até 450 m da câmera entram na malha (no
    // disco são 1142, 400 mil triângulos desenhados e reenviados todo quadro;
    // um anel de 1,5 m some de vista bem antes disso)
    const camP = state.camera.position, R2 = QUALIDADE.gotas * QUALIDADE.gotas // (20/10: a distância vem da qualidade do aparelho)
    let n = 0
    for (let i = 0; i < orbs.lista.length; i++) {
      if (j.pegos.has(i) || viaApagada?.[orbs.lista[i].via]) continue
      const dx = orbs.pos[i * 3] - camP.x, dy = orbs.pos[i * 3 + 1] - camP.y, dz = orbs.pos[i * 3 + 2] - camP.z
      if (dx * dx + dy * dy + dz * dz > R2) continue
      tmp.d.position.set(orbs.pos[i * 3], orbs.pos[i * 3 + 1] + Math.sin(t * 3 + i) * (joia ? 0.12 : 0.2) - (joia ? 0.45 : 0), orbs.pos[i * 3 + 2])
      tmp.d.rotation.set(0, t * (joia ? 1.3 : 2) + i, 0)
      tmp.d.scale.set(bate, bate, bate)
      tmp.d.updateMatrix()
      if (orbs.cores) orbs.m.setColorAt(n, orbs.cores[i])
      orbs.m.setMatrixAt(n++, tmp.d.matrix)
    }
    orbs.m.count = n
    if (orbs.cores && orbs.m.instanceColor) { orbs.m.instanceColor.needsUpdate = true; orbs.m.instanceColor.clearUpdateRanges(); orbs.m.instanceColor.addUpdateRange(0, n * 3) }
    orbs.m.instanceMatrix.needsUpdate = true
    orbs.m.instanceMatrix.clearUpdateRanges()
    orbs.m.instanceMatrix.addUpdateRange(0, n * 16)
    {
      // o rastro: apaga devagar; enquanto a Kombi voa de um pulo, solta luz
      const rs = rastro, apaga = Math.exp(-dt * 2.6)
      for (let i = 0; i < rs.cor.length; i++) rs.cor[i] *= apaga
      if (j.pulou || (j.ar && j.turboT > 0)) for (let q = 0; q < 2; q++) {
        const k = rs.cab, f = q / 2
        rs.pos[k * 3] = car.position.x - tmp.f.x * (2.8 + f * j.v * dt) + (Math.random() - 0.5) * 0.4
        rs.pos[k * 3 + 1] = car.position.y + 0.9 + (Math.random() - 0.5) * 0.4
        rs.pos[k * 3 + 2] = car.position.z - tmp.f.z * (2.8 + f * j.v * dt) + (Math.random() - 0.5) * 0.4
        // arco-íris: a cor anda com o tempo (o rastro inteiro vira um degradê)
        tmp.cor.setHSL((j.tempo * 0.9 + q * 0.03) % 1, 1, 0.55)
        rs.cor[k * 3] = tmp.cor.r * 1.3; rs.cor[k * 3 + 1] = tmp.cor.g * 1.3; rs.cor[k * 3 + 2] = tmp.cor.b * 1.3
        rs.cab = (k + 1) % rs.N
      }
      rs.g.attributes.position.needsUpdate = true; rs.g.attributes.color.needsUpdate = true
    }
    {
      // a ONDA PSICODÉLICA: combo alto, voo longo, 360 e turbo giram as cores
      // da cidade por uns segundos (um filtro no canvas: barato e some sozinho)
      j.psi = Math.max(j.turboT > 0 ? 0.3 : 0, (j.psi ?? 0) * Math.exp(-dt * 0.55))
      if (j.combo && j.tempo - (j.comboT ?? 0) > 2.5) j.combo = 0
      const el = state.gl.domElement
      const psi = j.psi
      // (LU2CA: "muito sutil, como uma marca d'água, chapado de ácido; às
      // vezes forte e curta") o fundo: a cor respira ±10° bem devagar, sempre;
      // por cima, o golpe forte quando a onda sobe
      const fundo = Math.sin(j.tempo * 0.09) * 10 + Math.sin(j.tempo * 0.031) * 6
      // (o golpe BALANÇA a cor ±60°, não gira a roda inteira: girado 180° o
      // roxo da cidade vira verde, e fica feio)
      const f = `hue-rotate(${Math.round(fundo + (psi > 0.02 ? Math.sin(j.tempo * 2.6) * 60 * psi : 0))}deg) saturate(${(1.06 + psi * 0.45).toFixed(2)})${psi > 0.02 ? ` contrast(${(1 + psi * 0.08).toFixed(2)})` : ""}`
      if (el.style.filter !== f) el.style.filter = f
      // o contador do combo (no centro, só a partir de x3)
      const ce = comboEl.current ?? (comboEl.current = document.querySelector<HTMLElement>(".l-combo"))
      if (ce) {
        const c = j.combo ?? 0, txt = c >= 3 ? `x${c}` : ""
        if (ce.textContent !== txt) { ce.textContent = txt; ce.style.transform = "translateX(-50%) scale(1.35)"; requestAnimationFrame(() => { ce.style.transform = "translateX(-50%) scale(1)" }) }
        ce.style.color = `hsl(${Math.round((j.tempo * 220) % 360)} 100% 65%)`
      }
    }

    // luz dos postes pulsa no grave
    cidade.luzMat.size = 3.4 + grave * 3
    cidade.luzMat.opacity = 0.55 + grave * 0.35
    tex.turbo.offset.y -= dt * 2.5

    // chuva: volume que acompanha a câmera, inclina com a velocidade (no
    // deserto não chove)
    // a pancada chega e vai embora devagar (uns 12 s)
    const clima = climaRef.current
    clima.k += ((clima.chove ? 1 : 0) - clima.k) * Math.min(1, dt / 12)
    if (chuvaRef.current) {
      chuvaRef.current.visible = V.id !== "deserto" && clima.k > 0.02
      ;(chuvaRef.current.material as THREE.LineBasicMaterial).opacity = 0.28 * clima.k
    }
    const cp = camera.position
    for (let i = 0; i < chuva.n; i++) {
      let y = chuva.base[i * 3 + 1] - dt * (38 + j.v * 0.2)
      if (y < 0) y += 40
      chuva.base[i * 3 + 1] = y
      const x = cp.x + chuva.base[i * 3]
      const z = cp.z + chuva.base[i * 3 + 2]
      const yy = cp.y - 18 + y
      chuva.pos.set([x, yy, z, x - tmp.f.x * j.v * 0.03, yy - 1.1, z - tmp.f.z * j.v * 0.03], i * 6)
    }
    chuva.g.attributes.position.needsUpdate = true

    // confete
    for (let i = 0; i < confete.s.length; i++) {
      const c = confete.s[i]
      if (c.vivo <= 0) continue
      c.vivo -= dt
      c.v.y -= 9 * dt
      c.v.multiplyScalar(1 - dt * 0.8)
      c.p.addScaledVector(c.v, dt)
      c.r.addScaledVector(c.w, dt)
      confete.d.position.copy(c.p)
      confete.d.rotation.set(c.r.x, c.r.y, c.r.z)
      const s = c.vivo > 0 ? Math.min(1, c.vivo * 2) : 0
      confete.d.scale.set(s, s, s)
      confete.d.updateMatrix()
      confete.m.setMatrixAt(i, confete.d.matrix)
    }
    confete.m.instanceMatrix.needsUpdate = true

    // faíscas
    for (let i = 0; i < faiscas.n; i++) {
      if (faiscas.vida[i] <= 0) { faiscas.pos[i * 3 + 1] = -999; continue }
      faiscas.vida[i] -= dt
      faiscas.vel[i * 3 + 1] -= 18 * dt
      faiscas.pos[i * 3] += faiscas.vel[i * 3] * dt
      faiscas.pos[i * 3 + 1] += faiscas.vel[i * 3 + 1] * dt
      faiscas.pos[i * 3 + 2] += faiscas.vel[i * 3 + 2] * dt
    }
    faiscas.g.attributes.position.needsUpdate = true

    // mensagens da cidade no caminho
    const ft = falasT.current
    if (j.tempo > ft.prox && ft.i < FALAS.length && !j.chegando) {
      const f = FALAS[ft.i++]
      ev.falar(f.de, f.texto)
      ft.prox = j.tempo + 9 + Math.random() * 6
    }

    kTurbo.current = j.turboT > 0
    kVel.current = j.v
    // rodas da frente: com aderência seguem o volante; de lado, apontam pra
    // onde a Kombi anda (contraesterço natural)
    kEsterco.current += ((j.drift ? j.deriva * 0.85 : -j.steer * 0.42) - kEsterco.current) * Math.min(1, dt * 10)
    kVolante.current = Math.max(-1.3, Math.min(1.3, -kEsterco.current / 0.42))
    kBalanco.current = j.vx * 0.35 + a.curv * j.v * Math.abs(j.v) * 0.08 + j.deriva * 2
    // de dentro: some a carroceria de fora, aparece a cabine
    const dentroAgora = dentroRef.current && !cine
    if (corpoK.current) corpoK.current.visible = !dentroAgora && !combRef.current.patins
    // a herbal é fechada: a cabine (o interior) só aparece de dentro
    if (cabineG.current) cabineG.current.visible = dentroAgora && !combRef.current.patins
    // a luz magenta de baixo (o brilho no asfalto) pintava a cabine de rosa
    if (luzBaixo.current) luzBaixo.current.intensity = dentroAgora ? 0 : 45
    hudN.current++
    if (hudN.current % 4 === 0) ev.hud(j)
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={["#8f7dff", "#0b1a3a", 1.6]} />
      <ambientLight ref={ambRef} intensity={0.35} color="#7f8cff" />
      <directionalLight ref={dirRef} position={[200, 300, -400]} intensity={0.9} color="#b9ccff" />
      {/* as luzes dos lugares, bombas e torres: um punhado que segue a câmera (luzes.tsx) */}
      <LuzesProximas />
      <CompilaSemTravar />
      <ResolucaoDinamica fixa={testeDpr} max={NIVEIS[qual].dprMax} />
      {/* (20/10) a primeira partida mede o aparelho e define a qualidade (no
          teste, só com ?medirAparelho: a medição de desempenho não pode mudar sozinha) */}
      {"disco" in M && !QUALIDADE.medido && (!testeMedir || testeMedirAparelho) && <MedirAparelho onFim={setQual} />}
      <mesh ref={ceu} material={ceuMat} frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[2800, 32, 16]} />
      </mesh>

      {/* o deserto: chão de areia em volta da cidade, pelo norte (mundo.ts)
          (B15: no disco o chão são as dunas; este anel plano do mapa velho, a
          0 m, cortava as dunas no meio e a água a −12 m brigava com o vale:
          os dois eram o "chão vazado") */}
      {!("disco" in M) && <mesh rotation-x={-Math.PI / 2} position={[centroSub.x, -0.25, centroSub.z]}>
        <ringGeometry args={[1350, 9000, 120, 1, -0.12, Math.PI + 0.24]} />
        <meshStandardMaterial color="#2e231e" roughness={1} />
      </mesh>}
      <Caminhante abRef={aberturaRef} />
      {/* água */}
      {!("disco" in M) && <mesh rotation-x={-Math.PI / 2} position={[0, -12, 0]}>
        <planeGeometry args={[9000, 9000]} />
        <meshStandardMaterial color="#071430" metalness={0.85} roughness={0.22} />
      </mesh>}

      {/* pista */}
      <mesh geometry={geo.chao} receiveShadow>
        <meshStandardMaterial map={tex.asfalto} roughness={0.38} metalness={0.3} color="#d6d9ff" side={THREE.DoubleSide} />
      </mesh>
      {geo.faixas.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial vertexColors toneMapped={false} transparent opacity={0.85} />
        </mesh>
      ))}
      {geo.bordas.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial vertexColors toneMapped={false} />
        </mesh>
      ))}
      {geo.linhasGarfo.map((g, i) => (
        <mesh key={`lg${i}`} geometry={g}>
          <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.8} />
        </mesh>
      ))}
      {/* (disco) a faixa da saída pintada na cor da linha */}
      {geo.pintaSaida.index!.count > 0 && (
        <mesh geometry={geo.pintaSaida}>
          <meshBasicMaterial vertexColors transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {"disco" in M && <Seguro nome="portões"><Portoes M={M as MundoDisco} apagada={viaApagada} /></Seguro>}
      {"disco" in M && <Seguro nome="monumentos"><Monumentos M={M as MundoDisco} luz={luzPistas} /></Seguro>}
      {"disco" in M && <CasaDeserto chao={(M as MundoDisco).chaoEm} farol={faseHistoria === "casa"} />}
      {"disco" in M && <LugaresChao chao={(M as MundoDisco).chaoEm} alvo={alvoChao} />}
      {"disco" in M && <Seguro nome="robôs"><Robos jogo={jogo as unknown as React.RefObject<{ voo?: boolean; ar: boolean; wx?: number; wz?: number; y: number; v: number; shake: number; flash: number }>} chao={(M as MundoDisco).chaoEm} onEspatifou={() => onRobo?.current?.()} /></Seguro>}
      {[geo.railE, geo.railD].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {[geo.saiaE, geo.saiaD].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#0d0f24" side={THREE.DoubleSide} />
        </mesh>
      ))}

      {cidade.predios.map((m, i) => <primitive key={i} object={m} />)}
      {/* (disco) a central: a torre de onde saem todas as pistas */}
      {"disco" in M && (M as MundoDisco).torres.map((t, i) => <TorreCentral key={i} c={t} janelas={tex.janelas} />)}
      <points geometry={cidade.aviacao} material={cidade.aviacaoMat} />
      <primitive object={cidade.arcos} />
      <primitive object={cidade.fitas} />
      {cidade.outdoors.map((o, i) => (
        <mesh key={`out${i}`} position={o.pos} rotation={[0, o.rot, 0]}>
          <planeGeometry args={[28, 7]} />
          <meshBasicMaterial map={o.tex} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <primitive object={cidade.pilares} />
      {/* (no mapa novo a Linha 9 ainda vai ganhar o traçado dela) */}
      {!relevoNovo && <Seguro nome="linha 9"><Metro metro={metro} /></Seguro>}
      <Seguro nome="lugares"><Lugares M={M} alvo={lugarAlvoId} emCena={cenaLugar} revelado={revelado} /></Seguro>
      <Seguro nome="bombas"><Bombas M={M} /></Seguro>
      <Seguro nome="fachadas"><Fachadas M={M} abertos={abertos} perto={paginaPerto} /></Seguro>
      {/* no mapa novo: as flores do asfalto (só de patins); no de sempre, os canteiros */}
      <Seguro nome="flores">{"ligacoes" in M ? <FloresAsfalto M={M} {...floresAsf} /> : <Flores M={M} regadas={regadas} />}</Seguro>
      <Seguro nome="parque"><Parque M={M} passeio={passeio} /></Seguro>
      <Seguro nome="subúrbio"><Suspense fallback={null}><Suburbio cx={centroSub.x} cz={centroSub.z} raioChao={centroSub.r} /></Suspense></Seguro>
      <primitive object={cidade.postes} />
      <primitive object={cidade.reflexos} />
      <points geometry={cidade.luzes} material={cidade.luzMat} />

      {/* bifurcações: pórticos com três placas, setas no chão, faixa de
          saída pintada, barreira nas trancadas */}
      {pinturas.faixas.map((g, i) => (
        <mesh key={`pf${i}`} geometry={g}>
          <meshBasicMaterial vertexColors transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {pinturas.muros.map((g, i) => (
        <mesh key={`pm${i}`} geometry={g}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {placas.lista.map((g) => (
        <group key={g.id} position={g.pos} rotation={[0, g.rot, 0]}>
          {[-1, 1].map((l) => (
            <mesh key={l} position={[l * (MEIA + FAIXA + 1.2), 6.6, 0]}>
              <boxGeometry args={[0.6, 13.2, 0.6]} />
              <meshStandardMaterial color="#1c1f3a" />
            </mesh>
          ))}
          <mesh position={[0, 12.1, 0]}>
            <boxGeometry args={[(MEIA + FAIXA + 1.2) * 2, 0.6, 0.6]} />
            <meshStandardMaterial color="#1c1f3a" />
          </mesh>
          <mesh position={[0, 13.4, -0.3]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[16, 2]} />
            <meshBasicMaterial map={g.topo} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {g.paineis.map((p, i) => (
            <group key={i} position={[-p.x, 8.8, -0.3]} rotation={[0, Math.PI, 0]}>
              <mesh position={[0, 0, -0.05]}>
                <planeGeometry args={[7.6, 5.6]} />
                <meshBasicMaterial color="#070817" transparent opacity={0.9} side={THREE.DoubleSide} />
              </mesh>
              <mesh>
                <planeGeometry args={[7.4, 5.1]} />
                <meshBasicMaterial map={p.tex} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
              <mesh position={[0, -2.95, 0]}>
                <planeGeometry args={[7.6, 0.22]} />
                <meshBasicMaterial color={p.cor} toneMapped={false} />
              </mesh>
              {p.area && tagTex[p.area] && (
                <group position={[0, -3.75, 0]}>
                  <mesh position={[0, 0, -0.05]}>
                    <planeGeometry args={[7.6, 1.05]} />
                    <meshBasicMaterial color="#070817" transparent opacity={0.92} side={THREE.DoubleSide} />
                  </mesh>
                  <mesh>
                    <planeGeometry args={[7.4, 0.81]} />
                    <meshBasicMaterial map={tagTex[p.area]} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
                  </mesh>
                </group>
              )}
            </group>
          ))}
        </group>
      ))}
      {placas.setas.map((s, i) => (
        <mesh key={`s${i}`} position={s.p} rotation={[-Math.PI / 2, 0, s.rot]}>
          <planeGeometry args={[3.2, 6.4]} />
          <meshBasicMaterial map={tex.turbo} color={s.cor} transparent opacity={s.op} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {placas.barreiras.map((b, i) => (
        <mesh key={`b${i}`} position={b.p} rotation={[0, b.rot, 0]}>
          <boxGeometry args={[FAIXA, 1.8, 0.6]} />
          <meshBasicMaterial color="#ff2a44" toneMapped={false} />
        </mesh>
      ))}

      {colunas.map((c) => (
        <group key={`col${c.id}`} position={c.pos}>
          <mesh position={[0, 140, 0]}>
            <cylinderGeometry args={[2.2, 2.2, 280, 16, 1, true]} />
            <meshBasicMaterial color={c.cor} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh position={[0, 140, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 280, 10, 1, true]} />
            <meshBasicMaterial color={c.cor} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.08, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[MEIA * 0.6, MEIA * 0.75, 40]} />
            <meshBasicMaterial color={c.cor} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          {c.item && <ItemGirando cor={c.cor} />}
        </group>
      ))}
      {turbos.map((t, i) => (
        <mesh key={i} position={t.p} rotation={[-Math.PI / 2, 0, t.rot]}>
          <planeGeometry args={[3.4, 7]} />
          <meshBasicMaterial map={tex.turbo} color="#ff3fb0" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      {/* o mapa novo: o relevo do v5 debaixo das ruas */}
      {/* (disco, B15) o chão tem uma luz própria fraquinha: de noite, embaixo das pistas, ele lia como um buraco preto */}
      {relevoNovo && <mesh geometry={relevoNovo}><meshStandardMaterial vertexColors roughness={0.95} emissive={"disco" in M ? "#3a2614" : "#000000"} emissiveIntensity={0.55} /></mesh>}
      {/* (disco, B15) depois dos 9 km de dunas, a areia continua lisa até o horizonte (sem borda vazada) */}
      {"disco" in M && <mesh rotation-x={-Math.PI / 2} position={[0, -15, 0]}><planeGeometry args={[60000, 60000]} /><meshStandardMaterial color="#8c6640" roughness={1} emissive="#3a2614" emissiveIntensity={0.55} /></mesh>}
      {lixo && <><primitive object={lixo.carros} /><primitive object={lixo.pneus} /></>}
      <primitive object={orbs.m} />
      <primitive object={rastro.pts} />
      {outdoors.length > 0 && <Outdoors M={M} lista={outdoors} />}
      <points geometry={orbs.halo} material={orbs.haloMat} />

      {trafego.malhas.flat().map((m, i) => <primitive key={i} object={m} />)}
      <primitive object={caca.corpo} frustumCulled={false} />
      <primitive object={caca.barra} frustumCulled={false} />
      <primitive object={caca.farol} frustumCulled={false} />
      <primitive object={caca.heli} />
      <primitive object={caca.facho} />

      <lineSegments ref={chuvaRef} geometry={chuva.g} frustumCulled={false}>
        <lineBasicMaterial color="#a8ccff" transparent opacity={0.28} />
      </lineSegments>
      <primitive object={confete.m} frustumCulled={false} />
      <primitive object={marcas.m} />
      <points geometry={fumaca.g} frustumCulled={false}>
        <pointsMaterial size={1.1} map={texFumaca} color="#b4bbd6" transparent opacity={0.22} depthWrite={false} />
      </points>
      <points geometry={faiscas.g} frustumCulled={false}>
        <pointsMaterial size={0.35} color="#ffb454" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>

      {/* a Kombi que ficou sem gasolina, esperando o galão */}
      <group ref={kombiParada} visible={false}><Kombi222 turbo={kParadaT} velocidade={kParadaZero} esterco={kParadaZero} /></group>
      <group ref={carro}>
        <group ref={corpoK}>
          {/* a Kombi de verdade (escaneada); enquanto carrega, ou se falhar
              no aparelho, a desenhada à mão */}
          <Seguro nome="kombi" reserva={<><Kombi222 turbo={kTurbo} velocidade={kVel} esterco={kEsterco} /><Cupula /></>}>
            <Suspense fallback={<><Kombi222 turbo={kTurbo} velocidade={kVel} esterco={kEsterco} /><Cupula /></>}>
              <KombiHerbal tinta={corPintura(estiloK)} paineis={!semPaineis} />
              <Kombi222 turbo={kTurbo} velocidade={kVel} esterco={kEsterco} soEfeitos />
            </Suspense>
          </Seguro>
        </group>
        <group ref={patinador} visible={false} rotation-y={Math.PI}>
          <Patinador vel={() => jogo.current.v} steer={() => -jogo.current.steer} ar={() => !!jogo.current.ar} jato={() => !!(jogo.current.ar && input.current.propulsor && (jogo.current.energia ?? 0) > 0)} />
        </group>
        <group ref={cabineG}>
          <Seguro nome="cabine"><Cabine balanco={kBalanco} disco={disco} objetos={objetos} carona={carona} onTocaDiscos={onTocaDiscos} volante={kVolante} vel={kVel} tinta={corPintura(estiloK)} neon={corNeon(estiloK)} /></Seguro>
        </group>
        <pointLight ref={luzBaixo} position={[0, 0.3, 0]} color={corNeon(estiloK)} intensity={45} distance={10} decay={2} />
        <pointLight position={[0, 1, -4]} color="#fff1d6" intensity={60} distance={26} decay={2} />
        {/* luz de recorte vinda da cidade, pra Kombi não sumir no escuro */}
        <pointLight position={[0, 4, 4]} color="#9fd8ff" intensity={25} distance={9} decay={2} />
      </group>
      <Seguro nome="lente"><Cinema maxLente={NIVEIS[qual].lente} /></Seguro>
    </>
  )
}

/* eslint-enable react-hooks/immutability, react-hooks/purity */

const FALAS = [
  { de: "D-Bee", texto: "o núcleo apagou os radares nessa rua. aproveita" },
  { de: "Ella", texto: "vai com calma na curva molhada" },
  { de: "Mubarak", texto: "a Kombi aguenta. confia" },
  { de: "Notti", texto: "pega as bolinhas!! as bolinhas!!" },
  { de: "Alohan", texto: "repara nas luzes. elas batem junto com a música." },
  { de: "Drewboy", texto: "sobe a rampa com tudo" },
]

function soltarFaiscas(f: { n: number; pos: Float32Array; vel: Float32Array; vida: Float32Array; prox: number }, car: THREE.Group | null, lado: number) {
  if (!car) return
  const r = new THREE.Vector3(1, 0, 0).applyQuaternion(car.quaternion)
  for (let k = 0; k < 3; k++) {
    const i = f.prox++ % f.n
    f.pos.set([car.position.x + r.x * lado * 0.95, car.position.y + 0.4, car.position.z + r.z * lado * 0.95], i * 3)
    f.vel.set([r.x * lado * (2 + Math.random() * 3) + (Math.random() - 0.5) * 3, 2 + Math.random() * 4, r.z * lado * (2 + Math.random() * 3) + (Math.random() - 0.5) * 3], i * 3)
    f.vida[i] = 0.5 + Math.random() * 0.4
  }
}

// a coisa da missão flutuando na coluna de luz, girando
function ItemGirando({ cor }: { cor: string }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((st) => {
    if (!ref.current) return
    ref.current.rotation.y = st.clock.elapsedTime * 1.8
    ref.current.position.y = 3.2 + Math.sin(st.clock.elapsedTime * 2.4) * 0.5
  })
  return (
    <mesh ref={ref} position={[0, 3.2, 0]}>
      <octahedronGeometry args={[1.3, 0]} />
      <meshBasicMaterial color={cor} toneMapped={false} />
    </mesh>
  )
}
