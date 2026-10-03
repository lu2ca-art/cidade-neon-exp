"use client"

// LINHA 9 — o monotrilho do Núcleo. Corre pela esquerda do circuito
// principal, elevado sobre a cidade no trecho das nove estações (para em
// cada uma), e depois MERGULHA: desce num portal branco do Núcleo e some por
// baixo da cidade até reaparecer antes da primeira estação. Sempre no
// automático, sempre em loop, sempre lotado de gente que não olha pra fora.
// Leva as pessoas pras dependências do Núcleo.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { Mundo } from "./mundo"
import { pontoI } from "./pista"

export const LADO_METRO = -20 // lateral do trilho (esquerda da pista)
const ALTO = 13 // acima da pista, no trecho elevado
const FUNDO = -19 // por baixo da cidade (abaixo da água)
const PASSO = 4 // m entre amostras do trilho
const VAGOES = 4
const VAGAO = 13 // comprimento (m)
const VEL = 19 // m/s
const PARADA = 6 // s em cada estação

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function montarMetro(M: Mundo) {
  const C = M.vias[M.circuito.linha]
  // elevado de pouco antes da 1ª estação até pouco depois do fim do trecho
  // livre; o resto (saídas e chegadas) ela faz por baixo
  const sobe = [C.livre[0] - 260, C.livre[0] - 110] // sai do portal e sobe
  const desce = [C.livre[1] + 60, C.livre[1] + 210] // desce e entra no portal
  const altura = (u: number) => {
    const k = suave(sobe[0], sobe[1], u) * (1 - suave(desce[0], desce[1], u))
    return k
  }
  const n = Math.ceil(C.L / PASSO)
  const pos: THREE.Vector3[] = []
  const elev: number[] = []
  const q = new THREE.Vector3()
  for (let s = 0; s < n; s++) {
    const u = s * PASSO
    const i = Math.round((u / C.L) * C.n) % C.n
    const k = altura(u)
    pontoI(C, i, LADO_METRO, 0, q)
    const y = THREE.MathUtils.lerp(FUNDO, Math.max(q.y + ALTO, 6), k)
    pos.push(new THREE.Vector3(q.x, y, q.z))
    elev.push(k)
  }
  // a viga: uma fita de caixa seguindo os pontos (só onde aparece)
  const viga = caixaAoLongo(pos, 1.3, 1.6)
  // os pilares: a cada ~28 m no trecho elevado, descendo até a água
  const pil: THREE.Matrix4[] = []
  const d = new THREE.Object3D()
  for (let s = 0; s < n; s += 7) {
    const p = pos[s]
    if (elev[s] < 0.98 || p.y < -6) continue
    if (!M.vao(p.x, p.z, p.y - 1)) continue
    const h = p.y - 1 + 12
    d.position.set(p.x, -12 + h / 2, p.z)
    d.rotation.set(0, 0, 0)
    d.scale.set(1.4, h, 1.4)
    d.updateMatrix()
    pil.push(d.matrix.clone())
  }
  // as plataformas: uma em cada estação do jogo
  const plataformas = C.estacoes.map((e) => {
    const s = Math.round(e.u / PASSO) % n
    const a = pos[s], b = pos[(s + 1) % n]
    return { s, pos: a.clone(), rot: Math.atan2(b.x - a.x, b.z - a.z) }
  })
  // os portais: onde ela some e reaparece (no ponto em que cruza a água)
  const portais: { pos: THREE.Vector3; rot: number }[] = []
  for (let s = 0; s < n; s++) {
    const a = pos[s], b = pos[(s + 1) % n]
    if ((a.y + 12) * (b.y + 12) < 0) portais.push({ pos: a.clone().setY(-12), rot: Math.atan2(b.x - a.x, b.z - a.z) })
  }
  return { pos, n, L: n * PASSO, viga, pil, plataformas, portais, paradas: plataformas.map((p) => p.s * PASSO) }
}

// fita de seção retangular (largura × altura) passando pelos pontos
function caixaAoLongo(pts: THREE.Vector3[], larg: number, alt: number) {
  const n = pts.length
  const v: number[] = []
  const idx: number[] = []
  const lado = new THREE.Vector3()
  const t = new THREE.Vector3()
  const cima = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i <= n; i++) {
    const a = pts[i % n], b = pts[(i + 1) % n]
    t.subVectors(b, a).setY(0).normalize()
    lado.crossVectors(t, cima).normalize()
    const c = [
      [-larg / 2, 0], [larg / 2, 0], [larg / 2, -alt], [-larg / 2, -alt],
    ]
    for (const [x, y] of c) v.push(a.x + lado.x * x, a.y + y, a.z + lado.z * x)
  }
  for (let i = 0; i < n; i++) {
    const o = i * 4, p = (i + 1) * 4
    for (let f = 0; f < 4; f++) {
      const f2 = (f + 1) % 4
      idx.push(o + f, p + f, o + f2, o + f2, p + f, p + f2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

type Metro = ReturnType<typeof montarMetro>

export function Metro({ metro }: { metro: Metro }) {
  const vagoes = useRef<(THREE.Group | null)[]>([])
  const estado = useRef({ s: metro.paradas[0] ?? 0, espera: 0, ultima: -1, v: 0 })

  const pilares = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#d9dde8", roughness: 0.55, metalness: 0.2 }), Math.max(1, metro.pil.length))
    metro.pil.forEach((mt, i) => m.setMatrixAt(i, mt))
    m.count = metro.pil.length
    return m
  }, [metro])

  const a = useMemo(() => new THREE.Vector3(), [])
  const b = useMemo(() => new THREE.Vector3(), [])
  const ponto = (s: number, out: THREE.Vector3) => {
    const L = metro.L
    const x = (((s % L) + L) % L) / 4
    const i = Math.floor(x), f = x - i
    return out.lerpVectors(metro.pos[i % metro.n], metro.pos[(i + 1) % metro.n], f)
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    const e = estado.current
    // gancho de teste: onde o trem está (distância, velocidade, parado?)
    ;(window as unknown as { __metro?: () => object }).__metro = () => ({ s: Math.round(e.s % metro.L), v: +e.v.toFixed(1), parado: e.espera > 0, paradas: metro.paradas })
    if (e.espera > 0) e.espera -= dt
    else {
      // freia chegando na próxima parada e para nela
      const prox = metro.paradas.find((p) => p > e.s % metro.L + 0.01 && p !== e.ultima) ?? metro.paradas[0] + metro.L
      const falta = prox - (e.s % metro.L)
      // acelera devagar (1,4 m/s²) e freia a tempo de parar na plataforma
      const alvo = Math.min(VEL, Math.max(2.5, Math.sqrt(Math.max(0, falta) * 2 * 1.2)))
      e.v = alvo > e.v ? Math.min(alvo, e.v + 1.4 * dt) : alvo
      e.s += Math.max(e.v, 0.5) * dt
      if (falta < 0.3) {
        e.s = Math.floor(e.s / metro.L) * metro.L + (prox % metro.L)
        e.espera = PARADA
        e.ultima = prox % metro.L
        e.v = 0
      }
    }
    for (let k = 0; k < VAGOES; k++) {
      const g = vagoes.current[k]
      if (!g) continue
      const s = e.s - k * (VAGAO + 0.8)
      ponto(s, a)
      ponto(s + 2, b)
      g.position.copy(a)
      g.lookAt(b.x, b.y, b.z)
      g.visible = a.y > -13.5
    }
  })

  return (
    <group>
      <mesh geometry={metro.viga}>
        <meshStandardMaterial color="#cfd5e4" roughness={0.45} metalness={0.25} />
      </mesh>
      <primitive object={pilares} />
      {metro.plataformas.map((p, i) => (
        <group key={i} position={p.pos} rotation-y={p.rot}>
          {/* plataforma dos dois lados da viga + cobertura branca do Núcleo */}
          {[-1, 1].map((l) => (
            <mesh key={l} position={[l * 3.4, 0.1, 0]}>
              <boxGeometry args={[3.2, 0.5, 30]} />
              <meshStandardMaterial color="#e8ecf5" roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[0, 5.4, 0]}>
            <boxGeometry args={[11, 0.35, 32]} />
            <meshStandardMaterial color="#f4f6fb" emissive="#dfe8ff" emissiveIntensity={0.25} roughness={0.5} />
          </mesh>
          {[-1, 1].map((l) => (
            <mesh key={l} position={[l * 5.2, 5.1, 0]}>
              <boxGeometry args={[0.15, 0.12, 32]} />
              <meshBasicMaterial color="#eaf4ff" toneMapped={false} />
            </mesh>
          ))}
          {/* o 9 */}
          <mesh position={[5.6, 3.6, 13]} rotation-y={Math.PI / 2}>
            <circleGeometry args={[0.9, 24]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {metro.portais.map((p, i) => (
        <group key={i} position={p.pos} rotation-y={p.rot}>
          {/* o portal do Núcleo: bloco branco, boca escura com contorno de luz */}
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[9, 9, 24]} />
            <meshStandardMaterial color="#eef1f8" roughness={0.4} emissive="#cfdcff" emissiveIntensity={0.08} />
          </mesh>
          {[-1, 1].map((l) => (
            <group key={l} position={[0, 0, l * 12.05]}>
              <mesh position={[0, 3, 0]}>
                <planeGeometry args={[4.6, 5]} />
                <meshBasicMaterial color="#05060c" side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, 3, l * 0.02]}>
                <ringGeometry args={[2.9, 3.1, 4, 1, Math.PI / 4]} />
                <meshBasicMaterial color="#eaf4ff" toneMapped={false} side={THREE.DoubleSide} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {Array.from({ length: VAGOES }, (_, k) => (
        <group key={k} ref={(g) => { vagoes.current[k] = g }}>
          <group position={[0, 2.1, 0]}>
            <mesh>
              <boxGeometry args={[3, 3.2, VAGAO]} />
              <meshStandardMaterial color="#f3f5fa" roughness={0.35} metalness={0.3} />
            </mesh>
            {/* a faixa de janelas: luz branca fria, gente parada lá dentro */}
            {[-1, 1].map((l) => (
              <mesh key={l} position={[l * 1.51, 0.35, 0]} rotation-y={l * Math.PI / 2}>
                <planeGeometry args={[VAGAO - 1.2, 1.1]} />
                <meshBasicMaterial color="#cfe6ff" toneMapped={false} />
              </mesh>
            ))}
            <mesh position={[0, -1.25, 0]}>
              <boxGeometry args={[3.04, 0.12, VAGAO]} />
              <meshBasicMaterial color="#2fe8ff" toneMapped={false} />
            </mesh>
            {k === 0 && (
              <mesh position={[0, 0.2, VAGAO / 2 + 0.01]}>
                <planeGeometry args={[2.2, 0.5]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
              </mesh>
            )}
          </group>
        </group>
      ))}
    </group>
  )
}
