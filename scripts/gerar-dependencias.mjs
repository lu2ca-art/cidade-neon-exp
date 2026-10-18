// Gera docs/DEPENDENCIAS.md a partir do package.json + uso real no código.
// `node scripts/gerar-dependencias.mjs --check` falha se existir dependência sem explicação aqui (CI).
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

const PARA_QUE = {
  next: "framework web (rotas, build, deploy na Vercel)",
  react: "interface",
  "react-dom": "interface no navegador",
  three: "motor 3D (renderiza o jogo)",
  "@react-three/fiber": "Three.js declarativo dentro do React",
  "@react-three/drei": "peças prontas pro R3F (câmeras, GLB, controles)",
  "@react-three/postprocessing": "efeitos de tela no 3D (bloom etc.)",
  "@react-three/rapier": "física 3D",
  postprocessing: "base dos efeitos de tela",
  "posthog-js": "analytics do jogo (PostHog EU)",
  "@sentry/browser": "captura de erros em produção",
  "@vercel/analytics": "métricas de visitas da Vercel",
  "@vercel/blob": "armazenamento de arquivos na Vercel",
  "@breezystack/lamejs": "codificador MP3 no navegador",
  "@hookform/resolvers": "liga react-hook-form ao zod",
  "react-hook-form": "formulários",
  zod: "validação de dados",
  "framer-motion": "animações de interface",
  recharts: "gráficos",
  "lucide-react": "ícones",
  "date-fns": "datas",
  clsx: "junta classes CSS",
  "tailwind-merge": "resolve conflito de classes Tailwind",
  "class-variance-authority": "variantes de componentes (shadcn)",
  "tailwindcss-animate": "animações utilitárias do Tailwind",
  "tw-animate-css": "animações utilitárias do Tailwind 4",
  autoprefixer: "prefixos CSS",
  cmdk: "paleta de comandos (shadcn)",
  "embla-carousel-react": "carrossel (shadcn)",
  "input-otp": "campo de código (shadcn)",
  "next-themes": "tema claro/escuro",
  "react-day-picker": "calendário (shadcn)",
  "react-resizable-panels": "painéis redimensionáveis (shadcn)",
  sonner: "avisos (toasts)",
  vaul: "gaveta de baixo pra cima (shadcn)",
  "@tailwindcss/postcss": "Tailwind 4 no build",
  tailwindcss: "estilos",
  postcss: "processa o CSS",
  typescript: "tipos e checagem",
  eslint: "análise estática",
  "eslint-config-next": "regras de lint do Next",
  "@playwright/test": "testes de navegador (tests/)",
  "@types/node": "tipos",
  "@types/react": "tipos",
  "@types/react-dom": "tipos",
  "@types/three": "tipos do Three.js",
}
const PREFIXOS = [["@radix-ui/", "primitivo de UI acessível (base do shadcn)"]]

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const todas = { ...pkg.dependencies, ...pkg.devDependencies }
const explicacao = (n) => PARA_QUE[n] ?? PREFIXOS.find(([p]) => n.startsWith(p))?.[1]

const sem = Object.keys(todas).filter((n) => !explicacao(n))
if (process.argv.includes("--check")) {
  if (sem.length) {
    console.error(`Dependência sem explicação em scripts/gerar-dependencias.mjs: ${sem.join(", ")}`)
    process.exit(1)
  }
  console.log(`ok: ${Object.keys(todas).length} dependências explicadas`)
  process.exit(0)
}

const arquivos = []
const varre = (d) => {
  for (const f of readdirSync(d)) {
    if (["node_modules", ".next", "public", "blender", "docs"].includes(f)) continue
    const p = join(d, f)
    if (statSync(p).isDirectory()) varre(p)
    else if (/\.(tsx?|mjs|jsx?|css)$/.test(f)) arquivos.push(p)
  }
}
for (const d of ["app", "components", "lib", "hooks", "styles"]) varre(d)
const textos = arquivos.map((p) => readFileSync(p, "utf8"))
const usos = (n) => textos.filter((t) => t.includes(`"${n}"`) || t.includes(`"${n}/`) || t.includes(`'${n}'`) || t.includes(`'${n}/`) || t.includes(`@import "${n}`)).length

const linha = (n, v, grupo) => `| ${n} | ${v} | ${grupo} | ${explicacao(n) ?? "a documentar"} | ${usos(n)} |`
const cab = "| pacote | versão | grupo | pra quê | arquivos que importam |\n|---|---|---|---|---|"
const saida = [
  "# Dependências",
  "",
  "Gerado por `node scripts/gerar-dependencias.mjs`. Não editar à mão: a explicação de cada pacote fica no mapa dentro do script. O CI falha se entrar dependência sem explicação.",
  "",
  "`arquivos que importam = 0` não prova que está sem uso (CSS, plugins e tipos entram por configuração), mas é o primeiro lugar pra procurar peso morto.",
  "",
  "## Em produção",
  cab,
  ...Object.entries(pkg.dependencies).map(([n, v]) => linha(n, v, "prod")),
  "",
  "## Só pra desenvolver",
  cab,
  ...Object.entries(pkg.devDependencies).map(([n, v]) => linha(n, v, "dev")),
  "",
].join("\n")
writeFileSync("docs/DEPENDENCIAS.md", saida)
console.log(`docs/DEPENDENCIAS.md escrito (${Object.keys(todas).length} pacotes)`)
