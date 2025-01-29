import { Vercel } from "@vercel/sdk";
import { VercelCore } from "@vercel/sdk/core";

// https://github.com/vercel/sdk?tab=readme-ov-file#authentication
export function createVercelInstance(vercelKey: string): Vercel {
  return new Vercel({
    bearerToken: vercelKey,
  });
}

// https://github.com/vercel/sdk/blob/main/FUNCTIONS.md?plain=0#standalone-functions
export function createVercelCoreInstance(vercelKey: string): VercelCore {
  return new VercelCore({
    bearerToken: vercelKey,
  });
}
