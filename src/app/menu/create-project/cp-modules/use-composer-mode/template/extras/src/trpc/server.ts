import "server-only";
import { createHydrationHelpers } from "@trpc/react-query/rsc";
// @ts-expect-error TODO: fix Next.js 15
import { headers } from "next/headers";
import { cache } from "react";

import { type AppRouter } from "~/app/menu/create-project/cp-modules/use-composer-mode/template/extras/src/server/api/root.js";
import { createTRPCContext } from "~/app/menu/create-project/cp-modules/use-composer-mode/template/extras/src/server/api/trpc.js";

import { createQueryClient } from "./query-client.js";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    // @ts-expect-error TODO: fix ts
    headers: heads,
  });
});

const getQueryClient = cache(createQueryClient);
// @ts-expect-error TODO: fix ts
const caller = createCaller(createContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  // @ts-expect-error TODO: fix query import path
  getQueryClient,
);
