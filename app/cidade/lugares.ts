// OS LUGARES NA CIDADE NOVA (etapa 4, a distribuição do LU2CA em 14/10):
// o humano foi empurrado pra margem. No subúrbio: o bar, o beco, o
// fliperama, o ginásio, o brechó, a oficina e as casas do Drewboy e da Ella.
// Na cidade: a balada, o posto, a Linha 9, a sede do Núcleo, a galeria (o
// mercado de arte) e a loja de roupas. Na orla: o parque e o surf. No
// mirante: o terraço e o mirante no espaço. Na arena: a casa de shows. No
// deserto: a casa da D-Bee e a prisão. Cada lugar tem um ponto aproximado
// (unidades da maquete); a fachada encosta na rua mais perto.

import type { Horario } from "../linha/relogio"

export interface LugarCidade {
  id: string
  nome: string
  letreiro: string
  cor: string
  x: number; y: number // perto de onde fica (unidades do v5)
  lado: 1 | -1
  rota?: string // a página do lugar (os lugares-página)
  horario: Horario
  exige?: string // só abre depois dessa missão
  nota?: string // o que aparece quando não tem página ainda
  alto?: number // a altura do prédio (m)
}

export const LUGARES_CIDADE: LugarCidade[] = [
  // o subúrbio
  { id: "bar", nome: "o bar", letreiro: "O COPO", cor: "#ff6a35", x: 640, y: 920, lado: 1, horario: "noite", nota: "a história passa aqui de noite" },
  { id: "beco", nome: "o beco", letreiro: "· · ·", cor: "#9b8cff", x: 610, y: 1010, lado: -1, horario: "sempre", nota: "ninguém olha pra ele" },
  { id: "fliperama", nome: "o fliperama", letreiro: "FLIPERAMA", cor: "#ff6a35", x: 715, y: 1085, lado: 1, rota: "/fliperama", horario: "noite", exige: "rollercoaster" },
  { id: "ginasio", nome: "o ginásio", letreiro: "GINÁSIO", cor: "#ff9000", x: 1000, y: 945, lado: 1, rota: "/ginasio", horario: "dia" },
  { id: "brecho", nome: "o brechó", letreiro: "BRECHÓ", cor: "#ffc857", x: 860, y: 1148, lado: -1, horario: "dia", nota: "a roupa do Drewboy mora aqui" },
  { id: "oficina", nome: "a oficina", letreiro: "OFICINA", cor: "#ff9000", x: 990, y: 1175, lado: 1, horario: "sempre", nota: "o mecânico: só desempenho, pago em água" },
  { id: "drewboy", nome: "a casa do Drewboy", letreiro: "AP 222", cor: "#ff3fb0", x: 705, y: 875, lado: -1, horario: "sempre", nota: "a história passa aqui de noite" },
  { id: "ella", nome: "a casa da Ella", letreiro: "· · ·", cor: "#5dffa0", x: 915, y: 1100, lado: 1, horario: "sempre", nota: "a história passa aqui de noite" },
  // a cidade neon
  { id: "balada", nome: "a balada", letreiro: "SEXTA", cor: "#b38cff", x: 915, y: 590, lado: 1, horario: "noite", nota: "abre quando a balada ganhar a página dela", alto: 30 },
  { id: "posto", nome: "o posto", letreiro: "POSTO 24H", cor: "#ffd23a", x: 1105, y: 615, lado: -1, horario: "sempre", nota: "o posto do LU2CA" },
  { id: "linha9", nome: "a Linha 9", letreiro: "LINHA 9", cor: "#e6f0ff", x: 1010, y: 495, lado: 1, horario: "noite", nota: "o metrô elevado" },
  { id: "nucleo", nome: "a sede do Núcleo", letreiro: "NÚCLEO", cor: "#5dffa0", x: 1160, y: 455, lado: -1, horario: "sempre", nota: "vigiada", alto: 140 },
  { id: "galeria", nome: "a galeria", letreiro: "GALERIA", cor: "#3d7bff", x: 830, y: 655, lado: 1, rota: "/galeria", horario: "dia", alto: 22 },
  { id: "roupas", nome: "a loja de roupas", letreiro: "MODA", cor: "#ff3fb0", x: 1070, y: 700, lado: 1, horario: "dia", nota: "em breve" },
  // a orla
  { id: "parque", nome: "o parque", letreiro: "PARQUE", cor: "#ffc857", x: 1440, y: 1050, lado: 1, rota: "/parque", horario: "noite" },
  { id: "surf", nome: "o surf", letreiro: "SURF", cor: "#2fe8ff", x: 1760, y: 910, lado: 1, horario: "dia", nota: "o mar tá bom hoje" },
  // o mirante
  { id: "terraco", nome: "o terraço", letreiro: "TERRAÇO", cor: "#2fe8ff", x: 1610, y: 305, lado: -1, horario: "noite", nota: "a história passa aqui de noite" },
  { id: "espaco", nome: "o mirante no espaço", letreiro: "MIRANTE", cor: "#b48cff", x: 1645, y: 272, lado: 1, horario: "noite", nota: "a estrada decola daqui (a cena vem depois)" },
  // a arena
  { id: "shows", nome: "a casa de shows", letreiro: "SHOW HOJE", cor: "#ffc857", x: 1630, y: 715, lado: 1, rota: "/casa-de-shows", horario: "noite", alto: 24 },
  // o deserto
  { id: "dbee", nome: "a casa da D-Bee", letreiro: "D-BEE", cor: "#ff9a5c", x: 115, y: 985, lado: 1, horario: "sempre", nota: "onde tudo começou" },
  { id: "prisao", nome: "a prisão", letreiro: "PRISÃO", cor: "#b8ab98", x: 125, y: 365, lado: -1, horario: "sempre", nota: "os muros do Núcleo", alto: 14 },
]
