// O GANCHO DAS CENAS (T61, provisório até o T70). O sistema de cenas de
// verdade (cutscenes com os personagens, vários pontos de vista de câmera,
// coesas como num filme) é o T70 e ainda não existe. Enquanto isso, quem quer
// uma cena PEDE aqui: o pedido vira um evento "cn:cena" na janela (o T70 vai
// escutar e tocar a cena certa) e fica anotado em window.__cenasPedidas (os
// testes conferem). Quem pediu faz, no mundo, a sua versão curta (o monumento
// nasce: Monumentos.tsx).
//
// (T22b) Os FILMINHOS: uma cena que vai ser vídeo (feito com IA no T70). Hoje
// toca o provisório (as falas em legenda, no tempo de cada uma, sobre a cena
// parada, com a câmera chegando devagar no assunto); quando o vídeo existir,
// basta pôr o caminho dele em `video` (o arquivo mora em public/cenas/) e o
// mesmo gancho passa a tocar o vídeo. Quem toca é app/linha/CenaFilme.tsx.

// os filminhos que existem (o roteiro de cada um mora com a missão dele)
export type FilmeId = "ella-planta"

export type PedidoCena =
  | {
    tipo: "monumento" // o nascimento de um monumento
    linha: string // a faixa (o nome da pista)
    n: number // qual monumento é (1, 2, 3: só os três primeiros pedem cena)
    x: number; y: number; z: number // onde ele nasce (pra câmera do T70 olhar)
  }
  | { tipo: "filme"; id: FilmeId; video: boolean } // video: tocou o arquivo (false: o provisório)

// um filminho: o roteiro (as falas, com quanto tempo cada uma fica) e, quando
// existir, o vídeo. `seg` é o tempo da fala no provisório (e a marca de tempo
// pra legendar o vídeo depois)
export interface Filme {
  id: FilmeId
  // ── ONDE ENTRA O VÍDEO (T70): o caminho do arquivo, ex. "/cenas/ella-planta.mp4"
  // (public/cenas/ella-planta.mp4). null = toca o provisório
  video: string | null
  // a imagem parada enquanto o vídeo carrega (opcional)
  poster?: string
  // segundos de imagem antes da primeira fala e depois da última
  abertura: number
  fecho: number
  falas: { de?: string; texto: string; seg: number; tipo?: "fala" | "acao" }[]
}

export function pedirCena(p: PedidoCena) {
  if (typeof window === "undefined") return
  const w = window as unknown as { __cenasPedidas?: PedidoCena[] }
  ;(w.__cenasPedidas ??= []).push(p)
  window.dispatchEvent(new CustomEvent<PedidoCena>("cn:cena", { detail: p }))
}
