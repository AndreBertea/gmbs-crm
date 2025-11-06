/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: '/Users/andrebertea/Projects/GMBS/gmbs-crm',
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: 'asset/resource',
    });
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*(.glb)",
        headers: [
          { key: "Content-Type", value: "model/gltf-binary" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:path*(.gltf)",
        headers: [
          { key: "Content-Type", value: "model/gltf+json" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;

