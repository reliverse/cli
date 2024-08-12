import NextAuth from "next-auth";

// @ts-expect-error ...
import { authOptions } from "~/core/server/auth";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
