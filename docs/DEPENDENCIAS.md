# Dependências

Gerado por `node scripts/gerar-dependencias.mjs`. Não editar à mão: a explicação de cada pacote fica no mapa dentro do script. O CI falha se entrar dependência sem explicação.

`arquivos que importam = 0` não prova que está sem uso (CSS, plugins e tipos entram por configuração), mas é o primeiro lugar pra procurar peso morto.

## Em produção
| pacote | versão | grupo | pra quê | arquivos que importam |
|---|---|---|---|---|
| @breezystack/lamejs | ^1.2.7 | prod | codificador MP3 no navegador | 1 |
| @hookform/resolvers | ^3.10.0 | prod | liga react-hook-form ao zod | 0 |
| @radix-ui/react-accordion | 1.3.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-alert-dialog | 1.2.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-aspect-ratio | 1.2.0 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-avatar | 1.3.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-checkbox | 1.4.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-collapsible | 1.2.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-context-menu | 2.4.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-dialog | 1.3.1 | prod | primitivo de UI acessível (base do shadcn) | 2 |
| @radix-ui/react-dropdown-menu | 2.2.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-hover-card | 1.2.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-label | 2.1.17 | prod | primitivo de UI acessível (base do shadcn) | 2 |
| @radix-ui/react-menubar | 1.2.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-navigation-menu | 1.4.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-popover | 1.3.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-progress | 1.2.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-radio-group | 1.5.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-scroll-area | 1.4.0 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-select | 2.4.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-separator | 1.2.0 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-slider | 1.6.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-slot | 1.5.0 | prod | primitivo de UI acessível (base do shadcn) | 7 |
| @radix-ui/react-switch | 1.4.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-tabs | 1.2.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-toast | 1.3.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-toggle | 1.2.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-toggle-group | 1.2.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @radix-ui/react-tooltip | 1.4.1 | prod | primitivo de UI acessível (base do shadcn) | 1 |
| @react-three/drei | ^10.7.9 | prod | peças prontas pro R3F (câmeras, GLB, controles) | 51 |
| @react-three/fiber | ^9.8.2 | prod | Three.js declarativo dentro do React | 102 |
| @react-three/postprocessing | ^3.2.2 | prod | efeitos de tela no 3D (bloom etc.) | 1 |
| @react-three/rapier | ^2.2.0 | prod | física 3D | 4 |
| @sentry/browser | ^11.12.0 | prod | captura de erros em produção | 1 |
| @vercel/analytics | latest | prod | métricas de visitas da Vercel | 1 |
| @vercel/blob | ^2.9.0 | prod | armazenamento de arquivos na Vercel | 2 |
| autoprefixer | ^10.6.2 | prod | prefixos CSS | 0 |
| class-variance-authority | ^0.7.1 | prod | variantes de componentes (shadcn) | 13 |
| clsx | ^2.1.1 | prod | junta classes CSS | 1 |
| cmdk | 1.1.1 | prod | paleta de comandos (shadcn) | 1 |
| date-fns | 4.4.0 | prod | datas | 0 |
| embla-carousel-react | 8.6.0 | prod | carrossel (shadcn) | 1 |
| framer-motion | ^14.14.0 | prod | animações de interface | 1 |
| input-otp | 1.5.0 | prod | campo de código (shadcn) | 1 |
| lucide-react | ^1.62.0 | prod | ícones | 23 |
| next | 16.4.6 | prod | framework web (rotas, build, deploy na Vercel) | 62 |
| next-themes | ^0.4.6 | prod | tema claro/escuro | 2 |
| posthog-js | ^1.448.0 | prod | analytics do jogo (PostHog EU) | 4 |
| postprocessing | ^6.39.6 | prod | base dos efeitos de tela | 1 |
| react | 19.3.1 | prod | interface | 322 |
| react-day-picker | 9.8.0 | prod | calendário (shadcn) | 1 |
| react-dom | 19.3.1 | prod | interface no navegador | 2 |
| react-hook-form | ^7.92.0 | prod | formulários | 1 |
| react-resizable-panels | ^2.1.7 | prod | painéis redimensionáveis (shadcn) | 1 |
| sonner | ^1.7.4 | prod | avisos (toasts) | 1 |
| tailwind-merge | ^2.5.5 | prod | resolve conflito de classes Tailwind | 1 |
| tailwindcss-animate | ^1.0.7 | prod | animações utilitárias do Tailwind | 0 |
| three | ^0.187.0 | prod | motor 3D (renderiza o jogo) | 143 |
| vaul | ^1.1.2 | prod | gaveta de baixo pra cima (shadcn) | 1 |
| zod | 4.6.7 | prod | validação de dados | 0 |

## Só pra desenvolver
| pacote | versão | grupo | pra quê | arquivos que importam |
|---|---|---|---|---|
| @playwright/test | ^1.65.0 | dev | testes de navegador (tests/) | 0 |
| @tailwindcss/postcss | ^4.3.5 | dev | Tailwind 4 no build | 0 |
| @types/node | ^22 | dev | tipos | 0 |
| @types/react | ^19 | dev | tipos | 0 |
| @types/react-dom | ^19 | dev | tipos | 0 |
| @types/three | ^0.187.0 | dev | tipos do Three.js | 0 |
| eslint | ^10 | dev | análise estática | 0 |
| eslint-config-next | 16.4.6 | dev | regras de lint do Next | 0 |
| postcss | ^8.5 | dev | processa o CSS | 0 |
| tailwindcss | ^4.3.5 | dev | estilos | 2 |
| tw-animate-css | 1.4.0 | dev | animações utilitárias do Tailwind 4 | 2 |
| typescript | ^5 | dev | tipos e checagem | 0 |
