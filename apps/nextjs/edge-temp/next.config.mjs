/** @see https://nextjs.org/docs/app/building-your-application/configuring */

// Importing env files here to validate on build
import "./src/env.mjs";
import "@acme/auth/env.mjs";

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: ["@acme/api", "@acme/auth", "@acme/db"],
  /**
   * If you do lint and typechecking as
   * separate tasks in CI, uncomment to
   * speed up your development workflow
   */
  // eslint: { ignoreDuringBuilds: true },
  // typescript: { ignoreBuildErrors: true },
};

export default config;
