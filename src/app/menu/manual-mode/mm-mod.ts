/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ParamsOmitReli } from "~/app/app-types.js";

import { getProjectContent } from "~/utils/reliverseConfig.js";

export async function showManualBuilderMenu(params: ParamsOmitReli) {
  // @ts-expect-error TODO: temp
  const { cwd, isDev, memory, config, multireli, skipPrompts } = params;

  const { requiredContent, optionalContent } = await getProjectContent(cwd);

  console.log(cwd, { requiredContent, optionalContent });

  // prompt to install deps
  const needsDepsInstall =
    !optionalContent.dirNodeModules && requiredContent.filePackageJson;
  if (needsDepsInstall) {
    console.log("node_modules missing prompt");
  }

  // if hasReliverse is false, but hasPackageJson is true, then show the menu
  if (!requiredContent.fileReliverse && requiredContent.filePackageJson) {
    console.log("show the menu");
  }

  // show the menu if all required content is true
  const existingProject = Object.values(requiredContent).every(
    (value) => value === true,
  );
  if (existingProject) {
    console.log("show the menu");
  }
}
