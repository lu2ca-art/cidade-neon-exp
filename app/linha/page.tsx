"use client"

// CIDADE NEON — o celular, redesenhado.
//
// entrada → a chegada na cidade (de Kombi, até o Núcleo cortar a música e
// a cor) → D-Bee no N3XO → grupo "linha 222" (qual estação você
// é) → o celular: todos os apps abertos desde o começo (os novos e os da
// versão anterior), a Kombi pra rodar a cidade quando quiser, e os níveis
// liberando coisa nova aos poucos.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "./linha.css"
import { ESTACOES, NIVEIS, dataCurta, estacao as getEstacao, lancada, missao, nivelDe, UNTITLED, type EstacaoId, type ProvaId } from "./data"
import { ROTEIROS, VOZES, type ChatId } from "./roteiros"
import { VAZIO, carregar, gravar, hoje, type Item, type Save } from "./estado"
import { ARQUIVO, type FreqId } from "./radio"
import { TODAS_FAIXAS, ehDoLugar, proxima } from "./programa"
import { Chat, type Destino } from "./chat"
import { MISSOES, abertas, alvoDe, ativa, etapaDe, type Alvo, POPULARIDADE } from "./missoes"
import { CenaLugar, type ResultadoCena } from "./cena"
import { CENA_INICIO, CENA_MUBARAK_DREW, cenaDe, type Reliquia } from "./cenas"
import { GESTOS_3D, precarregarSala, temSala } from "./interior/registro"
import { LUGARES, type LugarId } from "./lugares"
import { proximaFreq } from "./radio"
import { InvasaoNucleo, type Invasao } from "./nucleo"
import { Prova } from "./provas"
import { Jardim, Violao } from "./recursos"
import type { Cinema, Stats } from "./estrada/Corrida"
import { qualMapa } from "./estrada/qualMapa"
import { Chegada } from "./chegada"
import { LigacaoNaKombi, type Transcricao } from "./ligacao"
import { LIGACOES, ligacaoDaMissao, sortearModo, type Ligacao } from "./ligacoes"
import { APPS, AppJanela, AppTopo, Fliperama, Home, LEGADO, N3xo, Objetos, Ouvir, chamados, legadoFeito, type AppId, type Chamado } from "./os"
import { Bloqueio, Entrada, Final, Mapa, Radio } from "./telas"
import { abafar, audioCtx, disco, fonteSom, ligarChuva, moeda, mudo, player, silenciarKombi, trilha } from "./som"
import { somDaMissao, somDoLugar } from "./disco/sons"
import { track } from "@/lib/analytics"
import { Plataformas, PreSave } from "./plataformas"
import { Loja } from "./loja"
import { PostoDentro } from "./posto"
import { ACERVO } from "./discos"
import { cacheDoShow, comprar, comprarMelhoria, ganhar, gastar } from "./economia"
import { PAGA, POSTO } from "./economia-rascunho"
import { EVENTO_CADERNO } from "./Caderno"
import type { Onde } from "./parte"
import { aplicarParteDeTeste } from "./parteTeste"
import { BLOCOS, ITENS, NEON_POR_ITEM, PRIMEIRA, blocoAtual, emTutorial, feito, ligou, type ItemTutorial } from "./tutorial"
import dynamic from "next/dynamic"
import { CANTEIROS, ESPECIES, canteiroPorId } from "./estrada/canteiros"
import { abertoAgora, abreAs, ehDia, horaDaHistoria, turnoDe, virouODia } from "./relogio"
import { limparDaCidade } from "./paginas"
import { atalhoPorId, atalhosLiberados, type Ir as IrAtalho } from "../teste/atalhos"
import { CENA_BAR_PROLOGO, CENA_CASA_DISCO, comHistoria, historiaAtiva, historiaDe, type LugarChao } from "./disco/historia"
import { CENA_OFICINA, FALAS_OFICINA, MECANICO, OBJETIVO_OFICINA, OFICINA_CFG, alvoOficina, passoOficina } from "./disco/oficina"
import { Bancada, Goteira, Pagamento, PainelLixao } from "./disco/OficinaTelas"
import type { EventoHistoria } from "./estrada/Corrida"
import { InicioDisco } from "./disco/Inicio"
import { DUR as DUR_MINHOCA, Minhoca } from "./disco/Minhoca"
import { VISOR, Visor, type VisorId } from "./disco/Visor"
import { Freq } from "./disco/Freq"
import { type ResultadoShow } from "./disco/Show"
import { Show } from "./disco/ShowBanda"
import { Jornal, calcularManchete } from "./disco/Jornal"
import type { Manchete } from "./disco/historia"
import { MISSOES13, abrirPorta, alvo13, checklist13, concluir, contarEvento, disponiveis, feita13, kombiNoConserto, normalizarMissao, ofertas13, pecaAgora13, recompensaDe, sincronizar, trancado, type CenaId, type MissaoId, type Oferta13, type PortaId, type Recompensa13 } from "./disco/portas"
import { Peca } from "./disco/pecas/Peca"
import { Recompensa } from "./disco/Recompensa"
import { Letra } from "./disco/Letra"
import { letraDe } from "./disco/letras"
import { Palcos } from "./disco/MenuPalcos"
import { NIVEL_MAX, cacheNoPalco, lerShowDoPalco, nomeDoPalco, registrarShow, showDoPalco, PALCOS_CARREIRA } from "./disco/palcos"
import { COR_PISTA } from "./disco/historia"
import { PingPong } from "./disco/PingPong"
import { guardarCapsula, guitarLivre } from "./disco/capsula"
import { luzDasPistas, pistasFeitas } from "./estrada/atos"
import { PISTAS, type PistaId } from "./estrada/pistas"

// PASSO 1 da otimização: os ambientes 3D vêm em pedaços separados do pacote,
// baixados só quando a pessoa chega neles (a estrada ao entrar na Kombi, a
// sala ao passar na frente do lugar, a viagem no ep. 3). A tela inicial, o
// celular e as conversas abrem sem three.js.
const Corrida = dynamic(() => import("./estrada/Corrida").then((m) => m.Corrida), { ssr: false })
const Interior = dynamic(() => import("./interior/Interior").then((m) => m.Interior), { ssr: false })
const Viagem = dynamic(() => import("./viagem").then((m) => m.Viagem), { ssr: false })

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
function confShow(id: string): { faixa: PistaId; lugar: string; cor: string; palco: string } | null {
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

export default function LinhaPage() {
  // o caderno do dono aberto pausa a corrida (Caderno.tsx)
  const [caderno, setCaderno] = useState(false)
  useEffect(() => {
    const f = (e: Event) => setCaderno(!!(e as CustomEvent<{ aberto: boolean }>).detail?.aberto)
    window.addEventListener(EVENTO_CADERNO, f)
    return () => window.removeEventListener(EVENTO_CADERNO, f)
  }, [])
  const [save, setSave] = useState<Save>(VAZIO)
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
  const [cena, setCena] = useState<{ lugar: LugarId; missao: EstacaoId; pegar: boolean; inicio?: boolean; especial?: "mubarak-drew" | "disco-casa" | "disco-bar" | "disco-oficina" } | null>(null)
  // a viagem pra fora da cidade (ep. 3): antes da cena de um lugar `fora`
  // dentro de uma sala (ou na viagem pra fora) a estrada sai da tela e libera
  // a memória; ao voltar, a Kombi reaparece onde estava (Corrida: RETOMAR)
  const [voltaDaSala, setVoltaDaSala] = useState(false)
  // o painel MISSÕES: tudo que está aberto + "ir agora"
  const [painelMissoes, setPainelMissoes] = useState(false)
  // dentro do posto (posto.tsx): primeira = a apresentação do LU2CA
  const [noPosto, setNoPosto] = useState<{ primeira: boolean } | null>(null)
  const abrirPostoRef = useRef(() => {})
  // conversas que chegaram numa pergunta no painel: esperam no N3XO (não
  // chamam de novo na estrada até a pessoa abrir e responder)
  const [adiadas, setAdiadas] = useState<string[]>([])
  const [teleporte, setTeleporte] = useState<{ chave: number; area: FreqId; lugar?: LugarId; frac?: number } | null>(null)
  const [viagem, setViagem] = useState<{ lugar: LugarId; missao: EstacaoId; pegar: boolean; chegou?: boolean } | null>(null)
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
    // ?parte=casa (fora da produção): o save pronto daquela parte da jornada (parteTeste.ts)
    aplicarParteDeTeste()
    const s = carregar()
    const h = hoje()
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
    if (process.env.NODE_ENV !== "production") {
      const q = new URLSearchParams(location.search)
      setProvaDev(q.get("prova") as ProvaId | null)
      setCorridaDev(q.has("corrida"))
    }
    track("place_entered", { place_id: "linha-222", place_type: "linha" })
  }, [])

  useEffect(() => {
    if (pronto) gravar(save)
  }, [save, pronto])

  const atualizar = useCallback((f: (s: Save) => Save) => setSave(f), [])

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
  const emCena = !!cena && !somDoLugar(cena.lugar)
  useEffect(() => {
    if (!emCena) return
    abafar(true)
    return () => abafar(false)
  }, [emCena])
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
  const proxRadio = useRef<(id: FreqId) => void>(() => {})
  const tocarRadio = useCallback((id: FreqId) => {
    if (ehDoLugar(id, player.src, save.objetos)) return player.tocar(player.src!, () => proxRadio.current(id))
    const p = proxima(id, save.objetos, { nome: save.nome, objetos: save.objetos, carregando: null })
    if (p) player.tocar(p.faixa.src, () => proxRadio.current(id))
  }, [save.objetos, save.nome])
  useEffect(() => { proxRadio.current = tocarRadio }, [tocarRadio])

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

  const saveRef = useRef(save)
  useEffect(() => { saveRef.current = save }, [save])

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
    setSave((s) => ({ ...s, sinal: s.sinal + (venceu ? 8 : 0), nucleo: { invasoes: s.nucleo.invasoes + 1, caido: !venceu } }))
    track("mission_step", { mission_id: "linha-nucleo", step: venceu ? "invasao:repelida" : "invasao:caiu", perfil: save.perfil ?? "?", fio_pos: -1 })
    if (venceu) avisar("D-Bee", "vc segurou eles. +8 de sinal", "#3d7bff")
    else setTimeout(() => avisar("D-Bee", "derrubaram a 222. religa a antena no centro, de kombi", "#3d7bff"), 400)
  }, [avisar, save.perfil])

  // a caça: a partir da 3ª missão, carregar o contrabando (o que foi buscado,
  // ou alguém de carona) até a estação atrai os carros brancos do Núcleo.
  // Pego = a coisa volta pro lugar de origem (busca de novo; sem game over)
  const alvoAgora = save.nucleo.caido ? null : alvoDe(save, nivelDe(save))
  const cacado = alvoAgora?.t === "entrega" && save.objetos.length >= 2
  const emSala = (!!cena && temSala(cena.lugar)) || !!viagem || !!noPosto
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
  const abrirPortaRef = useRef<(m: MissaoId) => void>(() => {})
  const abrirCena = useCallback((id: LugarId) => {
    // (disco) a história manda: cada fase abre só o lugar dela
    if (D && historiaAtiva(historiaDe(saveRef.current))) {
      const h = historiaDe(saveRef.current)
      if (cinema) return
      // (saiu do bar agora: não reabre parado na porta; tem que dar uma volta)
      // (T04) a oficina não está mais nas pistas: o passo dela é no chão (chao:oficina)
      // (T02) a carreira: chegou no lugar da missão pegada: a peça de agora (ou a porta)
      if (h.fase === "carreira" && Date.now() - barFechou.current > 8000) {
        const m = missaoDoSave(saveRef.current)
        if (m && alvo13(hist13(saveRef.current), m)?.lugar === id) chegouRef.current(m)
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
    const h = saveRef.current.hora ?? 18
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
  }, [cinema, avisar, D])
  // (disco) o fim do prólogo: bebeu = a noite volta (o loop); recusou = a oficina
  // (T02) saiu da oficina: a Kombi solar + turbo, a água foi toda. É a porta da
  // missão da oficina (as melhorias da Kombi): a recompensa e, sem show, o jogo segue
  // (T09) a missão da oficina: a cena (ele chega só com o plano) abre a bancada (a
  // arte); depois o painel no lixão e a goteira (o jogo); de volta, o pagamento em
  // água e a porta (as melhorias da Kombi). Na Nectar antiga (o mapa de antes), a
  // cena segue fechando o passo dela como sempre
  const [oficinaTela, setOficinaTela] = useState<"bancada" | "painel" | "goteira" | "pagar" | null>(null)
  const fimOficina = useCallback((r: ResultadoCena) => {
    setCena(null)
    setCinema(null)
    if (!r.completa) return
    const h0 = historiaDe(saveRef.current)
    if (h0.fase === "oficina") {
      setSave((s) => comHistoria(s, (h) => ({ ...h, oficina: { ...(h.oficina ?? {}), cena: true } })))
      setOficinaTela("bancada")
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
    setTimeout(() => setFalaIntro({ id: Date.now(), de: MECANICO.nome, texto: FALAS_OFICINA.voa, ensina: true }), 2500)
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
  }, [cena, avisar])

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
    setSave((s) => ({ ...s, sinal: s.sinal + 10, nucleo: { ...s.nucleo, caido: false } }))
    track("mission_step", { mission_id: "linha-nucleo", step: "antena:religou", perfil: save.perfil ?? "?", fio_pos: -1 })
  }, [save.perfil])

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
  const pegarMissao = (id: MissaoId) => {
    setSave((s) => comHistoria(s, (h) => ({ ...h, missao: id })))
    setLargadas((l) => l.filter((x) => x !== id))
    track("mission_step", { mission_id: `disco-${id}`, step: "pegou", perfil: save.perfil ?? "?", fio_pos: -1 })
  }
  // (LU2CA 21/10 (3)) na carreira, a música é o TEMA da missão pegada (sem
  // missão, só os discos): a Corrida toca o instrumental até ele achar a linha
  const soTema = HIST && hist.fase === "carreira"
  const temaMissao: PistaId | null = soTema ? m13?.faixa ?? null : null
  const fecharOuvir = useCallback(() => setOuvirFim(null), [])
  const largarMissao = () => {
    const m = missaoCarreira
    setSave((s) => comHistoria(s, (h) => ({ ...h, missao: undefined })))
    if (m) setLargadas((l) => [...l, m])
  }
  const alvoChao: LugarChao | null = !HIST ? null : hist.fase === "bar" ? "bar" : hist.fase === "oficina" ? alvoOficina(hist) : hist.fase === "nectar" && hist.nectar === "oficina" ? "oficina" : lugar13?.chao ?? null
  const [pingpong, setPingpong] = useState(false)
  // (disco) pra onde a história manda agora (a coluna de luz, a vaga, o mapa)
  const alvoDisco: Alvo | null = hist.fase === "bar" ? null
    : hist.fase === "nectar" && hist.nectar === "galao" ? { t: "lugar", missao: "nectar", lugar: "posto", pegar: false }
    : lugar13?.lugar ? { t: "lugar", missao: "sexta", lugar: lugar13.lugar, pegar: false }
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
    const par: [keyof typeof t, PortaId][] = [["ginasio", "ginasio"], ["radio", "radio-frequencias"], ["fliperama", "fliperama"], ["parque", "parque"], ["canteiros", "canteiros"]]
    for (const [k, porta] of par) { const m = trancado(h13, porta); if (m) t[k] = m }
    return t
  }, [HIST, h13])
  const noConserto = HIST && kombiNoConserto(h13)
  // (T02) a peça aberta agora (o ping pong, o show, a prova), a recompensa na tela e a rua
  const pecaAberta = useRef<{ missao: MissaoId; qual: "arte" | "jogo" } | null>(null)
  const [provaMissao, setProvaMissao] = useState<{ missao: MissaoId; qual: "arte" | "jogo"; id: ProvaId; cor: string } | null>(null)
  const [recompensa, setRecompensa] = useState<Recompensa13 | null>(null)
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
  const abrirPortaDe = (id: MissaoId) => {
    const s0 = saveRef.current
    if (feita13(hist13(s0), id)) return
    const m = MISSOES13[id], r = recompensaDe(id)
    const faixaNaCidade = m.faixa && (m.onde === "cidade" || historiaDe(s0).fase === "carreira") ? (m.faixa as EstacaoId) : null
    setSave((s) => comHistoria(
      { ...ganhar(s, r.neon), objetos: faixaNaCidade && !s.objetos.includes(faixaNaCidade) ? [...s.objetos, faixaNaCidade] : s.objetos, violao: m.abre.includes("violao") ? true : s.violao },
      (h) => abrirPorta(sincronizar(h, s.objetos), id),
    ))
    setRecompensa(r)
    track("mission_step", { mission_id: `disco-${id}`, step: "porta", perfil: s0.perfil ?? "?", fio_pos: -1 })
  }
  // chegou no lugar da missão: abre a peça de agora; sem peça (feitas ou "em breve"), a porta
  const chegouNaMissao = (id: MissaoId) => {
    if (recompensa || pingpong || provaMissao || showAgora || letraAgora || cenaAgora || cena) return
    const pc = pecaAgora13(hist13(saveRef.current), id)
    if (!pc) { abrirPortaDe(id); return }
    const como = pc.peca.como
    barFechou.current = Date.now()
    if (!como || como.t === "historia" || como.t === "evento") return
    pecaAberta.current = { missao: id, qual: pc.qual }
    if (como.t === "pingpong") setPingpong(true)
    else if (como.t === "show") setSave((s) => comHistoria(s, (x) => ({ ...x, show: `missao:${id}` })))
    else if (como.t === "prova") setProvaMissao({ missao: id, qual: pc.qual, id: como.id, cor: MISSOES13[id].cor })
    else if (como.t === "letra" || como.t === "cena") setSave((s) => comHistoria(s, (x) => ({ ...x, aberta13: `${id}:${pc.qual}` })))
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
  useEffect(() => { chegouRef.current = chegouNaMissao; abrirPortaRef.current = abrirPortaDe })
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
  const somAgora = cena ? somDoLugar(cena.lugar) : pingpong ? somDaMissao("drew") : null
  useEffect(() => {
    if (!somAgora) return
    silenciarKombi(true)
    trilha.entrar(somAgora)
    return () => { trilha.sair(); silenciarKombi(false) }
  }, [somAgora])
  useEffect(() => { if (missaoCarreira) trilha.preparar(somDaMissao(missaoCarreira)) }, [missaoCarreira])
  // um evento da rua conta pra peça de agora (a montanha-russa da Nizzy…)
  const eventoDaRua = (e: "montanha" | "flor") => setSave((s) => (historiaDe(s).fase === "carreira" ? comHistoria(s, (h) => contarEvento(h, e)) : s))
  const fimShow = (r: ResultadoShow) => {
    const id = hist.show!, conf = confShow(id)!
    const popAntes = saveRef.current.popularidade ?? 0
    // (T03) o cachê do show vem da economia (a nota e a fama de antes)
    // (T20) num palco da carreira: o cachê vezes o palco, a melhor estrela e o nível
    const pc = lerShowDoPalco(id)
    const base = cacheDoShow(r.nota, popAntes)
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
  const objetivoDisco = hist.fase === "dunas" ? "o subúrbio" : hist.fase === "bar" ? "o bar · o subúrbio" : hist.fase === "oficina" ? OBJETIVO_OFICINA[passoOficina(hist)] : hist.fase === "subir" ? "a cidade · lá em cima"
    : hist.fase === "nectar" ? ({ quebra: "a pista da nectar", regar: `as flores · ${Math.max(0, 3 - ((hist.flores ?? 0) - (hist.floresIni ?? 0)))}`, galao: "o posto", oficina: "a oficina", show: "o jardim", flores: `o jardim · ${Math.max(0, 5 - ((hist.flores ?? 0) - (hist.floresIni ?? 0)))}`, feita: null } as Record<string, string | null>)[hist.nectar ?? "quebra"]
    : m13 ? (passos13.find((x) => x.estado === "agora")?.nome.split(" · ")[1] ?? m13.quem)
    : feira.length ? `a cidade precisa · ${feira.length}` : null
  // (22/10, o Omnitrix) a checklist da missão pegada gira em volta da bolinha (o anel do holo)
  const checklistHolo = useMemo(() => {
    if (!HIST || !m13) return null
    return { chave: m13.id, cor: m13.cor, titulo: `${m13.quem}${m13.faixa ? ` · ${PISTAS.find((x) => x.id === m13.faixa)!.faixa}` : ""}`, nome: m13.quem, passos: passos13 }
  }, [HIST, m13, passos13])
  // (22/10) as missões moram no mapa: um ícone por missão com pista (a pegada, ou as ofertas da feira) e,
  // no painel do mapa, as opções pra clicar (a checklist da de agora, ou a feira)
  const mapaMissoes = useMemo(() => {
    if (!HIST || hist.fase !== "carreira") return null
    const daPista = (id: PistaId | null, cor: string, agora: boolean) => { const p = id ? PISTAS.find((x) => x.id === id) : null; return p ? [{ id: p.id, faixa: p.faixa, cor, agora }] : [] }
    return m13 ? daPista(m13.faixa, m13.cor, true) : feiraVisivel.flatMap((o) => daPista(o.faixa, o.cor, false))
  }, [HIST, hist.fase, m13, feiraVisivel])
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
    setSave((x) => (emTutorial(x) && (x.tanque ?? 0) > 0.97 ? { ...x, tutorial: [...new Set([...(x.tutorial ?? []), "posto"])] } : x))
    if (primeira) {
      setSave((x) => ({ ...x, tutorial: [...new Set([...(x.tutorial ?? []), "lu2ca-posto"])] }))
      // a loja de discos chama (rascunho): o disco novo que ele falou
      setTimeout(() => avisar("LOJA", "tem disco novo na prateleira · abre no celular", "#ffc857"), 2500)
    }
  }, [noPosto, avisar])
  const encherTanque = useCallback(() => setSave((s) => {
    const pago = (s.tanque ?? 1) > 0.97 ? null : gastar(s, PRECO_TANQUE)
    if (!pago) return s
    track("mission_step", { mission_id: "linha-posto", step: "tanque", perfil: s.perfil ?? "?", fio_pos: -1 })
    return { ...pago, tanque: 1 }
  }), [])
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
  }, [avisar])

  // já fez o quiz = está dentro da cidade
  const dentro = !!save.estacao || !!save.casa

  const entrar = () => {
    audioCtx()
    // (mapa-disco) a história nova: save novo começa no buraco de minhoca; o
    // resto entra direto na Kombi, onde estava
    if (D) {
      if (historiaDe(saveRef.current).fase === "minhoca") {
        // (T40, J2: 5) a música da Kombi já vem tocando desde o buraco de minhoca:
        // entra em fade, distorcida, e vai ficando limpa até o fim da queda
        fonteSom.set("disco")
        disco.entradaMinhoca(DUR_MINHOCA / 1000)
        disco.tocarLista(ACERVO.faixas.map((f) => f.src))
        setMinhoca(true)
        return
      }
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
    // (o começo é de tarde: o deserto aparece, e a cidade acende quando escurece)
    setSave((s) => ({ ...comHistoria(s, (h) => ({ ...h, fase: "casa" as const })), hora: 16.5 }))
    setSaltoHora({ h: 16.5, id: Date.now() })
    setEstrada(true)
    setTela({ t: "corrida", destino: null })
  }
  // (disco) a história avisa da estrada: chegou na casa, pousou na cidade…
  // (T09, só fora da produção) os testes chegam num lugar do chão sem dirigir até lá
  const onHistoriaTeste = useRef<(e: EventoHistoria) => void>(() => {})
  useEffect(() => {
    if (!atalhosLiberados()) return
    ;(window as unknown as { __cnChao?: (id: LugarChao) => void }).__cnChao = (id) => onHistoriaTeste.current(`chao:${id}`)
  }, [])
  const onHistoria = (e: EventoHistoria) => {
    const h = historiaDe(saveRef.current)
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
    if (e === "chao:bar" && h.fase === "bar" && !cena) { setAoVivo(null); setCinema("lugar"); setCena({ lugar: "bar", missao: "copo", pegar: false, especial: "disco-bar" }) }
    if (e === "chao:oficina" && h.fase === "nectar" && h.nectar === "oficina" && !cena) { setAoVivo(null); setCinema("lugar"); setCena({ lugar: "oficina", missao: "nectar", pegar: false, especial: "disco-oficina" }) }
    // (T09) a missão da oficina: cada chegada abre o passo de agora
    if (h.fase === "oficina" && !cena && !oficinaTela && e.startsWith("chao:")) {
      const p = passoOficina(h)
      if (e === "chao:oficina" && p === "chegar") { setAoVivo(null); setCinema("lugar"); setCena({ lugar: "oficina", missao: "nectar", pegar: false, especial: "disco-oficina" }) }
      else if (e === "chao:oficina" && p === "reciclar") setOficinaTela("bancada")
      else if (e === "chao:oficina" && p === "montar") setOficinaTela("pagar")
      else if (e === "chao:painel" && p === "painel") setOficinaTela("painel")
      else if (e === "chao:goteira" && p === "goteira") setOficinaTela("goteira")
    }
    // (T02) o chão do subúrbio (a quadra, os túneis): chegou no lugar da missão pegada
    if (e.startsWith("chao:") && h.fase === "carreira") { const m = missaoDoSave(saveRef.current); if (m && alvo13(hist13(saveRef.current), m)?.chao === e.slice(5)) chegouNaMissao(m) }
    // (B18) subiu pra cidade (pousou numa pista): a carreira (a Nectar acesa)
    if (e === "subiu" && h.fase === "subir") {
      setSave((s) => comHistoria(s, (x) => ({ ...x, fase: "carreira" })))
      setTimeout(() => setFalaIntro({ id: Date.now(), de: "222 FM", texto: "uma kombi velha subiu do subúrbio. voando. alguém viu isso?" }), 1500)
    }
    if (e === "robo") setSave((s) => comHistoria(s, (x) => ({ ...x, robos: (x.robos ?? 0) + 1 })))
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
    setSave((s) => comHistoria(s, (h) => ({ ...concluir(h, "dbee", "arte"), fase: "dunas", holo: true })))
    // (T09, J2: 18) a D-Bee dá a água dela (não precisa): é o que paga o mecânico
    setSave((s) => (historiaDe(s).aguaDbee ? s : comHistoria(ganhar(s, OFICINA_CFG.aguaDaDbee, "agua"), (h) => ({ ...h, aguaDbee: true }))))
    setTimeout(() => avisar(`+${OFICINA_CFG.aguaDaDbee} de água`, `D-Bee: ${FALAS_OFICINA.dbeeAgua}`, "#4fc3ff"), 1200)
    fonteSom.set("disco")
    disco.tocarLista(ACERVO.faixas.map((f) => f.src))
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

  const abrirApp = (id: AppId) => {
    const a = APPS.find((x) => x.id === id)!
    if (a.nivel !== undefined && nivel < a.nivel) {
      avisar(a.nome, `abre no nível ${NIVEIS[a.nivel].nome}`, a.cor)
      return
    }
    // (T16, T18, T23) no jogo com história, o lugar que a porta de uma missão abre
    // fica trancado até ela (portas.ts, CONFIG13.trancar): a loja, as frequências, o fliperama
    if (HIST) {
      const porta = ({ loja: "loja-discos", radio: "radio-frequencias", freq: "radio-frequencias", sintonia: "radio-frequencias", fliperama: "fliperama" } as Partial<Record<AppId, PortaId>>)[id]
      const msg = porta ? trancado(hist13(saveRef.current), porta) : null
      if (msg) { avisar(a.nome, msg, a.cor); return }
    }
    // recurso de missão: abre com o objeto daquela estação
    // (o violão vem da D-Bee, no fim da leitura NECTAR)
    if (a.precisa && !(a.id === "violao" ? save.violao : save.objetos.includes(a.precisa))) {
      const e = getEstacao(a.precisa)
      avisar(a.nome, save.objetos.length || save.pausas[a.precisa] !== undefined ? `abre quando ${e.personagem} te der ${e.objetoNome}` : "abre com uma missão da cidade", a.cor)
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

  if (!pronto) return <div className="l-raiz" />

  // atalho de desenvolvimento: /linha?corrida=1 abre direto a estrada
  if (process.env.NODE_ENV !== "production" && corridaDev) {
    return (
      <div className="l-raiz">
        <div className="l-palco">
          <Corrida save={save} nivel={nivel} destino={null} onSinal={(total) => setSave((s) => ({ ...s, sinal: total }))} onDescer={() => {}} onSair={() => {}} />
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

  // (disco) o óculos de realidade aumentada: a tela larga no desktop e o
  // celular translúcido por cima da cidade (LU2CA 19/10)
  const ar = qualMapa() === "disco"
  return (
    <div className={`l-raiz ${ar ? "is-ar" : ""}`}>
      <div className="l-palco">
        {/* camada de baixo: a estrada (pausa quando o celular está aberto) */}
        {(estrada || tela.t === "corrida") && !emSala && (
          <Corrida
            save={save}
            nivel={nivel}
            destino={tela.t === "corrida" ? tela.destino : destinoEstrada}
            pausado={(tela.t !== "corrida" && tela.t !== "chegada" && !celularAberto) || !!visor || !!showAgora || !!jornal || pingpong || caderno || !!recompensa || rua || !!provaMissao || !!letraAgora || !!oficinaTela}
            celular={celularAberto}
            retomar={voltaDaSala}
            teleporte={teleporte}
            abertura={!D && !save.casa}
            historia={D ? hist : null}
            trancas={trancasCorrida}
            noConserto={noConserto}
            alvoChao={alvoChao}
            soTema={soTema}
            pistaFoco={focoFeira}
            temaMissao={temaMissao}
            onHistoria={onHistoria}
            // (B10, T03) a oficina: o mecânico é pago em água, só desempenho (o preço vem da economia)
            onComprar={(id) => setSave((s) => { const r = comprarMelhoria(s, id); return r.ok ? r.save : s })}
            onAbertura={() => { setCinema("lugar"); setCena({ lugar: "casa-dbee", missao: "ojala", pegar: false, inicio: true }) }}
            onArea={(id) => { if (id === "circuito:linha" && emTutorial(saveRef.current)) marcarTut("tanque") }}
            limitado={!!invasao}
            cacado={cacado || perseguido}
            conversa={!!aoVivo}
            onBifurca={setBifurcando}
            dicas={save.dicas}
            onDica={(d) => setSave((s) => (s.dicas.includes(d) ? s : { ...s, dicas: [...s.dicas, d] }))}
            onApreendido={apreender}
            caido={save.nucleo.caido}
            onReligar={religar}
            onSinal={(total, freq) => setSave((s) => ({ ...s, sinal: total, freq: freq ?? s.freq }))}
            alvo={HIST ? alvoDisco : save.nucleo.caido ? null : alvoTut ?? alvoDe(save, nivel)}
            levando={levarDrewboy(save) ? "copo" : null}
            tanque={save.tanque ?? 1}
            // (o zero sempre salva: antes o último pouquinho nunca virava 0 e a Kombi ficava na reserva pra sempre)
            onTanque={(n) => setSave((s) => (Math.abs((s.tanque ?? 1) - n) < 0.005 && !(n <= 0 && (s.tanque ?? 1) > 0) ? s : { ...s, tanque: n }))}
            onPosto={() => abrirPostoRef.current()}
            hora={save.hora ?? 18}
            onHora={(h) => setSave((s) => ({ ...s, hora: h, dia: virouODia(s.hora ?? 18, h) ? (s.dia ?? 1) + 1 : s.dia ?? 1 }))}
            dia={save.dia ?? 1}
            saltoHora={saltoHora}
            regadas={regadasHoje}
            onRegar={regouCanteiro}
            onMontanha={(n) => { setSave((s) => ganhar(s, n)); if (n >= 2) eventoDaRua("montanha") }}
            onAbastecer={(o) => {
              const s0 = saveRef.current
              // de patins (a gasolina acabou): o galão vai direto no tanque; se já tinha um cheio, só despeja
              if (o === "despejar") {
                const tinha = s0.galao === "cheio"
                if (!tinha && (s0.neon ?? 0) < PRECO_GALAO) return false
                setSave((s) => ({ ...s, neon: (s.neon ?? 0) - (tinha ? 0 : PRECO_GALAO), galao: "vazio", tanque: Math.min(1, (s.tanque ?? 0) + GALAO) }))
                return true
              }
              if (o === "tanque" ? (s0.neon ?? 0) < PRECO_TANQUE || (s0.tanque ?? 1) > 0.97 : (s0.neon ?? 0) < PRECO_GALAO || s0.galao !== "vazio") return false
              if (o === "tanque") encherTanque(); else encherGalao()
              return true
            }}
            postoAberto={!!noPosto}
            atalho={atalhoTeste}
            onApp={abrirApp}
            onMissoes={() => setPainelMissoes(true)}
            agua={save.agua ?? 0}
            onFuga={(n) => setSave((s) => ({ ...s, popularidade: Math.min(100, (s.popularidade ?? 0) + n) }))}
            onAgua={(d) => setSave((s) => ({ ...s, agua: Math.max(0, (s.agua ?? 0) + d) }))}
            checklistHolo={checklistHolo}
            mapaMissoes={mapaMissoes}
            mapaPainel={mapaPainel}
            onMapaIcone={(id) => setFocoFeira(id as PistaId)}
            missaoHolo={HIST ? (objetivoDisco ? { texto: objetivoDisco, cor: "#e0ff4f", n: 1 } : null) : resumoMissao ? { texto: listaMissoes.length > 1 && !missaoAgora ? "" : resumoMissao.texto, cor: resumoMissao.cor, n: listaMissoes.length } : listaMissoes.length ? { texto: "", cor: "#ffc857", n: listaMissoes.length } : null}
            onPegar={(k) => setSave((s) => (s.itens.includes(k) ? s : { ...s, itens: [...s.itens, k] }))}
            avisos={chamados(save, nivel).filter((c) => c.id === "ecos" || c.id === "antena" || c.id.startsWith("est-")).length}
            onDescer={descer}
            onSair={sairDaCorrida}
            onVaga={abrirCena}
            segredo={segredo}
            // (B18) as cenas do chão do subúrbio não puxam a câmera pra fachada da pista
            cenaLugar={cena && cena.especial !== "disco-oficina" && !(cena.especial === "disco-bar" && hist.fase === "bar") ? cena.lugar : null}
            // (disco, a história) a cidade quieta: só quem a história põe pra falar
            intro={HIST || (!D && !save.completos.includes("abertura"))}
            fala={falaIntro}
            onIlha={() => {
              // o grupo rolando: abre a conversa inteira; depois disso, a
              // ilha abre o celular (como o ícone)
              if (introGrupo !== null) {
                setIntroGrupo(null)
                setTela({ t: "chat", id: "grupo", volta: { t: "corrida", destino: null } })
              } else sairDaCorrida()
            }}
            onVolta={(t) => setSave((s) => ({ ...s, melhorVolta: s.melhorVolta ? Math.min(s.melhorVolta, t) : t }))}
            cinema={cinema}
            cinza={cinza}
            noiteRepete={save.objetos.includes("copo") ? 0 : (save.loops?.bar ?? 0)}
            foraDoAr={apagao}
          />
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
              if (!save.completos.includes("grupo")) setIntroGrupo(0)
            }}
          />
        )}
        {tela.t === "entrada" && (D ? <InicioDisco save={save} onEntrar={entrar} /> : <Entrada save={save} onEntrar={entrar} />)}
        {minhoca && <Minhoca onFim={fimMinhoca} />}
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
        {/* (T15–T25, T16) as peças das missões das pessoas (disco/pecas/): acabou, a próxima (ou a porta) segue sozinha */}
        {cenaAgora && <Peca key={`${cenaAgora.missao}:${cenaAgora.qual}`} id={cenaAgora.id} qual={cenaAgora.qual} cor={MISSOES13[cenaAgora.missao].cor} quem={MISSOES13[cenaAgora.missao].quem} onFim={(ok, obra) => {
          const c = cenaAgora
          setSave((s) => comHistoria(s, (x) => ({ ...x, aberta13: undefined, obras13: obra ? { ...(x.obras13 ?? {}), [`${c.missao}:${c.qual}`]: obra } : x.obras13 })))
          barFechou.current = Date.now()
          track("mission_step", { mission_id: `disco-${c.missao}`, step: c.id, perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
          if (ok) pecaFeitaNaMissao(c.missao, c.qual)
        }} />}
        {pingpong && <PingPong cor="#6d7bff" onFim={(venceu) => {
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
        {oficinaTela === "bancada" && <Bancada onFim={() => {
          setOficinaTela(null)
          setSave((s) => comHistoria(s, (h) => concluir(h, "oficina", "arte")))
          setTimeout(() => setFalaIntro({ id: Date.now(), de: MECANICO.nome, texto: FALAS_OFICINA.painel }), 900)
          track("mission_step", { mission_id: "disco-oficina", step: "bancada", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
        }} />}
        {oficinaTela === "painel" && <PainelLixao onFim={() => {
          setOficinaTela(null)
          setSave((s) => comHistoria(s, (h) => ({ ...h, oficina: { ...(h.oficina ?? {}), painel: true } })))
          setTimeout(() => setFalaIntro({ id: Date.now(), de: MECANICO.nome, texto: FALAS_OFICINA.goteira }), 900)
          track("mission_step", { mission_id: "disco-oficina", step: "painel", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
        }} />}
        {oficinaTela === "goteira" && <Goteira onFim={(gotas) => {
          setOficinaTela(null)
          setSave((s) => comHistoria(s, (h) => concluir({ ...h, oficina: { ...(h.oficina ?? {}), tanque: gotas } }, "oficina", "jogo")))
          setTimeout(() => setFalaIntro({ id: Date.now(), de: MECANICO.nome, texto: FALAS_OFICINA.voltar }), 900)
          track("mission_step", { mission_id: "disco-oficina", step: "goteira", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
        }} />}
        {oficinaTela === "pagar" && <Pagamento agua={save.agua ?? 0} onPago={(n) => setSave((s) => gastar(s, n, "agua") ?? s)} onFim={montarMotor} />}
        {/* (T02) a porta abriu: a recompensa, grande; "seguir" volta direto pro jogo */}
        {recompensa && <Recompensa r={recompensa} onSeguir={() => {
          const r = recompensa
          setRecompensa(null)
          const m = MISSOES13[r.missao]
          // (T16) a loja de discos abriu: ela abre, pra comprar o primeiro disco com a grana
          if (r.abriu.some((x) => x.id === "loja-discos")) { setTela({ t: "app", id: "loja" }); return }
          if (m.faixa && m.onde === "cidade") setOuvirFim({ pista: m.faixa, id: Date.now() })
        }} />}
        {/* (T02, J2: 23) a rua: o Guitar Driver aberto desde o começo, com as músicas que as missões liberaram */}
        {rua && <Palcos h={h13} onFechar={() => setRua(false)} onTocar={(palco, f) => { setRua(false); setSave((s) => comHistoria(s, (x) => ({ ...x, show: showDoPalco(palco, f) }))) }} />}
        {jornal && <Jornal m={jornal} cor={confShow(`rua:${jornal.missao}`)?.cor ?? "#ffc857"} onFechar={() => setJornal(null)} />}
        {ouvirFim && !jornal && tela.t === "corrida" && <OuvirFim key={ouvirFim.id} pista={ouvirFim.pista} quando={ouvirFim.id} onFechar={fecharOuvir} />}
        {visor && <Visor id={visor} onFechar={() => setVisor(null)}>{visor === "freq" ? <Freq save={save} /> : undefined}</Visor>}
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
              if (fonteSom.get() === "radio") tocarRadio((save.freq as FreqId) || "linha")
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
            onApp={abrirApp}
            onVoltar={() => setTela({ t: "home" })}
            onJogou={(id, pulou) => {
              setSave((s) => ({ ...s, jogados: { ...s.jogados, [id]: (s.jogados[id] ?? 0) + 1 } }))
            }}
          />
        )}
        {tela.t === "app" && tela.id === "jardim" && (
          <Jardim save={save} atualizar={atualizar} onVoltar={() => setTela({ t: "home" })} />
        )}
        {tela.t === "app" && tela.id === "violao" && <Violao onVoltar={() => setTela({ t: "home" })} />}
        {tela.t === "app" && tela.id === "ouvir" && <Ouvir onVoltar={() => setTela({ t: "home" })} />}
        {tela.t === "app" && tela.id === "loja" && <Loja save={save} comprar={comprarNaLoja} onVoltar={() => setTela({ t: "home" })} />}
        {tela.t === "app" && tela.id === "objetos" && (
          <Objetos save={save} onVoltar={() => setTela({ t: "home" })} onChat={(id) => abrirChat(id, { t: "app", id: "objetos" })} onUsarGalao={() => setSave((s) => (s.galao === "cheio" ? { ...s, galao: "vazio", tanque: Math.min(1, (s.tanque ?? 0) + GALAO) } : s))} />
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
          <Interior key={`sala:${cena.lugar}`} lugar={cena.lugar} objetos={save.objetos} inicio={!!cena.inicio} copos={save.copos} popularidade={save.popularidade ?? 0} disco={cena.especial === "disco-casa" || cena.especial === "disco-bar"} />
        )}
        {cena && (
          <CenaLugar
            key={`${cena.lugar}:${cena.missao}:${cena.inicio ? "inicio" : cena.especial ?? ""}`}
            gestos3d={GESTOS_3D[cena.lugar] ?? []}
            loops={save.loops?.[cena.lugar] ?? 0}
            cena={cena.especial === "disco-casa" ? CENA_CASA_DISCO : cena.especial === "disco-bar" ? CENA_BAR_PROLOGO : cena.especial === "disco-oficina" ? CENA_OFICINA : cena.inicio ? CENA_INICIO : cena.especial === "mubarak-drew" ? CENA_MUBARAK_DREW : cenaDe(cena.lugar)!}
            memoria={save.objetos.length}
            objetos={save.objetos}
            reliquias={(save.reliquias ?? []) as Reliquia[]}
            tom={tomMaior}
            semSom={semSom}
            onLinha={(texto) => setSave((s) => ({ ...s, linha: texto }))}
            onTom={(tom) => setSave((s) => ({ ...s, tons: { ...s.tons, [tom]: (s.tons?.[tom] ?? 0) + 1 } }))}
            onFim={cena.especial === "disco-casa" ? fimCasaDisco : cena.especial === "disco-bar" ? fimBarDisco : cena.especial === "disco-oficina" ? fimOficina : cena.inicio ? fimInicio : cena.especial === "mubarak-drew" ? fimMubarakDrew : fimCena}
            onNeon={(n) => setSave((s) => ganhar(s, n))}
          />
        )}
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
