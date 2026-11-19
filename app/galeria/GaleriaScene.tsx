"use client"
/* eslint-disable react-hooks/immutability -- three.js: a câmera é do motor, mexida a cada quadro */

import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { PointerLockControls, Text, useTexture } from "@react-three/drei"
import { Suspense, useState, useRef, useEffect, useMemo } from "react"
import * as THREE from "three"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { sairDaPagina } from "../linha/paginas"
import { PRECO_INICIAL, atualizarObra, lerObras, type Obra } from "./obras"
import { Balcao, Visitantes, type Alvo } from "./Mercado"
import { mudarNeon, saldoInicial } from "../neon-tiles/neon"

type Artwork = {
  id: string
  title: string
  artist: string
  file: string
  aspect: number // width / height (do arquivo original)
  accent: string
}

const H = 2.5 // altura padrão do quadro (world units)

const ARTWORKS: Artwork[] = [
  { id: "starry-night", title: "A Noite Estrelada", artist: "Van Gogh · 1889", file: "/galeria/starry-night.jpg", aspect: 500 / 396, accent: "#f9d000" },
  { id: "mona-lisa",    title: "Mona Lisa",         artist: "Da Vinci · 1503", file: "/galeria/mona-lisa.jpg",    aspect: 500 / 756, accent: "#c9a961" },
  { id: "the-scream",   title: "O Grito",           artist: "Munch · 1893",    file: "/galeria/the-scream.jpg",   aspect: 500 / 637, accent: "#d97706" },
  { id: "great-wave",   title: "A Grande Onda",     artist: "Hokusai · 1831",  file: "/galeria/great-wave.jpg",   aspect: 500 / 342, accent: "#00ffff" },
  { id: "the-kiss",     title: "O Beijo",           artist: "Klimt · 1908",    file: "/galeria/the-kiss.jpg",     aspect: 500 / 502, accent: "#ff00ff" },
]

function Painting({
  artwork,
  position,
  rotation = [0, 0, 0],
}: {
  artwork: Artwork
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  const [hovered, setHovered] = useState(false)
  const texture = useTexture(artwork.file)
  const w = H * artwork.aspect
  const border = 0.15

  return (
    <group
      position={position}
      rotation={rotation}
      scale={hovered ? 1.05 : 1}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[w + border * 2 + 0.05, H + border * 2 + 0.05, 0.1]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[w + border * 2, H + border * 2]} />
        <meshStandardMaterial
          color={artwork.accent}
          emissive={artwork.accent}
          emissiveIntensity={hovered ? 0.9 : 0.35}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w, H]} />
        {/* meshBasicMaterial: quadro não escurece com pouca luz da sala —
            os quadros ficam sempre no brilho real da textura. */}
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <Text font="/fonts/geist.ttf"
        position={[0, -(H / 2 + 0.25), 0.02]}
        fontSize={0.14}
        color="#ffffff"
        anchorX="center"
        outlineWidth={0.006}
        outlineColor="#000000"
      >
        {artwork.title}
      </Text>
      <Text font="/fonts/geist.ttf"
        position={[0, -(H / 2 + 0.45), 0.02]}
        fontSize={0.09}
        color="#a0a0a0"
        anchorX="center"
      >
        {artwork.artist}
      </Text>
    </group>
  )
}

// as obras que você pintou (CN-21): as 5 últimas na parede da direita, à venda
const SUAS = 5
const zSua = (i: number) => (i - (SUAS - 1) / 2) * 3.8
function SuaObra({ obra, position }: { obra: Obra; position: [number, number, number] }) {
  const tex = useMemo(() => { const t = new THREE.TextureLoader().load(obra.img); t.colorSpace = THREE.SRGBColorSpace; return t }, [obra.img])
  const w = H * 0.75
  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[w + 0.35, H + 0.35, 0.1]} />
        <meshStandardMaterial color="#ffc857" emissive="#ffc857" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[w, H]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <Text font="/fonts/geist.ttf" position={[0, -(H / 2 + 0.25), 0.02]} fontSize={0.14} color="#ffffff" anchorX="center" outlineWidth={0.006} outlineColor="#000000">{obra.nome}</Text>
      <Text font="/fonts/geist.ttf" position={[0, -(H / 2 + 0.45), 0.02]} fontSize={0.09} color="#ffc857" anchorX="center">{obra.vendida ? `vendida · ${obra.vendida} Água$` : `você · ${obra.preco ?? PRECO_INICIAL} Água$`}</Text>
      {/* a bolinha vermelha da galeria: vendida */}
      {obra.vendida ? <mesh position={[w / 2 + 0.05, -(H / 2 + 0.36), 0.03]}><circleGeometry args={[0.09, 20]} /><meshBasicMaterial color="#e0201c" /></mesh> : null}
    </group>
  )
}

function SuasObras({ obras }: { obras: Obra[] }) {
  return <>{obras.slice(0, SUAS).map((o, i) => <SuaObra key={o.id} obra={o} position={[14.9, 3, zSua(i)]} />)}</>
}

function Room() {
  const piso = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d")!
    for (let y = 0; y < 256; y += 32) for (let x = -((y / 32) % 2) * 64; x < 256; x += 128) { g.fillStyle = ["#7a5234", "#6e4a2e", "#84593a"][((x + y) / 32) % 3 | 0] ?? "#7a5234"; g.fillRect(x, y, 127, 31) }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [])
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial map={piso} roughness={0.55} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#e8e2d8" />
      </mesh>
      <mesh position={[0, 4, -10]}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#a8262a" roughness={0.9} />
      </mesh>
      <mesh position={[-15, 4, 2.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[25, 8]} />
        <meshStandardMaterial color="#a8262a" roughness={0.9} />
      </mesh>
      <mesh position={[15, 4, 2.5]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[25, 8]} />
        <meshStandardMaterial color="#efe9df" roughness={0.9} />
      </mesh>
      {/* a vitrine da rua, com a porta */}
      <mesh position={[0, 4, 15]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#1b2430" emissive="#2a4060" emissiveIntensity={0.4} />
      </mesh>
      {/* os trilhos de luz no teto */}
      {[-6, 0, 6].map((x) => <mesh key={x} position={[x, 7.9, 2.5]}><boxGeometry args={[0.12, 0.12, 24]} /><meshStandardMaterial color="#1b1b22" /></mesh>)}
      <Balcao />
    </>
  )
}

// Navegação primeira-pessoa: WASD move + PointerLockControls olha com o mouse.
// Câmera fica travada em altura de olho (1.7) e clampeada dentro das paredes.
type Teclas = { w: boolean; a: boolean; s: boolean; d: boolean }

function WASDMovement({ keys }: { keys: React.RefObject<Teclas> }) {
  const { camera } = useThree()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "w" || k === "a" || k === "s" || k === "d") keys.current[k] = true
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "w" || k === "a" || k === "s" || k === "d") keys.current[k] = false
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [keys])

  useFrame((_, delta) => {
    const speed = 4
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    if (keys.current.w) camera.position.addScaledVector(forward, speed * delta)
    if (keys.current.s) camera.position.addScaledVector(forward, -speed * delta)
    if (keys.current.d) camera.position.addScaledVector(right, speed * delta)
    if (keys.current.a) camera.position.addScaledVector(right, -speed * delta)

    camera.position.x = Math.max(-14, Math.min(14, camera.position.x))
    camera.position.z = Math.max(-9, Math.min(14, camera.position.z))
    // não atravessa o balcão
    if (Math.abs(camera.position.x - 9) < 2 && Math.abs(camera.position.z - 7.5) < 1) camera.position.z = camera.position.z < 7.5 ? 6.5 : 8.5
    camera.position.y = 1.7
  })

  return null
}

// no celular: arrastar o dedo olha em volta (no lugar do mouse travado)
function OlharComDedo() {
  const { camera, gl } = useThree()
  useEffect(() => {
    const el = gl.domElement
    const euler = new THREE.Euler(0, 0, 0, "YXZ")
    let ult: { x: number; y: number } | null = null
    const down = (e: PointerEvent) => { if (e.pointerType !== "mouse") ult = { x: e.clientX, y: e.clientY } }
    const move = (e: PointerEvent) => {
      if (!ult) return
      euler.setFromQuaternion(camera.quaternion)
      euler.y += (e.clientX - ult.x) * 0.005
      euler.x = Math.max(-1.2, Math.min(1.2, euler.x + (e.clientY - ult.y) * 0.004))
      camera.quaternion.setFromEuler(euler)
      ult = { x: e.clientX, y: e.clientY }
    }
    const up = () => { ult = null }
    el.style.touchAction = "none"
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move)
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up)
    return () => {
      el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up)
    }
  }, [camera, gl])
  return null
}

export default function GaleriaScene() {
  const router = useRouter()
  const keys = useRef<Teclas>({ w: false, a: false, s: false, d: false })
  const [toque, setToque] = useState(false)
  // o mercado: as suas obras à venda, o saldo, a oferta no balcão
  const [obras, setObras] = useState<Obra[]>([])
  const [neon, setNeon] = useState(0)
  const [oferta, setOferta] = useState<{ obra: Obra; quem: string; valor: number; teto: number; pediu: boolean } | null>(null)
  const [painel, setPainel] = useState(false)
  const [aviso, setAviso] = useState("")
  const livre = useRef(true)
  const alvos = useRef<Alvo[]>([])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToque(window.matchMedia("(pointer: coarse)").matches); setObras(lerObras()); setNeon(saldoInicial())
  }, [])
  // onde a galera para pra olhar: os clássicos e as suas (as vendidas não contam)
  useEffect(() => {
    alvos.current = [
      ...[-5, 0, 5].map((x, i) => ({ id: `c${i}`, x, z: -9.9, ox: 0, oz: 1, sua: false })),
      ...[-2.5, 2.5].map((z, i) => ({ id: `l${i}`, x: -14.9, z, ox: 1, oz: 0, sua: false })),
      ...obras.slice(0, SUAS).map((o, i) => ({ id: o.id, x: 14.9, z: zSua(i), ox: -1, oz: 0, sua: !o.vendida })),
    ]
  }, [obras])
  const dizer = (m: string) => { setAviso(m); setTimeout(() => setAviso(""), 3200) }
  // alguém gostou: oferece até o quanto acha que vale
  const interesse = (id: string, quem: string) => {
    const obra = lerObras().find((o) => o.id === id)
    if (!obra || obra.vendida) { livre.current = true; return }
    const preco = obra.preco ?? PRECO_INICIAL
    const teto = Math.round(8 + Math.random() * 34)
    setOferta({ obra, quem, valor: Math.min(preco, teto), teto, pediu: false })
  }
  const vender = async (valor: number) => {
    if (!oferta) return
    setObras(atualizarObra(oferta.obra.id, { vendida: valor }))
    const r = await mudarNeon(valor); setNeon(r.neon)
    dizer(`vendida: “${oferta.obra.nome}” por ${valor} Água$`)
    setOferta(null); livre.current = true
  }
  // pedir o preço cheio: se passar muito do que a pessoa acha que vale, ela desiste
  const pedirMais = () => {
    if (!oferta) return
    const preco = oferta.obra.preco ?? PRECO_INICIAL
    if (preco <= oferta.teto * 1.25) void vender(preco)
    else { dizer(`${oferta.quem} achou caro e foi embora`); setOferta(null); livre.current = true }
  }
  const mudarPreco = (o: Obra, d: number) => setObras(atualizarObra(o.id, { preco: Math.max(5, Math.min(200, (o.preco ?? PRECO_INICIAL) + d)) }))
  const segura = (k: keyof Teclas) => ({
    onPointerDown: () => { keys.current[k] = true },
    onPointerUp: () => { keys.current[k] = false },
    onPointerLeave: () => { keys.current[k] = false },
    onPointerCancel: () => { keys.current[k] = false },
  })
  return (
    <div className="h-screen w-screen bg-black">
      <div className="pointer-events-none absolute left-6 top-6 z-10 text-white">
        <h1 className="text-xl font-light tracking-widest">GALERIA</h1>
        <p className="mt-1 max-w-[55vw] text-xs text-neutral-400">
          {toque ? "arrasta pra olhar · segura as setas pra andar" : "clique pra caminhar · WASD movimenta · mouse olha · ESC sai"}
        </p>
      </div>
      <div className="absolute right-6 top-6 z-10 flex flex-col items-end gap-2">
        <Link href="/galeria/pintar" className="rounded-md bg-[#ff3fb0] px-4 py-2 text-sm font-bold text-black">pintar a sua</Link>
        <button type="button" onClick={() => setPainel(!painel)} className="rounded-md bg-white/90 px-4 py-2 text-sm font-bold text-black">à venda ({obras.filter((o) => !o.vendida).length})</button>
        <span className="font-mono text-xs font-bold text-[#ffc857]">{neon} Água$</span>
      </div>
      {painel && (
        <div className="absolute right-6 top-36 z-20 w-64 rounded-xl bg-[#14121c]/95 p-3 text-white shadow-2xl">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-white/60">as suas obras na parede · o preço é seu</p>
          {obras.length === 0 && <p className="text-xs text-white/70">nenhuma ainda. pinta uma e expõe.</p>}
          {obras.slice(0, SUAS).map((o) => (
            <div key={o.id} className="flex items-center gap-2 border-t border-white/10 py-2 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura em data: URL */}
              <img src={o.img} alt="" className="h-10 w-8 rounded-sm object-cover" />
              <span className="min-w-0 flex-1 truncate">{o.nome}</span>
              {o.vendida ? <b className="text-[#e0201c]">● vendida</b> : (
                <span className="flex items-center gap-1 font-mono">
                  <button type="button" className="h-6 w-6 rounded bg-white/10" onClick={() => mudarPreco(o, -5)}>−</button>
                  <b className="w-8 text-center">{o.preco ?? PRECO_INICIAL}</b>
                  <button type="button" className="h-6 w-6 rounded bg-white/10" onClick={() => mudarPreco(o, 5)}>+</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {oferta && (
        <div className="absolute bottom-28 left-1/2 z-20 w-[min(92vw,360px)] -translate-x-1/2 rounded-xl bg-[#f2eee6] p-4 text-[#14121c] shadow-2xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-black/60">no balcão</p>
          <p className="mt-1 text-sm"><b>{oferta.quem}</b> quer “{oferta.obra.nome}”</p>
          <p className="mt-1 text-2xl font-black">{oferta.valor} neon <small className="text-xs font-normal text-black/60">· você pediu {oferta.obra.preco ?? PRECO_INICIAL}</small></p>
          <div className="mt-3 flex gap-2 text-sm font-bold">
            <button type="button" className="flex-1 rounded-md bg-[#14121c] py-2 text-white" onClick={() => void vender(oferta.valor)}>vender</button>
            {oferta.valor < (oferta.obra.preco ?? PRECO_INICIAL) && <button type="button" className="flex-1 rounded-md bg-[#ffc857] py-2" onClick={pedirMais}>pedir {oferta.obra.preco ?? PRECO_INICIAL}</button>}
            <button type="button" className="rounded-md bg-black/10 px-3 py-2" onClick={() => { setOferta(null); livre.current = true }}>não</button>
          </div>
        </div>
      )}
      {aviso && <p className="pointer-events-none absolute left-1/2 top-24 z-20 -translate-x-1/2 rounded-md bg-black/70 px-4 py-2 font-mono text-xs font-bold text-[#ffc857]">{aviso}</p>}
      <button type="button" onClick={() => sairDaPagina(router.push)} className="absolute bottom-8 left-6 z-10 rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-white">‹ sair</button>
      {toque && (
        <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-3 select-none">
          <button type="button" aria-label="andar pra frente" className="h-16 w-16 rounded-full border-2 border-white/40 bg-white/10 text-2xl text-white" style={{ touchAction: "none" }} {...segura("w")}>↑</button>
          <button type="button" aria-label="andar pra trás" className="h-16 w-16 rounded-full border-2 border-white/40 bg-white/10 text-2xl text-white" style={{ touchAction: "none" }} {...segura("s")}>↓</button>
        </div>
      )}
      <Canvas shadows camera={{ position: [0, 1.7, 6], fov: 65 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} color="#fff4e6" />
          <hemisphereLight args={["#fff6ea", "#5a3a2a", 0.6]} />
          <pointLight position={[0, 7, 4]} intensity={1.2} color="#fff0dc" distance={30} />
          {/* Spots direcionados nos quadros da parede de fundo pra ganhar
              destaque museu-like sem lavar a estética neon. */}
          <spotLight position={[0, 7, -2]} target-position={[0, 3, -10]} intensity={0.8} angle={0.8} penumbra={0.5} color="#ffffff" />
          <spotLight position={[-10, 6, 0]} target-position={[-15, 3, 0]} intensity={0.7} angle={0.9} penumbra={0.6} color="#ffffff" />

          <Room />

          {ARTWORKS.slice(0, 3).map((art, i) => (
            <Painting
              key={art.id}
              artwork={art}
              position={[(i - 1) * 5, 3, -9.9]}
            />
          ))}

          {ARTWORKS.slice(3, 5).map((art, i) => (
            <Painting
              key={art.id}
              artwork={art}
              position={[-14.9, 3, (i - 0.5) * 5]}
              rotation={[0, Math.PI / 2, 0]}
            />
          ))}

          <SuasObras obras={obras} />
          <Visitantes alvos={alvos} livre={livre} onInteresse={interesse} />
          <spotLight position={[10, 6, 0]} target-position={[15, 3, 0]} intensity={0.7} angle={0.9} penumbra={0.6} color="#ffe0a8" />

          {toque ? <OlharComDedo /> : <PointerLockControls />}
          <WASDMovement keys={keys} />
        </Suspense>
      </Canvas>
    </div>
  )
}
