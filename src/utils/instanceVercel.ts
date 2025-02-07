import { inputPrompt, relinka } from "@reliverse/prompts";
import { VercelCore } from "@vercel/sdk/core.js";

import type { ReliverseMemory } from "~/utils/schemaMemory.js";

import { saveVercelToken } from "~/app/menu/create-project/cp-modules/git-deploy-prompts/vercel/vercel-utils.js";

export type InstanceVercel = VercelCore;

/**
 * Prompts the user for a Vercel token if none is stored
 */
export async function askVercelToken(
  maskInput: boolean,
  memory: ReliverseMemory,
): Promise<string | undefined> {
  if (!memory?.vercelKey) {
    const token = await inputPrompt({
      title:
        "Please enter your Vercel personal access token.\n(It will be securely stored on your machine):",
      content: "Create one at https://vercel.com/account/settings/tokens",
      mode: maskInput ? "password" : "plain",
      validate: (value: string) => {
        if (!value?.trim()) return "Token is required";
        return true;
      },
    });

    if (!token) {
      relinka("error", "No token provided");
      return undefined;
    }

    return token;
  }

  return memory.vercelKey;
}

/**
 * Creates a new Vercel SDK instance by obtaining the token either from memory
 * or by prompting the user. The token is then used to initialize VercelCore.
 *
 * It's recommended to call it once and pass the instance through the user flow.
 *
 * This `@vercel/sdk` init returns `[token, vercel]`.
 */
export async function initVercelSDK(
  memory: ReliverseMemory,
  maskInput: boolean,
): Promise<[string, VercelCore] | undefined> {
  let vercelToken = memory?.vercelKey;

  if (!vercelToken) {
    vercelToken = await askVercelToken(maskInput, memory);
    if (!vercelToken) {
      relinka("error", "No token provided");
      return undefined;
    }
  }

  const vercelInstance = new VercelCore({ bearerToken: vercelToken });

  // If the token wasn't previously saved, persist it now.
  if (!memory.vercelKey) {
    await saveVercelToken(vercelToken, memory, vercelInstance);
    memory.vercelKey = vercelToken;
  }

  return [vercelToken, vercelInstance];
}
