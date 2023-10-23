/**
 * @ACME/NEXTJS-EDGE EDITION OF INDEX.TS
 *
 * @see https://github.com/jherr/app-router-auth-using-next-auth
 * @see https://github.com/rexfordessilfie/next-auth-account-linking
 * @see https://github.com/vujita/vubnguyen/blob/main/packages/auth/index.ts
 */

import type { DefaultSession } from "@auth/core/types";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import Github from "next-auth/providers/github";

import { db, tableCreator } from "@acme/db";
import { users } from "@acme/db/schema/auth";

import { env } from "./env.mjs";

export type { Session } from "next-auth";

// TODO: decide what type is more correct
// import type { Provider } from "@auth/core/providers";
// import type { Provider } from "next-auth/providers/index";

// Update this whenever adding new providers so that the client can
export const providers = ["discord", "github"] as const;
export type OAuthProviders = (typeof providers)[number];

// TODO: decide what approach is better
/* const providers = [
  env.GITHUB_CLIENT_ID &&
    env.GITHUB_CLIENT_SECRET &&
    Github({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
  env.DISCORD_CLIENT_ID &&
    env.DISCORD_CLIENT_SECRET &&
    Discord({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    }),
].filter(Boolean) as Provider[]; */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export const {
  handlers: { GET, POST },
  auth,
  CSRF_experimental,
} = NextAuth({
  adapter: DrizzleAdapter(db, tableCreator),
  providers: [
    Discord({
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    }),
    Github({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),

    // TODO:
    // jwt: ({ token, profile }) => {
    //   if (profile?.id) {
    //     token.id = profile.id;
    //     token.image = profile.picture;
    //   }
    //   return token;
    // },

    // TODO:
    // authorized({ request, auth }) {
    //   return !!auth?.user
    // }
  },
});

export const getUserById = async (userId: string) => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .then((res) => res[0] ?? null);
  return user;
};
