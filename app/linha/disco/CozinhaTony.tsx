"use client"

// A COZINHA DO TONY, NO MUNDO (ep. 5 · Swav; decisão do dono, 09/11): a câmera vai
// pra barraca do fogão, no fim da feira, e os ingredientes dos 4 sacos aparecem
// ali. A regra continua a da peça (pecas/Cozinhar.tsx: escolher 3, segurar o fogo,
// soltar no ponto); ela escreve em COZINHA_VIVA e aqui só se desenha. Mesmo plano
// de jogo da banca: a tela acerta os legumes por porcentagem, sem projetar nada.

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { CAM_FEIRA, COZINHA_POS, COZINHA_VIVA, COZINHA_Y, FEIRA, FEIRA_RUMO, ITENS_FEIRA, LOCAL_COZINHA, naFeira } from "./feira"
import { COZINHAR } from "./pecas/conf"
import { geoLegume, matLegume } from "./feiraVeg"

const COR_PIMENTAO = 0xd8232a
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color()

export function CozinhaTony({ y }: { y: number }) {
  const { camera } = useThree()
  const pos = useMemo(() => naFeira(LOCAL_COZINHA.lx, LOCAL_COZINHA.lz), [])
  const geos = useMemo(() => ITENS_FEIRA.map((it) => geoLegume(it.id, false)), [])
  const mat = useMemo(() => matLegume(), [])
  const refs = useRef<(THREE.InstancedMesh | null)[]>([])
  const panela = useRef<THREE.Group>(null)
  const chama = useRef<THREE.Mesh>(null)
  const est = useRef({ entrada: 0, deX: 0, deY: 0, deZ: 0, t: 0, x: [0, 0, 0, 0], y: [0, 0, 0, 0], k: [0, 0, 0, 0], ok: false })

  useEffect(() => () => {
    CAM_FEIRA.ativo = false
    geos.forEach((g) => g.dispose()); mat.dispose()
  }, [geos, mat])

  useFrame((_, dtBruto) => {
    const dt = Math.min(0.05, dtBruto), s = est.current, v = COZINHA_VIVA
    s.t += dt
    const persp = camera as THREE.PerspectiveCamera, dist = FEIRA.cam.dist
    const hh = Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2) * dist, hw = hh * persp.aspect
    const yOlho = y + FEIRA.cam.alturaOlho
    if (s.entrada === 0) { s.deX = camera.position.x; s.deY = camera.position.y; s.deZ = camera.position.z }
    s.entrada = Math.min(1, s.entrada + dt / FEIRA.cam.entradaS)
    const k = s.entrada * s.entrada * (3 - 2 * s.entrada)
    const cx = pos.x + Math.sin(FEIRA_RUMO) * dist, cz = pos.z + Math.cos(FEIRA_RUMO) * dist
    CAM_FEIRA.ativo = true
    CAM_FEIRA.px = s.deX + (cx - s.deX) * k; CAM_FEIRA.py = s.deY + (yOlho - s.deY) * k; CAM_FEIRA.pz = s.deZ + (cz - s.deZ) * k
    CAM_FEIRA.ox = pos.x; CAM_FEIRA.oy = yOlho; CAM_FEIRA.oz = pos.z

    const noFogo = v.fase !== "escolher", yPanela = -0.42 * hh, tam = Math.min(1.15, hw / 1.1)
    if (panela.current) { panela.current.visible = noFogo; panela.current.position.set(0, yPanela, -0.05); panela.current.scale.setScalar(tam) }
    if (chama.current) {
      chama.current.visible = noFogo && v.segura
      const b = 1 + Math.sin(s.t * 31) * 0.12
      chama.current.scale.set(1, b, 1)
    }
    // o ponto: cozinha escurecendo; passou da faixa, queima
    const passou = v.ponto > COZINHAR.ponto[1] ? Math.min(1, (v.ponto - COZINHAR.ponto[1]) / 0.18) : 0
    mat.color.setScalar(noFogo ? (1 - 0.3 * Math.min(1, v.ponto / COZINHAR.ponto[1])) * (1 - 0.72 * passou) : 1)

    let ordem = 0
    for (let i = 0; i < ITENS_FEIRA.length; i++) {
      const inst = refs.current[i]
      if (!inst) continue
      const esc = v.ingr.includes(i)
      let ax = COZINHA_POS[i] * hw, ay = COZINHA_Y * hh, ak = tam * 1.15
      if (noFogo) {
        if (esc) { ax = (ordem - 1) * 0.17 * tam; ay = yPanela + 0.13 * tam; ak = tam * 0.85; ordem++ }
        else ak = 0
      } else if (esc) ay += 0.13 + Math.sin(s.t * 5 + i) * 0.03
      if (!s.ok) { s.x[i] = ax; s.y[i] = ay; s.k[i] = ak }
      const q = 1 - Math.exp(-dt * 9)
      s.x[i] += (ax - s.x[i]) * q; s.y[i] += (ay - s.y[i]) * q; s.k[i] += (ak - s.k[i]) * q
      inst.visible = s.k[i] > 0.02
      _e.set(0.35, s.t * 0.6 + i * 1.7, 0.12); _q.setFromEuler(_e); _p.set(s.x[i], s.y[i], 0); _s.setScalar(Math.max(0.001, s.k[i])); _m.compose(_p, _q, _s)
      inst.setMatrixAt(0, _m); inst.instanceMatrix.needsUpdate = true
    }
    s.ok = true
  })

  return (
    <group position={[pos.x, y + FEIRA.cam.alturaOlho, pos.z]} rotation={[0, FEIRA_RUMO, 0]}>
      {ITENS_FEIRA.map((it, i) => (
        <instancedMesh key={it.id} ref={(m) => { refs.current[i] = m; if (m && !m.instanceColor) { m.setColorAt(0, _c.setHex(it.id === "pimentao" ? COR_PIMENTAO : 0xffffff)) } }} args={[geos[i], mat, 1]} frustumCulled={false} />
      ))}
      <group ref={panela} visible={false}>
        <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.33, 0.27, 0.15, 14]} /><meshBasicMaterial color="#3b3b42" /></mesh>
        <mesh position={[0.5, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.03, 0.42, 6]} /><meshBasicMaterial color="#1c1c20" /></mesh>
        <mesh ref={chama} position={[0, -0.17, 0]} visible={false}><coneGeometry args={[0.27, 0.22, 9, 1, true]} /><meshBasicMaterial color="#ff8a1e" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} /></mesh>
      </group>
    </group>
  )
}
