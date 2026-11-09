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
| 1 | Nectar | D-Bee | dbee (dunas até o bar), loop dos copos, conhecer o Mubarak (cena da oficina), show da Nectar no palco do bar (assistir/tocar). Sinuca livre depois |
| 2 | DopaminA | Mubarak | oficina (lixo, goteira, motor), fliperama (missão `notti`) |
| 3 | Copo Americano | Alohan | beat até o ginásio + basquete (missão `quadra`) |
| 4 | Ojalá | Nizzy | loja de discos (missão `mubarak`) |
| 5 | Swav | Tony Gordo | horta e prato (missão `tony`, versão atual) |
| 6 | Sexta-Feira | Drew | roupa (missão `drew`), grafite e corrida nos túneis (`tuneis`) |
| 7 | Sabe Ontem? | Ella | casa-galeria, filme, quadros (`ella`) |
| 8 | Rollercoaster | Notti | passeio na montanha-russa do parque (`nizzy`, versão atual) |
| 9 | CHUVA | LU2CA | perseguição + captura, fuga pelo metrô, show da CHUVA (`lu2ca`) |

## Saves antigos
Nada é regravado. O episódio é derivado das missões feitas (`feitas13`) e da fase da história; as músicas já ganhas (`guitar`) ficam. Ver o relatório do PR para o mapa antigo → novo.

## O final
Desde 09/11, `final.requer` são as missões dos 9 episódios (sem o Xeriff) e "os nove" são os donos das músicas, lidos de `EPISODIOS`. Ver `docs/final.md`.
