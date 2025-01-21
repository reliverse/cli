import type { VercelCore } from "@vercel/sdk/core.js";
import type { GetProjectsResponseBody } from "@vercel/sdk/models/getprojectsop.js";

import {
  multiselectPrompt,
  selectPrompt,
  confirmPrompt,
} from "@reliverse/prompts";
import { relinka } from "@reliverse/relinka";
import { projectsDeleteProject } from "@vercel/sdk/funcs/projectsDeleteProject.js";
import { projectsGetProjects } from "@vercel/sdk/funcs/projectsGetProjects.js";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { withRateLimit } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/vercel/vercel-api.js";
import { createVercelCoreInstance } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/vercel/vercel-instance.js";
import { getPrimaryVercelTeam } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/vercel/vercel-team.js";

export async function openVercelDevtools(
  memory: ReliverseMemory,
  vercelToken: string,
) {
  if (vercelToken === "") {
    relinka("error", "No Vercel token found. Please set it first.");
    return;
  }

  const vercelInstance = createVercelCoreInstance(vercelToken);

  const choice = await selectPrompt({
    title: "Vercel Devtools",
    options: [{ label: "Delete projects", value: "delete-projects" }],
  });

  if (choice === "delete-projects") {
    await deleteVercelProjects(vercelInstance, memory);
  }
}

async function getVercelProjects(
  vercelInstance: VercelCore,
  team?: { id: string; slug: string },
): Promise<GetProjectsResponseBody["projects"]> {
  const res = await withRateLimit(async () => {
    return await projectsGetProjects(vercelInstance, {
      teamId: team?.id,
      slug: team?.slug,
      limit: "30",
    });
  });

  if (!res.ok) {
    throw res.error;
  }

  return res.value.projects;
}

async function deleteVercelProjects(
  vercelInstance: VercelCore,
  memory: ReliverseMemory,
) {
  const team = await getPrimaryVercelTeam(vercelInstance, memory);
  const allProjects = await getVercelProjects(vercelInstance, team);

  const protectedNames = [
    "relivator",
    "reliverse",
    "relidocs",
    "versator",
    "blefnk",
  ];
  const existingProtectedProjects = allProjects
    .filter((p) => protectedNames.includes(p.name.toLowerCase()))
    .map((p) => p.name.toLowerCase());

  const projects = allProjects.filter(
    (project) =>
      !existingProtectedProjects.includes(project.name.toLowerCase()),
  );

  const projectNames = new Map(projects.map((p) => [p.id, p.name]));

  const projectsToDelete = await multiselectPrompt({
    title: "Delete Vercel projects (ctrl+c to exit)",
    content:
      existingProtectedProjects.length > 0
        ? `Excluded projects: ${existingProtectedProjects.join(", ")}`
        : "",
    options: projects.map((project) => ({
      label: project.name,
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
        return await projectsDeleteProject(vercelInstance, {
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
