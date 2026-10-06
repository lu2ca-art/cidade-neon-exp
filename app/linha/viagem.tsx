"use client"

// A VIAGEM PRA FORA (ep. 3, arco lugar 10): pela primeira vez a estrada
// acaba e a cidade fica no retrovisor. É uma viagem quieta, só dirigir:
// segura pra andar, solta e a Kombi vai parando. Sem rádio (a 222 saiu do
// ar), sem HUD, sem missão piscando. Primeiro a câmera olha pra trás (a
// cidade cinza ficando pequena); depois corta pra frente (a luz que a Notti
// viu do terraço crescendo). Chegou: a cena da casa (cenas.ts).
//
// O mundo anda, a Kombi fica parada no meio: a terra, os postes e as marcas
// da estrada correm por baixo dela.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Cinema } from "./estrada/Cinema"
import { Kombi222 } from "./estrada/Kombi222"
import { KombiHerbal } from "./estrada/KombiHerbal"
import { Seguro } from "./estrada/Seguro"
import { montarMotor } from "./som-carro"
import { vento } from "./som"

const DIST = 1300 // m até a casa
const NEON = ["#ff3fb0", "#2fe8ff", "#ffc857", "#b38cff", "#5dffa0", "#1a1530", "#221a3a", "#1a1530"]
const VMAX = 24 // m/s
const POSTE = 38 // um poste a cada tantos metros
const MARCA = 12 // marcas no meio da estrada
// a abertura (deserto): a mesma Kombi da cidade (Corrida.tsx: VMAX, ACEL)
const VMAX_JOGO = 46
const ACEL_JOGO = 11
const SEM_GAS = 170 // m antes da casa o combustível acaba

// o começo: a reta da casa da D-Bee até a cidade (rascunho: o LU2CA reescreve)
const LEGENDAS_CIDADE: { em: number; texto: string }[] = [
  { em: 0.03, texto: "a casa some no retrovisor" },
  { em: 0.2, texto: "o rádio pega um chiado. música, depois nada" },
  { em: 0.42, texto: "a cidade cresce na frente. cada luz é alguém" },
  { em: 0.64, texto: "você nunca esteve aqui. você conhece cada esquina" },
  { em: 0.86, texto: "cidade neon" },
]

// as legendas da viagem, pelo caminho (fração da distância)
const LEGENDAS: { em: number; texto: string }[] = [
  { em: 0.02, texto: "a pista acaba. começa a terra" },
  { em: 0.16, texto: "no retrovisor, a cidade cinza. sem a 222, nenhum letreiro pisca" },
  { em: 0.34, texto: "o celular sem sinal. pela primeira vez, ninguém te chama" },
  { em: 0.58, texto: "lá na frente, uma luz. a mesma" },
  { em: 0.86, texto: "uma casa" },
]

interface Estado { d: number; v: number; segura: boolean; fim: boolean; virou: boolean; rumo: Rumo; dist: number; vmax: number; semGas: boolean; parou: boolean }
// "fora": da cidade pra casa da D-Bee (ep. 3). "cidade": o COMEÇO do jogo, da
// casa dela até a cidade numa reta muito veloz (o choque de ambientes)
// "deserto": a ABERTURA (05/10, texto do LU2CA): fim de tarde, silêncio, só
// vento e motor, o combustível na reserva acaba em frente à casa dela
export type Rumo = "fora" | "cidade" | "deserto"

// `chegou`: a viagem acabou e a cena da casa está rolando por cima — a
// estrada fica de fundo, parada, com a câmera de frente pra casa
export function Viagem({ onFim, chegou = false, rumo = "fora" }: { onFim: () => void; chegou?: boolean; rumo?: Rumo }) {
  const st = useRef<Estado>({ d: 0, v: 0, segura: false, fim: false, virou: false, rumo, dist: rumo === "cidade" ? 1600 : rumo === "deserto" ? 1800 : DIST, vmax: rumo === "cidade" ? 62 : rumo === "deserto" ? VMAX_JOGO : VMAX, semGas: false, parou: false })
  const legendas = rumo === "cidade" ? LEGENDAS_CIDADE : rumo === "deserto" ? [] : LEGENDAS
  const [legenda, setLegenda] = useState<string | null>(null)
  const [plano, setPlano] = useState<"tras" | "frente">(rumo === "fora" ? "tras" : "frente")
  const [vazio, setVazio] = useState(false)
  const [naPorta, setNaPorta] = useState(false)
  const [corte, setCorte] = useState(false)
  const [parado, setParado] = useState(true)
  const [saindo, setSaindo] = useState(false)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])

  // o que muda devagar (legenda, plano, fim) sai do estado da física
  // num relógio separado, pra não re-renderizar a cada frame
  useEffect(() => {
    if (chegou) { const s = st.current; s.d = s.dist; s.v = 0; s.fim = true; return }
    const iv = setInterval(() => {
      const s = st.current
      const p = s.d / s.dist
      const l = [...legendas].reverse().find((x) => p >= x.em && p < x.em + 0.12)
      setLegenda(l ? l.texto : null)
      setParado(s.v < 0.5 && !s.segura)
      if (s.rumo === "deserto") {
        setVazio(s.semGas)
        setNaPorta(s.parou)
        return
      }
      if (p >= 0.45 && !s.virou && s.rumo === "fora") {
        s.virou = true
        setPlano("frente")
        setCorte(true)
        setTimeout(() => setCorte(false), 380)
      }
      if (p >= 1 && !s.fim) {
        s.fim = true
        setSaindo(true)
        setTimeout(() => fim.current(), 1600)
      }
    }, 200)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chegou])

  // atalho de desenvolvimento: __viagem(1200) pula pra perto da casa
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__viagem = (d: number) => { st.current.d = d }
    return () => { delete w.__viagem }
  }, [])

  const segurar = (v: boolean) => { st.current.segura = v }
  // o teclado (↑ / W / espaço), igual na cidade
  useEffect(() => {
    if (chegou) return
    const tecla = (v: boolean) => (e: KeyboardEvent) => { if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") st.current.segura = v }
    const d = tecla(true), u = tecla(false)
    window.addEventListener("keydown", d); window.addEventListener("keyup", u)
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u) }
  }, [chegou])
  // o som da abertura: só o vento e o motor (o motor morre com o combustível)
  useEffect(() => {
    if (rumo !== "deserto" || chegou) return
    const m = montarMotor()
    const w = vento()
    let morreu = false
    const iv = setInterval(() => {
      const s = st.current
      if (s.semGas && !morreu) { morreu = true; m?.parar() }
      if (!morreu) m?.atualizar(Math.min(1.45, s.v / VMAX_JOGO), s.segura, false)
    }, 50)
    return () => { clearInterval(iv); if (!morreu) m?.parar(); w?.parar() }
  }, [rumo, chegou])

  return (
    <div
      className={`l-estrada-fora ${saindo && !chegou ? "is-saindo" : ""} ${chegou ? "is-chegou" : ""}`}
      onPointerDown={() => segurar(true)}
      onPointerUp={() => segurar(false)}
      onPointerLeave={() => segurar(false)}
      onPointerCancel={() => segurar(false)}
      onKeyDown={(e) => { if (e.key === " " || e.key === "ArrowUp" || e.key === "w") segurar(true) }}
      onKeyUp={() => segurar(false)}
      tabIndex={0}
    >
      <Canvas className="l-estrada-fora-cvs" dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }} camera={{ fov: 50, near: 0.1, far: 2400 }}>
        <Mundo st={st} plano={chegou ? "casa" : plano} />
      </Canvas>
      {!chegou && <>
        <div className="l-cena-tarja is-cima" />
        <div className="l-cena-tarja is-baixo" />
        {corte && <div className="l-estrada-fora-corte" />}
        {legenda && <p key={legenda} className="l-estrada-fora-legenda">{legenda}</p>}
        {rumo === "deserto" ? <>
          <div className={`l-tanque ${vazio ? "is-vazio" : ""}`} aria-label={vazio ? "sem combustível" : "combustível na reserva"}>
            <small>combustível</small>
            <div className="l-tanque-barra"><i /></div>
            <b>R</b>
          </div>
          {parado && !vazio && <small className="l-estrada-fora-dica">segura a tela ou ↑ pra acelerar</small>}
          {naPorta && <button type="button" className="l-estrada-fora-porta" onPointerDown={(e) => e.stopPropagation()} onClick={() => fim.current()}>bater na porta</button>}
        </> : parado && !saindo && <small className="l-estrada-fora-dica">segura pra dirigir</small>}
      </>}
    </div>
  )
}

/* eslint-disable react-hooks/immutability -- three.js: cena, névoa e geradores são do motor, não estado do React (o mesmo da Corrida) */
function Mundo({ st, plano }: { st: React.MutableRefObject<Estado>; plano: "tras" | "frente" | "casa" }) {
  const { camera, scene } = useThree()
  const vel = useRef(0)
  const turbo = useRef(false)
  const esterco = useRef(0)
  const kombi = useRef<THREE.Group>(null)
  const postes = useRef<THREE.InstancedMesh>(null)
  const marcas = useRef<THREE.InstancedMesh>(null)
  const casa = useRef<THREE.Group>(null)
  const luzLonge = useRef<THREE.Mesh>(null)
  const cidade = useRef<THREE.Group>(null)
  const nPostes = 24
  const nMarcas = 60
  const tmp = useMemo(() => new THREE.Object3D(), [])

  const deserto = st.current.rumo === "deserto"
  useEffect(() => {
    if (deserto) {
      // o fim de tarde: o céu do roxo lá em cima ao laranja no horizonte
      const c = document.createElement("canvas"); c.width = 4; c.height = 256
      const g = c.getContext("2d")!
      const ceu = g.createLinearGradient(0, 0, 0, 256)
      ceu.addColorStop(0, "#2b1a4a"); ceu.addColorStop(0.45, "#8a3a5c"); ceu.addColorStop(0.72, "#e8683a"); ceu.addColorStop(0.86, "#ffb066"); ceu.addColorStop(1, "#ffcf8a")
      g.fillStyle = ceu; g.fillRect(0, 0, 4, 256)
      const tex = new THREE.CanvasTexture(c)
      tex.colorSpace = THREE.SRGBColorSpace
      scene.background = tex
      scene.fog = new THREE.Fog("#e0875a", 120, 1300)
      return () => { scene.fog = null; tex.dispose() }
    }
    scene.background = new THREE.Color("#04050b")
    scene.fog = new THREE.Fog("#04050b", 40, 460)
    return () => { scene.fog = null }
  }, [scene, deserto])

  // a cidade lá atrás: prédios sem cor (apagão), uma janela ou outra acesa
  const predios = useMemo(() => {
    const out: { x: number; h: number; w: number; z: number; acesa: boolean }[] = []
    let seed = 7
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 70; i++) out.push({ x: -520 + i * 15 + r() * 8, h: 20 + r() * 110, w: 8 + r() * 10, z: 1300 + r() * 160, acesa: r() < 0.18 })
    return out
  }, [])

  // as estrelas: um céu de verdade, longe das luzes da cidade
  const estrelas = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const n = 900
    const pos = new Float32Array(n * 3)
    let seed = 3
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < n; i++) {
      const th = r() * Math.PI * 2
      const ph = Math.acos(0.15 + r() * 0.85)
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * 1800
      pos[i * 3 + 1] = Math.cos(ph) * 1800
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * 1800
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return g
  }, [])

  useFrame((s, dtBruto) => {
    const dt = Math.min(dtBruto, 0.05)
    const e = st.current
    // só dirigir: segura acelera, solta vai parando (na chegada, freia sozinha)
    const falta = e.dist - e.d
    if (e.rumo === "deserto") {
      // a Kombi da cidade: acelera igual, perde embalo igual
      if (falta < SEM_GAS) e.semGas = true
      if (e.segura && !e.semGas) e.v += ACEL_JOGO * (1 - Math.pow(Math.min(1, e.v / e.vmax), 2)) * dt
      else { const atrito = (2.2 + 0.006 * e.v * e.v) * dt; e.v = Math.max(0, e.v - atrito) }
      // sem combustível: vai no embalo e para em frente à casa
      if (e.semGas) { const vPara = Math.sqrt(2 * 2.6 * Math.max(0, falta)); e.v = Math.min(vPara, Math.max(e.v, 8)) }
      e.d = Math.min(e.dist, e.d + e.v * dt)
      if (e.dist - e.d < 0.3) { e.v = 0; e.parou = true }
    } else {
      const alvo = e.fim ? 0 : e.segura ? (falta < 60 ? Math.max(4, falta * 0.3) : e.vmax) : 0
      e.v += (alvo - e.v) * Math.min(1, dt * (e.segura ? (e.rumo === "cidade" ? 0.9 : 0.55) : 0.35))
      e.d = Math.min(e.dist, e.d + e.v * dt)
    }
    vel.current = e.v
    const t = s.clock.elapsedTime
    // a Kombi balança na terra
    if (kombi.current) {
      kombi.current.position.y = Math.sin(t * 9) * 0.012 * Math.min(1, e.v / 8)
      kombi.current.rotation.z = Math.sin(t * 1.3) * 0.006 * Math.min(1, e.v / 8)
    }
    // os postes e as marcas passam
    if (postes.current) {
      for (let i = 0; i < nPostes; i++) {
        tmp.position.set(6.5, 3, 120 - i * POSTE + (e.d % POSTE))
        tmp.rotation.set(0, 0, 0)
        tmp.updateMatrix()
        postes.current.setMatrixAt(i, tmp.matrix)
      }
      postes.current.instanceMatrix.needsUpdate = true
    }
    if (marcas.current) {
      for (let i = 0; i < nMarcas; i++) {
        tmp.position.set(0, 0.03, 120 - i * MARCA + (e.d % MARCA))
        tmp.rotation.set(-Math.PI / 2, 0, 0)
        tmp.updateMatrix()
        marcas.current.setMatrixAt(i, tmp.matrix)
      }
      marcas.current.instanceMatrix.needsUpdate = true
    }
    // a casa vem chegando; a luz longe cresce; a cidade some no retrovisor
    if (casa.current) casa.current.position.z = e.rumo === "cidade" ? 24 + e.d : -(e.dist - e.d) - 14
    if (luzLonge.current) {
      const p = e.d / DIST
      luzLonge.current.scale.setScalar(1 + p * 3)
      luzLonge.current.visible = e.rumo === "fora" && DIST - e.d > 380
    }
    // fora: a cidade fica pra trás. cidade: ela vem chegando, enorme
    if (cidade.current) cidade.current.position.z = e.rumo === "cidade" ? -(e.dist + 260) + e.d : e.d * 0.35
    // a velocidade abre a lente (a reta do começo)
    if (e.rumo === "cidade") {
      const pc = camera as THREE.PerspectiveCamera
      const fov = 50 + Math.min(28, e.v * 0.45)
      if (Math.abs(pc.fov - fov) > 0.1) { pc.fov += (fov - pc.fov) * Math.min(1, dt * 3); pc.updateProjectionMatrix() }
    }
    // a câmera: primeiro olhando pra trás (a cidade), depois pra frente
    if (plano === "casa") {
      // de frente pra varanda, a Kombi no canto do quadro
      camera.position.set(-1.2 + Math.sin(t * 0.2) * 0.1, 1.9, -1)
      camera.lookAt(8, 2.1, -15)
    } else if (plano === "tras") {
      camera.position.set(-3.4 + Math.sin(t * 0.3) * 0.15, 1.35, -8.5)
      camera.lookAt(0.4, 1.4, 6)
    } else {
      camera.position.set(0.6 + Math.sin(t * 0.25) * 0.2, 2.5, 8.2)
      camera.lookAt(0, 1.6, -30)
    }
  })

  return (
    <>
      <ambientLight intensity={deserto ? 0.45 : 0.18} color={deserto ? "#ffc8a0" : "#8090c0"} />
      <directionalLight position={deserto ? [-120, 40, -400] : [-30, 60, -40]} intensity={deserto ? 1.4 : 0.35} color={deserto ? "#ffa66a" : "#b8c8ff"} />
      {/* o sol se pondo, lá na frente */}
      {deserto && (
        <mesh position={[-160, 60, -1500]}>
          <sphereGeometry args={[60, 24, 16]} />
          <meshBasicMaterial color="#ffd27a" fog={false} toneMapped={false} />
        </mesh>
      )}
      <points geometry={estrelas} visible={!deserto}>
        <pointsMaterial size={2.2} sizeAttenuation={false} color="#dfe6ff" fog={false} transparent opacity={0.85} />
      </points>
      {/* a lua */}
      <mesh position={[-500, 520, -1200]} visible={!deserto}>
        <sphereGeometry args={[34, 24, 16]} />
        <meshBasicMaterial color="#f1f0e6" fog={false} />
      </mesh>
      {/* o chão de terra e a estrada */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, -400]}>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color={deserto ? "#8a5634" : "#17141a"} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, -400]}>
        <planeGeometry args={[7, 3000]} />
        <meshStandardMaterial color={deserto ? "#3a2a26" : "#26232a"} roughness={0.95} />
      </mesh>
      <instancedMesh ref={marcas} args={[undefined, undefined, nMarcas]} frustumCulled={false}>
        <planeGeometry args={[0.18, 3.2]} />
        <meshStandardMaterial color="#a89d86" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={postes} args={[undefined, undefined, nPostes]} frustumCulled={false}>
        <boxGeometry args={[0.16, 6, 0.16]} />
        <meshStandardMaterial color="#2a2530" roughness={1} />
      </instancedMesh>
      {/* a cidade lá atrás, cinza, ficando pequena */}
      <group ref={cidade} visible={!deserto}>
        {predios.map((p, i) => (
          <mesh key={i} position={[p.x, p.h / 2, st.current.rumo === "cidade" ? p.z - 1300 : p.z]}>
            <boxGeometry args={[p.w, p.h, p.w]} />
            <meshBasicMaterial color={st.current.rumo === "cidade" ? NEON[i % NEON.length] : p.acesa ? "#3a3c46" : "#15161c"} fog={false} toneMapped={st.current.rumo !== "cidade"} />
          </mesh>
        ))}
      </group>
      {/* a luz que a Notti viu do terraço */}
      <mesh ref={luzLonge} position={[1.5, 3, -1500]}>
        <sphereGeometry args={[1.6, 10, 8]} />
        <meshBasicMaterial color="#ffcf8a" fog={false} toneMapped={false} />
      </mesh>
      {/* a casa: uma só, no fim da estrada. A porta aberta, a luz da
          varanda acesa, o varal com a camisa da seleção esquecida */}
      <group ref={casa} position={[0, 0, -st.current.dist]}>
        <group position={[10, 0, 0]}>
          <mesh position={[0, 2.4, 0]}>
            <boxGeometry args={[9, 4.8, 8]} />
            <meshStandardMaterial color="#3a3138" roughness={0.9} />
          </mesh>
          {/* o telhado de duas águas */}
          {[-1, 1].map((k) => (
            <mesh key={k} position={[0, 5.6, k * 2.1]} rotation-x={k * 0.62}>
              <boxGeometry args={[9.6, 0.18, 5.2]} />
              <meshStandardMaterial color="#5a3a30" roughness={0.95} />
            </mesh>
          ))}
          {/* a varanda: chão de madeira, duas colunas, a cobertura */}
          <mesh position={[-5.6, 0.15, 0]}>
            <boxGeometry args={[2.4, 0.3, 7.6]} />
            <meshStandardMaterial color="#4a3a2c" roughness={1} />
          </mesh>
          {[-3.4, 3.4].map((z) => (
            <mesh key={z} position={[-6.6, 1.55, z]}>
              <boxGeometry args={[0.16, 2.8, 0.16]} />
              <meshStandardMaterial color="#2a2226" />
            </mesh>
          ))}
          <mesh position={[-5.6, 3.05, 0]} rotation-z={-0.12}>
            <boxGeometry args={[2.8, 0.12, 8]} />
            <meshStandardMaterial color="#4a3028" roughness={1} />
          </mesh>
          {/* as janelas acesas e a porta aberta (a luz de dentro vazando) */}
          {/* na abertura a casa parece abandonada: tudo apagado, porta fechada */}
          {[2.4, -2.6].map((z) => (
            <mesh key={z} position={[-4.52, 2.4, z]} rotation-y={-Math.PI / 2}>
              <planeGeometry args={[1.5, 1.2]} />
              <meshBasicMaterial color={deserto ? "#1c1512" : "#ffcf8a"} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[-4.52, 1.15, 0]} rotation-y={-Math.PI / 2}>
            <planeGeometry args={[1.1, 2.3]} />
            <meshBasicMaterial color={deserto ? "#2a1e18" : "#ffb867"} toneMapped={false} />
          </mesh>
          {!deserto && <>
            {/* a lâmpada da varanda */}
            <mesh position={[-5.4, 2.85, 0]}>
              <sphereGeometry args={[0.1, 10, 8]} />
              <meshBasicMaterial color="#fff0c8" toneMapped={false} />
            </mesh>
            <pointLight position={[-5.6, 2.6, 0]} color="#ffcf8a" intensity={30} distance={16} decay={2} />
            <pointLight position={[-3.5, 1.4, 0]} color="#ffb867" intensity={12} distance={7} decay={2} />
          </>}
          {/* o varal, do lado da casa, com a camisa amarela */}
          {[5, 10].map((z) => (
            <mesh key={z} position={[-7.5, 1.1, z]}>
              <cylinderGeometry args={[0.04, 0.05, 2.2, 6]} />
              <meshStandardMaterial color="#3a3336" />
            </mesh>
          ))}
          <mesh position={[-7.5, 2.15, 7.5]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.01, 0.01, 5, 4]} />
            <meshStandardMaterial color="#8a8590" />
          </mesh>
          <mesh position={[-7.5, 1.75, 7.2]} rotation-y={-Math.PI / 2} visible={!deserto}>
            <planeGeometry args={[0.8, 0.8]} />
            <meshStandardMaterial color="#f2c230" emissive="#f2c230" emissiveIntensity={0.15} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-7.49, 1.95, 7.2]} rotation-y={-Math.PI / 2} visible={!deserto}>
            <planeGeometry args={[0.8, 0.08]} />
            <meshStandardMaterial color="#1d8a3a" side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
      {/* a Kombi, parada no meio do mundo que anda */}
      <group ref={kombi}>
        <Seguro nome="kombi-viagem" reserva={<Kombi222 turbo={turbo} velocidade={vel} esterco={esterco} />}>
          <Suspense fallback={<Kombi222 turbo={turbo} velocidade={vel} esterco={esterco} />}>
            <KombiHerbal />
            <Kombi222 turbo={turbo} velocidade={vel} esterco={esterco} soEfeitos />
          </Suspense>
        </Seguro>
        <pointLight position={[0, 1, -4]} color="#fff1d6" intensity={60} distance={30} decay={2} />
        <pointLight position={[0, 3, 3]} color="#9fb4ff" intensity={14} distance={9} decay={2} />
      </group>
      <Seguro nome="lente-viagem"><Cinema /></Seguro>
    </>
  )
}
/* eslint-enable react-hooks/immutability */
