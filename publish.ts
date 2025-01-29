// 👉 usage example: `bun pub --bump=1.2.3`

import { execaCommand } from "execa";
import fs from "fs-extra";
import mri from "mri";
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
    console.error("\n❌ Cannot proceed with publishing!");
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

async function main() {
  try {
    const args = mri(process.argv.slice(2), {
      boolean: ["jsr", "npm", "dryRun", "pausePublish"],
      string: ["bump"],
      alias: {
        dryRun: "dry-run",
        pausePublish: "pause-publish",
      },
    });

    // Check for dist folders first unless in pause mode
    if (!args["pausePublish"] && !(await checkDistFolders())) {
      process.exit(1);
    }

    if (args["jsr"]) {
      console.log("\n📦 Publishing the JSR version...");
      await execaCommand(`bun build.publish.ts ${args["bump"]} --jsr`, {
        stdio: "inherit",
      });
    } else if (args["npm"]) {
      console.log("\n📦 Publishing the NPM version...");
      await execaCommand(`bun build.publish.ts ${args["bump"]}`, {
        stdio: "inherit",
      });
    } else if (args["dryRun"]) {
      console.log("\n🔍 Performing dry run of the publish process...");
      await execaCommand("bun pub:jsr --dry-run", { stdio: "inherit" });
      await execaCommand("bun pub:npm --dry-run", { stdio: "inherit" });
    } else if (args["pausePublish"]) {
      console.log("\n⏸️  Building without publishing...");
      await execaCommand(
        `bun build.publish.ts ${args["bump"]} --jsr --pause-publish`,
        { stdio: "inherit" },
      );
      await execaCommand("bun pub:npm --pause-publish", {
        stdio: "inherit",
      });
    } else {
      console.log("\n📦 Publishing both JSR and NPM versions...");
      await execaCommand(`bun build.publish.ts ${args["bump"]} --jsr`, {
        stdio: "inherit",
      });
      await execaCommand(`bun pub:npm ${args["bump"]}`, { stdio: "inherit" });
    }

    console.log("\n✅ Publishing process completed successfully!");
  } catch (error) {
    console.error(
      "\n❌ Publishing process failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ An unexpected error occurred:");
  console.error(error instanceof Error ? error.message : String(error));
  console.error("\nIf this issue is related to @reliverse/cli itself, please");
  console.error("report the details at https://github.com/reliverse/cli\n");
  process.exit(1);
});
