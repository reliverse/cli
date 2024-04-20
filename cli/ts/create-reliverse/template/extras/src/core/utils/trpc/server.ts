import "server-only";

import { headers } from "next/headers";
import { cache } from "react";

// @ts-expect-error ...
import { createCaller } from "~/core/server/api/root";
// @ts-expect-error ...
import { createTRPCContext } from "~/core/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(() => {
	const heads = new Headers(headers());
	heads.set("x-trpc-source", "rsc");

	return createTRPCContext({
		headers: heads,
	});
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
export const api = createCaller(createContext);
