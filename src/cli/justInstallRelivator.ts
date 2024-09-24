import { consola } from "consola";

import {
  appName,
  chooseTemplate,
  confirmation,
  dependencies,
  gitInitialization,
} from "~/utils/prompt";

import { installTemplate } from "./installTemplate";

export async function installRelivatorTemplate() {
  const name = await appName();
  const template = await chooseTemplate();
  const gitOption = await gitInitialization();
  const deps = await dependencies("justInstallRelivator");
  const confirmed = await confirmation();

  if (!confirmed) {
    consola.info("Project creation process was canceled.");

    return;
  }

  await installTemplate(name, template, deps, gitOption);
}
