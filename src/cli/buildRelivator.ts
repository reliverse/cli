import { consola } from "consola";
import path from "node:path";

import { checkAndDownloadFiles } from "~/relimter/checkAndDownloadFiles";
import { getCurrentWorkingDirectory } from "~/utils/fs";
import {
  appName,
  confirmation,
  dependencies,
  gitInitialization,
} from "~/utils/prompt";
import { validate } from "~/utils/validate";

import { installTemplate } from "./installTemplate";

const args = process.argv.slice(2);
const isDevelopment = args.includes("--dev");

export async function buildRelivator() {
  const cwd = getCurrentWorkingDirectory();

  consola.info(
    // eslint-disable-next-line @stylistic/max-len
    "'blefnk/relivator' template is a highly modified 'sadmann7/skateshop' template, which can be a good starting point to build your own Relivator as well.",
  );
  consola.info("1. You can choose the `sadmann7/skateshop` template.");
  consola.info(
    "2. Or install just a very clean Next.js `blefnk/minext` template.",
  );
  consola.info(
    "3. Or provide a GitHub URL for another template of your choice.",
  );
  consola.info(
    "In any of the choices, you can choose which actions to apply to your project.",
  );

  const templateOption = await consola.prompt(
    "Select a template or provide a custom GitHub URL:",
    {
      options: [
        "1. Use skateshop template (to have full Relivator version)",
        "2. Use minext template (to have minimal Relivator version)",
        "3. Provide custom GitHub URL (at your own risk)",
      ] as const,
      type: "select",
    },
  );

  let template = "";

  if (
    templateOption ===
    "1. Use skateshop template (to have full Relivator version)"
  ) {
    template = "sadmann7/skateshop";
  } else if (
    templateOption ===
    "2. Use minext template (to have minimal Relivator version)"
  ) {
    template = "blefnk/minext";
  } else if (
    templateOption === "3. Provide custom GitHub URL (at your own risk)"
  ) {
    const customTemplate = await consola.prompt(
      "Enter the GitHub repository link:",
      { type: "text" },
    );

    validate(customTemplate, "string", "Custom template selection canceled.");
    template = customTemplate;
  } else {
    consola.error("Invalid option selected. Exiting.");

    return;
  }

  const name = await appName();
  const gitOption = await gitInitialization();
  const deps = await dependencies("buildRelivator");
  const confirmed = await confirmation();

  if (!confirmed) {
    consola.info("Project creation process was canceled.");

    return;
  }

  await installTemplate(name, template, deps, gitOption);

  const targetDir = isDevelopment
    ? path.join(cwd, "..", name)
    : path.join(cwd, name);

  await checkAndDownloadFiles(targetDir);

  consola.info("");
  consola.success("🤘 Project created successfully.");
  consola.info(`👉 If you have VSCode installed, run: code ${targetDir}\n`);
}
