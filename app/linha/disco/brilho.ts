// (trilha de pedras, notas 03/11: "ao invés de uma tela com tudo que liberou")
// O QUE LIBEROU BRILHA NO LUGAR. A porta abriu: as missões novas (e o lugar da
// que acabou) brilham no mapa por uns segundos (o minimapa desenha um anel
// pulsando; o drone sobe o feixe delas), e o nome curto passa no notch.
// Uma loja fora do React: o minimapa e o drone já desenham sozinhos e só leem daqui.

export const BRILHO_CFG = { ms: 30000, cor: "#ffffff" }
export const BRILHO = { ids: new Set<string>(), ate: 0, cor: BRILHO_CFG.cor, v: 0 }

export function brilhar(ids: string[], cor = BRILHO_CFG.cor, ms = BRILHO_CFG.ms) {
  BRILHO.ids = new Set(ids)
  BRILHO.ate = Date.now() + ms
  BRILHO.cor = cor
  BRILHO.v++
}
export const brilhando = () => BRILHO.ids.size > 0 && Date.now() < BRILHO.ate
export const brilha = (id: string) => brilhando() && BRILHO.ids.has(id)
// a chave pra quem refaz por mudança (o drone): muda quando começa e quando acaba
export const chaveBrilho = () => (brilhando() ? `b${BRILHO.v}` : "")
