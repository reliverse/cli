import { confirmPrompt, selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import type { ConflictHandlerOptions } from "~/types.js";

import { FILE_CONFLICTS } from "~/app/db/constants.js";
import {
  removeFile,
  renameFile,
} from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/fileUtils.js";
import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";

export const resolveProjectConflicts = async (projectPath: string) => {
  // Ask user if they want to decide what to do with each file conflict
  const shouldAskAboutHandlingConflicts = false;
  let automaticConflictHandling = true;

  if (shouldAskAboutHandlingConflicts) {
    automaticConflictHandling = await confirmPrompt({
      title:
        "I see some files already exist... Press 'Y' to allow me to handle them for you.",
      content:
        "If you choose 'Y' then I will remove the conflicting files for you, and replace them with recommended by me ones. Otherwise, I will ask you what to do with each file.",
    });
  }

  await handleFileConflicts({
    files: FILE_CONFLICTS,
    automaticConflictHandling,
    projectPath,
  });
};

// Universal conflict handler function
const handleFileConflicts = async ({
  files,
  automaticConflictHandling,
  projectPath,
}: ConflictHandlerOptions): Promise<void> => {
  for (const { customMessage, description, fileName } of files) {
    const filePath = path.join(projectPath, fileName);

    if (fs.pathExistsSync(filePath)) {
      const fileDescription = description ?? fileName;

      relinka(
        "info-verbose",
        `${fileDescription} file exists at ${projectPath}.`,
      );

      if (automaticConflictHandling) {
        // Automatically remove file without asking the user
        await removeFile(filePath);
        relinka("success-verbose", `${fileDescription} removed automatically.`);
        continue; // Skip to the next file
      }

      const message =
        customMessage ??
        `Do you want to remove or rename the ${fileDescription} file by adding .txt?`;

      const action = await selectPrompt({
        title: message,
        options: [
          { label: `Remove ${fileDescription}`, value: "remove" },
          { label: `Rename to ${fileDescription}.txt`, value: "rename" },
          { label: "Do nothing", value: "nothing" },
        ],
      });

      if (action === "remove") {
        await removeFile(filePath);
        relinka("success-verbose", `${fileDescription} removed.`);
      } else if (action === "rename") {
        const renamedFilePath = `${filePath}.txt`;
        await renameFile(filePath, renamedFilePath);
        relinka(
          "success",
          `${fileDescription} renamed to ${fileDescription}.txt.`,
        );
      } else {
        relinka("info-verbose", `No changes made to ${fileDescription}.`);
      }
    }
  }
};
