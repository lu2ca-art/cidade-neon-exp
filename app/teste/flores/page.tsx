import { notFound } from "next/navigation"
import { Vitrine } from "./Vitrine"

// as 7 espécies dos canteiros da Ella de perto (só fora da produção)
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Vitrine />
}
