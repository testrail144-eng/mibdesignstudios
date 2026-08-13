/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Firebase is used entirely client-side; no server env needed.
  // Keep images unoptimized so we don't need a loader for Firebase Storage URLs.
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
