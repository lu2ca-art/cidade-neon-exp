// O CLIMA (LU2CA 14/10: o vidro embaça "quando começa a chover"). A chuva
// deixa de ser constante: vem em pancadas, sorteadas por dia e por trecho de
// 2 horas, mais de noite que de dia. Sempre a mesma pro mesmo dia (dá pra
// voltar e ela estar lá). O deserto nunca chove.

const BLOCO = 2 // horas

function sorteio(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

// está chovendo nesta hora deste dia?
export function chovendo(dia: number, h: number) {
  const bloco = Math.floor(h / BLOCO)
  const noite = h >= 18 || h < 6
  return sorteio(dia * 31 + bloco * 7 + 3) < (noite ? 0.62 : 0.28)
}
