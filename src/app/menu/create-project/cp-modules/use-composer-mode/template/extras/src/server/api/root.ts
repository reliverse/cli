import { postRouter } from "./routers/post.js";
import { createTRPCRouter } from "./trpc.js";

export const appRouter = createTRPCRouter({
  post: postRouter,
});

export type AppRouter = typeof appRouter;
