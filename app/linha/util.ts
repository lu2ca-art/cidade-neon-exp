import type { Estacao } from "./data"

const URL_LINHA = "https://lu2ca.art/linha"

// lembrete no calendário pro dia em que a estação acende (meio-dia de Brasília)
export function icsHref(e: Estacao) {
  if (!e.lancamento) return "#"
  const d = new Date(e.lancamento)
  d.setUTCHours(15, 0, 0, 0)
  const fim = new Date(d.getTime() + 30 * 60000)
  const f = (x: Date) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LU2CA//Linha 222//PT",
    "BEGIN:VEVENT",
    `UID:linha-222-${e.id}@lu2ca.art`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(d)}`,
    `DTEND:${f(fim)}`,
    `SUMMARY:estação ${e.n} acende · ${e.faixa}`,
    `DESCRIPTION:${e.personagem} tá te esperando. ${URL_LINHA}`,
    `URL:${URL_LINHA}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`
}

export async function compartilhar(texto: string) {
  const dados = { title: "cidade neon · linha 222", text: texto, url: URL_LINHA }
  try {
    if (navigator.share) {
      await navigator.share(dados)
      return
    }
  } catch {
    return
  }
  try {
    await navigator.clipboard.writeText(`${texto} ${URL_LINHA}`)
    alert("copiado — cola onde quiser")
  } catch {}
}
