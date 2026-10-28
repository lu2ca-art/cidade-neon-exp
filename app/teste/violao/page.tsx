import { notFound } from "next/navigation"
import { Vitrine } from "./Vitrine"

// T08: o violão que acompanha qualquer música, solto (só fora da produção)
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Vitrine />
}
