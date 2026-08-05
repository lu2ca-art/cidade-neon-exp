---
name: add-reference-asset
description: Adiciona um screenshot ou mockup novo à pasta references/ do projeto com o nome e o lugar certos, em vez de soltar o arquivo na raiz do repo. Use quando o usuário mandar uma imagem de referência/mockup/screenshot para guardar no projeto (não confundir com um asset que o app vai carregar - esses vão em public/).
---

# Adicionar material de referência

O repo já teve um problema de screenshots soltos direto na raiz (`drive-1.png`,
`neon-tiles-final.png`, etc. — hoje vivem em `references/screens/`). Esta skill
existe para não repetir isso.

## Primeiro, distinga referência de asset

- **Referência** (usa esta skill): screenshot, mockup, print de "como estava"
  ou "como devia ficar" — serve pra consulta humana/do Claude, o app nunca
  carrega esse arquivo. Vai em `references/`.
- **Asset real** (não usa esta skill): imagem/áudio que algum componente
  React de fato importa/renderiza (`<Image src="...">`, background,
  avatar). Isso vai em `public/images/` ou `public/audio/`, e depois disso
  passa a fazer parte do bundle servido — não é "referência".

Se não tiver certeza, pergunte ao usuário antes de mover.

## Passos

1. Confirme o destino: hoje só existe `references/screens/` (screenshots de
   telas). Se o material for de outra natureza (ex: paleta de cores, áudio de
   referência, brief de design), crie uma subpasta nova em `references/` com
   nome descritivo (`references/palette/`, `references/briefs/`) em vez de
   forçar tudo dentro de `screens/`.

2. Renomeie o arquivo para `<rota-ou-feature>-<detalhe>.png` (kebab-case,
   minúsculo, sem espaço) se o nome original não seguir isso — ex: um
   screenshot da tela do rádio vira `radio-<detalhe>.png`, não `Screenshot
   2026-08-05 at 14.32.11.png`.

3. Mova o arquivo com `git mv` (ou adicione com `git add` se for novo) para
   dentro da subpasta certa de `references/`.

4. Se for um tipo de material novo (não um screenshot de tela), adicione uma
   linha em `references/README.md` descrevendo a subpasta.

5. Não referencie esses arquivos de dentro de `app/`, `components/` ou
   `lib/` — se algum código precisar importar a imagem, ela deveria estar em
   `public/`, não aqui (mova pra lá em vez de importar de `references/`).
