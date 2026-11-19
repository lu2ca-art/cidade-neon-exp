"use client"

// A CARA DE CADA LUGAR (LU2CA 16/10: "todas são um cubo que não remetem ao
// que elas realmente são — um ginásio deve parecer um ginásio, o bar deve
// parecer um bar, o brechó deve parecer um brechó"). Cada lugar ganha a
// arquitetura dele, em peças simples: o galpão em arco do ginásio, o toldo e
// as mesinhas do bar, a vitrine com arara e manequim do brechó, a porta de
// enrolar da oficina, a fila e os canhões da balada, a marquise de lâmpadas
// da casa de shows, o cubo de vidro da galeria, a fachada neon do
// fliperama, a cobertura e as bombas do posto, a estação elevada da Linha 9
// e as casas de cada um. Medidas em metros; a frente (a rua) é o +Z, o chão
// é o y = 0; cabe num terreno de ~18 × 16 m.

import { useGLTF } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"
import { ModeloSeguro } from "./Seguro"

type V3 = [number, number, number]

// ── peças ──
function Caixa({ p, t, cor, r = 0.8, m = 0, e, ei = 0 }: { p: V3; t: V3; cor: string; r?: number; m?: number; e?: string; ei?: number }) {
  return <mesh position={p}><boxGeometry args={t} /><meshStandardMaterial color={cor} roughness={r} metalness={m} emissive={e ?? "#000000"} emissiveIntensity={ei} /></mesh>
}
function Luz({ p, t, cor, forca = 1 }: { p: V3; t: V3; cor: string; forca?: number }) {
  return <mesh position={p}><boxGeometry args={t} /><meshBasicMaterial color={new THREE.Color(cor).multiplyScalar(forca)} toneMapped={false} /></mesh>
}
function Letreiro({ txt, cor, p, w, h, fonte = "900", fundo = "#0a0812" }: { txt: string; cor: string; p: V3; w: number; h: number; fonte?: string; fundo?: string | null }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * (h / w)); const g = c.getContext("2d")!
    if (fundo) { g.fillStyle = fundo; g.fillRect(0, 0, c.width, c.height) }
    let tam = c.height * 0.72; g.font = `${fonte} ${tam}px "Arial Black", system-ui, sans-serif`
    while (g.measureText(txt).width > c.width * 0.9 && tam > 10) { tam *= 0.92; g.font = `${fonte} ${tam}px "Arial Black", system-ui, sans-serif` }
    g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = cor; g.shadowBlur = 18; g.fillStyle = cor; g.fillText(txt, c.width / 2, c.height / 2 + 2)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [txt, cor, w, h, fonte, fundo])
  return <mesh position={p}><planeGeometry args={[w, h]} /><meshBasicMaterial map={tex} transparent={!fundo} toneMapped={false} /></mesh>
}
// vidro de vitrine: dá pra ver o que tem dentro (com um fundo aceso atrás)
function Vidro({ p, t, cor = "#bfe6ff" }: { p: V3; t: V3; cor?: string }) {
  return <mesh position={p}><boxGeometry args={t} /><meshStandardMaterial color={cor} transparent opacity={0.18} metalness={0.9} roughness={0.05} depthWrite={false} /></mesh>
}
// gente parada (a fila da balada, quem está no bar): corpo simples
function Pessoa({ p, cor, rot = 0 }: { p: V3; cor: string; rot?: number }) {
  return (
    <group position={p} rotation-y={rot}>
      <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.32, 0.9, 0.22]} /><meshStandardMaterial color="#1b1530" /></mesh>
      <mesh position={[0, 1.2, 0]}><boxGeometry args={[0.42, 0.62, 0.26]} /><meshStandardMaterial color={cor} /></mesh>
      <mesh position={[0, 1.66, 0]}><sphereGeometry args={[0.14, 10, 8]} /><meshStandardMaterial color="#6a4a32" /></mesh>
    </group>
  )
}
// uma janela acesa com o caixilho
function Janela({ p, w = 1.4, h = 1.6, cor = "#ffd9a0" }: { p: V3; w?: number; h?: number; cor?: string }) {
  return (
    <group position={p}>
      <Caixa p={[0, 0, -0.02]} t={[w + 0.16, h + 0.16, 0.08]} cor="#2a2430" />
      <Luz p={[0, 0, 0.03]} t={[w, h, 0.02]} cor={cor} forca={0.9} />
    </group>
  )
}

// ── os lugares ──
function Ginasio({ cor }: { cor: string }) {
  // o galpão de tijolo com o teto em arco e a fachada de vidro mostrando a quadra
  const arco = useMemo(() => { const g = new THREE.CylinderGeometry(8, 8, 15, 32, 1, false); g.rotateX(Math.PI / 2); return g }, [])
  return (
    <group>
      <Caixa p={[0, 3, -4.75]} t={[16, 6, 7.5]} cor="#8a4a32" r={0.95} />
      {[-7.95, 7.95].map((x) => <Caixa key={x} p={[x, 3, 2.75]} t={[0.1, 6, 7.5]} cor="#8a4a32" r={0.95} />)}
      <mesh geometry={arco} position={[0, 6, -1]} scale={[1, 0.45, 1]}><meshStandardMaterial color="#8a909c" metalness={0.3} roughness={0.6} side={THREE.DoubleSide} /></mesh>
      <Luz p={[0, 2.8, -0.95]} t={[15.6, 5.6, 0.04]} cor="#3a6a8a" forca={0.8} />
      <Caixa p={[0, 0.02, 2.75]} t={[15.6, 0.04, 7.4]} cor="#c8783a" />
      <Vidro p={[0, 2.6, 6.52]} t={[11, 4.4, 0.04]} />
      {/* a quadra lá dentro: a tabela e o aro */}
      <Caixa p={[0, 3.4, -0.5]} t={[1.6, 1, 0.08]} cor="#f2f2f2" />
      <mesh position={[0, 2.95, -0.25]} rotation-x={Math.PI / 2}><torusGeometry args={[0.25, 0.03, 8, 20]} /><meshStandardMaterial color="#ff6a1a" /></mesh>
      {[-5.6, -1.9, 1.9, 5.6].map((x) => <Caixa key={x} p={[x, 2.6, 6.56]} t={[0.18, 4.6, 0.1]} cor="#3a3440" />)}
      <Letreiro txt="GINÁSIO" cor={cor} p={[0, 5.4, 6.6]} w={9} h={1.3} />
      <Caixa p={[0, 0.25, 8]} t={[8, 0.5, 2]} cor="#9a96a0" />
    </group>
  )
}

function Bar({ cor, nome }: { cor: string; nome: string }) {
  // o boteco de esquina: dois andares, toldo listrado, o neon do copo, mesinhas na calçada
  const toldo = useMemo(() => { const c = document.createElement("canvas"); c.width = 128; c.height = 8; const g = c.getContext("2d")!; for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#f2eee6" : cor; g.fillRect(i * 8, 0, 8, 8) } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }, [cor])
  return (
    <group>
      <Caixa p={[0, 3.5, -2]} t={[12, 7, 12]} cor="#d8b88a" r={0.95} />
      <Caixa p={[0, 1.4, 4.02]} t={[12, 2.8, 0.1]} cor="#5a2a1a" />
      <Luz p={[-2.5, 1.5, 4.1]} t={[5.5, 2.2, 0.02]} cor="#ffc27a" forca={0.8} />
      <Caixa p={[3.2, 1.25, 4.1]} t={[1.4, 2.5, 0.06]} cor="#2a1810" />
      {[-3.5, 0, 3.5].map((x) => <Janela key={x} p={[x, 5, 4.05]} w={1.6} h={1.5} />)}
      <mesh position={[0, 3.1, 5.2]} rotation-x={0.45}><boxGeometry args={[12.4, 0.06, 2.6]} /><meshStandardMaterial map={toldo} /></mesh>
      <Letreiro txt={nome} cor={cor} p={[0, 3.75, 4.12]} w={6} h={0.8} />
      {/* o neon do copo americano na parede */}
      <group position={[-4.8, 4.9, 4.15]}>
        <Luz p={[0, 0, 0]} t={[0.08, 1.1, 0.04]} cor="#ffc857" /><Luz p={[0.7, 0, 0]} t={[0.08, 1.1, 0.04]} cor="#ffc857" /><Luz p={[0.35, -0.55, 0]} t={[0.7, 0.08, 0.04]} cor="#ffc857" /><Luz p={[0.35, 0.2, 0]} t={[0.66, 0.5, 0.02]} cor="#ffb030" forca={0.6} />
      </group>
      {/* as mesinhas de plástico e quem está tomando uma */}
      {[[-4, 6.6], [-1, 7.2], [2, 6.6]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Caixa p={[0, 0.72, 0]} t={[0.8, 0.06, 0.8]} cor="#ffd21a" /><Caixa p={[0, 0.36, 0]} t={[0.08, 0.72, 0.08]} cor="#ffd21a" />
          <Caixa p={[-0.7, 0.24, 0]} t={[0.4, 0.48, 0.4]} cor="#ffd21a" /><Caixa p={[0.7, 0.24, 0]} t={[0.4, 0.48, 0.4]} cor="#ffd21a" />
          {i !== 1 && <Pessoa p={[0.7, 0.2, 0]} cor={["#3a6ad8", "#d84a6a", "#2f9a6a"][i]} rot={-Math.PI / 2} />}
        </group>
      ))}
    </group>
  )
}

function Brecho({ cor }: { cor: string }) {
  // a lojinha de parede pintada, a vitrine com a arara, os manequins e a placa pendurada
  const roupas = ["#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0", "#b38cff", "#ff6a35", "#e8e0d0", "#3a6ad8"]
  return (
    <group>
      <Caixa p={[0, 4.6, -2]} t={[11, 2.8, 12]} cor="#3a8a7a" r={0.95} />
      <Caixa p={[0, 1.6, -4.8]} t={[11, 3.2, 6.4]} cor="#3a8a7a" r={0.95} />
      {[-5.45, 5.45].map((x) => <Caixa key={x} p={[x, 1.6, 1.2]} t={[0.1, 3.2, 5.6]} cor="#3a8a7a" />)}
      <Caixa p={[3.25, 1.6, 4.02]} t={[4.5, 3.2, 0.1]} cor="#f2e6c8" />
      <Caixa p={[-5.25, 1.6, 4.02]} t={[0.5, 3.2, 0.1]} cor="#f2e6c8" />
      <Luz p={[0, 1.6, -1.55]} t={[10.8, 3.1, 0.02]} cor="#fff0d0" forca={0.7} />
      <Caixa p={[0, 0.02, 1.2]} t={[10.8, 0.04, 5.6]} cor="#8a5a3a" />
      <Vidro p={[-2, 1.6, 4.08]} t={[6, 2.6, 0.04]} />
      <Caixa p={[3.6, 1.25, 4.08]} t={[1.3, 2.5, 0.06]} cor="#7a3a2a" />
      {/* a arara com as roupas, atrás do vidro */}
      <Caixa p={[-2, 2.5, 3.6]} t={[5, 0.06, 0.06]} cor="#c0c0c8" m={0.8} />
      {roupas.map((c, i) => <Caixa key={i} p={[-4.2 + i * 0.62, 1.85, 3.6]} t={[0.5, 1.2, 0.08]} cor={c} />)}
      {/* dois manequins na vitrine */}
      {[[-4.3, "#ff3fb0"], [0.2, "#ffc857"]].map(([x, c], i) => (
        <group key={i} position={[x as number, 0.1, 3.4]}><Caixa p={[0, 0.45, 0]} t={[0.28, 0.9, 0.2]} cor="#e8e0d8" /><Caixa p={[0, 1.2, 0]} t={[0.44, 0.62, 0.24]} cor={c as string} /><mesh position={[0, 1.66, 0]}><sphereGeometry args={[0.14, 10, 8]} /><meshStandardMaterial color="#e8e0d8" /></mesh></group>
      ))}
      <Letreiro txt="BRECHÓ" cor={cor} p={[0, 4, 4.1]} w={6.5} h={1.2} fundo="#14121c" />
      {/* a placa pendurada na lateral */}
      <Caixa p={[5.6, 3.6, 4.6]} t={[0.06, 0.06, 1.2]} cor="#2a2430" />
      <Letreiro txt="usados · troca" cor="#ffc857" p={[5.6, 3.1, 4.9]} w={1.4} h={0.6} fundo="#2a1a30" />
      {[-3, 0, 3].map((x) => <Janela key={x} p={[x, 4.9, 4.05]} w={1.2} h={1} cor="#ffe0b0" />)}
    </group>
  )
}

function Oficina({ cor }: { cor: string }) {
  // o galpão com a porta de enrolar meio aberta, o elevador com um carro, os pneus empilhados
  return (
    <group>
      <Caixa p={[0, 3, -2]} t={[14, 6, 12]} cor="#5a5658" r={0.95} />
      <Caixa p={[0, 2.5, 4.02]} t={[9, 5, 0.08]} cor="#141218" />
      {/* a porta de enrolar: as lâminas na metade de cima */}
      {Array.from({ length: 8 }, (_, k) => <Caixa key={k} p={[0, 2.9 + k * 0.27, 4.08]} t={[8.8, 0.24, 0.06]} cor="#9a9aa4" m={0.6} r={0.4} />)}
      <Luz p={[0, 1.4, 3.9]} t={[8.6, 2.8, 0.02]} cor="#e8f0ff" forca={0.35} />
      {/* o elevador e o carro em cima */}
      <Caixa p={[-1.6, 0.9, 1]} t={[0.3, 1.8, 0.3]} cor="#ffc21a" /><Caixa p={[1.6, 0.9, 1]} t={[0.3, 1.8, 0.3]} cor="#ffc21a" />
      <Caixa p={[0, 2.2, 1]} t={[3.6, 0.9, 1.7]} cor="#d8202a" m={0.5} r={0.35} />
      {/* os pneus empilhados e o tambor de óleo */}
      {[0, 1, 2, 3].map((k) => <mesh key={k} position={[5.6, 0.18 + k * 0.32, 5.4]} rotation-x={Math.PI / 2}><torusGeometry args={[0.38, 0.15, 8, 16]} /><meshStandardMaterial color="#141414" /></mesh>)}
      <mesh position={[-5.6, 0.55, 5.2]}><cylinderGeometry args={[0.4, 0.4, 1.1, 14]} /><meshStandardMaterial color="#2a5aa8" /></mesh>
      <Letreiro txt="OFICINA" cor={cor} p={[0, 5.5, 4.12]} w={7} h={1.1} />
      <Caixa p={[0, 0.03, 6]} t={[9, 0.06, 4]} cor="#3a3a40" />
    </group>
  )
}

function Balada({ cor, nome }: { cor: string; nome: string }) {
  // a caixa preta com faixas de neon, a porta com a corda, a fila e os canhões de luz no céu
  const canhao = useMemo(() => { const g = new THREE.ConeGeometry(1.4, 40, 16, 1, true); g.translate(0, -20, 0); return g }, [])
  return (
    <group>
      <Caixa p={[0, 5, -2]} t={[16, 10, 12]} cor="#0e0c16" r={0.4} m={0.3} />
      {[2.5, 5, 7.5].map((y) => <Luz key={y} p={[0, y, 4.05]} t={[16, 0.12, 0.04]} cor={cor} />)}
      <Caixa p={[0, 1.4, 4.05]} t={[2.4, 2.8, 0.06]} cor="#2a0a2a" e={cor} ei={0.4} />
      <Letreiro txt={nome} cor={cor} p={[0, 8.8, 4.1]} w={8} h={1.6} fundo={null} />
      {/* a corda vermelha e a fila */}
      {[-1.6, -0.2, 1.2].map((x) => <mesh key={x} position={[x + 1.6, 0.5, 5.2]}><cylinderGeometry args={[0.05, 0.05, 1, 8]} /><meshStandardMaterial color="#d8c060" metalness={0.8} /></mesh>)}
      <Caixa p={[2.3, 0.85, 5.2]} t={[2.8, 0.06, 0.06]} cor="#c8202a" />
      {["#b38cff", "#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0", "#e8e0d0"].map((c, i) => <Pessoa key={i} p={[-1.4 - i * 0.9, 0, 5.6 + (i % 2) * 0.3]} cor={c} rot={Math.PI / 2} />)}
      {/* os canhões de luz varrendo o céu */}
      {[-6, 6].map((x, i) => <mesh key={x} geometry={canhao} position={[x, 10, -2]} rotation={[0.25, 0, i ? -0.3 : 0.3]}><meshBasicMaterial color={i ? "#2fe8ff" : cor} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>)}
    </group>
  )
}

function CasaDeShows({ cor, nome }: { cor: string; nome: string }) {
  // o teatro com a marquise cheia de lâmpadas, a bilheteria e os cartazes
  return (
    <group>
      <Caixa p={[0, 6, -2]} t={[18, 12, 13]} cor="#5a2a2a" r={0.9} />
      <Caixa p={[0, 4.6, 5.2]} t={[14, 1.8, 2.6]} cor="#1a1418" />
      <Letreiro txt={nome} cor="#1a1418" p={[0, 4.6, 6.52]} w={12} h={1.3} fundo="#fff2c8" />
      {Array.from({ length: 28 }, (_, k) => <Luz key={k} p={[-6.9 + k * 0.51, 5.58, 6.52]} t={[0.14, 0.14, 0.1]} cor="#ffe2a0" />)}
      {Array.from({ length: 28 }, (_, k) => <Luz key={`b${k}`} p={[-6.9 + k * 0.51, 3.62, 6.52]} t={[0.14, 0.14, 0.1]} cor="#ffe2a0" />)}
      <Caixa p={[0, 1.5, 4.55]} t={[2.4, 3, 0.08]} cor="#2a0a0a" e={cor} ei={0.3} />
      {/* a bilheteria e os cartazes */}
      <Caixa p={[-4, 1.1, 4.8]} t={[1.6, 2.2, 0.8]} cor="#b8962a" m={0.4} />
      <Luz p={[-4, 1.5, 5.22]} t={[1.1, 0.6, 0.02]} cor="#ffd9a0" />
      {[3.4, 5.6].map((x, i) => <Letreiro key={x} txt={["HOJE", "222"][i]} cor={cor} p={[x, 1.6, 4.6]} w={1.6} h={2.2} fundo="#14121c" />)}
      {[-6, -2, 2, 6].map((x) => <Janela key={x} p={[x, 9, 4.55]} w={1.6} h={2.2} cor="#ff9a7a" />)}
    </group>
  )
}

function Galeria({ cor }: { cor: string }) {
  // o cubo branco de vidro (o mercado de arte da cidade), com as obras e os spots
  const obras = ["#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0"]
  return (
    <group>
      <Caixa p={[0, 4, -3]} t={[16, 8, 10]} cor="#f2f2f4" r={0.5} />
      <mesh position={[0, 3.5, 2.6]}><boxGeometry args={[15, 7, 0.1]} /><meshStandardMaterial color="#cfe6ff" transparent opacity={0.28} metalness={0.9} roughness={0.05} /></mesh>
      {[-7.5, 7.5].map((x) => <Caixa key={x} p={[x, 3.5, 2.6]} t={[0.3, 7, 0.3]} cor="#e8e8ec" />)}
      <Caixa p={[0, 7.2, 2.6]} t={[15.4, 0.4, 0.4]} cor="#e8e8ec" />
      {obras.map((c, i) => (
        <group key={i} position={[-5.4 + i * 3.6, 3.4, 2.1]}>
          <Caixa p={[0, 0, 0]} t={[2.2, 2.8, 0.08]} cor="#141218" />
          <Caixa p={[0, 0, 0.05]} t={[1.9, 2.5, 0.02]} cor={c} e={c} ei={0.25} />
          <Luz p={[0, 2.1, 0.3]} t={[0.18, 0.18, 0.18]} cor="#ffffff" />
        </group>
      ))}
      <Letreiro txt="GALERIA" cor={cor} p={[0, 7.8, 2.7]} w={6} h={0.7} fundo={null} />
      <Caixa p={[0, 0.1, 4.5]} t={[16, 0.2, 3.6]} cor="#d8d4cc" />
    </group>
  )
}

function Fliperama({ cor }: { cor: string }) {
  // a fachada neon com moldura de lâmpadas, as máquinas na vitrine e o letreiro de pixel
  return (
    <group>
      <Caixa p={[0, 4.8, -2]} t={[12, 3.2, 12]} cor="#1a1430" r={0.7} />
      <Caixa p={[0, 1.6, -5]} t={[12, 3.2, 6]} cor="#1a1430" r={0.7} />
      {[-5.95, 5.95].map((x) => <Caixa key={x} p={[x, 1.6, 1]} t={[0.1, 3.2, 6]} cor="#1a1430" />)}
      {[-5.25, 5.25].map((x) => <Caixa key={x} p={[x, 1.6, 4.02]} t={[1.5, 3.2, 0.1]} cor="#241a40" />)}
      <Luz p={[0, 1.6, -1.95]} t={[11.8, 3.1, 0.02]} cor="#3a2a7a" forca={1} />
      <Caixa p={[0, 0.02, 1]} t={[11.8, 0.04, 6]} cor="#2a1a4a" />
      <Vidro p={[0, 1.7, 4.05]} t={[9, 3, 0.04]} cor="#d8c8ff" />
      {/* as máquinas de fliperama lá dentro, com as telas acesas */}
      {[-3.4, -1.7, 0, 1.7, 3.4].map((x, i) => (
        <group key={x} position={[x, 0, 3.4]}>
          <Caixa p={[0, 1, 0]} t={[0.9, 2, 0.8]} cor={["#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0", "#b38cff"][i]} r={0.6} />
          <Luz p={[0, 1.35, 0.41]} t={[0.66, 0.5, 0.02]} cor="#bff6ff" />
        </group>
      ))}
      {/* a moldura de lâmpadas em volta do letreiro */}
      <Letreiro txt="FLIPERAMA" cor={cor} p={[0, 4.6, 4.1]} w={9} h={1.4} fundo="#0a0812" />
      {Array.from({ length: 20 }, (_, k) => <Luz key={k} p={[-4.75 + k * 0.5, 5.45, 4.12]} t={[0.14, 0.14, 0.08]} cor={k % 2 ? "#ff3fb0" : "#ffc857"} />)}
      {Array.from({ length: 20 }, (_, k) => <Luz key={`b${k}`} p={[-4.75 + k * 0.5, 3.75, 4.12]} t={[0.14, 0.14, 0.08]} cor={k % 2 ? "#ffc857" : "#ff3fb0"} />)}
      <Caixa p={[5.25, 1.25, 4.1]} t={[1.1, 2.5, 0.06]} cor="#2a1450" e={cor} ei={0.3} />
    </group>
  )
}

function Posto({ cor }: { cor: string }) {
  // a cobertura grande com a faixa acesa, as bombas na ilha, a lojinha atrás
  return (
    <group>
      <Caixa p={[0, 2.5, -4]} t={[10, 5, 6]} cor="#e8e4dc" />
      <Luz p={[0, 1.6, -0.98]} t={[7, 2.4, 0.02]} cor="#fff4d8" forca={0.7} />
      <Caixa p={[0, 6.2, 3]} t={[16, 0.6, 8]} cor="#f2f2f2" />
      <Luz p={[0, 5.85, 3]} t={[15.6, 0.1, 7.6]} cor="#ffffff" forca={0.5} />
      <Luz p={[0, 6.2, 7.04]} t={[16, 0.4, 0.04]} cor={cor} />
      {[-4, 4].map((x) => <Caixa key={x} p={[x, 3, 3]} t={[0.5, 6, 0.5]} cor="#d8d4cc" />)}
      {[-2.5, 2.5].map((x) => (
        <group key={x} position={[x, 0, 3]}>
          <Caixa p={[0, 0.15, 0]} t={[1.6, 0.3, 3.2]} cor="#9a9aa4" />
          <Caixa p={[0, 1.1, 0]} t={[0.7, 1.6, 0.5]} cor="#d8202a" />
          <Luz p={[0, 1.5, 0.26]} t={[0.45, 0.35, 0.02]} cor="#9fffb0" />
        </group>
      ))}
      <Letreiro txt="POSTO 24H" cor={cor} p={[0, 5.2, -0.95]} w={6} h={0.9} />
    </group>
  )
}

function Estacao({ cor }: { cor: string }) {
  // a estação elevada da Linha 9: a plataforma nos pilares, a escada, a cobertura
  return (
    <group>
      {[-6, 0, 6].map((x) => <Caixa key={x} p={[x, 3.5, 0]} t={[0.8, 7, 0.8]} cor="#7a7686" />)}
      <Caixa p={[0, 7.2, 0]} t={[17, 0.5, 5]} cor="#c8c8d0" />
      <Caixa p={[0, 10, 0]} t={[17, 0.3, 5.4]} cor="#e6f0ff" e={cor} ei={0.15} />
      {[-7.5, 7.5].map((x) => <Caixa key={x} p={[x, 8.6, -2]} t={[0.2, 2.8, 0.2]} cor="#9a9aa4" />)}
      <Luz p={[0, 9.8, 0]} t={[16, 0.06, 0.3]} cor="#ffffff" />
      {/* a escada descendo até a calçada */}
      {Array.from({ length: 12 }, (_, k) => <Caixa key={k} p={[5.5, 0.3 + k * 0.6, 3 + k * 0.28 - 3.2]} t={[2.2, 0.2, 0.5]} cor="#9a96a0" />)}
      <Letreiro txt="LINHA 9" cor="#14121c" p={[0, 8.8, 2.75]} w={5} h={1} fundo="#e6f0ff" />
      <Caixa p={[-2, 7.8, 2.1]} t={[6, 0.7, 0.3]} cor="#2a2a30" />
    </group>
  )
}

function Predinho({ cor, nome }: { cor: string; nome: string }) {
  // a casa do Drewboy: o prédio de três andares com sacadas, o AP 222 na porta
  return (
    <group>
      <Caixa p={[0, 5, -2]} t={[10, 10, 10]} cor="#c86a4a" r={0.95} />
      {[1.8, 5, 8.2].map((y) => [-3, 0, 3].map((x) => <Janela key={`${x}${y}`} p={[x, y, 3.05]} w={1.3} h={1.5} cor={y === 5 && x === 3 ? "#ff9fd8" : "#ffd9a0"} />))}
      {[5, 8.2].map((y) => <Caixa key={y} p={[3, y - 1, 3.6]} t={[2, 0.15, 1.1]} cor="#3a3440" />)}
      {[5, 8.2].map((y) => <Caixa key={`g${y}`} p={[3, y - 0.5, 4.12]} t={[2, 0.8, 0.06]} cor="#2a2430" />)}
      <Caixa p={[-3, 1.2, 3.1]} t={[1.2, 2.4, 0.06]} cor="#2a1810" />
      <Letreiro txt={nome} cor={cor} p={[-3, 2.75, 3.12]} w={1.6} h={0.5} />
      {/* as roupas no varal da sacada */}
      {["#ff3fb0", "#2fe8ff", "#ffc857"].map((c, i) => <Caixa key={c} p={[2.4 + i * 0.6, 4.5, 4.15]} t={[0.4, 0.55, 0.04]} cor={c} />)}
    </group>
  )
}

function Casinha({ cor, nome, jardim = false }: { cor: string; nome: string; jardim?: boolean }) {
  // a casa térrea de telhado de duas águas; a da Ella com o jardim na frente
  const telhado = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-5.4, 0); s.lineTo(0, 2.6); s.lineTo(5.4, 0); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 9.4, bevelEnabled: false }); g.translate(0, 0, -4.7); return g }, [])
  return (
    <group>
      <Caixa p={[0, 1.8, -2]} t={[10, 3.6, 9]} cor={jardim ? "#e8d8c0" : "#d8c8a8"} r={0.95} />
      <mesh geometry={telhado} position={[0, 3.6, -2]}><meshStandardMaterial color="#9a3a2a" roughness={0.9} /></mesh>
      {[-2.8, 2.8].map((x) => <Janela key={x} p={[x, 2, 2.55]} w={1.5} h={1.2} />)}
      <Caixa p={[0, 1.1, 2.55]} t={[1.1, 2.2, 0.06]} cor="#3a6a4a" />
      <Letreiro txt={nome} cor={cor} p={[0, 2.5, 2.58]} w={1} h={0.3} fundo={null} />
      {jardim && (
        <group position={[0, 0, 5]}>
          <Caixa p={[0, 0.1, 0]} t={[10, 0.2, 4]} cor="#3f7a3a" />
          {Array.from({ length: 18 }, (_, k) => <mesh key={k} position={[-4.5 + (k % 9) * 1.1, 0.5, -1 + Math.floor(k / 9) * 1.6]}><sphereGeometry args={[0.28, 8, 6]} /><meshStandardMaterial color={["#ff5a7a", "#ffc21a", "#9b7bd8", "#f4f1ea"][k % 4]} emissive={["#ff5a7a", "#ffc21a", "#9b7bd8", "#f4f1ea"][k % 4]} emissiveIntensity={0.15} /></mesh>)}
          {[-5, 5].map((x) => <Caixa key={x} p={[x, 0.5, 0]} t={[0.1, 1, 4]} cor="#f2eee6" />)}
        </group>
      )}
    </group>
  )
}

// (09/11, ep. 7) a casa da Ella modelada: o mesmo nó que vai pro jogo
// (lugares-cidade.glb, blender/scripts/lugares_cidade.py), a casinha é a reserva
function CasaElla({ cor, nome }: { cor: string; nome: string }) {
  const { nodes } = useGLTF("/models/lugares-cidade.glb") as unknown as { nodes: Record<string, THREE.Object3D> }
  const partes = useMemo(() => {
    const no = nodes["casa-ella"]
    if (!no) throw new Error("lugares-cidade.glb sem o nó casa-ella")
    no.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(no.matrixWorld).invert()
    const solido = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 })
    const planta = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide })
    const luz = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
    const neon = new THREE.MeshBasicMaterial({ color: cor, toneMapped: false })
    const vidro = new THREE.MeshStandardMaterial({ color: "#2a3040", roughness: 0.12, metalness: 0.5, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide })
    const mats: Record<string, THREE.Material> = { solido, pe: solido, planta, luz, neon, pen: neon, vidro }
    const out: { k: string; geo: THREE.BufferGeometry; mat: THREE.Material; m: THREE.Matrix4 }[] = []
    no.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      out.push({ k: m.name, geo: m.geometry, mat: mats[m.name.slice(m.name.lastIndexOf("_") + 1)] ?? solido, m: new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld) })
    })
    return out
  }, [nodes, cor])
  return (
    <group>
      {partes.map((p) => <mesh key={p.k} geometry={p.geo} material={p.mat} matrixAutoUpdate={false} matrix={p.m} />)}
      <Letreiro txt={nome} cor={cor} p={[0, 3.32, 1.48]} w={2.4} h={0.5} fundo={null} />
    </group>
  )
}

function CasaDeserto({ cor }: { cor: string }) {
  // a casa da D-Bee: o barro do deserto, a varanda de madeira, a caixa d'água
  return (
    <group>
      <Caixa p={[0, 1.7, -2]} t={[11, 3.4, 9]} cor="#c8885a" r={1} />
      <Caixa p={[0, 3.5, -2]} t={[11.4, 0.3, 9.4]} cor="#8a5a3a" />
      <Caixa p={[0, 3.1, 4]} t={[11, 0.15, 3]} cor="#7a4a2a" />
      {[-5, -1.7, 1.7, 5].map((x) => <Caixa key={x} p={[x, 1.5, 5.3]} t={[0.18, 3, 0.18]} cor="#6a3a1a" />)}
      {[-2.6, 2.6].map((x) => <Janela key={x} p={[x, 1.9, 2.55]} w={1.2} h={1} cor="#ffc27a" />)}
      <Caixa p={[0, 1.1, 2.55]} t={[1.1, 2.2, 0.06]} cor="#3a2418" />
      <mesh position={[4, 5, -4]}><cylinderGeometry args={[1, 1, 1.6, 14]} /><meshStandardMaterial color="#2a6aa8" /></mesh>
      {[-0.6, 0.6].map((x) => <Caixa key={x} p={[4 + x, 3.9, -4]} t={[0.12, 1.8, 0.12]} cor="#5a5a5a" />)}
      <Letreiro txt="D-BEE" cor={cor} p={[0, 2.9, 5.4]} w={2} h={0.45} fundo={null} />
    </group>
  )
}

export type TipoFachada = "ginasio" | "bar" | "brecho" | "oficina" | "balada" | "shows" | "galeria" | "fliperama" | "posto" | "estacao" | "predinho" | "casa" | "jardim" | "deserto"

export function Fachada3D({ tipo, cor, nome }: { tipo: TipoFachada; cor: string; nome: string }) {
  switch (tipo) {
    case "ginasio": return <Ginasio cor={cor} />
    case "bar": return <Bar cor={cor} nome={nome} />
    case "brecho": return <Brecho cor={cor} />
    case "oficina": return <Oficina cor={cor} />
    case "balada": return <Balada cor={cor} nome={nome} />
    case "shows": return <CasaDeShows cor={cor} nome={nome} />
    case "galeria": return <Galeria cor={cor} />
    case "fliperama": return <Fliperama cor={cor} />
    case "posto": return <Posto cor={cor} />
    case "estacao": return <Estacao cor={cor} />
    case "predinho": return <Predinho cor={cor} nome={nome} />
    case "casa": return <Casinha cor={cor} nome={nome} />
    case "jardim": return <ModeloSeguro nome="casa-ella-glb" reserva={<Casinha cor={cor} nome={nome} jardim />}><CasaElla cor={cor} nome={nome} /></ModeloSeguro>
    case "deserto": return <CasaDeserto cor={cor} />
  }
}

// a lista que a vitrine mostra (e o mapa usa): o lugar, o tipo de fachada, a cor e o letreiro
export const FACHADAS: { id: string; nome: string; tipo: TipoFachada; cor: string; letreiro: string }[] = [
  { id: "ginasio", nome: "o ginásio", tipo: "ginasio", cor: "#ff9000", letreiro: "GINÁSIO" },
  { id: "bar", nome: "o bar", tipo: "bar", cor: "#ff6a35", letreiro: "O COPO" },
  { id: "brecho", nome: "o brechó", tipo: "brecho", cor: "#ffc857", letreiro: "BRECHÓ" },
  { id: "oficina", nome: "a oficina", tipo: "oficina", cor: "#ff9000", letreiro: "OFICINA" },
  { id: "balada", nome: "a balada", tipo: "balada", cor: "#b38cff", letreiro: "SEXTA" },
  { id: "shows", nome: "a casa de shows", tipo: "shows", cor: "#ffc857", letreiro: "SHOW HOJE" },
  { id: "galeria", nome: "a galeria", tipo: "galeria", cor: "#3d7bff", letreiro: "GALERIA" },
  { id: "fliperama", nome: "o fliperama", tipo: "fliperama", cor: "#ff6a35", letreiro: "FLIPERAMA" },
  { id: "posto", nome: "o posto", tipo: "posto", cor: "#ffd23a", letreiro: "POSTO 24H" },
  { id: "linha9", nome: "a estação da Linha 9", tipo: "estacao", cor: "#e6f0ff", letreiro: "LINHA 9" },
  { id: "drewboy", nome: "a casa do Drewboy", tipo: "predinho", cor: "#ff3fb0", letreiro: "AP 222" },
  { id: "ella", nome: "a casa da Ella", tipo: "jardim", cor: "#5dffa0", letreiro: "· · ·" },
  { id: "dbee", nome: "a casa da D-Bee", tipo: "deserto", cor: "#ff9a5c", letreiro: "D-BEE" },
]
