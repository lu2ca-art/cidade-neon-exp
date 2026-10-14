"use client"

// CAMA ELÁSTICA (o ginásio, de dia). Tocar bem na hora em que você encosta na
// lona dá impulso e cada pulo vai mais alto. Lá em cima, segurar o dedo gira
// (mortal pra trás); solta pra parar. Cair de pé conta os giros; cair torto
// derruba o combo. 60 segundos.

import { useEffect, useRef, useState } from "react"
import { quica, torcida } from "./sons"

const W = 400, H = 720
const G = 1500
const LONA = 610          // a lona na tela, com a câmera embaixo
const PX_M = 100          // 100 px = 1 metro
const V_MIN = 760, V_MAX = 2300
const GIRO = 7.5          // rad/s segurando o dedo
const TEMPO = 60

export function Cama({ onFim }: { onFim: (pontos: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ pontos: 0, resta: TEMPO, combo: 0, alto: 0 })
  const [acabou, setAcabou] = useState(false)
  const j = useRef({ h: 0, v: V_MIN, ang: 0, giros: 0, dedo: false, impulso: false, apertou: -1, pontos: 0, combo: 0, alto: 0, msg: "", msgAte: 0, lona: 0, t0: 0, fim: false })

  useEffect(() => {
    const s = j.current, c = cvs.current, g = c?.getContext("2d"); if (!c || !g) return
    s.t0 = performance.now()
    let raf = 0, ult = performance.now(), hudT = 0
    const dizer = (m: string, agora: number) => { s.msg = m; s.msgAte = agora + 900 }
    const loop = (agora: number) => {
      const dt = Math.min(0.033, (agora - ult) / 1000); ult = agora
      const resta = Math.max(0, TEMPO - (agora - s.t0) / 1000)
      // a física: sobe e desce; na lona decide o próximo pulo
      s.v -= G * dt
      s.h += s.v * dt
      if (s.dedo && !s.impulso && s.h > 70) { s.ang += GIRO * dt; s.giros += GIRO * dt }
      s.alto = Math.max(s.alto, s.h)
      if (s.h <= 0) {
        s.h = 0
        const vEntrada = -s.v
        const a = ((s.ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        const torto = Math.min(a, Math.PI * 2 - a) > 0.65
        const voltas = Math.round(s.giros / (Math.PI * 2))
        if (torto) {
          s.v = V_MIN * 0.75; s.combo = 0; dizer("caiu torto", agora); quica(0.4)
        } else {
          // impulso: apertou perto da hora de encostar (até 0,18 s antes)
          const naHora = s.apertou > 0 && agora - s.apertou < 180
          s.v = naHora ? Math.min(V_MAX, vEntrada + 170) : Math.max(V_MIN, vEntrada * 0.86)
          if (voltas > 0) {
            s.combo++
            const p = voltas * voltas * 5 * s.combo
            s.pontos += p; dizer(`${voltas === 1 ? "mortal" : `${voltas} mortais`} +${p}`, agora); torcida(voltas > 1)
          } else if (naHora) { s.pontos += 1; dizer("na hora", agora) }
          quica(0.3 + Math.min(1, vEntrada / V_MAX) * 0.7)
        }
        s.ang = 0; s.giros = 0; s.apertou = -1; s.lona = 1
        if (resta <= 0) { s.fim = true; setAcabou(true); setHud({ pontos: s.pontos, resta: 0, combo: s.combo, alto: s.alto }); return }
      }
      s.lona = Math.max(0, s.lona - dt * 5)

      // a câmera sobe junto quando o pulo passa da metade da tela
      const cam = Math.max(0, s.h - 380)
      const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = c.clientWidth, ch = c.clientHeight
      if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr) }
      const k = Math.min(cw / W, ch / H)
      g.setTransform(dpr * k, 0, 0, dpr * k, dpr * (cw - W * k) / 2, dpr * (ch - H * k) / 2)
      g.fillStyle = "#16121e"; g.fillRect(-200, -200, W + 400, H + 400)
      // a parede do ginásio: a régua de metros e as faixas
      g.save(); g.translate(0, cam)
      for (let m = 1; m <= 30; m++) {
        const y = LONA - m * PX_M
        if (y + cam < -20 || y + cam > H) continue
        g.fillStyle = m % 5 ? "rgba(255,255,255,0.08)" : "rgba(255,179,71,0.35)"
        g.fillRect(0, y, m % 5 ? 18 : 34, 2)
        g.fillStyle = "rgba(255,255,255,0.35)"; g.font = "10px monospace"; g.fillText(`${m}m`, 38, y + 4)
      }
      // a marca do recorde da vez
      g.fillStyle = "rgba(255,63,176,0.6)"; g.fillRect(W - 60, LONA - s.alto - 1, 60, 2)
      // a lona e a armação
      const afunda = s.lona * 22
      g.strokeStyle = "#2fe8ff"; g.lineWidth = 5; g.beginPath()
      g.moveTo(60, LONA); g.quadraticCurveTo(W / 2, LONA + afunda * 2, W - 60, LONA); g.stroke()
      g.fillStyle = "#3a3446"; g.fillRect(50, LONA - 4, 14, 90); g.fillRect(W - 64, LONA - 4, 14, 90)
      g.fillStyle = "#ff9000"; g.fillRect(40, LONA + 2, W - 80, 8)
      // você, girando em volta da cintura
      const cy = LONA - s.h - 52 + afunda
      g.save(); g.translate(W / 2, cy); g.rotate(-s.ang)
      const encolhe = s.dedo && !s.impulso && s.h > 70
      g.strokeStyle = "#f2eefa"; g.lineWidth = 7; g.lineCap = "round"
      g.beginPath(); g.moveTo(0, -30); g.lineTo(0, 8); g.stroke()                       // tronco
      g.beginPath(); g.moveTo(0, 8); g.lineTo(encolhe ? 14 : -8, encolhe ? 22 : 44); g.stroke()  // pernas
      g.beginPath(); g.moveTo(0, 8); g.lineTo(encolhe ? 20 : 8, encolhe ? 14 : 44); g.stroke()
      g.beginPath(); g.moveTo(0, -24); g.lineTo(encolhe ? 16 : -18, encolhe ? 6 : -48); g.stroke() // braços
      g.beginPath(); g.moveTo(0, -24); g.lineTo(encolhe ? 20 : 18, encolhe ? 0 : -48); g.stroke()
      g.fillStyle = "#ffe0a8"; g.beginPath(); g.arc(0, -42, 11, 0, Math.PI * 2); g.fill()
      g.fillStyle = "#ff3fb0"; g.fillRect(-12, -50, 24, 5)                                // o boné
      g.restore()
      g.restore()
      // o anel da hora certa: aparece quando você está chegando na lona
      if (s.v < 0 && s.h < 160) {
        const k = 1 - s.h / 160
        g.strokeStyle = `rgba(255,200,87,${0.25 + k * 0.6})`; g.lineWidth = 3
        g.beginPath(); g.ellipse(W / 2, LONA + 4, 30 + (1 - k) * 60, 8 + (1 - k) * 14, 0, 0, Math.PI * 2); g.stroke()
      }
      if (agora < s.msgAte) {
        g.fillStyle = "#ffc857"; g.font = "900 26px 'Arial Black', system-ui"; g.textAlign = "center"
        g.fillText(s.msg, W / 2, 150); g.textAlign = "left"
      }
      hudT += dt
      if (hudT > 0.2) { hudT = 0; setHud({ pontos: s.pontos, resta: Math.ceil(resta), combo: s.combo, alto: s.alto }) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    if (process.env.NODE_ENV !== "production") (window as unknown as { __cama: typeof s }).__cama = s
    return () => cancelAnimationFrame(raf)
  }, [])

  // apertar descendo perto da lona é impulso (não gira); no alto, é giro
  const apertar = () => { const s = j.current; s.dedo = true; s.impulso = s.v < 0 && s.h < 260; if (s.v < 0) s.apertou = performance.now() }
  const soltar = () => { j.current.dedo = false; j.current.impulso = false }

  return (
    <div className="gi-jogo">
      <div className="gi-placar"><b>{hud.pontos}</b><small>pontos{hud.combo > 1 ? ` · combo ${hud.combo}` : ""}</small><span>{hud.resta}s</span></div>
      <canvas ref={cvs} className="gi-cvs" style={{ touchAction: "none" }}
        onPointerDown={apertar} onPointerUp={soltar} onPointerCancel={soltar} onPointerLeave={soltar} />
      {!acabou && hud.resta > 52 && <p className="gi-dica">toca quando encostar na lona · lá em cima, segura pra girar</p>}
      {acabou && (
        <div className="gi-fim">
          <b>{hud.pontos}</b>
          <small>pontos · {(hud.alto / PX_M).toFixed(1)} m de altura</small>
          <button type="button" className="gi-btn" onClick={() => onFim(hud.pontos)}>continuar</button>
        </div>
      )}
    </div>
  )
}
