import fs from "fs-extra";
import path from "pathe";

import type { MonorepoType } from "~/types.js";

import { relinka } from "~/utils/console.js";

const MONOREPO_CONFIGS = {
  turborepo: {
    "turbo.json": {
      $schema: "https://turbo.build/schema.json",
      globalDependencies: ["**/.env.*local"],
      pipeline: {
        build: {
          dependsOn: ["^build"],
          outputs: ["dist/**", ".next/**", "!.next/cache/**"],
        },
        lint: {},
        dev: {
          cache: false,
          persistent: true,
        },
      },
    },
  },
  moonrepo: {
    "moon.yml": `
workspace:
  extends: 'typescript'
  projects:
    - 'apps/*'
    - 'packages/*'
`,
  },
  "bun-workspaces": {
    "package.json": {
      workspaces: ["apps/*", "packages/*"],
    },
  },
  "pnpm-workspaces": {
    "pnpm-workspace.yaml": `
packages:
  - 'apps/*'
  - 'packages/*'
`,
  },
};

export async function convertToMonorepo(
  projectPath: string,
  type: MonorepoType,
  packages: string[] = [],
  sharedPackages: string[] = [],
) {
  relinka("info", `Converting to ${type} monorepo in ${projectPath}`);

  // Create monorepo structure
  await fs.mkdir(path.join(projectPath, "apps"), { recursive: true });
  await fs.mkdir(path.join(projectPath, "packages"), { recursive: true });

  // Move current project to apps/web if it's not already in a monorepo structure
  const packageJson = await fs.readJSON(path.join(projectPath, "package.json"));
  if (!packageJson.workspaces) {
    await fs.move(
      path.join(projectPath, "src"),
      path.join(projectPath, "apps", "web", "src"),
      { overwrite: true },
    );
    await fs.move(
      path.join(projectPath, "package.json"),
      path.join(projectPath, "apps", "web", "package.json"),
      { overwrite: true },
    );
    // Move other common files
    const commonFiles = [
      "tsconfig.json",
      "eslint.config.js",
      ".prettierrc",
      "next.config.js",
      "postcss.config.js",
      "tailwind.config.js",
    ];
    for (const file of commonFiles) {
      if (await fs.pathExists(path.join(projectPath, file))) {
        await fs.move(
          path.join(projectPath, file),
          path.join(projectPath, "apps", "web", file),
          { overwrite: true },
        );
      }
    }
  }

  // Create root package.json if not exists
  const rootPackageJson = {
    name: `${packageJson.name}-monorepo`,
    private: true,
    scripts: {
      build:
        type === "turborepo"
          ? "turbo run build"
          : "bun run --cwd apps/web build",
      dev:
        type === "turborepo" ? "turbo run dev" : "bun run --cwd apps/web dev",
      lint:
        type === "turborepo" ? "turbo run lint" : "bun run --cwd apps/web lint",
    },
  };
  await fs.writeJSON(path.join(projectPath, "package.json"), rootPackageJson, {
    spaces: 2,
  });

  // Create monorepo config files
  const configs = MONOREPO_CONFIGS[type];
  for (const [filename, content] of Object.entries(configs)) {
    const filePath = path.join(projectPath, filename);
    if (typeof content === "string") {
      await fs.writeFile(filePath, content);
    } else {
      await fs.writeJSON(filePath, content, { spaces: 2 });
    }
  }

  // Create additional packages
  for (const pkg of packages) {
    const pkgPath = path.join(projectPath, "apps", pkg);
    await fs.mkdir(pkgPath, { recursive: true });
    await fs.writeJSON(
      path.join(pkgPath, "package.json"),
      {
        name: `@${packageJson.name}/${pkg}`,
        version: "0.0.0",
        private: true,
      },
      { spaces: 2 },
    );
  }

  // Create shared packages
  for (const pkg of sharedPackages) {
    const pkgPath = path.join(projectPath, "packages", pkg);
    await fs.mkdir(pkgPath, { recursive: true });
    await fs.writeJSON(
      path.join(pkgPath, "package.json"),
      {
        name: `@${packageJson.name}/${pkg}`,
        version: "0.0.0",
        main: "./src/index.ts",
        types: "./src/index.ts",
        private: true,
      },
      { spaces: 2 },
    );
    // Create basic TypeScript setup
    await fs.mkdir(path.join(pkgPath, "src"), { recursive: true });
    await fs.writeFile(path.join(pkgPath, "src", "index.ts"), "export {};\n");
  }

  // Create root tsconfig.json with references
  const rootTsConfig = {
    compilerOptions: {
      module: "esnext",
      moduleResolution: "bundler",
      target: "esnext",
      lib: ["dom", "dom.iterable", "esnext"],
      strict: true,
      skipLibCheck: true,
      jsx: "preserve",
    },
    references: [
      { path: "apps/web" },
      ...packages.map((pkg) => ({ path: `apps/${pkg}` })),
      ...sharedPackages.map((pkg) => ({ path: `packages/${pkg}` })),
    ],
  };
  await fs.writeJSON(path.join(projectPath, "tsconfig.json"), rootTsConfig, {
    spaces: 2,
  });

  relinka("success", `Converted to ${type} monorepo`);
}
