"use client"

// a multidão de sempre (interior/comum.tsx) no mundo aberto, em cima da rua. Fica
// num arquivo à parte pra entrar por lazy: os corpos só baixam quando o final abre.
import { Multidao, type Pessoa } from "../interior/comum"

export default function FinalMultidao({ gente }: { gente: Pessoa[] }) {
  return <Multidao gente={gente} />
}
