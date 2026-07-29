"use client"

// Ícones de app compartilhados — mesmos paths usados no celular
// (app/page.tsx getIconSvg/renderAppIcon), extraídos aqui pra não duplicar
// os SVGs em outro lugar que também precise mostrar o ícone de verdade do
// app (miniatura correta, não uma letra inicial) — hoje usado pelo dock de
// apps do HUB do carro (app/drive/page.tsx).
const APP_ICON_PATHS: Record<string, React.ReactNode> = {
  tuner: <><rect x="2" y="10" width="20" height="4" rx="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="15" cy="12" r="3.2" fill="currentColor" /><path d="M4 5v3M8 4v4M12 3v5M16 4v4M20 5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" /></>,
  nectar: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1" opacity="0.7" /><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="0.5" opacity="0.4" /><text x="12" y="15" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="bold">N</text></>,
  whatsapp: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor" />,
  heartbeat: <path d="M2 12h4l2-7 4 14 3-10 2 3h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  beatbuilder: <><rect x="2.5" y="2.5" width="8" height="8" rx="2" fill="currentColor" /><rect x="13.5" y="2.5" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" /><rect x="2.5" y="13.5" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" /><rect x="13.5" y="13.5" width="8" height="8" rx="2" fill="currentColor" /></>,
  guitardriver: <><path d="M9 3h6M12 3v4M7 12a5 5 0 0010 0H7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /><path d="M9 12v5a3 3 0 006 0v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /></>,
  tiktok: <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" fill="currentColor" />,
  youtube: <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor" />,
  instagram: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" fill="currentColor" />,
}

export function AppIcon({ icon, size = 16, className }: { icon: string; size?: number; className?: string }) {
  const path = APP_ICON_PATHS[icon]
  if (!path) return <div style={{ width: size, height: size, background: "rgba(255,255,255,0.2)", borderRadius: 3 }} />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      {path}
    </svg>
  )
}
