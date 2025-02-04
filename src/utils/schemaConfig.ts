import { Type, type Static } from "@sinclair/typebox";
import fs from "fs-extra";
import path from "pathe";

import {
  RELIVERSE_SCHEMA_DEV,
  RELIVERSE_SCHEMA_URL,
  UNKNOWN_VALUE,
} from "~/app/constants.js";

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
    Type.Literal("bun"),
  ]),
  packages: Type.Array(Type.String()),
  sharedPackages: Type.Array(Type.String()),
});

export const reliverseConfigSchema = Type.Object({
  // Reliverse config schema
  $schema: Type.Union([
    Type.Literal(RELIVERSE_SCHEMA_URL),
    Type.Literal(RELIVERSE_SCHEMA_DEV),
  ]),

  // General project information
  projectName: Type.Union([
    Type.Literal(UNKNOWN_VALUE),
    Type.String({ minLength: 1 }),
  ]),
  projectAuthor: Type.Union([
    Type.Literal(UNKNOWN_VALUE),
    Type.String({ minLength: 1 }),
  ]),
  projectDescription: Type.String(),
  version: Type.String(),
  projectLicense: Type.String(),
  projectRepository: Type.String(),
  projectDomain: Type.String(),
  projectGitService: Type.Union([
    Type.Literal("github"),
    Type.Literal("gitlab"),
    Type.Literal("bitbucket"),
    Type.Literal("none"),
  ]),
  projectDeployService: Type.Union([
    Type.Literal("vercel"),
    Type.Literal("netlify"),
    Type.Literal("railway"),
    Type.Literal("deno"),
    Type.Literal("none"),
  ]),
  projectPackageManager: Type.Union([
    Type.Literal("npm"),
    Type.Literal("pnpm"),
    Type.Literal("yarn"),
    Type.Literal("bun"),
  ]),
  projectState: Type.Union([Type.Literal("creating"), Type.Literal("created")]),
  projectCategory: Type.Union([
    Type.Literal(UNKNOWN_VALUE),
    Type.Literal("website"),
    Type.Literal("vscode"),
    Type.Literal("browser"),
    Type.Literal("cli"),
    Type.Literal("library"),
  ]),
  projectSubcategory: Type.Union([
    Type.Literal(UNKNOWN_VALUE),
    Type.Literal("e-commerce"),
    Type.Literal("tool"),
  ]),
  projectFramework: Type.Union([
    Type.Literal(UNKNOWN_VALUE),
    // web app frameworks
    Type.Literal("nextjs"),
    Type.Literal("vite"),
    Type.Literal("svelte"),
    Type.Literal("vue"),
    Type.Literal("astro"),
    // library frameworks
    Type.Literal("npm-jsr"),
    // browser extension frameworks
    Type.Literal("wxt"),
    // vscode extension frameworks
    Type.Literal("vscode"),
  ]),
  projectTemplate: Type.Union([
    Type.Literal(UNKNOWN_VALUE),
    Type.Literal("blefnk/relivator"),
    Type.Literal("blefnk/relivator-docker-template"),
    Type.Literal("blefnk/next-react-ts-src-minimal"),
    Type.Literal("blefnk/all-in-one-nextjs-template"),
    Type.Literal("blefnk/create-t3-app"),
    Type.Literal("blefnk/create-next-app"),
    Type.Literal("blefnk/astro-starlight-template"),
    Type.Literal("blefnk/versator"),
    Type.Literal("reliverse/template-browser-extension"),
    Type.Literal("microsoft/vscode-extension-samples"),
    Type.Literal("microsoft/vscode-extension-template"),
    Type.Literal("reliverse/cli-starter-template"),
    Type.Literal("blefnk/deno-cli-tutorial"),
  ]),

  features: featuresSchema,
  preferredLibraries: Type.Record(Type.String(), Type.String()),
  codeStyle: codeStyleSchema,
  monorepo: monorepoSchema,
  ignoreDependencies: Type.Array(Type.String()),
  customRules: Type.Record(Type.String(), Type.Unknown()),

  // Custom repos configuration
  multipleRepoCloneMode: Type.Boolean(),
  customUserFocusedRepos: Type.Optional(Type.Array(Type.String())),
  customDevsFocusedRepos: Type.Optional(Type.Array(Type.String())),
  hideRepoSuggestions: Type.Boolean(),
  customReposOnNewProject: Type.Boolean(),

  envComposerOpenBrowser: Type.Boolean(),

  repoBranch: Type.String(),
  repoPrivacy: Type.Union([
    Type.Literal("unknown"),
    Type.Literal("public"),
    Type.Literal("private"),
  ]),
  projectArchitecture: Type.Union([
    Type.Literal("unknown"),
    Type.Literal("fullstack"),
    Type.Literal("separated"),
  ]),
  projectRuntime: Type.Union([
    Type.Literal("bun"),
    Type.Literal("deno"),
    Type.Literal("edge-light"),
    Type.Literal("fastly"),
    Type.Literal("netlify"),
    Type.Literal("node"),
    Type.Literal("workerd"),
  ]),

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
  existingRepoBehavior: Type.Union([
    Type.Literal("prompt"),
    Type.Literal("autoYes"),
    Type.Literal("autoYesSkipCommit"),
    Type.Literal("autoNo"),
  ]),
});

export type ReliverseConfig = Static<typeof reliverseConfigSchema>;

export type ProjectCategory = Exclude<
  ReliverseConfig["projectCategory"],
  undefined
>;

export type ProjectSubcategory = Exclude<
  ReliverseConfig["projectSubcategory"],
  undefined
>;

export type ProjectFramework = Exclude<
  ReliverseConfig["projectFramework"],
  undefined
>;

export type ProjectArchitecture = Exclude<
  ReliverseConfig["projectArchitecture"],
  undefined
>;

/**
 * Converts a TypeBox schema to a JSON Schema
 */
function convertTypeBoxToJsonSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;

  // Handle TypeBox specific conversions
  if (schema.type === "string" && schema.enum) {
    return {
      type: "string",
      enum: schema.enum,
    };
  }

  // Handle unions (convert to enum if all literals)
  if (schema.anyOf || schema.allOf || schema.oneOf) {
    const variants = schema.anyOf || schema.allOf || schema.oneOf;
    const allLiterals = variants.every((v: any) => v.const !== undefined);

    if (allLiterals) {
      return {
        type: "string",
        enum: variants.map((v: any) => v.const),
      };
    }
  }

  // Handle objects
  if (schema.type === "object") {
    const result: any = {
      type: "object",
      properties: {},
    };

    if (schema.required) {
      result.required = schema.required;
    }

    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        result.properties[key] = convertTypeBoxToJsonSchema(value);
      }
    }

    // Handle additional properties
    if (schema.additionalProperties) {
      result.additionalProperties = convertTypeBoxToJsonSchema(
        schema.additionalProperties,
      );
    }

    // Handle pattern properties
    if (schema.patternProperties) {
      result.patternProperties = {};
      for (const [pattern, value] of Object.entries(schema.patternProperties)) {
        result.patternProperties[pattern] = convertTypeBoxToJsonSchema(value);
      }
    }

    return result;
  }

  // Handle arrays
  if (schema.type === "array") {
    return {
      type: "array",
      items: convertTypeBoxToJsonSchema(schema.items),
    };
  }

  // Handle basic types
  if (schema.type) {
    const result: any = { type: schema.type };
    if (schema.minimum !== undefined) result.minimum = schema.minimum;
    if (schema.maximum !== undefined) result.maximum = schema.maximum;
    if (schema.minLength !== undefined) result.minLength = schema.minLength;
    if (schema.maxLength !== undefined) result.maxLength = schema.maxLength;
    if (schema.pattern !== undefined) result.pattern = schema.pattern;
    if (schema.format !== undefined) result.format = schema.format;
    if (schema.default !== undefined) result.default = schema.default;
    return result;
  }

  return schema;
}

/**
 * Generates a JSON schema file from the TypeBox schema
 */
export async function generateJsonSchema(outputPath: string): Promise<void> {
  const converted = convertTypeBoxToJsonSchema(reliverseConfigSchema);

  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Reliverse Configuration Schema",
    description: "Schema for .reliverse configuration files",
    type: "object",
    properties: converted.properties,
    required: converted.required,
  };

  await fs.writeFile(outputPath, JSON.stringify(schema, null, 2));
}

/**
 * Generates the schema.json in the project root
 */
export async function generateSchemaFile(): Promise<void> {
  const schemaPath = path.join(process.cwd(), "schema.json");
  if (fs.existsSync(schemaPath)) {
    await fs.remove(schemaPath);
  }
  await generateJsonSchema(schemaPath);
}
