import type { NextConfig } from "next";
import path from "path";

const bucketName = process.env.AWS_BUCKET_NAME || process.env.NEXT_PUBLIC_AWS_BUCKET_NAME || "goride-storage";
const bucketRegion = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || "eu-north-1";
const s3Hostname =
  process.env.NEXT_PUBLIC_S3_HOSTNAME || `${bucketName}.s3.${bucketRegion}.amazonaws.com`;

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: s3Hostname,
      },
      {
        protocol: 'https',
        hostname: `${bucketName}.s3.amazonaws.com`,
      },
      {
        protocol: 'https',
        hostname: `s3.${bucketRegion}.amazonaws.com`,
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      }
    ],
  },
};

export default nextConfig;
