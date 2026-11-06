// T47 · O ELEVADOR DE TERROR (06/11, RASCUNHO; docs/t47-terror.md). Primeira
// versão pela recomendação, antes do vídeo de referência da Torre do Terror.
// Só no elevador 2 (DopaminA, Rollercoaster, Swav) e só na SUBIDA: em vez da
// cabine de 1,2 s, um percurso curto dentro do poço, em primeira pessoa
// (trincheiras/PocoTerror.tsx). A 1ª vez é obrigatória; depois aparece
// "subir rápido" ao lado. Tocar pula.
// Aqui: só os números (o designer mexe sem tocar na cena) e a linha do tempo
// (pura, sem three.js), mais o "já viu" no save que vale na aba.

import { chaveSave } from "../chaveSave"
import { ELEVADOR_TERROR } from "./elevadores"

export const TERROR = {
  elevador: ELEVADOR_TERROR ?? 2,
  andar: 4.2, // m, o pé-direito de um andar
  vao: 2.9, // m, a altura da abertura de cada andar (o resto é laje)
  andaresLentos: 5, // os andares que passam na subida devagar
  porFileira: 5, // camas / cápsulas / máquinas por fileira (2 fileiras por andar)
  fases: { portas: 2.2, sobe: 15, tranco: 0.45, cai: 0.75, escuro: 2.6, dispara: 3.4, chega: 0.9 },
  queda: 2.4, // m que a cabine cai no susto
  disparada: 64, // m que ela sobe na disparada
  respira: 0.18, // Hz, a luz das máquinas "dormindo"
  nevoa: { cor: "#06040b", perto: 2.5, longe: 24 },
  drone: { hz: 41.2, vol: 0.16 }, // o grave (Web Audio sintetizado)
} as const

export type FaseTerror = keyof typeof TERROR.fases
const ORDEM = Object.keys(TERROR.fases) as FaseTerror[]
export const DURACAO_TERROR = ORDEM.reduce((s, f) => s + TERROR.fases[f], 0) // ~25 s
export const ALTURA_LENTA = TERROR.andaresLentos * TERROR.andar
export const ALTURA_TOTAL = ALTURA_LENTA - TERROR.queda + TERROR.disparada

export interface Quadro {
  fase: FaseTerror; u: number // 0–1 dentro da fase
  y: number // a altura do piso da cabine (m)
  luz: number // a lâmpada da cabine 0–1
  emergencia: number // a luz vermelha da disparada 0–1
  andares: number // o brilho dos andares 0–1 (apagam no tranco, voltam fracos)
  tremor: number // amplitude do tremor da câmera (m)
  veu: number // o preto por cima (0 = nada; entra e sai)
  portas: number // a grade da frente: 0 aberta, 1 fechada
}

const liso = (u: number) => u * u * (3 - 2 * u)
/** a linha do tempo inteira: t em segundos desde o começo */
export function quadroTerror(t: number): Quadro {
  let r = Math.max(0, t), fase: FaseTerror = "chega", u = 1
  for (const f of ORDEM) { const d = TERROR.fases[f]; if (r < d) { fase = f; u = r / d; break } r -= d }
  const H = ALTURA_LENTA, Q = TERROR.queda
  const q: Quadro = { fase, u, y: 0, luz: 1, emergencia: 0, andares: 1, tremor: 0, veu: 0, portas: 1 }
  switch (fase) {
    case "portas": q.portas = liso(Math.min(1, u * 1.4)); q.veu = Math.max(0, 1 - u * 3); break
    case "sobe": {
      // começa macio e segue devagar; perto do fim a lâmpada pisca
      const k = u < 0.1 ? (u * u * 5) / 0.95 : (u - 0.05) / 0.95
      q.y = H * k; q.tremor = 0.006
      if (u > 0.88) q.luz = Math.sin(t * 47) > -0.2 ? 1 : 0.25
      break
    }
    case "tranco": q.y = H; q.tremor = 0.09 * (1 - u); q.luz = Math.sin(t * 61) > 0.4 ? 0.6 : 0; q.andares = 1 - u; break
    case "cai": q.y = H - Q * u * u; q.luz = 0; q.andares = 0; q.tremor = 0.03 + 0.1 * (u > 0.92 ? 1 : 0); break
    case "escuro": q.y = H - Q; q.luz = 0; q.andares = 0.35 * liso(u); q.tremor = u < 0.12 ? 0.05 : 0; break
    case "dispara": q.y = H - Q + TERROR.disparada * Math.pow(u, 2.1); q.luz = 0; q.emergencia = 1; q.andares = 0.5; q.tremor = 0.02 + 0.03 * u; break
    case "chega": q.y = ALTURA_TOTAL + 6 * u; q.luz = 0; q.emergencia = 1 - u; q.andares = 0.5; q.veu = liso(u); break
  }
  return q
}

// o "já viu": a 1ª subida pelo elevador 2 é obrigatória; depois, "subir rápido"
const chave = () => `${chaveSave()}-terror`
export function terrorVisto(): boolean { try { return localStorage.getItem(chave()) === "1" } catch { return false } }
export function marcarTerrorVisto() { try { localStorage.setItem(chave(), "1") } catch {} }
export function esquecerTerror() { try { localStorage.removeItem(chave()) } catch {} }
