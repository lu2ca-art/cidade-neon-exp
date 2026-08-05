# design.md — fonte da verdade de design

## Direção (referência)

Base estrutural e de clima: `references/horizon-drive/` — 27 prints do jogo
synthwave "HORIZON Drive" (Shopify Editions Summer '25). **Não clonar** — usar
como direção de:

- Horizonte/skyline com prédios e palmeiras em silhueta contra gradiente de
  pôr do sol (rosa → laranja → roxo)
- HUD minimalista e translúcido, com glow, cantos arredondados
- Estrada com linhas neon (ciano/magenta) que desenham o trajeto
- Contraste forte entre ambiente escuro (roxo/azul profundo, quase preto) e
  acentos neon saturados

O estilo e a paleta vêm dessa referência (estrutura + clima), não do texto
que descreve o produto.

## Tipografia

- Sans: **Geist** (`next/font/google`, variável `--font-geist-sans`)
- Mono: **Geist Mono** (`--font-geist-mono`) — usada em HUD, timers, telas de
  terminal/hacker
- Fundo padrão do body: preto (`bg-black`)

## Paleta (extraída do código real em uso — `app/*/page.tsx`)

Fundo é sempre preto/quase-preto. Neon aparece só nos acentos, nunca satura
o fundo.

### Neon principal
| Cor | Hex |
|---|---|
| Ciano | `#00e5ff` / `#00FFF0` / `#00fff0` |
| Magenta / rosa | `#ff5fae` / `#FF00A8` / `#ff2d78` / `#cc00ff` |
| Verde hacker (fósforo) | `#00FF66` / `#00ffaa` |
| Amarelo / dourado | `#FFD700` / `#F59E0B` / `#FFD93D` |
| Roxo | `#A78BFA` / `#7C3AED` |
| Azul | `#6B9DFF` / `#6B7FD7` / `#3b82f6` |
| Vermelho | `#FF3B30` / `#EF4444` / `#ff6b35` |

### Cores funcionais (replicam apps reais, pra imersão)
| App simulado | Cores |
|---|---|
| N3XO (WhatsApp) | fundo `#111B21`, bolha `#1F2C34`, verde `#00A884` |
| Spotify | verde `#1DB954` |

### Frequências de rádio (`lib/radio-tiers.ts`)
| Frequência | Cor |
|---|---|
| SUBÚRBIO XÊNON — 69.9 | `#ff2d78` |
| CIDADENEON.CRYPTO — 88.7 | `#3b82f6` |
| LIVE NEON — 111.3 | `#a855f7` |
| CIDADE NEON 222.4 FM — 222.4 | `#22ff88` |

### Faixas do álbum (`TRACKS` em `app/page.tsx`)
| Faixa | Cor |
|---|---|
| nectar | `#FF6B9D` |
| dopamina | `#FF9D6B` |
| ojala | `#6B9DFF` |
| sabe ontem? | `#FFD93D` |
| chuva | `#9DFF6B` |

## Tom

- Textos em minúsculo, gírias, tom direto de conversa entre amigos — nunca
  formal (ver diálogos do grupo N3XO em `app/page.tsx`)
- Terminal/hacker: verde-fósforo, efeito de scramble no texto, glitch
- HUD de jogo (carro, rádio): translúcido, com glow — referência direta ao
  HUD do Horizon Drive

## Onde a referência não resolve sozinha

Perguntar antes de decidir paleta/tom para telas totalmente novas que não
tenham equivalente hoje no app nem na referência (ex: uma seção que não é
carro, celular nem terminal).
