# Arquitetura (mapa gerado)

Gerado por `node scripts/gerar-mapa.mjs` (`bun run mapa`). Não editar à mão. Cobre `app/`, `components/`, `lib/` e `hooks/`, só imports estáticos e dinâmicos com string.

599 arquivos, 122127 linhas, 6 ciclos de importação, 53 arquivos que ninguém importa.

## Áreas
`usa` = outras áreas que esta importa. Sala que usa outra sala é acoplamento: mexer numa quebra a outra.

| área | arquivos | linhas | usa |
|---|---|---|---|
| app/linha | 339 | 73595 | app/batida, app/casa-de-shows, app/fliperama, app/galeria, app/ginasio, app/neon-tiles, app/parque, app/teste, components, lib |
| components | 77 | 12172 | app/providers, hooks, lib |
| app/batida | 56 | 7420 | app/linha, app/providers |
| app/neon-tiles | 10 | 3899 | app/linha, app/providers, lib |
| app/drive | 1 | 2529 | app/n3xo, app/providers, components, lib |
| app (raiz) | 5 | 2226 | app/providers, components, lib |
| app/teste | 16 | 1680 | app/linha |
| lib | 13 | 1380 | app/n3xo |
| app/nectar | 7 | 1301 | app/linha, app/providers, lib |
| app/fliperama | 10 | 1199 | app/linha, app/neon-tiles, lib |
| app/JRJblGyz9mEDxMLP | 2 | 1144 | — |
| app/providers | 3 | 1133 | lib |
| app/parque | 6 | 988 | app/linha, app/neon-tiles, lib |
| app/drive-v2 | 1 | 968 | app/providers, components, hooks, lib |
| app/cidade | 6 | 931 | app/linha |
| app/ginasio | 6 | 907 | app/linha, app/neon-tiles, lib |
| app/galeria | 6 | 899 | app/linha, app/neon-tiles |
| app/n3xo | 3 | 892 | app/providers |
| app/tiktok | 2 | 868 | app/providers |
| app/kombi-editor | 1 | 698 | — |
| hooks | 4 | 656 | app/providers, components, lib |
| app/pistas-editor | 1 | 530 | — |
| app/cockpit-editor | 1 | 520 | — |
| app/sintonizador | 1 | 425 | app/providers, lib |
| app/ligacao | 1 | 363 | — |
| app/hacker | 1 | 360 | app/providers |
| app/api | 4 | 346 | — |
| app/radio | 1 | 321 | — |
| app/feel-good | 1 | 315 | app/providers |
| app/youtube | 1 | 315 | app/providers |
| app/museu | 1 | 255 | — |
| app/final | 1 | 191 | app/providers |
| app/casa-de-shows | 2 | 176 | app/linha |
| app/van-preview | 1 | 150 | — |
| app/spotify | 2 | 127 | app/providers, lib |
| app/drive-cockpit | 1 | 91 | components, lib |
| app/dev | 1 | 72 | — |
| app/vitrine | 2 | 55 | app/linha |
| app/confirmacao | 1 | 21 | — |
| app/loja-discos | 1 | 9 | — |

## Módulos mais importados (mexer aqui afeta muita coisa)
| arquivo | importado por |
|---|---|
| app/linha/disco/historia.ts | 68 |
| app/linha/som.ts | 64 |
| lib/utils.ts | 50 |
| app/linha/disco/portas.ts | 38 |
| app/linha/estrada/pistas.ts | 35 |
| app/linha/estrada/Seguro.tsx | 33 |
| app/linha/data.ts | 32 |
| app/batida/lib/types.ts | 30 |
| app/linha/estrada/mundo.ts | 26 |
| app/linha/estrada/pista.ts | 26 |
| app/linha/lugares.ts | 23 |
| app/linha/interior/comum.tsx | 22 |
| app/linha/estrada/mundoDisco.ts | 21 |
| app/linha/disco/episodios.ts | 20 |
| app/linha/estado.ts | 20 |
| app/linha/radio.ts | 20 |
| app/providers/GameFunnelProvider.tsx | 20 |
| app/linha/som-carro.ts | 19 |
| app/linha/disco/instrumentos.ts | 18 |
| lib/analytics.ts | 17 |

## Maiores arquivos (candidatos a dividir)
| arquivo | linhas |
|---|---|
| app/linha/estrada/Corrida.tsx | 7651 |
| app/linha/page.tsx | 3260 |
| app/drive/page.tsx | 2529 |
| app/page.tsx | 2025 |
| app/linha/som.ts | 1535 |
| components/DriveCockpit/CyberpunkCity.tsx | 1374 |
| components/DriveCockpit/CockpitScene.tsx | 1216 |
| app/neon-tiles/cena.ts | 1151 |
| app/JRJblGyz9mEDxMLP/content.ts | 1128 |
| app/linha/estrada/Holo.tsx | 1122 |
| app/teste/mesa.ts | 1071 |
| app/linha/estrada/mundoDisco.ts | 1040 |
| app/drive-v2/page.tsx | 968 |
| app/linha/chat.tsx | 948 |
| app/linha/interior/salas/GaleriaElla.tsx | 899 |

## Ciclos de importação
- app/linha/cenas.ts ⇄ app/linha/disco/abertos.ts ⇄ app/linha/disco/episodios.ts ⇄ app/linha/disco/historia.ts ⇄ app/linha/disco/instrumentos.ts ⇄ app/linha/disco/metro.ts ⇄ app/linha/disco/musicaContinua.ts ⇄ app/linha/disco/pecas/sons.ts ⇄ app/linha/disco/perseguicao.ts ⇄ app/linha/disco/portas.ts ⇄ app/linha/disco/radioAntiga.ts ⇄ app/linha/disco/sons.ts ⇄ app/linha/disco/sugestoesDbee.ts ⇄ app/linha/disco/tamborSom.ts ⇄ app/linha/disco/trilha.ts ⇄ app/linha/disco/tutorialConf.ts ⇄ app/linha/discos.ts ⇄ app/linha/economia-rascunho.ts ⇄ app/linha/economia.ts ⇄ app/linha/estado.ts ⇄ app/linha/estrada/atos.ts ⇄ app/linha/estrada/pistas.ts ⇄ app/linha/ligacoes.ts ⇄ app/linha/metro/Metro.tsx ⇄ app/linha/metro/som.ts ⇄ app/linha/missoes.ts ⇄ app/linha/os.tsx ⇄ app/linha/provas.tsx ⇄ app/linha/recursos.tsx ⇄ app/linha/roteiros.ts ⇄ app/linha/som.ts ⇄ app/linha/tons.ts
- app/neon-tiles/dados.ts ⇄ app/neon-tiles/instrumentos.ts
- app/linha/disco/pecas/Clipe.tsx ⇄ app/linha/disco/pecas/Cozinhar.tsx ⇄ app/linha/disco/pecas/Danca.tsx ⇄ app/linha/disco/pecas/DiscoAntigo.tsx ⇄ app/linha/disco/pecas/Maquina.tsx ⇄ app/linha/disco/pecas/Moda.tsx ⇄ app/linha/disco/pecas/Peca.tsx ⇄ app/linha/disco/pecas/SinucaMissao.tsx ⇄ app/linha/disco/pecas/Trilha8.tsx ⇄ app/linha/disco/pecas/Vinheta.tsx
- app/linha/trincheiras/fisica.ts ⇄ app/linha/trincheiras/moto.ts
- app/linha/interior/Interior.tsx ⇄ app/linha/interior/registro.ts
- app/neon-tiles/menus.tsx ⇄ app/neon-tiles/page.tsx

## Arquivos que ninguém importa (código morto ou entrada por configuração)
Confira antes de apagar: pode ser carregado por caminho dinâmico.

- app/batida/components/InstrumentIcon.tsx (82 linhas)
- app/linha/disco/missoes.ts (154 linhas)
- components/ConfirmationOverlay.tsx (130 linhas)
- components/DriveCockpit/SportsCar.tsx (204 linhas)
- components/DriveCockpit/VoxelCity.tsx (233 linhas)
- components/theme-provider.tsx (12 linhas)
- components/ui/accordion.tsx (67 linhas)
- components/ui/alert-dialog.tsx (158 linhas)
- components/ui/alert.tsx (67 linhas)
- components/ui/aspect-ratio.tsx (12 linhas)
- components/ui/avatar.tsx (54 linhas)
- components/ui/badge.tsx (47 linhas)
- components/ui/breadcrumb.tsx (110 linhas)
- components/ui/button-group.tsx (84 linhas)
- components/ui/calendar.tsx (214 linhas)
- components/ui/card.tsx (93 linhas)
- components/ui/carousel.tsx (242 linhas)
- components/ui/checkbox.tsx (33 linhas)
- components/ui/collapsible.tsx (34 linhas)
- components/ui/command.tsx (185 linhas)
- components/ui/context-menu.tsx (253 linhas)
- components/ui/drawer.tsx (136 linhas)
- components/ui/dropdown-menu.tsx (258 linhas)
- components/ui/empty.tsx (105 linhas)
- components/ui/field.tsx (245 linhas)
- components/ui/form.tsx (168 linhas)
- components/ui/hover-card.tsx (45 linhas)
- components/ui/input-group.tsx (170 linhas)
- components/ui/input-otp.tsx (78 linhas)
- components/ui/item.tsx (194 linhas)
- components/ui/kbd.tsx (29 linhas)
- components/ui/menubar.tsx (277 linhas)
- components/ui/navigation-menu.tsx (167 linhas)
- components/ui/pagination.tsx (128 linhas)
- components/ui/popover.tsx (49 linhas)
- components/ui/progress.tsx (32 linhas)
- components/ui/radio-group.tsx (46 linhas)
- components/ui/resizable.tsx (57 linhas)
- components/ui/scroll-area.tsx (59 linhas)
- components/ui/select.tsx (186 linhas)
- components/ui/sidebar.tsx (726 linhas)
- components/ui/slider.tsx (64 linhas)
- components/ui/sonner.tsx (26 linhas)
- components/ui/spinner.tsx (17 linhas)
- components/ui/switch.tsx (32 linhas)
- components/ui/table.tsx (117 linhas)
- components/ui/tabs.tsx (67 linhas)
- components/ui/toaster.tsx (36 linhas)
- components/ui/toggle-group.tsx (74 linhas)
- components/ui/use-mobile.tsx (20 linhas)
- components/ui/use-toast.ts (192 linhas)
- lib/audio-analysis.ts (189 linhas)
- lib/road-circuits.ts (81 linhas)
