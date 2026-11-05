// O REGISTRO DAS RUAS-MANIFESTO: uma entrada por faixa do vol. 1 (PistaId).
// Rua nova = um componente em estrada/manifestos/ + trocar o null aqui.
// As ideias vêm de nova-ordem.md (05/11) e da bíblia (§2): são propostas, o
// tema de cada rua é do dono.

import type { PistaId } from "../pistas"
import type { Manifesto } from "./tipos"
import { DopaminA } from "./DopaminA"
import { SabeOntem } from "./SabeOntem"

export const MANIFESTOS: Record<PistaId, Manifesto> = {
  // vício: a rua que pede mais um. Telas que pipocam com o acelerador; soltou, esvazia
  dopamina: { id: "dopamina", ideia: "a rua que pede mais um (vício)", Componente: DopaminA },
  // tempo: o dia inteiro passa na volta; a Kombi deixa "ontens" no ar; frear segura o tempo
  ontem: { id: "ontem", ideia: "a rua do tempo que não volta", Componente: SabeOntem },

  // ── ainda só ideia (o comentário é o ponto de partida) ──
  // Nectar: escrever a letra; regar faz a rua florescer e a aurora enfeita a noite (tentativa e erro)
  nectar: { id: "nectar", ideia: "a letra e as flores: tentativa e erro", Componente: null },
  // Copo Americano: o copo que enche e esvazia na mesa do bar; o quarto vazio, a flor no meio do caos
  copo: { id: "copo", ideia: "o copo americano: o que enche e esvazia", Componente: null },
  // Ojalá: amor de carnaval, fugaz como o vento (o que passa e não fica na rua)
  ojala: { id: "ojala", ideia: "a experiência da Ojalá: fugaz como o vento", Componente: null },
  // Swav: criatividade, reflexos, salto de fé (a rua de espelhos; confiar no salto)
  swav: { id: "swav", ideia: "a experiência da Swav: reflexos e salto de fé", Componente: null },
  // Sexta-Feira: a balada; multidão vazia, bateria esgotada, aceita e dança
  sexta: { id: "sexta", ideia: "a balada: multidão vazia, aceita e dança", Componente: null },
  // Rollercoaster: a montanha-russa, o parque, o clipe vertical (os altos e baixos)
  rollercoaster: { id: "rollercoaster", ideia: "a montanha-russa: os altos e baixos", Componente: null },
  // CHUVA: a chuva que rega, as torres-cogumelo (solo fértil, deserto, chuva de verão)
  chuva: { id: "chuva", ideia: "a chuva que rega a cidade", Componente: null },
}

export const manifestoDe = (id: PistaId | null | undefined) => (id ? MANIFESTOS[id] ?? null : null)
