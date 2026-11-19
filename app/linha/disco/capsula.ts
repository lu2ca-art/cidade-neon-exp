// O GUITAR DRIVER NO FIM: A CÁPSULA DO TEMPO (LU2CA 20/10). "Só vira um jogo
// aberto no final. Antes disso fica bloqueado: as missões da carreira fazem
// parte da missão principal." "No final, o Guitar Driver entra como uma
// cápsula do tempo: o jogo é o mesmo, e as cutscenes são do tempo em que ele
// tocou (da popularidade baixa até ficar bem conhecido, com muita gente no
// show)."
// GANCHO (placeholder): quando as 9 linhas estão feitas, o destaque do holo
// destranca o GUITAR DRIVER e abre o app. Os shows que ele fez
// (as manchetes do jornal, save.disco.shows) vão pro localStorage
// "cn-capsula" pro Guitar Driver montar as cutscenes (ainda não monta).

import type { Save } from "../estado"
import { PISTAS } from "../estrada/pistas"

export const guitarLivre = (s: Save) => PISTAS.every((p) => s.objetos.includes(p.id as never))

export function guardarCapsula(s: Save) {
  try { localStorage.setItem("cn-capsula", JSON.stringify((s.disco?.shows ?? []).map((m) => ({ titulo: m.titulo, publico: m.publico, nota: m.nota, modo: m.modo, missao: m.missao })))) } catch {}
}
