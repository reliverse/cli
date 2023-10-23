/** @see https://youtu.be/qCLV0Iaq9zU */

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getServerSession } from "next-auth";

import { createContext } from "@acme/api/src/context";
import { appRouter } from "@acme/api/src/root";
import { authOptions } from "@acme/auth";

const handler = async (req: Request) => {
  const session = await getServerSession(authOptions);

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    // @ts-expect-error ...
    router: appRouter,
    // eslint-disable-next-line @typescript-eslint/await-thenable
    createContext: async () => await createContext(session),
  });
};

export { handler as GET, handler as POST };
