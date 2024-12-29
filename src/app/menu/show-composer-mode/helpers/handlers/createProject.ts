import fs from "fs-extra";
import path from "pathe";

import { PKG_ROOT } from "~/consts.js";
import {
  selectAppFile,
  selectIndexFile,
  selectLayoutFile,
  selectPageFile,
} from "~/app/menu/show-composer-mode/helpers/handlers/selectBoilerplate.js";
import { getUserPkgManager } from "~/app/menu/show-composer-mode/helpers/utils/getUserPkgManager.js";

import type { DatabaseProvider, PkgInstallerMap } from "../installers/index.js";

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
  installPackages({
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

  return projectDir;
};
