import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc.js";

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
