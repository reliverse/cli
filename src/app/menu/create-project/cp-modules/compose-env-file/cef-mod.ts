import { selectPrompt, inputPrompt, confirmPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { execa } from "execa";
import fs from "fs-extra";
import open from "open";

import type { ReliverseConfig } from "~/utils/schemaConfig.js";

import {
  promptAndSetMissingValues,
  getLastEnvFilePath,
  saveLastEnvFilePath,
  ensureExampleExists,
  ensureEnvExists,
  getMissingKeys,
  getEnvPath,
  copyFromExisting,
} from "./cef-impl.js";

export async function composeEnvFile(
  projectDir: string,
  fallbackEnvExampleURL: string,
  shouldMaskSecretInput: boolean,
  skipPrompts: boolean,
  config: ReliverseConfig | null,
): Promise<void> {
  if (config === null) return;

  try {
    const results = await Promise.all([
      ensureExampleExists(projectDir, fallbackEnvExampleURL),
      ensureEnvExists(projectDir),
    ]).catch((err) => {
      relinka("error", "Failed to setup env files:", getErrorMessage(err));
      return [false, false];
    });

    if (!results[0] || !results[1]) return;

    const missingKeys = await getMissingKeys(projectDir).catch(() => {
      relinka("error", "Failed to check for missing keys");
      return [] as string[];
    });

    if (missingKeys.length === 0) {
      relinka("success", "All environment variables are set!");
      return;
    }

    const lastEnvPath = await getLastEnvFilePath();
    const envPath = getEnvPath(projectDir);

    // In auto mode, use last env path if it exists and is valid
    if (skipPrompts && lastEnvPath && (await fs.pathExists(lastEnvPath))) {
      if (await copyFromExisting(projectDir, lastEnvPath)) {
        relinka(
          "success",
          "Environment variables copied from the last used file.",
        );
        const remainingMissingKeys = await getMissingKeys(projectDir);
        if (remainingMissingKeys.length > 0) {
          relinka(
            "info",
            `The following keys are still missing in the copied .env file: ${remainingMissingKeys.join(", ")}`,
          );
          await promptAndSetMissingValues(
            remainingMissingKeys,
            envPath,
            shouldMaskSecretInput,
            config,
            true,
          );
        }
        return;
      }
    }

    const options = [
      ...(lastEnvPath && (await fs.pathExists(lastEnvPath))
        ? [
            {
              label: "Copy data from recently provided .env file",
              value: "latest",
            },
          ]
        : []),
      { label: "Yes, please help me", value: "auto" },
      { label: "No, I want to do it manually", value: "manual" },
      {
        label: "I have an existing .env file I can provide",
        value: "existing",
      },
    ];

    // Handle missing keys
    const response = await selectPrompt({
      title:
        "Do you want me to help you fill in the .env file? Or, do you prefer to do it manually?",
      content:
        "✨ Everything is saved only in your .env file and will not be shared anywhere.",
      options,
    });

    if (response === "manual") {
      relinka("info-verbose", "Opening .env for manual editing...");
      try {
        await execa("code", [envPath]);
      } catch {
        relinka(
          "warn",
          "Failed to open .env in VSCode. Please open it manually:",
          envPath,
        );
      }
    } else if (response === "existing") {
      let existingPath: string;
      existingPath = await inputPrompt({
        title:
          "Please provide the path to your existing .env file or directory:",
        placeholder:
          process.platform === "win32"
            ? `Enter the path (e.g. "C:\\B\\S\\project\\.env" or "C:\\B\\S\\project")`
            : `Enter the path (e.g. "/home/user/project/.env" or "/home/user/project")`,
        content:
          "You can provide either the .env file path or the directory containing it.\nHint: Drag-n-drop the file or directory into the terminal to insert the path.",
        contentColor: "yellowBright",
      });

      // if existingPath contains `""` or `''`, remove the quotes
      existingPath = existingPath.replace(/^["']|["']$/g, "");

      if (await copyFromExisting(projectDir, existingPath)) {
        await saveLastEnvFilePath(existingPath);
        const remainingMissingKeys = await getMissingKeys(projectDir);
        if (remainingMissingKeys.length > 0) {
          relinka(
            "info",
            `The following keys are still missing in the copied .env file: ${remainingMissingKeys.join(", ")}`,
          );
          await promptAndSetMissingValues(
            remainingMissingKeys,
            envPath,
            shouldMaskSecretInput,
            config,
            true,
          );
        }
      }
    } else if (response === "latest") {
      if (lastEnvPath && (await copyFromExisting(projectDir, lastEnvPath))) {
        relinka(
          "success",
          "Environment variables copied from the last used file.",
        );
        const remainingMissingKeys = await getMissingKeys(projectDir);
        if (remainingMissingKeys.length > 0) {
          relinka(
            "info",
            `The following keys are still missing in the copied .env file: ${remainingMissingKeys.join(", ")}`,
          );
          await promptAndSetMissingValues(
            remainingMissingKeys,
            envPath,
            shouldMaskSecretInput,
            config,
            true,
          );
        }
      } else {
        relinka("info", "Falling back to auto mode...");
        await promptAndSetMissingValues(
          missingKeys,
          envPath,
          shouldMaskSecretInput,
          config,
          false,
        );
      }
    } else {
      // default: "auto"
      await promptAndSetMissingValues(
        missingKeys,
        envPath,
        shouldMaskSecretInput,
        config,
        false,
      );
    }

    if (!skipPrompts) {
      // Offer to open documentation
      const shouldOpenDocs = await confirmPrompt({
        title:
          "You can always check the Reliverse Docs to learn more about env variables. Open it now?",
        titleColor: "blueBright",
        defaultValue: false,
      });

      if (shouldOpenDocs) {
        relinka("info-verbose", "Opening https://docs.reliverse.org/env");
        await open("https://docs.reliverse.org/env");
      }
    }
  } catch (err) {
    relinka("error", "Failed to compose env file:", getErrorMessage(err));
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : "Unknown error occurred";
}
