import { notFound } from "next/navigation"
import { Vitrine } from "./Vitrine"

// o grafite dos túneis (T12) solto, pra testar (só fora da produção)
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Vitrine />
}
