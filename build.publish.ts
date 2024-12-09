// 👉 usage example: `bun pub --bump=1.2.3`

import relinka from "@reliverse/relinka";
import { execaCommand } from "execa";
import fs from "fs-extra";
import { globby } from "globby";
import mri from "mri";
import path from "path";

function showHelp() {
  relinka.info(`Usage: bun tsx build.publish.ts [newVersion] [options]

Arguments:
  newVersion        The new version to set (e.g. 1.2.3)
  
Options:
  --jsr             Publish to JSR registry
  --dry-run         Perform a dry run of the publish process
  -h, --help        Show help
`);
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
if (argv.help) {
  showHelp();
  process.exit(0);
}

// Handle flags
const validFlags = ["jsr", "dry-run", "help", "h"];
const unknownFlags = Object.keys(argv).filter(
  (key) => !validFlags.includes(key) && key !== "_",
);

if (unknownFlags.length > 0) {
  relinka.error(`❌ Unknown flag(s): ${unknownFlags.join(", ")}`);
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
    relinka.success("Published to npm successfully.");
  } catch (error) {
    relinka.error("❌ Failed to publish to npm:", error);
    process.exit(1);
  }
}

async function publishJsr(dryRun: boolean) {
  try {
    if (dryRun) {
      await execaCommand(
        "bunx jsr publish --allow-slow-types --allow-dirty --dry-run",
        { stdio: "inherit" },
      );
    } else {
      await execaCommand("bun build:jsr", { stdio: "inherit" });
      await execaCommand("bunx jsr publish --allow-slow-types --allow-dirty", {
        stdio: "inherit",
      });
    }
    relinka.success("Published to JSR successfully.");
  } catch (error) {
    relinka.error("❌ Failed to publish to JSR:", error);
    process.exit(1);
  }
}

async function bumpVersions(oldVersion: string, newVersion: string) {
  // Update package.json
  const pkgPath = path.resolve("package.json");
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8")) as {
    version: string;
  };
  pkg.version = newVersion;
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2));

  // Update jsr.jsonc
  const jsrPath = path.resolve("jsr.jsonc");
  if (await fs.pathExists(jsrPath)) {
    const jsrConfig = JSON.parse(await fs.readFile(jsrPath, "utf-8")) as {
      version: string;
    };
    jsrConfig.version = newVersion;
    await fs.writeFile(jsrPath, JSON.stringify(jsrConfig, null, 2));
  }

  // Replace version in src/**/*.ts
  const tsFiles = await globby("src/**/*.ts");
  for (const file of tsFiles) {
    const content = await fs.readFile(file, "utf-8");
    if (content.includes(oldVersion)) {
      const updated = content.replaceAll(oldVersion, newVersion);
      await fs.writeFile(file, updated);
    }
  }

  relinka.success(`Version updated from ${oldVersion} to ${newVersion}`);
}

async function main() {
  const { jsr, "dry-run": dryRun } = argv;
  const newVersion = argv._[0]; // The new version provided by the user (if any)

  if (newVersion) {
    // Perform version bump
    const pkg = JSON.parse(await fs.readFile("package.json", "utf-8")) as {
      version: string;
    };
    const oldVersion = pkg.version;
    if (oldVersion !== newVersion) {
      await bumpVersions(oldVersion, newVersion);
    } else {
      relinka.info(`No version change required: already at ${oldVersion}`);
    }
  }

  // After potential bump, proceed with publishing
  if (jsr) {
    await publishJsr(dryRun);
  } else {
    await publishNpm(dryRun);
  }
}

main().catch((error) => {
  relinka.error("❌ An unexpected error occurred:", error);
  process.exit(1);
});
