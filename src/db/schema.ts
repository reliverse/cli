/* eslint-disable @typescript-eslint/no-unused-vars */
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const configKeysTable = sqliteTable(
  "config_keys",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
  },
  (_table) => [
    // SQLite automatically creates an index for the primary key (key column)
  ],
);
