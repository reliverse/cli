import { downloadTemplate } from "giget";
import { consola } from "consola";

export async function setupProject() {
  const confirmed = await consola.prompt(
    "Press `Y` to install the `blefnk/relivator-nextjs-template` project.",
    {
      type: "confirm",
    },
  );

  if (typeof confirmed !== "boolean" || !confirmed) {
    process.exit(1);
  }

  try {
    const { source, dir } = await downloadTemplate(
      "github:blefnk/relivator-nextjs-template",
    );
    consola.success(`${source} successfully installed to ${dir}`);
    consola.info(
      "Next steps: run `cd relivator-nextjs-template && pnpm dev` to start the project.",
    );
  } catch (error) {
    consola.error(`Failed to download the template: ${String(error)}`);
    process.exit(1);
  }
}
