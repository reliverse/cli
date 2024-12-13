import { fileExists, removeFile } from "@reliverse/fs";
import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";

import { relinka } from "~/utils/console.js";

import type { KnipConfig } from "./types.js";

export async function configureKnip({
  knipConfig,
  knipRecommendedConfig,
  knipRulesDisabledConfig,
}: KnipConfig) {
  const knipConfigExists = await fileExists(knipConfig);
  const knipRecommendedConfigExists = await fileExists(knipRecommendedConfig);
  const knipRulesDisabledConfigExists = await fileExists(
    knipRulesDisabledConfig,
  );

  const knip: string | symbol = await selectPrompt({
    title: "Please select which type of Knip configuration you want to use.",
    options: [
      {
        label: "Skip",
        value: "Skip",
        hint: "Skip Knip configuration",
      },
      {
        label: "knip.recommended.json",
        value: "Recommended",
        hint: "[✅ Default] Recommended configuration",
      },
      {
        label: "knip.rules-disabled.json",
        value: "RulesDisabled",
        hint: "Disables almost all rules",
      },
    ],
  });

  if (typeof knip !== "string") {
    process.exit(0);
  }

  if (knip === "Skip") {
    relinka("success", "Knip configuration was skipped.");

    return;
  }

  if (knipConfigExists) {
    await removeFile(knipConfig);
  }

  if (knip === "Recommended" && knipRecommendedConfigExists) {
    await fs.copy(knipRecommendedConfig, knipConfig);
  } else if (knip === "RulesDisabled" && knipRulesDisabledConfigExists) {
    await fs.copy(knipRulesDisabledConfig, knipConfig);
  }

  if (await fileExists(knipConfig)) {
    relinka("success", `Knip configuration has been set to ${knip}`);
  } else {
    relinka(
      "error",
      "Something went wrong! Newly created `knip.json` file was not found!",
    );
  }
}
