import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

// @ts-expect-error ...
import { appRouter } from "~/core/server/api/root";
// @ts-expect-error ...
import { createTRPCContext } from "~/core/server/api/trpc";
// @ts-expect-error ...
import { env } from "~/env";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
	return createTRPCContext({
		headers: req.headers,
	});
};

const handler = (req: NextRequest) =>
	fetchRequestHandler({
		endpoint: "/api/trpc",
		req,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		router: appRouter,
		createContext: () => createContext(req),
		onError:
			env.NODE_ENV === "development"
				? ({ path, error }) => {
						console.error(
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
							`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
						);
					}
				: undefined,
	});

export { handler as GET, handler as POST };
