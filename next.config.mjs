// o que o site pode carregar (ver headers): o próprio domínio, os Blobs da
// Vercel (áudio dos discos, criações), o PostHog (via /ingest), vídeos do
// YouTube das páginas antigas e imagens do Wikimedia (museu)
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://commons.wikimedia.org https://upload.wikimedia.org https://i.ytimg.com",
  "media-src 'self' blob: https://*.public.blob.vercel-storage.com",
  "connect-src 'self' blob: data: https://*.public.blob.vercel-storage.com https://eu.i.posthog.com https://eu-assets.i.posthog.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.ingest.de.sentry.io",
  "font-src 'self' data:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ")

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Otimização de imagem do Next ligada — funciona automático no Vercel
  // (sem precisar instalar `sharp`). Tinha uma imagem de 3.8MB crua indo
  // pro navegador sem redimensionar (public/museu/satelite-1.jpg).
  images: {},
  // `eslint.ignoreDuringBuilds` foi removido em Next 16 —
  // use `next lint` separadamente ou a nova config em ~/.eslintrc.
  turbopack: {
    // silencia warning de root com múltiplos lockfiles
    root: import.meta.dirname,
  },
  // PostHog via proxy no próprio domínio: bloqueadores de anúncio (uBlock,
  // Brave) barram eu.i.posthog.com, e cada visitante com bloqueador sumia
  // dos dados. Passando por lu2ca.art/ingest o tráfego vira do próprio site.
  // Receita oficial do PostHog pra Next.js (região EU).
  // A Linha 222 é o jogo agora: a v1 (o celular antigo em "/") foi
  // descontinuada. O código dela fica no repo, mas "/" leva pra /linha
  // (query junto: ?dev=1, utm_*). Os apps antigos que "voltam pra home"
  // caem aqui também — a janela da Linha fecha quando vê /linha.
  async redirects() {
    return [{ source: "/", destination: "/linha", permanent: false }]
  },
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://eu-assets.i.posthog.com/array/:path*" },
      { source: "/ingest/:path*", destination: "https://eu.i.posthog.com/:path*" },
    ]
  },
  // Exigido pelo proxy acima: a API do PostHog usa barra final em algumas
  // rotas, e o redirect automático do Next quebraria essas chamadas.
  skipTrailingSlashRedirect: true,
  // Cache moderado (não "immutable") pros assets estáticos pesados —
  // 1 dia de cache do navegador + revalida em background por até 1
  // semana. Não usa max-age de 1 ano porque esses arquivos já foram
  // substituídos com o mesmo nome antes (ex: masters corrigidos) —
  // cache "immutable" faria quem já visitou ficar preso na versão velha.
  async headers() {
    return [
      // segurança em todas as páginas: ninguém embute o site num iframe de
      // fora (golpe de clique), o navegador não "adivinha" tipo de arquivo,
      // não vaza o caminho completo pra outros sites, e só o microfone
      // (as ligações de voz do jogo) fica liberado entre os sensores
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // A REGRA DE CONTEÚDO (CSP, 06/10): o que o site pode carregar. Em
          // OBSERVAÇÃO primeiro (Report-Only: só avisa no console, não
          // bloqueia); depois de conferir que nada quebra, vira a de verdade
          { key: "Content-Security-Policy-Report-Only", value: CSP },
        ],
      },
      {
        source: "/(audio|images|models|museu|galeria|loja-discos|radio-222)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ]
  },
}

export default nextConfig
