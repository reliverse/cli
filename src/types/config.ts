export type DeploymentService = "Vercel" | "Netlify" | "Railway" | "none";

export type TemplateOption =
  | "blefnk/relivator"
  | "blefnk/next-react-ts-src-minimal";

export type VSCodeExtensionFeature =
  | "commands"
  | "webview"
  | "language"
  | "themes";
export type VSCodeExtensionActivation = "onCommand" | "onLanguage" | "startup";

export type VSCodeExtensionConfig = {
  displayName: string;
  description: string;
  features: VSCodeExtensionFeature[];
  activation: VSCodeExtensionActivation;
  publisher: string;
};

export type ReliverseConfig = {
  defaultFramework?: string;
  defaultTemplate?: TemplateOption;
  defaultUsername?: string;
  defaultGithubUsername?: string;
  defaultVercelUsername?: string;
  defaultDomain?: string;
  defaultDeploymentService?: DeploymentService;
  defaultCategory?: "development";
  defaultProjectType?: "website" | "vscode";
  defaultWebsiteCategory?: "e-commerce";
  shouldDeploy?: boolean;
  shouldInitGit?: boolean;
  shouldInstallDependencies?: boolean;
  shouldRunDbScripts?: boolean;
  shouldUseI18n?: boolean;
  vscodeExtension?: VSCodeExtensionConfig;
};

export const DEFAULT_CONFIG: ReliverseConfig = {
  shouldDeploy: false,
  shouldInstallDependencies: true,
  shouldInitGit: true,
  shouldUseI18n: true,
  shouldRunDbScripts: true,
  defaultDeploymentService: "Vercel",
  defaultFramework: "nextjs",
};
