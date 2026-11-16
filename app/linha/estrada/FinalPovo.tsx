"use client"

// O FINAL NO MUNDO (09/11, a revolta): o 3D e a câmera roteirizada da sequência (as
// regras e os tempos moram em disco/final.ts; a tela, em disco/FinalTela.tsx).
//
//   palco    em cima do palco do centro do deserto, olhando a plateia enorme; um anel pequeno marca o gesto
//   andar    a câmera volta pro jogo: a pessoa dirige livre. A plateia sai a pé (PovoAndando)
//            pros focos da revolução: em cada torre das pontas, três focos, um por rua que
//            chega nela, com o dono da música na frente do povo. Chegar em qualquer torre segue
//   nucleo   o abastecimento é desligado (os veios de água na torre secam) e o Núcleo frita de dentro pra fora
//   agua     segue a frente da água da Nectar até o deserto, descendo pelo subúrbio
//   chuva    na casa da D-Bee, a chuva cai de verdade no deserto
//   floresta sobe e abre em volta da casa: a floresta nasce (estrada/Floresta.tsx)
//
// A água: nove fitas (as nove idas, saindo do Núcleo) e o pedaço final, do fim da
// Nectar até a casa, num desenho só; o quanto já correu é 1 número (uFrente).
//
// Desempenho: fora do final não monta nada (FinalVivo). Sem luz nova. Por quadro: a
// câmera (6 números), a chuva e a frente. Multidões instanciadas (a Multidao de sempre,
// carregada só aqui), uma malha por torre e só com a câmera perto (<Perto>); o povo a pé
// é uma malha só e mexe 1/4 por quadro. O salto de câmera é aquecido (PERTO_EXTRA).

import { useFrame } from "@react-three/fiber"
import { lazy, useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { CentralDisco, MundoDisco } from "./mundoDisco"
import { PASSO } from "./pista"
import { PISTAS } from "./pistas"
import { Perto, PERTO_EXTRA, type PontoXZ } from "./Perto"
import { ModeloSeguro } from "./Seguro"
import { AREIA_VERDE } from "./areia"
import { FLORESTA_FRENTE } from "./Floresta"
import { CHUVA_MANIFESTO } from "./manifestos/ceu"
import { MEIA_PISTA, densidadeRua } from "./manifestos/comum"
import { texturaDeAgua } from "../trincheiras/RioDepois"
import { CASA, CHAO_LUGARES, ROT_CASA } from "../disco/historia"
import { CAM_ROTEIRO, FINAL_CFG, FINAL_VIVO, FOCOS, NOVE, lerFinal, marcarChegouNasTorres, ouvirFinal } from "../disco/final"
import type { Pessoa } from "../interior/comum"
import type { Andante } from "./FinalMultidao"

// a multidão vive no pacote das salas: só baixa quando o final precisa dela
const FinalMultidao = lazy(() => import("./FinalMultidao"))
const PovoAndando = lazy(() => import("./FinalMultidao").then((m) => ({ default: m.PovoAndando })))

const naCasa = (lx: number, lz: number) => ({
  x: CASA.x + Math.cos(ROT_CASA) * lx + Math.sin(ROT_CASA) * lz,
  z: CASA.z - Math.sin(ROT_CASA) * lx + Math.cos(ROT_CASA) * lz,
})
const suave = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k) }
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const NADA = { momento: null, feito: false }
const lerServidor = () => NADA

export function FinalPovo({ M }: { M: MundoDisco }) {
  const vivo = useSyncExternalStore(ouvirFinal, lerFinal, lerServidor)
  if (vivo.momento === null && !vivo.lotado) return null
  return <FinalVivo M={M} />
}

// ── a plateia, os focos, o povo do Núcleo e o caminho da água (uma vez por mundo, só quando o final abre) ──
function montarCena(M: MundoDisco) {
  const L = CHAO_LUGARES.palcoDeserto
  const rot = Math.atan2(-L.x, -L.z), fx = Math.sin(rot), fz = Math.cos(rot) // a frente do palco
  const chaoL = M.chaoEm(L.x, L.z)
  const de = FINAL_CFG
  let sem = 31
  const r = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647 }
  const cores = NOVE.map((n) => n.cor)
  const cor = () => cores[Math.floor(r() * cores.length)]
  const dens = densidadeRua()
  // a plateia: em meia-lua em frente ao palco, olhando pra ele
  const plateia: Pessoa[] = []
  const nP = Math.round(de.plateia * dens)
  for (let k = 0; k < nP; k++) {
    const a = (r() * 2 - 1) * de.plateiaAbre, d = de.plateiaDe + Math.sqrt(r()) * (de.plateiaAte - de.plateiaDe)
    const x = L.x + d * (fx * Math.cos(a) - fz * Math.sin(a)), z = L.z + d * (fz * Math.cos(a) + fx * Math.sin(a))
    plateia.push({ x, y: M.chaoEm(x, z), z, vira: Math.atan2(L.x - x, L.z - z), cor: cor() })
  }
  // os nove: entre os outros, iguais aos outros (só a cor deles, que já é a da multidão)
  NOVE.forEach((n, k) => { const i = Math.floor((plateia.length * (k + 0.5)) / NOVE.length); if (plateia[i]) plateia[i] = { ...plateia[i], cor: n.cor } })

  // os focos: em cada torre das pontas, um por rua que chega nela; o líder é o dono da
  // música da rua, na frente do povo. Uma lista por torre (uma Multidao por torre)
  const focos: { x: number; z: number }[] = []
  const porTorre: { p: PontoXZ; gente: Pessoa[] }[] = []
  M.torres.forEach((t, it) => {
    if (it === 0) return // a central é o Núcleo: o povo em volta dela vem no momento dele
    const gente: Pessoa[] = []
    const an = M.aneis.find((x) => x.torre === it)
    for (const a of t.andares) {
      const id = PISTAS.find((p) => p.faixa === a.nome)?.id
      const lider = NOVE.find((n) => n.musica === id)
      if (!lider) continue
      const dx = Math.cos(a.ang), dz = Math.sin(a.ang), dl = t.raio + FOCOS.folgaTorre
      const x0 = t.x + dx * dl, z0 = t.z + dz * dl
      focos.push({ x: x0, z: z0 })
      gente.push({ x: x0, y: M.chaoEm(x0, z0), z: z0, vira: Math.atan2(dx, dz), cor: lider.cor })
      const corPovo = () => (r() < FOCOS.corDoLider ? lider.cor : cor())
      // no chão: em leque atrás do líder, olhando pra ele
      const nC = Math.round(FOCOS.noChao * dens)
      for (let k = 0; k < nC; k++) {
        const ang = (r() * 2 - 1) * FOCOS.abre, d = FOCOS.primeiraFila + Math.sqrt(r()) * FOCOS.raio
        const x = x0 + d * (dx * Math.cos(ang) - dz * Math.sin(ang)), z = z0 + d * (dz * Math.cos(ang) + dx * Math.sin(ang))
        gente.push({ x, y: M.chaoEm(x, z), z, vira: Math.atan2(x0 - x, z0 - z), cor: corPovo() })
      }
      // na rotatória de cima, do lado da rua dele
      const nA = Math.round(FOCOS.noAnel * dens)
      for (let k = 0, tent = 0; an && k < nA && tent < nA * 8; tent++) {
        const V = M.vias[an.vias[Math.floor(r() * an.vias.length)]]
        const i = Math.floor(r() * V.n), lat = (r() * 2 - 1) * (MEIA_PISTA - 0.8)
        const x = V.px[i] - V.tz[i] * lat, z = V.pz[i] + V.tx[i] * lat
        if ((x - t.x) * dx + (z - t.z) * dz < t.raio * 0.5) continue
        gente.push({ x, y: V.py[i], z, vira: Math.atan2(t.x - x, t.z - z), cor: corPovo() })
        k++
      }
    }
    porTorre.push({ p: { x: t.x, z: t.z }, gente })
  })

  // o povo saindo do deserto: cada um da plateia vai a pé até um foco
  const andantes: Andante[] = plateia.map((p, i) => {
    const f = focos[i % focos.length]
    const a = r() * 6.283, d = 4 + r() * FOCOS.raio
    return { ...p, ax: p.x, az: p.z, bx: f.x + Math.sin(a) * d, bz: f.z + Math.cos(a) * d, vel: de.andarVel[0] + r() * (de.andarVel[1] - de.andarVel[0]) }
  })

  // o povo em volta do Núcleo, no momento dele
  const c = M.central
  const povoNucleo: Pessoa[] = []
  const nN = Math.round(de.povoNucleo * dens)
  for (let k = 0; k < nN; k++) {
    const a = r() * 6.283, d = c.raio + 8 + r() * 70
    const x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d
    povoNucleo.push({ x, y: M.chaoEm(x, z), z, vira: Math.atan2(c.x - x, c.z - z), cor: cor() })
  }

  // o caminho da água na Nectar: do Núcleo ao fim da rua; dali desce no subúrbio e
  // atravessa o deserto até a casa da D-Bee
  const pistaAgua = M.pistas.find((p) => p.nome === "Nectar")!
  const VA = M.vias[pistaAgua.ida]
  const xs: number[] = [], ys: number[] = [], zs: number[] = [], ss: number[] = []
  const por = (x: number, y: number, z: number) => {
    const n = xs.length
    ss.push(n ? ss[n - 1] + Math.hypot(x - xs[n - 1], y - ys[n - 1], z - zs[n - 1]) : 0)
    xs.push(x); ys.push(y); zs.push(z)
  }
  const passo = Math.max(1, Math.round(de.aguaPasso / PASSO))
  for (let i = 0; i < VA.n; i += passo) por(VA.px[i], VA.py[i] + 0.3, VA.pz[i])
  por(VA.px[VA.n - 1], VA.py[VA.n - 1] + 0.3, VA.pz[VA.n - 1])
  const nRua = xs.length
  const bar = CHAO_LUGARES.bar, ate = naCasa(0, 40)
  const nos = [
    { x: lerp(VA.px[VA.n - 1], bar.x, 0.3), z: lerp(VA.pz[VA.n - 1], bar.z, 0.3) },
    { x: bar.x, z: bar.z },
    ate,
  ]
  const trechos = nos.reduce<{ x: number; z: number }[][]>((out, no, k) => { out.push([k === 0 ? { x: xs[nRua - 1], z: zs[nRua - 1] } : nos[k - 1], no]); return out }, [])
  trechos.forEach(([a, b], k) => {
    const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(2, Math.round(L / 12))
    for (let i = 1; i <= n; i++) {
      const f = i / n, x = lerp(a.x, b.x, f), z = lerp(a.z, b.z, f), chao = M.chaoEm(x, z) + 0.3
      por(x, k === 0 ? lerp(ys[nRua - 1], chao, f) : chao, z)
    }
  })
  const caminho = { xs, ys, zs, ss, L: ss[ss.length - 1], n: xs.length }

  // onde aquecer a cidade: em volta do Núcleo, ao longo do caminho e a casa, onde a floresta nasce
  const aquecer: PontoXZ[] = [{ x: M.central.x, z: M.central.z }]
  for (let s = de.aguaDe; s < caminho.L; s += 450) {
    let k = 0
    while (k < caminho.n - 1 && ss[k] < s) k++
    aquecer.push({ x: xs[k], z: zs[k] })
  }
  aquecer.push({ x: CASA.x, z: CASA.z })

  // o palco, do ponto de vista de quem está em cima dele
  const palco = { x: L.x + fx * 9, z: L.z + fz * 9, y: chaoL + 6.4, fx, fz, olhaX: L.x + fx * 90, olhaZ: L.z + fz * 90, olhaY: chaoL + 2.5 }

  return { plateia, andantes, porTorre, povoNucleo, caminho, aquecer, palco, centroPalco: { x: L.x, z: L.z } }
}

function FinalVivo({ M }: { M: MundoDisco }) {
  const cena = useMemo(() => montarCena(M), [M])
  const vivo = useSyncExternalStore(ouvirFinal, lerFinal, lerServidor)
  const mo = vivo.momento
  const chaoCasa = useMemo(() => M.chaoEm(CASA.x, CASA.z), [M])
  const anel = useRef<THREE.Mesh>(null)
  const uFrente = useMemo(() => ({ value: 0 }), [])
  const iCam = useRef(0)
  // um ponto no caminho, em `s` metros (sem alocar; o índice anda junto da câmera)
  const noCaminho = (s: number, o: { x: number; y: number; z: number }) => {
    const c = cena.caminho
    let i = Math.min(iCam.current, c.n - 2)
    while (i > 0 && c.ss[i] > s) i--
    while (i < c.n - 2 && c.ss[i + 1] < s) i++
    iCam.current = i
    const f = Math.max(0, Math.min(1, (s - c.ss[i]) / Math.max(1e-3, c.ss[i + 1] - c.ss[i])))
    o.x = lerp(c.xs[i], c.xs[i + 1], f); o.y = lerp(c.ys[i], c.ys[i + 1], f); o.z = lerp(c.zs[i], c.zs[i + 1], f)
  }
  const aq = useMemo(() => ({ a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 0, z: 0 } }), [])
  const chuvaEscrita = useRef(false)

  const quadroAndar = useRef(0)
  useFrame((st, dt) => {
    const mo = FINAL_VIVO.momento
    CAM_ROTEIRO.ativo = mo !== null && mo !== "andar"
    if (mo === null) {
      // só a plateia em volta do palco: a câmera e a chuva são as do jogo
      if (chuvaEscrita.current) { CHUVA_MANIFESTO.k = 0; chuvaEscrita.current = false }
      PERTO_EXTRA.pontos.length = 0
      FLORESTA_FRENTE.uFrente.value = 1e9
      return
    }
    if (mo === "andar") {
      // a pessoa dirige: a câmera, a chuva e a música da rua são as do jogo. A floresta ainda não
      if (chuvaEscrita.current) { CHUVA_MANIFESTO.k = 0; chuvaEscrita.current = false }
      FLORESTA_FRENTE.uFrente.value = -1
      if (!FINAL_VIVO.feito) AREIA_VERDE.value = 0
      // de vez em quando: chegou numa torre? (em qualquer altura: vale de Kombi, voando, na pista)
      // e, perto, já aquece a cidade em volta do Núcleo pro corte não montar nada na hora
      if (++quadroAndar.current >= 15) {
        quadroAndar.current = 0
        const cam = st.camera.position, ex = PERTO_EXTRA.pontos
        let perto = false
        for (const t of M.torres) {
          const d = Math.hypot(cam.x - t.x, cam.z - t.z)
          if (d < t.raio + FINAL_CFG.chegadaTorre) marcarChegouNasTorres()
          if (d < FINAL_CFG.aquecerNucleo) perto = true
        }
        if (perto && ex.length !== 1) { ex.length = 0; ex.push(cena.aquecer[0]) }
        else if (!perto && ex.length) ex.length = 0
      }
      return
    }
    // as câmeras extras do <Perto>: entram aos poucos no Núcleo, inteiras na água, somem depois
    const ex = PERTO_EXTRA.pontos
    const aquecer = cena.aquecer
    const nEx = mo === "nucleo" ? Math.min(aquecer.length, 1 + Math.floor(((performance.now() / 1000 - FINAL_VIVO.t0) / (FINAL_CFG.nucleo * 0.85)) * aquecer.length)) : mo === "agua" ? aquecer.length : 0
    if (ex.length !== nEx) { ex.length = 0; for (let k = 0; k < nEx; k++) ex.push(aquecer[k]) }
    const t = performance.now() / 1000 - FINAL_VIVO.t0
    const C = CAM_ROTEIRO, p = cena.palco, s0 = FINAL_CFG.aguaDe, L = cena.caminho.L
    let chuvaAlvo = 0
    if (mo === "palco" || mo === "captura") {
      // de cima do palco (16/11: a captura também acontece aqui), olhando a plateia; balança de leve
      const b = Math.sin(t * 0.5) * 0.25
      C.px = p.x; C.py = p.y + b * 0.3; C.pz = p.z
      C.ox = p.olhaX + p.fz * b * 2; C.oy = p.olhaY; C.oz = p.olhaZ - p.fx * b * 2
      if (anel.current) { anel.current.scale.setScalar(1 + Math.sin(t * 3.2) * 0.12); anel.current.lookAt(C.px, C.py, C.pz) }
    } else if (mo === "nucleo") {
      // gira em volta da torre, com o povo embaixo; no fim sobe e volta pela rua com o Núcleo no fundo
      const c = M.central, dur = FINAL_CFG.nucleo
      const a = 0.4 + t * 0.09, R = lerp(250, 190, suave(t / (dur * 0.7))), alt = lerp(16, 42, suave((t - 2) / (dur * 0.7)))
      const k = suave((t - (dur - 7)) / 7)
      noCaminho(s0, aq.a)
      C.px = lerp(c.x + Math.sin(a) * R, aq.a.x, k); C.py = lerp(alt, aq.a.y + 30, k); C.pz = lerp(c.z + Math.cos(a) * R, aq.a.z, k)
      C.ox = c.x; C.oy = lerp(12, (c.topo || 160) * 0.55, k); C.oz = c.z
      // a água só sai do Núcleo depois que ele frita
      uFrente.value = s0 * suave((t - FINAL_CFG.aguaSai) / (dur - FINAL_CFG.aguaSai))
    } else if (mo === "agua") {
      // a frente da água corre; a câmera vem atrás, olhando pra onde ela vai
      const f = s0 + (L - s0) * suave(t / FINAL_CFG.agua)
      uFrente.value = f
      noCaminho(Math.max(0, f - FINAL_CFG.camAtras), aq.a)
      noCaminho(Math.min(L, f + 20), aq.b)
      C.px = aq.a.x; C.py = aq.a.y + lerp(30, 14, suave((f - s0) / (L - s0))); C.pz = aq.a.z
      C.ox = aq.b.x; C.oy = aq.b.y; C.oz = aq.b.z
    } else if (mo === "chuva") {
      // a água chegou na casa: a chuva cai de verdade; olha pro céu aos poucos
      uFrente.value = 1e9
      const k = suave(t / FINAL_CFG.chuva), de = naCasa(10, 74), ate = naCasa(-6, 52)
      C.px = lerp(de.x, ate.x, k); C.pz = lerp(de.z, ate.z, k); C.py = chaoCasa + 5
      C.ox = CASA.x; C.oy = chaoCasa + 4 + 26 * k; C.oz = CASA.z
      chuvaAlvo = FINAL_CFG.chuvaMax * suave(t / (FINAL_CFG.chuva * 0.5))
    } else if (mo === "floresta") {
      // sobe devagar em volta da casa: a frente verde abre pra longe
      uFrente.value = 1e9
      const k = suave(t / FINAL_CFG.floresta), a = ROT_CASA + 0.8 + t * 0.05, r = 70 + 270 * k
      C.px = CASA.x + Math.sin(a) * r; C.pz = CASA.z + Math.cos(a) * r; C.py = chaoCasa + 6 + 90 * k
      C.ox = CASA.x; C.oy = chaoCasa + 4; C.oz = CASA.z
      chuvaAlvo = FINAL_CFG.chuvaFloresta * (1 - suave((t - FINAL_CFG.floresta * 0.6) / (FINAL_CFG.floresta * 0.4)))
      const raio = Math.max(0, t) * FINAL_CFG.florestaVel
      FLORESTA_FRENTE.uFrente.value = raio
      AREIA_VERDE.value = raio
    }
    // a câmera nunca entra no chão do deserto
    C.py = Math.max(C.py, M.chaoEm(C.px, C.pz) + 1.2)
    // a chuva chega e vai embora devagar (a mesma do jogo: manifestos/ceu.ts)
    CHUVA_MANIFESTO.k += (chuvaAlvo - CHUVA_MANIFESTO.k) * Math.min(1, dt * 0.8)
    chuvaEscrita.current = true
    // as plantas ainda não nasceram enquanto a água não chegou
    if (mo !== "floresta") { FLORESTA_FRENTE.uFrente.value = -1; if (!FINAL_VIVO.feito) AREIA_VERDE.value = 0 }
  })
  // saiu do jogo no meio do final: a câmera e a chuva voltam a ser do jogo
  useEffect(() => () => {
    CAM_ROTEIRO.ativo = false
    PERTO_EXTRA.pontos.length = 0
    if (chuvaEscrita.current) CHUVA_MANIFESTO.k = 0
    FLORESTA_FRENTE.uFrente.value = 1e9
  }, [])

  const comPovoNucleo = mo === "nucleo"
  // a plateia fica até o gesto; depois quem aparece são os andantes (a mesma gente, saindo)
  const comPlateia = mo === "palco" || mo === "captura" || (mo === null && vivo.lotado)
  const comAndantes = mo === "andar"
  const comFocos = mo === "andar" || mo === "nucleo"
  const comNucleo = mo === "nucleo" || mo === "agua" || mo === "chuva" || mo === "floresta"
  const comAgua = comNucleo
  const pontos = useMemo(() => [cena.centroPalco], [cena])
  return (
    <>
      {comPlateia && (
        <Perto nome="final-plateia" raio={420} pontos={pontos}>
          <ModeloSeguro nome="final-multidao" enquanto={null}>
            <FinalMultidao gente={cena.plateia} fatia={2} />
          </ModeloSeguro>
        </Perto>
      )}
      {comAndantes && (
        <ModeloSeguro nome="final-andantes" enquanto={null}>
          <PovoAndando povo={cena.andantes} chao={M.chaoEm} />
        </ModeloSeguro>
      )}
      {comFocos && cena.porTorre.map((t, k) => (
        <Perto key={k} nome={`final-foco-${k}`} raio={FOCOS.raioMonta} pontos={[t.p]}>
          <ModeloSeguro nome={`final-foco-${k}-corpos`} enquanto={null}>
            <FinalMultidao gente={t.gente} fatia={3} />
          </ModeloSeguro>
        </Perto>
      ))}
      {comPovoNucleo && (
        <ModeloSeguro nome="final-povo-nucleo" enquanto={null}>
          <FinalMultidao gente={cena.povoNucleo} fatia={3} />
        </ModeloSeguro>
      )}
      {comNucleo && <NucleoFrito c={M.central} />}
      {mo === "palco" && (
        <mesh ref={anel} position={[cena.palco.x + cena.palco.fx * 3.2, cena.palco.y - 1.1, cena.palco.z + cena.palco.fz * 3.2]}>
          <ringGeometry args={[0.32, 0.36, 40]} />
          <meshBasicMaterial color="#e0ff4f" transparent opacity={0.8} toneMapped={false} depthTest={false} />
        </mesh>
      )}
      {comAgua && <Agua M={M} caminho={cena.caminho} uFrente={uFrente} />}
    </>
  )
}

// ── o Núcleo fritando (09/11, o dono): uma casca em volta da torre, um desenho só. No
// começo os veios de água sobem (o abastecimento); cortou, secam de baixo pra cima; a
// fritura rompe por dentro das rachaduras e no fim sobra a torre queimada com brasas. Depois
// do momento dele fica queimada até acabar o final (o mundo depois volta como era) ──
const CHAO_NUCLEO = -12
function NucleoFrito({ c }: { c: CentralDisco }) {
  const r = useMemo(() => {
    const topo = c.topo + 22, alto = topo - CHAO_NUCLEO
    const geo = new THREE.CylinderGeometry(c.nucleo + 0.5, c.nucleo * 1.08 + 0.5, alto, 48, 1, true)
    const uni = { uFrito: { value: 0 }, uCorte: { value: 0 }, uT: { value: 0 } }
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform float uFrito, uCorte, uT; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
void main(){
  float veio = smoothstep(0.1, 0.02, abs(fract(vUv.x * 18.0) - 0.5));
  float fluxo = 0.55 + 0.45 * sin(vUv.y * 40.0 - uT * 9.0);
  float cheio = uCorte >= 1.0 ? 0.0 : smoothstep(uCorte - 0.04, uCorte + 0.04, vUv.y);
  float agua = veio * fluxo * cheio * (1.0 - uFrito);
  float racha = n(vUv * vec2(60.0, 26.0) + vec2(0.0, -uT * 0.35));
  float limiar = mix(0.95, 0.15, uFrito);
  float calor = smoothstep(limiar, limiar + 0.09, racha) * smoothstep(0.0, 0.2, uFrito);
  float fuligem = smoothstep(0.78, 1.0, uFrito);
  float brasa = fuligem * smoothstep(0.8, 0.95, n(vUv * 110.0 + uT * 0.6));
  vec3 fogo = mix(vec3(0.7, 0.08, 0.02), vec3(1.0, 0.72, 0.28), calor) * (1.0 + uFrito * 0.8);
  vec3 cor = vec3(0.25, 0.85, 1.0) * agua + fogo * calor * (1.0 - fuligem * 0.7) + vec3(1.0, 0.35, 0.08) * brasa;
  cor = mix(cor, vec3(0.03, 0.025, 0.02) + vec3(1.0, 0.35, 0.08) * brasa, fuligem * (1.0 - brasa));
  float a = clamp(max(max(agua, calor * (1.0 - fuligem * 0.5)), fuligem * 0.9), 0.0, 1.0);
  if (a < 0.02) discard;
  gl_FragColor = vec4(cor, a);
}`,
    })
    // as fagulhas: 200 pontos, sobem por shader (nenhuma conta por quadro aqui)
    const n = 200, pos = new Float32Array(n * 3), sem = new Float32Array(n)
    for (let i = 0; i < n; i++) { const a = (i * 2.399) % 6.283; pos[i * 3] = Math.sin(a) * (c.nucleo + 2); pos[i * 3 + 1] = 0; pos[i * 3 + 2] = Math.cos(a) * (c.nucleo + 2); sem[i] = (i * 0.61803) % 1 }
    const faiscaGeo = new THREE.BufferGeometry()
    faiscaGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    faiscaGeo.setAttribute("aSem", new THREE.BufferAttribute(sem, 1))
    const faiscaUni = { uT: uni.uT, uAlto: { value: alto } }
    const faiscaMat = new THREE.ShaderMaterial({
      uniforms: faiscaUni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `attribute float aSem; uniform float uT, uAlto; varying float vF; void main(){ float f = fract(aSem + uT * 0.12); vF = 1.0 - f; vec3 p = position; p.y = f * uAlto * 1.35; p.x += sin(uT * 2.0 + aSem * 40.0) * (1.0 + f * 4.0); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_PointSize = 900.0 / max(8.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: "varying float vF; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(1.0, 0.55, 0.18, (0.5 - d) * vF * 1.6); }",
    })
    return { geo, mat, uni, faiscaGeo, faiscaMat, y: CHAO_NUCLEO + alto / 2 }
  }, [c])
  useEffect(() => () => { r.geo.dispose(); r.mat.dispose(); r.faiscaGeo.dispose(); r.faiscaMat.dispose() }, [r])
  const pontos = useRef<THREE.Points>(null)
  useFrame((_, dt) => {
    const cfg = FINAL_CFG, t = performance.now() / 1000 - FINAL_VIVO.t0, noMomento = FINAL_VIVO.momento === "nucleo"
    const frito = noMomento ? suave((t - cfg.fritaDe) / (cfg.fritaAte - cfg.fritaDe)) : 1
    r.uni.uFrito.value = frito
    r.uni.uCorte.value = noMomento ? suave((t - cfg.corte) / cfg.corteDura) : 1
    r.uni.uT.value += Math.min(dt, 0.1)
    if (pontos.current) pontos.current.visible = frito > 0.08 && frito < 0.999
  })
  return (
    <>
      <mesh geometry={r.geo} material={r.mat} position={[c.x, r.y, c.z]} frustumCulled={false} renderOrder={2} />
      <points ref={pontos} geometry={r.faiscaGeo} material={r.faiscaMat} position={[c.x, CHAO_NUCLEO, c.z]} frustumCulled={false} renderOrder={3} />
    </>
  )
}

// ── a água: as fitas nas nove pistas (saindo do Núcleo) e o caminho até a casa ──
function Agua({ M, caminho, uFrente }: { M: MundoDisco; caminho: { xs: number[]; ys: number[]; zs: number[]; ss: number[]; n: number }; uFrente: { value: number } }) {
  const r = useMemo(() => {
    const partes: THREE.BufferGeometry[] = []
    const W = FINAL_CFG.aguaMeia, onda = FINAL_CFG.aguaOnda
    const fita = (n: number, pt: (j: number) => { x: number; y: number; z: number; lx: number; lz: number; ly: number; s: number }) => {
      const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), s = new Float32Array(n * 2), idx: number[] = []
      for (let j = 0; j < n; j++) {
        const q = pt(j)
        pos.set([q.x + q.lx * W, q.y + q.ly * W, q.z + q.lz * W, q.x - q.lx * W, q.y - q.ly * W, q.z - q.lz * W], j * 6)
        uv.set([0, q.s / onda, 1, q.s / onda], j * 4)
        s[j * 2] = q.s; s[j * 2 + 1] = q.s
        if (j > 0) { const b = (j - 1) * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3) }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
      g.setAttribute("aS", new THREE.BufferAttribute(s, 1))
      g.setIndex(idx)
      partes.push(g)
    }
    // cada pista, a partir da ponta mais perto do Núcleo
    const passo = Math.max(1, Math.round(FINAL_CFG.aguaPasso / PASSO))
    for (const p of M.pistas) {
      const V = M.vias[p.ida]
      const ini = Math.hypot(V.px[0] - M.central.x, V.pz[0] - M.central.z), fim = Math.hypot(V.px[V.n - 1] - M.central.x, V.pz[V.n - 1] - M.central.z)
      const inv = fim < ini
      const n = Math.floor((V.n - 1) / passo) + 1
      fita(n, (j) => {
        const i = inv ? V.n - 1 - j * passo : j * passo
        const c = Math.cos(V.bank[i]), b = Math.sin(V.bank[i])
        return { x: V.px[i], y: V.py[i] + 0.3, z: V.pz[i], lx: -V.tz[i] * c, ly: -b, lz: V.tx[i] * c, s: j * passo * PASSO }
      })
    }
    // do fim da Nectar até a casa (o último trecho do caminho da câmera, a partir do fim da rua)
    const c = caminho, nectar = M.vias[M.pistas.find((p) => p.nome === "Nectar")!.ida]
    let k0 = 0
    while (k0 < c.n - 1 && c.ss[k0] < (nectar.n - 1) * PASSO) k0++
    fita(c.n - k0, (j) => {
      const k = k0 + j, a = Math.max(k0, k - 1), b = Math.min(c.n - 1, k + 1)
      const dx = c.xs[b] - c.xs[a], dz = c.zs[b] - c.zs[a], l = Math.hypot(dx, dz) || 1
      return { x: c.xs[k], y: c.ys[k], z: c.zs[k], lx: -dz / l, ly: 0, lz: dx / l, s: c.ss[k] }
    })
    const geo = mergeGeometries(partes, false)!
    for (const g of partes) g.dispose()
    const tex = texturaDeAgua()
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: "#8fe6ff", transparent: true, opacity: 0.68, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uFrente = uFrente
      sh.vertexShader = "attribute float aS;\nvarying float vS;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  vS = aS;")
      sh.fragmentShader = "uniform float uFrente;\nvarying float vS;\n" + sh.fragmentShader.replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\n  if (vS > uFrente) discard;")
    }
    mat.customProgramCacheKey = () => "agua-do-final"
    return { geo, mat, tex }
  }, [M, caminho, uFrente])
  useEffect(() => () => { r.geo.dispose(); r.mat.dispose(); r.tex.dispose() }, [r])
  useFrame((_, dt) => { r.tex.offset.y = (r.tex.offset.y - Math.min(dt, 0.1) * (FINAL_CFG.aguaVel / FINAL_CFG.aguaOnda)) % 1 })
  return <mesh geometry={r.geo} material={r.mat} matrixAutoUpdate={false} frustumCulled={false} renderOrder={1} />
}
