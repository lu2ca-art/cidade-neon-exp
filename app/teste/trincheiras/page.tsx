import { notFound } from "next/navigation"
import { Trincheiras } from "./Trincheiras"

// T11: as trincheiras (os túneis, as raízes da cidade-árvore), soltas, de
// patins. Só fora da produção, até o dono aprovar e elas entrarem no mapa.
export default function Page() {
  if (process.env.VERCEL_ENV === "production") notFound()
  return <Trincheiras />
}
