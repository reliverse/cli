import { re } from "@reliverse/relico";
import os from "os";
import path from "pathe";

export const cliVersion = "1.5.10";
export const cliName = "@reliverse/cli";

// GENERAL CONFIG NAMES
export const tsconfigJson = "tsconfig.json";

// RELIVERSE JSONC CONFIG
export const cliConfigJsonc = "reliverse.jsonc";
export const cliConfigJsoncTmp = "reliverse-tmp.jsonc";
export const cliConfigJsoncBak = "reliverse-bak.jsonc";

// RELIVERSE TS CONFIG
export const cliConfigTs = "reliverse.ts";
export const cliConfigTsTmp = "reliverse-tmp.ts";
export const cliConfigTsBak = "reliverse-bak.ts";

// DOCUMENTATION WEBSITE
export const reliverseOrgBase = "reliverse.org";
export const reliverseOrgRoot = `https://${reliverseOrgBase}`;
export const cliDomainRoot = `https://docs.${reliverseOrgBase}`;
export const cliDomainDocs = `${cliDomainRoot}/cli`;
export const cliDomainEnv = `${cliDomainRoot}/env`;

// HOMEDIR OF THE CLI
export const homeDir = os.homedir();
export const cliHomeDir = path.join(homeDir, ".reliverse");
export const cliHomeTmp = path.join(cliHomeDir, "temp");
export const cliHomeRepos = path.join(cliHomeDir, "repos");
export const memoryPath = path.join(cliHomeDir, "memory.db");
export const cliJsrPath = path.join(cliHomeDir, "cli");

export const useLocalhost = false;

export const DEFAULT_CLI_USERNAME = "johnny911";

export const endTitle = `📚 Check the docs to learn more: ${cliDomainDocs}`;

export const recommended = re.green("🚀 Recommended");
export const experimental = re.red("🚨 Experimental");

export const UNKNOWN_VALUE = "unknown";
export const DEFAULT_DOMAIN = "https://example.com";
export const RELIVERSE_SCHEMA_DEV = "./schema.json";
export const RELIVERSE_SCHEMA_URL = `${reliverseOrgRoot}/schema.json`;

export const FALLBACK_ENV_EXAMPLE_URL =
  "https://raw.githubusercontent.com/blefnk/relivator/main/.env.example";

// Configuration file categories for generation
export const CONFIG_CATEGORIES = {
  core: [cliConfigJsonc, cliConfigTs],
  linting: ["biome.json"],
  ide: [".vscode/settings.json"],
  git: [".gitignore"],
} as const;
