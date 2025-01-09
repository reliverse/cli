import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseConfig } from "~/types.js";

import { relinka } from "../handlers/logger.js";
import { getDefaultReliverseConfig } from "./reliverseReadWrite.js";
import { reliverseConfigSchema } from "./reliverseSchema.js";

const BACKUP_EXTENSION = ".backup";
const TEMP_EXTENSION = ".tmp";

// Types for comment sections
type CommentSection = {
  title: string;
  fields: Partial<
    Record<keyof NonNullable<ReliverseConfig["experimental"]>, string[]>
  >;
};

type CommentSections = {
  experimental: CommentSection;
};

/**
 * Safely writes config to file with backup and atomic operations
 */
export async function safeWriteConfig(
  targetDir: string,
  config: ReliverseConfig,
): Promise<void> {
  const configPath = path.join(targetDir, ".reliverse");
  const backupPath = configPath + BACKUP_EXTENSION;
  const tempPath = configPath + TEMP_EXTENSION;

  try {
    // Validate config before writing
    const validationResult = reliverseConfigSchema.safeParse(config);
    if (!validationResult.success) {
      throw new Error(
        `Invalid config: ${validationResult.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      );
    }

    // Helper function to create comment
    const c = (text: string) => `// ${text}`;

    // Define comment sections with only essential comments
    const commentSections: CommentSections = {
      experimental: {
        title: c("Unstable features"),
        fields: {
          skipPromptsUseAutoBehavior: [
            c("Do you want autoYes/autoNo below?"),
            c("Set to true to activate auto-answering."),
            c("This is to ensure there is no unexpected behavior."),
          ],
          features: [c("Project capabilities")],
          projectFramework: [c("Tech stack of your project")],
          codeStyle: [c("Code style preferences")],
          ignoreDependencies: [c("Cleaner codemod will ignore these deps")],
          configLastRevalidate: [c("Config revalidation (1h | 1d | 2d | 7d)")],
          customRules: [c("Custom rules for Reliverse AI")],
          deployBehavior: [c("Prompts behavior (prompt | autoYes | autoNo)")],
        },
      },
    };

    // Format with 2 spaces indentation
    let content = JSON.stringify(validationResult.data, null, 2);

    // Add section comments
    Object.entries(commentSections).forEach(([section, { title, fields }]) => {
      // Add section title with proper spacing
      content = content.replace(`"${section}":`, `${title}\n  "${section}":`);

      // Add field comments
      Object.entries(fields).forEach(([field, comments]) => {
        const fieldPattern = new RegExp(`(\\s+)"${field}":`, "g");
        // Add proper indentation for each comment line
        const formattedComments = comments
          .map(
            (comment, index, array) =>
              index === array.length - 1
                ? `    ${comment}` // Last comment
                : `    ${comment}\n`, // Other comments
          )
          .join("");
        content = content.replace(
          fieldPattern,
          `\n\n${formattedComments}\n    "${field}":`,
        );
      });
    });

    // Clean up multiple empty lines and ensure final newline
    content = `${content
      .replace(/\n{3,}/g, "\n\n") // Replace 3 or more newlines with 2
      .replace(/{\n\n/g, "{\n") // Remove double newline after opening brace
      .replace(/\n\n}/g, "\n}") // Remove double newline before closing brace
      .trim()}\n`; // Ensure single newline at end

    // Create backup if file exists
    if (await fs.pathExists(configPath)) {
      await fs.copy(configPath, backupPath);
    }

    // Write to temp file first
    await fs.writeFile(tempPath, content);

    // Atomically rename temp file to actual file
    await fs.rename(tempPath, configPath);

    // Remove backup on success
    if (await fs.pathExists(backupPath)) {
      await fs.remove(backupPath);
    }

    relinka("success-verbose", "Config written successfully");
  } catch (error) {
    // Restore from backup if write failed
    if (
      (await fs.pathExists(backupPath)) &&
      !(await fs.pathExists(configPath))
    ) {
      await fs.copy(backupPath, configPath);
      relinka("warn", "Restored config from backup after failed write");
    }

    // Clean up temp file
    if (await fs.pathExists(tempPath)) {
      await fs.remove(tempPath);
    }

    throw error;
  }
}

/**
 * Safely reads and validates config from file
 */
export async function safeReadConfig(
  targetDir: string,
): Promise<ReliverseConfig | null> {
  const configPath = path.join(targetDir, ".reliverse");
  const backupPath = configPath + BACKUP_EXTENSION;

  try {
    // Try reading main file
    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, "utf-8");

      // Handle empty file or just {}
      if (!content.trim() || content.trim() === "{}") {
        const defaultConfig = await getDefaultReliverseConfig(
          path.basename(targetDir),
          "user",
        );
        await safeWriteConfig(targetDir, defaultConfig);
        return defaultConfig;
      }

      const parsed = destr(content);
      if (!parsed || typeof parsed !== "object") {
        const defaultConfig = await getDefaultReliverseConfig(
          path.basename(targetDir),
          "user",
        );
        await safeWriteConfig(targetDir, defaultConfig);
        return defaultConfig;
      }

      // Validate parsed content
      const validationResult = reliverseConfigSchema.safeParse(parsed);
      if (validationResult.success) {
        // If config is valid, return it as is without any merging
        return validationResult.data;
      }

      // Only merge if there are missing required fields
      const missingFields = validationResult.error.errors.some(
        (e) => e.code === "invalid_type" && e.received === "undefined",
      );

      if (!missingFields) {
        // If errors are not about missing fields, return null to trigger backup/default
        relinka(
          "warn",
          `Invalid config format: ${validationResult.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")}`,
        );
        return null;
      }

      // If we have missing fields, merge with defaults
      const defaultConfig = await getDefaultReliverseConfig(
        path.basename(targetDir),
        "user",
      );

      // Deep merge existing values with defaults
      const mergedConfig: ReliverseConfig = {
        experimental: {
          ...defaultConfig.experimental,
          ...(parsed as Partial<ReliverseConfig>)?.experimental,
          features: {
            ...defaultConfig.experimental?.features,
            ...(parsed as Partial<ReliverseConfig>)?.experimental?.features,
          },
          codeStyle: {
            ...defaultConfig.experimental?.codeStyle,
            ...(parsed as Partial<ReliverseConfig>)?.experimental?.codeStyle,
          },
          preferredLibraries: {
            ...defaultConfig.experimental?.preferredLibraries,
            ...(parsed as Partial<ReliverseConfig>)?.experimental
              ?.preferredLibraries,
          },
          customRules: {
            ...defaultConfig.experimental?.customRules,
            ...(parsed as Partial<ReliverseConfig>)?.experimental?.customRules,
          },
        },
      };

      // Validate merged config
      const mergedValidation = reliverseConfigSchema.safeParse(mergedConfig);
      if (mergedValidation.success) {
        await safeWriteConfig(targetDir, mergedValidation.data);
        relinka(
          "info",
          "Updated config with missing fields while preserving existing values",
        );
        return mergedValidation.data;
      }

      // If merged config is invalid, warn and try backup
      relinka(
        "warn",
        `Invalid config format: ${validationResult.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`,
      );
    }

    // Try reading backup if main file is invalid or missing
    if (await fs.pathExists(backupPath)) {
      const backupContent = await fs.readFile(backupPath, "utf-8");
      const parsed = destr(backupContent);

      const validationResult = reliverseConfigSchema.safeParse(parsed);
      if (validationResult.success) {
        // Restore from backup
        await fs.copy(backupPath, configPath);
        relinka("info", "Restored config from backup");
        return validationResult.data;
      }
    }

    // If no valid config found, create default
    const defaultConfig = await getDefaultReliverseConfig(
      path.basename(targetDir),
      "user",
    );
    await safeWriteConfig(targetDir, defaultConfig);
    return defaultConfig;
  } catch (error) {
    relinka(
      "error",
      "Error reading config:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

/**
 * Safely updates specific fields in the config
 */
export async function safeUpdateConfig(
  targetDir: string,
  updates: Partial<ReliverseConfig>,
): Promise<boolean> {
  try {
    const currentConfig = await safeReadConfig(targetDir);
    if (!currentConfig) {
      return false;
    }

    const updatedConfig = {
      ...currentConfig,
      experimental: {
        ...currentConfig.experimental,
        ...updates.experimental,
      },
    };

    await safeWriteConfig(targetDir, updatedConfig);
    return true;
  } catch (error) {
    relinka(
      "error",
      "Error updating config:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
