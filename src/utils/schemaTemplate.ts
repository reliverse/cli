import { Type, type Static } from "@sinclair/typebox";
import fs from "fs-extra";
import os from "os";
import path from "path";

import { cliVersion } from "~/app/constants.js";

// Import package.json with type assertion
// import pkg from "../../package.json" assert { type: "json" };
// const cliVersion = pkg.version;

export const templateInfoSchema = Type.Object({
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

export type TemplateInfo = Static<typeof templateInfoSchema>;

export const templatesSchema = Type.Object(
  {
    $schema: Type.String(),
    version: Type.String(), // CLI version when templates.json was last updated
    templates: Type.Array(templateInfoSchema),
  },
  { additionalProperties: false },
);

export type TemplatesConfig = Static<typeof templatesSchema>;

export const DEFAULT_TEMPLATES_CONFIG: TemplatesConfig = {
  $schema: "./schema.json",
  version: cliVersion,
  templates: [],
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
 * Generates a JSON schema file for templates
 */
export async function generateTemplatesJsonSchema(): Promise<void> {
  const converted = convertTypeBoxToJsonSchema(templatesSchema);
  const schema = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "Reliverse Templates Schema",
    description: "Schema for templates.json configuration file",
    type: "object",
    properties: converted.properties,
    required: converted.required,
  };

  const templatesPath = path.join(os.homedir(), ".reliverse", "templates");
  await fs.ensureDir(templatesPath);
  const schemaPath = path.join(templatesPath, "schema.json");
  await fs.writeFile(schemaPath, JSON.stringify(schema, null, 2));
}

/**
 * Checks if schema needs to be regenerated based on CLI version
 */
export async function shouldRegenerateSchema(): Promise<boolean> {
  const templatesPath = path.join(os.homedir(), ".reliverse", "templates");
  const configPath = path.join(templatesPath, "templates.json");

  if (!(await fs.pathExists(configPath))) {
    return true;
  }

  try {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content) as TemplatesConfig;
    return config.version !== cliVersion;
  } catch {
    return true;
  }
}
