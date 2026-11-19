# Os veículos sem motor no Blender (06/11)

Os patins com o jato, o skate e a BMX do jogador, feitos de sucata do subúrbio
com neon (o mesmo estilo da moto, `docs/moto.md`). Só os veículos: o corpo do
jogador continua o do código. Foto: `docs/blender/rodas.png`.

- **Patins**: tênis de cano alto velho (lona, biqueira de borracha), alça de
  câmara de ar com fivela, chassi de duas chapas rebitadas (alumínio e zinco),
  4 rodas neon (uma rosa, de outro par), freio de toco de pneu, neon na sola.
- **Jato das costas**: um extintor vermelho e um botijão de zinco numa placa de
  rua, cano até o bocal com anel neon, manômetro, alças de câmara de ar. A chama
  é a do código (acende no propulsor).
- **Skate**: tábua velha com os bicos e lixa, placa de rua azul embaixo,
  remendo de zinco no bico, fita prata no rabo, neon nas bordas, uma roda rosa.
- **BMX**: quadro rosa com um lado trocado por tubo enferrujado, reforço de zinco
  rebitado, aros diferentes (um escuro, um cromado) com o neon, placa do número
  "12" de placa de rua com moldura neon, pegs de cano, neon amarrado no quadro.

## Arquivos

- `blender/scripts/rodas.py` → `public/models/rodas.glb` (comandos no topo do script)
- `blender/scripts/rodas_foto.py` → `docs/blender/rodas.png`
- `app/linha/estrada/pecas.ts`: o `MAT_PECAS` (agora compartilhado: moto, patins,
  skate, BMX) e a leitura de um nó do glb (`geoDoNo`)
- `app/linha/estrada/Patins.tsx` (Patinador) e `app/linha/trincheiras/Pilotos.tsx`
  (Ciclista, Skatista): cada um dentro de `ModeloSeguro`; enquanto baixa ou se
  falhar, o procedural de antes

## Os nós (no referencial do pivô do código)

| nó | onde | anima |
|---|---|---|
| `patins` | perna do Patinador (o mesmo nas duas) | a perna empurra |
| `jato` | corpo do Patinador | a chama (do código) acende |
| `skate` | a prancha | kickflip/heelflip, pulo |
| `bmx_roda_t` / `bmx_roda_f` | eixo de cada roda | giram com a velocidade |
| `bmx_guidao` | eixo da direção (z = 0,45) | vira, barspin |
| `bmx_quadro` | o Ciclista | tailwhip |

## Números

- 5.136 triângulos no total (orçamento 8 mil), 113 KB (orçamento 250 KB)
- Um material só (`MAT_PECAS`, cor/roughness/metalness/brilho nos vértices,
  AO assada); o disco neon das rodas da BMX é um material transparente pras duas
- Desenhos: patins 13 → 3 (2 patins + jato), skate 8 → 1, BMX 13 → 6
- Sem luzes novas, nada novo por quadro
