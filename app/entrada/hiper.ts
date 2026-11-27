// (22/11, o dono) a partida: "a Kombi acelera a ponto de chegar no hyperlapse e aí entra
// no jogo... ao invés de ir pra tela inicial pré-jogo, já vai direto".
// (27/11, o dono) "tem que ter um smooth de transição pra quando dá a partida até o time
// lapse, mais gradual e direto, sem trava": a curva começa a subir na hora da partida
// (sem a espera do arranque) e sobe sempre, sem degrau; as partículas que já passavam
// devagar só aceleram (KombiEntrada, Particulas).
// O tempo de cada coisa (s desde a partida): o hiperlapso cheio e a troca pro jogo (com
// ?entrar=1 o /linha pula a tela de entrada e cai no buraco de minhoca). Mora fora da
// cena 3D pra página usar sem carregar o three.
export const HIPER = { cheio: 3.2, troca: 3.7 }
/** 0 → 1: quanto do hiperlapso já chegou (sai andando na hora e acelera até o fim) */
export const curvaHiper = (s: number) => { const u = Math.max(0, Math.min(1, s / HIPER.cheio)); return 0.25 * u + 0.75 * u * u * u }
