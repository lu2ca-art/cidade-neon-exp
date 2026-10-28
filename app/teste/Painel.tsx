"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ATALHOS, CHAVE_REAL, CHAVE_SAVE, atalhosLiberados, saveDo, type Atalho } from "./atalhos"
import "./teste.css"

const PAGINAS = [
  { href: "/teste/trincheiras", nome: "as trincheiras (T11)", desc: "os túneis embaixo do subúrbio, de patins: 3 rios secos em triângulo e as torres" },
  { href: "/parque", nome: "parque (protótipo)", desc: "a montanha-russa sozinha, em 1ª pessoa" },
  { href: "/fliperama", nome: "fliperama", desc: "LINHA 9, KOMBI COBRA, INVASORES, PINGUE, QUEBRA-NEON, PRÉDIO, ATRAVESSA · 1 neon a ficha" },
  { href: "/oficina", nome: "oficina", desc: "a pintura e o neon de baixo da Kombi" },
  { href: "/teste/flores", nome: "flores de perto", desc: "as 7 espécies dos canteiros da Ella" },
  { href: "/ginasio", nome: "ginásio", desc: "basquete, pingue-pongue, cama elástica" },
  { href: "/galeria/pintar", nome: "pintar", desc: "pinta e expõe · a obra vai pra parede da galeria" },
  { href: "/galeria", nome: "galeria", desc: "anda pela galeria (no celular: arrasta e segura as setas)" },
  { href: "/neon-tiles", nome: "guitar driver", desc: "os palcos e a popularidade (o áudio só toca no lu2ca.art)" },
  { href: "/batida", nome: "B4TIDA", desc: "o estúdio" },
]

export function Painel() {
  const router = useRouter()
  const [liberado, setLiberado] = useState(true)
  const [temReal, setTemReal] = useState(false)
  const [neon, setNeon] = useState<number | null>(null)
  const [msg, setMsg] = useState("")
  const ler = () => {
    try {
      setTemReal(localStorage.getItem(CHAVE_REAL) !== null)
      setNeon(JSON.parse(localStorage.getItem(CHAVE_SAVE) || "null")?.neon ?? null)
    } catch {}
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiberado(atalhosLiberados()); ler()
  }, [])

  const ir = (a: Atalho) => {
    try {
      // guarda o save de verdade uma vez só (o primeiro atalho), pra poder voltar
      if (localStorage.getItem(CHAVE_REAL) === null) localStorage.setItem(CHAVE_REAL, localStorage.getItem(CHAVE_SAVE) ?? "")
      localStorage.setItem(CHAVE_SAVE, JSON.stringify(saveDo(a)))
      localStorage.setItem("cn-linha-cam", "fora")
    } catch {}
    router.push(`/linha?atalho=${a.id}`)
  }
  const restaurar = () => {
    try {
      const r = localStorage.getItem(CHAVE_REAL)
      if (r === null) return
      if (r) localStorage.setItem(CHAVE_SAVE, r); else localStorage.removeItem(CHAVE_SAVE)
      localStorage.removeItem(CHAVE_REAL)
    } catch {}
    ler(); setMsg("o seu save voltou")
  }
  const darNeon = () => {
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE_SAVE) || "null") ?? {}
      if (localStorage.getItem(CHAVE_REAL) === null) localStorage.setItem(CHAVE_REAL, localStorage.getItem(CHAVE_SAVE) ?? "")
      s.neon = (s.neon ?? 0) + 50
      localStorage.setItem(CHAVE_SAVE, JSON.stringify(s))
    } catch {}
    ler(); setMsg("+50 neon")
  }

  if (!liberado) return <main className="ts-raiz"><p>nada aqui.</p></main>

  return (
    <main className="ts-raiz">
      <header>
        <h1>atalhos de teste</h1>
        <p>Só existe fora do lu2ca.art. Cada atalho troca o save por um pronto; o seu fica guardado e volta no botão lá embaixo. Depois de abrir, toca em <b>entrar</b> e a Kombi aparece no lugar.</p>
      </header>
      <h2>dentro do jogo</h2>
      <div className="ts-lista">
        {ATALHOS.map((a) => (
          <button key={a.id} type="button" className="ts-item" onClick={() => ir(a)}>
            <b>{a.nome}</b><small>{a.desc}</small>
          </button>
        ))}
      </div>
      <h2>páginas soltas</h2>
      <div className="ts-lista">
        {PAGINAS.map((p) => (
          <a key={p.href} className="ts-item" href={p.href}><b>{p.nome}</b><small>{p.desc}</small></a>
        ))}
      </div>
      <h2>o save</h2>
      <div className="ts-acoes">
        <button type="button" onClick={darNeon}>+50 neon{neon !== null ? ` (tem ${neon})` : ""}</button>
        <button type="button" disabled={!temReal} onClick={restaurar}>voltar o meu save</button>
      </div>
      {msg && <p className="ts-msg">{msg}</p>}
    </main>
  )
}
