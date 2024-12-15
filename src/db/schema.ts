import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export type ConfigKey = "code" | "key" | "githubKey" | "vercelKey";
export type UserDataKeys = "name" | "email" | "githubUsername" | "vercelUsername";

export const configKeysTable = sqliteTable("config_keys", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const userDataTable = sqliteTable("user_data", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
