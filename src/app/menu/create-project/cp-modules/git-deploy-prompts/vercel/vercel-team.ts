import type { VercelCore } from "@vercel/sdk/core";
import type { GetTeamsResponseBody } from "@vercel/sdk/models/getteamsop";

import { relinka } from "@reliverse/prompts";
import { teamsGetTeam } from "@vercel/sdk/funcs/teamsGetTeam";
import { teamsGetTeams } from "@vercel/sdk/funcs/teamsGetTeams";

import { handleReliverseMemory } from "~/utils/reliverseMemory.js";

export type VercelTeam = {
  id: string;
  slug: string;
  name: string;
};

/**
 * Gets the primary Vercel team details from memory or verifies and returns from API
 */
export async function getPrimaryVercelTeam(
  vercelCore: VercelCore,
  memory: { vercelTeamId?: string; vercelTeamSlug?: string },
): Promise<VercelTeam | undefined> {
  try {
    // First try to verify existing team from memory
    if (memory.vercelTeamId && memory.vercelTeamSlug) {
      const isTeamValid = await verifyTeam(
        vercelCore,
        memory.vercelTeamId,
        memory.vercelTeamSlug,
      );
      if (isTeamValid) {
        // Get full team details to include name
        const teams = await getVercelTeams(vercelCore);
        const memoryTeam = teams.find(
          (team) => team.id === memory.vercelTeamId,
        );
        if (memoryTeam) {
          return memoryTeam;
        }
      }
    }

    // If no valid team in memory, get first team from API
    const teams = await getVercelTeams(vercelCore);
    if (teams?.length > 0 && teams[0]) {
      const team = teams[0];
      // Write to memory for future use
      memory.vercelTeamId = team.id;
      memory.vercelTeamSlug = team.slug;

      // Re-read memory to ensure changes are persisted
      await handleReliverseMemory();

      return team;
    }

    return undefined;
  } catch (error) {
    relinka(
      "warn",
      "Error getting primary team:",
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

export async function verifyTeam(
  vercelCore: VercelCore,
  teamId: string,
  teamSlug: string,
): Promise<boolean> {
  try {
    const res = await teamsGetTeam(vercelCore, {
      teamId,
      slug: teamSlug,
    });

    if (!res.ok) {
      relinka(
        "warn",
        "Failed to verify team:",
        res.error?.message ?? "Unknown error",
      );
      return false;
    }

    return true;
  } catch (error) {
    relinka(
      "warn",
      "Error verifying team:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

export async function getVercelTeams(
  vercelCore: VercelCore,
): Promise<VercelTeam[]> {
  const res = await teamsGetTeams(vercelCore, {
    limit: 10,
  });

  if (!res.ok) {
    throw res.error;
  }

  const { teams } = res.value;
  return teams
    .filter(
      (team): team is GetTeamsResponseBody["teams"][0] => team.name !== null,
    )
    .map((team) => ({
      id: team.id,
      slug: team.slug,
      name: team.name,
    }));
}
