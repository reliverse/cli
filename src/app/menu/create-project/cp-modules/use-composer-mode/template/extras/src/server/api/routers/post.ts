import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "~/app/menu/create-project/cp-modules/use-composer-mode/template/extras/src/server/api/trpc.js";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),

  getLatest: publicProcedure.query(() => {
    return { name: "Example Post" };
  }),

  create: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input }) => {
      return { name: input.name };
    }),
});
