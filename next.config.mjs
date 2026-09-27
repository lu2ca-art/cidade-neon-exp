/** @type {import('next').NextConfig} */
const nextConfig = {
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
