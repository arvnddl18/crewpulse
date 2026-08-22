import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@crewpulse/domain"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
