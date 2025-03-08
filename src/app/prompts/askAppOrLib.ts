import { selectPrompt } from "@reliverse/prompts";

export async function askAppOrLib() {
  const projectType = await selectPrompt({
    title: "Are you planning to build a web app or a library?",
    content:
      "This will affect the config files to be generated. If you're not sure, choose 'Web app'.",
    options: [
      {
        label: "Web app",
        value: "app",
        hint: "Includes desktop and mobile apps",
      },
      {
        label: "Library",
        value: "lib",
        hint: "Includes CLIs and extensions",
      },
    ],
  });

  const isLib = projectType === "lib";
  return isLib;
}
