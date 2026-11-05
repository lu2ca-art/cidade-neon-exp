"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ATALHOS, CHAVE_REAL, CHAVE_SAVE, atalhosLiberados, saveDo, type Atalho } from "./atalhos"
import { CHAVE_SAVE_REAL, desligarTeste, emTeste, ligarTeste } from "../linha/chaveSave"
import "./teste.css"

const PAGINAS = [
  { href: "/teste/trincheiras", nome: "as trincheiras: a corrida (T11, T13, T14)", desc: "os túneis embaixo do subúrbio: escolha BMX, patins ou skate e corra a volta dos 3 rios secos contra 3 rivais e o seu fantasma. A moto (T14) chega depois: ?motos libera" },
  { href: "/parque", nome: "parque (protótipo)", desc: "a montanha-russa sozinha, em 1ª pessoa" },
  { href: "/fliperama", nome: "fliperama", desc: "LINHA 9, KOMBI COBRA, INVASORES, PINGUE, QUEBRA-NEON, PRÉDIO, ATRAVESSA · 1 neon a ficha" },
  { href: "/teste/flores", nome: "flores de perto", desc: "as 7 espécies dos canteiros da Ella" },
  { href: "/ginasio", nome: "ginásio", desc: "basquete, pingue-pongue, cama elástica" },
  { href: "/galeria/pintar", nome: "pintar", desc: "pinta e expõe · a obra vai pra parede da galeria" },
  { href: "/galeria", nome: "galeria", desc: "anda pela galeria (no celular: arrasta e segura as setas)" },
  { href: "/neon-tiles", nome: "guitar driver", desc: "os palcos e a popularidade (o áudio só toca no lu2ca.art)" },
  { href: "/batida", nome: "B4TIDA", desc: "o estúdio" },
]

// (30/10) children: a mesa de testes (Cartoes.tsx), no topo da página
export function Painel({ children }: { children?: ReactNode }) {
  const router = useRouter()
  const [liberado, setLiberado] = useState(true)
  const [temReal, setTemReal] = useState(false)
  const [neon, setNeon] = useState<number | null>(null)
  const [msg, setMsg] = useState("")
  const ler = () => {
    try {
      setTemReal(emTeste() || localStorage.getItem(CHAVE_REAL) !== null)
      setNeon(JSON.parse(localStorage.getItem(CHAVE_SAVE) || "null")?.neon ?? null)
    } catch {}
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiberado(atalhosLiberados()); ler()
  }, [])

  const ir = (a: Atalho) => {
    try {
      // (notas 04/11) o atalho grava no save de TESTE: o de verdade fica onde está
      ligarTeste()
      localStorage.setItem(CHAVE_SAVE, JSON.stringify(saveDo(a)))
      localStorage.setItem("cn-linha-cam", "fora")
    } catch {}
    router.push(`/linha?atalho=${a.id}&teste=1`)
  }
  const restaurar = () => {
    try {
      // (notas 04/11) sai do modo teste: a aba volta a ler o save de verdade.
      // (o jeito antigo) se o de verdade estava guardado à parte, ele volta pro lugar
      desligarTeste()
      const r = localStorage.getItem(CHAVE_REAL)
      if (r !== null) {
        if (r) localStorage.setItem(CHAVE_SAVE_REAL, r); else localStorage.removeItem(CHAVE_SAVE_REAL)
        localStorage.removeItem(CHAVE_REAL)
      }
    } catch {}
    ler(); setMsg("o seu save voltou")
  }
  const darNeon = () => {
    try {
      const s = JSON.parse(localStorage.getItem(CHAVE_SAVE) || "null") ?? {}
      ligarTeste()
      s.neon = (s.neon ?? 0) + 50
      localStorage.setItem(CHAVE_SAVE, JSON.stringify(s))
    } catch {}
    ler(); setMsg("+50 neon")
  }

  if (!liberado) return <main className="ts-raiz"><p>nada aqui.</p></main>

  return (
    <main className="ts-raiz">
      <header>
        <h1>mesa de testes</h1>
        <p>O que está pronto pra você testar, o mais novo em cima. <b>Abrir</b> leva direto pro ponto do jogo; o seu save fica guardado e volta no botão “voltar o meu save”, lá embaixo.</p>
      </header>
      {children}
      <h2>atalhos antigos (dentro do jogo)</h2>
      <p className="ts-nota">Cada atalho troca o save por um pronto. Depois de abrir, toca em <b>entrar</b> e a Kombi aparece no lugar.</p>
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
