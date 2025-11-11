/** @type {import('next').NextConfig} */
const nextConfig = {
  // Retirer outputFileTracingRoot en développement (causait des problèmes sur Windows)
  // outputFileTracingRoot est principalement utile pour le build de production
  ...(process.env.NODE_ENV === 'production' && {
    outputFileTracingRoot: process.cwd(),
  }),
  
  // Optimisations pour le développement
  ...(process.env.NODE_ENV === 'development' && {
    // Réduire la verbosité des logs en développement
    logging: {
      fetches: {
        fullUrl: false,
      },
    },
    // Augmenter le timeout pour éviter les erreurs ChunkLoadError
    turbopack: {
      resolveAlias: {
        // Éviter les problèmes de résolution de modules
      },
    },
  }),

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // Configuration pour les fichiers GLB/GLTF
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: 'asset/resource',
    });

    // Optimisations pour le développement - exclure les répertoires non nécessaires du watch
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/out/**',
          '**/build/**',
          '**/scripts/**',
          '**/docs/**',
          '**/data/**',
          '**/tests/**',
          '**/examples/**',
          '**/supabase/migrations/**',
          '**/supabase/seeds/**',
          '**/supabase/samples/**',
          '**/*.md',
          '**/*.log',
          '**/geocode.log',
          '**/user-credentials*.json',
        ],
      };
    }

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

