// Common type for all configurations
export type BaseConfig = {
  version: string;
  generatedAt: string;
};

export type ApptsConfig = {
  apptsConfig: string;
};

export type BiomeConfig = BaseConfig & {
  $schema: string;
  organizeImports: {
    enabled: boolean;
  };
  formatter: {
    enabled: boolean;
    indentStyle: "space" | "tab";
    indentWidth: number;
    lineWidth?: number;
  };
  linter: {
    enabled: boolean;
    rules?: {
      recommended?: boolean;
    };
  };
  javascript?: {
    formatter: {
      quoteStyle: "single" | "double";
      trailingComma: "all" | "es5" | "none";
      semicolons: "always" | "never";
    };
  };
};

export type KnipConfig = BaseConfig & {
  $schema: string;
  entry: string[];
  project: string[];
  ignore: string[];
  ignoreDependencies: string[];
  rules: Record<string, "error" | "warn" | "off">;
};

export type PutoutConfig = BaseConfig & {
  rules: Record<string, boolean>;
  match: Record<string, boolean>;
  ignore: string[];
};

export type NextJsConfig = BaseConfig & {
  reactStrictMode: boolean;
  poweredByHeader: boolean;
  compress?: boolean;
  swcMinify?: boolean;
  images?: {
    formats?: string[];
    remotePatterns?: {
      protocol: string;
      hostname: string;
    }[];
  };
  experimental?: {
    typedRoutes?: boolean;
    serverActions?: {
      allowedOrigins?: string[];
    };
  };
  logging?: {
    fetches?: {
      fullUrl?: boolean;
    };
  };
};

export type ConfigPaths = {
  eslintConfig: string;
  eslintRulesDisabledConfig: string;
  eslintUltimateConfig: string;
  nextConfig: string;
  nextMinimalConfig: string;
  nextRecommendedConfig: string;
  biomeConfig: string;
  biomeRecommendedConfig: string;
  biomeRulesDisabledConfig: string;
  knipConfig: string;
  knipRecommendedConfig: string;
  knipRulesDisabledConfig: string;
  putoutConfig: string;
  putoutRecommendedConfig: string;
  putoutRulesDisabledConfig: string;
  envConfig: string;
  envRecommendedConfig: string;
  envRulesDisabledConfig: string;
  apptsConfig: string;
};

// Helper function to add metadata to configs
export function addConfigMetadata<T extends object>(config: T): T & BaseConfig {
  return {
    ...config,
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
  };
}
