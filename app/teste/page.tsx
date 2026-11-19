import { notFound } from "next/navigation"
import { Mesa } from "./Cartoes"
import { Painel } from "./Painel"

// /teste: a mesa de testes (mesa.ts + Cartoes.tsx: o que está pronto pro dono testar) e,
// embaixo, os atalhos pra testar o que está em branch (atalhos.ts). Na
// produção a página não existe.
export default function Teste() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Painel><Mesa /></Painel>
}
