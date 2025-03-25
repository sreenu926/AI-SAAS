/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "oaidalleapiprodscus.blob.core.windows.net",
      "firebasestorage.googleapis.com",
    ],
  },
  reactStrictMode: true,
};

export default nextConfig;
