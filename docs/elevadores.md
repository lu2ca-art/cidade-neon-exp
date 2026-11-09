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
- **Modelados no Blender (06/11)**: `blender/scripts/elevadores.py` (+ `elevadores_foto.py`, foto em `docs/blender/elevadores.png`) → `public/models/elevadores.glb` (6,5 mil triângulos, 99 KB). Um modelo de cada, nos 3:
  - **a entrada (lá embaixo)**: encostada na torre de cada salão, virada pro salão (a frente a 0,75 m da parede da torre; a grade fica 0,3 m pra dentro, fora do raio de batida): moldura de aço em I rebitada com faixa de perigo, porta de grade pantográfica, a cabine acesa atrás, o painel com o número e as 3 faixas do grupo (na cor de cada linha) e o botão ▲▼, as duas luzes de chamada âmbar, os trilhos-guia e os cabos subindo pela torre até a polia (14 m, por trás da placa "subir"). O neon da moldura e o número na cor dos túneis.
  - **a chegada (lá em cima)**: a casinha do elevador no anel da torre da ponta N, encostada no prédio do meio e virada pra chegada da 1ª faixa do grupo (um pouco de lado, pra não tampar a faixa colorida do prédio): chapa, os mesmos pilares de aço, porta de vidro de correr com a cabine acesa, o painel igual, o letreiro "TÚNEIS ▼" em neon, a casa de máquinas no teto com as luzes de chamada; e a passarela esticada até a borda de dentro do anel. Neon na cor das torres (laranja).
  - O número, as faixas e o letreiro são malhas `_neon` pintadas pelo jogo. Cada elevador vira 3 desenhos (sólido, brilho, vidro) com materiais compartilhados, montado só perto (`<Perto>`: 220 m nos túneis, 500 m na cidade), sem luz nova, nada por quadro. Se o .glb falhar, fica sem modelo (como antes). Código: `app/linha/disco/Elevadores3D.tsx`.
- **A porta do deserto (09/11, bíblia §13)**: a torre 1, colada no subúrbio, tem um andar no chão do deserto: a mesma entrada modelada no pé do prédio, virada pra fora, com a placa dos andares (os túneis riscados). A Kombi sobe por ela até a rotatória da torre 1 e desce de volta pelo botão "descer · deserto". Abre depois da 1ª subida voando (não na missão dos túneis): é de graça, e é a saída de quem ficar sem água, já que decolar do chão gasta água (`PROPULSOR_AGUA`, `estrada/zonas.ts`). Dados e pose: `PORTA_DESERTO` e `portaDoDeserto`.
- **A Kombi não desce pros túneis**: no "descer · túneis" ela fica lá em cima, e na rampa da boca o gabarito segura ela (`GABARITO_S`, `estrada/chao.ts`; a viga e a placa em `LugaresChao`).
- **Teste**: `?parte=elevador.subir` e `?parte=elevador.deserto` (cartão na Mesa).
- **Código**: `app/linha/disco/elevadores.ts` (dados e o pedido da viagem), `trincheiras/Trincheiras.tsx` (botão, cabine, mapinha), `trincheiras/fisica.ts` (`estadoInicial(n)`), `estrada/Corrida.tsx` (nasce na torre, botão descer), `page.tsx` (liga as duas cenas).
- **T47 (RASCUNHO)**: o elevador de terror mora no 2 (`ELEVADOR_TERROR = 2`): a subida vira o percurso no poço, ver `docs/t47-terror.md`. BMX/skate chegam de patins, mas voltam na descida pelo elevador.
- **Depois**: Se ele desce pelo elevador de Kombi e volta pela boca, a Kombi aparece na boca.
