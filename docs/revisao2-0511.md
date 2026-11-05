# Revisão 2, noite de 05/11: desempenho e integração

Branch `feature/game/revisao2` (a partir de `feature/game/mapa-disco`, `857f09c`).
O que entrou depois da primeira revisão (`docs/revisao-noite-0511.md`): as 9
ruas-manifesto (`estrada/manifestos/`), a corrida de rua do subúrbio
(`disco/corridaRua.ts`, `disco/CorridaDeRua.tsx`), a revisão parte 2 (♪ no notch,
TV no canto md, ondeParou com modo) e a leveza (`pistaQuadras.ts`).

Regra: só leitura e `npx tsc --noEmit -p .`; sem build, sem Playwright, sem medir
quadro. Dois scripts bun de contagem (descartados, não versionados): o número de
amostras de cada rua e a distância de cada rua até as ruínas. Um commit por correção.

## Corrigido

### 1. A rua empurrava a câmera fora da câmera de perseguição (manifestos × piloto/drone/cenas)
- **Onde:** `estrada/manifestos/comum.ts:94` (`CAMERA_RUA`) e `:101` (`empurrarCamera`),
  `estrada/manifestos/CopoAmericano.tsx:253`, `estrada/Corrida.tsx:6538`
- **Causa:** Copo Americano (balanço do porre), Swav (fov do salto) e Rollercoaster
  (roll + fov da descida) mexem na câmera depois do jogo, todo quadro, sem saber qual
  câmera está valendo. O jogo tira o roll dele na primeira pessoa e nas cenas; a rua
  não: com o drone GPS aberto (a vista de 81°), na primeira pessoa, na câmera de
  porta (`camEntrada`), na montanha-russa do parque ou no corte da chegada, o mapa e
  a cena inclinavam e o fov abria. A ordem já estava certa (o host monta antes do
  Corrida, mas o manifesto monta depois, então roda depois da câmera) e só um
  manifesto existe por vez (key = a faixa), então elas não acumulam entre si: o
  problema era só com os outros donos da câmera.
- **Correção:** o Corrida escreve `CAMERA_RUA.livre` todo quadro (só a câmera de
  perseguição: sem cena, sem primeira pessoa, sem porta, sem parque, sem corte da
  chegada, drone em 0). Fora dela `empurrarCamera` e o Copo vão a zero (o "desfaz"
  do quadro anterior continua valendo, nada fica preso).
- Commit `f0d4e8d`.

### 2. Ruínas de noite embaixo do céu de dia (Sabe Ontem? × ruínas acesas)
- **Onde:** `estrada/Corrida.tsx:6039` (`horaCeuRef`), `:6610` e `:6928`
- **Causa:** "Sabe Ontem?" puxa o céu pra hora da rua (`CEU_MANIFESTO`, 5 h → 22 h), mas
  as ruínas acendiam pela hora do JOGO (`horaRef`). A rua passa a 376 m do centro do
  subúrbio e 71% dela fica dentro do raio do `<Perto>` das ruínas (960 m): no começo
  da faixa, céu de manhã e as janelas e tambores de fogo das ruínas acesos lá embaixo.
- **Correção:** o Corrida guarda a hora que o céu mostra (`horaCeuRef = hCeu`) e passa
  essa pras ruínas. Fora da rua é a mesma do jogo. `RuinasSuburbio.tsx` não foi tocado
  (o outro agente mexe nele).
- Commit `74249f6`.

### 3. Alocação por quadro (céu, tempo da faixa, corrida de rua)
- **Onde:** `ceu.ts:35` (`ceuNaHora`), `estrada/manifestos/comum.ts:20` (`tempoDaFaixa`),
  `disco/CorridaDeRua.tsx:43` e `:249`
- **Causa:** `ceuNaHora` criava um objeto, dois arrays e uma closure a cada chamada, e
  é chamada todo quadro pelo Corrida, pelas ruínas e por Sabe Ontem? (e pela /cidade).
  `tempoDaFaixa` (o host dos manifestos, todo quadro na rua) devolvia um objeto novo.
  A corrida de rua (montada sempre que se está no subúrbio) criava `["moto", "patins"]`
  e duas closures de `forEach` por quadro, e um `[]` novo fora da corrida.
- **Correção:** os dois devolvem sempre o mesmo objeto, reescrito (todos os chamadores
  leem na hora, conferido); a corrida usa constantes do módulo e `for`.
- Commit `f4425ed`.

### 4. Os manifestos não seguiam a qualidade (instâncias no celular)
- **Onde:** `estrada/manifestos/comum.ts:13` (`densidadeRua`), `Sexta.tsx:170`,
  `Chuva.tsx:206`, `Nectar.tsx:267`, `DopaminA.tsx:173`, `Ojala.tsx:193`, `Swav.tsx:219`
- **Causa:** nenhuma rua lia `qualidade.ts`. Contado no mundo de verdade: a Sexta-Feira
  monta ~1,56 mil silhuetas e ~46 holofotes (cones aditivos grandes: o que mais pesa
  na GPU), a CHUVA ~430 flores e ~700 anéis, a DopaminA ~430 telas × 2 (o eco).
- **Correção:** no nível **leve** (`baixo`), `densidadeRua() = 0,5`: metade da
  multidão e dos holofotes (Sexta), das flores e dos anéis (CHUVA), das flores
  (Nectar), das telas (DopaminA), do confete (Ojalá) e 70% dos prismas (Swav; os vãos
  não mudam). Alto e médio ficam como estavam. Lido na montagem (a rua remonta a cada
  entrada).
- Commit `7d38ed6`.

## Conferido, sem problema

- **Montar fora do lugar:** o host só monta o manifesto da rua em que a Kombi está
  (fora do voo), com 6 s de carência; a corrida de rua mora dentro do `<Perto>` das
  ruínas (o circuito fica todo dentro do subúrbio) e zera ao desmontar; as ruínas e o
  subúrbio continuam nos `<Perto>` deles.
- **dispose:** todas as 9 ruas descartam geometria, material, `DataTexture` (Swav,
  Rollercoaster) e o canvas das palavras (Nectar) ao desmontar; a corrida de rua
  descarta o arco, a placa (canvas), os portões e os rivais (geometria nova por
  rival, não é cache das trincheiras).
- **setState / querySelector por quadro:** o host só chama `setK` quando a rua muda;
  o HUD da corrida olha o estado a cada 100 ms e só faz `querySelector` durante a
  corrida; o `.l-hyper` do Corrida é guardado no primeiro quadro; o Drone refaz os
  feixes a cada 1 s e só se a chave mudou. `pistaQuadras.ts` não aloca no quadro.
- **Câmera entre as ruas:** Copo usa a própria conta (rotateY/rotateZ) e Swav/
  Rollercoaster usam `empurrarCamera`; nunca há duas montadas, e cada uma desfaz o
  seu antes de aplicar (e devolve ao desmontar). A projeção é escalada depois do
  `updateProjectionMatrix` do jogo e desfeita se ninguém a refez.
- **Rádio por zona × Sabe Ontem?:** a zona do som não depende da hora; na rua é sempre
  "cidade". Nada a fazer.
- **Corrida de rua × save:** só a corrida que chega entra no placar
  (`save.ruaSuburbio`, `placarComCorrida`), uma vez por resultado.
- **♪ × trilha de pedras:** a pedra "salvar" aponta pro ♪ (`.l-nexo-musica.tem-salvar`)
  e conta o toque no ♥ do menu (o menu sai num portal, mas o clique é ouvido no
  `document`, na captura, e o botão ainda está no DOM).

## Suspeitas (não mexi)

- **Trocar de rua-manifesto direto (sem sair):** o host troca na hora, sem fade; se a
  rua de antes era Sabe Ontem? ou CHUVA, o céu volta pra hora do jogo e a chuva pro
  clima num quadro só (`CEU_MANIFESTO.k`/`CHUVA_MANIFESTO.k` zeram ao desmontar).
  Só acontece se der pra passar de uma rua pra outra pelo anel sem voar.
- **Engasgo ao entrar numa rua pela primeira vez:** cada manifesto compila os
  ShaderMaterial dele e monta as malhas na entrada (o Rollercoaster monta ~33 mil
  vértices em JS). O three guarda o programa compilado (só a primeira entrada paga),
  mas no iPhone isso pode ser um tranco visível. Saída: pré-compilar (`gl.compileAsync`)
  ou montar invisível alguns segundos antes da rua.
- **Corrida de rua segura a pose fora do passo da física:** na contagem
  `CorridaRuaCena` escreve `j.wx/j.wz/j.v` num `useFrame` (não no `passo(dt)`); a ordem
  depende de quando o `<Perto>` montou (antes ou depois do Corrida). Com `v = 0` não
  anda, mas a interpolação da tela pode tremer um quadro na largada.
- **CHUVA sem som de chuva:** a rua deixa a chuva visível e mais grossa, mas o que o
  jogo usa pra "está chovendo" (`chovendo(dia, hora)`: o vidro embaçado, o som) segue
  o clima. Decisão de design.
- **A primeira pessoa e o drone também desligam o Copo:** com a correção 1 o porre não
  balança a câmera de dentro da Kombi. Se o dono quiser o porre na primeira pessoa,
  é só tirar `!primeira` de `CAMERA_RUA.livre`.
- **Médio no iPhone:** o palpite de celular é "médio" (não reduz as ruas); só o leve
  reduz. Se a Sexta pesar no médio, dá pra usar 0,75 no médio em `densidadeRua`.

Sem teste no jogo (regra). Na Mesa: a Sexta-Feira e a CHUVA no leve (`?qualidade=baixo`),
abrir o drone no meio do Rollercoaster/Copo (o mapa reto), e a rua Sabe Ontem? de
manhã olhando o subúrbio (as ruínas apagadas).
