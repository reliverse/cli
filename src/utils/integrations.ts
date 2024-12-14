import fs from "fs-extra";
import path from "pathe";

import { relinka } from "~/utils/console.js";

type IntegrationConfig = {
  dependencies: string[];
  devDependencies?: string[];
  files: { path: string; content: string }[];
};

export async function installDrizzle(
  cwd: string,
  dbType: string,
  provider?: string,
) {
  const config: IntegrationConfig = {
    dependencies: ["drizzle-orm"],
    devDependencies: ["drizzle-kit"],
    files: [
      {
        path: "drizzle.config.ts",
        content: `import type { Config } from "drizzle-kit";
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
} satisfies Config;`,
      },
      {
        path: "src/db/schema.ts",
        content: `import { sql } from "drizzle-orm";
import { ${
          dbType === "postgres"
            ? "pgTable, serial, text, timestamp"
            : dbType === "mysql"
              ? "mysqlTable, serial, text, timestamp"
              : "sqliteTable, integer, text, integer as timestamp"
        }} from "drizzle-orm/${dbType}";

export const users = ${
          dbType === "postgres"
            ? "pgTable"
            : dbType === "mysql"
              ? "mysqlTable"
              : "sqliteTable"
        }("users", {
  id: ${dbType === "sqlite" ? "integer" : "serial"}("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: ${dbType === "sqlite" ? "integer" : "timestamp"}("created_at")
    .notNull()
    .default(sql\`CURRENT_TIMESTAMP\`),
});`,
      },
    ],
  };

  if (dbType === "postgres") {
    config.dependencies.push("postgres");
    if (provider === "neon") {
      config.dependencies.push("@neondatabase/serverless");
    }
  } else if (dbType === "mysql") {
    config.dependencies.push("mysql2");
  } else if (dbType === "sqlite") {
    config.dependencies.push("better-sqlite3");
    config.devDependencies?.push("@types/better-sqlite3");
  }

  await installIntegration(cwd, config);
}

export async function installPrisma(cwd: string) {
  const config: IntegrationConfig = {
    dependencies: ["@prisma/client"],
    devDependencies: ["prisma"],
    files: [
      {
        path: "prisma/schema.prisma",
        content: `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}`,
      },
    ],
  };

  await installIntegration(cwd, config);
}

export async function installStripe(cwd: string) {
  const config: IntegrationConfig = {
    dependencies: ["stripe"],
    files: [
      {
        path: "src/lib/stripe.ts",
        content: `import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});`,
      },
    ],
  };

  await installIntegration(cwd, config);
}

export async function installNextAuth(cwd: string) {
  const config: IntegrationConfig = {
    dependencies: ["next-auth"],
    devDependencies: ["@types/next-auth"],
    files: [
      {
        path: "src/lib/auth.ts",
        content: `import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
};`,
      },
    ],
  };

  await installIntegration(cwd, config);
}

export async function installResend(cwd: string) {
  const config: IntegrationConfig = {
    dependencies: ["resend"],
    files: [
      {
        path: "src/lib/email.ts",
        content: `import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

export const resend = new Resend(process.env.RESEND_API_KEY);`,
      },
    ],
  };

  await installIntegration(cwd, config);
}

export async function installTailwind(cwd: string) {
  const config: IntegrationConfig = {
    dependencies: ["tailwindcss", "postcss", "autoprefixer"],
    files: [
      {
        path: "tailwind.config.js",
        content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
      },
      {
        path: "postcss.config.js",
        content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
      },
      {
        path: "src/styles/globals.css",
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      },
    ],
  };

  await installIntegration(cwd, config);
}

export async function installBunTest(cwd: string) {
  const config: IntegrationConfig = {
    dependencies: [],
    devDependencies: ["bun-types"],
    files: [
      {
        path: "src/__tests__/example.test.ts",
        content: `import { expect, test, describe } from "bun:test";

describe("example", () => {
  test("should work", () => {
    expect(1 + 1).toBe(2);
  });
});`,
      },
      {
        path: "tsconfig.json",
        content: `{
  "compilerOptions": {
    "types": ["bun-types"]
  }
}`,
      },
    ],
  };

  await installIntegration(cwd, config);
  relinka("info", "Add 'test': 'bun test' to your package.json scripts");
}

export async function installVitest(cwd: string) {
  const config: IntegrationConfig = {
    dependencies: [],
    devDependencies: ["vitest", "@vitest/ui"],
    files: [
      {
        path: "src/__tests__/example.test.ts",
        content: `import { expect, test, describe } from 'vitest';

describe('example', () => {
  test('should work', () => {
    expect(1 + 1).toBe(2);
  });
});`,
      },
      {
        path: "vitest.config.ts",
        content: `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
  },
});`,
      },
    ],
  };

  await installIntegration(cwd, config);
  relinka(
    "info",
    "Add 'test': 'vitest' and 'test:ui': 'vitest --ui' to your package.json scripts",
  );
}

export async function installJest(cwd: string) {
  const config: IntegrationConfig = {
    dependencies: [],
    devDependencies: ["jest", "@types/jest", "ts-jest"],
    files: [
      {
        path: "src/__tests__/example.test.ts",
        content: `describe('example', () => {
  test('should work', () => {
    expect(1 + 1).toBe(2);
  });
});`,
      },
      {
        path: "jest.config.js",
        content: `/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
};`,
      },
    ],
  };

  await installIntegration(cwd, config);
  relinka("info", "Add 'test': 'jest' to your package.json scripts");
}

async function installIntegration(cwd: string, config: IntegrationConfig) {
  // Create necessary files
  for (const file of config.files) {
    const filePath = path.join(cwd, file.path);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, file.content);
    relinka("success", `Created ${file.path}`);
  }

  // Install dependencies
  if (config.dependencies.length > 0) {
    relinka("info", "Installing dependencies...");
    // TODO: Detect package manager and install dependencies
  }

  if (config.devDependencies && config.devDependencies.length > 0) {
    relinka("info", "Installing dev dependencies...");
    // TODO: Detect package manager and install dev dependencies
  }
}
