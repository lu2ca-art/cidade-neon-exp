# As duas rádios (05/11)

Fonte: a bíblia, seções 3, 6 e 9. O dono: "No subúrbio pega a rádio do subúrbio, que fala sobre as coisas que acontecem no subúrbio, o gancho pras missões do subúrbio. Na cidade toca a Rádio Cidade Neon (por enquanto só as faixas do volume 1), que leva pras missões da cidade." E: "a rádio tem que ser algo mais livre, toca nos túneis e na cidade."

## As estações

| estação | frequência (id) | onde pega sozinha | som | o que toca | o locutor |
|---|---|---|---|---|---|
| **Rádio Xenom** | 69.9 (`suburbio`) | subúrbio, túneis (trincheiras), deserto | rádio antiga: passa-banda, saturação e chiado (`radioAntiga.ts`). No deserto, limpa | o que **não** é do vol. 1: o catálogo do subúrbio (gata mia, tédio, boom boom k, 10 de 10), o arquivo (clichê, hollywood, stylist, oasis, astronauta, quem é vc) e os discos de domínio público da loja (`vinis.json`). Embaralhado, sem repetir até tocar todas | fala **entre toda música**: o gancho das missões e o clima do subúrbio |
| **Rádio Cidade Neon** | 222.0 (`linha`) | cidade (nas pistas) | limpa | **só o vol. 1**, as 9 faixas: a completa onde a voz já saiu, o instrumental onde não tem (Swav até 13/11, Rollercoaster até 27/11, Ojalá). Ordem do álbum embaralhada de leve: de vez em quando duas vizinhas trocam de lugar | antes da faixa de uma missão que dá pra fazer agora, quem pede fala o porquê; de vez em quando, o nome da rádio |

- O **♥ salvar** aparece do lado do ⏭ quando a Rádio Cidade Neon toca uma faixa do vol. 1 (`SalvarRadio` no `Holo.tsx`, os links em `disco/linksFaixas.ts`).
- As outras frequências (88.7, 111.3, 222.4) continuam no menu, com as regras de antes (o sinal, a missão do Xeriff). As duas rádios ficam livres desde o começo.
- A rádio pega em todo lugar (`RADIO_EM_TODO_LUGAR`): estrada, túneis, salas, cenas. Ligar ou desligar é no holo (o menu da rádio) ou no botão da rádio fora da estrada, como antes.

## A troca pela zona

- A zona do som já existia (`radioAntiga.ts`): cidade (nas pistas), subúrbio (no chão, perto), deserto (no chão, longe) e túneis.
- Cidade → Rádio Cidade Neon. Subúrbio, túneis e deserto → Rádio Xenom.
- A estação só troca depois de **4 s** na zona nova (`FOLGA_ZONA`). Assim um pulo pra fora da pista na borda da cidade não picota a rádio.
- Com a rádio ligada, a troca é suave: um chiado curto de sintonia, a música sai em ~0,45 s (`FADE_TROCA`) e a da outra estação entra em fade (~1,2 s). Com a rádio desligada, só muda a frequência, sem som.
- **Troca à mão:** o menu da rádio sintoniza a outra estação. Ela fica até a próxima troca de zona.
- O jogo volta na estação da última zona (fica no aparelho, `cn-radios-zona`), pra não ter chiado à toa ao abrir.
- A primeira chegada do deserto no subúrbio continua ligando a rádio sozinha, uma vez só (`historia.radioXenom`). Agora quem toca é a Xenom, já com o locutor.

## As vinhetas da Xenom

- Ficam em `app/linha/disco/vinhetasXenom.ts`, um **rascunho** pro dono reescrever.
- Ainda sem voz: a fala passa como **legenda curta**, ~5 s, no display da rádio do holo e no notch.
- Cada vinheta tem um campo `audio`. Quando houver a voz gravada, é só pôr o arquivo ali: a voz toca por cima (a música abaixa sozinha) e a legenda continua.
- Cada vinheta pode ter três marcas:
  - `missao` + `quando`: entra só se a missão estiver assim agora.
    - `disponivel`: dá pra pegar e ele ainda não pegou. É o gancho.
    - `ativa`: ele pegou e ainda não terminou. É o lembrete.
    - `feita`: já fez, e o subúrbio comenta.
  - `fase`: entra só nessa fase da história (bar, oficina, subir, nectar).
  - Sem marca: o clima geral.
- **Como ela escolhe:** lê o estado do save (`historia`, as missões disponíveis com a luz das pistas, a missão pegada, as feitas).
  - 2 de cada 3 vinhetas são gancho: a missão ativa primeiro, depois as do subúrbio, depois a fofoca da cidade.
  - A outra é o clima, ou o comentário de uma missão feita.
  - Não repete nenhuma das últimas 6.
  - Antes da carreira não tem gancho de missão, só a fase e o clima.
- Hoje são 3 ou 4 por missão do subúrbio (oficina, quadra, túneis), 2 ou 3 por missão da cidade (Drew, Mubarak, Xeriff, LU2CA, Ella, Notti, Nizzy, Tony, a final), 4 de fase e 8 de clima. Exemplo: "tão dizendo que o Mubarak tá procurando um disco raro lá no bar do copo…"
- As falas da Cidade Neon também são rascunho. O nome da faixa e o pedido da missão saem de `disco/portas.ts`. As linhas com o nome da rádio são o `ID_CIDADE` em `disco/radios.ts`.

## A faixa da rua (a regra da música contínua) e a rádio

- A faixa da rua continua igual: entrou numa rua, a completa dela uma vez inteira, a missão passa pro instrumental no mesmo ponto (`docs/musica-continua.md`).
- **Rádio ligada manda:** a faixa da rua segue muda por baixo, como já era.
- **A decisão:** na cidade, entrar numa rua com a Rádio Cidade Neon ligada **pede** a faixa da rua. Ela vira a **próxima** da rádio, com o locutor dizendo "você entrou na rua dela" (ou o pedido da missão dela). A música que está tocando **não é cortada**.
  - Por quê: a regra da cidade é que nada interrompe uma música ("cada música é uma experiência que dura o tamanho da faixa"). Cortar a rádio a cada rua picotaria tudo, porque uma volta dura meia faixa. Assim a rua e a rádio contam a mesma coisa sem nenhuma das duas cortar a outra.
  - O pedido vale uma vez. Trocou de rua antes da música acabar, vale a rua nova. Se a rádio já está tocando a faixa daquela rua, nada muda.

## Onde mexer

- `app/linha/disco/radios.ts`: as estações, o repertório, a troca pela zona (`FOLGA_ZONA`, `FADE_TROCA`), a programação (fica no aparelho, `cn-radios`), o pedido da rua e a escolha das vinhetas.
- `app/linha/disco/vinhetasXenom.ts`: os textos do locutor e as vozes.
- `app/linha/programa.ts`: no jogo novo, a 222.0 e a 69.9 usam `radios.ts`. As outras frequências e o jogo velho seguem como antes.
- `app/linha/radio.ts`: os nomes e o custo 0 das duas.
- `Corrida.tsx` (a estrada) e `page.tsx` (túneis e salas): quem toca a estação nova. Com a estrada montada, toca ela; senão, a página.
- `som.ts`: `player.tocar(..., entrada)` e `player.volume(v, seg)`, os fades da troca.

## Para testar (no iPhone)

1. Ligar a rádio na cidade: Rádio Cidade Neon, só faixas do vol. 1. Numa faixa com link, aparece o ♥.
2. Descer pro subúrbio: depois de ~4 s, chiado, a música sai e entra a Rádio Xenom, com som de rádio antigo. Entre as músicas, a legenda do locutor no display e no notch.
3. Com uma missão disponível (ex.: a quadra), as vinhetas falam dela. Pegar a missão: elas viram lembrete.
4. Nos túneis, a Xenom continua.
5. No menu da rádio, trocar pra outra estação: ela fica até mudar de zona.
6. Na cidade, com a Cidade Neon ligada, entrar numa rua nova: a música atual termina e a próxima é a da rua.

## Falta

- O teste do dono no iPhone. Aqui só rodou o `tsc`: nada foi medido nem rodado. O cartão da Mesa (`app/teste/mesa.ts`) não foi mexido.
- As vozes do locutor (o campo `audio` está vazio em todas).
- O dono reescrever as vinhetas, que são rascunho.
- Uma voz/vinheta própria pra Cidade Neon (hoje são linhas curtas geradas do pedido da missão).
- A borda da cidade: andar no chão entre as pistas conta como subúrbio, igual ao filtro de rádio antiga. Se incomodar, dá pra aumentar `FOLGA_ZONA`.
