// O HYPERLAPSE (LU2CA 20/10: "a regra da fuga é velocidade"): a intensidade
// dele, compartilhada entre a física (Corrida), a câmera, a lente (Cinema) e a
// camada das linhas de velocidade. k = 0 parado na velocidade da pista; sobe a
// cada múltiplo (fraco em 1,2×, mais em 2×, bem visível em 3×, muito em 4×);
// no hyperlapse (o salto pro 10×) passa de 1 e continua subindo
export const VELO = { k: 0 }

// a curva: múltiplo da velocidade da pista → intensidade
export function intensidade(mult: number, hyper: boolean, hyperT: number) {
  if (hyper) return 1 + hyperT * 0.15
  const p: [number, number][] = [[1.2, 0], [1.2, 0.06], [2, 0.22], [3, 0.45], [4, 0.8]]
  if (mult < 1.2) return 0
  for (let i = 1; i < p.length; i++) if (mult <= p[i][0]) { const [a, ka] = p[i - 1], [b, kb] = p[i]; return ka + ((mult - a) / Math.max(1e-6, b - a)) * (kb - ka) }
  return 0.8
}
