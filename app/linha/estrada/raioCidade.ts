// (ruas-faixa, 05/11) ATÉ ONDE VAI A CIDADE. As ruas cresceram pra cada volta
// durar a faixa (mundoDisco.ts, ESCALA_GRUPO/ALONGA; docs/ruas-faixa.md): a
// cidade, que cabia num raio de ~1,13 km, agora vai até ~2 km para uns lados e
// ficou igual para outros (o lado da casa da D-Bee e do subúrbio, a torre 1).
//
// Quem media "longe do centro" com um raio fixo (o deserto começa a 1,25 km,
// os robôs a 1,3 km, as dunas inteiras a 1,5 km, os morros a 2 km...) agora
// mede com `alemDaCidade`: a distância ao centro menos o quanto a cidade
// cresceu NAQUELE rumo. Onde ela não cresceu dá o mesmo número de antes; onde
// cresceu, os raios de antes valem a partir da borda nova.
//
// SETORES: o raio da pista mais longe do centro em cada setor de 10° (a partir
// de −π, no sentido de atan2(z, x)). Sai de `bun scripts/medir-ruas.ts`
// (a linha "SETORES"): mudou ESCALA_GRUPO/ALONGA, cola de novo aqui.
// (Fica num módulo à parte, com os números prontos: o chão e os robôs usam
// sem montar o mundo, e sem import circular com mundoDisco/chao.)

export const SETORES = [922, 936, 908, 843, 907, 1006, 1165, 1431, 1729, 1919, 1947, 1841, 1794, 1796, 1769, 1608, 1494, 1693, 1713, 1960, 2024, 1565, 1619, 1655, 1655, 1585, 1371, 1211, 1628, 1763, 1733, 1586, 1604, 1484, 1243, 1032]
// o raio da cidade antes de crescer (o setor mais longe): os números fixos espalhados pelo jogo foram medidos nele
export const R_CIDADE_ANTES = 1133

const N = SETORES.length
// cada setor olha os vizinhos (a pista que passa na beira do setor do lado conta)
const CRESCEU = SETORES.map((_, i) => Math.max(0, Math.max(SETORES[(i + N - 1) % N], SETORES[i], SETORES[(i + 1) % N]) - R_CIDADE_ANTES))

/** quanto a cidade cresceu (m) no rumo de (x, z), contado do centro */
export function cresceuNoRumo(x: number, z: number) {
  const s = ((Math.atan2(z, x) + Math.PI) / (2 * Math.PI)) * N - 0.5
  const i = Math.floor(s), f = s - i
  const a = CRESCEU[((i % N) + N) % N], b = CRESCEU[(((i + 1) % N) + N) % N]
  return a + (b - a) * f
}

/** a distância ao centro, descontado o quanto a cidade cresceu nesse rumo (o "raio" de antes) */
export function alemDaCidade(x: number, z: number) {
  return Math.hypot(x, z) - cresceuNoRumo(x, z)
}

/** os pontos da borda que cresceu (pra <Perto fora>: longe de todos = fora da cidade de verdade) */
export function centrosDaCidade(): { x: number; z: number }[] {
  const out = [{ x: 0, z: 0 }]
  CRESCEU.forEach((c, i) => {
    if (c <= 0) return
    const a = -Math.PI + ((i + 0.5) / N) * 2 * Math.PI
    out.push({ x: Math.cos(a) * c, z: Math.sin(a) * c })
  })
  return out
}
