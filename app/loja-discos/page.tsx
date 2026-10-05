import { redirect } from "next/navigation"

// A loja de discos agora mora dentro do jogo (app/linha/loja.tsx, o app
// LOJA DE DISCOS no celular): a página antiga, à parte, guardava o progresso
// por fora e brigava com o jogo.
export default function LojaDiscos() {
  redirect("/linha")
}
