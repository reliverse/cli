import { createNextApiHandler } from "@trpc/server/adapters/next";

// @ts-expect-error ...
import { appRouter } from "~/core/server/api/root";
// @ts-expect-error ...
import { createTRPCContext } from "~/core/server/api/trpc";
// @ts-expect-error ...
import { env } from "~/env";

// export API handler
export default createNextApiHandler({
	router: appRouter,
	createContext: createTRPCContext,
	onError:
		env.NODE_ENV === "development"
			? ({ path, error }) => {
					console.error(
						`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
					);
				}
			: undefined,
});
