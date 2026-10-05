"use client"

// A CENA de um lugar, por cima da estrada parada (a câmera de cinema já
// cortou pro lugar, em Corrida). Tarja de cinema em cima e embaixo, legenda
// com quem fala, escolha nos três tons e o GESTO do lugar. Toca na tela pra
// seguir. Roteiros em cenas.ts.

import { useEffect, useMemo, useRef, useState } from "react"
import { COPOS, RELIQUIAS, type Cena, type PassoCena, type Reliquia } from "./cenas"
import { estacao as getEstacao, type EstacaoId } from "./data"
import { MEMORIAS } from "./missoes"
import { LUGARES } from "./lugares"
import { VOZES, type Tom } from "./roteiros"
import { gota, mudo } from "./som"
import { Prova } from "./provas"
import { vib } from "./som-carro"
import { ouvirSala, publicar, zerar } from "./interior/bus"

export interface ResultadoCena {
  objeto?: EstacaoId
  reliquias: Reliquia[]
  caca: boolean
  perdeViolao?: boolean
  // saiu com a escolha errada: a missão fica aberta e o mundo estranha
  loop?: boolean
}

type Fila = { de?: string; texto: string; tipo: "fala" | "acao" | "nucleo" }[]


// `gestos3d`: os gestos que a sala em 3D faz (interior/): a legenda só dá
// a dica e espera a sala avisar que acabou
export function CenaLugar({ cena: cenaBruta, memoria, objetos, reliquias = [], tom: tomAgora = "dormindo", semSom = false, gestos3d = [], loops = 0, onTom, onLinha, onFim }: { cena: Cena; memoria: number; objetos: EstacaoId[]; reliquias?: Reliquia[]; tom?: Tom; semSom?: boolean; gestos3d?: string[]; loops?: number; onTom: (t: Tom) => void; onLinha?: (texto: string) => void; onFim: (r: ResultadoCena) => void }) {
  // o tom vale o do começo da cena (responder no meio não reembaralha os passos)
  const [tom] = useState(tomAgora)
  // os passos com `se` só entram se a pessoa já passou por aquela estação;
  // com `tom`, só pra quem está naquele tom; com `rel`, só pra quem tem a relíquia
  const cena = useMemo(() => ({
    ...cenaBruta,
    passos: cenaBruta.passos.filter((p) =>
      (!("se" in p) || !p.se || objetos.includes(p.se)) &&
      (!("tom" in p) || !p.tom || p.tom.includes(tom)) &&
      (!("rel" in p) || !p.rel || reliquias.includes(p.rel)) &&
      (!("volta" in p) || !p.volta || (p.volta === "sim") === (loops > 0))),
  }), [cenaBruta, objetos, reliquias, tom, loops])
  const [pos, setPos] = useState(0)
  const [fila, setFila] = useState<Fila>([])
  const [ganhos, setGanhos] = useState<{ objeto?: EstacaoId; reliquias: Reliquia[]; perdeViolao?: boolean }>({ reliquias: [] })
  const [letras, setLetras] = useState(0)
  // bebeu: a escolha errada. A cena acaba aqui e a pessoa sai do lugar
  const [saida, setSaida] = useState(false)
  // 10 s parada olhando o balcão: aí aparece a saída (negar). Quem já saiu
  // errado uma vez vê de cara
  const [esperou, setEsperou] = useState(false)
  const passo: PassoCena | undefined = cena.passos[pos]
  // o que está na legenda agora: primeiro a fila (respostas), depois o passo
  const atual = fila[0] ?? (saida ? null : passo && (passo.t === "fala" || passo.t === "acao" || passo.t === "nucleo") ? { de: passo.t === "fala" ? passo.de : undefined, texto: passo.texto, tipo: passo.t } : passo?.t === "perde" ? { texto: passo.texto, tipo: "acao" as const } : null)
  const chave = `${pos}:${fila.length}:${atual?.texto ?? ""}`
  // fala nova: a legenda recomeça do zero (ajuste no render, sem efeito)
  const [chaveAnt, setChaveAnt] = useState(chave)
  if (chaveAnt !== chave) { setChaveAnt(chave); setLetras(0) }
  // o cartão do que ganhou sai direto do passo
  const mostrando = !fila.length && passo?.t === "ganha" ? passo : null

  // conta pra sala o que está acontecendo (quem fala, gesto, escolha…)
  // os minijogos antigos entram como "prova:<id>" (a sala pode assumir um deles)
  const gestoAgora = !atual && passo?.t === "gesto" ? (passo.id === "prova" ? `prova:${passo.prova}` : passo.id) : null
  useEffect(() => {
    publicar({ pos, falando: atual?.de ?? null, texto: atual?.texto ?? null, gesto: gestoAgora, escolha: !atual && passo?.t === "escolha", ganha: !!mostrando })
  }, [pos, atual?.de, atual?.texto, gestoAgora, passo?.t, !!atual, mostrando]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => zerar(), [])
  // e ouve a sala: uma fala solta, um copo bebido, o gesto acabou
  useEffect(() => ouvirSala((sn) => {
    if (sn.t === "fala") setFila((f) => [...f, { de: sn.de, texto: sn.texto, tipo: sn.tipo ?? "fala" }])
    else if (sn.t === "bebeu") setSaida(true)
    else if (sn.t === "fim-gesto") setPos((p) => p + 1)
  }), [])
  const gesto3d = gestoAgora !== null && gestos3d.includes(gestoAgora) && !saida
  useEffect(() => {
    if (gestoAgora !== "copos") return
    const t = setTimeout(() => setEsperou(true), 10000)
    return () => clearTimeout(t)
  }, [gestoAgora])
  // explorar só existe com a sala em 3D: sem ela (aparelho que não aguentou),
  // a cena segue sozinha
  useEffect(() => {
    if ((gestoAgora !== "quarto" && gestoAgora !== "casa" && gestoAgora !== "casa-inicio") || gesto3d) return
    const t = setTimeout(() => setPos((p) => p + 1), 0)
    return () => clearTimeout(t)
  }, [gestoAgora, gesto3d])

  // máquina de escrever na legenda
  useEffect(() => {
    if (!atual) return
    const t = setInterval(() => setLetras((n) => {
      if (n >= atual.texto.length) { clearInterval(t); return n }
      return n + 2
    }), 22)
    if (atual.tipo === "nucleo") vib(20)
    else gota(3)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])


  const avancar = () => {
    if (!atual) return
    if (letras < atual.texto.length) { setLetras(atual.texto.length); return }
    if (fila.length) { setFila((f) => f.slice(1)); return }
    if (passo?.t === "perde") setGanhos((g) => ({ ...g, perdeViolao: true }))
    setPos((p) => p + 1)
  }

  const escolher = (o: { label: string; tom: Tom; resposta: { de: string; texto: string }[] }) => {
    onTom(o.tom)
    setFila([{ de: "você", texto: o.label, tipo: "fala" }, ...o.resposta.map((r) => ({ de: r.de, texto: r.texto, tipo: "fala" as const }))])
    setPos((p) => p + 1)
  }

  const fecharGanho = () => {
    if (mostrando) setGanhos((g) => ({ objeto: mostrando.objeto ?? g.objeto, reliquias: mostrando.reliquia ? [...g.reliquias, mostrando.reliquia] : g.reliquias }))
    setPos((p) => p + 1)
  }

  return (
    <div className={`l-cena ${atual ? "" : "is-livre"} ${gestos3d.length ? "is-sala" : ""}`} onClick={atual ? avancar : undefined}>
      <div className="l-cena-tarja is-cima" />
      <div className="l-cena-tarja is-baixo" />
      <small className="l-cena-lugar">{cena.titulo ?? [LUGARES[cena.lugar].letreiro.toLowerCase(), LUGARES[cena.lugar].nome].filter(Boolean).join(" · ")}</small>

      {atual && atual.tipo === "nucleo" && (
        <div className="l-cena-nucleo"><b>NÚCLEO</b><p>{atual.texto.slice(0, letras)}</p></div>
      )}
      {atual && atual.tipo !== "nucleo" && (
        <div className={`l-cena-legenda is-${atual.tipo}`} style={{ ["--cor" as string]: atual.de ? VOZES[atual.de] ?? (atual.de === "ela" ? "#ff3f7a" : "#e6f0ff") : "#e6f0ff" }}>
          {atual.de && <small>{atual.de}</small>}
          <p>{atual.texto.slice(0, letras)}</p>
          {letras >= atual.texto.length && <i className="l-cena-toque">toca pra seguir</i>}
        </div>
      )}

      {!atual && passo?.t === "escolha" && (
        <div className="l-cena-escolhas" onClick={(e) => e.stopPropagation()}>
          {passo.opcoes.map((o) => (
            <button key={o.label} type="button" onClick={() => escolher(o)}>{o.label}</button>
          ))}
        </div>
      )}

      {gesto3d && <Dica3d id={gestoAgora!} podeNegar={loops > 0 || esperou} voltou={loops > 0} onNegar={() => setPos((p) => p + 1)} />}
      {!gesto3d && !saida && !atual && passo?.t === "gesto" && passo.id === "copos" && <Copos onNegar={() => setPos((p) => p + 1)} onBeber={() => setSaida(true)} podeNegar={loops > 0 || esperou} />}
      {saida && !atual && (
        <div className="l-cena-fim" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => onFim({ reliquias: [], caca: false, loop: true })}>sair do bar →</button>
        </div>
      )}
      {!gesto3d && !atual && passo?.t === "gesto" && passo.id === "danca" && <Danca onFim={() => setPos((p) => p + 1)} />}
      {!gesto3d && !atual && passo?.t === "gesto" && passo.id === "tocar" && <Danca titulo="toca no ritmo" rotulo="artistas olhando pela janela" total={9} cor="#e6f0ff" sobe onFim={() => setPos((p) => p + 1)} />}
      {!gesto3d && !atual && passo?.t === "gesto" && passo.id === "fuga" && <Fuga onFim={() => setPos((p) => p + 1)} />}
      {!gesto3d && !atual && passo?.t === "gesto" && passo.id === "ordem" && <Ordem frases={passo.frases} onFim={() => setPos((p) => p + 1)} />}
      {!gesto3d && !atual && passo?.t === "gesto" && passo.id === "silencio" && <Silencio semSom={semSom} onFim={() => setPos((p) => p + 1)} />}
      {!gesto3d && !atual && passo?.t === "gesto" && passo.id === "linha" && <Linha onFim={(t) => { onLinha?.(t); setPos((p) => p + 1) }} />}
      {!gesto3d && !atual && passo?.t === "gesto" && passo.id === "prova" && (
        <div className="l-cena-prova" onClick={(e) => e.stopPropagation()}>
          <Prova id={passo.prova} cor={LUGARES[cena.lugar].cor} onFim={() => setPos((p) => p + 1)} />
        </div>
      )}

      {mostrando && (
        <Ganho objeto={mostrando.objeto} reliquia={mostrando.reliquia} titulo={mostrando.titulo} texto={mostrando.texto} memoria={mostrando.objeto ? memoria : null} onOk={fecharGanho} />
      )}

      {!atual && passo?.t === "fim" && (
        <div className="l-cena-fim" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => onFim({ objeto: ganhos.objeto, reliquias: ganhos.reliquias, caca: !!passo.caca, perdeViolao: ganhos.perdeViolao })}>voltar pra kombi →</button>
        </div>
      )}
    </div>
  )
}

// a dica do gesto feito na sala em 3D (o toque é lá; aqui só o texto e, no
// bar, a saída que ninguém escolhe)
const DICAS_3D: Record<string, string> = {
  copos: "toca num copo no balcão",
  danca: "toca na pista no ritmo",
  tocar: "toca no violão no ritmo",
  ordem: "toca as frases na parede, na ordem",
  "prova:regar": "toca nas gotas pra regar a flor",
  fuga: "toca rápido: corre pra porta",
  casa: "procura pela casa. toca no que chamar sua atenção",
  quarto: "olha o quarto. toca no que chamar sua atenção",
  "casa-inicio": "olha em volta. toca no que chamar sua atenção",
}
function Dica3d({ id, podeNegar, voltou, onNegar }: { id: string; podeNegar: boolean; voltou: boolean; onNegar: () => void }) {
  const texto = id === "copos" ? (voltou ? "o mesmo balcão. a mesma escolha?" : DICAS_3D.copos) : DICAS_3D[id] ?? "toca na cena"
  return (
    <div className="l-dica3d" onClick={(e) => e.stopPropagation()}>
      <small>{texto}</small>
      {id === "copos" && podeNegar && <button type="button" className="l-copos-negar" onClick={onNegar}>negar a oferta</button>}
    </div>
  )
}

// O GESTO do bar: seis copos, cada um uma promessa. Beber é um loop: a
// noite volta pro começo e o bar fica mais bonito e mais vazio. Depois do
// primeiro, aparece a saída que ninguém escolhe: negar a oferta
function Copos({ onNegar, onBeber, podeNegar }: { onNegar: () => void; onBeber: () => void; podeNegar: boolean }) {
  const [bebidos, setBebidos] = useState<string[]>([])
  const [loop, setLoop] = useState<{ n: number; copo: string } | null>(null)
  const todos = bebidos.length === COPOS.length
  const beber = (id: string) => {
    vib([20, 40, 20])
    gota(1)
    setBebidos((b) => [...b, id])
    setLoop({ n: bebidos.length + 1, copo: id })
    setTimeout(onBeber, 1800)
  }
  const fala = useMemo(() => {
    if (!loop) return null
    const c = COPOS.find((x) => x.id === loop.copo)!
    return c.promessa
  }, [loop])
  return (
    <div className={`l-copos ${loop ? "is-loop" : ""}`} onClick={(e) => e.stopPropagation()} style={{ ["--vazio" as string]: String(bebidos.length / COPOS.length) }}>
      {loop && (
        <div key={loop.n} className="l-copos-loop">
          <p className="l-copos-ela">{fala}</p>
          <small>a noite volta pro começo. noite {loop.n + 1}. o bar tá mais bonito. e mais vazio</small>
          <p className="l-copos-mub">Mubarak: chegou. senta aí</p>
        </div>
      )}
      {todos ? (
        <p className="l-copos-ela">agora que você encontrou todas as respostas, o que mais poderia querer?</p>
      ) : (
        <div className="l-copos-grade">
          {COPOS.map((c) => (
            <button key={c.id} type="button" className={bebidos.includes(c.id) ? "is-bebido" : ""} disabled={bebidos.includes(c.id)} onClick={() => beber(c.id)}>
              <i aria-hidden />
              <b>{c.nome}</b>
            </button>
          ))}
        </div>
      )}
      {podeNegar && bebidos.length === 0 && (
        <button type="button" className="l-copos-negar" onClick={onNegar}>negar a oferta</button>
      )}
    </div>
  )
}

// O GESTO da balada: o Drewboy dança e você marca o ritmo. Um anel fecha no
// compasso; tocar quando ele encosta no círculo é acertar. Cada acerto abaixa
// uns celulares na pista. Oito e ele se solta (errar não tira nada)
const BATIDA = 560 // ms (~107 bpm)
function Danca({ onFim, titulo = "toca no ritmo", rotulo = "celulares levantados", total = 200, cor = "#ff3fb0", sobe = false }: { onFim: () => void; titulo?: string; rotulo?: string; total?: number; cor?: string; sobe?: boolean }) {
  const [t0] = useState(() => performance.now())
  const [acertos, setAcertos] = useState(0)
  const [ultimo, setUltimo] = useState<{ ok: boolean; n: number } | null>(null)
  const META = 8
  const tocar = () => {
    const fase = ((performance.now() - t0) % BATIDA) / BATIDA
    const ok = fase > 0.8 || fase < 0.12
    if (ok) { vib(18); gota(5); setAcertos((a) => a + 1) }
    setUltimo((u) => ({ ok, n: (u?.n ?? 0) + 1 }))
  }
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])
  useEffect(() => {
    if (acertos < META) return
    const t = setTimeout(() => fim.current(), 900)
    return () => clearTimeout(t)
  }, [acertos])
  // na balada os celulares descem; no vagão os artistas vão olhando pra fora
  const conta = sobe ? Math.round((acertos / META) * total) : Math.max(0, total - Math.round((acertos / META) * total))
  return (
    <div className="l-danca" onClick={(e) => { e.stopPropagation(); if (acertos < META) tocar() }} style={{ ["--batida" as string]: `${BATIDA}ms`, ["--cor" as string]: cor }}>
      <div className="l-danca-alvo">
        <i className="l-danca-anel" />
        <b>{acertos >= META ? "solta" : titulo}</b>
      </div>
      {ultimo && <small key={ultimo.n} className={`l-danca-eco ${ultimo.ok ? "is-ok" : ""}`}>{ultimo.ok ? "isso" : "…"}</small>}
      <p className="l-danca-conta">{rotulo}: {conta}</p>
      <div className="l-danca-barra"><i style={{ width: `${(acertos / META) * 100}%` }} /></div>
    </div>
  )
}

// O GESTO do vagão: correr até a porta antes do policial. Cada toque é um
// passo; ele vem atrás no ritmo dele. Não tem como perder: dá tempo
function Fuga({ onFim }: { onFim: () => void }) {
  const [passos, setPassos] = useState(0)
  const [t0] = useState(() => Date.now())
  const [agora, setAgora] = useState(t0)
  const META = 14
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])
  useEffect(() => {
    const iv = setInterval(() => setAgora(Date.now()), 150)
    return () => clearInterval(iv)
  }, [])
  useEffect(() => {
    if (passos < META) return
    const t = setTimeout(() => fim.current(), 500)
    return () => clearTimeout(t)
  }, [passos])
  const policial = Math.min(0.85, (agora - t0) / 14000)
  return (
    <div className="l-fuga" onClick={(e) => { e.stopPropagation(); if (passos < META) { setPassos((p) => p + 1); vib(10) } }}>
      <b>{passos >= META ? "pula" : "corre pra porta"}</b>
      <div className="l-fuga-trilho">
        <i className="l-fuga-voce" style={{ left: `${(passos / META) * 100}%` }} />
        <i className="l-fuga-policial" style={{ left: `${policial * Math.max(0.2, passos / META) * 100}%` }} />
        <span>porta</span>
      </div>
      <small>toca rápido</small>
    </div>
  )
}

// O GESTO do terraço: 15 segundos de silêncio absoluto. O jogo inteiro cala
// (sem música, sem legenda, sem nada), só a cidade lá embaixo
function Silencio({ semSom, onFim }: { semSom: boolean; onFim: () => void }) {
  const [t0] = useState(() => Date.now())
  const [agora, setAgora] = useState(t0)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])
  useEffect(() => {
    mudo(true)
    const iv = setInterval(() => setAgora(Date.now()), 250)
    const t = setTimeout(() => { mudo(semSom); fim.current() }, 15000)
    return () => { clearInterval(iv); clearTimeout(t); mudo(semSom) }
  }, [semSom])
  const p = Math.min(1, (agora - t0) / 15000)
  return (
    <div className="l-silencio" onClick={(e) => e.stopPropagation()}>
      <i style={{ transform: `scaleX(${p})` }} />
    </div>
  )
}

// O GESTO do beco: a moradora fala em pedaços, você põe na ordem. Errou,
// os pedaços voltam pro chão (sem castigo: ela só espera)
function Ordem({ frases, onFim }: { frases: string[]; onFim: () => void }) {
  // embaralha uma vez, nunca já na ordem certa
  const [soltas] = useState(() => {
    const idx = frases.map((_, i) => i)
    do idx.sort(() => Math.random() - 0.5)
    while (idx.every((v, i) => v === i) && idx.length > 1)
    return idx
  })
  const [montada, setMontada] = useState<number[]>([])
  const [errou, setErrou] = useState(0)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])
  const pronta = montada.length === frases.length
  useEffect(() => {
    if (!pronta) return
    const t = setTimeout(() => fim.current(), 1400)
    return () => clearTimeout(t)
  }, [pronta])
  const pegar = (i: number) => {
    if (pronta || montada.includes(i)) return
    if (i !== montada.length) { setMontada([]); setErrou((n) => n + 1); vib(30); return }
    setMontada((m) => [...m, i]); gota(2)
  }
  return (
    <div className={`l-ordem ${pronta ? "is-pronta" : ""}`} onClick={(e) => e.stopPropagation()}>
      <p key={errou} className={`l-ordem-frase ${errou && !montada.length ? "is-errou" : ""}`}>
        {montada.length ? montada.map((i) => frases[i]).join(" ") + (pronta ? "." : "…") : errou ? "não. de novo, com calma" : "toca os pedaços na ordem"}
      </p>
      <div className="l-ordem-pedacos">
        {soltas.map((i) => (
          <button key={i} type="button" disabled={montada.includes(i)} onClick={() => pegar(i)}>{frases[i]}</button>
        ))}
      </div>
    </div>
  )
}

// O GESTO da casa de shows: a sua linha no caderno do Alohan
function Linha({ onFim }: { onFim: (t: string) => void }) {
  const [t, setT] = useState("")
  return (
    <form className="l-cena-linha" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (t.trim()) onFim(t.trim().slice(0, 140)) }}>
      <input value={t} onChange={(e) => setT(e.target.value)} placeholder="sua linha no caderno" autoFocus maxLength={140} enterKeyHint="send" />
      <button type="submit" disabled={!t.trim()}>escrever</button>
    </form>
  )
}

function Ganho({ objeto, reliquia, titulo, texto, memoria, onOk }: { objeto?: EstacaoId; reliquia?: Reliquia; titulo?: string; texto?: string; memoria: number | null; onOk: () => void }) {
  const e = objeto ? getEstacao(objeto) : null
  const r = reliquia ? RELIQUIAS[reliquia] : null
  useEffect(() => { vib([30, 50, 30]) }, [])
  return (
    <div className="l-cena-ganha" onClick={(ev) => { ev.stopPropagation(); onOk() }} style={{ ["--cor" as string]: e?.cor ?? "#b8ffcf" }}>
      <small>{r ? "uma relíquia · ela vai pro deserto" : "você ganhou"}</small>
      <b>{titulo ?? (r ? r.nome : e?.objetoNome)}</b>
      <p>{texto ?? (r ? r.texto : `a 222 ganhou ${e?.faixa}. liga o RÁDIO`)}</p>
      {r && e && <p className="l-cena-ganha-mais">e a 222 ganhou {e.faixa}</p>}
      {e && memoria !== null && MEMORIAS[memoria] && <blockquote>{MEMORIAS[memoria]}</blockquote>}
      <i className="l-cena-toque">toca pra seguir</i>
    </div>
  )
}
