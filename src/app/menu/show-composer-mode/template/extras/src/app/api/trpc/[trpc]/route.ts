import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
// @ts-expect-error TODO: fix ts
import { type NextRequest } from "next/server";

// @ts-expect-error TODO: fix ts
import { env } from "~/env";
// @ts-expect-error TODO: fix ts
import { appRouter } from "~/server/api/root";
// @ts-expect-error TODO: fix ts
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }: { path: string | null; error: Error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
