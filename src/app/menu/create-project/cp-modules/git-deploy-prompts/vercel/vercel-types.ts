import type { CreateProjectEnv2Target } from "@vercel/sdk/models/createprojectenvop";
import type { CreateProjectEnv2Type } from "@vercel/sdk/models/createprojectenvop";
import type { GetProjectsFramework } from "@vercel/sdk/models/getprojectsop";

export type VercelFramework = GetProjectsFramework;

export type VercelDeploymentConfig = {
  framework: VercelFramework | null;
  rootDirectory?: string | null;
  buildCommand?: string | null;
  outputDirectory?: string | null;
  devCommand?: string | null;
  installCommand?: string | null;
};

export type DeploymentLogType = "error" | "warning" | "info" | "debug";

export type DeploymentLog = {
  type: DeploymentLogType;
  created: number;
  text: string;
};

export type InlinedFile = {
  file: string;
  data: string;
  encoding: "utf-8" | "base64";
};

export type EnvVar = {
  key: string;
  value: string;
  type: CreateProjectEnv2Type;
  target?: CreateProjectEnv2Target[];
};

export type DeploymentOptions = {
  options: string[];
  useSharedEnvVars: boolean;
  sharedEnvVarsProduction?: boolean;
};
