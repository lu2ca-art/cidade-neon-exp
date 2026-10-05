---
name: game-design
description: Ofício de game design e narrativa da Cidade Neon — como escrever cena, diálogo, missão e primeira experiência com EMOÇÃO e alinhado à cosmovisão do LU2CA. Carregar ANTES de escrever ou alterar qualquer fala, cena (cenas.ts), roteiro (roteiros.ts), ligação, missão, tela de entrada ou onboarding; e quando o LU2CA disser que algo está confuso, sem emoção, "lógico demais" ou "ninguém entende do que se trata".
---

# Game design e narrativa da Cidade Neon

O jogo não é um sistema de missões com texto em volta. É **uma experiência emocional que usa mecânica**. Quando a lógica do sistema aparece mais que a emoção, falhou.

Erro recorrente do Claude neste projeto (o LU2CA apontou em 05/10): **"os diálogos estão bizarros e sem sentido emocional, só a lógica do Claude predomina"**. Sintomas: personagem explicando regra do mundo; fala que existe só pra mandar o jogador a um lugar; três falas seguidas da mesma pessoa; metáfora decorativa sem gente por trás; tudo no mesmo tom de sabedoria seca. Esta skill existe pra evitar isso.

## 0. Antes de escrever, ler (fontes da cosmovisão, nesta ordem)

1. `~/vault/universo/decisoes-2026-10-05.md` — o jogo como retrato da realidade e do mundo que a gente quer criar (o mais recente; vence o resto)
2. O artefato **Retrato da Cidade Neon** (`https://claude.ai/artifact/TYoCBC94dHhknfL8VjooSm`, coleção `pecas`): as 16 peças, o que cada uma é na realidade, o que a gente quer criar, e as notas do LU2CA. Ler com ArtifactData `list` (out_dir).
3. `~/vault/universo/arco.md` — jornada, leis da cidade, os 14 lugares
4. `~/vault/universo/narrativa-mestra.md` — personagens (querer × precisar × ferida × segredo), o Núcleo, o Arquiteto
5. `~/vault/persona/voz.md` — como o LU2CA fala (base da voz de todo mundo)
6. `~/vault/universo/jogo-original.md` — o truque (promessa → desvio → revelação)

**A cosmovisão em uma linha:** o Núcleo governa separando e anestesiando; a música, o cuidado e a rede de gente juntam; ninguém vence lutando, vence lembrando quem é e não deixando separar. A inteligência coletiva não pode ser tirada, a não ser que a gente permita a separação.
**Linguagem:** sem rótulo político, sem partido, sem nome de pessoa real. No jogo é só "o movimento". Personagem nunca usa nome ou apelido real de amigo.

## 1. A primeira experiência (onde mais se perde gente)

Em qualquer momento a pessoa tem que conseguir responder, sem ler nada longo: **quem eu sou aqui, onde estou, o que está acontecendo, o que eu faço agora, por que eu me importo**.

- **Nos primeiros 30 s:** uma imagem forte e uma pergunta (o "sabe ontem?"), não uma explicação.
- **Até 2 min:** uma pessoa que precisa de você, com nome, rosto (cor) e uma ferida em uma frase.
- **Até 5 min:** a primeira coisa que a pessoa FAZ com as mãos e que muda algo visível no mundo.
- **Até 10 min:** a primeira recompensa que se usa, e um gancho (alguém ou algo esperando).
- **Nunca:** mais de 4 textos seguidos sem a pessoa agir (medido na linha do tempo); cinza ou silêncio longo sem promessa de que acaba; o jogador sem saber pra onde ir (o painel MISSÕES resolve isso).

## 2. Cena (cada visita a um lugar)

Toda cena responde: **o que esta pessoa quer de mim agora, o que ela esconde, e o que muda quando eu saio?**

- **Uma ideia por cena.** O bar é "a promessa fácil". Não explica também o Núcleo, o apagão e a Linha 9.
- **Entrar tarde, sair cedo.** Começa no meio da coisa ("…vc veio mesmo"), termina no gesto, não numa fala de despedida.
- **O pico é um GESTO, não uma fala.** Negar o copo, regar, dançar, tocar, silenciar. A fala só prepara e só reage.
- **Mudança visível na saída.** Algo no mundo fica diferente (luz, chuva, alguém na Kombi, a noite que repete).
- **Os três tons mudam o caminho, nunca o destino** (dormindo, acordando, acordado). Quem responde reage ao tom com emoção, não com informação.

## 3. Diálogo (o mais importante)

- **Subtexto:** ninguém diz o que sente. A Ella não diz "estou de luto"; diz "coincidência, né".
- **Gente fala pra alguém, por um motivo.** Cada fala tem um verbo escondido: pedir, testar, esconder, provocar, consolar, fugir. Se não tem verbo, corta.
- **Proibido:** personagem explicando o mundo ("o núcleo governa separando…"), fala-GPS ("vem pro bar, do lado direito da pista"), sabedoria de cartão de visita, metáfora que ninguém falaria em chat.
- **No máximo 2 falas seguidas da mesma pessoa** antes de uma resposta, uma ação ou uma imagem.
- **Voz por pessoa** (todas em minúscula, SP, chat), mas cada uma DIFERENTE:
  - **D-Bee:** urgente, protetora, frases curtas, nunca explica duas vezes.
  - **Ella:** devagar, reticente, muda de assunto quando dói.
  - **Mubarak:** ironia que esconde saudade, nunca pede nada.
  - **Notti:** CAIXA ALTA no susto, pula de assunto, engraçada por cima do triste.
  - **Drewboy:** inseguro, autodepreciativo, carinhoso sem querer.
  - **Alohan:** frases curtas com ponto final. Lento. Observa.
  - **LU2CA:** íntimo e confessional (o textão de 01/09 da voz.md).
  - **Tony Gordo:** planilheiro, ansioso, engraçado.
  - **O Núcleo:** corporativo, gentil, sempre com ✓. Quanto mais gentil, mais assustador.
- **A informação do mundo chega por objeto, imagem, rádio, notificação do Núcleo, nunca por aula.**
- **Humor corta o drama** no último segundo (Notti, Mubarak), menos nas cenas que precisam doer.
- **Teste de leitura em voz alta:** se o LU2CA não falaria isso num áudio pra um amigo, reescreve.

## 4. Missão

- **A missão nasce de um desejo de alguém, não de uma tarefa do sistema.** "Enche o cantil" é tarefa; "a flor tá morrendo e eu não aguento perder mais nada" é desejo.
- **Arco de 3 batidas:** a ferida (C1) → a crise no caminho (C2, alguém desiste, trava, pede pra voltar) → a virada no lugar (C3, o gesto).
- **Ir até o lugar é parte da história:** quem vai junto conversa, o mundo reage, nunca é só deslocamento. Deslocamento longo e sem sentido = falha; existe o "ir agora".
- **Recompensa que se usa e que significa** (o violão, o espelho), nunca só número.
- **Cada missão é um retrato** (decisões de 05/10): o que ela é na realidade e o que ela ajuda a criar no mundo têm que ser sentidos, não ditos.

## 5. Mecânica como metáfora (harmonia ludonarrativa)

A regra do jogo tem que DIZER a mesma coisa que a história. Exemplos que funcionam: beber o copo = a noite repete (o loop é a mecânica); 15 s de silêncio de verdade; soltar o controle por 20 s. Exemplos que falham: uma missão sobre presença que pede pra ler 12 mensagens; uma missão sobre lentidão que se resolve correndo. **Toda mecânica nova: qual parte da cosmovisão ela faz a pessoa SENTIR?**

## 6. Checklist rápido antes de entregar qualquer texto de jogo

- [ ] Li as fontes da §0 (ou sei o que dizem)
- [ ] A cena tem UMA ideia e termina num gesto
- [ ] Nenhuma fala explica o mundo ou dá direção de GPS
- [ ] Nenhuma pessoa fala mais de 2 vezes seguidas
- [ ] Cada fala tem um verbo escondido
- [ ] A voz de cada personagem é distinguível sem o nome
- [ ] A pessoa age a cada no máximo 4 textos
- [ ] Algo visível muda no mundo
- [ ] Marquei como RASCUNHO pro LU2CA reescrever (ele é o autor; o Claude propõe)

Pra revisar o jogo inteiro contra estas regras, usar a skill `auditoria-de-fluxo`.
