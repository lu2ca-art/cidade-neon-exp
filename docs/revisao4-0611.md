# Revisão 4 (06/11): integração T49, T64, Ojalá

Escopo: `7db868c..origin/feature/game/mapa-disco`. Só leitura de código e `tsc` (sem build, sem playwright, sem medição).

## Bugs corrigidos

| Bug | Causa | Correção | Arquivo | Commit |
|---|---|---|---|---|
| No salão do metrô, o botão "entrar no trem" cobria o botão do grafite livre (mesmo lugar na tela) e o aviso do cadeado dos dois se sobrepunha | `MetroTuneis` reaproveitou `.gf-botao`/`.gf-aviso` (centro, mesma altura) das paredes de tag, que também aparecem perto do salão | classe `is-metro`: o botão e o aviso do trem vão para a esquerda (`left: 24%`) | `app/linha/disco/MetroTuneis.tsx`, `app/linha/grafite/grafite.css` | ver `git log` do ramo `feature/game/revisao4` |

## Conferido, sem bug

- Save antigo: `tagLivre`, `grafites`, `instrumentos`, `instrumentosVistos` são opcionais e lidos com `?? []`/`?? null`.
- Trilha que abaixa: `abaixarUmPouco` é contador (soma/subtrai), o violão desfaz no cleanup e fica escondido nas cenas/trincheiras; não briga com o duck da cena nem da `IntroMissao`.
- Instrumentos: `useFrame` sem alocação (geometrias/materiais no módulo); `fazerMusica` só na cena `dbee-instrumentos`, o que bate com o cartão.
- Intervalos/timeouts (`MetroTuneis`, `Grafite`, `Violão`, `useSomTocando`) têm limpeza.
- Trincheiras pausadas (`frameloop "never"`): o laço fixo limita o `dt` a 0,1 s, então não há salto ao voltar.
- Partes de teste (`grafite.livre`, `metro.tuneis`, `instrumentos`) abrem o que os cartões da Mesa descrevem (descer livre com a missão dos túneis feita; os 11 instrumentos ganhos e vistos).

## Para o dono olhar (não mudei)

- O botão "pronto ›" da dica dos instrumentos também aparece na cena com instrumento novo e deixa pular sem tocar os novos.
- `tagLivre` fica no módulo do `geo.ts` entre visitas (só importa se o save for trocado sem recarregar a página).
