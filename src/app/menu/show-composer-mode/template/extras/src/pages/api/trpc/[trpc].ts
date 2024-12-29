import { createNextApiHandler } from "@trpc/server/adapters/next";

// @ts-expect-error TODO: fix ts
import { env } from "~/env";
// @ts-expect-error TODO: fix ts
import { framework } from "~/server/api/root";
// @ts-expect-error TODO: fix ts
import { createTRPCContext } from "~/server/api/trpc";

// export API handler
export default createNextApiHandler({
  router: framework,
  createContext: createTRPCContext,
  onError:
    env.NODE_ENV === "development"
      ? // @ts-expect-error TODO: fix ts
        ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
          );
        }
      : undefined,
});
