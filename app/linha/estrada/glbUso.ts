// Quem usa um .glb "temporário" (o terror.glb: o poço do elevador 2 e a sala do
// elevador antigo) segura ele com segurarGlb() e solta no unmount. O cache do
// useGLTF só é limpo quando ninguém mais segura, e só depois de um respiro:
// na troca de uma tela pela outra o cleanup de quem sai roda antes do efeito de
// quem entra, e limpar nesse meio tempo faria quem entrou suspender de novo
// (a reserva piscando no meio do passeio e o glb baixando outra vez).

import { useGLTF } from "@react-three/drei"

const usos = new Map<string, number>()
const RESPIRO_MS = 2500

/** segura o glb; devolve a função que solta (use como cleanup do useEffect) */
export function segurarGlb(url: string) {
  usos.set(url, (usos.get(url) ?? 0) + 1)
  let solto = false
  return () => {
    if (solto) return
    solto = true
    const n = (usos.get(url) ?? 1) - 1
    usos.set(url, n)
    if (n > 0) return
    setTimeout(() => {
      if ((usos.get(url) ?? 0) > 0) return
      try { useGLTF.clear(url) } catch {}
    }, RESPIRO_MS)
  }
}
