# narrativa.md — a história por trás (o "porquê")

> Isto explica o motivo narrativo/emocional do que já existe na experiência
> — não é uma feature nova, é o contexto que dá peso ao que já está
> construído. Consultar sempre que for escrever texto, diálogo, ou qualquer
> coisa que precise carregar a voz real do projeto (não só a estética).

## O tema central: independência

CIDADE NEON nasce de uma ideia: hoje a internet e a indústria musical são
dominadas por grandes empresas bilionárias e por gente com dinheiro pra
investir — quem entra sem isso depende da aprovação de terceiros pra fazer
o que nasceu pra fazer. LU2CA está construindo o oposto disso: um espaço
próprio e independente pra vender música, propagar arte e se conectar com
quem escuta, sem precisar da permissão ou da estrutura de ninguém.

É esse tema — **"criar meu próprio espaço, sem depender de ninguém pra
dizer se eu posso"** — que justifica a sequência de hacker/invasão logo no
início da experiência (o celular da pessoa sendo "invadido").

### Pendência conhecida

Hoje essa sequência existe no código (`HACKER_LINES` em `app/page.tsx`) só
como estética Matrix/terminal — glitch, scramble de texto, linhas tipo
`sudo rm -rf /system/security/*`. Ela **não carrega essa história** ainda;
é só clima, sem significado por trás pra quem joga. O usuário identificou
isso: "está muito do nada, só eu sei a história por trás".

Fica registrado como algo a resolver: achar uma forma **leve** (não
didática, não expositiva, sem virar um textão sobre a indústria musical
dentro do jogo) de fazer essa invasão carregar esse significado — a ideia
de tomar de volta um espaço, não pedir passagem pra ninguém. Ainda não foi
decidido como; é trabalho em aberto, não fazer sem validar direção com o
usuário primeiro.

## Multiplicidade em vez de "escute essa música"

O projeto não quer ser "aqui está uma música, escute" — quer trazer
multiplicidade de estímulo, porque é assim que a atenção funciona hoje
("tudo é muito estímulo hoje, então eu estou trazendo muito estímulo
também" — palavras do usuário). Isso já está espalhado pela experiência:

- Um **carro** (`/drive`) — o estúdio/veículo da jornada.
- Um **celular navegável** dentro da experiência, com:
  - acesso a missões e ao mapa;
  - links exclusivos pra baixar os projetos que a pessoa ganha como
    recompensa dentro do app;
  - links reais pra fora — Instagram (`_IRIS.EXE`), YouTube (`STR34M`);
  - **//LOOP** — uma espécie de plataforma de vídeos verticais em loop,
    onde LU2CA expõe pensamentos e conteúdos que só quem chega até ali
    (depois de passar pelas 3 confirmações) tem acesso. É deliberadamente
    raro e único — não é feed público, é recompensa de quem completou a
    jornada.

## Onde isso se conecta com a prioridade atual

A prioridade combinada agora (ver `specs/design.md` → Tom) é função + texto
+ emoção + tom de voz do que já existe, single-player, antes de multiplayer
ou multi-artista. É isso que faz essa multiplicidade e o tema de
independência serem **sentidos de verdade** — sem esse cuidado, a
experiência vira só estética synthwave bonita, sem peso por trás.
