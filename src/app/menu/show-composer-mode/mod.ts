import { execa } from "execa";
import fs from "fs-extra";
import path from "pathe";

import { createProject } from "./helpers/createProject.js";
import { initializeGit } from "./helpers/git.js";
import { installDependencies } from "./helpers/installDependencies.js";
import { logNextSteps } from "./helpers/logNextSteps.js";
import { setImportAlias } from "./helpers/setImportAlias.js";
import { runComposerMode } from "./impl.js";
import { buildPkgInstallerMap, type CliResults } from "./opts.js";
import { getUserPkgManager } from "./utils/getUserPkgManager.js";
import { parseNameAndPath } from "./utils/parseNameAndPath.js";
import { renderTitle } from "./utils/renderTitle.js";
import {
  getNpmVersion,
  renderVersionWarning,
} from "./utils/renderVersionWarning.js";

export async function showComposerMode(cliResults: CliResults) {
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
  } = await runComposerMode(cliResults);

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
