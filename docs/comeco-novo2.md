# O começo de um jogador novo, de novo (06/11)

Branch `feature/game/jogador-novo2` (a partir de `feature/game/mapa-disco`, `1a370d8`).
O mesmo passeio de `docs/comeco-novo.md`, só lendo o código, agora com o que entrou em
06/11 (`7db868c..1a370d8`): instrumentos, violão na rua, grafite livre, metrô nos túneis,
Nexo/"?", outdoors, mundo depois, 6 lugares no chão com "entrar", sugestões da D-Bee,
vinhetas da Xenom, visitas no save. Sem build nem Playwright: só `tsc` (código 0).

## O caminho, com o que é novo em cada passo

| # | fase | o que é novo ali | antes desta correção | agora |
|---|---|---|---|---|
| 1–4 | `minhoca` → `casa` | nada novo (cena aberta: o violão, o "entrar" e a D-Bee escondidos) | ok | ok |
| 5 | `dunas` | o violão: sem `save.violao` aparece **trancado** com qualquer som tocando | com o disco antigo tocando, o botão "🔒 violão" ficava do lado das pedras (mapa, rota, gps, drift, anel, "?"), inclusive por cima da tela de recompensa do holo, dizendo "faça a missão da D-Bee pra tocar", no meio dela | o cadeado só depois da missão da D-Bee (é o "ficou no metrô"); escondido com a recompensa do holo |
| 5 | `dunas` | o notch | a pedra "ícone no meio: acelera" aponta pro notch, mas uma mensagem (o ensinar, a vinheta) cobria o ícone: ninguém escreve `nexoTutorial` desde a trilha, então a ordem "trilha > ? > mensagem > Agora" valia só pro "?" | a trilha avisa o Holo (`pedraNoNotch`); com a pedra no notch, a mensagem espera e retoma de onde parou |
| 6–9 | `bar` | as vinhetas dos lugares do chão | o locutor alternava o clima com "o palco tá montado hoje", "chegou vinil na loja de discos"… e no `bar` os lugares do chão nem estão ativos (`chaoExtra` só a partir da `oficina`) | só na carreira e no livre |
| 9–11 | `oficina` | os 6 lugares no chão com "entrar" (ativos desde a oficina); a galeria fica perto da oficina, o lixão em volta | catando as peças, passar pela galeria, ginásio ou estúdio abria "🔒 entrar · a galeria · ver", com o cadeado pedindo a missão do Alohan, que ainda nem existe pra ele | no prólogo o "entrar" dos trancados fica guardado (os abertos seguem); com qualquer pedra na tela, nenhum "entrar". O botão também some se abrir a intro da missão, o basquete, a oficina, a recompensa, a sinuca, as trincheiras ou o cinema nos 8 s dele |
| 12 | `subir` | a pedra "pousa numa pista acesa" (no notch) | uma mensagem cobria o notch | igual ao 5 |
| 13–15 | `carreira`, 1ª missão | "segue a linha até lá", "chegou" no notch; a D-Bee calada (missão pegada) | a vinheta cobria a distância no notch; no caminho até a quadra, passar pela batida ou pela galeria abria o "entrar" trancado com a pedra "linha" na tela | a pedra manda no notch; o "entrar" espera a pedra sair |
| 16 | `carreira`, 1ª feita | "abriu coisa nova: olha"; o udu ganho (`casa:novo`); os lugares trancados (`aberto:*` com `fechado`) | entre uma pedra e outra (o respiro, ou quando a do ♥ não acha alvo), 8 s depois a D-Bee podia sugerir "ganhou o udu: passa lá em casa", "o ginásio tá fechado, mas passa lá", a sinuca… por cima do próximo passo (pegar a 2ª missão) | calada até a pedra "liberou" estar no save; depois, até a 2ª missão da cidade feita, só sugere missões |
| 17 | `carreira`, 2ª pega | a missão ativa silencia a D-Bee (como antes) | ok | ok |
| livre | `carreira`, 2ª feita | o catálogo inteiro: lugares, instrumento, tinta, trem, violão, mundo depois | — | sem mudança |

## Corrigido (um commit)

1. **Violão trancado nas dunas** — `app/linha/page.tsx` (o `ViolaoMundo`): `tranca` só com a
   missão da D-Bee feita; `escondido` também com `faltaRecompensaHolo`.
2. **A pedra no notch perdia pra mensagem** — `estrada/Holo.tsx` (`pedraNoNotch`,
   `usePedraNoNotch`, `passando`), `disco/TrilhaPedrasTela.tsx` (avisa quando a âncora é o notch).
3. **"Entrar" no meio da trilha e trancado no prólogo** — `page.tsx` (`seguraChao` no
   evento `chao:` e mais guardas no botão).
4. **Locutor falando dos lugares antes da hora** — `disco/radios.ts` (`vinhetaXenom`).
5. **D-Bee antes da trilha liberar** — `disco/DbeeSugere.tsx` (`trilhaSegura`) e
   `disco/sugestoesDbee.ts` (`comecoDaCarreira`: só `missao:*` até a 2ª da cidade).

Cartão novo na Mesa (`app/teste/mesa.ts`, parte `dunas`, mais `oficina.catar` e `subir`).

## Conferido, sem trava

- **Grafite livre, metrô nos túneis:** só dentro das trincheiras; o primeiro passeio nos
  túneis (fase de prólogo) mostra o cadeado ao encostar, sem nada sozinho.
- **Instrumentos na casa:** a casa só fica ativa na carreira/livre com instrumento novo.
- **Outdoors, mundo depois:** só visual (o mundo depois só com o final feito).
- **Visitas no save:** chegar num lugar do chão marca visitado; não abre nada.
- **"?" e Nexo:** o "?" desliga a trilha e mostra a pedra; a D-Bee sem nome no notch.

## Suspeitas que ficam

- O violão **destravado** aparece no bar e na oficina com a Xenom tocando (a D-Bee deu
  ele); pode dividir a atenção com as pedras "anel"/"?" se elas ainda não passaram.
- Mensagem presa atrás da pedra "linha" (que pode durar) só sai quando a pedra sai; as da
  fila com mais de 25 s caem (`NOTCH_VELHA`).
- O "entrar" segurado por uma pedra não volta sozinho: precisa sair ~ e chegar de novo.
- No prólogo os lugares trancados ficam sem o cadeado ao chegar (decisão a confirmar na
  Mesa; a fachada continua lá).
