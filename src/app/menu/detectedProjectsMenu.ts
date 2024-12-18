import { selectPrompt, inputPrompt } from "@reliverse/prompts";
import pc from "picocolors";

import type { DetectedProject } from "~/types.js";

import { relinka } from "~/utils/console.js";
import { createGitCommit, pushGitCommits } from "~/utils/git.js";

export async function showDetectedProjectsMenu(
  projects: DetectedProject[],
): Promise<void> {
  const projectOptions = projects.map((project) => ({
    label: project.name,
    value: project.path,
    hint: pc.dim(
      `${project.gitStatus?.uncommittedChanges || 0} uncommitted changes, ${project.gitStatus?.unpushedCommits || 0} unpushed commits`,
    ),
  }));

  const selectedPath = await selectPrompt({
    title: "Select a project to manage",
    options: [...projectOptions, { label: "Exit", value: "exit" }],
  });

  if (selectedPath === "exit") {
    return;
  }

  const selectedProject = projects.find((p) => p.path === selectedPath);
  if (!selectedProject) {
    relinka("error", "Project not found");
    return;
  }

  const action = await selectPrompt({
    title: `Managing ${selectedProject.name}`,
    options: [
      {
        label: "Create commit",
        value: "commit",
      },
      ...(selectedProject.gitStatus?.unpushedCommits
        ? [
            {
              label: `Push ${selectedProject.gitStatus.unpushedCommits} commits`,
              value: "push",
            },
          ]
        : []),
      { label: "Exit", value: "exit" },
    ],
  });

  if (action === "commit") {
    const message = await inputPrompt({
      title: "Enter commit message",
    });

    if (message) {
      const success = await createGitCommit({
        message,
        projectPath: selectedProject.path,
      });

      if (success) {
        relinka("success", "Commit created successfully");
      }
    }
  } else if (action === "push") {
    const success = await pushGitCommits(selectedProject.path);
    if (success) {
      relinka("success", "Commits pushed successfully");
    }
  }
}
