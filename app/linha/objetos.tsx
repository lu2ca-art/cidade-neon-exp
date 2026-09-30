import type { ObjetoId } from "./data"

// Os objetos do Bloco 1 em traço fino — cada personagem aparece pelo objeto
// que guarda, não por um rosto (os personagens são pessoas reais, e o avatar
// de banco de imagem era a parte mais genérica da versão anterior).
const TRACOS: Record<ObjetoId, React.ReactNode> = {
  flor: (
    <>
      <path d="M12 21v-8" />
      <path d="M12 16c-2.5 0-4-1.5-4.5-3.5 2 0 3.8.8 4.5 3.5z" />
      <circle cx="12" cy="8.5" r="1.6" />
      <path d="M12 6.9c-.4-1.8.4-3.4 0-3.9-.4.5.4 2.1 0 3.9zM13.6 8.5c1.8-.4 3.4.4 3.9 0-.5-.4-2.1.4-3.9 0zM12 10.1c.4 1.8-.4 3.4 0 3.9M10.4 8.5c-1.8.4-3.4-.4-3.9 0" />
      <path d="M13.1 7.4c1-1.5 2.7-2 3-2.6-.6-.1-2 1-3 2.6zM10.9 7.4c-1-1.5-2.7-2-3-2.6.6-.1 2 1 3 2.6z" />
    </>
  ),
  mp3: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <rect x="9" y="5.5" width="6" height="5" rx=".6" />
      <circle cx="12" cy="15.5" r="2.6" />
      <circle cx="12" cy="15.5" r=".6" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 9v4l2.5 1.5M10 3h4M12 3v3" />
    </>
  ),
  espelho: (
    <>
      <ellipse cx="12" cy="10" rx="5.5" ry="7" />
      <path d="M12 17v4M9 21h6M9.5 7.5l2-2M10 10.5l4-4" />
    </>
  ),
  caderno: (
    <>
      <rect x="6" y="3" width="13" height="18" rx="1.5" />
      <path d="M9 3v18M11.5 8h5M11.5 11h5M11.5 14h3M4.5 6.5h3M4.5 10h3M4.5 13.5h3M4.5 17h3" />
    </>
  ),
  violao: (
    <>
      <path d="M15.5 8.5 20 4M19 3l2 2" />
      <path d="M14.5 9.5a3.2 3.2 0 0 0-4.6.4 2.4 2.4 0 0 1-2.3.9 3.6 3.6 0 0 0-3 5.8l1.8 1.8a3.6 3.6 0 0 0 5.8-3 2.4 2.4 0 0 1 .9-2.3 3.2 3.2 0 0 0 .4-4.6z" />
      <circle cx="10.2" cy="13.8" r="1.2" />
    </>
  ),
  camisa: (
    <>
      <path d="M8 3 4 5.5 5.5 10 7.5 9V21h9V9l2 1L20 5.5 16 3c-.5 1.6-2 2.5-4 2.5S8.5 4.6 8 3z" />
      <path d="M11 13h2M12 12v2" />
    </>
  ),
  lanterna: (
    <>
      <path d="M9 3h6v4l-1.5 2.5v9.5a1.5 1.5 0 0 1-3 0V9.5L9 7z" />
      <path d="M9 5h6M12 12.5v1.5M4 2l2.5 2M20 2l-2.5 2M12 0.5v1.5" />
    </>
  ),
  "guarda-chuva": (
    <>
      <path d="M3 12a9 9 0 0 1 18 0c-1.5-1.3-3-1.3-4.5 0-1.5-1.3-3-1.3-4.5 0-1.5-1.3-3-1.3-4.5 0-1.5-1.3-3-1.3-4.5 0z" />
      <path d="M12 12v7a2 2 0 0 1-4 0M12 3V1.5" />
    </>
  ),
}

export function Objeto({ id, cor, size = 24, className }: { id: ObjetoId; cor: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {TRACOS[id]}
    </svg>
  )
}
