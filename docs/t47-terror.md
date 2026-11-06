# T47 · O elevador de terror (06/11) — RASCUNHO

Primeira versão pela recomendação, antes do vídeo de referência da Torre do Terror (Disney Paris) que o dono vai mandar. Tudo aqui pode mudar quando o vídeo chegar.

## O que é

- **Onde**: só no elevador 2 (TORRE 2 dos salões → torre da ponta de DopaminA, Rollercoaster, Swav). Gancho `ELEVADOR_TERROR = 2` em `app/linha/disco/elevadores.ts`.
- **Quando**: só na SUBIDA. A descida segue igual (botão na rotatória).
- **Obrigatório?** Decidido: a 1ª vez é obrigatória (o botão "subir · torre 2" leva pro poço). Depois disso aparece **"subir rápido"** ao lado, que usa a cabine curta de 1,2 s. O "já viu" fica no save da aba (`<chave do save>-terror`). Tocar na tela pula a qualquer momento (na 1ª vez também; espaço/Esc no teclado).
- **O percurso** (~25 s, primeira pessoa, dentro do poço, no mundo):
  1. portas de grade fecham (2,2 s), a tela sai do preto;
  2. a cabine sobe devagar (15 s, 5 andares). Em cada andar, pelo vão da frente: robôs dormindo em cibercamas, humanos encubados em cápsulas verdes, máquinas "dormindo" com a luz respirando lenta (0,18 Hz). Os tipos se revezam por andar. Perto do fim a lâmpada pisca;
  3. **tranco** (baque grave, a câmera treme), a luz apaga, a cabine **cai 2,4 m** e para seco; uns 2,6 s no escuro só com as máquinas respirando;
  4. a luz vermelha de emergência e a cabine **dispara** até o topo (64 m em 3,4 s, acelerando), o drone sobe de tom;
  5. a tela escurece e a cidade nasce na torre da ponta 2, como no elevador comum.
- **Som**: a trilha abafa (`abafar`, a mesma da música "de outro cômodo") e entra um drone grave sintetizado em Web Audio (dois dente-de-serra a 41 Hz quase iguais + sub; filtro respirando junto com as máquinas), baque no tranco e na parada. Sai pelo canal de efeitos (respeita o mudo).
- **Arrastar** pro lado olha em volta (±63°); toque sem arrastar pula.

## Como foi feito (desempenho)

- `app/linha/disco/terror.ts`: todos os números (andar, vão, fases, queda, disparada, respiração, névoa, drone) e a linha do tempo pura `quadroTerror(t)` (sem three.js).
- `app/linha/trincheiras/PocoTerror.tsx`: a cena. Canvas próprio por cima das trincheiras; o canvas dos túneis fica parado (`frameloop "never"`) enquanto isso. Low-poly, só `MeshBasicMaterial` (sem luz nenhuma, nova ou velha: acender/apagar é a cor dos materiais), cada peça repetida é um `InstancedMesh` pra todos os andares (~16 desenhos), névoa curta (24 m). Montado só durante o percurso; geometrias, materiais e instâncias descartados ao sair.
- `Trincheiras.tsx`: o botão do elevador 2 abre o poço; "subir rápido" depois da 1ª vez.

## Os limites do elevador (ajustes 06/11)

- **BMX/skate**: a cidade não tem BMX nem skate (o desembarque lá em cima e o corpo do jogador na Corrida só têm patins/moto; fazer os dois lá em cima é trabalho de Corrida/Pilotos, fica pra depois). Então ele **chega de patins**, mas o elevador **guarda o veículo dos túneis** (`lembrarVeiculoTunel`) e, ao descer de novo por um elevador, as trincheiras devolvem a BMX/o skate. Só na memória da aba (recarregou, volta a ser patins).
- **Ângulo da Kombi na vaga padrão da boca**: conferido, `rumo + π` está certo. A Kombi aponta pra −Z (Corrida.tsx, a base da Kombi); girar −Z por θ em Y dá (−sen θ, −cos θ), e a frente do rumo é (sen r, cos r): θ = r + π. Com `rumo = atan2(BOCA.ax, BOCA.az)` ela fica de frente pra porta, como a vaga padrão quer. Não mexi.

## Teste

`?parte=elevador.terror` (cartão na Mesa): abre no salão da TORRE 2, na frente do elevador, com o "já viu" apagado.

## Perguntas abertas (pro vídeo)

- O ritmo (15 s devagar + susto + disparada) e o tamanho da queda.
- Cair de novo depois da disparada (a Torre do Terror real cai várias vezes)?
- Robôs/cápsulas/máquinas: mais andares, outros tipos, alguém acordando?
- A descida também ganha alguma coisa?
