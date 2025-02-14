import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { glob } from "tinyglobby";

import type { ModernReplacement } from "~/types.js";

const MODERN_REPLACEMENTS: ModernReplacement[] = [
  // File System
  {
    pattern: /import fs from ["']fs["'];/g,
    replacement: 'import fs from "fs-extra";',
    description: "Replace Node.js fs with fs-extra",
  },
  {
    pattern: /import \* as fs from ["']fs["'];/g,
    replacement: 'import fs from "fs-extra";',
    description: "Replace Node.js fs namespace with fs-extra",
  },
  {
    pattern: /import \{ promises as fs \} from ["']fs["'];/g,
    replacement: 'import fs from "fs-extra";',
    description: "Replace fs.promises with fs-extra",
  },

  // Path
  {
    pattern: /import path from ["']path["'];/g,
    replacement: 'import path from "pathe";',
    description: "Replace Node.js path with pathe",
  },
  {
    pattern: /import \* as path from ["']path["'];/g,
    replacement: 'import path from "pathe";',
    description: "Replace Node.js path namespace with pathe",
  },

  // HTTP/HTTPS
  {
    pattern: /import https? from ["']https?["'];/g,
    replacement: 'import { fetch } from "undici";',
    description: "Replace Node.js http/https with undici",
  },
  {
    pattern: /import axios from ["']axios["'];/g,
    replacement: 'import { fetch } from "undici";',
    description: "Replace axios with undici",
  },

  // Process
  {
    pattern: /process\.env\./g,
    replacement: "import.meta.env.",
    description: "Replace process.env with import.meta.env",
  },
  {
    pattern: /process\.cwd\(\)/g,
    replacement: "import.meta.dir",
    description: "Replace process.cwd() with import.meta.dir",
  },

  // URL
  {
    pattern: /import url from ["']url["'];/g,
    replacement:
      '// Use URL and URLSearchParams globals instead of "url" module',
    description: "Replace url module with URL globals",
  },

  // Console
  {
    pattern: /console\.(log|error|warn|info)/g,
    replacement: "relinka",
    description: "Replace console.* with relinka",
  },

  // Buffer
  {
    pattern: /import \{ Buffer \} from ["']buffer["'];/g,
    replacement: "// Buffer is available globally",
    description: "Remove Buffer import (globally available)",
  },

  // Events
  {
    pattern: /import \{ EventEmitter \} from ["']events["'];/g,
    replacement: 'import { Emitter } from "mitt";',
    description: "Replace EventEmitter with mitt",
  },
];

export async function replaceWithModern(projectPath: string) {
  relinka("info", "Starting modern replacements...");

  const files = await glob("**/*.{js,ts,tsx}", {
    cwd: projectPath,
    absolute: true,
    ignore: [
      "node_modules/**",
      "dist/**",
      ".next/**",
      "build/**",
      "coverage/**",
    ],
  });

  let totalReplacements = 0;
  const replacementsByFile = new Map<string, Set<string>>();

  for (const file of files) {
    let content = await fs.readFile(file, "utf8");
    let fileModified = false;
    const fileReplacements = new Set<string>();

    for (const { pattern, replacement, description } of MODERN_REPLACEMENTS) {
      const originalContent = content;
      content = content.replace(pattern, replacement);

      if (content !== originalContent) {
        fileModified = true;
        totalReplacements++;
        fileReplacements.add(description);
      }
    }

    if (fileModified) {
      await fs.writeFile(file, content, "utf8");
      replacementsByFile.set(file, fileReplacements);
      relinka("success", `Updated ${file}`);
    }
  }

  // Summary
  if (totalReplacements > 0) {
    relinka("info", "\nReplacement Summary:");
    for (const [file, replacements] of replacementsByFile.entries()) {
      relinka("info", `\n${path.relative(projectPath, file)}:`);
      for (const description of replacements) {
        relinka("info", `  - ${description}`);
      }
    }
    relinka("success", `\nCompleted ${totalReplacements} replacements.`);
  } else {
    relinka("info", "No replacements needed.");
  }
}
