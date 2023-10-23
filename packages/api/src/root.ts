import { authRouter } from "./router/auth";
import { router } from "./trpc";

// import { postRouter } from "./router/post";
// import { createTRPCRouter } from "./trpc";
// import { todosRouter } from "./src/router/todos";

export const appRouter = router({
  user: authRouter,
});

// export const appRouter = createTRPCRouter({
//   todos: todosRouter,
//   auth: authRouter,
//   post: postRouter,
// });

// export type definition of API
export type AppRouter = typeof appRouter;
