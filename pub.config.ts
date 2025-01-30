import { resolve, dirname } from "pathe";
import { fileURLToPath } from "url";

/**
 * PublishConfig interface describes the shape of the entire configuration.
 */
export type PublishConfig = {
  /**
   * The bump mode for versioning, used if the user didn't provide --bump:
   *   - "autoPatch" automatically increments patch version (1.2.3 -> 1.2.4)
   *   - "autoMinor" automatically increments minor version (1.2.3 -> 1.3.0)
   *   - "autoMajor" automatically increments major version (1.2.3 -> 2.0.0)
   */
  bump: "autoPatch" | "autoMinor" | "autoMajor";

  /**
   * If `true`, enables more detailed log output.
   */
  verbose: boolean;

  /**
   * If `true`, do a "publish --dry-run" instead of a real publish.
   */
  dryRun: boolean;

  /**
   * If `true`, build only but skip publishing altogether.
   */
  pausePublish: boolean;

  /**
   * If `true`, do NOT remove dist folders before building.
   */
  noDistRm: boolean;

  /**
   * Where to publish: "npm", "jsr", or "npm-jsr".
   * If something else, the script won't publish anywhere, just builds.
   */
  registry: "npm" | "jsr" | "npm-jsr";

  /**
   * Where to emit the NPM build artifacts.
   */
  outputDirNpm: string;

  /**
   * Where to emit the JSR build artifacts.
   */
  outputDirJsr: string;

  /**
   * Where your source code resides (default "src" folder).
   */
  defaultSourceDir: string;

  /**
   * If `true`, minify the build output.
   */
  shouldMinify: boolean;

  /**
   * Type of sourcemap to generate. Can be `true`, `false`, `"linked"`, `"inline"`, or `"external"`.
   */
  sourcemap: boolean | "linked" | "inline" | "external";

  /**
   * Build target environment. Typically "node" or "browser".
   */
  target: "node" | "bun" | "browser";

  /**
   * Output format. Typically "esm" or "cjs".
   */
  format: "esm" | "cjs" | "iife";

  /**
   * Tracks if an error occurred after a successful version bump.
   * Used to prevent re-bumping on retry if the error was in a later step.
   */
  gotErrorAfterBump: boolean;

  /**
   * If `true`, enables debug logging for path mapping.
   */
  debugPathsMap: boolean;
};

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Default configuration for the publishing script.
 * You can switch these to "autoMinor" or "autoMajor" if you want different defaults.
 */
const config: PublishConfig = {
  bump: "autoPatch", // Only "autoPatch" | "autoMinor" | "autoMajor" allowed (use --bump=1.2.3 to set a specific version)
  gotErrorAfterBump: false, // Tracks if an error occurred after a successful version bump. Used to prevent re-bumping on retry.

  // Behavior toggles
  verbose: false,
  noDistRm: true,
  pausePublish: false,
  dryRun: false,

  // Registry configuration
  registry: "jsr",

  // Output directories
  outputDirNpm: resolve(CURRENT_DIR, "dist-npm"),
  outputDirJsr: resolve(CURRENT_DIR, "dist-jsr"),
  defaultSourceDir: resolve(CURRENT_DIR, "src"),

  // Build configuration
  shouldMinify: true,
  sourcemap: "linked",
  target: "node",
  format: "esm",

  // Debugging
  debugPathsMap: false,
};

export default config;
