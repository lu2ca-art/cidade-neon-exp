"use client"

// A Kombi da Linha 222 em 3D — mesma leitura da Kombi 2D que abriu a
// estrada: saia azul (#1a3fa0, o azul da capa), teto creme arredondado,
// "V" na frente (agora com a silhueta de Kombi de verdade: perfil lateral
// extrudado, nariz redondo, caixas de roda, pneu faixa branca), vidros escuros com reflexo cyan, grade do motor atrás,
// placa LU2 C4, lanternas vermelhas, faróis redondos e luz magenta
// embaixo, no asfalto molhado. A frente aponta pra -Z.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

const AZUL = "#1a3fa0"
const CREME = "#ece5d6"
const VIDRO = "#0b0f24"

function texPlaca() {
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 80
  const g = c.getContext("2d")!
  g.fillStyle = "#e6e6e6"
  g.fillRect(0, 0, 256, 80)
  g.fillStyle = "#1a3fa0"
  g.fillRect(0, 0, 256, 16)
  g.fillStyle = "#fff"
  g.font = "bold 11px ui-monospace, monospace"
  g.textAlign = "center"
  g.fillText("CIDADE NEON", 128, 12)
  g.fillStyle = "#111"
  g.font = "bold 44px ui-monospace, monospace"
  g.fillText("LU2 C4", 128, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function texBrilho() {
  const c = document.createElement("canvas")
  c.width = c.height = 64
  const g = c.getContext("2d")!
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, "rgba(255,255,255,1)")
  gr.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

function Roda({ x, z, giro, esterco }: { x: number; z: number; giro: React.MutableRefObject<number>; esterco?: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null)
  const pivo = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.rotation.x = giro.current
    if (pivo.current && esterco) pivo.current.rotation.y = esterco.current
  })
  return (
    <group ref={pivo} position={[x, 0.36, z]}>
      <group ref={ref}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.36, 0.36, 0.26, 20]} />
          <meshStandardMaterial color="#0a0a10" roughness={0.9} />
        </mesh>
        {/* faixa branca no pneu e calota cromada, de Kombi antiga */}
        <mesh rotation={[0, Math.PI / 2, 0]} position={[x > 0 ? 0.132 : -0.132, 0, 0]}>
          <ringGeometry args={[0.2, 0.29, 28]} />
          <meshStandardMaterial color="#ece5d6" roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[x > 0 ? 0.135 : -0.135, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.02, 20]} />
          <meshStandardMaterial color="#d9dde8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  )
}

// perfil lateral (X = pra frente, Y = pra cima), em metros. Caixas de roda
// em ±1.35, raio 0.36 (as rodas)
export const FRISO = 1.2 // daqui pra cima é vidro (a cúpula panorâmica)

// a carroceria só até o friso: o nariz sobe até ele e o resto é reto
function perfilSaia() {
  const s = new THREE.Shape()
  const arco = (cx: number) => {
    for (let i = 0; i <= 14; i++) {
      const t = Math.PI - (i / 14) * Math.PI
      s.lineTo(cx + Math.cos(t) * 0.5, 0.36 + Math.sin(t) * 0.5)
    }
  }
  s.moveTo(-2.12, 0.4)
  s.lineTo(-1.85, 0.4)
  arco(-1.35)
  s.lineTo(0.85, 0.4)
  arco(1.35)
  s.lineTo(2.06, 0.4)
  s.quadraticCurveTo(2.2, 0.5, 2.2, 0.82)
  s.lineTo(2.19, FRISO)
  s.lineTo(-2.17, FRISO)
  s.lineTo(-2.17, 0.72)
  s.quadraticCurveTo(-2.17, 0.42, -2.12, 0.4)
  return s
}



function extrudar(sh: THREE.Shape, largura: number, bevel = true) {
  const g = new THREE.ExtrudeGeometry(sh, { depth: largura, bevelEnabled: bevel, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 5, curveSegments: 20 })
  g.translate(0, 0, -largura / 2)
  g.rotateY(Math.PI / 2)
  g.computeVertexNormals()
  return g
}

function montarCorpo() {
  return extrudar(perfilSaia(), 1.62)
}


// duas cores no shader, pela posição: crispa, sem depender de vértice
function montarPintura() {
  const m = new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.3, roughness: 0.32 })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.azul = { value: new THREE.Color(AZUL) }
    sh.uniforms.creme = { value: new THREE.Color(CREME) }
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;")
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObj;\nuniform vec3 azul;\nuniform vec3 creme;")
      .replace(
        "vec4 diffuseColor = vec4( diffuse, opacity );",
        `vec4 diffuseColor = vec4( diffuse, opacity );
        // o friso corre a 1.16 nas laterais; no nariz desce em V até 0.62
        float nariz = smoothstep(-2.0, -2.12, vObj.z);
        float cinta = mix(1.16, min(1.16, 0.62 + abs(vObj.x) * 1.15), nariz);
        float cima = step(cinta, vObj.y);
        vec3 cor = mix(azul, creme, cima);
        // friso cromado claro em cima da linha
        cor = mix(cor, vec3(0.92, 0.94, 0.98), (1.0 - smoothstep(0.0, 0.028, abs(vObj.y - cinta))) * (1.0 - nariz * 0.6));
        diffuseColor.rgb = cor;`,
      )
  }
  return m
}

function janela(w: number, h: number, r = 0.09) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -h / 2)
  s.lineTo(w / 2 - r, -h / 2)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
  s.lineTo(w / 2, h / 2 - r)
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
  s.lineTo(-w / 2 + r, h / 2)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
  s.lineTo(-w / 2, -h / 2 + r)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
  return new THREE.ShapeGeometry(s, 6)
}

// [z, largura]: porta da cabine e as 3 do salão
const JANELAS: [number, number][] = [[-1.42, 0.62], [-0.5, 0.82], [0.42, 0.82], [1.34, 0.82]]

// esterco: ângulo das rodas da frente (rad, + = pra esquerda). No drift elas
// apontam pra onde a Kombi ANDA — o contraesterço que mostra que ela tá de lado
export function Kombi222({ turbo, velocidade, esterco, soEfeitos = false }: { turbo: React.MutableRefObject<boolean>; velocidade: React.MutableRefObject<number>; esterco?: React.MutableRefObject<number>; soEfeitos?: boolean }) {
  const corpo = useMemo(() => montarCorpo(), [])
  const pintura = useMemo(() => montarPintura(), [])
  const placa = useMemo(() => texPlaca(), [])
  const brilho = useMemo(() => texBrilho(), [])
  const giro = useRef(0)
  const under = useRef<THREE.MeshBasicMaterial>(null)
  const escap = useRef<THREE.Mesh>(null)

  useFrame((s, dt) => {
    giro.current -= (velocidade.current / 0.36) * dt
    if (under.current) {
      under.current.color.set(turbo.current ? "#b38cff" : "#ff3fb0")
      under.current.opacity = 0.55 + Math.sin(s.clock.elapsedTime * 6) * 0.08
    }
    if (escap.current) {
      const on = turbo.current
      escap.current.visible = on
      if (on) escap.current.scale.setScalar(0.8 + Math.random() * 0.6)
    }
  })

  return (
    <group>
      {/* luz embaixo, no chão molhado */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <planeGeometry args={[3.6, 6]} />
        <meshBasicMaterial ref={under} map={brilho} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* a carroceria: um perfil lateral só (nariz redondo, para-brisa,
          teto arredondado, traseira do motor, caixas de roda), extrudado na
          largura com as bordas boleadas. Pintura em duas cores no shader:
          saia azul, cima creme, o "V" creme descendo no nariz e o friso */}
      {!soEfeitos && (<>
      <mesh geometry={corpo} material={pintura} />
      {/* caixas de roda por dentro (não dá pra ver através) */}
      {[-1.35, 1.35].map((z) => (
        <mesh key={z} position={[0, 0.5, z]}>
          <boxGeometry args={[1.5, 0.7, 1.0]} />
          <meshStandardMaterial color="#05060c" roughness={1} />
        </mesh>
      ))}


      {/* nariz: emblema redondo e faróis redondos com aro cromado */}
      <mesh position={[0, 0.98, -2.31]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.15, 0.15, 0.03, 24]} />
        <meshStandardMaterial color={CREME} metalness={0.4} roughness={0.25} emissive={CREME} emissiveIntensity={0.15} />
      </mesh>
      {[-0.64, 0.64].map((x) => (
        <group key={x} position={[x, 0.92, -2.27]} rotation-x={Math.PI / 2}>
          <mesh>
            <cylinderGeometry args={[0.17, 0.17, 0.06, 24]} />
            <meshStandardMaterial color="#e6e9f2" metalness={1} roughness={0.15} />
          </mesh>
          <mesh position={[0, -0.035, 0]}>
            <cylinderGeometry args={[0.135, 0.135, 0.02, 24]} />
            <meshBasicMaterial color="#fff6dc" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* piscas laranja embaixo dos faróis */}
      {[-0.64, 0.64].map((x) => (
        <mesh key={x} position={[x, 0.66, -2.3]}>
          <boxGeometry args={[0.14, 0.06, 0.03]} />
          <meshBasicMaterial color="#ffae3d" toneMapped={false} />
        </mesh>
      ))}

      {/* traseira: tampa do motor com as grelhas, placa, lanternas */}
      {[-1, 1].map((l) =>
        [0, 1, 2, 3].map((k) => (
          <mesh key={`${l}${k}`} position={[l * (0.34 + k * 0.09), 1.05, 2.285]}>
            <boxGeometry args={[0.05, 0.2, 0.02]} />
            <meshStandardMaterial color="#0b1030" />
          </mesh>
        )),
      )}
      <mesh position={[0, 0.72, 2.29]}>
        <planeGeometry args={[0.5, 0.16]} />
        <meshBasicMaterial map={placa} toneMapped={false} />
      </mesh>
      </>)}
      {[-0.76, 0.76].map((x) => (
        <group key={x} position={[x, 0.98, 2.27]}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.09, 0.09, 0.05, 20]} />
            <meshBasicMaterial color="#ff2436" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[1.1, 1.1]} />
            <meshBasicMaterial map={brilho} color="#ff2436" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {!soEfeitos && (<>
      {/* para-choques cromados, de tubo */}
      {[-2.36, 2.36].map((z) => (
        <group key={z} position={[0, 0.44, z]}>
          <mesh rotation-z={Math.PI / 2}>
            <capsuleGeometry args={[0.055, 1.85, 6, 12]} />
            <meshStandardMaterial color="#e6e9f2" metalness={1} roughness={0.12} />
          </mesh>
          {[-0.6, 0.6].map((x) => (
            <mesh key={x} position={[x, 0, -Math.sign(z) * 0.08]}>
              <boxGeometry args={[0.06, 0.06, 0.16]} />
              <meshStandardMaterial color="#9aa0b4" metalness={1} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}

      </>)}
      {/* chama do escapamento no turbo */}
      <mesh ref={escap} position={[0.55, 0.45, 2.35]} visible={false}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshBasicMaterial map={brilho} color="#b38cff" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {!soEfeitos && (<>
      <Roda x={-0.82} z={-1.35} giro={giro} esterco={esterco} />
      <Roda x={0.82} z={-1.35} giro={giro} esterco={esterco} />
      <Roda x={-0.82} z={1.35} giro={giro} />
      <Roda x={0.82} z={1.35} giro={giro} />
      </>)}
    </group>
  )
}

// Conversível: sem teto. Só o para-brisa de vidro, baixo e inclinado, sem
// moldura de metal (a cúpula com colunas e arcos ficou pesada — LU2CA, 02/10).
// De fora dá pra ver quem tá dentro; de dentro, a cidade inteira.
export function Cupula() {
  return (
    <mesh position={[0, FRISO + 0.32, -1.98]} rotation-x={-0.42} renderOrder={2}>
      <planeGeometry args={[1.62, 0.66]} />
      <meshStandardMaterial color="#bfe6ff" transparent opacity={0.16} metalness={0.7} roughness={0.04} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}
