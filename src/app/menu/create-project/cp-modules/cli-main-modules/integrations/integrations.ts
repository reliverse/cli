import { execa } from "execa";
import fs from "fs-extra";
import path from "pathe";

import type { IntegrationConfig, RemovalConfig } from "~/types.js";

import { relinka } from "~/utils/loggerRelinka.js";

enum PackageManager {
  Bun = "bun",
  Pnpm = "pnpm",
  Yarn = "yarn",
  Npm = "npm",
}

async function detectPackageManager(cwd: string): Promise<PackageManager> {
  // Check for lockfiles in order of preference
  if (await fs.pathExists(path.join(cwd, "bun.lockb"))) {
    return PackageManager.Bun;
  }
  if (await fs.pathExists(path.join(cwd, "pnpm-lock.yaml"))) {
    return PackageManager.Pnpm;
  }
  if (await fs.pathExists(path.join(cwd, "yarn.lock"))) {
    return PackageManager.Yarn;
  }
  return PackageManager.Npm;
}

async function installDependencies(
  cwd: string,
  dependencies: string[],
  isDev: boolean,
) {
  const pm = await detectPackageManager(cwd);
  const installCmd = pm === PackageManager.Npm ? "install" : "add";
  const args = [installCmd, ...dependencies];
  if (isDev) {
    args.push(pm === PackageManager.Npm ? "--save-dev" : "-D");
  }

  try {
    await execa(pm, args, { cwd });
    relinka(
      "success",
      `Installed ${isDev ? "dev " : ""}dependencies with ${pm}`,
    );
  } catch (error) {
    relinka(
      "error",
      `Failed to install dependencies: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

async function updatePackageJson(cwd: string, config: IntegrationConfig) {
  const pkgPath = path.join(cwd, "package.json");
  if (!(await fs.pathExists(pkgPath))) {
    throw new Error("package.json not found");
  }

  try {
    const pkg = await fs.readJson(pkgPath);

    // Inject scripts
    if (config.scripts) {
      pkg.scripts = { ...pkg.scripts, ...config.scripts };
    }

    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
  } catch (error) {
    relinka(
      "error",
      `Failed to update package.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

async function updateEnvFile(cwd: string, envVars: Record<string, string>) {
  const envPath = path.join(cwd, ".env");
  const envExamplePath = path.join(cwd, ".env.example");

  try {
    // Update or create .env
    let envContent = (await fs.pathExists(envPath))
      ? await fs.readFile(envPath, "utf-8")
      : "";
    let envExampleContent = (await fs.pathExists(envExamplePath))
      ? await fs.readFile(envExamplePath, "utf-8")
      : "";

    for (const [key, value] of Object.entries(envVars)) {
      // Inject to .env if not exists
      if (!envContent.includes(key)) {
        envContent += `\\n${key}=${value}`;
      }
      // Inject to .env.example if not exists
      if (!envExampleContent.includes(key)) {
        envExampleContent += `\\n${key}=your_${key.toLowerCase()}_here`;
      }
    }

    await fs.writeFile(envPath, envContent.trim());
    await fs.writeFile(envExamplePath, envExampleContent.trim());
  } catch (error) {
    relinka(
      "error",
      `Failed to update env files: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

export async function installIntegration(
  cwd: string,
  config: IntegrationConfig,
  isDev: boolean,
) {
  try {
    relinka("info", `Installing ${config.name}...`);

    // Create necessary files
    for (const file of config.files) {
      const filePath = path.join(cwd, file.path);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content);
      relinka("success", `Created ${file.path}`);
    }

    // Install dependencies
    if (config.dependencies.length > 0) {
      await installDependencies(cwd, config.dependencies, isDev);
    }

    // Install dev dependencies
    if (config.devDependencies?.length) {
      await installDependencies(cwd, config.devDependencies, isDev);
    }

    // Update package.json scripts
    if (config.scripts) {
      await updatePackageJson(cwd, config);
    }

    // Update env files
    if (config.envVars) {
      await updateEnvFile(cwd, config.envVars);
    }

    // Run post-install hook
    if (config.postInstall) {
      await config.postInstall(cwd);
    }

    relinka("success", `Successfully installed ${config.name}`);
  } catch (error) {
    relinka(
      "error",
      `Failed to install ${config.name}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

export async function removeIntegration(cwd: string, config: RemovalConfig) {
  try {
    relinka("info", `Removing ${config.name}...`);

    const packageJsonPath = path.join(cwd, "package.json");
    const pkg = await fs.readJson(packageJsonPath);

    // Remove dependencies
    config.dependencies.forEach((dep) => delete pkg.dependencies?.[dep]);
    config.devDependencies.forEach((dep) => delete pkg.devDependencies?.[dep]);

    // Remove scripts
    config.scripts.forEach((script) => delete pkg.scripts?.[script]);

    // Update package.json
    await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });

    // Remove files
    for (const file of config.files) {
      const filePath = path.join(cwd, file);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        relinka("success", `Removed ${file}`);
      }
    }

    // Remove directories
    for (const dir of config.directories) {
      const dirPath = path.join(cwd, dir);
      if (await fs.pathExists(dirPath)) {
        await fs.remove(dirPath);
        relinka("success", `Removed ${dir}`);
      }
    }

    // Remove env vars
    const envPath = path.join(cwd, ".env");
    const envExamplePath = path.join(cwd, ".env.example");

    if (await fs.pathExists(envPath)) {
      let envContent = await fs.readFile(envPath, "utf-8");
      config.envVars.forEach((key) => {
        envContent = envContent.replace(new RegExp(`^${key}=.*$\\n?`, "m"), "");
      });
      await fs.writeFile(envPath, envContent.trim());
    }

    if (await fs.pathExists(envExamplePath)) {
      let envExampleContent = await fs.readFile(envExamplePath, "utf-8");
      config.envVars.forEach((key) => {
        envExampleContent = envExampleContent.replace(
          new RegExp(`^${key}=.*$\\n?`, "m"),
          "",
        );
      });
      await fs.writeFile(envExamplePath, envExampleContent.trim());
    }

    relinka("success", `Successfully removed ${config.name}`);
  } catch (error) {
    relinka(
      "error",
      `Failed to remove ${config.name}: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}
