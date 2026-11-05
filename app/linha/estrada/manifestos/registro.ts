// O REGISTRO DAS RUAS-MANIFESTO: uma entrada por faixa do vol. 1 (PistaId).
// Rua nova = um componente em estrada/manifestos/ + trocar o null aqui.
// As ideias vêm de nova-ordem.md (05/11) e da bíblia (§2): são propostas, o
// tema de cada rua é do dono.

import type { PistaId } from "../pistas"
import type { Manifesto } from "./tipos"
import { DopaminA } from "./DopaminA"
import { SabeOntem } from "./SabeOntem"
import { Chuva } from "./Chuva"
import { CopoAmericano } from "./CopoAmericano"
import { Nectar } from "./Nectar"
import { Ojala } from "./Ojala"
import { Swav } from "./Swav"
import { Sexta } from "./Sexta"

export const MANIFESTOS: Record<PistaId, Manifesto> = {
  // vício: a rua que pede mais um. Telas que pipocam com o acelerador; soltou, esvazia
  dopamina: { id: "dopamina", ideia: "a rua que pede mais um (vício)", Componente: DopaminA },
  // tempo: o dia inteiro passa na volta; a Kombi deixa "ontens" no ar; frear segura o tempo
  ontem: { id: "ontem", ideia: "a rua do tempo que não volta", Componente: SabeOntem },
  // a chuva que rega: fina → grossa com a faixa; onde a gota cai nasce flor de luz; propulsor/freio = guarda-chuva
  chuva: { id: "chuva", ideia: "a chuva que rega a cidade", Componente: Chuva },
  // copos gigantes enchendo no ritmo; acelerar demais transborda (a rua embriaga); tocar = brinde
  copo: { id: "copo", ideia: "o copo americano: o que enche e esvazia", Componente: CopoAmericano },
  // palavras da letra flutuam como pétalas, se juntam em versos que dão certo ou não; flores no compasso; tocar prende no céu
  nectar: { id: "nectar", ideia: "a letra e as flores: tentativa e erro", Componente: Nectar },
  // rajadas de fita e confete passam no compasso; desejos aparecem lá na frente e o vento os leva antes de você chegar; tocar segura um por um instante
  ojala: { id: "ojala", ideia: "fugaz como o vento: o que passa e não fica", Componente: Ojala },
  // prismas que crescem, a pista vira espelho (reflete os prismas de verdade), vãos onde ela some; acelerar no vão = salto de fé
  swav: { id: "swav", ideia: "reflexos e salto de fé", Componente: Swav },
  // a multidão dançando no BPM, cheia de longe e oca de perto; holofotes; o drift faz ela pular junto e encher
  sexta: { id: "sexta", ideia: "a balada: multidão vazia, aceita e dança", Componente: Sexta },

  // ── ainda só ideia (o comentário é o ponto de partida) ──
  // Rollercoaster: a montanha-russa, o parque, o clipe vertical (os altos e baixos)
  rollercoaster: { id: "rollercoaster", ideia: "a montanha-russa: os altos e baixos", Componente: null },
}

export const manifestoDe = (id: PistaId | null | undefined) => (id ? MANIFESTOS[id] ?? null : null)
