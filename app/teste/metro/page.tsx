import { notFound } from "next/navigation"
import { Vitrine } from "./Vitrine"

// a fuga no metrô (T26) solta, pra testar antes de entrar na missão do metrô (só fora da produção)
// ?auto (ou ?auto=0.1, com erros) joga sozinho · ?semente=N troca quem está em pé · ?direto pula o cartão
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Vitrine />
}
