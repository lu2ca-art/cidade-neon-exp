"use client"

// A ENTREGA DO HOLO (T07, J1 nota 6: "o holo entregue de verdade, dela pro
// player"). Depois do tambor, na cena da casa: a mão da D-Bee aberta com o holo
// aceso em cima; ele toca no holo (ou puxa pra baixo, pra si) e o holo vem pra
// mão dele: sobe, cresce, um clarão, e a cena segue. A sala em 3D (CasaDbee)
// enquadra ela de frente, a mão estendida (plano "entrega").
// (notas 03/11, o dono: "a mão que entrega o holo está bem estranha") a mão
// desenhada (2D, por cima da sala 3D) saiu: o holo surge flutuando sozinho na
// frente dela, balança de leve e, tocado, vem pro jogador

import { useEffect, useRef, useState } from "react"
import { vib } from "../som-carro"
import { gota } from "../som"
import "./tutorial.css"

const PUXAR_PX = 48 // arrastar pra baixo isso já pega

export function EntregaHolo({ onFim }: { onFim: () => void }) {
  const [pegou, setPegou] = useState(false)
  const ini = useRef<number | null>(null)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim })
  const pegar = () => {
    if (pegou) return
    setPegou(true)
    vib([20, 40, 60])
    gota(8)
  }
  useEffect(() => {
    if (!pegou) return
    const t = setTimeout(() => fim.current(), 1100)
    return () => clearTimeout(t)
  }, [pegou])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pegar() } }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  })
  return (
    <div className={`l-entrega ${pegou ? "is-pegou" : ""}`} onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => { ini.current = e.clientY }}
      onPointerMove={(e) => { if (ini.current !== null && e.clientY - ini.current > PUXAR_PX) { ini.current = null; pegar() } }}
      onPointerUp={() => { ini.current = null }}>
      <button type="button" className="l-entrega-holo" onClick={pegar} aria-label="pegar o holo">
        <span className="l-entrega-luz" aria-hidden="true"><i /><i /><b /></span>
      </button>
      <small className="l-entrega-dica">{pegou ? "é seu" : "toca no holo: pega"}</small>
      {pegou && <i className="l-entrega-clarao" aria-hidden="true" />}
    </div>
  )
}
