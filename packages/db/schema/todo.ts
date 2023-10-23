import { sql } from "drizzle-orm";
import {
  boolean,
  int,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { mySqlTable } from "./_table";

export const todos = mySqlTable("todo", {
  id: serial("id").primaryKey(),
  position: int("position").default(0),
  content: varchar("content", { length: 256 }).notNull(),
  done: boolean("done"),
  createdAt: timestamp("created_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  userId: varchar("userId", { length: 256 }).notNull(),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
