import { execa } from "execa";
import fs from "fs-extra";
import path from "pathe";

import { createProject } from "./helpers/handlers/createProject.js";
import { initializeGit } from "./helpers/handlers/git.js";
import { installDependencies } from "./helpers/handlers/installDependencies.js";
import { logNextSteps } from "./helpers/handlers/logNextSteps.js";
import { setImportAlias } from "./helpers/handlers/setImportAlias.js";
import { buildPkgInstallerMap } from "./helpers/installers/index.js";
import { getUserPkgManager } from "./helpers/utils/getUserPkgManager.js";
import { parseNameAndPath } from "./helpers/utils/parseNameAndPath.js";
import { renderTitle } from "./helpers/utils/renderTitle.js";
import {
  getNpmVersion,
  renderVersionWarning,
} from "./helpers/utils/renderVersionWarning.js";
import { runComposerMode } from "./impl.js";

export async function showComposerMode() {
  const npmVersion = await getNpmVersion();
  const pkgManager = getUserPkgManager();
  renderTitle();
  if (npmVersion) {
    renderVersionWarning(npmVersion);
  }

  const {
    appName,
    packages,
    flags: { noGit, noInstall, importAlias, framework },
    databaseProvider,
  } = await runComposerMode();

  const usePackages = buildPkgInstallerMap(packages, databaseProvider);

  // e.g. dir/@mono/app returns ["@mono/app", "dir/app"]
  const [scopedAppName, appDir] = parseNameAndPath(appName);

  const projectDir = await createProject({
    projectName: appDir,
    scopedAppName,
    packages: usePackages,
    databaseProvider,
    importAlias,
    noInstall,
    framework,
  });

  // Write name to package.json
  const pkgJson = fs.readJSONSync(path.join(projectDir, "package.json"));
  pkgJson.name = scopedAppName;

  // ? Bun doesn't support this field (yet)
  if (pkgManager !== "bun") {
    const { stdout } = await execa(pkgManager, ["-v"], {
      cwd: projectDir,
    });
    pkgJson.packageManager = `${pkgManager}@${stdout.trim()}`;
  }

  fs.writeJSONSync(path.join(projectDir, "package.json"), pkgJson, {
    spaces: 2,
  });

  // update import alias in any generated files if not using the default
  if (importAlias !== "~/") {
    setImportAlias(projectDir, importAlias);
  }

  if (!noInstall) {
    await installDependencies({ projectDir });
  }

  if (!noGit) {
    await initializeGit(projectDir);
  }

  await logNextSteps({
    projectName: appDir,
    packages: usePackages,
    framework,
    noInstall,
    projectDir,
    databaseProvider,
  });

  process.exit(0);
}
