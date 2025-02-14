import type { ReliverseConfig } from "~/utils/libs/config/schemaConfig.js";
import type { ReliverseMemory } from "~/utils/schemaMemory.js";

export type AppParams = {
  projectName: string;
  cwd: string;
  isDev: boolean;
  memory: ReliverseMemory;
  config: ReliverseConfig;
  reli: ReliverseConfig[];
  skipPrompts: boolean;
};

export type ParamsOmitPN = Omit<AppParams, "projectName">;
export type ParamsOmitSkipPN = Omit<AppParams, "skipPrompts" | "projectName">;
export type ParamsOmitReli = Omit<AppParams, "reli">;

/**
 * Minimal object describing essential project info after initialization
 */
export type ProjectConfigReturn = {
  frontendUsername: string;
  projectName: string;
  primaryDomain: string;
};

export type GitModParams = {
  cwd: string;
  isDev: boolean;
  projectPath: string;
  projectName: string;
};
