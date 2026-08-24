// Sistema de inventário do porta-luvas — modelo genérico + itens iniciais.
// Cada item tem: id, tipo, título, descrição, "capa" visual (cor+ícone) e
// action (o que acontece quando clica o botão principal).
//
// Extensível: futuras adições (café, mapa, joia, etc) só precisam de
// action nova e ícone.

export type InventoryAction =
  | { type: "play-disc"; file: string; titulo: string; autor: string }
  | { type: "open-url"; url: string }
  | { type: "toggle-effect"; effect: string }

export interface InventoryItem {
  id: string
  kind: "disc" | "prop"
  titulo: string
  autor?: string
  categoria: string
  desc: string
  color: string // cor dominante da capa
  icon: string  // emoji/símbolo simplificado
  action: InventoryAction
  actionLabel: string
}

// ─── DISCOS DA LOJA DE DISCOS ────────────────────────────────────────────────
// Cores por categoria (capa colorida placeholder — ganha textura real quando
// tiver as artes)
const CATEGORY_COLORS: Record<string, string> = {
  Blues: "#3b82f6",
  "Radio Escola": "#22ff88",
  "Tome Ciencia": "#ffcc00",
  "Musica Contemporanea": "#a855f7",
}

// Manifest hardcoded pra evitar fetch em runtime + garantir type-safety.
const DISCOS = [
  { id: "disco-01", file: "/loja-discos/disco-01.mp3", titulo: "12-tone blues", autor: "Radan Papezik", categoria: "Blues" },
  { id: "disco-02", file: "/loja-discos/disco-02.mp3", titulo: 'Johnson " Jass" Blues', autor: "Band Friscoe Jass", categoria: "Blues" },
  { id: "disco-03", file: "/loja-discos/disco-03.mp3", titulo: "Lonesome Road Blues", autor: "Anônimo", categoria: "Blues" },
  { id: "disco-04", file: "/loja-discos/disco-04.mp3", titulo: "New York Blues", autor: "Pietro Frosini", categoria: "Blues" },
  { id: "disco-05", file: "/loja-discos/disco-05.mp3", titulo: "The St. Louis Blues", autor: "W. C. Handy", categoria: "Blues" },
  { id: "disco-06", file: "/loja-discos/disco-06.mp3", titulo: "Poluição invisível", autor: "Bibvirt", categoria: "Radio Escola" },
  { id: "disco-07", file: "/loja-discos/disco-07.mp3", titulo: "Retrospectiva Tome Ciência I", autor: "Bibvirt", categoria: "Tome Ciencia" },
  { id: "disco-08", file: "/loja-discos/disco-08.mp3", titulo: "Retrospectiva Tome Ciência II", autor: "Bibvirt", categoria: "Tome Ciencia" },
  { id: "disco-09", file: "/loja-discos/disco-09.mp3", titulo: "Musicalidade da poesia", autor: "César M. Borges (USP)", categoria: "Musica Contemporanea" },
  { id: "disco-10", file: "/loja-discos/disco-10.mp3", titulo: "Ein Musikalischer Spass Mv1", autor: "W. A. Mozart", categoria: "Musica Contemporanea" },
  { id: "disco-11", file: "/loja-discos/disco-11.mp3", titulo: "Ricercare", autor: "J. S. Bach", categoria: "Musica Contemporanea" },
  { id: "disco-12", file: "/loja-discos/disco-12.mp3", titulo: "Ricercare a 6", autor: "J. S. Bach", categoria: "Musica Contemporanea" },
  { id: "disco-13", file: "/loja-discos/disco-13.mp3", titulo: "Uma viagem musical", autor: "Ministério da Educação", categoria: "Musica Contemporanea" },
] as const

const DISC_ITEMS: InventoryItem[] = DISCOS.map((d) => ({
  id: d.id,
  kind: "disc",
  titulo: d.titulo,
  autor: d.autor,
  categoria: d.categoria,
  desc: `Vinil ${d.categoria.toLowerCase()} · ${d.autor}. Coloque no toca-discos pra ouvir.`,
  color: CATEGORY_COLORS[d.categoria] ?? "#c9a97a",
  icon: "♪",
  action: { type: "play-disc", file: d.file, titulo: d.titulo, autor: d.autor },
  actionLabel: "▶ tocar no toca-discos",
}))

// ─── OUTROS ITENS (placeholders pro futuro) ──────────────────────────────────
const OTHER_ITEMS: InventoryItem[] = [
  {
    id: "cafe",
    kind: "prop",
    titulo: "Café gelado",
    categoria: "Bebida",
    desc: "Um café que perdeu o gelo faz 3 horas. Ainda serve.",
    color: "#6a4820",
    icon: "☕",
    action: { type: "toggle-effect", effect: "cafe" },
    actionLabel: "☕ tomar (placeholder)",
  },
  {
    id: "mapa-cidade",
    kind: "prop",
    titulo: "Mapa da Cidade Neon",
    categoria: "Navegação",
    desc: "Mapa dobrado com anotações rabiscadas. Mostra pontos de interesse.",
    color: "#22ff88",
    icon: "🗺",
    action: { type: "toggle-effect", effect: "mapa-fullscreen" },
    actionLabel: "🗺 abrir mapa",
  },
]

export const INVENTORY: InventoryItem[] = [...DISC_ITEMS, ...OTHER_ITEMS]
