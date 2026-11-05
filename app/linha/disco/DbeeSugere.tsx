"use client"

// A D-BEE SUGERE (05/11): quem decide a HORA de a D-Bee falar e marca o alvo.
// O que ela fala mora no catálogo (sugestoesDbee.ts).
//
// - Quando: sem missão pegada e nada acontecendo há um tempo (DBEE_CFG.paradoMs),
//   ou uns segundos depois de acabar alguma coisa (corrida, racha, peça, sala, missão).
//   No máximo uma a cada ~90 s, nunca a mesma seguida, nunca durante corrida,
//   racha, peça, intro, cena, perseguição ou pedra da trilha. Só na carreira e no
//   jogo livre (antes disso a história guia).
// - Como: no notch, "D-Bee: …" por uns segundos. Tocar na frase marca o alvo no
//   mapa (a mesma marca do mapa: o GPS, a rota, o drone e o piloto seguem ela).
//   Nenhuma tela abre.
// - Lembra (a memória viva do catálogo; a página grava no save): o que passou,
//   quantas vezes, o que ele já fez.
//
// Desempenho: nada por quadro e nada na cena 3D. Um setInterval de 3 s que lê
// refs; a escolha (e a conta das distâncias) só roda na hora de falar.

import { useEffect, useRef } from "react"
import type { Mundo } from "../estrada/mundo"
import type { MundoDisco } from "../estrada/mundoDisco"
import type { Marca, IconeMapa } from "../estrada/Mapa"
import { noMundo } from "../estrada/Mapa"
import { notch, lerNexoTutorial } from "../estrada/Holo"
import { pistaPerto } from "../estrada/nav"
import { pontoDoAlvo } from "../estrada/alvoMissao"
import { pontosDoMapa } from "../estrada/pontosMapa"
import { PISTAS, type PistaId } from "../estrada/pistas"
import { fonteSom } from "../som"
import { zonaSomAgora } from "./radioAntiga"
import { tvAberta } from "./TvHolo"
import { RUA, type PlacarRua } from "./corridaRua"
import { TRILHA_NA_TELA } from "./trilhaPedras"
import { CHAO_LUGARES, type HistoriaDisco } from "./historia"
import type { MissaoId } from "./portas"
import {
  DBEE_CFG, comFeita, comSugerida, escolherDbee, lerMemoriaDbee, mudarMemoriaDbee,
  type AlvoDbee, type CtxDbee, type OpcaoDbee,
} from "./sugestoesDbee"

type JogoDbee = { via: number; u: number; voo?: boolean; wx?: number; wz?: number }
type CombDbee = { aqui?: { x: number; z: number }; patins?: boolean; moto?: boolean }

export interface PropsDbee {
  M: Mundo
  jogo: React.RefObject<JogoDbee>
  comb: React.RefObject<CombDbee>
  input: React.RefObject<{ infinito?: boolean }>
  horaRef: React.RefObject<number>
  marcaRef: React.RefObject<Marca | null>
  onMarcar: (m: Marca | null) => void
  racha: React.RefObject<{ fase: string }>
  historia: HistoriaDisco | null
  missoes: IconeMapa[] | null
  apagada: boolean[] | null
  corridaRua: boolean
  motoOk: boolean
  ruaSuburbio?: PlacarRua
  // a Corrida junta o que ocupa a tela: pausado (peça, sala, celular), intro,
  // cena, chegada, perseguição, drone…
  ocupado: boolean
}

// a frase no notch
export const textoDbee = (o: OpcaoDbee) => `D-Bee: ${o.texto}`

export function DbeeSugere(props: PropsDbee) {
  const P = useRef(props)
  useEffect(() => { P.current = props })

  useEffect(() => {
    const M = props.M
    if (!("disco" in M)) return
    const D = M as MundoDisco
    // a pista (índice em M.pistas) de cada faixa
    const kDaPista = new Map<PistaId, number>()
    D.pistas.forEach((p, k) => { const f = PISTAS.find((x) => x.faixa === p.nome); if (f) kDaPista.set(f.id, k) })
    const pistaDoK = new Map<number, PistaId>([...kDaPista].map(([id, k]) => [k, id]))

    // onde fica um alvo: o ponto do mundo e a marca do mapa (cache por alvo)
    const cache = new Map<string, Marca | null>()
    const chaveAlvo = (a: AlvoDbee) => (a.t === "chao" ? `c:${a.chao}` : a.t === "lugar" ? `l:${a.lugar}` : a.t === "pagina" ? `p:${a.id}` : a.t === "pista" ? `r:${a.pista}` : `x:${Math.round(a.x)}:${Math.round(a.z)}`)
    const noChao = (x: number, z: number, nome: string, cor: string, chave: string): Marca | null => {
      const pp = pistaPerto(M, `dbee:${chave}`, x, z, P.current.apagada)
      return pp.via >= 0 ? { via: pp.via, u: pp.u, nome, cor, wx: x, wz: z } : null
    }
    const marcaDe = (a: AlvoDbee, nome?: string, cor?: string): Marca | null => {
      const k = chaveAlvo(a)
      const c0 = cache.get(k)
      let m: Marca | null
      if (c0 !== undefined) m = c0
      else {
        m = null
        if (a.t === "chao") { const c = CHAO_LUGARES[a.chao]; m = noChao(c.x, c.z, c.nome.toLowerCase(), c.cor, k) }
        else if (a.t === "ponto") m = noChao(a.x, a.z, "", DBEE_CFG.cor, k)
        else if (a.t === "lugar") { const p = pontoDoAlvo(M, { lugar: a.lugar }); if (p && p.via !== undefined && p.u !== undefined) m = { via: p.via, u: p.u, nome: "", cor: DBEE_CFG.cor } }
        else if (a.t === "pagina") { const p = pontosDoMapa(M, {}).find((x) => x.id === a.id); if (p && p.via !== undefined && p.u !== undefined) m = { via: p.via, u: p.u, nome: p.nome, cor: p.cor } }
        else if (a.t === "pista") { const kk = kDaPista.get(a.pista); if (kk !== undefined) { const via = D.pistas[kk].ida; m = { via, u: Math.round(M.vias[via].L * 0.12), nome: D.pistas[kk].nome, cor: D.pistas[kk].cor } } }
        cache.set(k, m)
      }
      return m ? { ...m, nome: nome || m.nome || "o lugar", cor: cor ?? m.cor } : null
    }
    const pontoDa = (m: Marca) => (m.wx !== undefined && m.wz !== undefined ? { x: m.wx, z: m.wz } : noMundo(M, m))
    const ondeEstou = () => {
      const a = P.current.comb.current?.aqui
      if (a) return { x: a.x, z: a.z }
      const j = P.current.jogo.current
      if (!j) return null
      if (j.wx !== undefined && j.wz !== undefined && j.voo) return { x: j.wx, z: j.wz }
      return M.vias[j.via] ? noMundo(M, j) : null
    }

    const st = {
      ultima: Date.now() - DBEE_CFG.intervaloMs + DBEE_CFG.primeiraMs, // a primeira: primeiraMs depois de abrir
      livreDesde: 0,
      ocupadoAntes: false,
      depois: 0, // acabou alguma coisa: fala a partir daqui
      // a marca que ela pôs (pra tirar quando ele chega, e só a dela)
      marca: null as Marca | null,
      chaveMarca: "",
    }

    const olhar = () => {
      const p = P.current
      const agora = Date.now()
      const h = p.historia
      const comb = p.comb.current
      const veiculo: CtxDbee["veiculo"] = comb?.patins ? (comb.moto ? "moto" : "patins") : "kombi"
      const zona = zonaSomAgora() ?? "cidade"
      const radioLigada = fonteSom.get() === "radio"
      const tv = tvAberta()
      const piloto = !!p.input.current?.infinito

      // ── o que o jogo já viu ele fazer ──
      const viu: string[] = []
      if (veiculo === "moto") viu.push("moto")
      if (radioLigada && (zona === "suburbio" || zona === "tuneis")) viu.push("radio-xenom")
      if (tv) viu.push("tv")
      if (piloto) viu.push("piloto")
      if ((p.ruaSuburbio?.corridas ?? 0) > 0) viu.push("corrida-rua")
      // chegou no alvo que ela marcou: feito, e a marca dela sai
      if (st.marca) {
        const eu = ondeEstou(), w = pontoDa(st.marca)
        const d = eu ? Math.hypot(eu.x - w.x, eu.z - w.z) : Infinity
        // (o mapa tira a marca da pista sozinho a 40 m da rota: sem marca e perto, também chegou)
        if (d < DBEE_CFG.chegouM || (!p.marcaRef.current && d < DBEE_CFG.chegouM * 3)) {
          // a rua só conta quando a faixa toca inteira (as ouvidas), não ao chegar nela
          if (st.chaveMarca && !st.chaveMarca.startsWith("rua:")) viu.push(st.chaveMarca)
          if (p.marcaRef.current === st.marca) p.onMarcar(null)
          st.marca = null; st.chaveMarca = ""
        } else if (p.marcaRef.current !== st.marca) { st.marca = null; st.chaveMarca = "" } // ele trocou a marca
      }
      if (viu.length) mudarMemoriaDbee((m) => viu.reduce(comFeita, m))

      // ── pode falar? ──
      const fase = h?.fase ?? null
      const missaoAtiva = !!h?.missao || !!p.missoes?.some((x) => x.agora)
      const corrida = RUA.e.fase === "contagem" || RUA.e.fase === "valendo" || RUA.e.fase === "fim"
      const racha = !!p.racha.current && p.racha.current.fase !== "solto" && p.racha.current.fase !== "oferta"
      // pegou uma missão: a marca dela sai (o GPS volta pra missão)
      if (missaoAtiva && st.marca) { if (p.marcaRef.current === st.marca) p.onMarcar(null); st.marca = null; st.chaveMarca = "" }
      const ocupado = p.ocupado || corrida || racha || !!lerNexoTutorial() || !!TRILHA_NA_TELA.pedra || missaoAtiva || (fase !== "carreira" && fase !== "livre")
      if (ocupado) { st.livreDesde = 0; st.ocupadoAntes = true; st.depois = 0; return }
      if (!st.livreDesde) st.livreDesde = agora
      if (st.ocupadoAntes) { st.ocupadoAntes = false; st.depois = agora + DBEE_CFG.depoisDeAlgoMs }
      if (agora - st.ultima < DBEE_CFG.intervaloMs) return
      const quer = (st.depois && agora >= st.depois) || agora - st.livreDesde >= DBEE_CFG.paradoMs
      if (!quer) return

      // ── o que dá pra fazer agora ──
      const j = p.jogo.current
      const k = j && !j.voo && veiculo === "kombi" ? D.info[j.via]?.pista ?? -1 : -1
      const naRua = k >= 0 ? pistaDoK.get(k) ?? null : null
      const ruas = [...kDaPista].filter(([, kk]) => !p.apagada?.[D.pistas[kk].ida]).map(([id]) => id)
      const disponiveis = (p.missoes ?? []).filter((x) => !x.agora && !x.feita).map((x) => x.id as MissaoId)
      const eu = ondeEstou()
      const ctx: CtxDbee = {
        fase, h, zona, hora: p.horaRef.current ?? 18, veiculo, motoLiberada: p.motoOk, radioLigada, tvAberta: tv, piloto,
        naRua, ruas, disponiveis, corridaRua: p.corridaRua, ruaSuburbio: p.ruaSuburbio, mem: lerMemoriaDbee(),
        distancia: (a) => { const m = marcaDe(a); if (!m || !eu) return -1; const w = pontoDa(m); return Math.hypot(w.x - eu.x, w.z - eu.z) },
      }
      const o = escolherDbee(ctx)
      // nada pra sugerir agora: tenta de novo daqui a pouco (não queima os 90 s)
      if (!o) { st.livreDesde = agora - DBEE_CFG.paradoMs + 20000; st.depois = 0; return }
      st.ultima = agora
      st.livreDesde = agora
      st.depois = 0
      mudarMemoriaDbee((m) => comSugerida(m, o.chave))
      const toque = o.alvo ? () => {
        const m = marcaDe(o.alvo!, o.nome, o.cor)
        if (!m) return
        st.marca = m
        st.chaveMarca = o.chave
        P.current.onMarcar(m)
        try { navigator.vibrate?.(18) } catch {}
      } : undefined
      notch(textoDbee(o), DBEE_CFG.cor, { toque, fica: DBEE_CFG.ficaMs })
    }

    const t = setInterval(olhar, DBEE_CFG.cadaMs)
    return () => clearInterval(t)
  }, [props.M])

  return null
}
