import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { Octokit } from "@octokit/rest";
import { inputPrompt, relinka } from "@reliverse/prompts";

import { cliVersion } from "~/app/constants.js";

import type { ReliverseMemory } from "./schemaMemory.js";

import { getUsernameGithub } from "./getUsernameGithub.js";
import { updateReliverseMemory } from "./reliverseMemory.js";

// A custom Octokit with REST endpoint methods.
export const OctokitWithRest = Octokit.plugin(restEndpointMethods);
// Our user agent string with the CLI version.
export const octokitUserAgent = `reliverse/${cliVersion}`;
// Type alias for OctokitWithRest.
export type InstanceGithub = InstanceType<typeof OctokitWithRest>;

/**
 * Initializes and returns an Octokit instance with rate limiting and a custom user agent.
 *
 * @param githubKey - The GitHub personal access token.
 * @returns An instance of OctokitWithRest.
 */
function initOctokitSDK(githubKey: string): InstanceGithub {
  return new OctokitWithRest({
    auth: githubKey.trim(),
    userAgent: octokitUserAgent,
    throttle: {
      onRateLimit: (
        _retryAfter: number,
        options: {
          method: string;
          url: string;
          request: { retryCount: number };
        },
        octokit: InstanceGithub,
      ) => {
        octokit.log.warn(
          `Request quota exhausted for ${options.method} ${options.url}`,
        );
        // Retry once if no previous retries have been made.
        return options.request.retryCount === 0;
      },
      onSecondaryRateLimit: (
        _retryAfter: number,
        options: {
          method: string;
          url: string;
          request: { retryCount: number };
        },
        octokit: InstanceGithub,
      ) => {
        octokit.log.warn(
          `Secondary rate limit encountered for ${options.method} ${options.url}`,
        );
        return options.request.retryCount === 0;
      },
    },
  });
}

/**
 * Ensures a valid GitHub token is available in Reliverse's memory.
 *
 * If a token is already stored in memory, this function validates it by fetching the
 * authenticated user's information. If the token is missing or invalid, the user is prompted
 * to input one. The new token is then saved persistently.
 *
 * @param memory - The Reliverse memory object.
 * @param maskInput - A flag or the string "prompt" that determines if input should be masked.
 * @returns The valid GitHub token.
 */
export async function ensureGithubToken(
  memory: ReliverseMemory,
  maskInput: "prompt" | boolean,
): Promise<string> {
  // If token exists in memory, validate it.
  if (memory.githubKey) {
    try {
      const octokit = initOctokitSDK(memory.githubKey);
      await octokit.rest.users.getAuthenticated();
      return memory.githubKey.trim();
    } catch (_error) {
      relinka(
        "warn",
        "Existing GitHub token is invalid. Please provide a new one.",
      );
    }
  }

  // Prompt the user for a new GitHub token.
  const token = await inputPrompt({
    title:
      "Please enter your GitHub personal access token.\n(It will be securely stored on your machine):",
    content:
      "Create one at https://github.com/settings/tokens/new\n" +
      "Ensure you select the `repo` scope, then click `Generate token`.",
    mode: maskInput ? "password" : "plain",
    validate: async (value: string): Promise<string | boolean> => {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        return "A token is required";
      }
      try {
        const octokit = initOctokitSDK(trimmedValue);
        await octokit.rest.users.getAuthenticated();
        return true;
      } catch (_error) {
        return "Invalid token. Please ensure it has the correct permissions (e.g. repo scope).";
      }
    },
  });

  // Save the new token persistently.
  await updateReliverseMemory({ githubKey: token });
  return token;
}

/**
 * Initializes a GitHub SDK instance and returns the GitHub token along with the Octokit instance.
 *
 * This function is analogous to the Vercel SDK init function; it ensures that a valid GitHub token is
 * available (prompting for one if necessary), initializes Octokit with the token, and returns both.
 *
 * @param memory - The Reliverse memory object.
 * @param maskInput - A flag or "prompt" to determine if the token input should be masked.
 * @returns A tuple containing the GitHub token and works as the wrapper for the Octokit instance.
 */
export async function initGithubSDK(
  memory: ReliverseMemory,
  frontendUsername: string,
  maskInput: "prompt" | boolean,
): Promise<[string, InstanceGithub, string]> {
  const githubUsername = await getUsernameGithub(memory, frontendUsername);
  const githubToken = await ensureGithubToken(memory, maskInput);
  const githubInstance = initOctokitSDK(githubToken);
  return [githubToken, githubInstance, githubUsername];
}
