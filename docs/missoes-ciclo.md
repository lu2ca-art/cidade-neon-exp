# O ciclo das missões (missões claras, 02/11)

O dono: "aceitei uma missão, mostra no mapa o lugar marcado, mas quando chego lá a missão não inicia. Não dá pra saber o que tem que ser feito."

O ciclo de cada missão: **pegar no mapa → ícone + feixe no lugar → chegar → a peça abre (arte ou jogo) → a próxima peça → a porta → a recompensa**. A tabela das missões é `app/linha/disco/portas.ts` (MISSOES13); quem abre cada peça é `chegouNaMissao` em `app/linha/page.tsx`.

## O que estava quebrado (vale pra todas)

1. **O ícone do mapa ficava num lugar e o gatilho em outro.** O ícone (mapa 2D, minimapa e o feixe do drone) era posto na PISTA da faixa da missão, a ~55% dela (`uDaMissao`, chave `missao:<faixa>`). O gatilho era o LUGAR da missão (`lugar:<id>` na tabela do mundoDisco, ou um ponto do chão do subúrbio). Pontos diferentes: chegava no ícone e nada. As missões do subúrbio (quadra, túneis) tinham o ícone lá em cima, na cidade, e o gatilho embaixo, no chão. Túneis e Xeriff (sem faixa) nem tinham ícone.
2. **O gatilho de um lugar da cidade só valia na mesma via da vaga** (`j.via === vg.via`, no quadro). Na outra mão da pista (cada pista tem ida e volta), voando, de patins com o jetpack (a missão do Drew), ou chegando por outra pista que passa perto: passava em cima do lugar e não começava.
3. **O gatilho do chão só valia no chão, parado de pé** (`j.voo && !j.ar`, raio 22 m). Chegando voando da cidade e pairando em cima da quadra: nada. Os túneis só valiam na porta, lá no fundo da rampa (`naBoca`), sem nenhum aviso de que era pra descer.
4. **Se algo estava na tela na hora de chegar** (a recompensa de antes, uma peça), a chegada era engolida e só valia de novo saindo e voltando, sem aviso.
5. **O Nexo dizia só o nome da peça** ("▸ o jogo · a partida de basquete"), sem onde ir nem a distância.
6. **A coluna de luz do lugar só montava perto** (600–700 m, dentro de `Perto`) e tinha 44 m: de longe não se via pra onde ir.

## Missão por missão

Onde começa: a chave do lugar (a posição vem de `M.onde`, a tabela do mundoDisco: pista e fração da ida) ou o ponto do chão (x, z em metros). Agora é a MESMA coordenada pro ícone, o feixe, o GPS, a distância do Nexo e o gatilho (`app/linha/estrada/alvoMissao.ts`, `pontoDoAlvo`).

| Missão | Onde começa (coordenada) | Peças (ordem) | O que estava quebrado | O que mudou |
|---|---|---|---|---|
| D-Bee | `lugar:casa-dbee` (fim da estrada do deserto, Ojalá 94%) | tambor → drift/holo (a história) | nada (prólogo, a história leva) | aparece apagada no mapa como feita |
| Oficina | chão `oficina` (x −560, z −626) | catar → goteira (a história) | nada (prólogo) | apagada no mapa como feita |
| Quadra · Alohan | chão `quadra` (x −860, z −790) | BATIDA → basquete 6 pts/45 s | ícone na pista Sabe Ontem?, lá em cima na cidade; o gatilho no chão só de pé (chegando voando não valia) | ícone e feixe na quadra; vale de Kombi, patins ou voando baixo (até 14 m do chão), raio 32 m |
| Túneis | chão `tuneis` (x −610, z −830, a porta no fundo da rampa) | grafite → corrida nas trincheiras | sem faixa = sem ícone; só valia na porta lá embaixo, sem aviso | ícone e feixe na boca; vale já na rampa (32 m da porta); perto, o Nexo diz "desce a rampa até a porta do túnel" |
| Drew | `lugar:casa-drewboy` (Sexta-Feira 45%) | de patins e jetpack até ele → a moda | ícone em outro ponto da pista Sexta-Feira; de jetpack (voando) ou na outra mão o gatilho não pegava | ícone no lugar; vale de patins/jetpack em qualquer via, raio 38 m |
| Mubarak | `lugar:palco-copo` (Copo Americano 60%) | disco antigo → sinuca | ícone em outro ponto da pista; outra mão não valia | ícone no palco; vale em qualquer via, raio 38 m |
| Xeriff | `lugar:plataforma` (Nectar 42%) | ping pong → sintonia (depois do LU2CA) | sem faixa = sem ícone nenhum | ícone e feixe na estação; vale em qualquer via |
| LU2CA | `lugar:palco-nectar` (Nectar 60%) | a letra → tocar ao vivo | ícone a 55% da Nectar, o palco a 60%: perto, mas não o mesmo; outra mão não valia | ícone no palco; vale em qualquer via |
| Ella | `lugar:escondido` (CHUVA 85%) | a casa: o filme, os quadros, pintar | ícone a 55% da CHUVA, a casa a 85%: longe um do outro | ícone na casa; vale em qualquer via |
| Notti | `lugar:topo` (DopaminA 90%) | trilha 8 bits → a máquina | ícone a 55% da DopaminA, o terraço a 90% | ícone no terraço; vale em qualquer via |
| Nizzy | `lugar:palco-rollercoaster` (Rollercoaster 60%), e a montanha-russa no parque | o clipe → andar na montanha-russa → a porta no palco | ícone fora do palco; na montanha-russa ninguém dizia que era no parque | ícone no palco; na vez da montanha-russa o Nexo diz "anda na montanha-russa do parque"; depois "volta até o palco" |
| Tony Gordo | `lugar:palco-swav` (Swav 50%) | a horta → cozinhar | ícone a 55% da Swav, o palco a 50% | ícone no palco; vale em qualquer via |
| O final | `lugar:casa-dbee` | (em breve: T29) | — | sem mudança |

## O que mudou em cada parte

- **A fonte única** (`app/linha/estrada/alvoMissao.ts`): `pontoDoAlvo(M, { lugar | chao })` dá o ponto; `chegouNoAlvo` diz se chegou (raio 38 m na cidade, 32 m no chão, e a altura: lá em cima na pista não vale pro chão de baixo). Os números em `CHEGADA_MISSAO`.
- **O gatilho** (`estrada/Corrida.tsx`): um intervalo de 300 ms (não é por quadro) mede a distância do jogador (a Kombi ou o patins: `combRef.aqui`) ao ponto. Chegou: começa, em qualquer via, de patins, voando. O do chão usa o mesmo ponto no intervalo do chão que já existia. Parado no lugar e nada abriu: tenta de novo a cada 12 s.
- **O mapa** (`estrada/Mapa.tsx`, `estrada/Drone.tsx`, `page.tsx` `mapaMissoes`): o ícone no lugar da missão. A pegada: maior, pulsando forte, "AGORA · quem" em branco, desenhada por cima. As que dá pra pegar: ícone e o nome de quem pede. As feitas: um anel apagado com ✓ (só no mapa grande). Você: a seta maior, com halo e "você" embaixo, apontando pra onde vai. O drone acende o feixe no mesmo ponto.
- **O guia no mundo** (`estrada/FeixeGuia.tsx`): um desenho só, sempre montado: um feixe de 420 m na cor do lugar e, no chão, o anel do raio da chegada (entrou no anel, começa). Material aditivo, sem luz, nada por quadro. Some durante a cena do lugar.
- **O Nexo** (`disco/agora.ts`, `estrada/Holo.tsx` `AgoraNexo`): sempre "Agora: ..." com o passo concreto ("vai até o palco do Copo Americano: apreciar um disco antigo", "de patins e jetpack até a casa do Drew", "vai até a boca do túnel, no chão do subúrbio, e desce a rampa…") e a distância do lado (de 10 em 10 m perto, 50 em 50 longe; "aqui" ao chegar). Perto sem ter começado, troca pelo que fazer ali: "desce: o lugar é aqui embaixo, no chão", "sobe pra pista: o lugar é lá em cima", "fecha o celular: a missão começa aqui", "desce a rampa até a porta do túnel". Sem missão: "Agora: pega uma missão no mapa · N". Só o pedacinho do notch se refaz (uma loja fora do React).

## Depois (decidido pelo coordenador, 02/11)

- **Missão disponível e não pega:** chegou no lugar dela sem outra ativa, ela é pega e começa ali (`onPegarAqui`, a Corrida confere as ofertas de 500 em 500 ms). Com outra ativa, o Nexo diz "a missão do X é aqui: termina a atual ou troca no mapa".
- **A tentativa repetida (12 s parado no lugar)** não reabre a peça que ele fechou de propósito: só depois de sair do raio e voltar (`visitaAbriu` no page.tsx; a Corrida avisa `repete`).
- **O feixe na cidade:** só o feixe, sem o anel (ele ficava flutuando fora da pista). O anel fica no chão do subúrbio.

## O que ficou faltando

- O "Agora" das missões que ainda são decisão do dono (a moda do Drew, a arte do Xeriff) usa o nome da peça em `portas.ts`; quando a peça mudar, a frase segue sozinha.
- Ninguém jogou isto ainda: os raios (38/32 m) e a altura (26/14 m) são palpite; ajustar em `CHEGADA_MISSAO` depois do teste do dono.
- `tests/nexo-notch.spec.ts` pode esperar o texto antigo do notch ("▸ ..."); não rodei.
