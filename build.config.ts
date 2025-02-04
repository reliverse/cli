import { resolve, dirname } from "pathe";
import { defineBuildConfig } from "unbuild";
import { fileURLToPath } from "url";

/**
 * The list of supported bundler names.
 */
export type BundlerName =
  | "jsr"
  | "bun"
  | "copy"
  | "mkdist"
  | "rollup"
  | "untyped";

/**
 * BuildPublishConfig describes the configuration for version bumping,
 * build output directories, bundler selection, publishing options,
 * and additional build settings.
 */
export type BuildPublishConfig = {
  /**
   * The bump mode for versioning, used if the user didn't provide --bump:
   * - "autoPatch": 1.2.3 -> 1.2.4
   * - "autoMinor": 1.2.3 -> 1.3.0
   * - "autoMajor": 1.2.3 -> 2.0.0
   */
  bump: "autoPatch" | "autoMinor" | "autoMajor";

  /** Enables more detailed log output */
  verbose: boolean;

  /** Do a dry run (publish --dry-run) instead of a real publish */
  dryRun: boolean;

  /** Build only but skip publishing (and do not remove dist folders) */
  pausePublish: boolean;

  /** Allow publishing with uncommitted changes (--allow-dirty) */
  allowDirty: boolean;

  /** Allow JSR to use slow types (--allow-slow-types) */
  jsrSlowTypes: boolean;

  /** Target registry: "npm", "jsr", or "npm-jsr". */
  registry: "npm" | "jsr" | "npm-jsr";

  /** Output directory for NPM build artifacts */
  npmDistDir: string;

  /** Output directory for JSR build artifacts */
  jsrDistDir: string;

  /** Directory where the source code resides */
  rootSrcDir: string;

  /** Bundler to use for NPM builds */
  builderNpm: BundlerName;

  /** Bundler to use for JSR builds */
  builderJsr: BundlerName;

  /** Minify the build output */
  shouldMinify: boolean;

  /** Split the build output into chunks */
  splitting: boolean;

  /**
   * Whether to generate sourcemaps.
   * For Bun/Rollup: boolean | "inline" | "none" | "linked" | "external"
   */
  sourcemap: boolean | "inline" | "none" | "linked" | "external";

  /** Output format: "esm", "cjs", or "iife" */
  format: "esm" | "cjs" | "iife";

  /** Build target environment: "node", "bun", or "browser" */
  target: "node" | "bun" | "browser";

  /** Public path for the output */
  publicPath: string;

  /**
   * Tracks if the version bump is disabled.
   * Used to prevent re-bumping on retry.
   */
  disableBump: boolean;

  /** Indicates which target was last built ("npm" or "jsr")
   * Please don't change this unless you know what you're doing.
   */
  lastBuildFor: "npm" | "jsr";

  /** Flag indicating if the build is for JSR */
  isJSR: boolean;
};

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Default configuration for the publishing script.
 */
export const pubConfig: BuildPublishConfig = {
  // Publish config
  registry: "npm-jsr",
  pausePublish: false,

  // Bump config
  bump: "autoPatch",
  disableBump: false,

  // Output directories
  npmDistDir: resolve(CURRENT_DIR, "dist-npm"),
  jsrDistDir: resolve(CURRENT_DIR, "dist-jsr"),
  rootSrcDir: resolve(CURRENT_DIR, "src"),

  // Bundler options
  builderNpm: "mkdist",
  builderJsr: "jsr",

  // Build config
  format: "esm",
  target: "node",
  publicPath: "/",
  sourcemap: "none",
  shouldMinify: true,
  splitting: false,

  // Publish flags
  jsrSlowTypes: true,
  allowDirty: true,
  dryRun: false,

  // Build/pub helpers
  verbose: false,

  // Build overrides – don't change these manually
  lastBuildFor: "npm",
  isJSR: false,
};

/**
 * Helper to compute the Rollup sourcemap option based on the configuration.
 */
function getRollupSourcemapOption(
  sourcemap: boolean | "inline" | "none" | "linked" | "external",
): boolean | "inline" {
  if (sourcemap === "none") return false;
  if (sourcemap === "inline") return sourcemap;
  if (sourcemap === "linked" || sourcemap === "external" || sourcemap)
    return true;
  return false;
}

/**
 * Helper for Bun builds: convert the sourcemap option to a Bun-friendly value.
 */
export function getBunSourcemapOption(
  sourcemap: boolean | "inline" | "none" | "linked" | "external",
): "none" | "inline" | "external" {
  if (sourcemap === "none" || sourcemap === false) return "none";
  if (sourcemap === "inline") return "inline";
  // For "linked", "external", or boolean true, return "external"
  return "external";
}

// Select the appropriate bundler based on the last build target.
const selectedBuilder =
  pubConfig.lastBuildFor === "npm"
    ? pubConfig.builderNpm
    : pubConfig.builderJsr;

const shouldMinify = pubConfig.shouldMinify;

const buildConfig =
  // Use defineBuildConfig only if not using the "bun" or "jsr" bundlers.
  selectedBuilder !== "bun" && selectedBuilder !== "jsr"
    ? defineBuildConfig({
        declaration: false,
        clean: false,
        entries: [
          {
            outDir:
              pubConfig.lastBuildFor === "npm"
                ? `${pubConfig.npmDistDir}/bin`
                : `${pubConfig.jsrDistDir}/bin`,
            builder: selectedBuilder,
            format: pubConfig.format === "esm" ? "esm" : "cjs",
            input: "src",
            ext: "js",
          },
        ],
        rollup: {
          emitCJS: false,
          inlineDependencies: true,
          esbuild: {
            target: "es2023",
            minify: shouldMinify,
          },
          output: {
            sourcemap: getRollupSourcemapOption(pubConfig.sourcemap),
          },
        },
      })
    : undefined;

export default buildConfig;
