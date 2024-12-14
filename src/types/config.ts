export type ReliverseConfig = {
  shouldDeploy?: boolean;
  shouldInstallDependencies?: boolean;
  shouldInitGit?: boolean;
  shouldUseI18n?: boolean;
  shouldRunDbScripts?: boolean;
  defaultDeploymentService?: "Vercel" | "none" | "";
  defaultTemplate?: string;
  defaultUsername?: string;
  defaultGithubUsername?: string;
  defaultVercelUsername?: string;
  defaultDomain?: string;
  defaultCategory?: "development" | "";
  defaultProjectType?: "website" | "";
  defaultFramework?: "nextjs" | "";
  defaultWebsiteCategory?: "e-commerce" | "";
};

export const DEFAULT_CONFIG: ReliverseConfig = {
  shouldDeploy: false,
  shouldInstallDependencies: true,
  shouldInitGit: true,
  shouldUseI18n: true,
  shouldRunDbScripts: true,
  defaultDeploymentService: "",
  defaultCategory: "",
  defaultProjectType: "",
  defaultFramework: "",
  defaultWebsiteCategory: "",
};
