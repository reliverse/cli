import { fileExists, removeFile } from "@reliverse/fs";
import { select, selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import pc from "picocolors";

import type { BiomeConfig } from "./types.ts";

export async function configureBiome({
  biomeConfig,
  biomeRecommendedConfig,
  biomeRulesDisabledConfig,
}: BiomeConfig) {
  const biomeConfigExists = await fileExists(biomeConfig);
  const biomeRecommendedConfigExists = await fileExists(biomeRecommendedConfig);
  const biomeRulesDisabledConfigExists = await fileExists(
    biomeRulesDisabledConfig,
  );

  const biome: string | symbol = await selectPrompt({
    title: `Please select which type of Biome configuration you want to use.`,
    options: [
      {
        label: "Skip",
        value: "Skip",
        hint: "Skip Biome configuration",
      },
      {
        label: "biome.rules-disabled.json",
        value: "RulesDisabled",
        hint: "[✅ Default] Disables almost all rules",
      },
      {
        label: "biome.recommended.json",
        value: "Recommended",
        hint: "[🐞 You'll encounter many issues on Relivator 1.3.0@canary]",
      },
    ],
  });

  if (typeof biome !== "string") {
    process.exit(0);
  }

  if (biome === "Skip") {
    relinka.success("Biome configuration was skipped.");

    return;
  }

  if (biomeConfigExists) {
    await removeFile(biomeConfig);
  }

  if (biome === "Recommended" && biomeRecommendedConfigExists) {
    await fs.copy(biomeRecommendedConfig, biomeConfig);
  } else if (biome === "RulesDisabled" && biomeRulesDisabledConfigExists) {
    await fs.copy(biomeRulesDisabledConfig, biomeConfig);
  }

  if (await fileExists(biomeConfig)) {
    relinka.success(`Biome configuration has been set to ${biome}`);
  } else {
    relinka.error(
      "Something went wrong! Newly created `biome.json` file was not found!",
    );
  }
}
