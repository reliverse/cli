export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export const getUserPkgManager: () => PackageManager = () => {
  // This environment variable is set by npm and yarn but pnpm seems less consistent
  const pkgManagerUserAgent = process.env["npm_config_user_agent"];

  if (pkgManagerUserAgent) {
    if (pkgManagerUserAgent.startsWith("yarn")) {
      return "yarn";
    } else if (pkgManagerUserAgent.startsWith("pnpm")) {
      return "pnpm";
    } else if (pkgManagerUserAgent.startsWith("bun")) {
      return "bun";
    } else {
      return "npm";
    }
  } else {
    // If no user agent is set, assume npm
    return "npm";
  }
};
