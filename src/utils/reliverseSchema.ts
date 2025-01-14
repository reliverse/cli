import { Type, type Static } from "@sinclair/typebox";

const featuresSchema = Type.Object({
  i18n: Type.Boolean(),
  analytics: Type.Boolean(),
  themeMode: Type.Union([
    Type.Literal("light"),
    Type.Literal("dark"),
    Type.Literal("dark-light"),
  ]),
  authentication: Type.Boolean(),
  api: Type.Boolean(),
  database: Type.Boolean(),
  testing: Type.Boolean(),
  docker: Type.Boolean(),
  ci: Type.Boolean(),
  commands: Type.Array(Type.String()),
  webview: Type.Array(Type.String()),
  language: Type.Array(Type.String()),
  themes: Type.Array(Type.String()),
});

const codeStyleSchema = Type.Object({
  lineWidth: Type.Number(),
  indentSize: Type.Number(),
  indentStyle: Type.Union([Type.Literal("space"), Type.Literal("tab")]),
  quoteMark: Type.Union([Type.Literal("single"), Type.Literal("double")]),
  semicolons: Type.Boolean(),
  trailingComma: Type.Union([
    Type.Literal("none"),
    Type.Literal("es5"),
    Type.Literal("all"),
  ]),
  bracketSpacing: Type.Boolean(),
  arrowParens: Type.Union([Type.Literal("always"), Type.Literal("avoid")]),
  tabWidth: Type.Number(),
  jsToTs: Type.Boolean(),
  dontRemoveComments: Type.Boolean(),
  shouldAddComments: Type.Boolean(),
  typeOrInterface: Type.Union([
    Type.Literal("type"),
    Type.Literal("interface"),
    Type.Literal("mixed"),
  ]),
  importOrRequire: Type.Union([
    Type.Literal("import"),
    Type.Literal("require"),
    Type.Literal("mixed"),
  ]),
  cjsToEsm: Type.Boolean(),
  modernize: Type.Object({
    replaceFs: Type.Boolean(),
    replacePath: Type.Boolean(),
    replaceHttp: Type.Boolean(),
    replaceProcess: Type.Boolean(),
    replaceConsole: Type.Boolean(),
    replaceEvents: Type.Boolean(),
  }),
  importSymbol: Type.String(),
});

const monorepoSchema = Type.Object({
  type: Type.Union([
    Type.Literal("none"),
    Type.Literal("turborepo"),
    Type.Literal("nx"),
    Type.Literal("pnpm"),
  ]),
  packages: Type.Array(Type.String()),
  sharedPackages: Type.Array(Type.String()),
});

export const reliverseConfigSchema = Type.Object({
  projectName: Type.String({ minLength: 1 }),
  projectAuthor: Type.String(),
  projectDescription: Type.String(),
  projectVersion: Type.String(),
  projectLicense: Type.String(),

  projectRepository: Type.Optional(Type.String()),
  projectDomain: Type.Optional(Type.String()),

  projectDeployService: Type.Optional(
    Type.Union([
      Type.Literal("vercel"),
      Type.Literal("netlify"),
      Type.Literal("railway"),
      Type.Literal("deno"),
      Type.Literal("none"),
    ]),
  ),

  projectDisplayName: Type.Optional(Type.String()),
  projectType: Type.Optional(Type.String()),
  projectFramework: Type.String(),
  projectPackageManager: Type.Union([
    Type.Literal("npm"),
    Type.Literal("pnpm"),
    Type.Literal("yarn"),
    Type.Literal("bun"),
  ]),
  projectFrameworkVersion: Type.Optional(Type.String()),
  projectState: Type.Optional(Type.String()),
  projectCategory: Type.Optional(
    Type.Union([
      Type.Literal("webapp"),
      Type.Literal("vscode"),
      Type.Literal("browser"),
    ]),
  ),
  projectSubcategory: Type.Optional(Type.String()),
  projectTemplate: Type.Optional(
    Type.Union([
      Type.Literal("blefnk/relivator"),
      Type.Literal("blefnk/next-react-ts-src-minimal"),
      Type.Literal("blefnk/all-in-one-nextjs-template"),
      Type.Literal("blefnk/create-t3-app"),
      Type.Literal("blefnk/create-next-app"),
      Type.Literal("blefnk/astro-starlight-template"),
      Type.Literal("blefnk/versator"),
      Type.Literal("reliverse/template-browser-extension"),
      Type.Literal("microsoft/vscode-extension-samples"),
      Type.Literal("microsoft/vscode-extension-template"),
    ]),
  ),
  projectActivation: Type.Optional(
    Type.Union([Type.Literal("auto"), Type.Literal("manual")]),
  ),
  nodeVersion: Type.Optional(Type.String()),
  runtime: Type.Optional(Type.String()),
  deployUrl: Type.Optional(Type.String()),

  features: featuresSchema,
  preferredLibraries: Type.Record(Type.String(), Type.String()),
  codeStyle: codeStyleSchema,
  monorepo: monorepoSchema,
  ignoreDependencies: Type.Array(Type.String()),
  customRules: Type.Record(Type.String(), Type.Unknown()),

  skipPromptsUseAutoBehavior: Type.Boolean(),
  deployBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoNo"),
  ]),
  depsBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoNo"),
  ]),
  gitBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoNo"),
  ]),
  i18nBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoNo"),
  ]),
  scriptsBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoNo"),
  ]),

  productionBranch: Type.Optional(Type.String()),
});

export type ReliverseConfig = Static<typeof reliverseConfigSchema>;
