import { Client } from "@planetscale/database";
import { drizzle } from "drizzle-orm/planetscale-serverless";

// @ts-expect-error TODO: fix ts
import { env } from "~/env";

// @ts-expect-error TODO: fix ts
import * as schema from "./schema.js";

export const db = drizzle(new Client({ url: env.DATABASE_URL }), { schema });
