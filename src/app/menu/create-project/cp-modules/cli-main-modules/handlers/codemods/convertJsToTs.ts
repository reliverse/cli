import fs from "fs-extra";
import path from "pathe";

import { relinka } from "~/app/menu/create-project/cp-modules/cli-main-modules/handlers/logger.js";

function generateTypeDefinitions(content: string): string {
  let result = content;

  // Inject type annotations to function parameters
  result = result.replace(
    /function\s+(\w+)\s*\((.*?)\)/g,
    (_: string, name: string, params: string) => {
      const typedParams = params
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean)
        .map((p: string) => `${p}: any`);
      return `function ${name}(${typedParams.join(", ")})`;
    },
  );

  // Inject return types to functions
  result = result.replace(
    /function\s+(\w+)\s*\((.*?)\)\s*{/g,
    (match: string) => `${match}: any`,
  );

  // Inject types to variables
  result = result.replace(
    /(const|let|var)\s+(\w+)\s*=/g,
    (_: string, dec: string, name: string) => `${dec} ${name}: any =`,
  );

  // Inject types to class properties
  result = result.replace(
    /class\s+(\w+)\s*{([^}]+)}/g,
    (_: string, name: string, body: string) => {
      const typedBody = body.replace(
        /(\w+)\s*=/g,
        (_: string, propName: string) => `${propName}: any =`,
      );
      return `class ${name} {${typedBody}}`;
    },
  );

  // Inject interface for object literals
  result = result.replace(
    /const\s+(\w+)\s*=\s*{([^}]+)}/g,
    (_: string, name: string, props: string) => {
      const interfaceProps = props
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean)
        .map((p: string) => {
          const [propName] = p.split(":");
          return `  ${propName}: any;`;
        });
      return `interface ${name}Type {
${interfaceProps.join("\n")}
}
const ${name}: ${name}Type = {${props}}`;
    },
  );

  return result;
}

export async function convertJsToTs(cwd: string) {
  const jsFiles = await fs.readdir(cwd, { recursive: true });
  const jsFilePaths = jsFiles
    .filter((file) => typeof file === "string")
    .filter(
      (file) =>
        file.endsWith(".js") &&
        !file.endsWith(".config.js") &&
        !file.endsWith(".test.js") &&
        !file.includes("node_modules"),
    );

  for (const jsFile of jsFilePaths) {
    const fullPath = path.join(cwd, jsFile);
    const tsFile = jsFile.replace(/\.js$/, ".ts");
    const tsPath = path.join(cwd, tsFile);

    try {
      // Read and convert content
      const content = await fs.readFile(fullPath, "utf-8");
      const tsContent = generateTypeDefinitions(content);

      // Write TypeScript file
      await fs.writeFile(tsPath, tsContent);
      relinka("success", `Converted ${jsFile} to TypeScript`);

      // Remove JavaScript file
      await fs.remove(fullPath);
    } catch (error) {
      relinka(
        "error",
        `Failed to convert ${jsFile}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Create tsconfig.json if it doesn't exist
  const tsconfigPath = path.join(cwd, "tsconfig.json");
  if (!(await fs.pathExists(tsconfigPath))) {
    const tsconfig = {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "node",
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: "dist",
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist"],
    };
    await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
    relinka("success", "Created tsconfig.json");
  }

  // Update package.json
  const packageJsonPath = path.join(cwd, "package.json");
  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);

    // Inject TypeScript dependencies
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      typescript: "latest",
      "@types/node": "latest",
    };

    // Inject TypeScript scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      build: "tsc",
      "type-check": "tsc --noEmit",
    };

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    relinka("success", "Updated package.json with TypeScript configuration");
  }
}
