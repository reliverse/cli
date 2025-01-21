// 👉 usage example: `bun pub --bump=1.2.3`

import { parseJSONC, parseJSON5 } from "confbox";
import { destr } from "destr";
import { execaCommand } from "execa";
import fs from "fs-extra";
import { globby } from "globby";
import mri from "mri";
import path from "pathe";

// TODO: implement @reliverse/bump npm library

function showHelp() {
  console.log(
    `Usage: bun tsx build.publish.ts [newVersion] [options]

Arguments:
  newVersion        The new version to set (e.g. 1.2.3)
  
Options:
  --jsr             Publish to JSR registry
  --dry-run         Perform a dry run of the publish process
  -h, --help        Show help
`,
  );
}

const argv = mri(process.argv.slice(2), {
  alias: {
    h: "help",
  },
  boolean: ["jsr", "dry-run", "help"],
  default: {
    jsr: false,
    "dry-run": false,
    help: false,
  },
});

// If help flag is present, display help and exit
if (argv["help"]) {
  showHelp();
  process.exit(0);
}

// Handle flags
const validFlags = ["jsr", "dry-run", "help", "h"];
const unknownFlags = Object.keys(argv).filter(
  (key) => !validFlags.includes(key) && key !== "_",
);

if (unknownFlags.length > 0) {
  console.error(`❌ Unknown flag(s): ${unknownFlags.join(", ")}`);
  showHelp();
  process.exit(1);
}

async function publishNpm(dryRun: boolean) {
  try {
    if (dryRun) {
      await execaCommand("npm publish --dry-run", { stdio: "inherit" });
    } else {
      await execaCommand("bun build:npm", { stdio: "inherit" });
      await execaCommand("npm publish", { stdio: "inherit" });
    }
    console.log("success", "Published to npm successfully.");
  } catch (error) {
    console.error(
      "❌ Failed to publish to npm:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

async function publishJsr(dryRun: boolean) {
  try {
    if (dryRun) {
      await execaCommand("bunx jsr publish --dry-run", {
        stdio: "inherit",
      });
    } else {
      await execaCommand("bun build:jsr", { stdio: "inherit" });
      await execaCommand("bunx jsr publish --allow-slow-types --allow-dirty", {
        stdio: "inherit",
      });
    }
    console.log("success", "Published to JSR successfully.");
  } catch (error) {
    console.error(
      "❌ Failed to publish to JSR:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

async function bumpVersions(oldVersion: string, newVersion: string) {
  try {
    // Find all relevant files
    const codebase = await globby("**/*.{reliverse,json,jsonc,json5,ts}", {
      ignore: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/coverage/**",
        "**/.cache/**",
        "**/tmp/**",
        "**/.temp/**",
        "**/package-lock.json",
        "**/pnpm-lock.yaml",
        "**/yarn.lock",
        "**/bun.lockb",
      ],
    });

    // Track which files were updated
    const updatedFiles: string[] = [];

    // Process each file
    for (const file of codebase) {
      try {
        const content = await fs.readFile(file, "utf-8");

        // Handle different file types
        if (file.endsWith(".json") || file.endsWith(".reliverse")) {
          const parsed = destr(content);
          if (parsed && typeof parsed === "object" && "version" in parsed) {
            parsed.version = newVersion;
            await fs.writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`);
            updatedFiles.push(file);
            continue;
          }
        } else if (file.endsWith(".jsonc")) {
          const parsed = parseJSONC(content);
          if (parsed && typeof parsed === "object" && "version" in parsed) {
            parsed.version = newVersion;
            await fs.writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`);
            updatedFiles.push(file);
            continue;
          }
        } else if (file.endsWith(".json5")) {
          const parsed = parseJSON5(content);
          if (parsed && typeof parsed === "object" && "version" in parsed) {
            parsed.version = newVersion;
            await fs.writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`);
            updatedFiles.push(file);
            continue;
          }
        }

        // For other files (including .ts), do string replacement if version is found
        if (content.includes(oldVersion)) {
          const updated = content.replaceAll(oldVersion, newVersion);
          await fs.writeFile(file, updated);
          updatedFiles.push(file);
        }
      } catch (error) {
        console.warn(
          `Failed to process ${file}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    if (updatedFiles.length > 0) {
      console.log(
        `Version updated from ${oldVersion} to ${newVersion}`,
        `Updated ${String(updatedFiles.length)} files:`,
        updatedFiles.join("\n"),
      );
    } else {
      console.warn("No files were updated with the new version");
    }
  } catch (error) {
    console.error(
      "Failed to bump versions:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

async function main() {
  try {
    const { jsr, "dry-run": dryRun } = argv as unknown as {
      jsr: boolean;
      "dry-run": boolean;
    };
    const newVersion = argv._[0];

    if (!newVersion) {
      console.log("No version specified, skipping version bump");
    } else {
      // Validate version format
      if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/.test(newVersion)) {
        throw new Error(
          "Invalid version format. Must be a valid semver (e.g., 1.2.3, 1.2.3-beta.1)",
        );
      }

      // Read current version
      const pkgPath = path.resolve("package.json");
      if (!(await fs.pathExists(pkgPath))) {
        throw new Error("package.json not found");
      }

      const pkg = destr<{ version: string }>(
        await fs.readFile(pkgPath, "utf-8"),
      );
      if (!pkg.version) {
        throw new Error("No version field found in package.json");
      }

      const oldVersion = pkg.version;
      if (oldVersion === newVersion) {
        console.log(`No version change required: already at ${oldVersion}`);
      } else {
        await bumpVersions(oldVersion, newVersion);
      }
    }

    // Proceed with publishing
    if (jsr) {
      await publishJsr(dryRun);
    } else {
      await publishNpm(dryRun);
    }
  } catch (error) {
    console.error(
      "❌ An unexpected error occurred:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(
    "❌ An unexpected error occurred:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
