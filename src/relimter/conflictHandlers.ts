// conflictHandlers.ts

import { select } from "@inquirer/prompts";
import { consola } from "consola";
import fs from "fs-extra";
import path from "pathe";

import { removeFile, renameFile } from "./fileUtils";

// Handle `.eslintrc.cjs` conflict (ask user to remove or rename)
export const handleESLintConflict = async (
  targetDir: string,
): Promise<void> => {
  const eslintFilePath = path.join(targetDir, ".eslintrc.cjs");

  if (fs.existsSync(eslintFilePath)) {
    consola.warn(`.eslintrc.cjs file exists in ${targetDir}.`);

    const action = await select({
      choices: [
        { name: "Remove .eslintrc.cjs", value: "remove" },
        { name: "Rename to .eslintrc.cjs.txt", value: "rename" },
        { name: "Do nothing", value: "nothing" },
      ],
      message: "Do you want to remove the file or rename it by adding .txt?",
    });

    if (action === "remove") {
      await removeFile(eslintFilePath);
      consola.success(".eslintrc.cjs removed.");
    } else if (action === "rename") {
      const renamedFilePath = `${eslintFilePath}.txt`;

      await renameFile(eslintFilePath, renamedFilePath);
      consola.success(".eslintrc.cjs renamed.");
    } else {
      consola.info("No changes made to .eslintrc.cjs.");
    }
  }
};

// Handle `prettier.config.js` conflict
export const handlePrettierConflict = async (
  targetDir: string,
): Promise<void> => {
  const prettierFilePath = path.join(targetDir, "prettier.config.js");

  if (fs.existsSync(prettierFilePath)) {
    consola.warn(`prettier.config.js file exists in ${targetDir}.`);

    consola.info("Biome will be installed, so Prettier is not necessary.");

    const action = await select({
      choices: [
        { name: "Remove prettier.config.js", value: "remove" },
        { name: "Rename to prettier.config.js.txt", value: "rename" },
        { name: "Do nothing", value: "nothing" },
      ],
      message: "Do you want to remove or rename it by adding .txt?",
    });

    if (action === "remove") {
      await removeFile(prettierFilePath);
      consola.success("prettier.config.js removed.");
    } else if (action === "rename") {
      const renamedFilePath = `${prettierFilePath}.txt`;

      await renameFile(prettierFilePath, renamedFilePath);
      consola.success("prettier.config.js renamed.");
    } else {
      consola.info("No changes made to prettier.config.js.");
    }
  }
};
