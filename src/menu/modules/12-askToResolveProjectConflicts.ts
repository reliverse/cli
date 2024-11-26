import { confirm, select, selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import fs from "fs-extra";
import path from "pathe";

import { DEBUG, FILE_CONFLICTS } from "~/app.js";
import { removeFile, renameFile } from "~/utils/fileUtils.js";

export const resolveProjectConflicts = async (targetDir: string) => {
  // Ask user if they want to decide what to do with each file conflict
  const manualHandling = await confirm({
    default: false, // Default to 'No'
    message:
      "Do you want to manually handle file conflicts? \n  If you choose 'N' then all the conflicting files will be automatically removed.",
  });

  await handleFileConflicts({
    files: FILE_CONFLICTS,
    manualHandling, // Pass this flag to the handler
    targetDir,
  });
};

type FileConflict = {
  customMessage?: string; // Optional custom message for user prompt
  description?: string; // Optional custom description for user-facing messages
  fileName: string; // Name of the file (e.g., '.eslintrc.cjs')
};

type ConflictHandlerOptions = {
  files: FileConflict[]; // List of files to check for conflicts
  manualHandling: boolean; // Whether to ask the user or automatically remove files
  targetDir: string; // Directory where the conflicts may happen
};

// Universal conflict handler function
const handleFileConflicts = async ({
  files,
  manualHandling,
  targetDir,
}: ConflictHandlerOptions): Promise<void> => {
  for (const { customMessage, description, fileName } of files) {
    const filePath = path.join(targetDir, fileName);

    if (fs.pathExistsSync(filePath)) {
      const fileDescription = description || fileName;

      DEBUG.enableVerboseLogging &&
        relinka.info(`${fileDescription} file exists at ${targetDir}.`);

      if (!manualHandling) {
        // Automatically remove file without asking the user
        await removeFile(filePath);
        DEBUG.enableVerboseLogging &&
          relinka.success(`${fileDescription} removed automatically.`);
        continue; // Skip to the next file
      }

      const message =
        customMessage ||
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
        DEBUG.enableVerboseLogging &&
          relinka.success(`${fileDescription} removed.`);
      } else if (action === "rename") {
        const renamedFilePath = `${filePath}.txt`;

        await renameFile(filePath, renamedFilePath);
        relinka.success(
          `${fileDescription} renamed to ${fileDescription}.txt.`,
        );
      } else {
        relinka.info(`No changes made to ${fileDescription}.`);
      }
    }
  }
};
