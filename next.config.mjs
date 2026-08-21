/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // `eslint.ignoreDuringBuilds` foi removido em Next 16 —
  // use `next lint` separadamente ou a nova config em ~/.eslintrc.
  turbopack: {
    // silencia warning de root com múltiplos lockfiles
    root: import.meta.dirname,
  },
}

export default nextConfig
