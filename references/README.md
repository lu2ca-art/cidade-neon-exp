# references/

Material de referência visual do projeto — screenshots, mockups e frames usados
para comparar contra o estado atual das telas durante o desenvolvimento. **Nada
aqui é carregado pelo app** (não é `public/`); é só para humanos e para o
Claude consultarem durante o trabalho.

## Estrutura

- `screens/` — screenshots de telas específicas da experiência (carro/drive,
  neon-tiles, home do celular, player, etc.), usados como referência de "como
  deveria estar" ou "como estava antes de tal mudança".

## Convenção de nomes

`<rota-ou-feature>-<detalhe>.png`, ex: `drive-cockpit.png`, `neon-tiles-final.png`.
Sem espaços, sem maiúsculas, tudo em kebab-case.

## Adicionando novas referências

Use a skill `add-reference-asset` (`.claude/skills/add-reference-asset/`) em vez
de simplesmente soltar o arquivo na raiz do repo — ela cuida do nome, do
destino certo e evita repetir a bagunça que essa pasta veio resolver.
