"use client"

import { useState } from "react"
import { Tambor } from "@/app/linha/disco/Tambor"
import "@/app/linha/linha.css"

export function Vitrine() {
  const [n, setN] = useState(0)
  const [acabou, setAcabou] = useState(false)
  return (
    <div className="l-raiz" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "#0a0610" }}>
      {acabou
        ? <button style={{ margin: "auto", color: "#fff" }} onClick={() => { setAcabou(false); setN(n + 1) }}>acabou (segue pro holo) · de novo</button>
        : <Tambor key={n} onFim={() => setAcabou(true)} />}
    </div>
  )
}
