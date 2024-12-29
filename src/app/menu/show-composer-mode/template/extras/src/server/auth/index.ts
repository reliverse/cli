import NextAuth from "next-auth";
import { cache } from "react";

// @ts-expect-error TODO: fix ts
import { authConfig } from "./config.js";

// @ts-expect-error TODO: fix ts
const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(authConfig);

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
