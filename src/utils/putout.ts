import { fileExists, removeFile } from "@reliverse/fs";
import { selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import pc from "picocolors";

import type { PutoutConfig } from "~/utils/types.js";

import { relinka } from "~/utils/console.js";

export async function configurePutout({
  putoutConfig,
  putoutRecommendedConfig,
  putoutRulesDisabledConfig,
}: PutoutConfig) {
  const putoutConfigExists = await fileExists(putoutConfig);
  const putoutRecommendedConfigExists = await fileExists(
    putoutRecommendedConfig,
  );

  const putoutRulesDisabledConfigExists = await fileExists(
    putoutRulesDisabledConfig,
  );

  const putout: string | symbol = await selectPrompt({
    title: pc.cyan(
      "Please select which type of Putout configuration you want to use.",
    ),
    options: [
      {
        label: "Skip",
        value: "Skip",
        hint: "Skip Putout configuration",
      },
      {
        label: ".putout.recommended.json",
        value: "Recommended",
        hint: "[✅ Default] Recommended configuration",
      },
      {
        label: ".putout.rules-disabled.json",
        value: "RulesDisabled",
        hint: "Disables almost all rules",
      },
    ],
  });

  if (typeof putout !== "string") {
    process.exit(0);
  }

  if (putout === "Skip") {
    relinka("success", "Putout configuration was skipped.");

    return;
  }

  if (putoutConfigExists) {
    await removeFile(putoutConfig);
  }

  if (putout === "Recommended" && putoutRecommendedConfigExists) {
    await fs.copy(putoutRecommendedConfig, putoutConfig);
  } else if (putout === "RulesDisabled" && putoutRulesDisabledConfigExists) {
    await fs.copy(putoutRulesDisabledConfig, putoutConfig);
  }

  if (await fileExists(putoutConfig)) {
    relinka("success", `Putout configuration has been set to ${putout}`);
  } else {
    relinka(
      "error",
      "Something went wrong! Newly created `.putout.json` file was not found!",
    );
  }
}
