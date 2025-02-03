import { VercelCore } from "@vercel/sdk/core";

/**
 * Creates a new Vercel SDK instance with the provided token
 * @see https://github.com/vercel/sdk#readme
 */
export function createVercelInstance(vercelKey: string): VercelCore {
  return new VercelCore({
    bearerToken: vercelKey,
  });
}
