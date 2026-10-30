"use client"

import { Canvas } from "@react-three/fiber"
import { useState } from "react"
import { Tambor } from "@/app/linha/disco/Tambor"
import { DjembeDela, DjembeSeu } from "@/app/linha/interior/salas/Djembe"
import "@/app/linha/linha.css"

// (T06) os dois djembês em 3D, sozinhos (o mesmo de dentro da casa da D-Bee);
// ?2d = só os círculos de antes
export function Vitrine() {
  const [n, setN] = useState(0)
  const [acabou, setAcabou] = useState(false)
  const [so2d] = useState(() => typeof location !== "undefined" && new URLSearchParams(location.search).has("2d"))
  return (
    <div className="l-raiz" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", background: "#0a0610" }}>
      {!so2d && (
        <Canvas style={{ position: "absolute", inset: 0 }} dpr={[1, 1.5]} camera={{ position: [0.05, 1.22, 0.78], fov: 56 }} onCreated={({ camera }) => camera.lookAt(-0.62, 0.5, -1.05)}>
          <color attach="background" args={["#140c0a"]} />
          <ambientLight intensity={0.35} color="#ffcf8a" />
          <hemisphereLight args={["#ffcf8a", "#100a08", 0.4]} />
          <pointLight position={[-0.3, 2.2, 0]} color="#ffcf8a" intensity={6} distance={6} decay={2} />
          <mesh rotation-x={-Math.PI / 2} position={[-0.5, 0, -0.5]}>
            <circleGeometry args={[1.4, 32]} />
            <meshStandardMaterial color="#7a2a34" roughness={1} />
          </mesh>
          <DjembeDela pos={[-0.88, 0.01, -0.98]} vira={Math.PI + 0.37} />
          <DjembeSeu pos={[-0.18, 0.01, -0.12]} vira={0.25} />
        </Canvas>
      )}
      {acabou
        ? <button style={{ margin: "auto", color: "#fff", position: "relative" }} onClick={() => { setAcabou(false); setN(n + 1) }}>acabou (segue pro holo) · de novo</button>
        : <Tambor key={n} onFim={() => setAcabou(true)} />}
    </div>
  )
}
