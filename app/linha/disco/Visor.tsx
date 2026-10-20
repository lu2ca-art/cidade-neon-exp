"use client"

// O VISUALIZADOR (LU2CA 20/10, B15b): os links de fora abrem DENTRO do jogo,
// numa janela do holo (com fechar), pra pessoa não sair da página nem trocar
// de aba. A música do jogo para enquanto ele está aberto.
// Site que não deixa abrir em janela (o untitled manda X-Frame-Options
// SAMEORIGIN): a capa, um resumo e "abrir lá fora" como último recurso.

import { useEffect, type ReactNode } from "react"
import { silenciar } from "../som"

export type VisorId = "iris" | "access" | "stream" | "untitled" | "freq"
type Conf = { titulo: string; cor: string; src: string | null; fora: string; resumo?: string; capa?: string }

export const VISOR: Record<VisorId, Conf> = {
  iris: { titulo: "_IRIS.EXE", cor: "#c77dff", src: "https://www.instagram.com/lu2ca.art/embed", fora: "https://www.instagram.com/lu2ca.art" },
  access: { titulo: "ACC3SS", cor: "#38bdf8", src: "https://lu2ca-xlvdjou.gamma.site/", fora: "https://lu2ca-xlvdjou.gamma.site/" },
  // (LU2CA 20/10) o STR34M agora é o vid.stream
  stream: { titulo: "vid.stream", cor: "#ff4040", src: "https://www.youtube.com/embed/f83oYSMRyaY?autoplay=1&rel=0", fora: "https://youtu.be/f83oYSMRyaY" },
  untitled: { titulo: "[UNTITLED]", cor: "#8b5cf6", src: null, fora: "https://untitled.stream/invite/CPq7Z1J2Og32UEDsFfK9k", capa: "/capas/untitled/cidade-neon-vol1.jpg", resumo: "o álbum inteiro e as pastas do LU2CA moram no untitled. ele não abre dentro de outra página: o botão leva lá" },
  freq: { titulo: "FR3Q_", cor: "#00ff9c", src: null, fora: "https://untitled.stream/invite/CPq7Z1J2Og32UEDsFfK9k", capa: "/capas/untitled/cidade-neon.jpg", resumo: "os projetos do LU2CA no untitled. ele não abre dentro de outra página: o botão leva lá" },
}

export function Visor({ id, onFechar, children }: { id: VisorId; onFechar: () => void; children?: ReactNode }) {
  const c = VISOR[id]
  useEffect(() => { silenciar(true); return () => silenciar(false) }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar() }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [onFechar])
  return (
    <div className="l-visor" style={{ ["--cor" as string]: c.cor }} onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label={c.titulo}>
      <div className="l-visor-janela">
        <header>
          <b>{c.titulo}</b>
          <a href={c.fora} target="_blank" rel="noreferrer">abrir lá fora ↗</a>
          <button type="button" onClick={onFechar} aria-label="fechar">×</button>
        </header>
        {children ?? (c.src ? (
          <iframe src={c.src} title={c.titulo} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <div className="l-visor-fora">
            {c.capa && <i className="l-visor-capa" style={{ backgroundImage: `url(${c.capa})` }} />}
            <p>{c.resumo}</p>
            <a href={c.fora} target="_blank" rel="noreferrer">abrir lá fora ↗</a>
          </div>
        ))}
      </div>
    </div>
  )
}
