import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const configKeysTable = sqliteTable("config_keys", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const userDataTable = sqliteTable("user_data", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
