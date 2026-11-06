# Os elevadores do túnel (06/11, versão jogável mínima)

Bíblia §6: "são 3, concêntricos à rotatória que une as pistas". Proposta adotada (nova-ordem.md, até o dono vetar): os 3 elevadores são as 3 torres das pontas.

| elevador | lá embaixo (trincheiras) | lá em cima (torre da ponta) | faixas |
|---|---|---|---|
| 1 | TORRE 1 · TÚNEIS | torre 1 | Nectar, Sexta-Feira, Ojalá |
| 2 | TORRE 2 | torre 2 | Rollercoaster, Swav, DopaminA |
| 3 | TORRE 3 | torre 3 | Copo Americano, CHUVA, Sabe Ontem? |

- **Subir**: perto da torre do salão (16 m, o mesmo teste de distância do texto da torre, no painel de 20/s) aparece "subir · torre N (faixas)". A cabine sobe numa tela translúcida de 1,2 s e a cidade nasce na entrada da rotatória da torre da ponta N (a pista é a 1ª faixa do grupo), fora da Kombi: de patins, ou de moto se ele estava de moto (na cidade todos valem, `estrada/zonas.ts`). BMX/skate chegam de patins (o desembarque da cidade só tem patins/moto). A Kombi fica onde estava: lá em cima, se ele desceu pelo elevador; senão, na boca do túnel.
- **Descer**: na rotatória de uma torre da ponta (a via atual, nada por quadro), "descer · túneis (torre N)" leva ao salão da TORRE N.
- **Trancado**: antes da missão dos túneis feita (ou da fase livre), os dois botões vêm com cadeado e "abre com a missão dos túneis".
- **Mapinha dos túneis**: o ícone do elevador (cabine com ▲▼) em cada torre. O texto da torre agora diz "o elevador sobe pra torre N, lá na cidade".
- Sem luzes novas.
- **Teste**: `?parte=elevador.subir` (cartão na Mesa).
- **Código**: `app/linha/disco/elevadores.ts` (dados e o pedido da viagem), `trincheiras/Trincheiras.tsx` (botão, cabine, mapinha), `trincheiras/fisica.ts` (`estadoInicial(n)`), `estrada/Corrida.tsx` (nasce na torre, botão descer), `page.tsx` (liga as duas cenas).
- **T47 (RASCUNHO)**: o elevador de terror mora no 2 (`ELEVADOR_TERROR = 2`): a subida vira o percurso no poço, ver `docs/t47-terror.md`. BMX/skate chegam de patins, mas voltam na descida pelo elevador.
- **Depois**: Se ele desce pelo elevador de Kombi e volta pela boca, a Kombi aparece na boca.
