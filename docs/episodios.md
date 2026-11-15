# Os 9 episódios (08/11)

Fonte: `projetos/cidade-neon/episodios.md` e bíblia §10 a §15. A sequência mora numa tabela só:
**`app/linha/disco/episodios.ts` (`EPISODIOS`)**. Mudar a ordem = editar as linhas e o campo `etapa`.

## Como a tabela funciona
- Cada linha: a música, quem apresenta, a `etapa` e as peças.
- Mesma `etapa` = qualquer ordem (o 4 e o 5 abrem juntos). O número do episódio é a posição da linha.
- Peça `missao` = uma missão de `portas.ts` (os ids antigos ficam: os saves guardam `drew:arte` etc.). Peça `marco` = algo que o save já diz (`MARCOS`).
- As peças de um episódio vão na ordem da linha. Episódio feito = todas as peças feitas (derivado do save, nada novo gravado).
- `LIVRES` (o Xeriff): fora da sequência, aparece sempre, não conta.

## O que segue a tabela
- A feira e o mapa: só as missões do episódio de agora (`disponiveis`), na ordem da sequência; o rótulo é "ep. N · Música".
- A D-Bee sugere essas missões (peso maior que as livres); o Nexo diz "ep. N · quem" sem missão pegada.
- A luz das ruas (`luzDosEpisodios`): feita = episódio feito, acesa = etapa de agora.
- O cadeado diz "abre no ep. N · Música (quem)" (`trancado`, `facaMissao`).
- Guitar Driver e MP3 (B4TIDA): a música abre quando o episódio fecha (`musicasLiberadas`). Os níveis (palcos) estão livres desde o primeiro play (`PALCOS_CONFIG.nivelLivre`).
- A perseguição da Kombi começa quando o ep. 9 abre (`CONFIG_PERSEGUICAO.porEpisodio`).

## Quem é quem (peças existentes reencaixadas)
| ep. | música | quem | peças |
|---|---|---|---|
| 1 | Nectar | D-Bee | dbee (dunas até o bar), loop dos copos, conhecer o Mubarak (no bar; save antigo: na oficina), show da Nectar no palco do bar, ao lado da D-Bee e do Mubarak (`ShowNoBar`: assistir cantando da plateia, com sinuca enquanto ouve, ou tocar). Sinuca livre depois |
| 2 | DopaminA | Mubarak | oficina (lixo, goteira, motor), fliperama (missão `notti`) |
| 3 | Copo Americano | Alohan | ligar o piloto, fazer o beat no caminho (`BatidaMissao` com `caminho`), chegar ouvindo (`beatDoCaminho`), o esporte que preferir (`EscolhaEsporte`: basquete, ping pong ou ginástica). Missão `quadra` |
| 4 | Ojalá | Nizzy | loja de discos (missão `mubarak`) |
| 5 | Swav | Tony Gordo | a feira no subúrbio: a barganha cortando legumes (`disco/feira.ts`) e o prato no fogão da feira, também no mundo (missão `tony`) |
| 6 | Sexta-Feira | Drew | roupa (missão `drew`), grafite e corrida nos túneis (`tuneis`) |
| 7 | Sabe Ontem? | Ella | casa-galeria, filme, quadros (`ella`) |
| 8 | Rollercoaster | Notti | passeio tranquilo de metrô (`nizzy`, o evento segue `montanha`) |
| 9 | CHUVA | LU2CA | perseguição + captura, fuga pelo metrô, show da CHUVA (`lu2ca`) |

## O Alohan no ginásio (§11)
Em toda visita ele vai junto: banco do carona indo pra lá (marca no mapa, porta ou missão) e em pé dentro dos três esportes (`app/ginasio/alohan.tsx`, nos jogos: vale por qualquer porta, inclusive a quadra).

## Os shows (§12)
Sem instrumento, a pessoa canta da plateia (`ShowAfinador`): o medidor é dela, a faixa original não muda e a plateia simulada (`PLATEIA`) é que desafina e distorce. Quem termina pode repetir.

## Saves antigos
Nada é regravado. O episódio é derivado das missões feitas (`feitas13`) e da fase da história; as músicas já ganhas (`guitar`) ficam. Ver o relatório do PR para o mapa antigo → novo.

## O povo (09/11)
A lotação dos shows e a vida do subúrbio saem de `app/linha/disco/povo.ts` (`lotacaoDoPovo`): derivada do save, o mínimo pelas peças feitas dos episódios, a popularidade somando por cima. Os tetos por aparelho ficam em `QUANTO` (estrada/vidaNasRuas.ts).

## O final
Desde 09/11, `final.requer` são as missões dos 9 episódios (sem o Xeriff) e "os nove" são os donos das músicas, lidos de `EPISODIOS`. Ver `docs/final.md`.


## O Xeriff (14/11, o dono)

- É **da polícia dos robôs**. Ficou lá dentro porque é filho de um tirano louco que **morreu com as próprias armas que criou**.
- O ping pong saiu da missão dele ("não faz nenhum sentido"). A missão agora é: encontrar ele na plataforma → sintonizar a frequência da polícia.
- A fala de entrada (`introMissoes.ts`) é rascunho em cima disso; o dono reescreve.
