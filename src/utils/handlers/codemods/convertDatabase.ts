import fs from "fs-extra";
import path from "pathe";

import type { PrismaField, PrismaModel } from "~/types.js";

import { relinka } from "~/utils/console.js";

function parsePrismaSchema(content: string): PrismaModel[] {
  const models: PrismaModel[] = [];
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  const fieldRegex = /(\w+)\s+(\w+)(\[\])?\s*(\?)?\s*(@[^@\n]+)?/g;

  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    const [_, modelName, fieldsStr] = match;
    const fields: PrismaField[] = [];
    let fieldMatch;

    if (fieldsStr) {
      while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
        const [_, name, type, isList, isOptional, attributes] = fieldMatch;
        if (name && type) {
          fields.push({
            name,
            type,
            isOptional: !!isOptional,
            isList: !!isList,
            attributes: parseAttributes(attributes ?? ""),
          });
        }
      }
    }

    if (modelName) {
      models.push({ name: modelName, fields });
    }
  }

  return models;
}

function parseAttributes(attributesStr: string): Record<string, any> {
  const attributes: Record<string, any> = {};
  const attrRegex = /@(\w+)(?:\((.*?)\))?/g;
  let match;

  while ((match = attrRegex.exec(attributesStr)) !== null) {
    const [_, name, args] = match;
    if (name) {
      attributes[name] = args ? parseAttributeArgs(args) : true;
    }
  }

  return attributes;
}

function parseAttributeArgs(args: string): any {
  // Simple parser for attribute arguments
  if (args.startsWith("[") && args.endsWith("]")) {
    return args
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim());
  }
  if (args === "true") {
    return true;
  }
  if (args === "false") {
    return false;
  }
  if (/^\d+$/.test(args)) {
    return parseInt(args, 10);
  }
  return args.replace(/['"]/g, "");
}

function convertPrismaToDrizzleType(
  field: PrismaField,
  dbType: string,
): string {
  const typeMap: Record<string, Record<string, string>> = {
    postgres: {
      Int: "integer",
      String: "text",
      Boolean: "boolean",
      DateTime: "timestamp",
      Float: "real",
      BigInt: "bigint",
      Decimal: "decimal",
      Json: "jsonb",
      Bytes: "bytea",
    },
    mysql: {
      Int: "int",
      String: "text",
      Boolean: "boolean",
      DateTime: "timestamp",
      Float: "float",
      BigInt: "bigint",
      Decimal: "decimal",
      Json: "json",
      Bytes: "blob",
    },
    sqlite: {
      Int: "integer",
      String: "text",
      Boolean: "integer",
      DateTime: "integer",
      Float: "real",
      BigInt: "integer",
      Decimal: "real",
      Json: "text",
      Bytes: "blob",
    },
  };

  return typeMap[dbType]?.[field.type] ?? "text";
}

function generateDrizzleSchema(models: PrismaModel[], dbType: string): string {
  const tablePrefix =
    dbType === "postgres" ? "pg" : dbType === "mysql" ? "mysql" : "sqlite";
  const imports = new Set<string>([`${tablePrefix}Table`]);

  const modelSchemas = models.map((model) => {
    const fields = model.fields.map((field) => {
      const drizzleType = convertPrismaToDrizzleType(field, dbType);
      imports.add(drizzleType);

      let fieldDef = `${field.name}: ${drizzleType}("${field.name}")`;

      if (field.attributes["id"]) {
        fieldDef += ".primaryKey()";
      }
      if (field.attributes["unique"]) {
        fieldDef += ".unique()";
      }
      if (!field.isOptional) {
        fieldDef += ".notNull()";
      }
      if (field.attributes["default"]) {
        if (
          field.type === "DateTime" &&
          field.attributes["default"] === "now()"
        ) {
          fieldDef += ".default(sql`CURRENT_TIMESTAMP`)";
          imports.add("sql");
        } else {
          fieldDef += `.default(${field.attributes["default"]})`;
        }
      }

      return fieldDef;
    });

    return `export const ${model.name.toLowerCase()} = ${tablePrefix}Table("${model.name.toLowerCase()}", {
  ${fields.join(",\n  ")}
});`;
  });

  let importStatement = `import { ${Array.from(imports).join(", ")} } from "drizzle-orm/${dbType}";`;
  if (imports.has("sql")) {
    importStatement = `import { sql } from "drizzle-orm";\n${importStatement}`;
  }

  return `${importStatement}\n\n${modelSchemas.join("\n\n")}`;
}

export async function convertPrismaToDrizzle(
  cwd: string,
  targetDbType: string,
) {
  const prismaSchemaPath = path.join(cwd, "prisma/schema.prisma");
  if (!(await fs.pathExists(prismaSchemaPath))) {
    relinka("error", "No Prisma schema found");
    return;
  }

  const schemaContent = await fs.readFile(prismaSchemaPath, "utf-8");
  const models = parsePrismaSchema(schemaContent);
  const drizzleSchema = generateDrizzleSchema(models, targetDbType);

  // Create drizzle config
  const drizzleConfig = `import type { Config } from "drizzle-kit";
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
} satisfies Config;`;

  // Write files
  await fs.ensureDir(path.join(cwd, "src/db"));
  await fs.writeFile(path.join(cwd, "src/db/schema.ts"), drizzleSchema);
  await fs.writeFile(path.join(cwd, "drizzle.config.ts"), drizzleConfig);

  // Update dependencies
  const packageJsonPath = path.join(cwd, "package.json");
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);

    // Remove Prisma dependencies
    delete packageJson.dependencies?.["@prisma/client"];
    delete packageJson.devDependencies?.prisma;

    // Inject Drizzle dependencies
    packageJson.dependencies = {
      ...packageJson.dependencies,
      "drizzle-orm": "latest",
    };
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      "drizzle-kit": "latest",
    };

    // Inject database-specific dependencies
    if (targetDbType === "postgres") {
      packageJson.dependencies.postgres = "latest";
    } else if (targetDbType === "mysql") {
      packageJson.dependencies.mysql2 = "latest";
    } else if (targetDbType === "sqlite") {
      packageJson.dependencies["better-sqlite3"] = "latest";
      packageJson.devDependencies["@types/better-sqlite3"] = "latest";
    }

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  }

  relinka("success", "Converted Prisma schema to Drizzle schema");
}

export async function convertDatabaseProvider(
  cwd: string,
  fromProvider: string,
  toProvider: string,
) {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!(await fs.pathExists(packageJsonPath))) {
    relinka("error", "No package.json found");
    return;
  }

  const packageJson = await fs.readJson(packageJsonPath);

  // Provider-specific conversions
  if (fromProvider === "postgres" && toProvider === "libsql") {
    // Remove PostgreSQL dependencies
    delete packageJson.dependencies?.postgres;
    delete packageJson.dependencies?.["@neondatabase/serverless"];

    // Inject libSQL dependencies
    packageJson.dependencies = {
      ...packageJson.dependencies,
      "@libsql/client": "latest",
    };

    // Update environment variables if they exist
    const envPath = path.join(cwd, ".env");
    if (await fs.pathExists(envPath)) {
      let envContent = await fs.readFile(envPath, "utf-8");
      envContent = envContent.replace(
        /DATABASE_URL=.*postgres:\/\/.*/g,
        "DATABASE_URL=libsql://[YOUR-DATABASE].turso.io",
      );
      await fs.writeFile(envPath, envContent);
    }

    // Update database client code if it exists
    const dbClientPaths = [
      "src/lib/db.ts",
      "src/db/client.ts",
      "src/database/index.ts",
    ];

    for (const dbPath of dbClientPaths) {
      const fullPath = path.join(cwd, dbPath);
      if (await fs.pathExists(fullPath)) {
        let content = await fs.readFile(fullPath, "utf-8");

        // Replace postgres imports with libsql
        content = content.replace(
          /import .*postgres.*/g,
          'import { createClient } from "@libsql/client";',
        );

        // Replace client creation
        content = content.replace(
          /const .*= new Pool\(.*\)/g,
          "const client = createClient({ url: process.env.DATABASE_URL! });",
        );

        await fs.writeFile(fullPath, content);
        break;
      }
    }
  }

  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
  relinka(
    "success",
    `Converted database provider from ${fromProvider} to ${toProvider}`,
  );
}
