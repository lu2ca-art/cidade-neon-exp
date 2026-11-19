# Outdoors do Núcleo (T46, 06/11)

Coordenada do dono: os outdoors são de produtos do Núcleo (a corporação da cidade);
de vez em quando piscam os nomes das músicas do LU2CA, como se fossem hackeados.

## Onde
- Na cidade lá em cima (as pistas do disco): no laço dos prédios de `Corrida.tsx`,
  a fachada que olha a pista ganha uma placa (prédio com 18 m ou mais, ~60%).
  O sorteio é por hash da posição, não pelo `r()` da cidade: os prédios não mudam.
- A placa fica na altura da pista (entre +4 e +14 m), no máximo 26 m de largura, 2:1.

## Dados (`app/linha/estrada/outdoorsDados.ts`)
- `PRODUTOS`: 15 produtos fictícios (RASCUNHO: nome, slogan, cor).
- `OUTDOORS_CFG`: chance de placa, altura mínima, tamanho, ritmo do hack
  (`periodo` 12 s, `chanceHack` 0,1, `dura` 0,35), brilho, raio do `<Perto>`.
- O hack mostra a faixa da pista daquela rua (`pistas.ts`, pelo nome); fora das
  pistas, uma faixa sorteada.

## Arte (`app/linha/estrada/outdoorsArte.ts`, 08/11)
- Uma peça maximalista diferente por produto, na ordem de `PRODUTOS`; mesma célula
  de 512×256. Toda letra é medida e esticada pra caber na caixa (a fonte muda por aparelho).
- Sem `shadowBlur`. Fundo grande abaixo de 0,62 de luminância (o corte do bloom),
  e nenhum fundo preto: o hack é o único preto com ciano/magenta.

## Desempenho
- Um atlas único (canvas 2048×1536, gerado uma vez): 15 anúncios + 9 faixas.
- Uma `InstancedMesh` por quadra de 900 m (corte por frustum), todas com o mesmo
  `ShaderMaterial`; atributo instanciado `aIdx` (anúncio, faixa, semente).
- O glitch (troca de célula, deslocamento de linhas, RGB separado, scanline) é
  só conta no shader sobre `uTempo`: por quadro, uma escrita de uniform, zero alocação.
- Sem luz nova (placa emissiva, com névoa). Montado só perto (`<Perto>`, 900 m das quadras com placa).

## Teste
Mesa (`/teste`): cartão T46, parte `livre`.
