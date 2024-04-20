// @ts-expect-error ...
import { postRouter } from "~/core/server/api/routers/post";
// @ts-expect-error ...
import { createCallerFactory, createTRPCRouter } from "~/core/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	post: postRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
