import fs from "fs-extra";
import path from "pathe";

import { relinka } from "~/utils/console.js";

async function generateTypeDefinitions(content: string): Promise<string> {
  let result = content;

  // Add type annotations to function parameters
  result = result.replace(
    /function\s+(\w+)\s*\((.*?)\)/g,
    (_, name, params) => {
      const typedParams = params
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `${p}: any`);
      return `function ${name}(${typedParams.join(", ")})`;
    },
  );

  // Add return types to functions
  result = result.replace(
    /function\s+(\w+)\s*\((.*?)\)\s*{/g,
    (match) => `${match}: any`,
  );

  // Add types to variables
  result = result.replace(
    /(const|let|var)\s+(\w+)\s*=/g,
    (_, dec, name) => `${dec} ${name}: any =`,
  );

  // Add types to class properties
  result = result.replace(/class\s+(\w+)\s*{([^}]+)}/g, (_, name, body) => {
    const typedBody = body.replace(
      /(\w+)\s*=/g,
      (__, propName) => `${propName}: any =`,
    );
    return `class ${name} {${typedBody}}`;
  });

  // Add interface for object literals
  result = result.replace(
    /const\s+(\w+)\s*=\s*{([^}]+)}/g,
    (_, name, props) => {
      const interfaceProps = props
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
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
      const tsContent = await generateTypeDefinitions(content);

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

    // Add TypeScript dependencies
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      typescript: "latest",
      "@types/node": "latest",
    };

    // Add TypeScript scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      build: "tsc",
      "type-check": "tsc --noEmit",
    };

    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    relinka("success", "Updated package.json with TypeScript configuration");
  }
}
