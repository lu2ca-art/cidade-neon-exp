# Os instrumentos ancestrais (T49)

06/11/2026. Regra do dono: cada missão com pessoa dá, como **recompensa secundária**,
um instrumento ancestral/orgânico. Depois de ganho, ele fica na **casa da D-Bee**
(lugar `casa-dbee`, fim da estrada do deserto) e dá pra tocar.

## O que entrou

| Missão (quem) | Instrumento | Timbre (sintetizado) |
|---|---|---|
| dbee (D-Bee) | djembê | o tambor gravado da D-Bee; sem ele, grave/tapa sintetizados |
| oficina (o mecânico) | tambor de água | "glub" que sobe de tom |
| quadra (Alohan) | udu | grave de pote que cai de tom |
| drew (Drew) | caxixi | chocalho (ruído filtrado, duas batidas) |
| mubarak (Mubarak) | sitar | violão + corda de som.ts |
| xeriff (Xeriff) | didgeridoo | serra grave longa + oitava |
| lu2ca (LU2CA) | berimbau | corda + estalo |
| ella (Ella) | flauta de bambu | seno + sopro |
| notti (Notti) | ocarina | seno + sopro (mais agudo) |
| nizzy (Nizzy) | handpan | três senos (sino) |
| tony (Tony Gordo) | kalimba | seno + clique de lamela |

Túneis e a 13ª (final) não dão instrumento.

- **Tabela única:** `app/linha/disco/instrumentos.ts` (`INSTRUMENTOS_ANCESTRAIS`: id, artigo, nome,
  origem, missão, timbre, notas, cor; `tocarInstrumento`; `linhaRecompensa`).
  Trocar nome/missão/som é só ali. A missão → instrumento também aparece em
  `MISSOES13[...].recompensa.instrumento` (`app/linha/disco/portas.ts`).
- **Save:** `HistoriaDisco.instrumentos` (os ganhos) e `instrumentosVistos` (os já vistos na casa).
  Entram quando a porta abre (`portas.ts` `abrirPorta`); `instrumentosGanhos(h)` também deduz das missões feitas.
- **Recompensa:** ao fechar a missão, o notch passa a linha `+ o udu · na casa da D-Bee`
  (`page.tsx` `mostrarLiberou`), sem tela nova.
- **Na casa:** `app/linha/disco/InstrumentosCasa.tsx`. Os 11 têm vaga fixa no banco e nas duas
  prateleiras da parede direita. Ganho = com cor, tocável (cada toque anda nas notas, vira melodia).
  Não ganho = apagado + cadeado; tocar nele dá um toque abafado e a D-Bee diz na legenda
  "o udu ainda não tá aqui. vem da missão do Alohan". A parede só aparece depois do 1º ganho
  (no prólogo ela fica vazia).
- **Como chega lá:** a cena `dbee-instrumentos` (com instrumento novo, ela pede pra tocar os novos
  e segue sozinha depois; sem novo, a visita livre). Na visita livre não tem mais pressa: a dica
  tem um botão **pronto ›** (`cena.tsx` `Dica3d`) — antes ela saía depois de 2 toques.
- **Música:** na cena `dbee-instrumentos` a trilha para em fade e volta de onde estava ao sair
  (`page.tsx`, `fazerMusica`; bíblia §9: a música só para pra fazer música).
- **Desempenho:** geometrias e materiais criados uma vez no módulo e compartilhados; o não ganho usa
  um material só; nenhuma luz nova (a luz quente própria do banco, que existia, saiu); `useFrame`
  só mexe em quem foi tocado há < 0,6 s, sem alocar.
- **Teste:** Mesa (`app/teste/mesa.ts`, 06/11) → `?parte=instrumentos` (todos ganhos, visita livre);
  `?parte=casa.instrumentos` (7 ganhos, 2 novos, 4 trancados); `?parte=recompensa.instrumento`
  (fecha o Mubarak: "+ o sitar").

## Rascunho (o dono pode trocar)

- **Os sons:** todos sintetizados no Web Audio (menos o djembê, que usa o tambor gravado quando já
  carregou). Pra trocar por sample: mudar o `case` do timbre em `tocarInstrumento`.
- **Os modelos:** primitivas low-poly; dá pra trocar por peças do Blender sem mexer no resto.
- **A lista e quem dá o quê** (a tabela acima).

## Decisões tomadas sem perguntar

- O aviso do trancado é falado pela D-Bee na legenda (no mundo, sem rótulo flutuante/DOM em 3D).
- A visita livre não sai sozinha; sai no "pronto ›".
- A luz quente própria do banco foi tirada (regra: sem luzes novas). Se o banco ficar escuro, o
  ajuste é na luz da sala, não uma luz a mais.
