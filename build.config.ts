import { resolve, dirname } from "pathe";
import { defineBuildConfig } from "unbuild";
import { fileURLToPath } from "url";

/**
 * Supported bundler names.
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
  /** Version bump mode: "autoPatch" (1.2.3 → 1.2.4), "autoMinor" (1.2.3 → 1.3.0), or "autoMajor" (1.2.3 → 2.0.0) */
  bump: "autoPatch" | "autoMinor" | "autoMajor";

  /** Enables verbose logging */
  verbose: boolean;

  /** Dry run mode for publishing (does not actually publish) */
  dryRun: boolean;

  /** Build-only mode: skip publishing and do not remove distribution folders */
  pausePublish: boolean;

  /** Allow publishing with uncommitted changes (--allow-dirty) */
  allowDirty: boolean;

  /** Allow JSR to use slow types (--allow-slow-types) */
  jsrSlowTypes: boolean;

  /** Target registry: "npm", "jsr", or "npm-jsr" */
  registry: "npm" | "jsr" | "npm-jsr";

  /** Output directory for NPM build artifacts */
  npmDistDir: string;

  /** Output directory for JSR build artifacts */
  jsrDistDir: string;

  /** Directory containing the source code */
  rootSrcDir: string;

  /** Bundler to use for NPM builds */
  builderNpm: BundlerName;

  /** Bundler to use for JSR builds */
  builderJsr: BundlerName;

  /** Whether to minify the build output */
  shouldMinify: boolean;

  /** Whether to split the build output into chunks */
  splitting: boolean;

  /**
   * Sourcemap configuration.
   * Options: boolean, "inline", "none", "linked", or "external"
   */
  sourcemap: boolean | "inline" | "none" | "linked" | "external";

  /** Output format: "esm", "cjs", or "iife" */
  format: "esm" | "cjs" | "iife";

  /** Build target environment: "node", "bun", or "browser" */
  target: "node" | "bun" | "browser";

  /** Public path for the output assets */
  publicPath: string;

  /** Flag to disable version bumping (prevents re-bumping on retry) */
  disableBump: boolean;

  /** Indicates which target was last built ("npm" or "jsr") */
  lastBuildFor: "npm" | "jsr";

  /** Flag indicating if the build is for JSR */
  isJSR: boolean;

  /** Flag indicating if the build is for a CLI package */
  isCLI: boolean;
};

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Default configuration for the publishing script.
 */
export const pubConfig: BuildPublishConfig = {
  // Publish configuration
  registry: "npm-jsr",
  pausePublish: false,

  // Bump configuration
  bump: "autoPatch",
  disableBump: false,

  // Output directories
  npmDistDir: resolve(ROOT_DIR, "dist-npm"),
  jsrDistDir: resolve(ROOT_DIR, "dist-jsr"),
  rootSrcDir: resolve(ROOT_DIR, "src"),

  // Bundler options
  builderNpm: "mkdist",
  builderJsr: "jsr",

  // Build configuration
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

  // Helper flags
  verbose: true,

  // CLI flag
  isCLI: true,

  // Build overrides – do not modify these manually
  lastBuildFor: "npm",
  isJSR: false,
};

/**
 * Computes the Rollup sourcemap option based on the given configuration.
 * @param sourcemap - Sourcemap configuration.
 * @returns "inline" if inline is specified; true for linked/external or boolean true; otherwise false.
 */
function getRollupSourcemapOption(
  sourcemap: boolean | "inline" | "none" | "linked" | "external",
): boolean | "inline" {
  switch (sourcemap) {
    case "none":
      return false;
    case "inline":
      return "inline";
    case "linked":
    case "external":
      return true;
    default:
      return !!sourcemap;
  }
}

/**
 * Converts the sourcemap option to a Bun-friendly value.
 * @param sourcemap - Sourcemap configuration.
 * @returns "none", "inline", or "external".
 */
export function getBunSourcemapOption(
  sourcemap: boolean | "inline" | "none" | "linked" | "external",
): "none" | "inline" | "external" {
  if (sourcemap === "none" || sourcemap === false) return "none";
  if (sourcemap === "inline") return "inline";
  // For "linked", "external", or boolean true, return "external"
  return "external";
}

// Determine the appropriate bundler based on the last build target.
const selectedBuilder: BundlerName =
  pubConfig.lastBuildFor === "npm"
    ? pubConfig.builderNpm
    : pubConfig.builderJsr;

const shouldMinify = pubConfig.shouldMinify;

// Compute the output directory for build entries.
const outputBinDir =
  pubConfig.lastBuildFor === "npm"
    ? resolve(pubConfig.npmDistDir, "bin")
    : resolve(pubConfig.jsrDistDir, "bin");

// Toggle flag for library builds – similar to lastBuildFor toggling.
export const isNextBuildLib = {
  // @reliverse/config
  config: false,
};

/**
 * Build configuration using unbuild.
 * Only defined when not using "bun" or "jsr" bundlers.
 */
const buildConfig =
  selectedBuilder !== "bun" && selectedBuilder !== "jsr"
    ? defineBuildConfig({
        declaration: false,
        clean: false,
        entries: [
          {
            input: isNextBuildLib.config
              ? "src/utils/libs/config/schemaConfig.ts"
              : "src",
            outDir: isNextBuildLib.config
              ? `dist-libs/config/${outputBinDir}`
              : outputBinDir,
            builder: selectedBuilder,
            format: pubConfig.format === "esm" ? "esm" : "cjs",
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
