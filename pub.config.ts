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
   * It also prevents dist folders from being removed.
   */
  pausePublish: boolean;

  /**
   * Where to publish: "npm", "jsr", or "npm-jsr".
   * If something else, the script won't publish anywhere, just builds.
   */
  registry: "npm" | "jsr" | "npm-jsr";

  /**
   * Where to emit the NPM build artifacts.
   */
  npmDistDir: string;

  /**
   * Where to emit the JSR build artifacts.
   */
  jsrDistDir: string;

  /**
   * Where the source code resides (default "src" folder).
   */
  rootSrcDir: string;

  /**
   * The bundler to use for building the NPM-optimized package.
   */
  builderNpm: "bun" | "copy" | "mkdist" | "rollup" | "untyped";

  /**
   * The bundler to use for building the JSR-optimized package.
   */
  builderJsR: "bun" | "copy" | "mkdist" | "rollup" | "untyped";

  /**
   * If `true`, minify the build output.
   */
  shouldMinify: boolean;

  /**
   * If `true`, split the build output into multiple chunks.
   */
  splitting: boolean;

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
   * Public path for the output.
   */
  publicPath: string;

  /**
   * Tracks if an error occurred after a successful version bump.
   * Used to prevent re-bumping on retry if the error was earlier.
   */
  disableBump: boolean;
};

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Default configuration for the publishing script.
 */
const pubConfig: PublishConfig = {
  // Registry configuration
  registry: "npm-jsr",

  // Bumping configuration
  bump: "autoPatch",
  disableBump: false,

  // Behavior toggles
  pausePublish: true,
  verbose: true,
  dryRun: false,

  // Output directories
  npmDistDir: resolve(CURRENT_DIR, "dist-npm"),
  jsrDistDir: resolve(CURRENT_DIR, "dist-jsr"),
  rootSrcDir: resolve(CURRENT_DIR, "src"),

  // Build configuration
  builderNpm: "mkdist",
  builderJsR: "copy",
  shouldMinify: true,
  splitting: false,
  sourcemap: "linked",
  target: "node",
  format: "esm",
  publicPath: "/",
};

export default pubConfig;
