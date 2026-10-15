import { notFound } from "next/navigation"
import { Painel } from "./Painel"

// /teste: os atalhos pra testar o que está em branch (atalhos.ts). Na
// produção a página não existe.
export default function Teste() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Painel />
}
