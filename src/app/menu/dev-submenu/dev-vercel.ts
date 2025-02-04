import type { VercelCore } from "@vercel/sdk/core.js";
import type { GetProjectsResponseBody } from "@vercel/sdk/models/getprojectsop.js";

import {
  multiselectPrompt,
  selectPrompt,
  confirmPrompt,
  getTerminalHeight,
} from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { projectsDeleteProject } from "@vercel/sdk/funcs/projectsDeleteProject.js";
import { projectsGetProjects } from "@vercel/sdk/funcs/projectsGetProjects.js";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { withRateLimit } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/vercel/vercel-api.js";
import { createVercelInstance } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/vercel/vercel-client.js";
import { ensureVercelToken } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/vercel/vercel-create.js";
import { getPrimaryVercelTeam } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/vercel/vercel-team.js";

export async function openVercelTools(memory: ReliverseMemory) {
  let vercelInstance: VercelCore | null = null;
  let hasVercelToken = false;
  let vercelToken = "";

  if (memory.vercelKey && memory.vercelKey !== "") {
    vercelToken = memory.vercelKey;
    hasVercelToken = true;
  }

  if (!hasVercelToken) {
    const result = await ensureVercelToken(true, memory);
    if (!result)
      throw new Error(
        "Something went wrong. Vercel token not found. Please try again or notify the Reliverse CLI developers if the problem persists.",
      );
    const [token, instance] = result;
    vercelToken = token;
    vercelInstance = instance;
  } else {
    vercelInstance = createVercelInstance(vercelToken);
  }

  const choice = await selectPrompt({
    title: "Vercel Tools",
    options: [{ label: "Delete projects", value: "delete-projects" }],
  });

  const hSize = getTerminalHeight();
  let limit = "10";
  if (hSize > 15) limit = "15";
  else if (hSize > 20) limit = "20";
  else if (hSize > 30) limit = "30";
  else if (hSize > 40) limit = "40";
  else if (hSize > 50) limit = "50";

  if (choice === "delete-projects") {
    await deleteVercelProjects(vercelInstance, memory, limit, hSize);
  }
}

async function getVercelProjects(
  instance: VercelCore,
  limit: string,
  team?: { id: string; slug: string },
): Promise<GetProjectsResponseBody["projects"]> {
  const res = await withRateLimit(async () => {
    return await projectsGetProjects(instance, {
      teamId: team?.id,
      slug: team?.slug,
      limit: limit,
    });
  });

  if (!res.ok) {
    throw res.error;
  }

  return res.value.projects;
}

async function deleteVercelProjects(
  instance: VercelCore,
  memory: ReliverseMemory,
  limit: string,
  hSize: number,
) {
  const team = await getPrimaryVercelTeam(instance, memory);
  const allProjects = await getVercelProjects(instance, limit, team);

  const protectedNames = [
    "relivator",
    "reliverse",
    "relidocs",
    "versator",
    "bleverse",
    "mfpiano",
    "blefnk",
  ];
  const existingProtectedProjects = allProjects
    .filter((p) => protectedNames.includes(p.name.toLowerCase()))
    .map((p) => p.name.toLowerCase());

  const projects = allProjects.filter(
    (project) =>
      !existingProtectedProjects.includes(project.name.toLowerCase()),
  );

  // Create a map from project ID to project name
  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  const info = `If you do not see some projects, restart the CLI with a higher terminal height (current: ${hSize})`;

  const projectsToDelete = await multiselectPrompt({
    title: "Delete Vercel projects (ctrl+c to exit)",
    content:
      existingProtectedProjects.length > 0
        ? `${info}\nIntentionally excluded projects: ${existingProtectedProjects.join(
            ", ",
          )}`
        : info,
    // Prepend each label with its index (starting at 1)
    options: projects.map((project, index) => ({
      label: `${index + 1}. ${project.name}`,
      value: project.id,
    })),
  });

  if (projectsToDelete.length === 0) {
    relinka("info", "No projects to delete.");
    return;
  }

  const selectedNames = projectsToDelete
    .map((id) => projectNames.get(id) ?? id)
    .join(", ");

  const confirmed = await confirmPrompt({
    title: "Are you sure you want to delete these projects?",
    content: selectedNames,
    defaultValue: false,
  });

  if (!confirmed) {
    relinka("info", "Operation cancelled.");
    return;
  }

  for (const projectId of projectsToDelete) {
    const projectName = projectNames.get(projectId) ?? projectId;
    try {
      relinka("info-verbose", `Deleting project ${projectName}...`);
      const res = await withRateLimit(async () => {
        return await projectsDeleteProject(instance, {
          idOrName: projectId,
          teamId: team?.id,
          slug: team?.slug,
        });
      });

      if (!res.ok) {
        throw res.error;
      }

      relinka("success", `Successfully deleted project ${projectName}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      relinka(
        "error",
        `Failed to delete project ${projectName}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
