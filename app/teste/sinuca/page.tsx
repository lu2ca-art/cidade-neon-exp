import { notFound } from "next/navigation"
import { Vitrine } from "./Vitrine"

// a sinuca 8 ball (T17) solta, pra testar antes de entrar na missão do Mubarak (só fora da produção)
// ?modo=mubarak | pratica pula o menu
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Vitrine />
}
