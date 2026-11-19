"use client"
/* eslint-disable react-hooks/immutability -- three.js: o piloto, os rivais e a câmera mudam a cada passo */

// As trincheiras (T11 + T13): os túneis, as raízes da cidade-árvore. (05/11)
// Uma rede grande: 5 rios secos em pentágono, a galeria do atalho e a rampa da
// descida (a porta de entrada); nos encontros, os salões: 3 torres que sobem pra
// rua, o salão do metrô e o do grafite (docs/tuneis.md). As paredes são curvas:
// dá pra subir nelas e, rápido o bastante, voar da borda e voltar.
// T13: a corrida. Escolhe BMX, patins ou skate; larga na TORRE 1, passa pelos
// 5 rios (um portão em cada) e chega de volta, contra 3 rivais e o próprio
// fantasma (o recorde, salvo no aparelho).
// T63: moram DENTRO do jogo. O /linha monta este componente quando o jogador
// desce a boca do túnel no subúrbio (noJogo: a missão pegada e a subida de
// volta); /teste/trincheiras segue só fora da produção, pros testes e medições.
//
// Desempenho: a física anda em passos fixos de 1/120 s e a tela interpola
// (o relógio do jogo); o mapa sai em pedaços (trechos de ~200 m e os salões, até
// 6 desenhos cada, materiais divididos) e só os pedaços perto da câmera aparecem
// (o resto está na névoa); sem luz de ponto; a corrida soma 7 portões, o trilho
// e até 4 corredores (um desenho cada).
// ?medir expõe __gl/__cena/__cam/__estado; ?auto liga o piloto automático;
// ?livre (ou ?auto sozinho) = passeio sem corrida; ?veiculo=bmx|patins|skate
// larga direto; ?corrida com ?auto: mostra a escolha e o piloto corre.
// T14: a MOTO é o 4º cartão, trancado (as motos chegam depois); ?motos libera
// (e ?motos&veiculo=moto larga direto). ?parede: o piloto automático da moto
// anda nas paredes. 4 motos rivais, 2 voltas, tranco.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Cinema } from "@/app/linha/estrada/Cinema"
import { Patinador } from "@/app/linha/estrada/Patins"
import { QUALIDADE } from "@/app/linha/estrada/qualidade"
import { montarPatins } from "@/app/linha/som-carro"
import { DPR, ResolucaoDinamica } from "@/app/linha/estrada/resolucao"
import {
  CHECKPOINTS, CHEGADA, FISICA, INFO, LARGADA, VEICULOS,
  criarRivais, lerRecordes, naVolta, poseFantasma, relogio,
  type Pose, type Recorde, type Veiculo,
} from "./corrida"
import {
  CONTAGEM, PARADO, PASSO, corridaInicial, estadoInicial, passo, passoCorrida, piloto,
  type Corrida, type Entrada, type Estado, type Fase,
} from "./fisica"
import { montarPedacos, texturaAtlas } from "./geo"
import { geoCorredor, geoPortao, geoTrilho } from "./geoCorrida"
import { AVENIDAS, COR_TORRE, LIMITES, NOME_AVENIDA, NOME_SALAO, PORTA, SALAO_LARGADA, SALOES, TETO, TORRES, ondeEsta, perfil } from "./mapa"
import { pilotoMoto } from "./moto"
import { Ciclista, Motoqueiro, Skatista, type Manobra } from "./Pilotos"
import "./trincheiras.css"
import { RioDepois } from "./RioDepois"
import { TremTuneis } from "./TremTuneis"
import { FINAL_VIVO } from "../disco/final"
import { Cadeado, Trancado } from "../Trancado"
import { TRANCA_MOTO, naMoto } from "../estrada/zonas"
import { SEGUNDOS_CABINE, lembrarVeiculoTunel, rotuloSubir, veiculoTunel } from "../disco/elevadores"
import { TERROR, marcarTerrorVisto, terrorVisto } from "../disco/terror"
import { PocoTerror } from "./PocoTerror"
import { EntradasElevador } from "../disco/Elevadores3D"
import { FOV_PAREDE, PAREDE_ABERTA } from "./atlasParedes"
import { ParedesPintadas } from "./ParedesPintadas"
import { PalcoTuneis } from "./PalcoTuneis"

const NEVOA = "#1a0f24"
const NEVOA_LONGE = 340 // a névoa fecha aqui
const VER = NEVOA_LONGE + 20 // os pedaços mais longe que isto da câmera não desenham

// (06/11) depois do final o rio corre: o "RIO SECO A" vira "RIO A"
function nomeDe(o: Estado["onde"]) { return o.tipo === "praca" ? NOME_SALAO[o.i] : FINAL_VIVO.feito ? NOME_AVENIDA[o.i].replace("SECO ", "") : NOME_AVENIDA[o.i] }

const PORTOES = [LARGADA, ...CHECKPOINTS, CHEGADA]
type Painel = { recordeAntes: number | null; fantasma: boolean; resultado: Corrida["resultado"]; parciais: number[] }

function Mundo({ rodada, st, entrada, auto, parede, veiculo, corrida, mudouFase }: {
  rodada: number; st: React.MutableRefObject<Estado>; entrada: React.MutableRefObject<Entrada>; auto: boolean; parede: boolean; veiculo: Veiculo
  corrida: React.MutableRefObject<Corrida>; mudouFase: (f: Fase) => void
}) {
  const { scene, camera, gl } = useThree()
  // o mapa em pedaços (montado uma vez) e os materiais, um de cada pra todos os pedaços
  const pedacos = useMemo(() => montarPedacos(), [])
  const tex = useMemo(() => texturaAtlas(), [])
  const mats = useMemo(() => ({
    concreto: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.05, side: THREE.DoubleSide }),
    neon: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }),
    atlas: new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, toneMapped: false }),
    vidro: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    poeira: new THREE.PointsMaterial({ color: "#ffcf8a", size: 0.09, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }),
    raiz: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, emissive: "#0d3a30", emissiveIntensity: 0.6 }),
  }), [tex])
  useEffect(() => () => {
    for (const p of pedacos) for (const g of [p.concreto, p.neon, p.vidro, p.atlas, p.raizes, p.poeira]) g?.dispose()
    for (const m of Object.values(mats)) m.dispose()
    tex.dispose()
  }, [pedacos, mats, tex])
  const grupos = useRef<(THREE.Group | null)[]>([])
  const portoes = useMemo(() => PORTOES.map(geoPortao), [])
  const trilho = useMemo(() => geoTrilho(), [])
  const corpos = useMemo(() => criarRivais(veiculo).map((r) => geoCorredor(r.veiculo, r.cor)), [veiculo])
  const corpoFantasma = useMemo(() => geoCorredor(veiculo, "#bff6ff"), [veiculo])
  const corpo = useRef<THREE.Group>(null)
  const rivaisRef = useRef<(THREE.Mesh | null)[]>([])
  const fantasmaRef = useRef<THREE.Mesh>(null)
  const portaoMat = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const ultCp = useRef(-1)
  const acc = useRef(0)
  const cam = useRef({ p: new THREE.Vector3(), olhar: new THREE.Vector3(), ok: false })
  const tmp = useMemo(() => ({ q: new THREE.Quaternion(), qy: new THREE.Quaternion(), n: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), alvo: new THREE.Vector3(), olha: new THREE.Vector3(), pose: { x: 0, z: 0, y: 0, yaw: 0, incl: 0, nx: 0, nz: 0 } as Pose, fp: { x: 0, z: 0, y: 0, yaw: 0 }, m: new THREE.Matrix4(), f: new THREE.Vector3(), w: new THREE.Vector3(), r: new THREE.Vector3() }), [])
  const V = FISICA[veiculo]
  const emCorrida = corrida.current.fase !== "livre"
  // (T62) de patins: o barulhinho das rodas de gel; no ar, o vento neon (o mesmo som do patins da rua)
  const somPatins = useRef<ReturnType<typeof montarPatins>>(null)
  useEffect(() => {
    if (veiculo !== "patins") return
    const som = montarPatins()
    somPatins.current = som
    return () => { som?.parar(); somPatins.current = null }
  }, [veiculo])

  useEffect(() => {
    scene.fog = new THREE.Fog(NEVOA, 40, NEVOA_LONGE)
    scene.background = new THREE.Color(NEVOA)
    const w = window as unknown as Record<string, unknown>
    if (/[?&]medir/.test(location.search)) { w.__cena = scene; w.__gl = gl; w.__cam = camera }
    return () => { scene.fog = null }
  }, [scene, gl, camera])
  // nova largada (ou troca de veículo): a câmera pula pro piloto, os portões se refazem
  useEffect(() => { cam.current.ok = false; ultCp.current = -1; acc.current = 0 }, [rodada])

  useFrame((_, dtq) => {
    const s = st.current, c = corrida.current
    // o relógio: passos fixos; a tela interpola entre o passo de antes e o de agora
    acc.current = Math.min(acc.current + Math.min(dtq, 0.1), 0.25)
    // (08/11) pintando uma parede livre: o piloto para e a câmera vai até ela
    const par = PAREDE_ABERTA.l
    const travado = c.fase === "contagem" || c.fase === "escolha" || !!par
    while (acc.current >= PASSO) {
      const ent = c.fase === "chegou" ? PARADO : auto ? (V.moto ? pilotoMoto(s, parede) : piloto(s)) : entrada.current
      passo(s, ent, PASSO, V, travado, c.fase === "livre" ? s.dist : c.tempo + (CONTAGEM - c.conta))
      if (c.fase !== "livre") passoCorrida(c, s, PASSO, veiculo, mudouFase)
      acc.current -= PASSO
    }
    somPatins.current?.atualizar(Math.hypot(s.vx, s.vz) / V.vmax, !s.ar && !travado, s.ar)
    const k = acc.current / PASSO
    const x = s.ant.x + (s.x - s.ant.x) * k, z = s.ant.z + (s.z - s.ant.z) * k, y = s.ant.y + (s.y - s.ant.y) * k
    let dy = s.yaw - s.ant.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    const yaw = s.ant.yaw + dy * k
    const g = corpo.current
    if (g) {
      if (g.visible === !!par) g.visible = !par // o piloto não fica na frente da parede
      g.position.set(x, y, z)
      // de pé em relação à parede: inclina junto com a curva
      tmp.n.set(-s.nx * s.incl, 1, -s.nz * s.incl).normalize()
      tmp.q.setFromUnitVectors(tmp.up, tmp.n)
      tmp.qy.setFromAxisAngle(tmp.up, yaw)
      g.quaternion.copy(tmp.q).multiply(tmp.qy)
      if (s.parede) {
        // T14: na parede, as rodas na parede e o nariz na direção em que anda (subindo ou descendo)
        tmp.f.set(Math.sin(yaw), 0, Math.cos(yaw))
        tmp.w.crossVectors(tmp.f, tmp.n).normalize(); if (tmp.w.y < 0) tmp.w.negate()
        const a = Math.max(-0.6, Math.min(0.6, s.pitch))
        tmp.f.multiplyScalar(Math.cos(a)).addScaledVector(tmp.w, Math.sin(a))
        tmp.f.addScaledVector(tmp.n, -tmp.f.dot(tmp.n)).normalize()
        tmp.r.crossVectors(tmp.n, tmp.f).normalize()
        tmp.m.makeBasis(tmp.r, tmp.n, tmp.f)
        g.quaternion.setFromRotationMatrix(tmp.m)
      }
    }
    if (emCorrida) {
      // os rivais (interpolados igual) e o fantasma
      for (let i = 0; i < c.rivais.length; i++) {
        const r = c.rivais[i]
        const m = rivaisRef.current[i]; if (!m) continue
        const p = naVolta(r.ant.d + (r.d - r.ant.d) * k, r.ant.lado + (r.lado - r.ant.lado) * k, tmp.pose)
        m.position.set(p.x, p.y, p.z)
        tmp.n.set(-p.nx * p.incl, 1, -p.nz * p.incl).normalize()
        tmp.q.setFromUnitVectors(tmp.up, tmp.n); tmp.qy.setFromAxisAngle(tmp.up, p.yaw)
        m.quaternion.copy(tmp.q).multiply(tmp.qy)
      }
      const f = fantasmaRef.current
      if (f) {
        const ok = !!c.fantasma && (c.fase === "correndo" || c.fase === "chegou") && poseFantasma(c.fantasma.rastro, c.tempo, tmp.fp)
        f.visible = ok
        if (ok) { f.position.set(tmp.fp.x, tmp.fp.y, tmp.fp.z); f.rotation.set(0, tmp.fp.yaw, 0) }
      }
      // os portões: o próximo acende, os passados ficam verdes e fracos
      if (ultCp.current !== c.cp) {
        ultCp.current = c.cp
        portaoMat.current.forEach((mat, i) => {
          if (!mat) return
          const prox = i > 0 && (i <= CHECKPOINTS.length ? i - 1 === c.cp : c.cp === CHECKPOINTS.length)
          const passou = i === 0 || (i <= CHECKPOINTS.length && i - 1 < c.cp)
          mat.color.set(passou ? "#4dffa0" : PORTOES[i].cor)
          mat.opacity = prox ? 1 : passou ? 0.18 : 0.3
        })
      }
    }
    // a câmera atrás, um pouco acima; não entra na parede nem no vidro
    const fx = Math.sin(yaw), fz = Math.cos(yaw)
    const vel = Math.hypot(s.vx, s.vz)
    const longe = 6.2 + vel * 0.05
    tmp.alvo.set(x - fx * longe, y + 2.4 + vel * 0.012, z - fz * longe)
    const oc = ondeEsta(tmp.alvo.x, tmp.alvo.z)
    if (oc.e > 1.5) { tmp.alvo.x -= oc.nx * (oc.e - 1.5); tmp.alvo.z -= oc.nz * (oc.e - 1.5) }
    tmp.alvo.y = Math.min(TETO - 1, Math.max(tmp.alvo.y, perfil(Math.min(oc.e, 1.5)).y + 1.4))
    tmp.olha.set(x + fx * 5, y + 1.3, z + fz * 5)
    if (par) { tmp.alvo.set(par.x + par.nx * PAREDE_ABERTA.d, par.y, par.z + par.nz * PAREDE_ABERTA.d); tmp.olha.set(par.x, par.y, par.z) }
    const cm = cam.current, kk = 1 - Math.exp(-dtq * 7)
    if (!cm.ok) { cm.p.copy(tmp.alvo); cm.olhar.copy(tmp.olha); cm.ok = true }
    cm.p.lerp(tmp.alvo, kk); cm.olhar.lerp(tmp.olha, 1 - Math.exp(-dtq * 12))
    camera.position.copy(cm.p); camera.lookAt(cm.olhar)
    // só os pedaços perto da câmera desenham (o resto já sumiu na névoa)
    for (let i = 0; i < pedacos.length; i++) {
      const gr = grupos.current[i]; if (!gr) continue
      const p = pedacos[i], vis = Math.hypot(cm.p.x - p.x, cm.p.z - p.z) - p.r < VER
      if (gr.visible !== vis) gr.visible = vis
    }
    const pc = camera as THREE.PerspectiveCamera, fov = par ? FOV_PAREDE : 66 + Math.min(16, vel * 0.4)
    if (Math.abs(pc.fov - fov) > 0.05) { pc.fov += (fov - pc.fov) * kk; pc.updateProjectionMatrix() }
  })

  const s = st.current
  const vel = () => Math.hypot(st.current.vx, st.current.vz)
  const steer = () => (entrada.current.esq ? 1 : 0) - (entrada.current.dir ? 1 : 0)
  const noAr = () => st.current.ar
  const manobra = (): Manobra => { const m = st.current.manobra; return m ? { tipo: m.tipo, p: Math.min(1, m.t / (V.durManobra || 1)) } : null }
  // o nariz da moto em relação ao corpo: no chão, a empinada; no ar, o nariz todo; na parede, a base já faz
  const pitchMoto = () => { const m = st.current; return m.parede ? 0 : m.ar ? m.pitch : m.pitch - m.pitchChao }
  return (
    <>
      <hemisphereLight args={["#8a68b8", "#2a1f3c", 2]} />
      <directionalLight position={[0.3, 1, 0.2]} intensity={0.9} color="#ffb070" />
      {pedacos.map((p, i) => (
        <group key={i} ref={(g) => { grupos.current[i] = g }} matrixAutoUpdate={false}>
          {p.concreto && <mesh geometry={p.concreto} material={mats.concreto} matrixAutoUpdate={false} />}
          {p.neon && <mesh geometry={p.neon} material={mats.neon} matrixAutoUpdate={false} />}
          {p.atlas && <mesh geometry={p.atlas} material={mats.atlas} matrixAutoUpdate={false} />}
          {p.raizes && <mesh geometry={p.raizes} material={mats.raiz} matrixAutoUpdate={false} />}
          {p.vidro && <mesh geometry={p.vidro} material={mats.vidro} matrixAutoUpdate={false} renderOrder={2} />}
          {p.poeira && <points geometry={p.poeira} material={mats.poeira} matrixAutoUpdate={false} renderOrder={3} />}
        </group>
      ))}
      {/* (06/11) o trem parado no salão do metrô (metro.glb; reserva: as caixas de antes) */}
      <TremTuneis concreto={mats.concreto} neon={mats.neon} />
      {/* o trilho do grind: só pro skate */}
      {veiculo === "skate" && (
        <mesh geometry={trilho} matrixAutoUpdate={false} renderOrder={2}><meshBasicMaterial color="#7dffb0" transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
      )}
      {emCorrida && portoes.map((pg, i) => (
        <mesh key={i} geometry={pg} matrixAutoUpdate={false} renderOrder={2}>
          <meshBasicMaterial ref={(m) => { portaoMat.current[i] = m }} color={PORTOES[i].cor} transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {emCorrida && corpos.map((cg, i) => (
        <mesh key={i} ref={(m) => { rivaisRef.current[i] = m }} geometry={cg}><meshStandardMaterial vertexColors roughness={0.65} /></mesh>
      ))}
      {emCorrida && (
        <mesh ref={fantasmaRef} geometry={corpoFantasma} visible={false} renderOrder={4}>
          <meshBasicMaterial vertexColors transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}
      <group ref={corpo} position={[s.x, 0, s.z]}>
        {veiculo === "patins" && (
          <Patinador vel={vel} steer={steer} ar={noAr} jato={() => entrada.current.jato && entrada.current.frente && st.current.jatoT < 2.5} />
        )}
        {veiculo === "bmx" && <Ciclista vel={vel} steer={steer} ar={noAr} manobra={manobra} />}
        {veiculo === "skate" && <Skatista vel={vel} steer={steer} ar={noAr} manobra={manobra} grind={() => st.current.grind} empurra={() => st.current.empurrando} />}
        {veiculo === "moto" && <Motoqueiro vel={vel} steer={steer} ar={noAr} pitch={pitchMoto} empurra={() => entrada.current.frente || auto} />}
      </group>
    </>
  )
}

// o mapinha: os rios, os salões, os portões, os rivais e você
const VIEWBOX = (() => { const l = LIMITES, w = l.x1 - l.x0, h = l.z1 - l.z0, m = Math.max(w, h); return `${((l.x0 + l.x1 - m) / 2).toFixed(0)} ${((l.z0 + l.z1 - m) / 2).toFixed(0)} ${m.toFixed(0)} ${m.toFixed(0)}` })()
function Mapinha({ ponto, rivais, cores }: { ponto: React.RefObject<SVGCircleElement | null>; rivais: React.RefObject<(SVGCircleElement | null)[]>; cores: string[] | null }) {
  const caminhos = useMemo(() => AVENIDAS.map((a) => a.pts.filter((_, k) => k % 6 === 0 || k === a.pts.length - 1).map((p) => `${p.x.toFixed(0)},${p.z.toFixed(0)}`).join(" ")), [])
  return (
    <svg className="tr-mapa" viewBox={VIEWBOX} aria-hidden>
      {caminhos.map((c, i) => <polyline key={i} points={c} fill="none" stroke={AVENIDAS[i].cor} strokeWidth={36} strokeLinecap="round" opacity={AVENIDAS[i].volta ? 0.75 : 0.45} />)}
      {SALOES.map((t) => <circle key={t.i} cx={t.c.x} cy={t.c.z} r={t.r} fill={COR_TORRE} opacity={t.torre ? 0.85 : 0.6} />)}
      <rect x={PORTA.c.x - 16} y={PORTA.c.z - 16} width={32} height={32} fill="#ffcf8a" />
      {/* (elevadores) o ícone do elevador em cada torre: a cabine com ▲▼ */}
      {TORRES.map((t) => (
        <g key={`el${t.i}`} transform={`translate(${t.torre.x} ${t.torre.z})`}>
          <rect x={-30} y={-38} width={60} height={76} rx={8} fill="#14121c" stroke="#ffcf8a" strokeWidth={8} />
          <path d="M0 -28 L14 -8 L-14 -8 Z M0 28 L14 8 L-14 8 Z" fill="#ffcf8a" />
        </g>
      ))}
      {cores && CHECKPOINTS.map((g, i) => <rect key={i} x={g.x - 24} y={g.z - 24} width={48} height={48} fill="none" stroke="#fff" strokeWidth={10} transform={`rotate(45 ${g.x} ${g.z})`} />)}
      {cores && cores.map((cor, i) => <circle key={i} ref={(el) => { if (rivais.current) rivais.current[i] = el }} r={24} fill={cor} />)}
      <circle ref={ponto} r={36} fill="#fff" stroke="#14121c" strokeWidth={10} />
    </svg>
  )
}

function lerVeiculo(q: URLSearchParams, motos: boolean): Veiculo | null {
  const v = q.get("veiculo")
  return v === "bmx" || v === "patins" || v === "skate" || (v === "moto" && motos) ? v : null
}

// (T63) dentro do jogo: com a missão dos túneis pegada, a corrida (a escolha do
// veículo); sem ela, só passear (de patins; "correr" segue ali). Subir = de volta
// pro subúrbio, contando se correu uma volta inteira
// (vitrine, 02/11) `tranca`: a corrida ainda não abriu (o aviso do que libera);
// dá pra entrar e passear, e a escolha mostra os veículos com o cadeado
// `motos`: a moto já liberada (a regra de estrada/zonas.ts, motoLiberada: ganha na missão dos túneis)
export type NoJogo = { missao: string | null; onSubir: (correu: boolean) => void; tranca?: string | null; motos?: boolean
  // (T64) algo em 3D por cima (a fuga do metrô no trem do salão): o canvas para (frameloop "never")
  pausado?: boolean
  // (elevadores, 06/11) as 3 torres dos salões sobem pras torres das pontas (disco/elevadores.ts);
  // tranca = o cadeado (antes da missão dos túneis); chegaNa = desceu pelo elevador N
  elevador?: { tranca: string | null; onSubir: (n: number, modo: "patins" | "moto") => void }
  chegaNa?: number | null }

export function Trincheiras({ noJogo }: { noJogo?: NoJogo } = {}) {
  const st = useRef<Estado>(estadoInicial())
  const entrada = useRef<Entrada>({ frente: false, re: false, esq: false, dir: false, pulo: false, jato: false })
  const corrida = useRef<Corrida>(corridaInicial("escolha"))
  const [auto, setAuto] = useState(false)
  const [parede, setParede] = useState(false)
  const [motos, setMotos] = useState(!!noJogo?.motos) // T14: a regra mora em estrada/zonas.ts (motoLiberada); ?motos libera pra testar
  const [fixa, setFixa] = useState<number | null>(null)
  const [intro, setIntro] = useState(false)
  const [fase, setFase] = useState<Fase>("escolha")
  const [veiculo, setVeiculo] = useState<Veiculo>("patins")
  const [recordes, setRecordes] = useState<Partial<Record<Veiculo, Recorde>>>({})
  const [rodada, setRodada] = useState(0) // muda a cada largada
  // (T57) veio do mapa pela boca do túnel (?volta=disco): a volta sobe pro subúrbio; correu = conta pra missão
  const [volta, setVolta] = useState(false)
  const [correu, setCorreu] = useState(false)
  const [subindo, setSubindo] = useState(false)
  // (elevadores) perto de qual torre (1–3, 0 = nenhuma): muda só ao chegar/sair (o painel de 20/s compara)
  const [elevPerto, setElevPerto] = useState(0)
  const elevPertoRef = useRef(0)
  const [cabine, setCabine] = useState<number | null>(null)
  // (T47, RASCUNHO) o elevador de terror: subindo pelo poço do elevador 2 (null = não)
  const [terror, setTerror] = useState<number | null>(null)
  const [viuTerror, setViuTerror] = useState(false)
  useEffect(() => { setViuTerror(terrorVisto()) }, []) // eslint-disable-line react-hooks/set-state-in-effect -- o save, no cliente
  const [painel, setPainel] = useState<Painel>({ recordeAntes: null, fantasma: false, resultado: null, parciais: [] })
  const velRef = useRef<HTMLSpanElement>(null)
  const ondeRef = useRef<HTMLSpanElement>(null)
  const torreRef = useRef<HTMLParagraphElement>(null)
  const tempoRef = useRef<HTMLSpanElement>(null)
  const cpRef = useRef<HTMLSpanElement>(null)
  const lugarRef = useRef<HTMLSpanElement>(null)
  const contaRef = useRef<HTMLParagraphElement>(null)
  const avisoRef = useRef<HTMLParagraphElement>(null)
  const jatoRef = useRef<HTMLSpanElement>(null)
  const ponto = useRef<SVGCircleElement>(null)
  const pontosRivais = useRef<(SVGCircleElement | null)[]>([])
  const narizRef = useRef<HTMLSpanElement>(null)
  const coresRivais = useMemo(() => criarRivais(veiculo).map((r) => r.cor), [veiculo])

  // larga: zera o piloto e a corrida, carrega o fantasma, começa a contagem
  const largar = (v: Veiculo) => {
    const recs = lerRecordes(), r = recs[v]
    st.current = estadoInicial()
    const c = corridaInicial("contagem", v)
    c.fantasma = r ?? null
    c.recordeAntes = r ? r.ms / 1000 : null
    corrida.current = c
    setPainel({ recordeAntes: c.recordeAntes, fantasma: !!c.fantasma, resultado: null, parciais: [] })
    setRecordes(recs); setVeiculo(v); setFase("contagem"); setIntro(false); setRodada((n) => n + 1)
  }
  // o passeio: ao descer, começa na porta (a descida); da tela da corrida, ali mesmo na TORRE 1
  const passear = (v: Veiculo, onde: "largada" | "descida" | number = "largada") => {
    st.current = estadoInicial(onde)
    corrida.current = corridaInicial("livre", v)
    setVeiculo(v); setFase("livre"); setIntro(true); setRodada((n) => n + 1)
  }
  const escolher = () => { corrida.current = corridaInicial("escolha"); st.current = estadoInicial(); setRecordes(lerRecordes()); setFase("escolha"); setIntro(false); setRodada((n) => n + 1) }
  const mudouFase = (f: Fase) => {
    setFase(f)
    if (f === "chegou") { setCorreu(true); const c = corrida.current; setRecordes(lerRecordes()); setPainel((p) => ({ ...p, resultado: c.resultado, parciais: [...c.parciais] })) }
  }

  useEffect(() => {
    const q = new URLSearchParams(location.search)
    const motosAqui = !!noJogo?.motos || q.has("motos")
    const v = lerVeiculo(q, motosAqui)
    /* eslint-disable react-hooks/set-state-in-effect -- lê a URL uma vez, no cliente */
    if (q.has("auto")) setAuto(true)
    if (q.has("parede")) setParede(true)
    if (q.has("motos")) setMotos(true)
    if (q.get("volta") === "disco" || noJogo) setVolta(true)
    const d = q.get("dpr"); if (q.has("medir") && d) setFixa(+d)
    setRecordes(lerRecordes())
    // ?livre, ou ?auto sozinho (a medição e o teste do T11): passeio
    if (q.has("livre") || (q.has("auto") && !q.has("corrida") && !v) || (noJogo && !noJogo.missao && !v)) passear(v ?? (noJogo?.chegaNa ? veiculoTunel() : null) ?? (noJogo && motosAqui && naMoto.agora ? "moto" : "patins"), q.has("auto") ? "largada" : noJogo?.chegaNa ?? "descida") // desceu de moto: segue de moto
    else if (v) largar(v)
    /* eslint-enable react-hooks/set-state-in-effect */
    const w = window as unknown as Record<string, unknown>
    w.__estado = () => {
      const s = st.current, c = corrida.current
      return {
        x: +s.x.toFixed(1), z: +s.z.toFixed(1), y: +s.y.toFixed(2), kmh: Math.round(Math.hypot(s.vx, s.vz) * 3.6), dist: Math.round(s.dist), ar: s.ar, onde: nomeDe(s.onde), voos: s.voos,
        fase: c.fase, cp: c.cp, tempo: +c.tempo.toFixed(2), lugar: c.lugar, grind: s.grind, manobras: s.total.manobras, grinds: s.total.grinds, tombos: s.total.tombos,
        rivais: c.rivais.map((r) => ({ nome: r.nome, d: Math.round(r.d), fim: r.fim })), resultado: c.resultado,
        // T14: a moto
        volta: c.volta, voltas: c.voltas, parede: s.parede, paredes: s.total.paredes, paredeMaxT: +s.paredeMaxT.toFixed(2), pousos: s.total.pousos, flips: s.total.flips, pitch: +s.pitch.toFixed(2),
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uma vez, ao descer
  }, [])
  useEffect(() => { if (!intro) return; const t = setTimeout(() => setIntro(false), 6000); return () => clearTimeout(t) }, [intro])

  // o teclado: setas/WASD andam, espaço pula, shift (ou E) é a ação do veículo
  useEffect(() => {
    const mapa: Record<string, keyof Entrada> = { ArrowUp: "frente", KeyW: "frente", ArrowDown: "re", KeyS: "re", ArrowLeft: "esq", KeyA: "esq", ArrowRight: "dir", KeyD: "dir", Space: "pulo", ShiftLeft: "jato", ShiftRight: "jato", KeyE: "jato", KeyJ: "jato" }
    const f = (v: boolean) => (ev: KeyboardEvent) => { const k = mapa[ev.code]; if (!k) return; ev.preventDefault(); entrada.current[k] = v; if (v) setIntro(false) }
    const d = f(true), u = f(false)
    window.addEventListener("keydown", d); window.addEventListener("keyup", u)
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u) }
  }, [])

  // o painel: 20 vezes por segundo, direto no DOM (sem render do React)
  useEffect(() => {
    const pose: Pose = { x: 0, z: 0, y: 0, yaw: 0, incl: 0, nx: 0, nz: 0 }
    const id = setInterval(() => {
      const s = st.current, c = corrida.current
      if (velRef.current) velRef.current.textContent = String(Math.round(Math.hypot(s.vx, s.vz) * 3.6))
      if (ondeRef.current) ondeRef.current.textContent = nomeDe(s.onde)
      if (ponto.current) { ponto.current.setAttribute("cx", s.x.toFixed(0)); ponto.current.setAttribute("cy", s.z.toFixed(0)) }
      if (torreRef.current) {
        const perto = c.fase === "livre" ? TORRES.find((t) => Math.hypot(s.x - t.torre.x, s.z - t.torre.z) < 16) : undefined
        const naPorta = c.fase === "livre" && Math.hypot(s.x - PORTA.c.x, s.z - PORTA.c.z) < 18
        // (elevadores) as torres viraram elevador: sobem pra torre da ponta (no jogo); fora dele, o texto de antes
        const n = perto && noJogo?.elevador ? TORRES.indexOf(perto) + 1 : 0
        if (n !== elevPertoRef.current) { elevPertoRef.current = n; setElevPerto(n) }
        torreRef.current.textContent = perto ? (n ? `${NOME_SALAO[perto.i]} · o elevador sobe pra torre ${n}, lá na cidade` : `${NOME_SALAO[perto.i]} · fechada por cima: a saída é A PORTA (o quadradinho laranja no mapinha)`) : naPorta ? "A PORTA · por aqui se sobe pro subúrbio (a Kombi espera lá fora)" : ""
      }
      if (jatoRef.current) jatoRef.current.style.transform = `scaleX(${Math.max(0, 1 - s.jatoT / 2.5)})`
      // a moto: o nariz (no ar, pra acertar o pouso: verde = alinhado com o chão embaixo)
      if (narizRef.current) {
        const dif = Math.abs(Math.atan2(Math.sin(s.pitch - s.pitchChao), Math.cos(s.pitch - s.pitchChao)))
        narizRef.current.style.transform = `rotate(${(-s.pitch * 180 / Math.PI).toFixed(0)}deg)`
        narizRef.current.style.background = s.parede ? "#ffc857" : !s.ar ? "rgba(242,238,250,0.5)" : dif < 0.22 ? "#7dffb0" : dif < 0.55 ? "#ffc857" : "#ff4d4d"
      }
      const agora = c.fase === "livre" ? s.dist : c.tempo + (CONTAGEM - c.conta)
      if (avisoRef.current) avisoRef.current.textContent = s.aviso && s.aviso.ate > agora ? s.aviso.txt : ""
      if (c.fase === "livre" || c.fase === "escolha") return
      if (tempoRef.current) tempoRef.current.textContent = relogio(c.resultado ? c.resultado.tempo : c.tempo)
      const vt = c.voltas > 1 ? `volta ${c.volta}/${c.voltas} · ` : ""
      if (cpRef.current) cpRef.current.textContent = vt + (c.cp < CHECKPOINTS.length ? `portão ${c.cp}/${CHECKPOINTS.length} · próximo: ${CHECKPOINTS[c.cp].nome}` : `${CHECKPOINTS.length}/${CHECKPOINTS.length} · volte pra ${SALAO_LARGADA.nome}${c.volta < c.voltas ? " (mais uma volta)" : ""}`)
      if (lugarRef.current) lugarRef.current.textContent = `${c.lugar}º de ${c.rivais.length + 1}`
      if (contaRef.current) contaRef.current.textContent = c.fase === "contagem" ? String(Math.max(1, Math.ceil(c.conta))) : c.fase === "correndo" && c.tempo < 0.8 ? "VAI!" : ""
      c.rivais.forEach((r, i) => {
        const el = pontosRivais.current[i]; if (!el) return
        naVolta(r.d, r.lado, pose)
        el.setAttribute("cx", pose.x.toFixed(0)); el.setAttribute("cy", pose.z.toFixed(0))
      })
    }, 50)
    return () => clearInterval(id)
  }, [])

  const botao = (k: keyof Entrada, rotulo: string, cls = "") => (
    <button type="button" className={`tr-btn ${cls}`} aria-label={k}
      onPointerDown={(e) => { e.preventDefault(); entrada.current[k] = true; setIntro(false) }}
      onPointerUp={() => { entrada.current[k] = false }} onPointerLeave={() => { entrada.current[k] = false }} onPointerCancel={() => { entrada.current[k] = false }}>
      {rotulo}
    </button>
  )
  const emCorrida = fase !== "livre" && fase !== "escolha"
  const res = painel.resultado
  // (T63) subir pro subúrbio: no jogo, escurece a subida e devolve pro /linha (sem trocar de página)
  const subir = (contou: boolean) => {
    if (!noJogo || subindo) return
    setSubindo(true)
    setTimeout(() => noJogo.onSubir(contou), 700)
  }
  const linkSubir = (contou: boolean, cls?: string, rotulo = "subir pro subúrbio") => noJogo
    ? <button type="button" className={cls} onClick={() => subir(contou)} data-subir>{rotulo}</button>
    : <a href={`/linha?mapa=disco&de=tuneis${contou ? "&corrida=1" : ""}`} className={cls} data-subir>{rotulo}</a>
  const rec = recordes[veiculo]
  // (elevadores) a cabine sobe (curta, a tela não fica preta) e o jogo monta a cidade lá em cima
  // (T47) o elevador 2 sobe pelo poço do terror (a 1ª vez sempre; depois, "subir rápido" pula)
  // BMX/skate: a cidade só desembarca de patins/moto; o elevador lembra o veículo e devolve na descida
  const subirElevador = (n: number, rapido = false) => {
    const el = noJogo?.elevador
    if (!el || el.tranca || cabine || terror || subindo) return
    lembrarVeiculoTunel(veiculo)
    if (n === TERROR.elevador && !rapido) { setTerror(n); return }
    setCabine(n)
    setTimeout(() => el.onSubir(n, veiculo === "moto" ? "moto" : "patins"), SEGUNDOS_CABINE * 1000)
  }
  const fimTerror = () => {
    const el = noJogo?.elevador
    marcarTerrorVisto(); setViuTerror(true)
    if (el && terror) el.onSubir(terror, veiculo === "moto" ? "moto" : "patins")
  }

  return (
    <div className={`tr-raiz${noJogo ? " is-jogo" : ""}${subindo ? " is-subindo" : ""}`}>
      {/* (revisão 6) no terror o Canvas dos túneis sai (um WebGL só no iPhone); o terror termina sempre subindo */}
      {!terror && <Canvas className="tr-cvs" frameloop={noJogo?.pausado ? "never" : "always"} dpr={fixa ?? DPR.v ?? 1} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }} camera={{ fov: 66, near: 0.1, far: NEVOA_LONGE + 60 }}>
        <Mundo rodada={rodada} st={st} entrada={entrada} auto={auto} parede={parede} veiculo={veiculo} corrida={corrida} mudouFase={mudouFase} />
        {/* (06/11) o mundo depois: a água nos rios (só com o final feito) */}
        <RioDepois />
        {/* (06/11) a entrada do elevador modelada em cada torre (disco/Elevadores3D.tsx; só perto) */}
        <EntradasElevador />
        {/* (08/11) as paredes livres do grafite: uma malha, um atlas, só perto */}
        <ParedesPintadas />
        {/* (16/11) o palco dos túneis no salão do metrô (o show mais colorido; só perto) */}
        <PalcoTuneis />
        <ResolucaoDinamica fixa={fixa} max={QUALIDADE.dprMax} />
        <Cinema maxLente={QUALIDADE.lente} />
      </Canvas>}
      <div className="tr-hud">
        {volta
          ? linkSubir(correu, "tr-voltar", "↑ subir pro subúrbio")
          : <Link href="/teste" className="tr-voltar">← teste</Link>}
        <div className="tr-vel">
          <span ref={velRef} className="tr-vel-n">0</span><small>km/h · {INFO[veiculo].nome.toLowerCase()}</small>
          {veiculo === "patins" && <span className="tr-jato" aria-hidden><span ref={jatoRef} /></span>}
          {veiculo === "moto" && <span className="tr-nariz" aria-hidden><span ref={narizRef} /></span>}
          {emCorrida && <span ref={lugarRef} className="tr-lugar">1º de {coresRivais.length + 1}</span>}
        </div>
        <p className="tr-onde"><span ref={ondeRef}>{NOME_SALAO[0]}</span></p>
        {emCorrida && (
          <div className="tr-relogio">
            <span ref={tempoRef} className="tr-tempo">0:00.00</span>
            <span ref={cpRef} className="tr-cp">portão 0/{CHECKPOINTS.length}</span>
            <span className="tr-rec">recorde {INFO[veiculo].nome}: {relogio(painel.recordeAntes)}{painel.fantasma ? " · o fantasma corre junto" : ""}</span>
          </div>
        )}
        <Mapinha ponto={ponto} rivais={pontosRivais} cores={emCorrida ? coresRivais : null} />
        <p ref={torreRef} className="tr-torre" />
        <p ref={contaRef} className="tr-conta" />
        <p ref={avisoRef} className="tr-aviso" />
      </div>

      {fase === "escolha" && (
        <div className="tr-escolha">
          <h1>A CORRIDA DAS TRINCHEIRAS</h1>
          <p>uma volta grande nos túneis: larga na TORRE 1, passa pelos 5 rios secos, pelo salão do metrô e pelo do grafite, e volta. Três rivais e o seu fantasma.{motos ? " De moto: duas voltas contra quatro motos." : ""}</p>
          <div className="tr-cards">
            {VEICULOS.map((v) => {
              const trancada = (v === "moto" && !motos) || !!noJogo?.tranca
              return (
                <button key={v} type="button" className={`tr-card is-${v}${trancada ? " is-trancada cn-card-trancado" : ""}`} onClick={() => largar(v)} data-veiculo={v} disabled={trancada} aria-disabled={trancada}>
                  <strong>{trancada && <Cadeado />}{INFO[v].nome}</strong>
                  <span>{v === "moto" && !motos ? TRANCA_MOTO : INFO[v].frase}</span>
                  <em>{v === "moto" && !motos ? "trancada" : trancada ? "trancada" : `recorde: ${relogio(recordes[v] ? recordes[v]!.ms / 1000 : null)}`}</em>
                </button>
              )
            })}
          </div>
          {noJogo?.tranca && <Trancado texto={noJogo.tranca} />}
          <p className="tr-passeio">ou só passear: {VEICULOS.filter((v) => v !== "moto" || motos).map((v) => <button key={v} type="button" onClick={() => passear(v)}>{INFO[v].nome.toLowerCase()}</button>)}</p>
        </div>
      )}

      {fase === "contagem" && <p className="tr-dica">{INFO[veiculo].teclas}</p>}

      {fase === "chegou" && res && (
        <div className="tr-fim">
          <h2>{res.lugar === 1 ? "PRIMEIRO!" : `${res.lugar}º LUGAR`}</h2>
          <p className="tr-fim-tempo">{relogio(res.tempo)}{res.novo ? <b> · NOVO RECORDE</b> : <span> · recorde {relogio(rec ? rec.ms / 1000 : null)}</span>}</p>
          <ol>
            {[{ nome: "VOCÊ", cor: "#ffffff", fim: res.tempo as number | null }, ...res.rivais].sort((a, b) => (a.fim ?? 1e9) - (b.fim ?? 1e9)).map((r) => (
              <li key={r.nome}><i style={{ background: r.cor }} />{r.nome}<span>{r.fim != null ? relogio(r.fim) : "na pista"}</span></li>
            ))}
          </ol>
          <p className="tr-fim-parciais">{painel.parciais.map((p, i) => `${CHECKPOINTS[i]?.nome ?? ""} ${relogio(p)}`).join(" · ")}</p>
          <div className="tr-fim-botoes">
            <button type="button" onClick={() => largar(veiculo)}>correr de novo</button>
            <button type="button" onClick={escolher}>trocar de veículo</button>
            {volta && linkSubir(true)}
          </div>
        </div>
      )}

      {intro && fase === "livre" && (
        <div className="tr-intro" onPointerDown={() => setIntro(false)}>
          <h1>AS TRINCHEIRAS</h1>
          <p>as raízes da cidade. cinco rios secos, a galeria do atalho e salões enormes: as três torres que sobem pra rua, o metrô da linha 9 e o salão do grafite. a Kombi ficou lá fora; aqui é a pé, de patins, skate ou BMX.</p>
          <p className="tr-teclas">setas ou WASD · {INFO[veiculo].teclas}</p>
        </div>
      )}
      {fase === "livre" && elevPerto > 0 && noJogo?.elevador && !cabine && !terror && (
        <div className="tr-elev-linha">
          <button type="button" className={`tr-elevador${noJogo.elevador.tranca ? " is-trancado" : ""}`} onClick={() => subirElevador(elevPerto)} data-elevador={elevPerto} aria-disabled={!!noJogo.elevador.tranca}>
            {noJogo.elevador.tranca && <Cadeado />}{rotuloSubir(elevPerto)}{noJogo.elevador.tranca ? <small>{noJogo.elevador.tranca}</small> : null}
          </button>
          {elevPerto === TERROR.elevador && viuTerror && !noJogo.elevador.tranca && (
            <button type="button" className="tr-elevador-rapido" onClick={() => subirElevador(elevPerto, true)} data-elevador-rapido>subir rápido</button>
          )}
        </div>
      )}
      {terror && <PocoTerror onFim={fimTerror} />}
      {cabine && (
        <div className="tr-cabine" aria-live="polite" style={{ ["--dur" as string]: `${SEGUNDOS_CABINE}s` }}>
          <div className="tr-cabine-poco"><i /></div>
          <p>subindo · torre {cabine}</p>
        </div>
      )}
      {fase === "livre" && <button type="button" className="tr-correr" onClick={escolher}>{noJogo?.tranca && <Cadeado />}correr</button>}

      <div className="tr-toque">
        <div className="tr-lado">{botao("esq", "◀")}{botao("dir", "▶")}</div>
        <div className="tr-lado">{botao("pulo", "pula", "is-peq")}{botao("jato", INFO[veiculo].acao, "is-peq")}{botao("frente", "▲", "is-grande")}</div>
      </div>
    </div>
  )
}
