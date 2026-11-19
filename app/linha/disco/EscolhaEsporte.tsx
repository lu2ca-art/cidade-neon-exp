"use client"

// O ESPORTE DO GINÁSIO (ep. 3, episodios.md e bíblia §11, 08/11): chegou no ginásio com o
// Alohan, a pessoa escolhe o que jogar, em cima do mundo (nada de tela preta):
// basquete, ping pong ou ginástica (antes cama elástica). Os jogos são os do /ginasio.

export type EsporteId = "basquete" | "pingpong" | "ginastica"

const ESPORTES: { id: EsporteId; nome: string; como: string }[] = [
  { id: "basquete", nome: "basquete", como: "arrasta e arremessa" },
  { id: "pingpong", nome: "ping pong", como: "a raquete segue o dedo" },
  { id: "ginastica", nome: "ginástica", como: "quica, gira e cai de pé" },
]

export function EscolhaEsporte({ cor, onEscolher }: { cor: string; onEscolher: (id: EsporteId) => void }) {
  return (
    <section className="l-esporte" style={{ ["--cor" as string]: cor }} role="dialog" aria-label="o ginásio: o esporte" onPointerDown={(e) => e.stopPropagation()}>
      <small>o ginásio · com o Alohan</small>
      <b>qual vai ser?</b>
      <div>
        {ESPORTES.map((e) => (
          <button key={e.id} type="button" onClick={() => onEscolher(e.id)}>
            <strong>{e.nome}</strong>
            <span>{e.como}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
