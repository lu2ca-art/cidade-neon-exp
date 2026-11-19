# Revisão 8 (06/11): modelos do Blender (9994bed..HEAD)

Revisado: bar, lugares da cidade, patins/skate/BMX, galeria da Ella, metrô (carro, vagão, fuga, trem dos túneis), parque, cartões da Mesa. Sem build nem medição (só tsc).

## Corrigido
- **Trem dos túneis flutuava**: o carro do metro.glb vai de y 0,5 a 3,68; na escala 1,53 o fundo ficava 0,77 m acima do chão (as caixas de antes: 0,25). TremTuneis desce 0,5 m. Topo ~5,1 m contra a caixa de colisão de 4,6 m (a colisão é a de sempre, TREM; largura 2×2,3 = 3×1,53 e comprimento 3×20+2 batem).
- **Roda-gigante (parque)**: o laço das 16 cabines refazia o seno/cosseno por malha (2×); agora uma conta por cabine serve às duas. Já não alocava nada por quadro (a Matrix4 é reaproveitada).
- **Parque.tsx (Trilhos)**: a geometria/material de reserva (caixa, cilindro, 2 materiais) nunca eram soltos; agora dispose ao desmontar.
- **metro/cena.ts**: o material neon era criado antes da checagem do nó; movido depois (não cria à toa se o glb vier sem "fuga_solido").

## Conferido, sem mudança
- cena.ts: GLTFLoader com MeshoptDecoder configurado; `morto` evita montar depois de destruir (nada foi enviado à GPU, só o JS é coletado); destruir() solta geometrias e materiais (inclui o neon e as instâncias) e a casca é solta ao ser trocada; falha de rede cai na casca de caixas com aviso.
- ModeloSeguro presente em todos: Bar, Galeria, Lugares, Vagão, Metro, TremTuneis, Parque (trilho, roda, estação, carro), Patins, BMX, Skate. Sem material criado por render (todos em módulo ou useMemo; os das telas da Galeria com dispose).
- Mesclas: Lugares faz dispose das parciais e da final ao desmontar; ParqueModelo clona/guarda em cache de módulo (compartilhado de propósito).
- MAT_PECAS movido para estrada/pecas.ts: mesmo onBeforeCompile e a mesma customProgramCacheKey ("moto-pecas"); o Pilotos importa e a moto segue igual.
- useFrame novos: só o da roda (acima); o piscar do metrô entra no useFrame que o Vagão já tinha.
- Parque: montado dentro de Perto (raio 700) + Seguro; os ~30 mil triângulos instanciados só existem perto dele. Aceitável; se pesar no iPhone, dormentes a cada 6 pontos em vez de 3 (metade) é o corte mais barato. Não medido.
- Mesa: todos os `parte` dos cartões novos existem em PARTES_TESTE ou são gerados (missao.nizzy e missao.ella vêm de MISSOES_FEIRA; missao.rollercoaster de MISSOES; missao.ella.casa, missao.tuneis.trincheiras, carreira.meio, vitrine.bar, livre, bar estão na lista).

## Aberto
- Triângulos do bar (~29 mil) e da galeria (~33 mil) não são instanciados e ficam sempre desenhados na sala; só medindo no iPhone.
