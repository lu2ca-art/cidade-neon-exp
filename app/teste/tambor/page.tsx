import { notFound } from "next/navigation"
import { Vitrine } from "./Vitrine"

// o minijogo do tambor (2.5) solto, pra testar e tirar print (só fora da produção)
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Vitrine />
}
