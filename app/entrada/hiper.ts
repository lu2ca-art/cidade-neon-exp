// (22/11, o dono) a partida: "a Kombi acelera a ponto de chegar no hyperlapse e aí entra
// no jogo... ao invés de ir pra tela inicial pré-jogo, já vai direto".
// O tempo de cada coisa (s desde a partida): o arranque, a aceleração até o hiperlapso
// cheio, e a troca pro jogo (com ?entrar=1 o /linha pula a tela de entrada e cai no
// buraco de minhoca). Mora fora da cena 3D pra página usar sem carregar o three.
export const HIPER = { arranque: 0.8, cheio: 3.0, troca: 3.5 }
/** 0 → 1: quanto do hiperlapso já chegou (acelera no fim) */
export const curvaHiper = (s: number) => { const u = Math.max(0, Math.min(1, (s - HIPER.arranque) / (HIPER.cheio - HIPER.arranque))); return u * u * u }
