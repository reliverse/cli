import { relinka } from "@reliverse/prompts";
import fs from "fs-extra";
import path from "pathe";
import { defineTSConfig, writeTSConfig } from "pkg-types";

/**
 * Creates a minimal tsconfig.json file for a new project
 * @param projectPath Path where the tsconfig.json should be created
 */
export async function createTSConfig(
  projectPath: string,
  isLib: boolean,
): Promise<void> {
  // Define the tsconfig.json content
  const tsconfig = defineTSConfig({
    compilerOptions: {
      // Base Options
      esModuleInterop: true,
      skipLibCheck: true,
      target: "es2022",
      allowJs: true,
      resolveJsonModule: true,
      moduleDetection: "force",
      isolatedModules: true,
      verbatimModuleSyntax: true,

      // Strictness
      strict: true,
      noUncheckedIndexedAccess: true,
      noImplicitOverride: true,

      // Specific
      ...(isLib
        ? {
            // Libs
            lib: ["es2022"],
          }
        : {
            // Apps
            module: "preserve",
            noEmit: true,
            lib: ["es2022", "dom", "dom.iterable"],
          }),
    },
    ...(isLib
      ? {
          // Libs
          include: ["**/*.ts"],
        }
      : {
          // Apps
          include: ["**/*.ts", "**/*.tsx"],
        }),
    exclude: ["node_modules"],
  });

  // Write the tsconfig.json file
  const tsconfigPath = path.join(projectPath, "tsconfig.json");
  await writeTSConfig(tsconfigPath, tsconfig);

  // Format the tsconfig.json file with proper indentation
  const content = await fs.readFile(tsconfigPath, "utf-8");
  const formatted = JSON.stringify(JSON.parse(content), null, 2);
  await fs.writeFile(tsconfigPath, formatted, "utf-8");

  relinka(
    "info",
    `Created tsconfig.json with ${isLib ? "library" : "application"} configuration`,
  );
}
