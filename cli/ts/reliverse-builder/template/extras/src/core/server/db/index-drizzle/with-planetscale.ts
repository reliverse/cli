import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";

// @ts-expect-error ...
import { env } from "~/env";
// @ts-expect-error ...
import * as schema from "./schema";

export const db = drizzle(new Client({ url: env.DATABASE_URL }), { schema });
