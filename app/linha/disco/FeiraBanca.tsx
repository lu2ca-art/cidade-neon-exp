"use client"

// A BARGANHA, NO MUNDO (ep. 5 · Swav): a câmera para na frente da banca e os
// legumes sobem na frente dela, com etiqueta de preço. O dedo (ou o mouse) passa
// o pincel vermelho do feirante: cortou, aquele item cai 12%; os próximos já vêm
// com o desconto. Mora dentro da FeiraRua: só existe com a barganha aberta.
//
// Tudo num plano de jogo na frente da banca (x pra direita da tela, y pra cima, z
// pra câmera): o corte é medido no plano, sem projetar nada. Por quadro: só as
// matrizes dos legumes que estão no ar. O cartaz redesenha só a cada corte.

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { BANCA_FEIRA, CAM_FEIRA, FEIRA, FEIRA_RUMO, FEIRA_VIVO, ITENS_FEIRA, cortarLegume, fmtPreco, noMaximo, ouvirFeira, precoSaco, precoUnidade, sortearLeva, naFeira, type ItemFeiraId } from "./feira"
import { COR_FAISCA, RAIO_LEGUME, geoLegume, matLegume } from "./feiraVeg"
import { somCorte, somDesconto } from "./feiraSons"
import { vib } from "../som-carro"

const IDS = ITENS_FEIRA.map((i) => i.id)
const N_LEG = 14, N_MEIA = 30, N_ETIQ = N_LEG + 8, N_FAISCA = 180
const CORES_PIMENTAO = [0xd8232a, 0xf4c21a, 0x2f9e44, 0xe8701a]
const G_FIM = 2.2 // m abaixo do plano: acabou o voo

interface Voa { vivo: boolean; item: number; x: number; y: number; vx: number; vy: number; g: number; ax: number; az: number; ang: number; giro: number; cor: number }
interface Meia { vivo: boolean; item: number; x: number; y: number; z: number; vx: number; vy: number; vz: number; g: number; nx: number; ny: number; nz: number; ang: number; giro: number; t: number; cor: number }
interface Etiq { item: number; x: number; y: number; vx: number; vy: number; g: number; t: number; escala: number }

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qt = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _z0 = new THREE.Vector3(0, 0, 1)
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler()

// a etiqueta: a papeleta amarela com o preço (uma célula por item e desconto)
const CEL_L = 128, CEL_A = 64
function texEtiquetas() {
  const c = document.createElement("canvas"); c.width = CEL_L * IDS.length; c.height = CEL_A * (FEIRA.cortesMax + 1)
  const g = c.getContext("2d")!
  ITENS_FEIRA.forEach((it, col) => {
    for (let nivel = 0; nivel <= FEIRA.cortesMax; nivel++) {
      const x = col * CEL_L, y = nivel * CEL_A
      g.save(); g.translate(x + CEL_L / 2, y + CEL_A / 2)
      g.fillStyle = "#f8d94c"; g.strokeStyle = "#1a1208"; g.lineWidth = 3
      g.beginPath(); g.moveTo(-58, -26); g.lineTo(52, -26); g.lineTo(60, 0); g.lineTo(52, 26); g.lineTo(-58, 26); g.closePath(); g.fill(); g.stroke()
      g.fillStyle = "#1a1208"; g.beginPath(); g.arc(46, 0, 5, 0, Math.PI * 2); g.fill()
      g.textAlign = "center"; g.textBaseline = "middle"; g.font = "900 34px Impact, ui-sans-serif, sans-serif"
      g.fillStyle = nivel === 0 ? "#1a1208" : "#d11d1d"
      g.fillText(fmtPreco(precoUnidade(it, nivel)), -6, nivel === 0 ? 0 : 8)
      if (nivel > 0) {
        g.font = "700 13px ui-sans-serif, sans-serif"; g.fillStyle = "#6a5a18"
        const velho = fmtPreco(it.preco)
        g.fillText(velho, -36, -16)
        g.strokeStyle = "#d11d1d"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(-54, -13); g.lineTo(-18, -19); g.stroke()
        g.font = "800 13px ui-sans-serif, sans-serif"; g.fillStyle = "#1a1208"; g.textAlign = "right"
        g.fillText(`-${Math.round(nivel * FEIRA.corte * 100)}%`, 42, -16)
      }
      g.restore()
    }
  })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2
  return t
}

// o cartaz da banca: os 4 itens, o quanto já caiu e a conta
function pintarCartaz(g: CanvasRenderingContext2D, W: number, H: number) {
  const C = FEIRA_VIVO.cortes
  g.fillStyle = "#f1e5c8"; g.fillRect(0, 0, W, H)
  g.strokeStyle = "#1a1208"; g.lineWidth = 8; g.strokeRect(5, 5, W - 10, H - 10)
  const lin = (H - 26) / ITENS_FEIRA.length
  ITENS_FEIRA.forEach((it, i) => {
    const y = 16 + i * lin, n = C[it.id], cheio = noMaximo(C, it.id)
    g.fillStyle = cheio ? "#177a2c" : "#1a1208"; g.font = "900 44px Impact, ui-sans-serif, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle"
    g.fillText(it.nome, 22, y + lin / 2)
    for (let k = 0; k < FEIRA.cortesMax; k++) {
      g.fillStyle = k < n ? "#d11d1d" : "#c9b98a"
      g.fillRect(W * 0.46 + k * 42, y + lin / 2 - 13, 34, 26)
    }
    g.textAlign = "right"; g.fillStyle = cheio ? "#177a2c" : "#d11d1d"; g.font = "900 40px Impact, ui-sans-serif, sans-serif"
    g.fillText(`${precoSaco(it, n)}`, W - 22, y + lin / 2)
  })
}

export function FeiraBanca({ y }: { y: number }) {
  const { camera, size } = useThree()
  const pos = useMemo(() => naFeira(BANCA_FEIRA.lx, BANCA_FEIRA.lz), [])
  const eixoCam = useMemo(() => ({ dirX: Math.sin(FEIRA_RUMO + Math.PI), dirZ: Math.cos(FEIRA_RUMO + Math.PI) }), [])

  const geos = useMemo(() => IDS.map((id) => ({ inteiro: geoLegume(id, false), metade: geoLegume(id, true) })), [])
  const mat = useMemo(() => matLegume(), [])
  const refsInt = useRef<(THREE.InstancedMesh | null)[]>([])
  const refsMeia = useRef<(THREE.InstancedMesh | null)[]>([])
  const etiq = useRef<THREE.InstancedMesh>(null)
  const tex = useMemo(() => texEtiquetas(), [])
  const aCel = useMemo(() => new THREE.InstancedBufferAttribute(new Float32Array(N_ETIQ * 2), 2).setUsage(THREE.DynamicDrawUsage), [])
  const geoEtiq = useMemo(() => { const g = new THREE.PlaneGeometry(1, 1); g.setAttribute("aCel", aCel); return g }, [aCel])
  const geoSaco = useMemo(() => new THREE.CylinderGeometry(0.17, 0.21, 0.3, 8), [])
  const sacos = useRef<THREE.InstancedMesh>(null)
  const matEtiq = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, toneMapped: false, depthWrite: false })
    const cols = String(IDS.length).padEnd(3, ".0").slice(0, 3), lin = String(FEIRA.cortesMax + 1).padEnd(3, ".0").slice(0, 3)
    m.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nattribute vec2 aCel;")
        .replace("#include <uv_vertex>", `#include <uv_vertex>\nvMapUv = (uv + aCel) / vec2(${cols}, ${lin});`)
    }
    return m
  }, [tex])

  const canvasCartaz = useMemo(() => { const c = document.createElement("canvas"); c.width = 640; c.height = 300; return c }, [])
  const texCartaz = useMemo(() => { const t = new THREE.CanvasTexture(canvasCartaz); t.colorSpace = THREE.SRGBColorSpace; return t }, [canvasCartaz])
  const cartazRef = useRef<THREE.Mesh>(null)

  const faiscasG = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N_FAISCA * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N_FAISCA * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setDrawRange(0, 0)
    return g
  }, [])
  const matFaisca = useMemo(() => new THREE.PointsMaterial({ size: 0.045, vertexColors: true, depthWrite: false }), [])

  const est = useRef({
    t: 0, entrada: 0, deX: 0, deY: 0, deZ: 0, deOx: 0, deOy: 0, deOz: 0,
    leva: 0.45, fila: [] as { id: ItemFeiraId; em: number }[], cont: [0, 0, 0, 0], contMeia: [0, 0, 0, 0],
    voa: Array.from({ length: N_LEG }, (): Voa => ({ vivo: false, item: 0, x: 0, y: 0, vx: 0, vy: 0, g: 0, ax: 0, az: 0, ang: 0, giro: 0, cor: 0 })),
    meia: Array.from({ length: N_MEIA }, (): Meia => ({ vivo: false, item: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, nx: 0, ny: 0, nz: 0, ang: 0, giro: 0, t: 0, cor: 0 })),
    tags: Array.from({ length: N_ETIQ }, (): Etiq => ({ item: 0, x: 0, y: 0, vx: 0, vy: 0, g: 0, t: 99, escala: 1 })),
    fX: new Float32Array(N_FAISCA), fY: new Float32Array(N_FAISCA), fZ: new Float32Array(N_FAISCA), fVX: new Float32Array(N_FAISCA), fVY: new Float32Array(N_FAISCA), fVZ: new Float32Array(N_FAISCA), fT: new Float32Array(N_FAISCA), fN: 0,
  })

  // o cartaz repinta quando um corte muda a conta; e ao abrir
  useEffect(() => {
    const g = canvasCartaz.getContext("2d")!
    let ult = -1
    const pinta = () => { if (FEIRA_VIVO.conta === ult) return; ult = FEIRA_VIVO.conta; pintarCartaz(g, canvasCartaz.width, canvasCartaz.height); texCartaz.needsUpdate = true }
    pinta()
    return ouvirFeira(pinta)
  }, [canvasCartaz, texCartaz])

  useEffect(() => {
    FEIRA_VIVO.pronto3D = true
    return () => {
      FEIRA_VIVO.pronto3D = false
      CAM_FEIRA.ativo = false
      geos.forEach((g) => { g.inteiro.dispose(); g.metade.dispose() }); geoEtiq.dispose(); geoSaco.dispose(); mat.dispose(); matEtiq.dispose(); tex.dispose(); texCartaz.dispose(); faiscasG.dispose(); matFaisca.dispose()
    }
  }, [geos, geoEtiq, geoSaco, mat, matEtiq, tex, texCartaz, faiscasG, matFaisca])

  useFrame((_, dtBruto) => {
    const dt = Math.min(0.05, dtBruto), s = est.current
    s.t += dt
    const persp = camera as THREE.PerspectiveCamera
    const dist = FEIRA.cam.dist
    const hh = Math.tan(THREE.MathUtils.degToRad(persp.fov) / 2) * dist, hw = hh * persp.aspect
    const P_X = pos.x, P_Z = pos.z, Y_OLHO = y + FEIRA.cam.alturaOlho

    // a câmera: o ponto fixo na frente da banca, chegando devagar de onde estava
    if (s.entrada === 0) { s.deX = camera.position.x; s.deY = camera.position.y; s.deZ = camera.position.z }
    s.entrada = Math.min(1, s.entrada + dt / FEIRA.cam.entradaS)
    const k = s.entrada * s.entrada * (3 - 2 * s.entrada)
    const cx = P_X + eixoCam.dirX * dist, cz = P_Z + eixoCam.dirZ * dist
    CAM_FEIRA.ativo = true
    CAM_FEIRA.px = s.deX + (cx - s.deX) * k
    CAM_FEIRA.py = s.deY + (Y_OLHO - s.deY) * k
    CAM_FEIRA.pz = s.deZ + (cz - s.deZ) * k
    CAM_FEIRA.ox = P_X; CAM_FEIRA.oy = Y_OLHO; CAM_FEIRA.oz = P_Z

    if (cartazRef.current) {
      const larg = Math.min(hw * 1.6, 1.5), alt = larg * (300 / 640)
      cartazRef.current.position.set(0, hh * 0.56, -0.32)
      cartazRef.current.scale.set(larg, alt, 1)
    }

    // ── as levas ──
    const c = FEIRA_VIVO.cortes
    let noAr = 0
    for (const v of s.voa) if (v.vivo) noAr++
    if (s.fila.length === 0) {
      s.leva -= dt
      if (s.leva <= 0 && noAr < FEIRA.leva.noArMax) {
        const n = 1 + Math.floor(Math.random() * FEIRA.leva.tamanhoMax)
        const ids = sortearLeva(Math.random, c, n)
        for (let i = 0; i < ids.length; i++) s.fila.push({ id: ids[i], em: i * FEIRA.leva.intervaloS })
        s.leva = FEIRA.leva.minS + Math.random() * (FEIRA.leva.maxS - FEIRA.leva.minS)
      }
    }
    for (let i = s.fila.length - 1; i >= 0; i--) {
      const f = s.fila[i]; f.em -= dt
      if (f.em <= 0) {
        s.fila.splice(i, 1)
        if (noMaximo(c, f.id)) continue
        const v = s.voa.find((x) => !x.vivo)
        if (!v) continue
        const T = FEIRA.subidaS[0] + Math.random() * (FEIRA.subidaS[1] - FEIRA.subidaS[0])
        const y0 = -hh - 0.25, topo = -0.1 * hh + Math.random() * 0.7 * hh, delta = topo - y0
        const g = (2 * delta) / (T * T)
        const x0 = (Math.random() * 1.6 - 0.8) * hw, x1 = (Math.random() * 1.2 - 0.6) * hw
        v.vivo = true; v.item = IDS.indexOf(f.id); v.x = x0; v.y = y0; v.vy = g * T; v.vx = (x1 - x0) / (2 * T); v.g = g
        v.ax = Math.random() * Math.PI; v.az = (Math.random() - 0.5) * 0.8; v.ang = Math.random() * Math.PI * 2; v.giro = (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random() * 2)
        v.cor = CORES_PIMENTAO[Math.floor(Math.random() * CORES_PIMENTAO.length)]
      }
    }

    // ── os riscos do dedo: a tela é em px; o plano do jogo, em metros ──
    const riscos = FEIRA_VIVO.riscos
    const W = size.width, H = size.height
    if (riscos.length) {
      const pxPorM = H / (2 * hh)
      const raioMin = FEIRA.corteRaioMinPx / pxPorM
      for (const r of riscos) {
        if (r.vel < FEIRA.corteVelMin) continue
        const ax = (r.x0 - size.left - W / 2) / pxPorM, ay = -(r.y0 - size.top - H / 2) / pxPorM
        const bx = (r.x1 - size.left - W / 2) / pxPorM, by = -(r.y1 - size.top - H / 2) / pxPorM
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy
        if (l2 < 1e-5) continue
        const l = Math.sqrt(l2), ux = dx / l, uy = dy / l
        for (const v of s.voa) {
          if (!v.vivo) continue
          const id = IDS[v.item], raio = Math.max(raioMin, RAIO_LEGUME[id])
          const t = Math.max(0, Math.min(1, ((v.x - ax) * dx + (v.y - ay) * dy) / l2))
          const ex = ax + dx * t - v.x, ey = ay + dy * t - v.y
          if (ex * ex + ey * ey > raio * raio) continue
          const nivel = cortarLegume(id)
          somCorte(id); somDesconto(nivel); vib(12)
          // as duas metades abrem pra longe do risco, com a cara do corte virada pra câmera
          const perpX = -uy, perpY = ux
          for (let q = 0; q < 2; q++) {
            const sinal = q === 0 ? 1 : -1, m = s.meia.find((x) => !x.vivo)
            if (!m) break
            m.vivo = true; m.item = v.item; m.x = v.x; m.y = v.y; m.z = 0.01; m.t = 0; m.cor = v.cor; m.g = v.g
            m.vx = v.vx + sinal * perpX * 1.2; m.vy = v.vy * 0.45 + sinal * perpY * 1.2; m.vz = 0.2 + Math.random() * 0.35
            m.nx = sinal * perpX * 0.78; m.ny = sinal * perpY * 0.78; m.nz = 0.62
            m.ang = v.ang; m.giro = sinal * (1.8 + Math.random() * 1.2)
          }
          // a etiqueta rasga e voa
          const tg = s.tags.find((x) => x.t >= 1)
          if (tg) { tg.item = v.item; tg.t = 0; tg.x = v.x; tg.y = v.y + 0.12; tg.vx = v.vx * 0.3 + (Math.random() - 0.5) * 1.4; tg.vy = v.vy * 0.5 + 2.2; tg.g = 7; tg.escala = 1 }
          // os farelos do miolo
          _c.setHex(COR_FAISCA[id])
          const col = faiscasG.attributes.color as THREE.BufferAttribute, np = faiscasG.attributes.position as THREE.BufferAttribute
          for (let q = 0; q < 14; q++) {
            const i = s.fN % N_FAISCA; s.fN = (s.fN + 1) % (N_FAISCA * 1000)
            s.fX[i] = v.x; s.fY[i] = v.y; s.fZ[i] = 0.05
            s.fVX[i] = v.vx * 0.2 + (Math.random() - 0.5) * 3.2; s.fVY[i] = v.vy * 0.2 + (Math.random() - 0.3) * 3.2; s.fVZ[i] = Math.random() * 0.8
            s.fT[i] = 0
            col.setXYZ(i, _c.r, _c.g, _c.b)
            np.setXYZ(i, s.fX[i], s.fY[i], s.fZ[i])
          }
          col.needsUpdate = true
          faiscasG.setDrawRange(0, Math.min(N_FAISCA, s.fN))
          v.vivo = false
          break
        }
      }
      riscos.length = 0
    }

    // ── mover e escrever as matrizes ──
    const cont = s.cont, contMeia = s.contMeia
    cont.fill(0); contMeia.fill(0)
    let nTag = 0
    const tagGeo = etiq.current
    for (const v of s.voa) {
      if (!v.vivo) continue
      v.vy -= v.g * dt; v.x += v.vx * dt; v.y += v.vy * dt; v.ang += v.giro * dt
      if (v.vy < 0 && v.y < -hh - 0.3) { v.vivo = false; continue }
      const inst = refsInt.current[v.item]
      if (!inst) continue
      _e.set(v.az, v.ang, v.ax); _q.setFromEuler(_e); _p.set(v.x, v.y, 0); _m.compose(_p, _q, _s)
      const n = cont[v.item]++
      inst.setMatrixAt(n, _m)
      inst.setColorAt(n, _c.setHex(IDS[v.item] === "pimentao" ? v.cor : 0xffffff))
      if (tagGeo && nTag < N_ETIQ) {
        _p.set(v.x + 0.12, v.y + 0.2, 0.2); _s.set(0.3, 0.15, 1); _q.identity(); _m.compose(_p, _q, _s); _s.set(1, 1, 1)
        tagGeo.setMatrixAt(nTag, _m); aCel.setXY(nTag, v.item, FEIRA.cortesMax - c[IDS[v.item]]); nTag++
      }
    }
    // os sacos em cima do tampo: enchem a cada corte; o legume aparece na boca do saco
    if (sacos.current) {
      const larg = Math.min(hw * 0.68, 0.95), yS = -hh * 0.7
      for (let i = 0; i < IDS.length; i++) {
        const xS = -larg + (i * 2 * larg) / (IDS.length - 1), n = c[IDS[i]], k2 = 0.42 + (n / FEIRA.cortesMax) * 0.58
        _p.set(xS, yS - 0.15 * (1 - k2), -0.1); _q.identity(); _s.set(1, k2, 1); _m.compose(_p, _q, _s); _s.set(1, 1, 1)
        sacos.current.setMatrixAt(i, _m)
        const inst = refsInt.current[i]
        if (inst && n > 0 && cont[i] < N_LEG) {
          _e.set(0.5, 0.7 * i, 0.2); _q.setFromEuler(_e); _p.set(xS, yS + 0.3 * k2, -0.05); _s.setScalar(0.85); _m.compose(_p, _q, _s); _s.set(1, 1, 1)
          const nn = cont[i]++
          inst.setMatrixAt(nn, _m)
          inst.setColorAt(nn, _c.setHex(CORES_PIMENTAO[i % 4]))
        }
      }
      sacos.current.instanceMatrix.needsUpdate = true
    }
    for (let i = 0; i < IDS.length; i++) {
      const inst = refsInt.current[i]
      if (inst) { inst.count = cont[i]; inst.instanceMatrix.needsUpdate = cont[i] > 0; if (inst.instanceColor) inst.instanceColor.needsUpdate = cont[i] > 0 }
    }
    for (const m of s.meia) {
      if (!m.vivo) continue
      m.t += dt; m.vy -= m.g * dt * 0.75; m.x += m.vx * dt; m.y += m.vy * dt; m.z += m.vz * dt; m.ang += m.giro * dt
      if (m.y < -hh - 0.4 || m.t > 2.4) { m.vivo = false; continue }
      const inst = refsMeia.current[m.item]
      if (!inst) continue
      // a cara do corte (+x da metade) olha pra normal; o resto gira em volta dela
      const nl = Math.hypot(m.nx, m.ny, m.nz) || 1
      _x.set(m.nx / nl, m.ny / nl, m.nz / nl)
      _y.set(0, 1, 0); if (Math.abs(_y.dot(_x)) > 0.9) _y.set(1, 0, 0)
      _z.crossVectors(_x, _y).normalize(); _y.crossVectors(_z, _x).normalize()
      _q.setFromRotationMatrix(_m.makeBasis(_x, _y, _z))
      _qt.setFromAxisAngle(_x, m.ang)
      _q.premultiply(_qt)
      _p.set(m.x, m.y, m.z); _m.compose(_p, _q, _s)
      const n = contMeia[m.item]++
      inst.setMatrixAt(n, _m)
      inst.setColorAt(n, _c.setHex(IDS[m.item] === "pimentao" ? m.cor : 0xffffff))
    }
    for (let i = 0; i < IDS.length; i++) {
      const inst = refsMeia.current[i]
      if (inst) { inst.count = contMeia[i]; inst.instanceMatrix.needsUpdate = contMeia[i] > 0; if (inst.instanceColor) inst.instanceColor.needsUpdate = contMeia[i] > 0 }
    }
    // as etiquetas soltas (cortadas)
    for (const tg of s.tags) {
      if (tg.t >= 1) continue
      tg.t += dt / 0.9; tg.vy -= tg.g * dt; tg.x += tg.vx * dt; tg.y += tg.vy * dt; tg.escala = 1 - tg.t * 0.4
      if (tagGeo && nTag < N_ETIQ) {
        _p.set(tg.x, tg.y, 0.25); _s.set(0.3 * tg.escala, 0.15 * tg.escala, 1); _q.setFromAxisAngle(_z0, tg.t * 4 * (tg.vx > 0 ? -1 : 1)); _m.compose(_p, _q, _s); _s.set(1, 1, 1)
        tagGeo.setMatrixAt(nTag, _m); aCel.setXY(nTag, tg.item, FEIRA.cortesMax - c[IDS[tg.item]]); nTag++
      }
    }
    if (tagGeo) { tagGeo.count = nTag; tagGeo.instanceMatrix.needsUpdate = true; aCel.needsUpdate = true }
    // os farelos
    if (s.fN > 0) {
      const pos2 = faiscasG.attributes.position as THREE.BufferAttribute
      let alguem = false
      for (let i = 0; i < Math.min(N_FAISCA, s.fN); i++) {
        if (s.fT[i] >= 2) continue
        s.fT[i] += dt / 0.7; alguem = true
        if (s.fT[i] > 1) { s.fT[i] = 2; pos2.setXYZ(i, 0, -50, 0); continue }
        s.fVY[i] -= 9 * dt
        s.fX[i] += s.fVX[i] * dt; s.fY[i] += s.fVY[i] * dt; s.fZ[i] += s.fVZ[i] * dt
        pos2.setXYZ(i, s.fX[i], s.fY[i], s.fZ[i])
      }
      if (alguem) pos2.needsUpdate = true
    }
    FEIRA_VIVO.desenhar?.(performance.now())
  })

  return (
    <group position={[pos.x, y + FEIRA.cam.alturaOlho, pos.z]} rotation={[0, FEIRA_RUMO + Math.PI, 0]}>
      {IDS.map((id, i) => (
        <instancedMesh key={`i-${id}`} ref={(m) => { refsInt.current[i] = m; if (m && !m.instanceColor) m.setColorAt(0, _c.setHex(0xffffff)) }} args={[geos[i].inteiro, mat, N_LEG]} frustumCulled={false} />
      ))}
      {IDS.map((id, i) => (
        <instancedMesh key={`m-${id}`} ref={(m) => { refsMeia.current[i] = m; if (m && !m.instanceColor) m.setColorAt(0, _c.setHex(0xffffff)) }} args={[geos[i].metade, mat, N_MEIA]} frustumCulled={false} />
      ))}
      <instancedMesh ref={etiq} args={[geoEtiq, matEtiq, N_ETIQ]} frustumCulled={false} renderOrder={3} />
      <instancedMesh ref={sacos} args={[geoSaco, undefined, 4]} frustumCulled={false}><meshBasicMaterial color="#c89b62" /></instancedMesh>
      <mesh ref={cartazRef}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={texCartaz} toneMapped={false} />
      </mesh>
      <points geometry={faiscasG} material={matFaisca} frustumCulled={false} renderOrder={2} />
    </group>
  )
}

