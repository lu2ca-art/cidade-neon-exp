"use client"

// B4TIDA — o estúdio numa tela só (v2, 13/10). As telas por instrumento da
// v1 continuam nas rotas antigas, mas a entrada é o estúdio.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { sairDaPagina } from "../linha/paginas"
import { VitrineTrancada, lerTranca } from "../linha/Trancado"
import Estudio from "./estudio/Estudio"

export default function BatidaPage() {
  const router = useRouter()
  // (revisão 5) como o /ginasio: com ?tranca= a porta ainda fechada abre só a
  // vitrine (o cadeado e o que libera), sem o estúdio. undefined = ainda lendo a URL
  const [tranca, setTranca] = useState<string | null | undefined>(undefined)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTranca(lerTranca()) }, [])
  if (tranca === undefined) return null
  if (tranca) return <VitrineTrancada titulo="o estúdio" sub="B4TIDA · monta sua música por camadas" itens={["as batidas", "os instrumentos", "a mixagem"]} tranca={tranca} cor="#ff6b6b" onSair={() => sairDaPagina(router.push)} />
  return <Estudio />
}
