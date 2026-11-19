# O piloto (05/11)

O dono: "o mapa é como se fosse um copiloto mesmo, que não só mostra como ir,
como também leva ao destino caso a pessoa coloque no piloto automático."
(bíblia §6)

## O botão

- O volante pequeno do lado da barra do GPS (era o ∞). Liga e desliga.
- Só de Kombi. A pé, de patins, de moto ou em outro veículo (depois da
  perseguição), o botão some e o piloto desliga.
- Toque no volante, acelerar, frear, virar, turbo ou propulsor: o controle volta
  pra você **na hora** (o piloto desliga, não volta sozinho).

## Com destino

- O destino é o mesmo do GPS (`destinoMundo` em `estrada/Gps.tsx`): o racha, a
  marca do mapa, a vaga da missão, o lugar do chão, as dunas.
- A Kombi vai pela rota do GPS (`NAV.rota`, `estrada/nav.ts`), a mesma da faixa
  no chão: no cruzamento, pega a via da rota; na rotatória, pega a saída certa
  e já puxa pra faixa da saída (`ladoDaFaixa`).
- Na velocidade da pista, sem turbo. No chão (deserto, voo), mira o destino em
  linha reta, na velocidade de passeio.
- Chegando: tira o pé e para a ~10 m do ponto. A missão começa pela regra de
  chegada de sempre (`estrada/alvoMissao.ts`). Parou, o volante volta.
- Se o destino trocar depois de chegar perto (a missão começou e já mostra o
  próximo passo), o piloto para ali. Longe, se você marcar outro lugar no mapa,
  ele segue o novo.
- Com o drone aberto (o GPS escondido), ele segue o último destino que viu.
- Destino de lugar do chão (lá embaixo): a rota leva até o ponto da pista mais
  perto dele e o piloto para ali. Dali o notch diz como descer.

## Sem destino

- Passeia pela pista de agora: a ida, a torre da ponta, a volta, e de novo,
  pegando na rotatória a saída da mesma pista. A mesma faixa segue tocando
  (bíblia §7: cada rua dura a música inteira).
- No chão do deserto, uma volta larga.

## A câmera

- Com o piloto levando (na pista), a câmera de fora fica de passeio: mais alta,
  mais longe e um pouco de lado, balançando devagar. Entra e sai suave (~2 s).
- Números em `Corrida.tsx`, procure `cd.pil` (`pil * 3.4` longe, `pil * 2.6`
  alto, `2.6 + sin · 1.1` de lado).

## O notch

- "piloto · até o copo" (com a distância), ou "piloto · passeando".
- Nada de banner: a navegação fica só no notch e no mapa (bíblia §9).

## Onde mexer

| o quê | onde |
|---|---|
| botão | `estrada/Gps.tsx` (`semPiloto`), `estrada/gps.css` (`.l-gps-auto`) |
| dirigir, parar, devolver | `estrada/Corrida.tsx`, procure `infAuto` / `destP` |
| cruzamento e rotatória | `estrada/Corrida.tsx`, procure `pelaRota` |
| notch | `escreverPiloto` em `estrada/alvoMissao.ts`, `AgoraNexo` em `estrada/Holo.tsx` |
| o "?" | `INFO.piloto` em `estrada/Holo.tsx` |

## Como testar (na Mesa)

1. Pega uma missão, liga o volante: a Kombi vai sozinha e para no lugar.
2. Na rotatória, ela pega a saída da rota (a faixa pintada).
3. No meio do caminho, vira: o controle volta na hora.
4. Sem missão, liga: ela fica na mesma pista, a música não troca.
5. Desce de patins/moto: o botão some.
