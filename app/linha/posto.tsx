"use client"

// DENTRO DO POSTO (06/10, LU2CA): passou no ponto de parada, entra. A sala é
// a do posto (interior/salas/Posto.tsx: a Kombi na bomba, o LU2CA no
// meio-fio). Só aqui dentro se enche o tanque e o galão.
//
// A primeira vez é a apresentação do LU2CA: enquanto o tanque enche (com os
// 25 NEON da D-Bee), ele se impressiona com a Kombi e diz que nunca te viu.
// Aí o galão: saldo insuficiente → ele dá 110 NEON (pro galão e pro primeiro
// disco). Falas: as do presente são do LU2CA; as da Kombi, RASCUNHO a partir
// do que ele contou.

import { useEffect, useState } from "react"
import { publicar, zerar } from "./interior/bus"

const LILAS = "#b38cff"

const CHEGADA = [
  "que kombi é essa? faz tempo que eu não vejo uma rodando",
  "nunca te vi por aqui. vc não é da cidade, né",
]
const PRESENTE = 110
const DEPOIS = [
  "Sei como é... toma aqui.",
  "Pra você encher seu galão e comprar um disco mais novo do que esse que você não para de ouvir.",
]

type Etapa = "chega" | "fala1" | "opcoes" | "fala2"

export function PostoDentro({ primeira, neon, tanque, galao, precoTanque, precoGalao, onEncherTanque, onEncherGalao, onPresente, onSair }: {
  primeira: boolean
  neon: number
  tanque: number
  galao: "cheio" | "vazio" | undefined
  precoTanque: number
  precoGalao: number
  onEncherTanque: () => void
  onEncherGalao: () => void
  onPresente: (n: number) => void
  onSair: () => void
}) {
  const [etapa, setEtapa] = useState<Etapa>(primeira ? "chega" : "opcoes")
  const [i, setI] = useState(0)
  const [semSaldo, setSemSaldo] = useState(false)
  const [ganhou, setGanhou] = useState(false)

  // a sala acompanha: quem fala, e o plano da chegada
  const fala = etapa === "fala1" ? CHEGADA[i] : etapa === "fala2" ? DEPOIS[i] : null
  useEffect(() => {
    publicar({ pos: etapa === "chega" ? 1 : 2 + i, falando: fala ? "LU2CA" : null, texto: fala, gesto: null, escolha: false, ganha: false })
  }, [etapa, i, fala])
  useEffect(() => () => zerar(), [])

  // chegou: um respiro e o tanque começa a encher (os 25 da D-Bee)
  useEffect(() => {
    if (etapa !== "chega") return
    const t = setTimeout(() => { setEtapa("fala1"); onEncherTanque() }, 1400)
    return () => clearTimeout(t)
  }, [etapa, onEncherTanque])

  const seguir = () => {
    if (etapa === "fala1") {
      if (i < CHEGADA.length - 1) setI(i + 1)
      else { setEtapa("opcoes"); setI(0) }
    } else if (etapa === "fala2") {
      // "toma aqui": o dinheiro cai na conta
      if (i === 0 && !ganhou) { setGanhou(true); onPresente(PRESENTE) }
      if (i < DEPOIS.length - 1) setI(i + 1)
      else { setEtapa("opcoes"); setI(0) }
    }
  }

  const galaoCheio = galao === "cheio"
  const tanqueCheio = tanque > 0.97
  const encherGalao = () => {
    if (galaoCheio) return
    if (neon < precoGalao) {
      setSemSaldo(true)
      // a primeira vez, o LU2CA percebe
      if (primeira && !ganhou) setTimeout(() => { setSemSaldo(false); setEtapa("fala2"); setI(0) }, 1300)
      return
    }
    setSemSaldo(false)
    onEncherGalao()
  }
  // a saída: na primeira vez, só depois do presente
  const podeSair = !primeira || ganhou

  return (
    <div className="l-cena l-posto-dentro" onClick={fala ? seguir : undefined}>
      <small className="l-cena-lugar">posto 24h · o posto</small>
      {fala && (
        <div className="l-cena-legenda is-fala" style={{ ["--cor" as string]: LILAS }}>
          <small>LU2CA</small>
          <p>{fala}</p>
          <i className="l-cena-toque">toca pra seguir</i>
        </div>
      )}
      {etapa === "opcoes" && (
        <div className="l-posto-ops" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="l-posto-op" disabled={tanqueCheio || neon < precoTanque} onClick={onEncherTanque}>
            <span>{tanqueCheio ? "tanque cheio" : "encher o tanque"}</span><small>{precoTanque} neon$</small>
          </button>
          <button type="button" className="l-posto-op" disabled={galaoCheio} onClick={encherGalao}>
            <span>{galaoCheio ? "galão cheio" : "encher o galão"}</span><small>{precoGalao} neon$</small>
          </button>
          {semSaldo && <p className="l-posto-aviso">saldo insuficiente</p>}
          {podeSair && <button type="button" className="l-posto-sair" onClick={onSair}>sair do posto →</button>}
        </div>
      )}
    </div>
  )
}
