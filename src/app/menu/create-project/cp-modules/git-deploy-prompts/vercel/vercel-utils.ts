import type { VercelCore } from "@vercel/sdk/core";
import type {
  GetProjectsFramework,
  GetProjectsTarget1,
} from "@vercel/sdk/models/getprojectsop";

import { selectPrompt } from "@reliverse/prompts";
import { relinka } from "@reliverse/prompts";
import { projectsGetProjectDomain } from "@vercel/sdk/funcs/projectsGetProjectDomain";
import fs from "fs-extra";
import path from "pathe";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { updateReliverseMemory } from "~/utils/reliverseMemory.js";

import type { VercelTeam } from "./vercel-team.js";

import { getVercelTeams, verifyTeam } from "./vercel-team.js";

type VercelFramework = GetProjectsFramework;

/**
 * Saves token to memory and persists it
 */
export async function saveVercelToken(
  token: string,
  memory: ReliverseMemory,
  vercel: VercelCore,
): Promise<void> {
  memory.vercelKey = token;

  const teams = await getVercelTeams(vercel);

  if (teams && teams.length > 0) {
    let selectedTeam: VercelTeam;
    if (teams.length === 1 && teams[0]) {
      selectedTeam = teams[0];
      relinka(
        "info",
        `Auto-selected Vercel team with slug: ${selectedTeam.slug}`,
      );
    } else {
      const teamChoice = await selectPrompt<string>({
        title: "Select a Vercel team:",
        options: teams.map((team) => ({
          value: team.id,
          label: team.name,
          hint: team.slug,
        })),
      });
      selectedTeam = teams.find((team) => team.id === teamChoice)!;
    }

    // Verify team details before saving
    const isTeamValid = await verifyTeam(
      vercel,
      selectedTeam.id,
      selectedTeam.slug,
    );

    // If team is valid, save it to memory
    if (isTeamValid) {
      await updateReliverseMemory({
        ...memory,
        vercelTeamId: selectedTeam.id,
        vercelTeamSlug: selectedTeam.slug,
      });

      // If team is not valid, save an empty team to memory
    } else {
      relinka(
        "error",
        "Failed to verify Vercel team details. Vercel team will not be saved.",
      );
      await updateReliverseMemory({
        ...memory,
        vercelTeamId: "",
        vercelTeamSlug: "",
      });
    }
  } else {
    await updateReliverseMemory({
      ...memory,
      vercelTeamId: "",
      vercelTeamSlug: "",
    });
  }

  relinka("success", "Vercel token saved successfully!");
}

/**
 * Gets environment variables from .env file
 */
export async function getEnvVars(projectPath: string): Promise<
  {
    key: string;
    value: string;
    target: GetProjectsTarget1[];
    type: "plain" | "encrypted" | "sensitive";
  }[]
> {
  const envFile = path.join(projectPath, ".env");
  const envVars: {
    key: string;
    value: string;
    target: GetProjectsTarget1[];
    type: "plain" | "encrypted" | "sensitive";
  }[] = [];

  if (await fs.pathExists(envFile)) {
    const content = await fs.readFile(envFile, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const [key, ...valueParts] = line.trim().split("=");
      if (key && !key.startsWith("#")) {
        const value = valueParts
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
        if (!value || value === '""' || value === "''") {
          continue; // Skip empty values
        }

        // Determine targets based on key prefix and naming
        const targets: GetProjectsTarget1[] = key.startsWith("NEXT_PUBLIC_")
          ? ["production", "preview", "development"]
          : key.includes("_PREVIEW_")
            ? ["preview"]
            : key.includes("_DEV_")
              ? ["development"]
              : ["production"];

        // Determine if value should be encrypted based on key naming and content
        const type =
          !key.startsWith("NEXT_PUBLIC_") &&
          (key.includes("SECRET") ||
            key.includes("KEY") ||
            key.includes("TOKEN") ||
            key.includes("PASSWORD") ||
            key.includes("CREDENTIAL") ||
            key.includes("PRIVATE") ||
            /^[A-Fa-f0-9]{32,}$/.test(value))
            ? "encrypted"
            : "plain";

        envVars.push({
          key,
          value,
          target: targets,
          type,
        });
      }
    }
  }

  return envVars;
}

/**
 * Detects the project framework
 */
export async function detectFramework(
  directory: string,
): Promise<VercelFramework> {
  try {
    const packageJsonPath = path.join(directory, "package.json");
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      const { dependencies = {}, devDependencies = {} } = packageJson;
      const allDeps = { ...dependencies, ...devDependencies };

      if (allDeps.next) return "nextjs";
      if (allDeps.nuxt) return "nuxtjs";
      if (allDeps["@sveltejs/kit"]) return "sveltekit";
      if (allDeps.astro) return "astro";
      if (allDeps.gatsby) return "gatsby";
      if (allDeps.remix) return "remix";
      if (allDeps.vue) return "vue";
      if (allDeps.react) return "create-react-app";
      if (allDeps["@angular/core"]) return "angular";
      if (allDeps.svelte) return "svelte";
      if (allDeps.vite) return "vite";
    }

    // Check for framework-specific files/directories
    const files = await fs.readdir(directory);
    if (files.includes("astro.config.mjs") || files.includes("astro.config.ts"))
      return "astro";
    if (files.includes("nuxt.config.js") || files.includes("nuxt.config.ts"))
      return "nuxtjs";
    if (files.includes("svelte.config.js")) return "sveltekit";
    if (files.includes("gatsby-config.js")) return "gatsby";
    if (files.includes("remix.config.js")) return "remix";
    if (
      files.includes("next.config.js") ||
      files.includes("next.config.mjs") ||
      files.includes("next.config.ts")
    )
      return "nextjs";
    if (files.includes("vite.config.js") || files.includes("vite.config.ts"))
      return "vite";

    return "nextjs"; // Default to Next.js if no framework is detected
  } catch (_error) {
    relinka("warn", "Failed to detect framework, defaulting to Next.js");
    return "nextjs";
  }
}

/**
 * Verifies domain configuration.
 */
export async function verifyDomain(
  vercel: VercelCore,
  projectId: string,
  domain: string,
): Promise<boolean> {
  try {
    const res = await projectsGetProjectDomain(vercel, {
      idOrName: projectId,
      domain,
    });
    if (!res.ok) {
      throw res.error;
    }
    const domainResponse = res.value;
    if (domainResponse.verification && domainResponse.verification.length > 0) {
      relinka(
        "info",
        "Domain verification required. Please add the following DNS records:",
      );
      for (const record of domainResponse.verification) {
        relinka("info", `Type: ${record.type}, Value: ${record.value}`);
      }
      return false;
    }
    return domainResponse.verified;
  } catch (error) {
    relinka(
      "error",
      "Error verifying domain:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}
