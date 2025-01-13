import { selectPrompt, confirmPrompt, inputPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";

import type { ColumnType, DatabaseProvider, TableSchema } from "~/types.js";

import { installIntegration } from "~/app/menu/create-project/cp-modules/cli-main-modules/integrations/integrations.js";
import { INTEGRATION_CONFIGS } from "~/app/menu/create-project/cp-modules/cli-main-modules/integrations/integrationsIntegrConfig.js";

import { COLUMN_TYPES } from "./manageDrizzleConstants.js";

export async function detectDatabaseProvider(
  cwd: string,
): Promise<DatabaseProvider | null> {
  const drizzleConfigPath = path.join(cwd, "drizzle.config.ts");
  if (await fs.pathExists(drizzleConfigPath)) {
    const content = await fs.readFile(drizzleConfigPath, "utf-8");
    if (content.includes("postgres")) {
      return "postgres";
    }
    if (content.includes("sqlite")) {
      return "sqlite";
    }
    if (content.includes("mysql")) {
      return "mysql";
    }
  }
  return null;
}

export async function setupDrizzle(
  cwd: string,
  isDev: boolean,
): Promise<DatabaseProvider | null> {
  relinka(
    "info",
    "Drizzle is not set up in this project. Let's set it up first.",
  );

  const provider = await selectPrompt({
    title: "Select database provider:",
    options: [
      { label: "PostgreSQL", value: "postgres" },
      { label: "SQLite", value: "sqlite" },
      { label: "MySQL", value: "mysql" },
    ],
  });

  // If PostgreSQL is selected, ask for specific provider
  if (provider === "postgres") {
    const pgProvider = await selectPrompt({
      title: "Select PostgreSQL provider:",
      options: [
        { label: "Neon", value: "neon" },
        { label: "Railway", value: "railway" },
        { label: "Other", value: "postgres" },
      ],
    });

    const drizzleConfig = INTEGRATION_CONFIGS["drizzle"];
    if (!drizzleConfig) {
      throw new Error("Drizzle integration configuration not found");
    }

    const config = {
      ...drizzleConfig,
      dependencies: [
        ...drizzleConfig.dependencies,
        pgProvider === "neon" ? "@neondatabase/serverless" : "postgres",
      ],
    };

    await installIntegration(cwd, config, isDev);
  } else {
    const drizzleConfig = INTEGRATION_CONFIGS["drizzle"];
    if (!drizzleConfig) {
      throw new Error("Drizzle integration configuration not found");
    }
    await installIntegration(cwd, drizzleConfig, isDev);
  }

  return provider as DatabaseProvider;
}

export async function getAvailableTables(
  cwd: string,
  useMultipleFiles: boolean,
  // singleSchemaDir: string,
  // multiSchemaDir: string,
): Promise<string[]> {
  if (useMultipleFiles) {
    const schemaDir = path.join(cwd, "src/db/schema");
    const files = await fs.readdir(schemaDir);
    return files
      .filter((file) => file.endsWith(".ts") && file !== "index.ts")
      .map((file) => file.replace(".ts", ""));
  } else {
    const schemaFile = path.join(cwd, "src/db/schema.ts");
    if (await fs.pathExists(schemaFile)) {
      const content = await fs.readFile(schemaFile, "utf-8");
      const tableMatches = content.match(/export const (\w+)\s*=/g);
      return tableMatches
        ? tableMatches
            .map((match) => match.split(" ")[2])
            .filter((name): name is string => name !== undefined)
        : [];
    }
  }
  return [];
}

export async function addNewTable(
  cwd: string,
  useMultipleFiles: boolean,
  provider: DatabaseProvider,
  // singleSchemaDir: string,
  // multiSchemaDir: string,
) {
  // Get table name
  const tableName = await inputPrompt({
    title: "Enter the table name:",
    validate: (value: string): string | boolean => {
      if (!value?.trim()) {
        return "Table name is required";
      }
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
        return "Table name must start with a letter and contain only letters, numbers, and underscores";
      }
      return true;
    },
  });

  // Get columns
  const columns: ColumnType[] = [];
  let addingColumns = true;

  while (addingColumns) {
    const columnName = await inputPrompt({
      title: "Enter column name:",
      validate: (value: string): string | boolean => {
        if (!value?.trim()) {
          return "Column name is required";
        }
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
          return "Column name must start with a letter and contain only letters, numbers, and underscores";
        }
        return true;
      },
    });

    const columnType = await selectPrompt({
      title: "Select column type:",
      options: COLUMN_TYPES[provider].map((type) => ({
        label: type,
        value: type,
      })),
    });

    const nullable = await confirmPrompt({
      title: "Is this column nullable?",
      defaultValue: false,
    });

    const primaryKey = await confirmPrompt({
      title: "Is this column a primary key?",
      defaultValue: false,
    });

    const unique =
      !primaryKey &&
      (await confirmPrompt({
        title: "Should this column be unique?",
        defaultValue: false,
      }));

    const hasDefaultValue = await confirmPrompt({
      title: "Do you want to set a default value?",
      defaultValue: false,
    });

    let defaultValue;
    if (hasDefaultValue) {
      if (
        columnType === "timestamp" ||
        columnType === "timestamptz" ||
        columnType === "datetime"
      ) {
        const useNow = await confirmPrompt({
          title: "Use current timestamp as default?",
          defaultValue: true,
        });
        if (useNow) {
          defaultValue = "sql`CURRENT_TIMESTAMP`";
        }
      } else {
        defaultValue = await inputPrompt({
          title: "Enter default value:",
        });
      }
    }

    const isReference = await confirmPrompt({
      title: "Is this a foreign key reference?",
      defaultValue: false,
    });

    let references;
    if (isReference) {
      const tables = await getAvailableTables(
        cwd,
        useMultipleFiles,
        // singleSchemaDir,
        // multiSchemaDir,
      );
      if (tables.length > 0) {
        const refTable = await selectPrompt({
          title: "Select referenced table:",
          options: tables.map((t) => ({ label: t, value: t })),
        });
        references = {
          table: refTable,
          column: "id", // Assuming referenced column is always 'id' for simplicity
        };
      }
    }

    columns.push({
      name: columnName,
      type: columnType,
      nullable,
      primaryKey,
      unique,
      ...(defaultValue && { defaultValue }),
      ...(references && { references }),
    } as ColumnType);

    addingColumns = await confirmPrompt({
      title: "Add another column?",
      defaultValue: true,
    });
  }

  // Generate table schema
  const schema: TableSchema = {
    name: tableName,
    columns,
  };

  // Write schema to file
  if (useMultipleFiles) {
    const filePath = path.join(cwd, "src/db/schema", `${tableName}.ts`);
    await generateTableFile(filePath, schema, provider);

    // Update index.ts
    const indexPath = path.join(cwd, "src/db/schema/index.ts");
    await updateSchemaIndex(indexPath, tableName);
  } else {
    const filePath = path.join(cwd, "src/db/schema.ts");
    await appendTableToSchema(filePath, schema, provider);
  }

  relinka("success", `Table ${tableName} created successfully!`);
}

export async function removeTable(
  cwd: string,
  useMultipleFiles: boolean,
  provider: DatabaseProvider,
) {
  const tables = await getAvailableTables(cwd, useMultipleFiles);
  if (tables.length === 0) {
    relinka("error", "No tables found to remove");
    return;
  }

  const tableName = await selectPrompt({
    title: "Select table to remove:",
    options: tables.map((t) => ({ label: t, value: t })),
  });

  const confirm = await confirmPrompt({
    title: `Are you sure you want to remove the table ${tableName}?`,
    content: "This action cannot be undone",
    defaultValue: false,
  });

  if (!confirm) {
    relinka("info", "Table removal cancelled");
    return;
  }

  if (useMultipleFiles) {
    // Remove table file
    const filePath = path.join(cwd, "src/db/schema", `${tableName}.ts`);
    await fs.remove(filePath);

    // Update index.ts
    const indexPath = path.join(cwd, "src/db/schema/index.ts");
    await removeFromSchemaIndex(indexPath, tableName);
  } else {
    // Remove table from schema.ts
    const filePath = path.join(cwd, "src/db/schema.ts");
    await removeTableFromSchema(filePath, tableName, provider);
  }

  relinka("success", `Table ${tableName} removed successfully!`);
}

export async function renameTable(
  cwd: string,
  useMultipleFiles: boolean,
  provider: DatabaseProvider,
) {
  const tables = await getAvailableTables(cwd, useMultipleFiles);
  if (tables.length === 0) {
    relinka("error", "No tables found to rename");
    return;
  }

  const oldName = await selectPrompt({
    title: "Select table to rename:",
    options: tables.map((t) => ({ label: t, value: t })),
  });

  const newName = await inputPrompt({
    title: "Enter new table name:",
    validate: (value: string): string | boolean => {
      if (!value?.trim()) {
        return "Table name is required";
      }
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
        return "Table name must start with a letter and contain only letters, numbers, and underscores";
      }
      if (tables.includes(value)) {
        return "A table with this name already exists";
      }
      return true;
    },
  });

  if (useMultipleFiles) {
    // Rename table file
    const oldPath = path.join(cwd, "src/db/schema", `${oldName}.ts`);
    const newPath = path.join(cwd, "src/db/schema", `${newName}.ts`);
    await fs.move(oldPath, newPath);

    // Update index.ts
    const indexPath = path.join(cwd, "src/db/schema/index.ts");
    await updateTableNameInIndex(indexPath, oldName, newName);
  } else {
    // Rename table in schema.ts
    const filePath = path.join(cwd, "src/db/schema.ts");
    await renameTableInSchema(filePath, oldName, newName, provider);
  }

  relinka(
    "success",
    `Table renamed from ${oldName} to ${newName} successfully!`,
  );
}

export async function manageRelations(
  cwd: string,
  useMultipleFiles: boolean,
  provider: DatabaseProvider,
) {
  const tables = await getAvailableTables(cwd, useMultipleFiles);
  if (tables.length < 2) {
    relinka("error", "Need at least two tables to manage relations");
    return;
  }

  const sourceTable = await selectPrompt({
    title: "Select source table:",
    options: tables.map((t) => ({ label: t, value: t })),
  });

  const targetTable = await selectPrompt({
    title: "Select target table:",
    options: tables
      .filter((t) => t !== sourceTable)
      .map((t) => ({ label: t, value: t })),
  });

  const relationType = await selectPrompt({
    title: "Select relation type:",
    options: [
      { label: "One-to-One", value: "oneToOne" },
      { label: "One-to-Many", value: "oneToMany" },
      { label: "Many-to-Many", value: "manyToMany" },
    ],
  });

  // Generate relation based on type
  if (relationType === "manyToMany") {
    const junctionTableName = `${sourceTable}_to_${targetTable}`;
    const schema: TableSchema = {
      name: junctionTableName,
      columns: [
        {
          name: `${sourceTable}Id`,
          type: "integer",
          nullable: false,
          references: { table: sourceTable, column: "id" },
        },
        {
          name: `${targetTable}Id`,
          type: "integer",
          nullable: false,
          references: { table: targetTable, column: "id" },
        },
      ],
    };

    if (useMultipleFiles) {
      const filePath = path.join(
        cwd,
        "src/db/schema",
        `${junctionTableName}.ts`,
      );
      await generateTableFile(filePath, schema, provider);

      // Update index.ts
      const indexPath = path.join(cwd, "src/db/schema/index.ts");
      await updateSchemaIndex(indexPath, junctionTableName);
    } else {
      const filePath = path.join(cwd, "src/db/schema.ts");
      await appendTableToSchema(filePath, schema, provider);
    }
  } else {
    // Inject foreign key column to source table
    const column: ColumnType = {
      name: `${targetTable}Id`,
      type: "integer",
      nullable: relationType === "oneToMany",
      references: { table: targetTable, column: "id" },
    };

    if (useMultipleFiles) {
      const filePath = path.join(cwd, "src/db/schema", `${sourceTable}.ts`);
      await addColumnToTable(filePath, sourceTable, column, provider);
    } else {
      const filePath = path.join(cwd, "src/db/schema.ts");
      await addColumnToTable(filePath, sourceTable, column, provider);
    }
  }

  relinka("success", "Relation added successfully!");
}

export async function generateTableFile(
  filePath: string,
  schema: TableSchema,
  provider: DatabaseProvider,
) {
  const dbPrefix = provider === "postgres" ? "pg" : provider;
  const content = `import { sql } from "drizzle-orm";
  import { ${schema.columns.map((c) => c.type).join(", ")}, ${dbPrefix}Table } from "drizzle-orm/${provider}-core";
  
  export const ${schema.name} = ${dbPrefix}Table("${schema.name}", {
    ${schema.columns
      .map((col) => {
        let def = `${col.name}: ${col.type}("${col.name}")`;
        if (col.primaryKey) {
          def += ".primaryKey()";
        }
        if (col.unique) {
          def += ".unique()";
        }
        if (!col.nullable) {
          def += ".notNull()";
        }
        if (col.defaultValue) {
          def += `.default(${col.defaultValue})`;
        }
        if (col.references) {
          def += `.references(() => ${col.references.table}.${col.references.column})`;
        }
        return def;
      })
      .join(",\n  ")}
  });`;

  await fs.writeFile(filePath, content);
}

export async function updateSchemaIndex(indexPath: string, tableName: string) {
  let content = "";
  if (await fs.pathExists(indexPath)) {
    content = await fs.readFile(indexPath, "utf-8");
  }

  const exportStatement = `export * from "./${tableName}";`;
  if (!content.includes(exportStatement)) {
    content += content ? `\n${exportStatement}` : exportStatement;
    await fs.writeFile(indexPath, content);
  }
}

export async function appendTableToSchema(
  filePath: string,
  schema: TableSchema,
  provider: DatabaseProvider,
) {
  let content = "";
  if (await fs.pathExists(filePath)) {
    content = await fs.readFile(filePath, "utf-8");
  }

  const dbPrefix = provider === "postgres" ? "pg" : provider;
  const tableDefinition = `\n\nexport const ${schema.name} = ${dbPrefix}Table("${schema.name}", {
    ${schema.columns
      .map((col) => {
        let def = `${col.name}: ${col.type}("${col.name}")`;
        if (col.primaryKey) {
          def += ".primaryKey()";
        }
        if (col.unique) {
          def += ".unique()";
        }
        if (!col.nullable) {
          def += ".notNull()";
        }
        if (col.defaultValue) {
          def += `.default(${col.defaultValue})`;
        }
        if (col.references) {
          def += `.references(() => ${col.references.table}.${col.references.column})`;
        }
        return def;
      })
      .join(",\n  ")}
  });`;

  content += tableDefinition;
  await fs.writeFile(filePath, content);
}

export async function removeFromSchemaIndex(
  indexPath: string,
  tableName: string,
) {
  if (await fs.pathExists(indexPath)) {
    let content = await fs.readFile(indexPath, "utf-8");
    content = content.replace(`export * from "./${tableName}";`, "");
    content = content.replace(/\n\n+/g, "\n");
    await fs.writeFile(indexPath, content);
  }
}

export async function removeTableFromSchema(
  filePath: string,
  tableName: string,
  provider: DatabaseProvider,
) {
  if (await fs.pathExists(filePath)) {
    let content = await fs.readFile(filePath, "utf-8");
    const dbPrefix = provider === "postgres" ? "pg" : provider;
    const regex = new RegExp(
      `\\nexport const ${tableName} = ${dbPrefix}Table[\\s\\S]*?\\);\\n?`,
      "g",
    );
    content = content.replace(regex, "\n");
    content = content.replace(/\n\n+/g, "\n\n");
    await fs.writeFile(filePath, content);
  }
}

export async function renameTableInSchema(
  filePath: string,
  oldName: string,
  newName: string,
  provider: DatabaseProvider,
) {
  if (await fs.pathExists(filePath)) {
    let content = await fs.readFile(filePath, "utf-8");
    const dbPrefix = provider === "postgres" ? "pg" : provider;
    content = content.replace(
      new RegExp(
        `export const ${oldName} = ${dbPrefix}Table\\("${oldName}"`,
        "g",
      ),
      `export const ${newName} = ${dbPrefix}Table("${newName}"`,
    );
    await fs.writeFile(filePath, content);
  }
}

export async function updateTableNameInIndex(
  indexPath: string,
  oldName: string,
  newName: string,
) {
  if (await fs.pathExists(indexPath)) {
    let content = await fs.readFile(indexPath, "utf-8");
    content = content.replace(
      `export * from "./${oldName}";`,
      `export * from "./${newName}";`,
    );
    await fs.writeFile(indexPath, content);
  }
}

export async function addColumnToTable(
  filePath: string,
  tableName: string,
  column: ColumnType,
  provider: DatabaseProvider,
) {
  if (await fs.pathExists(filePath)) {
    let content = await fs.readFile(filePath, "utf-8");
    const dbPrefix = provider === "postgres" ? "pg" : provider;
    const tableRegex = new RegExp(
      `export const ${tableName} = ${dbPrefix}Table\\([\\s\\S]*?\\);`,
    );
    const match = content.match(tableRegex);

    if (match) {
      const tableContent = match[0];
      const insertPoint = tableContent.lastIndexOf("}");
      let columnDef = `\n  ${column.name}: ${column.type}("${column.name}")`;
      if (column.primaryKey) {
        columnDef += ".primaryKey()";
      }
      if (column.unique) {
        columnDef += ".unique()";
      }
      if (!column.nullable) {
        columnDef += ".notNull()";
      }
      if (column.defaultValue) {
        columnDef += `.default(${column.defaultValue})`;
      }
      if (column.references) {
        columnDef += `.references(() => ${column.references.table}.${column.references.column})`;
      }
      columnDef += ",";

      const newTableContent =
        tableContent.slice(0, insertPoint) +
        columnDef +
        tableContent.slice(insertPoint);
      content = content.replace(tableRegex, newTableContent);
      await fs.writeFile(filePath, content);
    }
  }
}
