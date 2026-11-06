# Revisão 5 (06/11): T41, T46, mundo depois, leveza, sem "em breve", lugares do chão

Escopo: a61605f..origin/feature/game/mapa-disco. Só leitura de código + `tsc` (0).

## Corrigido
1. **Dois "entrar" sobrepostos.** O botão dos 6 lugares do chão usava `.l-regar-btn.is-pagina` (top 196px), o mesmo lugar de "voltar pra Kombi", "regar a flor", "pegar o galão" e do "entrar · o bar". De patins/moto perto da Kombi, os dois se cobriam. Agora ganha `is-chao` (top 304px, abaixo do 196/250 da moto).
2. **`doMundo` preso.** Entrar na loja/jardim pelo mundo e sair por outro caminho (home do celular) deixava o "voltar" da loja levando pra estrada. Um efeito zera a marca quando a tela deixa de ser "app".

## Conferido, sem bug
- Outdoors (ShaderMaterial): `aIdx`, `instanceMatrix`, fog e `colorspace_fragment` são cobertos pelo prefixo do three 0.185 (WebGL1/2); sem `precision` própria necessária; InstancedMesh com `computeBoundingSphere`; material/atlas de módulo (não dispõe de propósito), geometria disposta.
- Cabines (`onBeforeCompile` em `begin_vertex`): include certo, `frustumCulled=false` justificado, dispose ok. Plantas: `count` fixado antes do `computeBoundingSphere`. RioDepois: atributos iguais no merge (normal removida), dispose ok.
- Moto: replaces (`roughnessmap_fragment`, `metalnessmap_fragment`, `totalEmissiveRadiance = emissive`) existem no three 0.185; cor/RM/emissivo por vértice; geometrias todas indexadas (merge ok).
- AppJanela por cima do jogo: `silenciar(true/false)` na montagem/desmontagem devolve a música; `corridaPausada` inclui `janelaChao`; `fecharJanelaChao` é estável (o efeito não reinicia). Kombi não para nos lugares abertos.
- "?": chaves novas (`veiculo`, `moto`, `entrar`, `rua`, `drone-*`) existem em INFO e batem com os botões.
- Saves antigos: `jogoVelho()` só filtra a intro do grupo; sem mudança de formato de save.

## Pendências (feitas, revisão 5b)
- [x] `/galeria` e `/batida` respeitam `?tranca=` como o `/ginasio`: com a porta trancada abre só a vitrine (`VitrineTrancada` em `Trancado.tsx`: o nome, o que tem lá dentro com cadeado e o que libera, e o "sair"). Sem `?tranca=`, a página abre inteira.
- [x] O botão "entrar" dos lugares do chão (`is-chao`) tem `data-info="entrar-lugar"`, com o texto no INFO do "?" (Holo.tsx).
- [x] `OutdoorsNucleo`: um `<Perto>` por quadra (Corrida.tsx, `quadrasPerto` memorizado, nada alocado por quadro); só as quadras perto montam as malhas.
