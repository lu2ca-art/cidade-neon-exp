# Leveza 06/11 (T50): custo por quadro e draw calls na cidade e no subúrbio

Só leitura de código, sem medir (regra). Não repete `leveza-cidade-grande.md` nem as
revisões 2, 3 e 4 de 05–06/11 (céu, `tempoDaFaixa`, corrida de rua, chuva da câmera,
vida no subúrbio, densidade dos manifestos já estão lá).

## Corrigido

| onde | custo | correção | risco |
|---|---|---|---|
| `estrada/Parque.tsx` (useFrame do carrinho) + `parque/trilho.ts` (`quadro`) | `quadro()` criava 1 objeto + 4 `Vector3` (`clone`) por chamada, e mais um `clone()` pro `makeBasis`: ~6 objetos por quadro com o parque montado (até 700 m, parado) e ~14 na volta | `quadro(tr, u, out?)`: com `out` escreve nele (`lerpVectors`); o Parque passa dois quadros e um vetor guardados no `useMemo`. Sem `out` (a `/parque`) é como antes | baixo: mesma conta; o `q` reusado é lido antes de ser reescrito |
| `disco/Campo.tsx` (useFrame do campo de força) | a pé/de patins/de moto, 9 strings novas por quadro (chave da grade), um `[]` por célula vazia e uma closure no `sort` | chave numérica (`cx * 65536 + cz`), um vazio constante e o comparador no módulo | baixo: células de 48 m, a chave é única até ±1500 km |
| `trincheiras/Pilotos.tsx` (`Motoqueiro`, `PneuCravo`, usados na moto do jogo) | 19 `<mesh*Material>` inline = 19 materiais novos por montagem (cada peça com o seu: mais troca de uniform/estado por draw) | 15 materiais do módulo (`MAT_MOTO`), com as mesmas props (`roughness` 1 / `metalness` 0 = o padrão do JSX). Ciclista e Skatista (só nas trincheiras) não mudaram | baixo: os materiais não mudam no quadro; nunca são descartados (pequenos, uma vez por sessão) |

## Conferido, sem problema (não mexi)

- **Manifestos** (as 9 ruas): os `useFrame` só escrevem uniforms e vetores guardados; o
  `findIndex` do host só na rotatória, a cada 0,6 s. `setK`/`setAq` só na troca.
- **RuinasSuburbio/RuinasLuz**: uma luz pontual nenhuma (emissivo no shader), `InstancedMesh`
  pra letreiros/brilhos/tambores, o que só brilha some de dia. `ceuNaHora` já não aloca.
- **VidaSuburbio/VidaMiuda**: escrevem direto nos `Float32Array`; longe do subúrbio nem anda.
- **FeixeGuia**: 1 draw, sem `useFrame`. **TvHolo**: DOM (YouTube), sem custo no quadro 3D.
- **CorridaDeRua**: `forEach` só quando o portão muda; o `Object.assign` só na largada.
- **Luzes da cidade**: vêm do pool (`luzes.tsx`); a única luz presa na Kombi já é uma só.
  As outras `pointLight` moram nos interiores (salas), fora da cidade.
- **Sombras**: nenhum `castShadow` ligado na cidade.

## Fica pra quem é dono (não é mudança pequena)

| onde | custo | sugestão | dono |
|---|---|---|---|
| `Motoqueiro` (moto do jogo) | ~22 draw calls só pra moto e o piloto (uma por peça) | juntar as peças de cada grupo animado (rodas, garfo, quadro, piloto) por material com `mergeGeometries`: ~22 → ~8 draws | quem cuida dos pilotos |
| `estrada/Patins.tsx`, `Flores.tsx`, `FloresAsfalto.tsx`, `Monumentos.tsx` | uma closure de `forEach` por quadro (pequeno) | trocar por `for` quando alguém mexer lá | dono de cada um |
| `trincheiras/Trincheiras.tsx` | `c.rivais.forEach` com closure por quadro; é a página das trincheiras, fora da cidade | idem | trincheiras |

Na Mesa: a moto (cores e brilho iguais), o passeio do parque (o carrinho e a câmera),
o campo de força a pé encostando nos prédios.
