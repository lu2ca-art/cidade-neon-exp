---
name: auditoria-de-fluxo
description: Revisa TODOS os fluxos da Cidade Neon só lendo os arquivos (sem jogar, sem andar pelo mapa) — remonta a experiência da pessoa na ordem em que ela joga, do primeiro toque ao último episódio, e aponta as falhas críticas e as melhorias contra a cosmovisão do LU2CA e as regras de game design. Usar quando o LU2CA pedir "revisa o jogo", "o que tá ruim", "ninguém entende o jogo", "a narrativa não funciona", antes de fechar um episódio, ou depois de mudanças grandes de roteiro/cenas/missões.
---

# Auditoria de fluxo

Objetivo: ver o jogo **pelos olhos de quem joga**, sem precisar jogar. O produto é um relatório que o LU2CA entende em 5 minutos e que diz **o que consertar primeiro**.

Carregue antes a skill `game-design` (é a régua) e leia as fontes da cosmovisão da §0 dela.

## 1. Remontar a jornada na ordem real (ler estes arquivos, nesta ordem)

Todos em `app/linha/` (repo do jogo):

| ordem | o que a pessoa vive | onde está |
|---|---|---|
| 1 | tela de entrada (o texto, o botão) | `telas.tsx` (`Entrada`) |
| 2 | a chegada na Kombi (tempos, rádio, Núcleo, cinza) | `chegada.tsx` (`ROTEIRO` e os textos) |
| 3 | o grupo 222 na ilha | `roteiros.ts` → `ROTEIROS.grupo` |
| 4 | a ligação da D-Bee | `ligacoes.ts` → `dbee-0`, `dbee-1` |
| 5 | o privado da D-Bee, a leitura NECTAR, o violão | `roteiros.ts` → `abertura`; o quiz em `app/nectar/leitura.ts` |
| 6 | o que acontece ao soltar na cidade (painel MISSÕES, quem chama) | `page.tsx` (`fimChat`, `abertas`, `quemChama`), `missoes.ts` (`ativa`, `abertas`, `MISSOES`) |
| 7 | cada missão: o chamado (texto/ligação/áudio), a crise, o lugar | `roteiros.ts` (chuva, copo, dopamina, sexta, ontem, nectar, ojala), `missoes.ts` |
| 8 | cada cena por dentro: falas, gestos, recompensas | `cenas.ts` (`CENAS`), `cena.tsx` (gestos), `interior/salas/*.tsx` (o que se vê) |
| 9 | o que muda no mundo depois (ecos no grupo, noite que repete, rádio) | `roteiros.ts` (`ECOS`), `page.tsx` (`fimCena`), `estrada/Corrida.tsx` (falas da 222, `noiteRepete`) |
| 10 | o fim e o que não existe ainda | `telas.tsx` (`Final`), `arco.md` (ep. 4, 5, epílogo) |

Atalho: o gerador da linha do tempo (`scratchpad/linha/gerar.ts` desta sessão, ou refazer) junta tudo isso num JSON plano. A **Linha do Tempo** (`https://claude.ai/artifact/CH8jKjh7tLgi9P6HuVkvJB`, coleção `atos`) tem a última versão editada pelo LU2CA: se existir, ela vence o código como intenção.

Escreva a jornada como uma tabela curta: **minuto aproximado · o que a pessoa vê · o que ela faz · o que ela sente (ou deveria)**. Conte texto × ação por trecho.

## 2. As 8 lentes (cada falha pertence a uma)

1. **Clareza:** em cada ponto, a pessoa sabe quem é, onde está, o que fazer e por quê? (5 perguntas da `game-design` §1)
2. **Emoção:** cada cena tem desejo, segredo e virada? O diálogo tem subtexto e voz própria, ou é lógica/explicação?
3. **Mostrar × contar:** onde o mundo é explicado em fala em vez de visto ou feito? Trechos com mais de 4 textos seguidos.
4. **Agência:** a pessoa decide algo que importa? As escolhas de tom mudam o caminho ou só a cor?
5. **Ritmo:** dois momentos iguais em sequência? Espera longa (deslocamento, cinza, silêncio) sem promessa?
6. **Coerência e continuidade:** alguém cita algo que a pessoa ainda não viu; objeto ganho duas vezes; relíquia usada antes de nascer; personagem age fora do que sabe; ordem de episódios quebrada (ex.: ep. 2 disponível antes de conhecer ninguém).
7. **Cosmovisão:** cada peça diz o que o LU2CA decidiu que ela é na realidade e no mundo que a gente quer criar (Retrato, decisões de 05/10)? Algo contradiz a cosmovisão (vencer lutando, herói único, rótulo político, a música do LU2CA como centro de tudo)?
8. **Mecânica como metáfora:** a regra do jogo diz a mesma coisa que a história?

## 3. Severidade

- **P0 · quebra a experiência:** a pessoa se perde, desiste, ou entende o oposto do que o jogo quer dizer. Ex.: não saber do que se trata nos primeiros 5 min.
- **P1 · enfraquece muito:** a emoção não chega, cena genérica, diálogo de lógica, ritmo arrastado.
- **P2 · polimento:** voz, detalhe, continuidade menor.

## 4. O relatório (formato fixo)

1. **O jogo em uma frase, como ele está hoje** (o que um jogador diria que é) × **como deveria ser** (a cosmovisão). A distância entre as duas é o diagnóstico.
2. **A jornada** (tabela da §1, curta).
3. **Falhas críticas**, P0 primeiro, no máximo 10. Cada uma com:
   - o que acontece, citando `arquivo:linha` e a fala/regra exata;
   - por que dói (qual lente, o que a pessoa sente);
   - **a correção proposta**, concreta (reescrita da fala, troca de texto por ação, corte, mudança de ordem). Diálogo reescrito é RASCUNHO: o LU2CA é o autor.
4. **O que já funciona** (curto, pra não estragar).
5. **Ordem de ataque:** as 3 primeiras coisas a fazer.
6. **Perguntas pro LU2CA:** só o que só ele pode decidir (no máximo 3).

## 5. Regras

- **Não implementar nada durante a auditoria.** Ela só diagnostica. A implementação vem depois, fatia por fatia, com o LU2CA aprovando.
- Ler o arquivo de verdade antes de citar (linha e texto exatos); nunca citar de memória.
- Ser específico e honesto, sem amaciar. "Está bom" só quando está.
- Não propor mais texto pra resolver falta de clareza: a resposta quase sempre é imagem, gesto ou corte.
- Guardar o relatório em `~/vault/projetos/cidade-neon/auditorias/AAAA-MM-DD.md` e mostrar o resumo ao LU2CA.
