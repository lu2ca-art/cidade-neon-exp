# feel-good.md — FEEL.GOOD redefinido (um game de sentir)

> Conceito novo, ainda não implementado. Hoje o código (`app/feel-good/`)
> tem só a versão antiga (conecta-palavras), mantida como B-side
> (`legacyApps` em `app/page.tsx`), e o `C0D3X` é um ícone sem função no
> celular (ver `memoria.md`). Este arquivo documenta a redefinição pra não
> perder a ideia até entrar na fila de implementação.
>
> **Decisão (2026-08-05): o jogo antigo de conectar palavras é substituído
> por completo** — não convive como easter egg, sai de cena. FEEL.GOOD
> "se transforma no que ele realmente deve ser" (palavras do usuário): não
> é só um app de saúde mental, é **um game de sentir**.

## O que é

FEEL.GOOD deixa de ser um minigame de conectar palavras e vira **um game de
sentir** — um app de saúde mental dentro da experiência, com "diálogos
conscientes sobre sentir e o mundo". O objetivo declarado pelo usuário:
"nós vamos criar uma experiência diferente de tudo".

## Mecânica

- A pessoa **escuta** um som e descreve a sensação que sentiu.
- A pessoa **assiste** a algo e descreve o que sentiu.
- Conteúdo sonoro: **não são as músicas do LU2CA** — são sons distintos,
  desenhados especificamente pra gerar sensações diferentes entre si (mais
  parecido com uma trilha sensorial/terapêutica do que com as faixas do
  álbum).

## C0D3X mora dentro do FEEL.GOOD

O `C0D3X` (hoje um ícone sem função no celular) não é um app separado — é o
**bloco de notas pessoal** dentro do FEEL.GOOD, onde tudo que a pessoa
descreveu sentir (nas respostas de escutar/assistir) fica guardado. Ver
`memoria.md` para a intenção original de renderizar isso em 3D, como se
desse pra folhear e ler as páginas.

## O jogo antigo sai de cena

O conecta-palavras (`legacyApps` em `app/page.tsx`, `app/feel-good/page.tsx`)
é **substituído por completo** por este conceito — não fica como easter egg.
Quando a implementação entrar na fila: remover a entrada de `legacyApps` e
a rota antiga (ou redirecionar `/feel-good` pro novo game de sentir), sem
deixar as duas versões coexistindo.

## Em aberto

- Curadoria dos "sons distintos": de onde vêm, quantos, como se relacionam
  com o resto da paleta sonora do jogo — não definido ainda.
- Curadoria do conteúdo "assistir" (vídeos?) — fonte, formato, duração —
  não definido ainda.
