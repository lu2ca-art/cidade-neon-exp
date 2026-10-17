# Funil de modelos 3D (Tripo → jogo)

Todo modelo novo passa por aqui antes de entrar em `public/models/`. O CI barra o que estourar o orçamento.

## Orçamento (por arquivo, em `scripts/orcamento-modelos.json`)
| item | limite |
|---|---|
| tamanho | 1500 KB |
| triângulos | 40 000 |
| texturas | 4, no máximo 2048 px de lado |

Os 3 modelos que já estouram (`van`, `suburbio`, `kombi-herbal`) estão listados como `legado`: só geram aviso. Quando um deles for refeito, tire-o da lista.

## Passo a passo
1. No Tripo, gerar com a menor contagem de polígonos que ainda parece bom (opção low-poly/retopologia, se o plano tiver) e exportar **GLB**.
2. Salvar em `public/models/tripo/<nome>.glb`.
3. Otimizar (comprime geometria e texturas, remove o que não é usado):
   ```bash
   bunx @gltf-transform/cli optimize public/models/tripo/<nome>.glb public/models/tripo/<nome>.glb --compress meshopt --texture-compress webp
   ```
4. Conferir: `bun run modelos`. Se falhar, o relatório diz qual limite estourou.
5. Carregar com `useGLTF` do drei (já aceita Meshopt). Se usar Draco no lugar, o decoder baixa de um CDN: prefira Meshopt.
6. Testar no celular, não só no computador.

## Antes de pagar por mais modelos
Um modelo do Tripo sem retopologia costuma sair com muito mais triângulos que o orçamento. Gere 1 modelo de teste, rode o passo 3 e veja se ele cabe antes de produzir a série inteira.
