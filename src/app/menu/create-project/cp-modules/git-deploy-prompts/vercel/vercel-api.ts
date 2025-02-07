import { relinka } from "@reliverse/prompts";
import { projectsGetProjectEnv } from "@vercel/sdk/funcs/projectsGetProjectEnv.js";

import type { InstanceVercel } from "~/utils/instanceVercel.js";

import type { EnvVar } from "./vercel-types.js";

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

/**
 * Gets an environment variable from a Vercel project.
 */
export async function getVercelEnvVar(
  vercelInstance: InstanceVercel,
  projectId: string,
  envVarId: string,
): Promise<EnvVar | undefined> {
  try {
    const res = await projectsGetProjectEnv(vercelInstance, {
      idOrName: projectId,
      id: envVarId,
    });
    if (!res.ok) {
      throw res.error;
    }
    const envVar = res.value as EnvVar;
    return envVar;
  } catch (error) {
    relinka(
      "error",
      "Error getting Vercel env var:",
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

/**
 * Handles rate limit errors with retries.
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
