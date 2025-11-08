import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: '/Users/andrebertea/Projects/GMBS/gmbs-crm',
  
  // Optimisations de compilation
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Optimisations d'images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  
  // Optimisations expérimentales
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-accordion',
      '@radix-ui/react-tabs',
      '@tanstack/react-table',
      'recharts',
      'date-fns',
    ],
  },
  
  webpack: (config, { isServer }) => {
    // Configuration pour les fichiers GLB/GLTF
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: 'asset/resource',
    });
    
    // Optimisation du tree-shaking
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    // Optimisation des chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk pour les grandes librairies
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Chunk séparé pour Radix UI
          radix: {
            name: 'radix',
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Chunk séparé pour les librairies de mapping
          maps: {
            name: 'maps',
            test: /[\\/]node_modules[\\/](maplibre-gl|@maptiler)[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Chunk séparé pour React Query
          reactQuery: {
            name: 'react-query',
            test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Chunk commun pour les composants partagés
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      },
    };
    
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
      {
        source: "/:path*(.jpg|.jpeg|.png|.webp|.avif|.svg)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  
  // Compression
  compress: true,
  
  // Production source maps désactivés pour réduire la taille
  productionBrowserSourceMaps: false,
};

export default withBundleAnalyzer(nextConfig);

