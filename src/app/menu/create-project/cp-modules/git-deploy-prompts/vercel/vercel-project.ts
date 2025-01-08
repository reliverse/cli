import type { VercelFramework } from "./vercel-types.js";

export type ProjectConfig = {
  framework: VercelFramework;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
  devCommand?: string;
  rootDirectory?: string;
};

export type ProjectOptions = {
  includes: (option: string) => boolean;
};

export function createProjectConfig(
  framework: string | undefined,
  buildCommand: string | undefined,
  outputDirectory: string | undefined,
  installCommand: string | undefined,
  devCommand: string | undefined,
  rootDirectory: string | undefined,
): ProjectConfig {
  return {
    framework: framework as VercelFramework,
    buildCommand: buildCommand ?? "",
    outputDirectory: outputDirectory ?? "",
    installCommand: installCommand ?? "",
    devCommand: devCommand ?? "",
    rootDirectory: rootDirectory ?? "",
  };
}

export function createProjectOptions(
  selectedOptions: { options: string[] } | string[],
): ProjectOptions {
  return {
    includes: (option: string) =>
      Array.isArray(selectedOptions)
        ? selectedOptions.includes(option)
        : selectedOptions.options.includes(option),
  };
}
