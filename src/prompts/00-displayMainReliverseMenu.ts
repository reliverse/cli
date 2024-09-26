import { consola } from "consola";

import { buildRelivatorTemplateMenu } from "~/prompts/01-buildRelivatorTemplateMenu";
import { buildAnotherTemplateMenu } from "~/prompts/02-buildAnotherTemplateMenu";
import { installLibrariesMenu } from "~/prompts/03-installLibrariesMenu";

export async function displayMainReliverseMenu() {
  const option = await consola.prompt(
    // eslint-disable-next-line @stylistic/max-len
    "Reliverse will allow you to do many things in the future. It's already able to create new projects and make some codebase modifications. How do you want to proceed?",
    {
      options: [
        "1. I want to build my own Relivator from scratch",
        "2. I just want to install the Relivator template",
        "3. I want to clone some library/tool from GitHub",
      ] as const,
      type: "select",
    },
  );

  if (option === "1. I want to build my own Relivator from scratch") {
    await buildRelivatorTemplateMenu(); // 01-buildRelivatorTemplateMenu
  } else if (option === "2. I just want to install the Relivator template") {
    await buildAnotherTemplateMenu(); // 02-buildAnotherTemplateMenu.ts
  } else if (option === "3. I want to clone some library/tool from GitHub") {
    await installLibrariesMenu(); // 03-installLibrariesMenu.ts
  } else {
    consola.error("Invalid option selected. Exiting.");
  }
}
