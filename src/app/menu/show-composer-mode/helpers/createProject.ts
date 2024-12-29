import fs from "fs-extra";
import { globby } from "globby";
import path from "pathe";

import { PKG_ROOT } from "~/app/db/constants.js";
import {
  selectAppFile,
  selectIndexFile,
  selectLayoutFile,
  selectPageFile,
} from "~/app/menu/show-composer-mode/helpers/selectBoilerplate.js";
import { getUserPkgManager } from "~/app/menu/show-composer-mode/utils/getUserPkgManager.js";

import type { DatabaseProvider, PkgInstallerMap } from "../opts.js";

import { installPackages } from "./installPackages.js";
import { scaffoldProject } from "./scaffoldProject.js";

type CreateProjectOptions = {
  projectName: string;
  packages: PkgInstallerMap;
  scopedAppName: string;
  noInstall: boolean;
  importAlias: string;
  framework: boolean;
  databaseProvider: DatabaseProvider;
};

/**
 * Renames all .tsx files to -tsx.txt in the specified directory and its subdirectories.
 * @param dir - The directory to process.
 */
async function renameTsxFiles(dir: string): Promise<void> {
  try {
    const files = await globby("**/*.tsx", {
      cwd: dir,
      absolute: true,
    });

    for (const filePath of files) {
      const newPath = filePath.replace(/\.tsx$/, "-tsx.txt");
      await fs.rename(filePath, newPath);
    }
  } catch (error) {
    console.error("Error renaming .tsx files:", error);
  }
}

export const createProject = async ({
  projectName,
  scopedAppName,
  packages,
  noInstall,
  framework,
  databaseProvider,
}: CreateProjectOptions) => {
  const pkgManager = getUserPkgManager();
  const projectDir = path.resolve(process.cwd(), projectName);

  // Bootstraps the base Next.js application
  await scaffoldProject({
    projectName,
    projectDir,
    pkgManager,
    scopedAppName,
    noInstall,
    framework,
    databaseProvider,
  });

  // Install the selected packages
  await installPackages({
    projectName,
    scopedAppName,
    projectDir,
    pkgManager,
    packages,
    noInstall,
    framework,
    databaseProvider,
  });

  // Select necessary _app,index / layout,page files
  if (framework) {
    // Replace next.config
    fs.copyFileSync(
      path.join(PKG_ROOT, "template/extras/config/next-config-appdir.js"),
      path.join(projectDir, "next.config.js"),
    );

    selectLayoutFile({ projectDir, packages });
    selectPageFile({ projectDir, packages });
  } else {
    selectAppFile({ projectDir, packages });
    selectIndexFile({ projectDir, packages });
  }

  // If no tailwind, select use css modules
  if (!packages.tailwind.inUse) {
    const indexModuleCss = path.join(
      PKG_ROOT,
      "template/extras/src/index.module.css",
    );
    const indexModuleCssDest = path.join(
      projectDir,
      "src",
      framework ? "app" : "pages",
      "index.module.css",
    );
    fs.copyFileSync(indexModuleCss, indexModuleCssDest);
  }

  // Rename all .tsx files to -tsx.txt
  await renameTsxFiles(projectDir);

  return projectDir;
};
