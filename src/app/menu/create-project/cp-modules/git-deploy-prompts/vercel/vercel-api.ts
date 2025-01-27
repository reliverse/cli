import type { Vercel } from "@vercel/sdk";

import { relinka } from "@reliverse/prompts";

import type { EnvVar, VercelEnvResponse } from "./vercel-types.js";

/**
 * Gets environment variables from Vercel project
 */
export async function getVercelEnvVar(
  vercel: Vercel,
  projectId: string,
  envVarId: string,
): Promise<EnvVar | undefined> {
  try {
    const envVars = (await vercel.projects.getProjectEnv({
      idOrName: projectId,
      id: envVarId,
    })) as unknown as VercelEnvResponse;
    return envVars.envs.find((env: EnvVar) => env.key === envVarId);
  } catch (error) {
    relinka(
      "error",
      "Error getting Vercel env var:",
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

/**
 * Handles rate limit errors with retries
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("rate limit") &&
      retries > 0
    ) {
      relinka("info", `Rate limit hit, retrying in ${RETRY_DELAY / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return withRateLimit(fn, retries - 1);
    }
    throw error;
  }
}
