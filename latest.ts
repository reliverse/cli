import { execaCommand } from "execa";
import fs from "fs-extra";
import os from "node:os";
import path from "pathe";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getRemoveCommand(folders: string[]): string {
  const platform = os.platform();
  const folderList = folders.join(" ");

  switch (platform) {
    case "win32":
      // PowerShell command
      return `Remove-Item -Recurse -Force ${folders.map((f) => `"./${f}"`).join(", ")}`;
    case "darwin":
    case "linux":
      // Unix-like systems
      return `rm -rf ${folderList}`;
    default:
      // Fallback to basic command
      return `Remove the following folders: ${folderList}`;
  }
}

async function checkDistFolders(): Promise<boolean> {
  const distFolders = ["dist-npm", "dist-jsr"];
  const existingFolders: string[] = [];

  for (const folder of distFolders) {
    const folderPath = path.resolve(__dirname, folder);
    if (await fs.pathExists(folderPath)) {
      existingFolders.push(folder);
    }
  }

  if (existingFolders.length > 0) {
    console.error("\n❌ Cannot proceed with update!");
    console.error(
      "The following distribution folders exist and may cause unexpected behavior:",
    );
    existingFolders.forEach((folder) => console.error(`  - ${folder}`));
    console.error("\nPlease remove these folders first and try again:");
    console.error(`${getRemoveCommand(existingFolders)}\n`);
    return false;
  }

  return true;
}

async function installSpecificDependencies(trpc: boolean) {
  if (!trpc) return;

  console.log("\n📦 Installing specific TRPC versions...");
  await execaCommand(
    "bun add @trpc/client@next @trpc/next@next @trpc/react-query@next @trpc/server@next",
    { stdio: "inherit" },
  );
}

async function updateDependencies() {
  try {
    // Check for dist folders first
    if (!(await checkDistFolders())) {
      process.exit(1);
    }

    console.log("🔄 Updating all dependencies to their latest versions...");
    await execaCommand("bun update --latest", { stdio: "inherit" });

    await installSpecificDependencies(false);

    console.log("\n✅ All dependencies are up-to-date!");
  } catch (error) {
    console.error(
      "\n❌ Failed to update dependencies:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

// Run the update
await updateDependencies();
