/** @type {import('next').NextConfig} */
const nextConfig = {
  // web estática en out/ (todo va en el navegador contra Supabase): se sube tal cual a Cloudflare Pages
  output: "export",
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
