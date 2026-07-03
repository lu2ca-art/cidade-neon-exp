"use client"

import { useEffect, useRef, useState } from "react"
import { useAudioPlayer, getAudioEl, ALBUM_TRACKS } from "@/app/providers/AudioPlayerProvider"
import type { BridgeCommand, BridgeState } from "@/app/providers/AudioBridge"
import { sendStateToIframe } from "@/app/providers/AudioBridge"

const C = {
  skyTop:     "#1a0533",
  skyMid:     "#4a0a6b",
  skyHorizon: "#cc4400",
  sunOuter:   "#ff4500",
  sunInner:   "#ffcc00",
  road1:      "#2d1b69",
  road2:      "#3d2b79",
  grass1:     "#1a4a1a",
  grass2:     "#0d2b0d",
  stripY:     "#ffcc00",
  stripW:     "#ffffff",
  neonPink:   "#ff2d78",
  neonOrange: "#ff6b35",
  neonPurple: "#cc00ff",
}

// Cada zona da estrada = uma "estação" de rádio (muda ao atravessar a localidade)
const RADIO_STATIONS: Record<string, { name: string; freq: string; color: string }> = {
  "SUBÚRBIO XÊNON": { name: "SUBÚRBIO XENOM", freq: "104.7", color: "#ff2d78" },
  "CIDADE NEON":    { name: "RÁDIO CIDADE NEON", freq: "88.5", color: "#00e5ff" },
  "NOVA ONDA":      { name: "NOVA ONDA FM",   freq: "96.3",  color: "#cc00ff" },
}
// Duração fixa de cada faixa na rádio (prévia)
const RADIO_SNIPPET_MS = 22000

const ROAD_LEN  = 1600
const SEG_LEN   = 200
const DRAW_DIST = 100
const ROAD_W    = 2200
const CAM_H     = 1500
const CAM_DEPTH = 0.84

interface Seg { curve: number; sprites: { x: number; type: string }[] }
interface Car  { seg: number; x: number; color: string }

function buildRoad(): Seg[] {
  const road: Seg[] = []
  const pattern = [
    {len:100,curve:0},{len:120,curve:2.2},{len:100,curve:0},
    {len:130,curve:-1.8},{len:100,curve:0},{len:120,curve:2.8},
    {len:100,curve:0},{len:130,curve:-2.5},
  ]
  const types = ["post","sign","post","sign","post"]
  let i = 0
  while (i < ROAD_LEN) {
    const sec = pattern[i % pattern.length]
    for (let s = 0; s < sec.len && i < ROAD_LEN; s++, i++) {
      const sprites: {x:number;type:string}[] = []
      if (i % 12 === 0) {
        sprites.push({x:-2.8, type: types[Math.floor(i/12)%types.length]})
        sprites.push({x: 2.8, type: types[Math.floor(i/12+2)%types.length]})
      }
      road.push({curve: sec.curve, sprites})
    }
  }
  return road
}

function buildCars(): Car[] {
  const colors = ["#ff3300","#0066ff","#00cc44","#ffaa00","#cc00ff"]
  const cars: Car[] = []
  for (let i=100; i<ROAD_LEN-30; i+=Math.floor(40+Math.random()*50)) {
    cars.push({seg:i, x:[-0.55,0,0.55][i%3], color:colors[i%colors.length]})
  }
  return cars
}

export default function DrivePage() {
  const audio    = useAudioPlayer()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef(0)
  const roadRef   = useRef<Seg[]>([])
  const carsRef   = useRef<Car[]>([])

  // física — todos em refs pra não causar re-render no loop
  const posRef    = useRef(0)
  const speedRef  = useRef(0)       // km/h real
  const playerXRef= useRef(0)       // -1..1
  const accelRef      = useRef(false)
  const accelPressRef = useRef(0)    // pressão acumulada 0..3
  const leftRef   = useRef(false)
  const rightRef  = useRef(false)
  const curveRef  = useRef(0)       // curva acumulada pra volante

  const [phoneOpen, setPhoneOpen]   = useState(false)
  const [volume, setVolume]         = useState(0.8)
  // ── RÁDIO do painel: toca sem parar, 22s por faixa, estação = zona ──
  const [zoneName, setZoneName]     = useState("SUBÚRBIO XÊNON")
  const [radioIdx, setRadioIdx]     = useState(0)
  const [snippetPct, setSnippetPct] = useState(0)
  const stageRef  = useRef<HTMLDivElement>(null)
  const blurLRef  = useRef<HTMLDivElement>(null)
  const blurRRef  = useRef<HTMLDivElement>(null)
  const zoneRef   = useRef<string>("SUBÚRBIO XÊNON")

  useEffect(() => {
    roadRef.current = buildRoad()
    carsRef.current = buildCars()
  }, [])

  // Escuta comandos do iframe e executa no AudioPlayer do pai
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const cmd = e.data as BridgeCommand
      if (!cmd?.type) return
      switch (cmd.type) {
        case "PLAY":          audio.play(cmd.index); break
        case "PAUSE":         audio.pause(); break
        case "RESUME":        audio.resume(); break
        case "TOGGLE":        audio.toggle(); break
        case "SEEK":          audio.seekTo(cmd.seconds); break
        case "NEXT":          audio.next(); break
        case "PREV":          audio.prev(); break
        case "REQUEST_STATE": break
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [audio])

  // Envia estado atualizado ao iframe a cada tick de áudio
  useEffect(() => {
    sendStateToIframe(iframeRef.current, {
      trackIdx: audio.trackIdx,
      playing:  audio.playing,
      elapsed:  audio.elapsed,
    })
  }, [audio.trackIdx, audio.playing, audio.elapsed])

  // ── RÁDIO: toca a faixa atual e avança sozinha a cada 22s (loop infinito) ──
  useEffect(() => {
    // usa o player global; faixas ainda sem áudio ficam "no ar" só no visor
    audio.play(radioIdx)
    setSnippetPct(0)
    const t0 = performance.now()
    const prog = setInterval(() => {
      setSnippetPct(Math.min((performance.now() - t0) / RADIO_SNIPPET_MS, 1))
    }, 120)
    const advance = setTimeout(() => {
      setRadioIdx((i) => (i + 1) % ALBUM_TRACKS.length)
    }, RADIO_SNIPPET_MS)
    return () => { clearInterval(prog); clearTimeout(advance) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radioIdx])

  // teclado
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key==="ArrowUp"||e.key===" ") accelRef.current=true
      if (e.key==="ArrowLeft")  leftRef.current=true
      if (e.key==="ArrowRight") rightRef.current=true
    }
    const ku = (e: KeyboardEvent) => {
      if (e.key==="ArrowUp"||e.key===" ") accelRef.current=false
      if (e.key==="ArrowLeft")  leftRef.current=false
      if (e.key==="ArrowRight") rightRef.current=false
    }
    window.addEventListener("keydown",kd)
    window.addEventListener("keyup",ku)
    return ()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku)}
  },[])

  useEffect(()=>{
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext("2d")!

    const resize = ()=>{
      const stage = stageRef.current
      const w = stage ? stage.clientWidth  : window.innerWidth
      const h = stage ? stage.clientHeight : window.innerHeight
      canvas.width  = w
      canvas.height = h
    }
    resize()
    window.addEventListener("resize",resize)

    // Layout fixo em proporções:
    // BOTOES_H  = 90px fixo no fundo
    // DASH_H    = 28% da altura total
    // JOGO_H    = resto (topo)
    const BOTOES_H = 90
    const MAX_KMH  = 222
    const ACCEL_RATE  = 40
    const BRAKE_RATE  = 28
    // velocidade inicial: 40% de MAX_KMH → já começa em movimento
    if (speedRef.current === 0) speedRef.current = MAX_KMH * 0.40

    let last = 0
    let frameCount = 0

    const frame = (ts: number) => {
      const dt  = Math.min((ts - last) / 1000, 0.05)
      last = ts
      frameCount++

      if (!roadRef.current.length) { rafRef.current=requestAnimationFrame(frame); return }

      const W = canvas.width
      const H = canvas.height
      const DASH_H  = Math.round(H * 0.26)
      const JOGO_H  = H - DASH_H - BOTOES_H

      // ── Física natural ──
      // física com pressão acumulada: aceleração cresce com o tempo segurando
      if (accelRef.current) {
        accelPressRef.current = Math.min(accelPressRef.current + dt * 0.8, 3.0)
        const rate = ACCEL_RATE * (0.5 + accelPressRef.current * 0.5)
        speedRef.current = Math.min(speedRef.current + rate * dt, MAX_KMH)
      } else {
        accelPressRef.current = Math.max(accelPressRef.current - dt * 4, 0)
        speedRef.current = Math.max(speedRef.current - BRAKE_RATE * dt, 0)
      }

      // direção
      const STEER = 1.6
      if (leftRef.current)  playerXRef.current = Math.max(-1, playerXRef.current - STEER*dt)
      if (rightRef.current) playerXRef.current = Math.min( 1, playerXRef.current + STEER*dt)
      if (!leftRef.current && !rightRef.current) playerXRef.current *= 0.96

      // avança na estrada proporcionalmente à velocidade real do velocímetro
      // 222 km/h => sensação de alta velocidade; multiplicador maior = chão mais rápido
      const totalLen = ROAD_LEN * SEG_LEN
      posRef.current = ((posRef.current + speedRef.current * dt * 38) % totalLen + totalLen) % totalLen

      // zona + valores dos mostradores lidos direto dos refs (sem stale closure)
      const pct = posRef.current / totalLen
      const z   = pct<0.33?"SUBÚRBIO XÊNON":pct<0.66?"CIDADE NEON":"NOVA ONDA"
      if (z !== zoneRef.current) { zoneRef.current = z; setZoneName(z) }
      const kmhNow = Math.round(speedRef.current)
      const rpmNow = Math.round((speedRef.current / MAX_KMH) * 80) / 10

      // blur lateral proporcional à velocidade (motion blur do cenário)
      const spdFrac = Math.min(speedRef.current / MAX_KMH, 1)
      const blurPx  = (spdFrac * spdFrac * 7).toFixed(1)
      if (blurLRef.current) blurLRef.current.style.backdropFilter = `blur(${blurPx}px)`
      if (blurRRef.current) blurRRef.current.style.backdropFilter = `blur(${blurPx}px)`

      // ── Limpa canvas ──
      ctx.clearRect(0,0,W,H)

      // ── SKY (ocupa JOGO_H do topo) ──
      const sky = ctx.createLinearGradient(0,0,0,JOGO_H)
      sky.addColorStop(0,   C.skyTop)
      sky.addColorStop(0.5, C.skyMid)
      sky.addColorStop(1,   C.skyHorizon)
      ctx.fillStyle = sky
      ctx.fillRect(0,0,W,JOGO_H)

      // Sol
      const SX=W*0.5, SY=JOGO_H*0.38, SR=Math.min(W,JOGO_H)*0.09
      const sg=ctx.createRadialGradient(SX,SY,0,SX,SY,SR)
      sg.addColorStop(0,C.sunInner); sg.addColorStop(0.6,C.sunOuter); sg.addColorStop(1,"transparent")
      ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(SX,SY,SR,0,Math.PI*2); ctx.fill()
      ctx.fillStyle=C.skyMid
      for(let s=0;s<5;s++) ctx.fillRect(SX-SR, SY+SR*0.3+s*SR*0.15, SR*2, SR*0.07)

      // Estrelas
      ctx.fillStyle="rgba(255,255,255,0.7)"
      for(let s=0;s<50;s++){
        const sx=((s*179+posRef.current*0.003)%W+W)%W
        const sy=(s*67)%(JOGO_H*0.32)
        ctx.fillRect(sx,sy,s%4===0?2:1,s%4===0?2:1)
      }

      // Silhueta cidade
      const horizY = JOGO_H * 0.60
      ctx.fillStyle="#0d0020"
      const bxArr=[0.05,0.12,0.20,0.28,0.36,0.44,0.52,0.60,0.68,0.76,0.84,0.92]
      const bhArr=[0.09,0.13,0.08,0.16,0.11,0.18,0.10,0.15,0.12,0.17,0.09,0.13]
      for(let b=0;b<bxArr.length;b++){
        const bW=W*0.075, bHH=bhArr[b]*JOGO_H*0.42, bXX=bxArr[b]*W
        ctx.fillStyle="#0d0020"
        ctx.fillRect(bXX-bW/2, horizY-bHH, bW, bHH)
        const wc=["#ff990055","#ff660055","#ffcc0044"][b%3]
        ctx.fillStyle=wc
        for(let wy=4;wy<bHH-4;wy+=9)
          for(let wx=4;wx<bW-4;wx+=8)
            if((b*7+wy+wx)%3!==0) ctx.fillRect(bXX-bW/2+wx,horizY-bHH+wy,4,4)
      }

      // ── ROAD pseudo-3D ──
      // A estrada começa na linha do horizonte (horizY) e vai até o fundo do JOGO_H
      // Segmento mais distante → y mais perto de horizY
      // Segmento mais próximo → y mais perto de JOGO_H

      const startSeg = Math.floor(posRef.current/SEG_LEN) % ROAD_LEN

      // câmera curva (look-ahead)
      let camCurve=0
      for(let n=0;n<20;n++) camCurve+=roadRef.current[(startSeg+n)%ROAD_LEN].curve*(20-n)/20
      curveRef.current = camCurve

      // projetar segmentos de longe (n=DRAW_DIST) pra perto (n=1)
      // y de um segmento a distância n:
      // escala = perspectiva: quanto maior n, menor a escala (mais longe)
      // y_tela = horizY + (JOGO_H - horizY) * (1/n) * fator

      type Proj = {
        x1:number; y1:number; w1:number
        x2:number; y2:number; w2:number
        si:number; n:number
      }
      const projs:Proj[]=[]

      let xOff=0, dxOff=0

      for(let n=1;n<=DRAW_DIST;n++){
        const si=(startSeg+n)%ROAD_LEN
        xOff+=dxOff
        dxOff+=roadRef.current[si].curve*0.0002

        // escala de perspectiva: n=1 → perto → grande; n=DRAW_DIST → longe → pequeno
        const scale1 = CAM_DEPTH / n
        const scale2 = CAM_DEPTH / (n+1)

        // y na tela: n=1 → JOGO_H (perto, embaixo); n=DRAW_DIST → horizY (longe, cima)
        const y1 = horizY + (JOGO_H - horizY) * (scale1 / CAM_DEPTH)
        const y2 = horizY + (JOGO_H - horizY) * (scale2 / CAM_DEPTH)

        // x central com curva
        const cX1 = W/2 + (playerXRef.current * -0.5 + xOff + camCurve*0.03) * ROAD_W * scale1
        const cX2 = W/2 + (playerXRef.current * -0.5 + xOff + camCurve*0.03) * ROAD_W * scale2

        const w1 = ROAD_W * scale1
        const w2 = ROAD_W * scale2

        projs.push({x1:cX1,y1,w1,x2:cX2,y2,w2,si,n})
      }

      // desenha de longe (grande n) pra perto (n=1) → painter's algorithm
      for(let pi=projs.length-1;pi>=0;pi--){
        const p=projs[pi]
        // só desenha se y1 > y2 (perto está abaixo de longe — correto)
        if(p.y1<=p.y2) continue
        if(p.y2>JOGO_H) continue
        if(p.y1<horizY) continue

        const si=p.si
        const alt=(Math.floor(si/4)%2)===0

        // grass
        ctx.fillStyle=alt?C.grass1:C.grass2
        ctx.beginPath()
        ctx.moveTo(0,p.y2); ctx.lineTo(W,p.y2)
        ctx.lineTo(W,p.y1); ctx.lineTo(0,p.y1)
        ctx.fill()

        // road
        ctx.fillStyle=alt?C.road1:C.road2
        ctx.beginPath()
        ctx.moveTo(p.x1-p.w1,p.y1); ctx.lineTo(p.x1+p.w1,p.y1)
        ctx.lineTo(p.x2+p.w2,p.y2); ctx.lineTo(p.x2-p.w2,p.y2)
        ctx.fill()

        // borda branca esq
        ctx.fillStyle=C.stripW
        ctx.beginPath()
        ctx.moveTo(p.x1-p.w1,p.y1); ctx.lineTo(p.x1-p.w1+p.w1*0.06,p.y1)
        ctx.lineTo(p.x2-p.w2+p.w2*0.06,p.y2); ctx.lineTo(p.x2-p.w2,p.y2)
        ctx.fill()
        // borda branca dir
        ctx.beginPath()
        ctx.moveTo(p.x1+p.w1,p.y1); ctx.lineTo(p.x1+p.w1-p.w1*0.06,p.y1)
        ctx.lineTo(p.x2+p.w2-p.w2*0.06,p.y2); ctx.lineTo(p.x2+p.w2,p.y2)
        ctx.fill()

        // linha central amarela (alternada)
        if(alt){
          ctx.fillStyle=C.stripY
          ctx.beginPath()
          ctx.moveTo(p.x1-p.w1*0.03,p.y1); ctx.lineTo(p.x1+p.w1*0.03,p.y1)
          ctx.lineTo(p.x2+p.w2*0.03,p.y2); ctx.lineTo(p.x2-p.w2*0.03,p.y2)
          ctx.fill()
        }

        // sprites laterais
        for(const sp of roadRef.current[si].sprites){
          const spX=p.x1+sp.x*p.w1
          drawSprite(ctx,spX,p.y1,p.w1/ROAD_W,sp.type)
        }

        // carros tráfego
        for(const car of carsRef.current){
          if(car.seg===si){
            const cX=p.x1+car.x*p.w1*0.6
            const cW=p.w1*0.38
            const cH=cW*0.55
            if(cW<5) continue
            ctx.fillStyle=car.color
            ctx.fillRect(cX-cW/2,p.y1-cH,cW,cH)
            ctx.fillStyle="rgba(0,200,255,0.45)"
            ctx.fillRect(cX-cW*0.28,p.y1-cH+cH*0.05,cW*0.56,cH*0.38)
            ctx.fillStyle="#ff4400"; ctx.shadowColor="#ff4400"; ctx.shadowBlur=4
            ctx.fillRect(cX-cW*0.44,p.y1-cH*0.5,cW*0.11,cH*0.13)
            ctx.fillRect(cX+cW*0.33,p.y1-cH*0.5,cW*0.11,cH*0.13)
            ctx.shadowBlur=0
          }
        }
      }

      // ── BLUR LATERAL no canvas (mais intenso que CSS) ──
      if (spdFrac > 0.05) {
        const blurW = W * 0.18
        const blurAlpha = spdFrac * spdFrac * 0.72
        // esquerda
        const blL = ctx.createLinearGradient(0,0,blurW,0)
        blL.addColorStop(0, `rgba(10,0,30,${blurAlpha})`)
        blL.addColorStop(1, "rgba(10,0,30,0)")
        ctx.fillStyle = blL
        ctx.fillRect(0,0,blurW,JOGO_H)
        // direita
        const blR = ctx.createLinearGradient(W,0,W-blurW,0)
        blR.addColorStop(0, `rgba(10,0,30,${blurAlpha})`)
        blR.addColorStop(1, "rgba(10,0,30,0)")
        ctx.fillStyle = blR
        ctx.fillRect(W-blurW,0,blurW,JOGO_H)
        // streaks de luz (rastelado neon lateral)
        if (spdFrac > 0.3) {
          const streakAlpha = (spdFrac - 0.3) * 0.6
          const streakColors = ["#ff2d7888","#00e5ff66","#cc00ff66"]
          for (let sk=0;sk<6;sk++) {
            const sy = JOGO_H * (0.25 + sk*0.1)
            const sh = 1 + sk%3
            const sw = blurW * (0.4 + spdFrac*0.6)
            ctx.globalAlpha = streakAlpha * (0.4+Math.sin(frameCount*0.15+sk)*0.3)
            ctx.fillStyle = streakColors[sk%3]
            ctx.fillRect(0, sy, sw, sh)
            ctx.fillRect(W-sw, sy+4, sw, sh)
          }
          ctx.globalAlpha = 1
        }
      }

      // ── DASHBOARD ──
      drawDashboard(ctx,W,H,DASH_H,BOTOES_H,kmhNow,rpmNow,z,camCurve,audio.currentTrack?.title||"—",audio.playing)

      rafRef.current=requestAnimationFrame(frame)
    }

    rafRef.current=requestAnimationFrame(frame)
    return()=>{cancelAnimationFrame(rafRef.current);window.removeEventListener("resize",resize)}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  // Calcula altura do dash em % para posicionar o celular acima dele
  const DASH_PCT = 0.26
  const BOTOES_H_PCT = 90 // px fixos

  return (
    <div
      ref={stageRef}
      className="relative bg-black select-none overflow-hidden"
      style={{ width:"100vw", height:"100dvh" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"/>

      {/* BLUR LATERAL — motion blur */}
      {!phoneOpen&&(
        <>
          <div ref={blurLRef} style={{position:"absolute",top:0,bottom:0,left:0,width:"16%",zIndex:30,pointerEvents:"none",WebkitMaskImage:"linear-gradient(to right, black, transparent)",maskImage:"linear-gradient(to right, black, transparent)"}}/>
          <div ref={blurRRef} style={{position:"absolute",top:0,bottom:0,right:0,width:"16%",zIndex:30,pointerEvents:"none",WebkitMaskImage:"linear-gradient(to left, black, transparent)",maskImage:"linear-gradient(to left, black, transparent)"}}/>
        </>
      )}

      {/* OVERLAY para fechar celular */}
      {phoneOpen&&(
        <div
          onClick={()=>setPhoneOpen(false)}
          style={{position:"absolute",inset:0,zIndex:55,background:"rgba(2,0,12,0.78)"}}
        />
      )}

      {/* CELULAR — posicionado no espaço do painel quando fechado, nunca sobrepõe nada */}
      <div
        onClick={()=>!phoneOpen&&setPhoneOpen(true)}
        style={{
          position:"absolute", zIndex:60,
          transition:"all .45s cubic-bezier(.4,0,.2,1)",
          ...(phoneOpen
            ? {
                top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                height:"90%", aspectRatio:"9 / 19.5", maxWidth:"86%",
                background:"#0a0a0d", borderRadius:44, padding:9,
                border:"1px solid #2a2a30",
                boxShadow:`0 0 0 2px #000, 0 18px 50px rgba(0,0,0,0.7), 0 0 26px ${C.neonPink}33`,
                cursor:"default",
              }
            : {
                // posicionado no canto inferior direito, dentro da área do painel
                // acima dos botões de controle (BOTOES_H_PCT=90px)
                bottom: 94,
                right:10,
                width:68, height:120,
                background:"#0a0014", borderRadius:12, padding:0,
                border:`1.5px solid ${C.neonPink}55`,
                boxShadow:`0 0 12px ${C.neonPink}33`,
                cursor:"pointer", overflow:"hidden",
              }),
        }}
      >
        {phoneOpen&&(<>
          <div style={{position:"absolute",left:-2,top:"22%",width:3,height:46,borderRadius:3,background:"#1c1c20"}}/>
          <div style={{position:"absolute",left:-2,top:"34%",width:3,height:70,borderRadius:3,background:"#1c1c20"}}/>
          <div style={{position:"absolute",right:-2,top:"26%",width:3,height:90,borderRadius:3,background:"#1c1c20"}}/>
        </>)}
        <div style={{position:"relative",width:"100%",height:"100%",borderRadius:phoneOpen?36:10,overflow:"hidden",background:"#000"}}>
          {phoneOpen&&(
            <div style={{position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",width:"34%",height:22,borderRadius:14,background:"#000",zIndex:5}}/>
          )}
          <iframe
            ref={iframeRef}
            src="/?screen=home"
            style={{
              width: phoneOpen?"100%":"390px",
              height: phoneOpen?"100%":"844px",
              border:"none",
              transform: phoneOpen?"none":`scale(${72/390})`,
              transformOrigin:"top left",
              pointerEvents: phoneOpen?"auto":"none",
            }}
            title="Celular"
          />
        </div>
        {phoneOpen&&(
          <button
            onClick={(e)=>{e.stopPropagation();setPhoneOpen(false)}}
            style={{
              position:"absolute",bottom:-56,left:"50%",transform:"translateX(-50%)",
              display:"flex",alignItems:"center",gap:9,
              background:`linear-gradient(90deg, ${C.neonPink}, #ff6a3d)`,
              border:`1.5px solid #ffb0cf`,
              borderRadius:16,padding:"13px 40px",
              color:"#12000a",fontSize:15,fontWeight:800,letterSpacing:3,
              textTransform:"uppercase",whiteSpace:"nowrap",cursor:"pointer",
              animation:"dirigir-pulse 1.6s ease-in-out infinite",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12000a" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3v6.6M4.2 16.5l5.7-3.3M19.8 16.5l-5.7-3.3"/></svg>
            DIRIGIR
          </button>
        )}
      </div>

      {/* RÁDIO DO PAINEL — mostrador vintage-futurista, sem botões de player */}
      {!phoneOpen&&(()=>{
        const st = RADIO_STATIONS[zoneName] ?? RADIO_STATIONS["CIDADE NEON"]
        const title = (ALBUM_TRACKS[radioIdx]?.title ?? "—").toUpperCase()
        const marquee = `♪ ${title}   ///   LU2CA · CIDADE NEON     `
        return (
        <div style={{
          position:"absolute",
          bottom: BOTOES_H_PCT + 6,
          left:"50%", transform:"translateX(-50%)",
          width:"min(60%, 300px)",
          zIndex:46,
          pointerEvents:"none",
        }}>
          <div style={{
            position:"relative", borderRadius:12, padding:"8px 12px 9px",
            background:"linear-gradient(180deg, rgba(8,4,20,0.92), rgba(4,2,10,0.94))",
            border:`1px solid ${st.color}55`,
            boxShadow:`0 0 18px ${st.color}33, inset 0 0 14px ${st.color}18`,
            overflow:"hidden",
          }}>
            {/* scanlines */}
            <div style={{position:"absolute",inset:0,opacity:0.22,pointerEvents:"none",
              backgroundImage:"repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.45) 2px 3px)"}}/>
            {/* estação + freq + NO AR */}
            <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <span style={{fontFamily:"monospace",fontSize:9,letterSpacing:2,color:st.color,textShadow:`0 0 6px ${st.color}`}}>{st.name}</span>
              <span style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontFamily:"monospace",fontSize:9,letterSpacing:1,color:st.color,opacity:0.85}}>{st.freq} FM</span>
                <span style={{display:"inline-flex",alignItems:"center",gap:3,fontFamily:"monospace",fontSize:8,letterSpacing:1,color:st.color}}>
                  <span style={{width:6,height:6,borderRadius:6,background:st.color,boxShadow:`0 0 6px ${st.color}`,animation:"radio-blink 1.4s ease-in-out infinite"}}/>
                  NO AR
                </span>
              </span>
            </div>
            {/* now playing (marquee) */}
            <div style={{position:"relative",height:18,overflow:"hidden"}}>
              <div style={{position:"absolute",whiteSpace:"nowrap",fontFamily:"monospace",fontSize:13,fontWeight:700,letterSpacing:1,
                color:"#eafff8",textShadow:`0 0 8px ${st.color}aa`,animation:"dash-marquee 11s linear infinite"}}>
                {marquee}{marquee}
              </div>
            </div>
            {/* barra dos 22s */}
            <div style={{position:"relative",marginTop:6,height:3,borderRadius:3,background:"rgba(255,255,255,0.1)"}}>
              <div style={{height:"100%",borderRadius:3,width:`${snippetPct*100}%`,background:st.color,boxShadow:`0 0 8px ${st.color}`,transition:"width .12s linear"}}/>
            </div>
            {/* rodapé prévia */}
            <div style={{position:"relative",marginTop:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"monospace",fontSize:7.5,letterSpacing:1,color:"rgba(255,255,255,0.4)"}}>PRÉVIA · 0:22</span>
              <span style={{fontFamily:"monospace",fontSize:7.5,letterSpacing:1,color:"rgba(255,255,255,0.4)",display:"flex",alignItems:"center",gap:3}}>
                ÁLBUM COMPLETO
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2}><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
              </span>
            </div>
          </div>
        </div>
        )
      })()}

      {/* CONTROLES DE DIREÇÃO — fixos no fundo */}
      {!phoneOpen&&(
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,
          height:BOTOES_H_PCT,zIndex:50,
          display:"flex",alignItems:"center",
          justifyContent:"space-between",
          padding:"0 20px",
          background:"linear-gradient(to top, #05001a, transparent)",
        }}>
          <div style={{display:"flex",gap:12}}>
            <button
              onTouchStart={()=>leftRef.current=true}  onTouchEnd={()=>leftRef.current=false}
              onMouseDown={()=>leftRef.current=true}    onMouseUp={()=>leftRef.current=false}
              style={ctrlBtn()}
            >◀</button>
            <button
              onTouchStart={()=>rightRef.current=true} onTouchEnd={()=>rightRef.current=false}
              onMouseDown={()=>rightRef.current=true}  onMouseUp={()=>rightRef.current=false}
              style={ctrlBtn()}
            >▶</button>
          </div>
          <button
            onTouchStart={()=>accelRef.current=true}  onTouchEnd={()=>accelRef.current=false}
            onMouseDown={()=>accelRef.current=true}   onMouseUp={()=>accelRef.current=false}
            style={{
              width:76,height:76,borderRadius:"50%",
              background:`radial-gradient(circle,${C.neonPink}33,${C.neonPink}11)`,
              border:`3px solid ${C.neonPink}`,
              color:C.neonPink,fontSize:26,
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:`0 0 20px ${C.neonPink}55`,
              WebkitTapHighlightColor:"transparent",
              cursor:"pointer",
            }}
          >▲</button>
        </div>
      )}
    </div>
  )
}

function ctrlBtn(): React.CSSProperties {
  return {
    width:64,height:64,borderRadius:"50%",
    background:"rgba(255,107,53,0.15)",
    border:"2px solid #ff6b35aa",
    color:"#ff6b35",fontSize:22,
    display:"flex",alignItems:"center",justifyContent:"center",
    WebkitTapHighlightColor:"transparent",
    cursor:"pointer",
  }
}

function radioBtn(primary=false): React.CSSProperties {
  return {
    width: primary?46:36, height: primary?46:36,
    borderRadius:"50%",
    background: primary?"rgba(255,107,53,0.22)":"rgba(255,107,53,0.08)",
    border: `1.5px solid ${primary?"#ff6b35bb":"#ff6b3566"}`,
    color:"#ff6b35",
    display:"flex",alignItems:"center",justifyContent:"center",
    boxShadow: primary?"0 0 12px #ff6b3544":"none",
    WebkitTapHighlightColor:"transparent",
    cursor:"pointer",
    transition:"transform .12s",
  }
}

// ── SPRITE ──
function drawSprite(ctx:CanvasRenderingContext2D,x:number,y:number,scale:number,type:string){
  const h=Math.max(8,scale*8000)
  ctx.save(); ctx.translate(x,y)
  switch(type){
    case"palm":{
      ctx.fillStyle="#6b3a10"; ctx.fillRect(-h*0.04,-h,h*0.08,h)
      for(let a=0;a<6;a++){
        ctx.save(); ctx.translate(0,-h); ctx.rotate((a/6)*Math.PI*2)
        ctx.fillStyle=["#2d8b22","#3acd32","#1a6b14"][a%3]
        ctx.beginPath(); ctx.ellipse(h*0.32,0,h*0.36,h*0.055,0.3,0,Math.PI*2); ctx.fill()
        ctx.restore()
      }
      break
    }
    case"building":{
      const bw=h*0.55
      ctx.fillStyle="#110033"; ctx.fillRect(-bw/2,-h,bw,h)
      for(let wy=h*0.08;wy<h*0.9;wy+=h*0.1)
        for(let wx=bw*0.1;wx<bw*0.9;wx+=bw*0.22){
          ctx.fillStyle=(wy+wx)%3===0?"#ff990055":"#ffcc0044"
          ctx.fillRect(-bw/2+wx,-h+wy,bw*0.14,h*0.07)
        }
      break
    }
    case"post":{
      // haste
      ctx.fillStyle="#555"; ctx.fillRect(-h*0.025,-h,h*0.05,h)
      // braço
      ctx.fillStyle="#555"; ctx.fillRect(-h*0.025,-h,h*0.18,h*0.025)
      // luz neon com halo duplo
      const lc = ["#ff2d78","#00e5ff","#cc00ff"][Math.abs(Math.round(x/30))%3]
      ctx.shadowColor=lc; ctx.shadowBlur=h*0.22
      ctx.fillStyle=lc
      ctx.beginPath(); ctx.arc(h*0.18,-h,h*0.055,0,Math.PI*2); ctx.fill()
      ctx.shadowBlur=h*0.4
      ctx.globalAlpha=0.35
      ctx.beginPath(); ctx.arc(h*0.18,-h,h*0.14,0,Math.PI*2); ctx.fill()
      ctx.globalAlpha=1; ctx.shadowBlur=0
      break
    }
    case"sign":{
      // poste
      ctx.fillStyle="#555"; ctx.fillRect(-h*0.03,-h*0.43,h*0.06,h*0.43)
      // placa com glow neon
      ctx.shadowColor="#ff2d78"; ctx.shadowBlur=h*0.18
      ctx.fillStyle="#1a0033"; ctx.strokeStyle="#ff2d78"; ctx.lineWidth=h*0.025
      ctx.beginPath()
      ctx.roundRect(-h*0.30,-h*0.75,h*0.60,h*0.34,h*0.04)
      ctx.fill(); ctx.stroke()
      ctx.shadowBlur=0
      ctx.fillStyle="#ff2d78"; ctx.font=`bold ${h*0.11}px monospace`
      ctx.textAlign="center"; ctx.fillText("@lu2ca.art",0,-h*0.52)
      break
    }
  }
  ctx.restore()
}

// ── DASHBOARD ──
function drawDashboard(
  ctx:CanvasRenderingContext2D,
  W:number,H:number,DH:number,BOTOES_H:number,
  kmh:number,rpm:number,zone:string,curve:number,
  trackName:string,playing:boolean
){
  const y0=H-DH-BOTOES_H

  // fundo
  const g=ctx.createLinearGradient(0,y0,0,H-BOTOES_H)
  g.addColorStop(0,"#07001a"); g.addColorStop(1,"#0e0030")
  ctx.fillStyle=g; ctx.fillRect(0,y0,W,DH)

  // borda superior neon
  ctx.strokeStyle=C.neonOrange; ctx.lineWidth=2.5
  ctx.shadowColor=C.neonOrange; ctx.shadowBlur=10
  ctx.beginPath(); ctx.moveTo(0,y0); ctx.lineTo(W,y0); ctx.stroke()
  ctx.shadowBlur=0

  // gauges menores — lado esquerdo e direito, mais baixas
  const R = Math.min(DH*0.24, W*0.085)
  const cy = y0 + DH*0.62

  // velocímetro esq (max 222)
  gauge(ctx,W*0.14,cy,R,kmh,222,"#00ff88","#ffcc00","#ff2d78",`${kmh}`,"KM/H")
  // rpm dir
  gauge(ctx,W*0.86,cy,R,rpm,8,"#cc00ff","#ff6b35","#ff2d78",`${rpm}`,"RPM")

  // ── RÁDIO em destaque — ocupa centro com glow neon intenso ──
  const rW=W*0.52, rH=DH*0.46
  const rX=W/2-rW/2, rY=y0+DH*0.04

  // halo exterior
  ctx.shadowColor=playing?C.neonOrange:"#1a0040"; ctx.shadowBlur=playing?22:4
  ctx.fillStyle=playing?"#0a0020":"#06001a"
  ctx.strokeStyle=playing?C.neonOrange:"#2a1050"
  ctx.lineWidth=playing?1.5:1
  rRect(ctx,rX,rY,rW,rH,9); ctx.fill(); ctx.stroke()
  ctx.shadowBlur=0

  // linha superior neon decorativa
  if(playing){
    ctx.strokeStyle=C.neonOrange+"88"; ctx.lineWidth=1
    ctx.shadowColor=C.neonOrange; ctx.shadowBlur=6
    ctx.beginPath(); ctx.moveTo(rX+10,rY+1); ctx.lineTo(rX+rW-10,rY+1); ctx.stroke()
    ctx.shadowBlur=0
  }

  // label RADIO
  ctx.fillStyle=playing?C.neonOrange+"bb":"#333"
  ctx.font=`${rH*0.13}px monospace`
  ctx.textAlign="left"
  ctx.fillText("RÁDIO",rX+rW*0.05,rY+rH*0.20)

  // nome da faixa — grande e neon
  const maxChars = Math.floor(rW*0.72/(rH*0.19))
  const displayName = (trackName||"—").toUpperCase().slice(0,maxChars)
  ctx.shadowColor=playing?C.neonOrange:"transparent"; ctx.shadowBlur=playing?6:0
  ctx.fillStyle=playing?"#fff":"#444"
  ctx.font=`bold ${rH*0.24}px monospace`
  ctx.textAlign="left"
  ctx.fillText(displayName,rX+rW*0.05,rY+rH*0.50)
  ctx.shadowBlur=0

  // artista
  ctx.fillStyle=(playing?C.neonOrange:"#333")+"bb"
  ctx.font=`${rH*0.15}px monospace`
  ctx.fillText("LU2CA · UNTITLED",rX+rW*0.05,rY+rH*0.68)

  // barra de progresso neon
  ctx.fillStyle="#ffffff0a"; rRect(ctx,rX+rW*0.05,rY+rH*0.80,rW*0.90,3,2); ctx.fill()
  if(playing){
    ctx.shadowColor=C.neonOrange; ctx.shadowBlur=5
    ctx.fillStyle=C.neonOrange
    rRect(ctx,rX+rW*0.05,rY+rH*0.80,rW*0.90*0.40,3,2); ctx.fill()
    ctx.shadowBlur=0
  }

  // equalizador animado (barras neon)
  if(playing){
    const barCount=8, barW=rW*0.035, barGap=rW*0.014
    const barAreaX=rX+rW*0.60, barAreaY=rY+rH*0.22
    for(let b=0;b<barCount;b++){
      const bh = rH*(0.08+0.18*Math.abs(Math.sin(Date.now()*0.004+b*0.8)))
      ctx.shadowColor=C.neonOrange; ctx.shadowBlur=4
      ctx.fillStyle=C.neonOrange+"cc"
      ctx.fillRect(barAreaX+b*(barW+barGap),barAreaY+rH*0.18-bh,barW,bh)
    }
    ctx.shadowBlur=0
  }

  // zona
  ctx.fillStyle="#ffffff33"; ctx.font=`${DH*0.09}px monospace`
  ctx.textAlign="center"; ctx.fillText(zone,W/2,y0+DH*0.95)
}

function gauge(
  ctx:CanvasRenderingContext2D,
  x:number,y:number,r:number,
  val:number,max:number,
  c1:string,c2:string,c3:string,
  display:string,label:string
){
  const start=Math.PI*0.75, sweep=Math.PI*1.5
  const pct=Math.min(val/max,1)
  const angle=pct*sweep
  // fundo
  ctx.strokeStyle="#1a0040"; ctx.lineWidth=r*0.17
  ctx.beginPath(); ctx.arc(x,y,r,start,start+sweep); ctx.stroke()
  // arco
  ctx.strokeStyle=pct<0.5?c1:pct<0.8?c2:c3
  ctx.lineWidth=r*0.17
  ctx.shadowColor=pct<0.5?c1:c2; ctx.shadowBlur=7
  ctx.beginPath(); ctx.arc(x,y,r,start,start+angle); ctx.stroke()
  ctx.shadowBlur=0
  // agulha
  const na=start+angle
  ctx.strokeStyle="#fff"; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.moveTo(x,y)
  ctx.lineTo(x+Math.cos(na)*r*0.76,y+Math.sin(na)*r*0.76); ctx.stroke()
  ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(x,y,r*0.07,0,Math.PI*2); ctx.fill()
  // texto
  ctx.fillStyle="#fff"; ctx.font=`bold ${r*0.34}px monospace`; ctx.textAlign="center"
  ctx.fillText(display,x,y+r*0.14)
  ctx.fillStyle="#ffffff66"; ctx.font=`${r*0.16}px monospace`
  ctx.fillText(label,x,y+r*0.35)
}

function rRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}
