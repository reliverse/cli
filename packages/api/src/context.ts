import type { inferAsyncReturnType } from "@trpc/server";
import type { Session } from "next-auth";

/**
 * Create the context for incoming request.
 * @see https://trpc.io/docs/server/context
 */
export function createContext(session: Session | null) {
  return { user: session?.user };
}

export type Context = inferAsyncReturnType<typeof createContext>;
