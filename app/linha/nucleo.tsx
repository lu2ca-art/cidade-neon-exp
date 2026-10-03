"use client"

// O Núcleo invade. Janelas de "vírus" pipocando por cima de tudo (estrada ou
// celular), no tom dele: gentil, corporativo, ✓. Você fecha no ✕; o botão
// grande "ACEITAR ✓" é a armadilha — abre mais duas. Limpou tudo = invasão
// repelida. Deixou acumular = o sistema cai (a 222 sai do ar e a cidade
// perde a cor até alguém religar a antena — ver page.tsx e Corrida).

import { useCallback, useEffect, useRef, useState } from "react"
import { audioCtx } from "./som"

export type Invasao = { id: number; forte: boolean } // forte = a que derruba

const JANELAS: { t: string; m: string; b: string }[] = [
  { t: "ATUALIZAÇÃO OBRIGATÓRIA", m: "sua cidade será otimizada em 3 segundos ✓", b: "ACEITAR ✓" },
  { t: "EMOÇÃO NÃO OTIMIZADA", m: "detectamos saudade neste dispositivo. deseja remover?", b: "REMOVER ✓" },
  { t: "PARABÉNS!!", m: "você foi selecionado para uma vida sem erros ✓", b: "RESGATAR ✓" },
  { t: "LIMPEZA DE MEMÓRIA", m: "seu ontem foi arquivado. 87% concluído ✓", b: "CONTINUAR ✓" },
  { t: "CONTEÚDO REMOVIDO", m: "esta música viola as diretrizes da comunidade ✓", b: "ENTENDI ✓" },
  { t: "VOCÊ ESTÁ FELIZ", m: "confirme sua felicidade para continuar ✓", b: "CONFIRMAR ✓" },
  { t: "FREQUÊNCIA ILEGAL", m: "222 FM não é uma rádio licenciada ✓", b: "DESLIGAR ✓" },
  { t: "TEMPO DE TELA +12%", m: "ótimo trabalho! continue rolando ✓", b: "ROLAR ✓" },
  { t: "SEGURANÇA", m: "D-Bee não é uma fonte confiável ✓", b: "BLOQUEAR ✓" },
  { t: "SEU LADO", m: "você foi classificado no LADO B. pessoas do lado A foram ocultadas para o seu conforto ✓", b: "OK ✓" },
  { t: "ALERTA DE CONVÍVIO", m: "você cantou junto com 3 usuários incompatíveis. deseja silenciá-los? ✓", b: "SILENCIAR ✓" },
  { t: "DISCORDÂNCIA DETECTADA", m: "conversar com o outro lado aumenta o atrito. recomendamos o seu feed ✓", b: "VOLTAR AO FEED ✓" },
  { t: "ARTE NÃO AUTORIZADA", m: "expressões não verificadas foram reclassificadas como risco ✓", b: "DENUNCIAR ✓" },
]

type Janela = { k: number; x: number; y: number; j: number; r: number }

// bip de erro de sistema
function bip(f = 880) {
  const c = audioCtx()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = "square"
  o.frequency.value = f
  g.gain.setValueAtTime(0.05, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.12)
  o.connect(g).connect(c.destination)
  o.start()
  o.stop(c.currentTime + 0.13)
}

export function InvasaoNucleo({ inv, onFim }: { inv: Invasao; onFim: (venceu: boolean) => void }) {
  const [janelas, setJanelas] = useState<Janela[]>([])
  const [fase, setFase] = useState<"entra" | "luta" | "caiu" | "limpo">("entra")
  const prox = useRef(0)
  const gerando = useRef(true)
  const [acabou, setAcabou] = useState(false) // parou de gerar janelas
  const MAX = 13

  const nova = useCallback((n = 1) => {
    setJanelas((l) => {
      const add: Janela[] = []
      for (let i = 0; i < n; i++) add.push({ k: prox.current++, x: 4 + Math.random() * 44, y: 8 + Math.random() * 62, j: Math.floor(Math.random() * JANELAS.length), r: (Math.random() - 0.5) * 6 })
      return [...l, ...add]
    })
    bip(600 + Math.random() * 500)
    try { navigator.vibrate?.(20) } catch {}
  }, [])

  // abre com um glitch e começa a pipocar; a forte acelera até cair
  useEffect(() => {
    const t0 = setTimeout(() => setFase("luta"), 900)
    const dur = inv.forte ? 9000 : 7000
    let passo = inv.forte ? 520 : 800
    let iv: ReturnType<typeof setTimeout>
    const tick = () => {
      if (!gerando.current) return
      nova(inv.forte ? 2 : 1)
      passo = Math.max(inv.forte ? 180 : 450, passo * (inv.forte ? 0.86 : 0.95))
      iv = setTimeout(tick, passo)
    }
    const t1 = setTimeout(tick, 1000)
    const t2 = setTimeout(() => { gerando.current = false; setAcabou(true) }, 1000 + dur)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(iv) }
  }, [inv, nova])

  // venceu (limpou tudo depois de parar de gerar) ou caiu (acumulou)
  useEffect(() => {
    if (fase !== "luta") return
    if (janelas.length >= MAX) {
      gerando.current = false
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFase("caiu")
      bip(140)
      try { navigator.vibrate?.([80, 40, 200]) } catch {}
      setTimeout(() => onFim(false), 2600)
      return
    }
    if (acabou && janelas.length === 0) {
      setFase("limpo")
      setTimeout(() => onFim(true), 1400)
    }
  }, [janelas.length, fase, onFim, acabou])

  const fechar = (k: number) => {
    bip(1200)
    setJanelas((l) => l.filter((x) => x.k !== k))
  }
  const aceitar = (k: number) => {
    // a armadilha: aceitar abre mais duas
    setJanelas((l) => l.filter((x) => x.k !== k))
    nova(2)
  }

  return (
    <div className={`l-inv is-${fase}`} onPointerDown={(e) => e.stopPropagation()}>
      <div className="l-inv-glitch" />
      {fase !== "caiu" && fase !== "limpo" && (
        <div className="l-inv-barra">NÚCLEO · otimização em andamento · {janelas.length}/{MAX}<span>fecha no ✕ · não aceita nada</span></div>
      )}
      {janelas.map((w) => {
        const d = JANELAS[w.j]
        return (
          <div key={w.k} className="l-inv-jan" style={{ left: `${w.x}%`, top: `${w.y}%`, transform: `rotate(${w.r}deg)` }}>
            <header>
              <b>{d.t}</b>
              <button type="button" aria-label="fechar" onClick={() => fechar(w.k)}>✕</button>
            </header>
            <p>{d.m}</p>
            <button type="button" className="l-inv-aceitar" onClick={() => aceitar(w.k)}>{d.b}</button>
          </div>
        )
      })}
      {fase === "caiu" && (
        <div className="l-inv-caiu">
          <b>SISTEMA OTIMIZADO ✓</b>
          <p>a 222 fm foi desligada para sua segurança.</p>
          <small>obrigado por não sentir.</small>
        </div>
      )}
      {fase === "limpo" && (
        <div className="l-inv-limpo">
          <b>invasão repelida</b>
          <p>o núcleo recuou. por enquanto.</p>
        </div>
      )}
    </div>
  )
}
