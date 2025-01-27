import { confirmPrompt } from "@reliverse/prompts";
import fs from "fs-extra";

import { downloadJsrDist } from "./bw-impl.js";

export async function showBunWindowsMenu({ outputDir }: { outputDir: string }) {
  // @see https://jsr.io/@reliverse/cli

  // Check if output directory exists and is not empty
  const dirExists = await fs.pathExists(outputDir);
  if (dirExists) {
    try {
      const files = await fs.readdir(outputDir);
      if (files.length > 0) {
        const shouldOverwrite = await confirmPrompt({
          title: "Bun runtime files already exist in the target directory.",
          content:
            "Do you want to proceed and potentially overwrite existing files?",
          defaultValue: false,
        });

        if (!shouldOverwrite) {
          return;
        }
      }
    } catch (error) {
      // If we can't read the directory, proceed with caution
      console.error("Error checking directory:", error);
    }
  }

  const shouldUseBunRuntime = await confirmPrompt({
    title:
      "I see you're using Windows and have Bun installed, but the process was run with the Node.js runtime. Do you want to use the Bun runtime?",
    content:
      "Press <Enter> to allow me to download the CLI from JSR and install it globally. (The download speed depends on your internet connection.)",
    defaultValue: true,
  });

  if (!shouldUseBunRuntime) {
    return;
  }

  await downloadJsrDist(
    "reliverse",
    "cli",
    undefined, // This will pick the latest version automatically
    outputDir,
    true,
    5,
    true,
    "Downloading Bun-native Reliverse CLI from JSR...",
  );
}
