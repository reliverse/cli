import { consola } from "consola";

import { buildRelivator } from "./buildRelivator";
import { cloneLibraryTool } from "./cloneLibraryTool";
import { installRelivatorTemplate } from "./justInstallRelivator";

export async function createProject() {
  const option = await consola.prompt(
    // eslint-disable-next-line @stylistic/max-len
    "Reliverse will allow you to do many things in the future. It's already able to create new projects and make some codebase modifications. How do you want to proceed?",
    {
      options: [
        "1. I want to build my own Relivator from scratch",
        "2. I just want to install the Relivator template",
        "3. I want to clone a library/tool from GitHub",
      ] as const,
      type: "select",
    },
  );

  if (option === "1. I want to build my own Relivator from scratch") {
    await buildRelivator();
  } else if (option === "2. I just want to install the Relivator template") {
    await installRelivatorTemplate();
  } else if (option === "3. I want to clone a library/tool from GitHub") {
    await cloneLibraryTool();
  } else {
    consola.error("Invalid option selected. Exiting.");
  }
}
