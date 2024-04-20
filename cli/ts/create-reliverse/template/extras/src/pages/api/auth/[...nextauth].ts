import NextAuth from "next-auth";

// @ts-expect-error ...
import { authOptions } from "~/core/server/auth";

export default NextAuth(authOptions);
