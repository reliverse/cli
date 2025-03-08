import type { TSConfig } from "pkg-types";

import { relinka } from "@reliverse/prompts";
import { destr } from "destr";
import fs from "fs-extra";
import path from "pathe";
import { glob } from "tinyglobby";

import { tsconfigJson } from "~/libs/sdk/constants.js";

const RUNTIME_REPLACEMENTS = {
  bun: {
    // Node.js fs to Bun's fs
    'import fs from "fs"':
      'import { readFile, writeFile, readdir, mkdir, stat } from "fs"',
    'import fs from "fs/promises"':
      'import { readFile, writeFile, readdir, mkdir, stat } from "fs"',
    "import { promises as fs }":
      'import { readFile, writeFile, readdir, mkdir, stat } from "fs"',
    // Node.js path to Bun's path
    'import path from "path"':
      'import { join, resolve, dirname, basename } from "path"',
    // Node.js crypto to Bun's crypto
    'import crypto from "uncrypto"': 'import { crypto } from "bun"',
    // Node.js buffer to Bun's buffer
    "import { Buffer }": "// Bun has Buffer globally available",
    // Node.js process to Bun's process
    "process.env": "Bun.env",
    "process.cwd()": "import.meta.dir",
  },
  deno: {
    // Node.js fs to Deno's fs
    'import fs from "fs"':
      'import * as fs from "https://deno.land/std/fs/mod.ts"',
    'import fs from "fs/promises"':
      'import * as fs from "https://deno.land/std/fs/mod.ts"',
    "import { promises as fs }":
      'import * as fs from "https://deno.land/std/fs/mod.ts"',
    // Node.js path to Deno's path
    'import path from "path"':
      'import * as path from "https://deno.land/std/path/mod.ts"',
    // Node.js crypto to Deno's crypto
    'import crypto from "uncrypto"':
      'import * as crypto from "https://deno.land/std/crypto/mod.ts"',
    // Node.js buffer to Deno's buffer
    "import { Buffer }":
      'import { Buffer } from "https://deno.land/std/io/buffer.ts"',
    // Node.js process to Deno
    "process.env": "Deno.env.toObject()",
    "process.cwd()": "Deno.cwd()",
  },
};

export async function convertRuntime(
  projectPath: string,
  targetRuntime: "bun" | "deno",
) {
  relinka(
    "info",
    `Converting Node.js code to ${targetRuntime} in ${projectPath}`,
  );

  const files = await glob("**/*.{js,jsx,ts,tsx}", {
    cwd: path.resolve(projectPath),
  });

  const runtimeReplacements = RUNTIME_REPLACEMENTS[targetRuntime];

  for (const file of files) {
    const filePath = path.join(projectPath, file);
    const content = await fs.readFile(filePath, "utf-8");
    let updatedContent = content;

    // Replace imports and APIs
    for (const [nodePattern, runtimePattern] of Object.entries(
      runtimeReplacements,
    )) {
      updatedContent = updatedContent.replace(
        new RegExp(nodePattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        runtimePattern,
      );
    }

    // Additional Bun-specific conversions
    if (targetRuntime === "bun") {
      // Convert package.json scripts
      if (file === "package.json") {
        const packageJson = destr<{ scripts?: Record<string, string> }>(
          updatedContent,
        );
        if (packageJson?.scripts) {
          for (const [key, value] of Object.entries(packageJson.scripts)) {
            if (typeof value === "string") {
              packageJson.scripts[key] = value
                .replace(/^node\s/, "bun ")
                .replace(/^ts-node\s/, "bun ");
            }
          }
          updatedContent = JSON.stringify(packageJson, null, 2);
        }
      }
    }

    // Additional Deno-specific conversions
    if (targetRuntime === "deno") {
      // Generate Deno configuration if it's a new Deno project
      if (file === "package.json") {
        await fs.writeFile(
          path.join(projectPath, "deno.json"),
          JSON.stringify(
            {
              compilerOptions: {
                allowJs: true,
                lib: ["deno.window"],
              },
              importMap: "import_map.json",
            },
            null,
            2,
          ),
        );

        // Create import map for third-party dependencies
        const packageJson = destr<{ dependencies?: Record<string, string> }>(
          content,
        );
        const importMap = {
          imports: {} as Record<string, string>,
        };
        if (packageJson?.dependencies) {
          for (const dep of Object.keys(packageJson.dependencies)) {
            importMap.imports[dep] = `https://esm.sh/${dep}`;
          }
        }
        await fs.writeFile(
          path.join(projectPath, "import_map.json"),
          JSON.stringify(importMap, null, 2),
        );
      }
    }

    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, "utf-8");
      relinka("info", `Updated runtime code in ${filePath}`);
    }
  }

  // Update configuration files
  if (targetRuntime === "bun") {
    // Convert tsconfig.json for Bun
    const tsconfigPath = path.join(projectPath, tsconfigJson);
    if (await fs.pathExists(tsconfigPath)) {
      const tsconfig = destr<TSConfig>(
        await fs.readFile(tsconfigPath, "utf-8"),
      );
      tsconfig.compilerOptions = {
        ...tsconfig.compilerOptions,
        types: [...(tsconfig.compilerOptions?.types ?? []), "bun-types"],
      };
      await fs.writeJSON(tsconfigPath, tsconfig, { spaces: 2 });
    }
  }

  relinka("success", `Converted project to ${targetRuntime}`);
}
