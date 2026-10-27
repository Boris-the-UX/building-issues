import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['@huggingface/transformers', 'onnxruntime-node'],
};
export default nextConfig;
