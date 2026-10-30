// O GANCHO DAS CENAS (T61, provisório até o T70). O sistema de cenas de
// verdade (cutscenes com os personagens, vários pontos de vista de câmera,
// coesas como num filme) é o T70 e ainda não existe. Enquanto isso, quem quer
// uma cena PEDE aqui: o pedido vira um evento "cn:cena" na janela (o T70 vai
// escutar e tocar a cena certa) e fica anotado em window.__cenasPedidas (os
// testes conferem). Quem pediu faz, no mundo, a sua versão curta (o monumento
// nasce: Monumentos.tsx).

export type PedidoCena = {
  tipo: "monumento" // (por enquanto, só o nascimento de um monumento)
  linha: string // a faixa (o nome da pista)
  n: number // qual monumento é (1, 2, 3: só os três primeiros pedem cena)
  x: number; y: number; z: number // onde ele nasce (pra câmera do T70 olhar)
}

export function pedirCena(p: PedidoCena) {
  if (typeof window === "undefined") return
  const w = window as unknown as { __cenasPedidas?: PedidoCena[] }
  ;(w.__cenasPedidas ??= []).push(p)
  window.dispatchEvent(new CustomEvent<PedidoCena>("cn:cena", { detail: p }))
}
