import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { relinka } from "./console.js";
import { getCurrentWorkingDirectory } from "./fs.js";

export const CHECKPOINT_STEPS = {
  NOT_STARTED: "not-started",
  INITIAL_SETUP: "initial-setup",
  BASIC_INFO: "basic-info",
  GIT_SETUP: "git-setup",
  TEMPLATE_DOWNLOAD: "template-download",
  I18N_SETUP: "i18n-setup",
  DEPENDENCIES_SETUP: "dependencies-setup",
  REPOSITORY_SETUP: "repository-setup",
  VERCEL_SETUP: "vercel-setup",
  DEPLOYMENT_SETUP: "deployment-setup",
  FINAL_STEPS: "final-steps",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type CheckpointStep =
  (typeof CHECKPOINT_STEPS)[keyof typeof CHECKPOINT_STEPS];

export type ProjectCheckpoint = {
  step: CheckpointStep;
  data: {
    username?: string;
    githubUsername?: string;
    vercelUsername?: string;
    appName?: string;
    domain?: string;
    deployService?: string;
    targetDir?: string;
    template?: string;
    shouldDeploy?: boolean;
    repoName?: string;
    repoExists?: boolean;
    shouldPushCommit?: boolean;
    isVercelInstalled?: boolean;
    i18nEnabled?: boolean;
    shouldInstallDependencies?: boolean;
    error?: string;
    lastStep?: CheckpointStep;
  };
};

export function isValidCheckpointStep(step: string): step is CheckpointStep {
  return Object.values(CHECKPOINT_STEPS).includes(step as CheckpointStep);
}

export function getNextStep(currentStep: CheckpointStep): CheckpointStep {
  const steps = Object.values(CHECKPOINT_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  return currentIndex < steps.length - 1
    ? (steps[currentIndex + 1] as CheckpointStep)
    : currentStep;
}

export function getPreviousStep(currentStep: CheckpointStep): CheckpointStep {
  const steps = Object.values(CHECKPOINT_STEPS);
  const currentIndex = steps.indexOf(currentStep);
  return currentIndex > 0
    ? (steps[currentIndex - 1] as CheckpointStep)
    : currentStep;
}

export async function saveCheckpoint(
  projectName: string,
  checkpoint: ProjectCheckpoint,
  isDev = false,
): Promise<void> {
  const baseDir = isDev
    ? path.join(getCurrentWorkingDirectory(), "tests-runtime", projectName)
    : path.join(os.homedir(), ".reliverse");
  const checkpointPath = isDev
    ? path.join(baseDir, ".reliverserules")
    : path.join(baseDir, "projects", projectName, ".reliverserules");

  try {
    await fs.ensureDir(path.dirname(checkpointPath));
    await fs.writeJSON(checkpointPath, checkpoint, { spaces: 2 });
    relinka("info-verbose", `Checkpoint saved: ${checkpoint.step}`);
  } catch (error) {
    relinka(
      "error",
      "Error saving checkpoint:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function readCheckpoint(
  projectName: string,
  isDev = false,
): Promise<ProjectCheckpoint | null> {
  const baseDir = isDev
    ? path.join(getCurrentWorkingDirectory(), "tests-runtime", projectName)
    : path.join(os.homedir(), ".reliverse");
  const checkpointPath = isDev
    ? path.join(baseDir, ".reliverserules")
    : path.join(baseDir, "projects", projectName, ".reliverserules");

  try {
    if (await fs.pathExists(checkpointPath)) {
      const checkpoint = await fs.readJSON(checkpointPath);
      if (isValidCheckpointStep(checkpoint.step)) {
        return checkpoint as ProjectCheckpoint;
      }
      relinka("error", `Invalid checkpoint step: ${checkpoint.step}`);
    }
  } catch (error) {
    relinka(
      "error",
      "Error reading checkpoint:",
      error instanceof Error ? error.message : String(error),
    );
  }
  return null;
}

export async function clearCheckpoint(
  projectName: string,
  isDev = false,
): Promise<void> {
  const baseDir = isDev
    ? path.join(getCurrentWorkingDirectory(), "tests-runtime", projectName)
    : path.join(os.homedir(), ".reliverse");
  const checkpointPath = isDev
    ? path.join(baseDir, ".reliverserules")
    : path.join(baseDir, "projects", projectName, ".reliverserules");

  try {
    if (await fs.pathExists(checkpointPath)) {
      await fs.remove(checkpointPath);
      relinka("info-verbose", "Checkpoint cleared");
    }
  } catch (error) {
    relinka(
      "error",
      "Error clearing checkpoint:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function findExistingCheckpoints(
  isDev = false,
): Promise<string[]> {
  const projectsDir = isDev
    ? path.join(getCurrentWorkingDirectory(), "tests-runtime")
    : path.join(os.homedir(), ".reliverse", "projects");
  const checkpoints: string[] = [];

  try {
    if (await fs.pathExists(projectsDir)) {
      const projects = await fs.readdir(projectsDir);
      for (const project of projects) {
        const checkpointPath = isDev
          ? path.join(projectsDir, project, ".reliverserules")
          : path.join(projectsDir, project, ".reliverserules");
        if (await fs.pathExists(checkpointPath)) {
          checkpoints.push(project);
        }
      }
    }
  } catch (error) {
    relinka(
      "error",
      "Error finding checkpoints:",
      error instanceof Error ? error.message : String(error),
    );
  }

  return checkpoints;
}
