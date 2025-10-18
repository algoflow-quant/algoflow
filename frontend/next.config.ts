import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/jupyter/:path*',
        destination: 'http://localhost:8888/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    const TildeResolverPlugin = require('./webpack-tilde-resolver');
    const path = require('path');

    // Handle Jupyter-specific modules and Supabase node-fetch issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        util: false,
        buffer: require.resolve('buffer/'),
        'whatwg-url': false,
      };
    }

    // Add custom plugin to resolve ~ in CSS imports
    config.resolve.plugins = config.resolve.plugins || [];
    config.resolve.plugins.push(new TildeResolverPlugin());

    // Stub out problematic JupyterLab style imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@jupyterlab/apputils-extension/style': path.resolve(__dirname, 'stub-empty'),
      '@jupyterlab/cell-toolbar-extension/style': path.resolve(__dirname, 'stub-empty'),
      '@jupyterlab/notebook-extension/style': path.resolve(__dirname, 'stub-empty'),
    };

    // Ignore .whl files completely
    config.module.rules.push({
      test: /\.whl$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/[hash][ext]',
      },
    });

    // Don't parse .whl files
    config.module.noParse = [/\.whl$/];

    return config;
  },
};

export default nextConfig;
