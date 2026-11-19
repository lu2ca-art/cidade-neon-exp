// (notas 04/11, o dono: "o save desse link tá me levando pra primeira missão de
// novo") O SAVE DE TESTE MORA SEPARADO DO SAVE DE VERDADE.
//
// Antes: um link ?parte=… (ou um atalho do /teste) trocava o save de verdade
// ("cn-linha-222") pelo save pronto do teste, e o de verdade só voltava pelo
// botão do /teste. Abrir o jogo depois caía no save do teste.
//
// Agora: o teste grava em "cn-linha-222-teste". Quem diz qual vale é a aba: o
// /linha aberto com ?parte= ou ?teste=1 liga o modo teste (sessionStorage, só
// esta aba); o /linha aberto sem nada desliga e volta pro save de verdade. As
// voltas de dentro do jogo (?volta=, ?de=) mantêm o modo em que a aba estava.
// Os outros apps que leem o save (o Guitar Driver, a casa de shows, o caderno…)
// perguntam a chave daqui.

export const CHAVE_SAVE_REAL = "cn-linha-222"
export const CHAVE_SAVE_TESTE = "cn-linha-222-teste"
// (o jeito antigo) o save de verdade guardado enquanto o teste ocupava o lugar dele
export const CHAVE_SAVE_ANTES = "cn-linha-222-antes-do-teste"
const MARCA = "cn-modo-teste"

export function emTeste(): boolean {
  try { return typeof sessionStorage !== "undefined" && sessionStorage.getItem(MARCA) === "1" } catch { return false }
}

// a chave do save que vale agora (nesta aba)
export function chaveSave(): string {
  return emTeste() ? CHAVE_SAVE_TESTE : CHAVE_SAVE_REAL
}

export function ligarTeste() {
  try { sessionStorage.setItem(MARCA, "1") } catch {}
}

export function desligarTeste() {
  try { sessionStorage.removeItem(MARCA) } catch {}
}

// o /linha acabou de abrir: decide o modo pela URL (antes de ler o save)
export function decidirModoSave() {
  if (typeof window === "undefined") return
  const q = new URLSearchParams(location.search)
  if (q.has("parte") || q.get("teste") === "1") ligarTeste()
  else if (!q.has("volta") && !q.has("de") && !q.has("atalho")) desligarTeste()
  if (!emTeste()) desfazerJeitoAntigo()
}

// (uma vez) quem testou com o jeito antigo: o save de verdade estava guardado
// em CHAVE_SAVE_ANTES e o do teste no lugar dele. Volta cada um pro seu lugar
function desfazerJeitoAntigo() {
  try {
    const antes = localStorage.getItem(CHAVE_SAVE_ANTES)
    if (antes === null) return
    const agora = localStorage.getItem(CHAVE_SAVE_REAL)
    if (agora !== null) localStorage.setItem(CHAVE_SAVE_TESTE, agora)
    if (antes) localStorage.setItem(CHAVE_SAVE_REAL, antes)
    else localStorage.removeItem(CHAVE_SAVE_REAL)
    localStorage.removeItem(CHAVE_SAVE_ANTES)
  } catch {}
}
