import { notFound } from "next/navigation"
import { Rede3D } from "./Rede3D"

// a etapa 1 do mapa novo (só fora da produção): a rede de ruas do v5, o
// destino marcado e a rota
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Rede3D />
}
