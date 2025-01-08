import { z } from "zod";

// @ts-expect-error TODO: fix ts
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
// @ts-expect-error TODO: fix ts
import { posts } from "~/server/db/schema";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    // @ts-expect-error TODO: fix ts
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    // @ts-expect-error TODO: fix ts
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(posts).values({
        name: input.name,
      });
    }),

  // @ts-expect-error TODO: fix ts
  getLatest: publicProcedure.query(async ({ ctx }) => {
    const post = await ctx.db.query.posts.findFirst({
      // @ts-expect-error TODO: fix ts
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });

    return post ?? null;
  }),
});
