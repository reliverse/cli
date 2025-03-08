import { Type, type Static } from "@sinclair/typebox";
import fs from "fs-extra";
import path from "pathe";

import { cliHomeRepos, cliVersion } from "~/libs/sdk/constants.js";

// Import package.json with type assertion
// import pkg from "../../package.json" assert { type: "json" };
// const cliVersion = pkg.version;

export const repoInfoSchema = Type.Object({
  id: Type.String(),
  author: Type.String(),
  name: Type.String(),
  description: Type.String(),
  category: Type.String(),
  lastUpdated: Type.String(), // ISO date string
  localPath: Type.String(),
  // GitHub repository information from ungh
  github: Type.Object({
    stars: Type.Number(),
    forks: Type.Number(),
    watchers: Type.Number(),
    createdAt: Type.String(),
    updatedAt: Type.String(),
    pushedAt: Type.String(),
    defaultBranch: Type.String(),
  }),
});

export type RepoInfo = Static<typeof repoInfoSchema>;

export const reposSchema = Type.Object(
  {
    $schema: Type.String(),
    version: Type.String(), // CLI version when repos.json was last updated
    repos: Type.Array(repoInfoSchema),
  },
  { additionalProperties: false },
);

export type ReposConfig = Static<typeof reposSchema>;

export const DEFAULT_REPOS_CONFIG: ReposConfig = {
  $schema: "./schema.json",
  version: cliVersion,
  repos: [],
};

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
 * Generates a JSON schema file for repos
 */
export async function generateReposJsonSchema(): Promise<void> {
  const converted = convertTypeBoxToJsonSchema(reposSchema);
  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Reliverse Repos Schema",
    description: "Schema for repos.json configuration file",
    type: "object",
    properties: converted.properties,
    required: converted.required,
  };

  await fs.ensureDir(cliHomeRepos);
  const schemaPath = path.join(cliHomeRepos, "schema.json");
  await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));
}

/**
 * Checks if schema needs to be regenerated based on CLI version
 */
export async function shouldRegenerateSchema(): Promise<boolean> {
  const configPath = path.join(cliHomeRepos, "repos.json");

  if (!(await fs.pathExists(configPath))) {
    return true;
  }

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content) as ReposConfig;
    return config.version !== cliVersion;
  } catch {
    return true;
  }
}
