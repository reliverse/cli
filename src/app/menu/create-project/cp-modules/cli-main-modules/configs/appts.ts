import { fileExists } from "@reliverse/fs";
import { confirmPrompt, inputPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { re } from "@reliverse/relico";
import fs from "fs-extra";
import {
  loadFile as magicastFileLoad,
  writeFile as magicastFileWrite,
} from "magicast";
import process from "node:process";
import { join } from "pathe";

import type { ApptsConfig } from "~/types.js";

import metadata from "~/utils/handlers/metadata.js";
import { config } from "~/utils/handlers/reliverseCore.js";

export async function configureAppts({
  apptsConfig,
}: ApptsConfig): Promise<void> {
  const apptsConfigPath = join(apptsConfig, "app.ts");
  const metadataConfigPath = join(apptsConfig, "constants/metadata.ts");

  if (!(await fileExists(apptsConfigPath))) {
    relinka(
      "error",
      "Oops! It seems like the configuration file `src/app.ts` has gone missing! ⛔",
    );
    process.exit(0);
  }

  if (!(await fileExists(metadataConfigPath))) {
    relinka(
      "error",
      `Uh-oh! We couldn't find the configuration file! (${metadataConfigPath}) ⛔`,
    );
    process.exit(0);
  }

  let currentConfig: Record<string, any> = {};

  try {
    const mod = await magicastFileLoad(metadataConfigPath);
    currentConfig = mod.exports["default"] ?? {};
  } catch (error) {
    relinka(
      "error",
      "Whoops! Something went wrong while loading the configuration file:",
      error instanceof Error ? error.message : JSON.stringify(error),
    );
    process.exit(0);
  }

  const proceed = await confirmPrompt({
    defaultValue: false,
    title: re.cyan(
      "[⚙️  Advanced]: Do you want to configure the app metadata stored in the src/app.ts file?",
    ),
  });

  if (typeof proceed !== "boolean" || !proceed) {
    process.exit(0);
  }

  let handle = await askForHandle(metadata.author.handle ?? "blefnk");

  // If the user skips the handle question, use the current handle from metadataConfig
  if (!handle) {
    handle = metadata.author.handle ?? "blefnk";
  }

  // If !handle for any other reason, use the fallback
  if (!handle) {
    handle = "blefnk";
  }

  const prompts = [
    {
      default: "Relivator",
      key: "name",
      message: "What's the short name for your app?",
    },
    {
      default: "Relivator: Next.js 15 and React 19 template by Reliverse",
      key: "siteNameDesc",
      message: "Enter the full name for your app:",
    },
    {
      default: "Reliverse",
      key: "appPublisher",
      message: "Who is the publisher of your app?",
    },
    {
      default: "1.2.6",
      key: "version",
      message: "What's the current version of your app?",
    },
    {
      default: "blefnk@gmail.com",
      key: "authorEmail",
      message: "Author's email address?",
    },
    {
      default: "Nazar Kornienko",
      key: "authorFullName",
      message: "Author's full name?",
    },
    {
      default: "https://github.com/blefnk",
      key: "authorUrl",
      message: "Author's URL?",
    },
  ];

  const results: Record<string, string> = {};

  for (const prompt of prompts) {
    results[prompt.key] = await askForText(
      prompt.message,
      (currentConfig[prompt.key] as string | undefined) ?? prompt.default,
    );
  }

  const {
    name,
    siteNameDesc,
    appPublisher,
    version,
    authorEmail,
    authorFullName,
    authorUrl,
  } = results;

  if (
    [
      handle,
      name,
      siteNameDesc,
      appPublisher,
      version,
      authorEmail,
      authorFullName,
      authorUrl,
    ].some((value) => typeof value !== "string")
  ) {
    process.exit(0);
  }

  try {
    await updateFile(metadataConfigPath, {
      // @ts-expect-error TODO: fix strictNullChecks undefined
      name: name,
      // @ts-expect-error TODO: fix strictNullChecks undefined
      siteNameDesc: siteNameDesc,
      // @ts-expect-error TODO: fix strictNullChecks undefined
      appPublisher: appPublisher,
      // @ts-expect-error TODO: fix strictNullChecks undefined
      version: version,
      // @ts-expect-error TODO: fix strictNullChecks undefined
      authorEmail: authorEmail,
      // @ts-expect-error TODO: fix strictNullChecks undefined
      authorFullName: authorFullName,
      // @ts-expect-error TODO: fix strictNullChecks undefined
      authorUrl: authorUrl,
      handle: handle,
    });

    relinka(
      "success",
      "🎉 Advanced configuration complete! Visit `src/app.ts` to fine-tune your settings further.",
    );
  } catch (error) {
    relinka(
      "error",
      "Error updating configuration file content:",
      error instanceof Error ? error.message : JSON.stringify(error),
    );
  }

  return;
}

async function askForHandle(currentHandle: string): Promise<string> {
  return await inputPrompt({
    title: `${re.bold(`Let's customize the ${config.framework.name} template to your needs. The 'src/app.ts' file holds the main configuration.`)} \n🚀 First of all, what's your username handle? (💡 Type something or just press ${re.cyan("<enter>")} to use the suggested value)`,
    placeholder: currentHandle,
    validate: (value: string): string | boolean => {
      if (value && !/^[\da-z]+$/i.test(value)) {
        return "Please use only letters and numbers.";
      }
      return true;
    },
  });
}

async function askForText(
  message: string,
  placeholder: string,
): Promise<string> {
  return (
    (await inputPrompt({
      title: message,
      placeholder,
      validate: (value: string): string | boolean => {
        if (value === undefined || value === null) {
          return `Please enter ${message.toLowerCase()}.`;
        }
        return true;
      },
    })) ?? placeholder
  );
}

async function updateFile(filePath: string, config: Record<string, string>) {
  try {
    const mod = await magicastFileLoad(filePath);

    mod.exports["default"] = mod.exports["default"] ?? {};
    mod.exports["default"].author = mod.exports["default"].author ?? {};

    mod.exports["default"].name = config["name"];
    mod.exports["default"].siteNameDesc = config["siteNameDesc"];
    mod.exports["default"].appPublisher = config["appPublisher"];
    mod.exports["default"].version = config["version"];
    mod.exports["default"].author.email = config["authorEmail"];
    mod.exports["default"].author.fullName = config["authorFullName"];
    mod.exports["default"].author.handle = config["handle"];
    mod.exports["default"].author.handleAt = `@${config["handle"]}`;
    mod.exports["default"].author.url = config["authorUrl"];

    await magicastFileWrite(mod, filePath);

    // Adding a blank new line at the end of the file
    await fs.appendFile(filePath, "\n");
  } catch (error) {
    relinka(
      "error",
      "Error updating configuration file content:",
      error instanceof Error ? error.message : JSON.stringify(error),
    );
  }
}
