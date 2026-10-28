"use client"

// O BURACO DE MINHOCA (LU2CA 19/10: "o jogo começa num hyperlapse dentro de um
// buraco de minhoca, até cair no deserto"; 22/10, 1.1: "contínuo, fluido,
// infinitos fachos de luz"). Um shader só, num triângulo que cobre a tela: os
// fachos são faixas em coordenada polar que correm pro fundo; a velocidade é
// integrada no tempo (nunca por quadro), então não engasga a 30, 60 ou 120 Hz.
// No fim, o clarão e a Kombi cai no deserto (a queda é no Corrida). ~7 s; um
// toque pula. `saida`: os mesmos fachos por cima do deserto, freando e sumindo
// (2.1: o hyperlapse continua na queda, sem corte seco).
// (T37, J2: 1: "precisa de uma transição mais sutil entre a luz branca e a
// Kombi") a saída começa no branco do clarão e o branco se desfaz em ~1,5 s,
// por cima da Kombi já correndo no chão. `dur`: o túnel dura menos nos logins.

import { useEffect, useRef } from "react"
import { vento } from "../som"

export const DUR = 7200
const SAIDA = 2600

const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"
const FRAG = `precision mediump float;
uniform vec2 R;uniform float T,F,P,A,S,W;
float h(float n){return fract(sin(n*127.1)*43758.5453);}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);
  uv+=vec2(sin(T*.7),cos(T*.9))*.035*(1.-P)*(1.-S);
  float r=length(uv),a=atan(uv.y,uv.x)/6.2831853+.5;
  float z=.3/max(r,.002);
  vec3 c=vec3(0.);
  for(int L=0;L<3;L++){
    float l=float(L),n=72.+l*64.;
    float g=a*n+T*(.04+P*.25)*(l-1.);
    float id=floor(g),f=abs(fract(g)-.5)*2.;
    float s1=h(id+l*31.7),s2=h(id*1.37+l*7.1);
    float faixa=pow(max(0.,1.-f),10.-l*2.);
    float pos=z*(.35+s1*.3)+F*(.7+s1*.9)+s2*17.;
    float seg=fract(pos*.3);
    float len=.18+P*.55+S*.3+s1*.15;
    float st=seg<len?pow(1.-seg/len,1.6):0.;
    vec3 col=.55+.45*cos(6.2831*(s1*.6+vec3(0.,.33,.67))+T*.4+l);
    c+=col*faixa*st*(.6+s2*.8);
  }
  c*=smoothstep(.02,.22,r);
  float boca=(.03+P*P*.9)*(1.-S)/(r*6.+.08);
  c+=vec3(.75,.9,1.)*boca;
  vec3 fundo=vec3(.016,.008,.047)*(1.-S);
  c=c*A+fundo;
  float al=S>.5?min(1.,max(c.r,max(c.g,c.b))):1.;
  c=mix(c,vec3(1.,.98,.95),W);al=max(al,W);
  gl_FragColor=vec4(c,al);
}`

export function Minhoca({ onFim, saida = false, dur = DUR }: { onFim: () => void; saida?: boolean; dur?: number }) {
  const tela = useRef<HTMLCanvasElement>(null)
  const hyper = useRef<HTMLDivElement>(null)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])
  const feito = useRef(false)
  const acabar = () => { if (feito.current) return; feito.current = true; fim.current() }
  useEffect(() => {
    const w = saida ? null : vento()
    const cv = tela.current
    const gl = cv?.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" }) ?? null
    const u: Record<string, WebGLUniformLocation | null> = {}
    if (gl) {
      const sh = (t: number, s: string) => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); return o }
      const pr = gl.createProgram()!
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr); gl.useProgram(pr)
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      for (const k of ["R", "T", "F", "P", "A", "S", "W"]) u[k] = gl.getUniformLocation(pr, k)
    }
    let raf = 0, acabou = false, F = 0, ant = performance.now()
    const t0 = ant
    const quadro = (agora: number) => {
      const ms = Math.max(0, agora - t0)
      const dt = Math.max(0, Math.min(0.1, (agora - ant) / 1000)); ant = agora
      const p = saida ? 1 : Math.min(1, ms / dur)
      const q = saida ? Math.min(1, ms / SAIDA) : 0
      // a velocidade dos fachos: acelera no túnel; na saída, freia junto com a Kombi
      const vel = saida ? 4.6 * Math.exp(-q * 3.2) : 0.35 + p * p * 4.2
      F += vel * dt
      if (gl && cv) {
        const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(1.5, devicePixelRatio)
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); gl.viewport(0, 0, cv.width, cv.height) }
        gl.uniform2f(u.R, cv.width, cv.height)
        gl.uniform1f(u.T, ms / 1000); gl.uniform1f(u.F, F); gl.uniform1f(u.P, p)
        gl.uniform1f(u.A, saida ? (1 - q) * (1 - q) : 1); gl.uniform1f(u.S, saida ? 1 : 0)
        // o branco do clarão se desfaz devagar (ease-out) nos primeiros ~1,5 s da saída
        const wb = saida ? Math.max(0, 1 - ms / 1500) : 0
        gl.uniform1f(u.W, wb * wb * (3 - 2 * wb))
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      // os anéis do hyperlapse (o mesmo desenho da pista), só no túnel
      const hl = hyper.current
      if (hl) {
        const f = (agora / 1000) * (0.8 + p * 5)
        const [a, b] = hl.children as unknown as HTMLElement[]
        const f1 = f % 1, f2 = (f + 0.5) % 1
        a.style.transform = `scale(${(1 + f1 * 1.6).toFixed(3)}) rotate(${(f * 3).toFixed(1)}deg)`
        a.style.opacity = Math.sin(f1 * Math.PI).toFixed(3)
        b.style.transform = `scale(${(1 + f2 * 1.6).toFixed(3)}) rotate(${(-f * 2).toFixed(1)}deg)`
        b.style.opacity = Math.sin(f2 * Math.PI).toFixed(3)
        hl.style.opacity = String(Math.min(0.6, 0.15 + p * 0.45))
      }
      if (!saida && p >= 1 && !acabou) { acabou = true; acabar(); return }
      if (saida && q >= 1) return
      raf = requestAnimationFrame(quadro)
    }
    raf = requestAnimationFrame(quadro)
    return () => { cancelAnimationFrame(raf); w?.parar(); gl?.getExtension("WEBGL_lose_context")?.loseContext() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saida])
  if (saida) return <div className="l-minhoca is-saida" aria-hidden="true"><canvas ref={tela} /></div>
  return (
    <div className="l-minhoca" onPointerDown={acabar} role="presentation" style={{ ["--dur" as string]: `${dur}ms` }}>
      <canvas ref={tela} />
      <div ref={hyper} className="l-hyper is-hyper" aria-hidden="true"><i /><i /></div>
      <div className="l-minhoca-clarao" aria-hidden="true" />
    </div>
  )
}
