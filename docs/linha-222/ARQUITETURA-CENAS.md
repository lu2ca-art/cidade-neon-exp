# Passo 1: cada lugar é um ambiente separado (plano)

Meta do LU2CA (05/10): jogo insanamente otimizado, assets leves e bonitos, cenas de cinema, jogabilidade estável, narrativa coerente. Cada lugar vira um ambiente separado, ligado aos outros por caminhos, sem renderizar tudo na mesma página.

## Medido em 05/10 (build de main)
- Pacote principal do /linha: ~2,2 MB de JS carregado de uma vez; **0** `next/dynamic` em `app/linha/page.tsx`.
- `app/linha/estrada/Corrida.tsx`: ~2977 linhas (estrada, cidade, físicas, HUD, lugares).
- Assets leves: Kombi 960 KB, pessoas 56 KB cada, subúrbio 3,3 MB.
- Ao entrar numa sala (`app/linha/interior/`), a estrada fica montada e só pausada (`pausado`): a memória da GPU continua ocupada. Ainda há 3 `<Canvas>` (Corrida, Interior, viagem).
- Luzes dinâmicas por sala: bar 7, casa de shows 4, quarto/balada 3. Luz dinâmica é cara em celular.
- Peso morto fora do /linha: `public/models/van.glb` (2,2 MB), `voxel-city/` (4,1 MB).

## Feito em 05/10 (branch feature/game/cenas-separadas)
- **Fatia 1, sob demanda:** `next/dynamic` pra Corrida, Interior e Viagem; cada sala é um `lazy()` próprio (`interior/registro.ts` é leve, sem three). A sala do lugar da missão pré-carrega quando a missão aponta pra ela; a estrada baixa em segundo plano depois da tela inicial. Os créditos dos modelos foram pra `estrada/creditos.ts` (puxavam three pra carga inicial). **Carga inicial da /linha: 727 → 338 KB gzip.** O three.js saiu da tela inicial. O maior pedaço restante é o PostHog (270 KB, no layout do site inteiro: mexer em `feature/infra`).
- **Fatia 2, a estrada sai da tela:** dentro de uma sala ou na viagem, a Corrida desmonta (libera a GPU). O mundo montado fica em cache (`mundo()`), a posição em `RETOMAR` (via, u, x, naVaga, naSeg), e a Kombi volta no mesmo ponto sem reabrir a cena (`retomar` prop, `voltaDaSala` na página).
- **Fatia 3, orçamento:** medidor `__sala()` em dev; pessoas e copos sem luz própria, `Neon` sem luz por padrão, cidade do terraço instanciada, multidão com `pessoa-leve.glb` (428 triângulos). Teste: `docs/linha-222/testes/orcamento.mjs` (limites: 10 luzes, 60 mil triângulos, 160 malhas).

| sala | luzes | triângulos | malhas |
|---|---|---|---|
| bar | 28 → 9 | 17 mil | 110 |
| balada | 10 → 6 | 85 mil → 27 mil | 28 |
| vagão | 18 → 7 | 19 mil | 50 |
| terraço | 5 → 4 | 10 mil | 230 → 12 |
| posto | 4 | 49 mil (a Kombi) | 24 |

## O que falta
1. **Salas sob demanda:** `Interior.tsx` e cada `salas/*.tsx` via `next/dynamic` (sem SSR), carregando só quando `abrirCena` dispara. Pré-carregar a sala do lugar-alvo quando a Kombi chega perto (a 260 m, o mesmo ponto do aviso `vagaAvisou`).
2. **Desmontar a estrada dentro de uma sala:** hoje `pausado` só congela. Trocar por desmontar o `<Canvas>` da Corrida e guardar o estado de física (`jogo.current`: via, u, x, v) pra remontar no mesmo ponto na saída. Cuidado: rádio, piloto automático, carona, perseguição.
3. **Mapa de cenas:** um manifesto (`cenas-mapa.ts`) com cada cena (cidade, subúrbio, 10 salas, viagem, deserto), seus vizinhos e o orçamento. A viagem pra fora e o deserto entram aqui.
4. **Orçamento por cena + script de build:** triângulos, MB de textura, luzes, chamadas de desenho. O build falha se estourar. Usar r3f-perf em dev.
5. **Luz assada nas salas:** bake no Blender (`blender/scripts/`), trocando as luzes dinâmicas por textura. Começar pelo bar.
6. **Texturas KTX2 e meshopt** nos GLBs (gltf-transform já é usado).
7. **Apagar peso morto** que nenhuma rota usa.

## Invariantes que não podem quebrar (testar sempre)
- Passar na frente do lugar abre a cena; a vaga lembra em qual lugar já abriu (`j.naVaga`).
- Missão em aberto continua em aberto (`save.loops`, `pausas`); o efeito `is-repete` some quando o `objeto` copo é ganho.
- Salva e restaura: `save.itens`, `carona:*`, `pausas`, `reliquias`, `tons`.
- Salas com fallback: se uma sala falhar, `Seguro` mostra a legenda sem a sala.
- A viagem pra fora do ep. 3 e a casa da D-Bee.

## Como testar
- Scripts Playwright em `docs/linha-222/testes/` (usar `bun`, `playwright-core`, dev server em `localhost:3222`). Salvam imagens em `/tmp/linha-shots`.
  - `sala.mjs <bar|balada|vagao|escondido|beco|topo|shows|posto|drewboy|dbee>`: uma sala do começo ao fim.
  - `bar2.mjs`: as duas visitas do bar (beber, voltar, negar).
  - `passa.mjs`: passar na frente abre a cena; `carona.mjs`, `fase1.mjs`, `ep2.mjs`, `ep3.mjs`: fluxos das missões.
- Ganchos de dev no navegador: `__via`, `__irPara`, `__vel`, `__estado`, `__olhar`, `__beber`, `__gesto`, `__viagem`.
- O renderizador de teste (software) é ~100× mais lento que um celular: ajuste os tempos, e use teleporte pra perto do lugar.
- O build precisa de `bun install --frozen-lockfile` no checkout principal.

## Regras do projeto (CLAUDE.md)
Branch por escopo (`feature/game/...`), merge `--no-ff` em main, push em main = deploy. Testar antes. Verificar o deploy READY no Vercel (projeto `v0-ip-hone-call-simulation`).
