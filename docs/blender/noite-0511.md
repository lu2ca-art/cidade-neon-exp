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

## Parte 2: as ruínas do subúrbio (cidade destruída, com física)
Nota do dono (03/11): "adicione mais desse modelo do subúrbio no mapa, mas vamos passar ele no Blender e modelar uma cidade mais destruída com essa que temos, pra poder ter a física certinha ali também com os objetos."

**Onde ficam.** No chão do subúrbio de verdade, o de jogar (`SUBURBIO` em `disco/historia.ts`: centro -740, -680, raio 260 m), onde estão o bar, a oficina, a quadra, a boca dos túneis, a goteira, o palco e a torre. O modelo antigo (`suburbio.glb`, em `centroSub`, a uns 700 m dali, embaixo das pistas) ficou como estava. As caixas procedurais de dentro do subúrbio saíram; o anel de casas baixas de fora ficou.

### O kit: `public/models/suburbio-ruinas.glb`
| | antes | depois |
|---|---|---|
| peças | (não existia) | 42: 13 prédios inteiros, 13 "topo", 13 "andar", 3 montes de entulho |
| triângulos no arquivo | | 5.102 (inteira 10–50, topo 130–290, andar 100–240, entulho 64) |
| tamanho | | 284 KB, 1 textura de 1024 |

Script: `blender/scripts/suburbio_ruinas.py` (lê o mesmo `suburbio-aberto.glb` da parte 1).
- **Os 13 modelos** saem com a mesma técnica da parte 1: mapa de altura de 0,5 m no plano da parede de verdade e a fachada original assada (Cycles, cor difusa).
- **"topo":** o topo desmorona em diagonal a partir de um canto, em degraus de 2 m. O canto mais baixo some, e o entulho fica em cima do pé dele e escorre pra rua.
- **"andar":** falta um andar inteiro (de 30 a 45% da altura, 3 m de vão). Os pilares da beirada (a cada 5 m e nos cantos) seguram o resto, e um canto de cima foi arrancado. Tem entulho na base.
- **Textura:** a parede que sobrou usa a MESMA fachada assada da inteira (o UV vem do plano dela). O que é quebra (topo partido, a laje de baixo do vão, os pilares, a parede de dentro) e o entulho usam concreto e entulho pintados na faixa da direita da textura (u de 0,875 a 1), puxados pra paleta do bairro.
- **Pivô e escala:** o pivô fica no centro do pé, no chão, e a escala do jogo (1,4) já vem aplicada.

### O traçado (gerado pelo mesmo script em `app/linha/estrada/ruinasDados.ts`)
- **Quadras e ruas:** quadras de 40 m com 4 lotes de 20 m e ruas de 12 m numa grade (o bar fica num cruzamento). Dá pra andar a pé, de patins e de moto.
- **O que vai em cada lote** (sorteio fixo): 12% só entulho, 25% prédio inteiro, 33% "topo" e 30% "andar", girado de 90 em 90 graus. Só entra peça que cabe no lote.
- **Fica livre:** 30 m em volta de cada lugar do chão (44 m da quadra), a rampa da boca do túnel e a chegada a pé.
- **Resultado:** 213 peças (183 prédios e 30 montes) e 439 caixas de colisão.
- **Triângulos:** com tudo montado, 24.840 na tela.

### No jogo
- **`ruinas.ts`**
  - assenta cada peça no ponto mais baixo do relevo embaixo dela (`M.chao`), 0,4 m enterrada;
  - tira a que cai em pista ou torre (`M.livre`) ou a menos de 20 m de um lugar do chão;
  - devolve as caixas de colisão no formato dos prédios (`COL_PASSO` = 9).
- **`RuinasSuburbio.tsx`**
  - monta o kit mesclado por célula (6 × 6) e congelado (`Estatico`);
  - só carrega perto do subúrbio (`<Perto>`, raio 960 m) e só no mapa-disco.
- **`Corrida.tsx`**
  - as caixas das ruínas entram em `cidade.colisores`, então o mesmo `bater`/`grudar` vale a pé, de patins e de moto;
  - o topo do campo de força fica abaixo do chão, então a cerca holográfica não aparece nas ruínas;
  - as caixas procedurais de dentro do raio do subúrbio saíram.
- **Física:** uma caixa por prédio (o pé do que ficou em pé, até o maior topo) e uma por monte de entulho. Tudo estático: o jogo não tem física de objeto solto. O "atropelo" é só da Kombi, e a Kombi não entra no subúrbio.

### Os lugares do chão: nenhum dentro de prédio novo
`python3 blender/scripts/ruinas_conferir.py` lê as fontes (`historia.ts`, `ruinasDados.ts`) e mede a distância até a parede ou entulho mais perto:

| lugar | distância |
|---|---|
| bar | 34,7 m |
| oficina | 33,5 m |
| palco | 34,6 m |
| quadra | 45,1 m |
| túneis | 34,8 m |
| rampa do túnel | 16,0 m |
| goteira | 37,9 m |
| torre | 36,5 m |
| chegada a pé | 44,3 m |
| casa da D-Bee | 1,4 km (fora do subúrbio) |

### Retratos
Workbench, chão liso; no jogo o chão é o relevo das dunas.
- **`ruinas-kit.png`:** os 13 modelos, com a inteira atrás, o "topo" no meio e o "andar" na frente.
- **`ruinas-bairro-antes.png` / `-depois.png`:** o subúrbio de cima. "Antes" é só o chão e os lugares (as colunas); as caixas procedurais de antes não entram no retrato.
- **`ruinas-rua-antes.png` / `-depois.png`:** no meio de uma rua norte-sul, a 1,8 m do chão.

### O que ficou faltando / pra conferir (parte 2)
- **Ver no jogo** (Mesa):
  - o relevo: onde a duna inclina muito, a peça pode ficar mais enterrada de um lado;
  - a escala a pé;
  - se a rua de 12 m é boa de moto.
- **Ruas sem asfalto:** as ruas são o chão das dunas mesmo; não tem calçada nem rua desenhada.
- **Sem objeto solto:** não há latas nem pedaços dinâmicos (o jogo não tem física pra isso). O entulho é estático, com colisão.
- **Sem luz:** as ruínas não acendem (sem neon nem janela acesa). De noite ficam escuras como o modelo antigo.

## Parte 3: kombi-herbal.glb e van.glb fora do legado (o `legado` ficou vazio)
| arquivo | triângulos | tamanho | texturas | o que foi feito |
|---|---|---|---|---|
| kombi-herbal.glb | 47.174 → 33.013 | 958 → 849 KB | 1 (2048) | meshoptimizer (razão 0,7, erro 0,2%) respeitando a costura de UV (`glb_simplificar.mjs`) |
| van.glb | 21.382 (igual) | 2.275 → 366 KB | 6 → 4 | `van_orcamento.mjs`: sai o mapa de normal e o de metal/rugosidade das rodas; o resto vai pra 1024 webp + meshopt |

- **kombi-herbal:** o modelo (fotogrametria, sem normal) segue sem normal, e o `KombiHerbal.tsx` recalcula como antes. Retratos: `kombi-herbal-antes.png` / `-depois.png`; quase não muda.
- **van:** só a `/van-preview` usa. Retratos: `van-antes.png` / `van-depois.png`.
