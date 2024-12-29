import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// @ts-expect-error TODO: fix ts
import { env } from "~/env";

// @ts-expect-error TODO: fix ts
import * as schema from "./schema.js";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
