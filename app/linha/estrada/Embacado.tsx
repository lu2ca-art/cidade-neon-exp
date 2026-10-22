"use client"

// O VIDRO EMBAÇADO (13/10, LU2CA: "desembaçar" sai do fliperama e vira um
// momento do mundo). Com a Kombi parada na chuva (clima.ts), o vidro embaça
// em dois estágios (LU2CA, 14/10): primeiro forte; você passa o dedo e limpa;
// aí embaça de novo, leve, e você limpa de novo. Andando, desembaça sozinho.
// Quem decide a hora é a Corrida. Só a metade de cima da tela limpa: a de baixo continua sendo o
// volante. Só a primeira vez avisa; depois a pessoa já sabe.

import { useEffect, useRef, useState } from "react"

interface Props {
  // pode embaçar agora? (parada na chuva) — lido a cada quadro
  podeRef: React.RefObject<boolean>
  // a chuva começou: id novo = começam os dois estágios
  pedido: number | null
  jaSabe: boolean
  onAprendeu: () => void
}

// os dois estágios: [força, segundos embaçando]
const ESTAGIOS: [number, number][] = [[1, 7], [0.45, 4]]
const LIMPO = 0.12 // abaixo disso o vidro conta como limpo

export function Embacado({ podeRef, pedido, jaSabe, onAprendeu }: Props) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [limpando, setLimpando] = useState(false) // a zona de limpar ativa
  const [dica, setDica] = useState(false)
  const estado = useRef({ cresce: 0, forca: 1, estagio: -1, espera: 0, nivel: 0, aprendeu: jaSabe, rastro: [] as { x: number; y: number }[] })
  const forcaPode = useRef(false) // (teste: __embacar(true) finge a Kombi parada na chuva)
  const comecar = (k: number) => {
    const e = estado.current
    e.estagio = k; e.forca = ESTAGIOS[k][0]; e.cresce = ESTAGIOS[k][1]
  }
  useEffect(() => { if (pedido) comecar(0) }, [pedido])

  useEffect(() => {
    let raf = 0
    let ult = performance.now()
    let g: CanvasRenderingContext2D | null = null
    let ler = 0 // segundos até a próxima leitura do nível
    let ativoAnt = false
    let reforco = 1 // o desembaçar andando acelera quando empaca (ver a leitura)
    let sujo = false // tem névoa no canvas (em qualquer canto, não só na amostra)
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.1, (t - ult) / 1000)
      ult = t
      const c = cvs.current
      const e = estado.current
      if (!c) return
      const pode = !!podeRef.current || forcaPode.current
      const embacando = e.cresce > 0 && pode
      // limpou o estágio: o próximo vem logo em seguida (o leve)
      if (e.estagio >= 0 && e.cresce <= 0 && e.nivel < LIMPO) {
        if (e.espera <= 0) e.espera = 1.4
        e.espera -= dt
        if (e.espera <= 0) {
          if (e.estagio + 1 < ESTAGIOS.length) comecar(e.estagio + 1)
          else e.estagio = -1
          e.espera = 0
        }
      }
      // fora da hora de embaçar (andando) o estágio espera, e a área de limpar
      // só fica na tela com o vidro embaçado de verdade
      const ativo = e.nivel > 0.25 || (e.cresce > 0 && pode)
      if (ativo !== ativoAnt) { ativoAnt = ativo; setLimpando(ativo) }
      if (ativo && e.nivel > 0.35 && !e.aprendeu) setDica(true)
      // (22/10, desempenho) sem névoa crescendo e com o vidro limpo não há o que
      // desenhar nem ler: antes ele apagava o canvas inteiro e lia pixels da GPU
      // em todo quadro (getImageData = 37% da CPU do mapa-disco)
      if (!embacando && !sujo) return
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr)
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H }
      // (o canvas é lido de vez em quando: fica na CPU, sem ida e volta da GPU)
      g ??= c.getContext("2d", { willReadFrequently: true })!
      if (embacando) {
        // embaçando: uma névoa fria cobrindo o vidro + gotinhas
        e.cresce -= dt
        sujo = true
        g.globalCompositeOperation = "source-over"
        g.fillStyle = `rgba(190,205,225,${0.035 * e.forca})`
        g.fillRect(0, 0, W, H)
        for (let i = 0; i < Math.round(3 * e.forca); i++) {
          g.fillStyle = `rgba(230,240,255,${0.18 + Math.random() * 0.2})`
          g.beginPath()
          g.arc(Math.random() * W, Math.random() * H, (1 + Math.random() * 2.5) * dpr, 0, Math.PI * 2)
          g.fill()
        }
      } else {
        // parou de embaçar (ou saiu da chuva): o vidro desembaça sozinho, devagar
        g.globalCompositeOperation = "destination-out"
        g.fillStyle = `rgba(0,0,0,${pode ? 0.004 : 0.012 * reforco})`
        g.fillRect(0, 0, W, H)
      }
      // o dedo passando: limpa por onde passou (o rastro em traço grosso)
      if (e.rastro.length) {
        g.globalCompositeOperation = "destination-out"
        g.lineCap = "round"
        g.lineJoin = "round"
        g.lineWidth = 120 * dpr
        g.strokeStyle = "rgba(0,0,0,0.9)"
        g.beginPath()
        e.rastro.forEach((p, i) => (i ? g!.lineTo(p.x * dpr, p.y * dpr) : g!.moveTo(p.x * dpr, p.y * dpr)))
        if (e.rastro.length === 1) g.lineTo(e.rastro[0].x * dpr + 1, e.rastro[0].y * dpr)
        g.stroke()
        e.rastro = e.rastro.slice(-1)
      }
      g.globalCompositeOperation = "source-over"
      // quanto do vidro está embaçado (amostra pequena), ~4 vezes por segundo:
      // o resto da lógica usa a última leitura
      ler -= dt
      if (ler <= 0) {
        ler = 0.25
        const amostra = g.getImageData(Math.floor(W / 2) - 2, Math.floor(H / 3) - 2, 4, 4).data
        let a = 0
        for (let i = 3; i < amostra.length; i += 4) a += amostra[i]
        const n = a / (amostra.length / 4) / 255
        // (22/10) o canvas guarda 8 bits: apagando 1,2% por quadro o alfa empaca
        // em ~42/255 (a névoa de 16% ficava pra sempre e o estágio não andava).
        // Andando e sem baixar desde a última leitura, apaga cada vez mais forte;
        // no reforço máximo e ainda parado, o vidro está limpo: zera o canvas
        const empacou = !embacando && !pode && n >= e.nivel - 0.002
        if (embacando || pode) reforco = 1
        else if (empacou && reforco >= 32) { g.clearRect(0, 0, W, H); sujo = false; reforco = 1; e.nivel = 0; return }
        else if (empacou) reforco *= 2
        e.nivel = n
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [podeRef])

  // atalho de teste: __embacar() começa um episódio agora (em produção, só com ?medir)
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && !/[?&]medir/.test(location.search)) return
    const w = window as unknown as Record<string, unknown>
    w.__embacar = (parada?: boolean) => { forcaPode.current = !!parada; comecar(0) }
    return () => { delete w.__embacar }
  }, [])

  const passar = (ev: React.PointerEvent) => {
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect()
    estado.current.rastro.push({ x: ev.clientX - r.left, y: ev.clientY - r.top })
  }
  const segurando = useRef(false)

  return (
    <>
      <canvas ref={cvs} className="l-embacado" aria-hidden />
      {limpando && (
        <div
          className="l-embacado-vidro"
          onPointerDown={(e) => {
            e.stopPropagation()
            ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
            segurando.current = true
            passar(e)
            if (!estado.current.aprendeu) { estado.current.aprendeu = true; setDica(false); onAprendeu() }
          }}
          onPointerMove={(e) => { if (segurando.current) passar(e) }}
          onPointerUp={() => { segurando.current = false; estado.current.rastro = [] }}
          onPointerCancel={() => { segurando.current = false; estado.current.rastro = [] }}
        />
      )}
      {dica && limpando && <small className="l-embacado-dica">o vidro embaçou · passa o dedo no vidro</small>}
    </>
  )
}
