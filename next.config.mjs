/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The app uses Firebase in the browser and a small server route for
  // authenticated Gmail notifications. Keep images unoptimized because photos
  // are stored as compressed Firestore data URLs.
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
