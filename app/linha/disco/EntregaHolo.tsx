"use client"

// A ENTREGA DO HOLO (T07, J1 nota 6: "o holo entregue de verdade, dela pro
// player"). Depois do tambor, na cena da casa: a mão da D-Bee aberta com o holo
// aceso em cima; ele toca no holo (ou puxa pra baixo, pra si) e o holo vem pra
// mão dele: sobe, cresce, um clarão, e a cena segue. A sala em 3D (CasaDbee)
// enquadra ela de frente, a mão estendida (plano "entrega").

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
      <button type="button" className="l-entrega-holo" onClick={pegar} aria-label="pegar o holo da mão dela">
        <span className="l-entrega-luz" aria-hidden="true"><i /><i /><b /></span>
        <svg className="l-entrega-mao" viewBox="0 0 120 70" aria-hidden="true">
          {/* a mão dela, aberta, de palma pra cima */}
          <path d="M8 44c14-6 26-10 42-10h30c10 0 18 2 26 6 4 2 6 6 4 9-2 3-6 3-10 2l-14-3c4 3 6 6 4 9-1 3-5 4-9 3H44c-12 0-24 2-36 6z" />
        </svg>
      </button>
      <small className="l-entrega-dica">{pegou ? "é seu" : "toca no holo: pega da mão dela"}</small>
      {pegou && <i className="l-entrega-clarao" aria-hidden="true" />}
    </div>
  )
}
