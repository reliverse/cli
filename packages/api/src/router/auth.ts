import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@acme/db";
import { users } from "@acme/db/schema/auth";

import { protectedProcedure, router } from "../trpc";

export const authRouter = router({
  getUser: protectedProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ ctx, input }) => {
      /**
       * User should only be able
       * to access their own data
       */
      if (ctx.user?.email !== input.email) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));
      return user;
    }),
});

// =============================================

// import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

// export const authRouter = createTRPCRouter({
//   getSession: publicProcedure.query(({ ctx }) => {
//     return ctx.session;
//   }),
//   getSecretMessage: protectedProcedure.query(() => {
// testing type validation of overridden next-auth Session in @acme/auth package
//     return "you can see this secret message!";
//   }),
// });
