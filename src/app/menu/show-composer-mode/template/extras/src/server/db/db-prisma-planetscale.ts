import { Client } from "@planetscale/database";
import { PrismaPlanetScale } from "@prisma/adapter-planetscale";
import { PrismaClient } from "@prisma/client";

// @ts-expect-error TODO: fix ts
import { env } from "~/env";

const psClient = new Client({ url: env.DATABASE_URL });

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    adapter: new PrismaPlanetScale(psClient),
  });

const globalForPrisma = globalThis as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
