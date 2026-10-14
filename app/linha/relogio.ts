// O RELÓGIO DA CIDADE (13/10, LU2CA): dias simulados. O dia inteiro dura 20
// minutos reais (1 hora do jogo = 50 s, enquanto você dirige; era 15 min, o
// LU2CA pediu um pouco mais devagar em 14/10). A história
// só acontece de noite; de dia a cidade tem as coisas do dia.
//
//   manhã 8–12 · tarde 12–18 · entardecer 18–19 · noite 19–4 · ócio 4–8
//
// Das 4h às 8h é o ócio: os lugares fecham, só dá pra ouvir música (e ler,
// quando a biblioteca existir). Dormir na Kombi pula pras 8h do dia seguinte;
// cochilar (de dia) pula pras 19h do mesmo dia.

export const SEG_POR_HORA = 50 // 24 h em 20 min

export type Turno = "manha" | "tarde" | "entardecer" | "noite" | "ocio"
export const NOME_TURNO: Record<Turno, string> = { manha: "manhã", tarde: "tarde", entardecer: "entardecer", noite: "noite", ocio: "madrugada" }

export function turnoDe(h: number): Turno {
  if (h >= 4 && h < 8) return "ocio"
  if (h >= 8 && h < 12) return "manha"
  if (h >= 12 && h < 18) return "tarde"
  if (h >= 18 && h < 19) return "entardecer"
  return "noite"
}

// a história (as missões) chama a partir do entardecer e vai até as 4h
export const horaDaHistoria = (h: number) => h >= 18 || h < 4
export const ehNoite = (h: number) => h >= 19 || h < 4
export const ehDia = (h: number) => h >= 8 && h < 18

// o horário de cada lugar
export type Horario = "noite" | "dia" | "sempre"
export function abertoAgora(horario: Horario, h: number) {
  if (horario === "sempre") return true
  if (horario === "dia") return ehDia(h)
  return h >= 18 || h < 4 // os lugares da noite abrem com o entardecer
}
export const abreAs = (horario: Horario) => (horario === "dia" ? "8h" : "19h")

export function horaTexto(h: number) {
  const hh = Math.floor(h) % 24
  const mm = Math.floor((h - Math.floor(h)) * 60 / 10) * 10
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

// passou das 8h (o começo do dia)? (de/para em horas do jogo, 0–24)
export function virouODia(de: number, para: number) {
  return (de < 8 && para >= 8) || (de > para && para >= 8) // inclui a volta da meia-noite direto pra depois das 8
}
