import { notFound } from "next/navigation"
import { Trincheiras } from "@/app/linha/trincheiras/Trincheiras"

// T11: as trincheiras soltas (os atalhos ?auto, ?veiculo=, ?motos, ?medir), pros
// testes e as medições. (T63) No jogo elas abrem DENTRO do /linha, pela boca do
// túnel no subúrbio (app/linha/trincheiras). Esta página segue só fora da produção.
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Trincheiras />
}
