# O mundo depois (T29, 06/11/2026)

Ramo `feature/game/mundo-depois`. Fonte: `retomar-mundo.md`, "Como mostrar sem explicar": "Cabines e elevadores andando nos dois sentidos, o rio correndo pelas trincheiras (...) sob o vidro, plantas nas janelas dos prédios altos. Nenhum diálogo diz que a escolha é livre; as imagens mostram."

## Quando aparece

Depois que o jogador termina o final (a missão `final` feita no save; `page.tsx` liga `FINAL_VIVO.feito`). Durante a sequência do final não aparece. Antes do final nada é montado: custo zero.

## O que muda

| O quê | Onde | Como |
|---|---|---|
| Plantas nos prédios altos (30 m ou mais) | a cidade | tufos nas janelas e trepadeiras subindo da base. 2 malhas instanciadas, montadas uma vez, paradas |
| Cabines nos dois sentidos | as torres (a central e as das pontas) | 6 poços em volta do núcleo; em cada um, uma cabine clara sobe e uma azul desce. Andam no shader (por quadro: 1 número). 2 desenhos |
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
- **Plantas:** formas simples (octaedros e faixas verdes), até os modelos do Tripo. Não crescem na hora: já estão lá ao voltar pro jogo.
- **Rio:** é desenho, não física: dá para andar por cima dele de skate e de moto como antes. Sem som de água.
