"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useState } from "react"
import { FACHADAS, Fachada3D } from "../../linha/estrada/Fachadas3D"

export function Vitrine() {
  const [i, setI] = useState(0)
  const [noite, setNoite] = useState(true)
  const f = FACHADAS[i]
  return (
    <div style={{ position: "fixed", inset: 0, background: noite ? "#120e22" : "#9cc4e6", color: "#f2eefa", fontFamily: "ui-monospace, monospace" }}>
      <Canvas camera={{ position: [18, 10, 32], fov: 45 }} style={{ position: "absolute", inset: 0 }}>
        <color attach="background" args={[noite ? "#120e22" : "#9cc4e6"]} />
        <fog attach="fog" args={[noite ? "#120e22" : "#9cc4e6", 60, 140]} />
        <hemisphereLight args={[noite ? "#8a7ad8" : "#ffffff", "#3a2a30", noite ? 0.75 : 1.4]} />
        <directionalLight position={[-12, 20, 14]} intensity={noite ? 0.5 : 1.6} color={noite ? "#b9ccff" : "#fff2dc"} />
        <pointLight position={[0, 6, 14]} intensity={noite ? 140 : 0} color="#ffd9a0" distance={40} />
        <group key={f.id}><Fachada3D tipo={f.tipo} cor={f.cor} nome={f.letreiro} /></group>
        {/* a calçada e a rua na frente */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 10]}><planeGeometry args={[40, 6]} /><meshStandardMaterial color="#6a6670" /></mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 17]}><planeGeometry args={[40, 8]} /><meshStandardMaterial color="#1c1a24" /></mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}><planeGeometry args={[200, 200]} /><meshStandardMaterial color={noite ? "#1e1a2a" : "#7a8a5a"} /></mesh>
        <OrbitControls target={[0, 3, 2]} maxPolarAngle={1.45} minDistance={8} maxDistance={70} />
      </Canvas>
      <header style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "calc(12px + env(safe-area-inset-top)) 14px 8px", display: "flex", justifyContent: "space-between", alignItems: "baseline", textShadow: "0 2px 6px #000" }}>
        <b style={{ fontSize: 16, color: f.cor }}>{f.nome}</b>
        <button type="button" onClick={() => setNoite(!noite)} style={{ font: "inherit", fontSize: 12, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.4)", color: "#fff" }}>{noite ? "ver de dia" : "ver de noite"}</button>
      </header>
      <nav style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 10px calc(14px + env(safe-area-inset-bottom))", display: "flex", gap: 6, overflowX: "auto", background: "linear-gradient(transparent, rgba(10,8,20,0.9) 30%)" }}>
        {FACHADAS.map((x, k) => (
          <button key={x.id} type="button" onClick={() => setI(k)} style={{ flex: "0 0 auto", font: "inherit", fontSize: 12, fontWeight: 700, padding: "9px 12px", borderRadius: 999, border: `1.5px solid ${x.cor}`, background: k === i ? x.cor : "rgba(10,8,20,0.6)", color: k === i ? "#0a0812" : "#f2eefa" }}>{x.nome.replace(/^(o|a) /, "")}</button>
        ))}
      </nav>
      <p style={{ position: "absolute", top: "calc(44px + env(safe-area-inset-top))", left: 14, margin: 0, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>arrasta pra girar · pinça pra aproximar</p>
    </div>
  )
}
