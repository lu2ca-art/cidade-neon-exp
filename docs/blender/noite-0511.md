# Noite de 05/11: subúrbio e interior da Kombi dentro do orçamento

Orçamento (scripts/orcamento-modelos.json): até 40 mil triângulos, 1,5 MB e 4 texturas por .glb.
Os dois arquivos saíram do `legado`, e `node scripts/verificar-modelos.mjs` passa (0 fora do orçamento).

| arquivo | triângulos antes | triângulos depois | MB antes | MB depois | texturas |
|---|---|---|---|---|---|
| public/models/suburbio.glb | 204.876 | 35.975 na tela (33.359 no arquivo) | 3,48 | 1,27 | 5 → 4 |
| public/models/kombi-interior.glb | 90.070 | 25.708 | 1,05 | 0,31 | 0 |

MB = 1.000.000 bytes (o verificador mede em KB de 1024: 3398 → 1237 KB e 1026 → 300 KB). "Na tela" conta cada cópia de prédio. "No arquivo" conta cada malha uma vez, que é como o verificador conta.

Retratos em Workbench (textura ou cor dos vértices), com a mesma câmera antes e depois:
- `suburbio-antes.png` / `suburbio-depois.png`: o bairro inteiro, de cima
- `suburbio-perto-antes.png` / `suburbio-perto-depois.png`: na rua, de frente pro mural do dragão
- `kombi-interior-antes.png` / `kombi-interior-depois.png`: duas vistas (do banco pro estúdio, do estúdio pra cabine)

## Subúrbio

### O que tinha

| parte | objetos | triângulos antes | triângulos depois (na tela) |
|---|---|---|---|
| prédios (ATLAS) | 101 | 123.851 | 3.038 (13 modelos, 101 instâncias) |
| chão, ruas e calçadas (ATLAS) | 16 | 18.110 | 12.051 |
| placas, postes, mural, lixo, carros (ATLAS_PROPS) | 34 | 59.359 | 20.886 |
| vidro das janelas (cristal) | 3 | 2.200 | 0 (saiu) |

(As contagens por parte são do Blender, por isso somam 203.520 e não 204.876.)

### O que foi feito
Receita: `GT=~/.npm/_npx/<hash>/node_modules blender/scripts/suburbio_tudo.sh`, que roda os passos abaixo em ordem.

1. **`glb_abrir.mjs`** desfaz o meshopt e a quantização, porque o importador do Blender não lê `EXT_meshopt_compression`.
2. **`suburbio_reduzir.py`** (Blender headless):
   - **Prédios.** Os 101 prédios são só 13 modelos, repetidos e girados de 90 em 90 graus. O script acha as cópias comparando os vértices nos 4 giros. Para cada modelo:
     - acha o plano de verdade de cada parede (o plano mais de fora que junta 20% da área daquele lado, fora cornija e sacada);
     - lê a altura por raio, num grid de 0,5 m;
     - monta uma caixa em degraus, com dissolve planar. Fica entre 10 e 50 triângulos por prédio, contra 700 a 1.900 antes;
     - assa a fachada original na caixa (Cycles, cor difusa, cage de 1 m) numa textura só. Ela é assada em 2048 e reduzida pra 1024;
     - as 88 cópias viram instâncias da caixa, no mesmo lugar e giro.

     Janela, sacada, cornija e marquise viram desenho na textura. O material novo, CASAS, tem uma face só, porque a caixa é fechada.
   - **O resto.**
     - junta os vértices repetidos;
     - apaga o que é degenerado e as faces de baixo coladas no chão;
     - nos objetos espalhados pelo bairro, apaga os pedaços soltos menores que 1,2 m que não acendem (a textura de emissão diz o que é neon);
     - faz dissolve planar sem cruzar costura de UV nem material.

     O mural do dragão e as placas de neon inteiras ficam intactos.
   - **Saíram:** o vidro das janelas (ficava dentro da janela funda, atrás da fachada nova) e o mapa especular (`KHR_materials_specular`, 534 KB + 45 KB). Ficam cor e emissão.
3. **`glb_simplificar.mjs`** passa o meshoptimizer no resto, com 10 cm de erro absoluto. Ele respeita a costura de UV, então a estampa não escorrega. Não mexe nos prédios nem no mural.
4. **`suburbio_final.py`** refaz a normal (aresta viva acima de 30 graus), conta os triângulos, tira o retrato "depois" e exporta.
5. **`npx @gltf-transform/cli optimize`** com `--compress meshopt --simplify false --join false --instance false --texture-compress webp --texture-size 1024`.
   - `--instance false` é de propósito: o `mesclarPorMaterial` do `Suburbio.tsx` pula `InstancedMesh`, e assim cada cópia segue sendo um nó comum que entra na mescla.

### O que muda no jogo
- **Material:** o material novo CASAS soma com ATLAS e ATLAS_PROPS, então continuam 3 materiais na mescla. O `cristal` sumiu, e com ele a troca do `vidroBarato`, que ficou sem uso (mas inofensiva).
- **Normal:** agora vem no arquivo, e o `computeVertexNormals` do `Suburbio.tsx` não roda mais.
- **De perto:** a fachada fica mais lisa. A janela funda e a sacada viram desenho, e a textura de 1024 borra um pouco a 10 m. De longe (da estrada elevada) quase não muda.

## Interior da Kombi
Foi regerado pelo próprio pipeline, que agora roda headless:

```
blender -b --factory-startup --python blender/scripts/kombi_interior.py \
  --python blender/scripts/kombi_interior_bake.py -- blender/cenas/kombi-interior-bruto.glb
npx @gltf-transform/cli optimize blender/cenas/kombi-interior-bruto.glb public/models/kombi-interior.glb \
  --compress meshopt --simplify false --join false --instance false --flatten false
```

| grupo | antes | depois |
|---|---|---|
| fosco | 64.738 | 18.910 |
| pelo | 11.874 | 3.176 |
| cromo | 7.242 | 1.582 |
| lata | 4.388 | 1.322 |
| brilho | 1.788 | 696 |

- **`kombi_interior.py`**
  - cilindros, esferas e toros com 60% dos gomos;
  - chanfros com menos passos;
  - ripas e tábuas com chanfro de um passo só (as 76 ripas eram 50 mil triângulos antes do decimate);
  - teclas e botões dos sintetizadores sem chanfro (2 mm não aparecem).

  As almofadas listradas (`fiel=True`) e a manta xadrez ficam como eram.
- **`kombi_interior_bake.py`**
  - a sombra de canto só divide aresta acima de 0,2 m (era 0,13);
  - as peças lisas levam decimate com uma razão só, calculada pra fechar 24 mil no total;
  - as estampadas não levam decimate: só dissolve planar, e a aresta entre cores diferentes vira costura, então o xadrez e as listras ficam iguais;
  - o caminho de saída virou argumento.
- **Conserto:** headless, a coleção original ficava visível no render e tapava a sombra das cópias (saía tudo escuro e com ruído). Agora ela leva `hide_render`.

## O que ficou faltando / pra conferir
- **Ver no jogo** (Mesa): fachada de perto, o mural de noite (a emissão é a mesma) e a sombra de canto no estúdio.
- **Fachada mais nítida:** se borrar demais de perto, dá pra assar os 13 modelos em 2048 (fica dentro das 4 texturas e do 1,5 MB?). Teria que medir.
- **Fora desta noite:** `kombi-herbal.glb` e `van.glb` continuam no legado.
- **Intermediários:** ficam em `blender/cenas/`, que é gitignored.
