# O mundo depois (T29, 06/11/2026)

Ramo `feature/game/mundo-depois`. Fonte: `retomar-mundo.md`, "Como mostrar sem explicar": "Cabines e elevadores andando nos dois sentidos, o rio correndo pelas trincheiras (...) sob o vidro, plantas nas janelas dos prédios altos. Nenhum diálogo diz que a escolha é livre; as imagens mostram."

## Quando aparece

Depois que o jogador termina o final (a missão `final` feita no save; `page.tsx` liga `FINAL_VIVO.feito`). Durante a sequência do final não aparece. Antes do final nada é montado: custo zero.

## O que muda

| O quê | Onde | Como |
|---|---|---|
| Plantas nos prédios altos (30 m ou mais) | a cidade | tufos nas janelas (3 modelos), trepadeiras em módulos subindo da base e cachos de flores acesas. 7 malhas instanciadas, montadas uma vez, paradas |
| Cabines nos dois sentidos | as torres (a central e as das pontas) | 6 poços em volta do núcleo; em cada um, uma cabine de vidro sobe (vidro e faixa de luz claros) e outra desce (azuis). Andam no shader (por quadro: 1 número). 4 desenhos |
| O rio nas trincheiras | os túneis | uma fita de água no meio do leito de cada rio e um espelho em cada salão; a água corre do salão de cá pro de lá. A rampa da descida e o salão dela ficam secos (a água aparece ao chegar na TORRE 1). O letreiro "RIO SECO A" vira "RIO A". 1 desenho |
| A porta "o mundo depois" | a recompensa do final | deixa de ser "em breve" (`portas.ts`) |

Sem luz nova. Os números (quantas plantas, a velocidade das cabines, a largura e a velocidade do rio) ficam em `disco/final.ts`, `MUNDO_DEPOIS`.

## Onde mora

- `app/linha/disco/final.ts`: `MUNDO_DEPOIS` (os números).
- `app/linha/estrada/MundoDepois.tsx`: plantas e cabines (montado no `Corrida.tsx`, ao lado do `FinalNove`).
- `app/linha/trincheiras/RioDepois.tsx`: o rio (montado no `Trincheiras.tsx`).
- Testes: `?parte=mundo.depois` (chega na torre central) e `?parte=mundo.depois.tuneis` (desce pros túneis). Cartão na Mesa.

## Versão mínima (o que ficou para depois)

- **Cabines:** só os elevadores das torres. Não há bondinhos nem cabines nas pistas, e antes do final as torres não têm cabines "num sentido só" para comparar. Se o dono quiser, o antes pode ganhar cabines só subindo.
- **Plantas:** modeladas (abaixo). Não crescem na hora: já estão lá ao voltar pro jogo.
- **Rio:** é desenho, não física: dá para andar por cima dele de skate e de moto como antes. Sem som de água.

## Modelado no Blender (06/11)

Ramo `feature/game/blender-depois`. `blender/scripts/mundo_depois.py` → `public/models/mundo-depois.glb` (50 KB, 1.915 triângulos no arquivo); foto `blender/scripts/mundo_depois_foto.py` → `docs/blender/mundo-depois.png` (um prédio tomado pela planta, à noite, e uma cabine subindo no poço).

| Peça | Triângulos (limite) | O que é |
|---|---|---|
| `tufo_a` | 166 (300) | jardineira de barro com folhas grandes caindo pela borda |
| `tufo_b` | 192 (300) | moita de folhas grandes saindo da janela |
| `tufo_c` | 256 (300) | vaso com 3 ramos pendentes |
| `trep_base` | 247 (400) | monte de terra, raízes, touceira; 3 m |
| `trep_meio` | 258 (400) | 2 caules e 14 folhas; 6 m; entra e sai nos mesmos x (empilha) |
| `trep_topo` | 204 (400) | os caules se curvam pra fora, folha nova; 2,5 m |
| `broto` | 38 (60) | 3 florzinhas de 5 pétalas e 2 botões, acesas (`_luz`) |
| `cabine` | 554 (1500) | piso, teto, 4 colunas, corrimão, banco, 2 vasos, planta pendurada e no teto (`_solido`); 4 vidros (`_vidro`); faixa de luz e luminária (`_luz`) |

Pipeline como os elevadores: cor no vértice × AO assada (Cycles) × luz falsa, gravada ×4 (o jogo usa cor 0,25); sem normais (MeshBasic, dos dois lados). No jogo (`MundoDepois.tsx`): as mesmas posições e quantidades de antes (o mesmo sorteio); o que é novo (qual tufo, as flores, quantos módulos) sorteia em outro. Os tufos e as trepadeiras agora encostam na parede e olham pra fora (antes a forma era simétrica e virava de qualquer jeito); o pé da trepadeira fica 3,6 m acima da base do prédio (ele nasce enterrado 4 m). A trepadeira é base + N meios (N pela altura, esticados até caber) + topo. A cabine: vidro e faixa na cor de quem sobe/desce, estrutura com a cor própria. Se o .glb falhar: as formas de antes.

Números novos em `MUNDO_DEPOIS`: `maxModulos` 2400, `trepChao` 3,6, `brotoTufo` 0,6, `brotoModulo` 0,7, `maxBrotos` 5000.

**Custo (pior caso, todos os limites cheios):** tufos 2.600 × ~205 ≈ 530 mil tri; módulos 2.400 × 258 ≈ 620 mil (+ bases e topos ≈ 1.400 × 450 ≈ 630 mil); brotos 5.000 × 38 ≈ 190 mil; cabines ≈ 50 × 600 ≈ 30 mil. A conta real depende de quantos prédios altos há (não medido aqui). Desenhos: 11 (eram 4). As instanciadas cobrem a cidade inteira (uma esfera só): não há corte por distância. Se pesar no iPhone: baixar `maxTufos`/`maxModulos`/`maxBrotos`, ou partir as instanciadas por setor da cidade pra o corte da câmera funcionar.
