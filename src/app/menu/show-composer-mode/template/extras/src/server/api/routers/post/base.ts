import { z } from "zod";

// @ts-expect-error TODO: fix ts
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Mocked DB
type Post = {
  id: number;
  name: string;
};
const posts: Post[] = [
  {
    id: 1,
    name: "Hello World",
  },
];

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
    .mutation(({ input }) => {
      const post: Post = {
        id: posts.length + 1,
        name: input.name,
      };
      posts.push(post);
      return post;
    }),

  getLatest: publicProcedure.query(() => {
    return posts.at(-1) ?? null;
  }),
});
