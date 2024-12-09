import { confirmPrompt, msg, selectPrompt } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";

import { DEBUG, FILE_CONFLICTS } from "~/app/data/constants.js";
import { removeFile, renameFile } from "~/utils/fileUtils.js";

export const resolveProjectConflicts = async (targetDir: string) => {
  // Ask user if they want to decide what to do with each file conflict
  const automaticConflictHandling = await confirmPrompt({
    title:
      "I see some files already exist... Press 'Y' to allow me to handle them for you.",
    content:
      "If you choose 'Y' then I will remove the conflicting files for you, and replace them with recommended by me ones. Otherwise, I will ask you what to do with each file.",
  });

  await handleFileConflicts({
    files: FILE_CONFLICTS,
    automaticConflictHandling,
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
  automaticConflictHandling: boolean; // Whether to ask the user or automatically remove files
  targetDir: string; // Directory where the conflicts may happen
};

// Universal conflict handler function
const handleFileConflicts = async ({
  files,
  automaticConflictHandling,
  targetDir,
}: ConflictHandlerOptions): Promise<void> => {
  for (const { customMessage, description, fileName } of files) {
    const filePath = path.join(targetDir, fileName);

    if (fs.pathExistsSync(filePath)) {
      const fileDescription = description || fileName;

      DEBUG.enableVerboseLogging &&
        msg({
          type: "M_INFO",
          title: `${fileDescription} file exists at ${targetDir}.`,
        });

      if (automaticConflictHandling) {
        // Automatically remove file without asking the user
        await removeFile(filePath);
        DEBUG.enableVerboseLogging &&
          msg({
            type: "M_INFO",
            title: `${fileDescription} removed automatically.`,
          });
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
          msg({
            type: "M_INFO",
            title: `${fileDescription} removed.`,
            titleColor: "retroGradient",
          });
      } else if (action === "rename") {
        const renamedFilePath = `${filePath}.txt`;

        await renameFile(filePath, renamedFilePath);
        msg({
          type: "M_INFO",
          title: `${fileDescription} renamed to ${fileDescription}.txt.`,
          titleColor: "retroGradient",
        });
      } else {
        msg({
          type: "M_INFO",
          title: `No changes made to ${fileDescription}.`,
          titleColor: "retroGradient",
        });
      }
    }
  }
};
