import { selectPrompt, inputPrompt, confirmPrompt } from "@reliverse/prompts";
import { execa } from "execa";
import fs from "fs-extra";
import open from "open";

import { relinka } from "~/utils/console.js";

import {
  ensureExampleExists,
  ensureEnvExists,
  getMissingKeys,
  copyFromExisting,
  getEnvPath,
} from "./helpers/env-manager.js";
import {
  promptAndSetMissingValues,
  getLastEnvFilePath,
  saveLastEnvFilePath,
} from "./helpers/env.js";

export async function composeEnvFile(
  projectDir: string,
  gitRepo: string,
): Promise<void> {
  try {
    const results = await Promise.all([
      ensureExampleExists(projectDir, gitRepo),
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
    const options = [
      ...(lastEnvPath && (await fs.pathExists(lastEnvPath))
        ? [{ label: "Use recently provided env file", value: "latest" }]
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
      contentColor: "yellowBright",
      options,
    });

    const envPath = getEnvPath(projectDir);

    switch (response) {
      case "manual":
        relinka("info-verbose", "Opening .env for manual editing...");
        await execa("code", [envPath]);
        break;

      case "existing":
        const existingPath = await inputPrompt({
          title:
            "Please provide the path to your existing .env file or directory:",
          placeholder:
            process.platform === "win32"
              ? `Enter the path (e.g. "C:\\Users\\name\\project\\.env" or "C:\\Users\\name\\project")`
              : `Enter the path (e.g. "/home/user/project/.env" or "/home/user/project")`,
          content:
            "You can provide either the .env file path or the directory containing it.",
          contentColor: "yellowBright",
        });

        if (await copyFromExisting(projectDir, existingPath)) {
          await saveLastEnvFilePath(existingPath);
          const remainingMissingKeys = await getMissingKeys(projectDir);
          if (remainingMissingKeys.length > 0) {
            relinka(
              "info",
              "Some values are still missing in the copied .env file.",
            );
            await promptAndSetMissingValues(remainingMissingKeys, envPath);
          }
        }
        break;

      case "latest":
        if (lastEnvPath && (await copyFromExisting(projectDir, lastEnvPath))) {
          relinka(
            "success",
            "Environment variables copied from the last used file",
          );
          const remainingMissingKeys = await getMissingKeys(projectDir);
          if (remainingMissingKeys.length > 0) {
            relinka(
              "info",
              "Some values are still missing in the copied .env file.",
            );
            await promptAndSetMissingValues(remainingMissingKeys, envPath);
          }
        } else {
          relinka("info", "Falling back to auto mode...");
          await promptAndSetMissingValues(missingKeys, envPath);
        }
        break;

      default: // "auto"
        await promptAndSetMissingValues(missingKeys, envPath);
        break;
    }

    // Offer to open documentation
    const shouldOpenDocs = await confirmPrompt({
      title:
        "You can always check the Reliverse Docs to learn more about env variables. Open it now?",
      titleColor: "blueBright",
      defaultValue: false,
    });

    if (shouldOpenDocs) {
      relinka("info-verbose", "Opening https://docs.reliverse.org/env...");
      await open("https://docs.reliverse.org/env");
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
