import { fileURLToPath } from "node:url";
import createJiti from "jiti";

// Import env files to validate at build time
// Use jiti so we can load .ts files in here
createJiti(fileURLToPath(import.meta.url))("./src/env");

/** @type {import('next').NextConfig} */
const nextConfig = {
	// Enables hot reloading for local packages without build step
	transpilePackages: ["@repo/primitives"],
};

export default nextConfig;
