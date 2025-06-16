import type {NextConfig} from 'next';

const isGithubPages = process.env.GITHUB_ACTIONS || false;
const repoName = 'Market-King'; // As specified in your instructions

const nextConfig: NextConfig = {
  output: 'export', // Essential for static site generation for GitHub Pages

  // Configure assetPrefix and basePath for GitHub Pages.
  // An empty string for assetPrefix/basePath usually defaults to root,
  // which is fine for local dev or other non-GitHub Pages hosting.
  assetPrefix: isGithubPages ? `/${repoName}/` : '',
  basePath: isGithubPages ? `/${repoName}` : '',

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // For GitHub Pages (static export with potential basePath),
    // images often need to be unoptimized.
    unoptimized: isGithubPages ? true : false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
