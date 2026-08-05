# feel-good.md — FEEL.GOOD redefinido (app de saúde mental)

> Conceito novo, ainda não implementado. Hoje o código (`app/feel-good/`)
> tem só a versão antiga (conecta-palavras), mantida como B-side
> (`legacyApps` em `app/page.tsx`), e o `C0D3X` é um ícone sem função no
> celular (ver `memoria.md`). Este arquivo documenta a redefinição pra não
> perder a ideia até entrar na fila de implementação.

## O que é

FEEL.GOOD deixa de ser só um minigame e passa a ser um **app de saúde
mental** dentro da experiência — "diálogos conscientes sobre sentir e o
mundo". O objetivo declarado pelo usuário: "nós vamos criar uma experiência
diferente de tudo".

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

## Em aberto

- O jogo antigo de conectar palavras do FEEL.GOOD (`legacyApps` /
  `app/feel-good/page.tsx`) — **ainda não decidido** se é substituído por
  completo por esse conceito novo ou se os dois convivem (o antigo como
  seção/easter egg dentro do mesmo app). Perguntei diretamente e a resposta
  não resolveu isso ainda — não presumir, confirmar antes de mexer no código
  do jogo antigo.
- Curadoria dos "sons distintos": de onde vêm, quantos, como se relacionam
  com o resto da paleta sonora do jogo — não definido ainda.
