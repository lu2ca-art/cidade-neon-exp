import { notFound } from "next/navigation"
import { Vitrine } from "./Vitrine"

// os carros da cidade de perto (só fora da produção)
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Vitrine />
}
