import { relinka } from "@reliverse/prompts";
import { execa } from "execa";

import type { IntegrationConfig } from "~/types.js";

// Integration configurations
export const INTEGRATION_CONFIGS: Record<string, IntegrationConfig> = {
  drizzle: {
    name: "Drizzle",
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
  import { sqliteTable, integer, text } from "drizzle-orm/sqlite";
  
  export const users = sqliteTable("users", {
    id: integer("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql\`CURRENT_TIMESTAMP\`),
  });`,
      },
    ],
    scripts: {
      "db:push": "drizzle-kit push:sqlite",
      "db:studio": "drizzle-kit studio",
    },
    envVars: {
      DATABASE_URL: "file:./sqlite.db",
    },
  },
  prisma: {
    name: "Prisma",
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
    scripts: {
      "db:push": "prisma db push",
      "db:pull": "prisma db pull",
      "db:generate": "prisma generate",
      "db:studio": "prisma studio",
    },
    envVars: {
      DATABASE_URL: "postgresql://user:password@localhost:5432/mydb",
    },
  },
  stripe: {
    name: "Stripe",
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
    envVars: {
      STRIPE_SECRET_KEY: "your_stripe_secret_key",
      STRIPE_WEBHOOK_SECRET: "your_stripe_webhook_secret",
      STRIPE_PRICE_ID: "your_stripe_price_id",
    },
  },
  "next-auth": {
    name: "NextAuth.js",
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
    envVars: {
      NEXTAUTH_SECRET: "your_nextauth_secret",
      GITHUB_ID: "your_github_client_id",
      GITHUB_SECRET: "your_github_client_secret",
    },
  },
  resend: {
    name: "Resend",
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
    envVars: {
      RESEND_API_KEY: "your_resend_api_key",
    },
  },
  tailwind: {
    name: "Tailwind CSS",
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
  },
  "bun-test": {
    name: "Bun Test",
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
    ],
    scripts: {
      test: "bun test",
      "test:watch": "bun test --watch",
    },
  },
  vitest: {
    name: "Vitest",
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
    scripts: {
      test: "vitest",
      "test:ui": "vitest --ui",
    },
  },
  jest: {
    name: "Jest",
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
    scripts: {
      test: "jest",
      "test:watch": "jest --watch",
    },
  },
  "better-auth": {
    name: "Better Auth",
    dependencies: [
      "better-auth",
      "@better-fetch/fetch",
      "better-auth/plugins/two-factor",
      "better-auth/plugins/organizations",
      "better-auth/plugins/rate-limit",
      "better-auth/plugins/next-cookies",
      "better-auth/plugins/social-auth",
    ],
    devDependencies: ["@better-auth/cli"],
    files: [
      {
        path: "src/lib/auth.ts",
        content: `import { betterAuth } from "better-auth";
  import { drizzleAdapter } from "better-auth/adapters/drizzle";
  import { twoFactor } from "better-auth/plugins/two-factor";
  import { organizations } from "better-auth/plugins/organizations";
  import { rateLimit } from "better-auth/plugins/rate-limit";
  import { nextCookies } from "better-auth/plugins/next-cookies";
  import { socialAuth } from "better-auth/plugins/social-auth";
  import { db } from "./db";
  
  export const auth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg", // or "mysql", "sqlite"
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      verifyEmail: true,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        scope: ["user:email", "read:user"],
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      discord: {
        clientId: process.env.DISCORD_CLIENT_ID!,
        clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        scope: ["identify", "email"],
      },
    },
    plugins: [
      twoFactor({
        issuer: process.env.NEXT_PUBLIC_APP_NAME ?? "Your App",
        trustDeviceEnabled: true,
        recoveryCodesEnabled: true,
      }),
      organizations({
        invitationExpiry: "7d",
        maxMembers: 10,
        roles: ["admin", "member"],
      }),
      rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      }),
      socialAuth({
        // Social auth specific configurations
        callbackURL: "/api/auth/callback",
        defaultRedirect: "/dashboard",
        errorRedirect: "/auth/error",
      }),
      nextCookies(), // Make sure this is the last plugin
    ],
  });`,
      },
      {
        path: "src/lib/auth-client.ts",
        content: `import { createAuthClient } from "better-auth/react";
  import { twoFactorClient } from "better-auth/plugins/two-factor/client";
  import { organizationsClient } from "better-auth/plugins/organizations/client";
  import { socialAuthClient } from "better-auth/plugins/social-auth/client";
  
  export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    plugins: [
      twoFactorClient({
        twoFactorPage: "/auth/two-factor",
      }),
      organizationsClient(),
      socialAuthClient(),
    ],
  });
  
  export const { 
    signIn, 
    signUp, 
    useSession,
    twoFactor,
    organizations,
    social,
  } = authClient;`,
      },
      {
        path: "src/app/auth/sign-in/page.tsx",
        content: `"use client";
  
  import { useState } from "react";
  import { authClient } from "@/lib/auth-client";
  
  export default function SignInPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
  
    const handleEmailSignIn = async () => {
      try {
        await authClient.signIn.email({
          email,
          password,
        });
        window.location.href = "/dashboard";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sign in failed");
      }
    };
  
    const handleSocialSignIn = async (provider: "github" | "discord") => {
      try {
        await authClient.social.signIn({
          provider,
          callbackURL: "/dashboard",
          errorCallbackURL: "/auth/error",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Social sign in failed");
      }
    };
  
    return (
      <div className="max-w-md mx-auto mt-10 p-6">
        <h1 className="text-2xl font-bold mb-6">Sign In</h1>
        
        {/* Email/Password Sign In */}
        <div className="mb-8">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 border rounded mb-4"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 border rounded mb-4"
          />
          <button
            onClick={handleEmailSignIn}
            className="w-full bg-blue-500 text-white p-2 rounded mb-4"
          >
            Sign in with Email
          </button>
        </div>
  
        {/* Social Sign In */}
        <div className="space-y-4">
          <button
            onClick={() => handleSocialSignIn("github")}
            className="w-full bg-gray-800 text-white p-2 rounded flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
            </svg>
            Sign in with GitHub
          </button>
          <button
            onClick={() => handleSocialSignIn("discord")}
            className="w-full bg-indigo-600 text-white p-2 rounded flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            Sign in with Discord
          </button>
        </div>
  
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>
    );
  }`,
      },
      {
        path: "src/app/auth/error/page.tsx",
        content: `"use client";
  
  import { useSearchParams } from "next/navigation";
  
  export default function AuthErrorPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
  
    return (
      <div className="max-w-md mx-auto mt-10 p-6">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Authentication Error</h1>
        <p className="mb-4">{error ?? "An error occurred during authentication"}</p>
        <a
          href="/auth/sign-in"
          className="text-blue-500 hover:underline"
        >
          Back to Sign In
        </a>
      </div>
    );
  }`,
      },
    ],
    scripts: {
      "db:generate": "better-auth-cli generate",
      "db:migrate": "better-auth-cli migrate",
    },
    envVars: {
      BETTER_AUTH_SECRET: "generate_a_secure_random_string",
      BETTER_AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_NAME: "Your App Name",
      GITHUB_CLIENT_ID: "your_github_client_id",
      GITHUB_CLIENT_SECRET: "your_github_client_secret",
      GOOGLE_CLIENT_ID: "your_google_client_id",
      GOOGLE_CLIENT_SECRET: "your_google_client_secret",
      DISCORD_CLIENT_ID: "your_discord_client_id",
      DISCORD_CLIENT_SECRET: "your_discord_client_secret",
    },
    postInstall: async (cwd: string) => {
      // Run database migrations after installation
      try {
        await execa("npx", ["@better-auth/cli", "migrate"], { cwd });
        relinka("success", "Better Auth database migrations completed");
      } catch (error) {
        relinka(
          "error",
          "Failed to run Better Auth migrations:",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  },
  "next-intl": {
    name: "next-intl",
    dependencies: ["next-intl"],
    files: [
      {
        path: "src/i18n.ts",
        content: `import {getRequestConfig} from 'next-intl/server';
  import {notFound} from 'next/navigation';
   
  // Can be imported from a shared config
  const locales = ['en', 'es', 'fr'];
   
  export default getRequestConfig(async ({locale}) => {
    // Validate that the incoming \`locale\` parameter is valid
    if (!locales.includes(locale as any)) notFound();
   
    return {
      messages: (await import(\`./messages/\${locale}.json\`)).default
    };
  });`,
      },
      {
        path: "src/middleware.ts",
        content: `import createMiddleware from 'next-intl/middleware';
   
  export default createMiddleware({
    // A list of all locales that are supported
    locales: ['en', 'es', 'fr'],
   
    // Used when no locale matches
    defaultLocale: 'en'
  });
   
  export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(es|fr)/:path*']
  };`,
      },
      {
        path: "src/messages/en.json",
        content: `{
    "Index": {
      "title": "Hello world!"
    }
  }`,
      },
    ],
  },

  "next-international": {
    name: "next-international",
    dependencies: ["next-international"],
    files: [
      {
        path: "src/i18n/index.ts",
        content: `import {createI18n} from 'next-international'
   
  export const {useI18n, useScopedI18n, I18nProvider, getLocaleProps} = createI18n({
    en: () => import('./en'),
    es: () => import('./es'),
    fr: () => import('./fr'),
  })`,
      },
      {
        path: "src/i18n/en.ts",
        content: `export default {
    hello: 'Hello',
    welcome: 'Welcome to our site',
  } as const`,
      },
    ],
  },

  lingui: {
    name: "Lingui",
    dependencies: ["@lingui/react"],
    devDependencies: ["@lingui/cli", "@lingui/macro"],
    files: [
      {
        path: "lingui.config.ts",
        content: `import { defineConfig } from '@lingui/conf'
  
  export default defineConfig({
    locales: ['en', 'es', 'fr'],
    sourceLocale: 'en',
    catalogs: [{
      path: 'src/locales/{locale}/messages',
      include: ['src'],
    }],
    format: 'po',
  })`,
      },
      {
        path: "src/i18n.ts",
        content: `import { i18n } from '@lingui/core'
  import { en, es, fr } from 'make-plural/plurals'
  
  export const locales = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
  }
  export const defaultLocale = 'en'
  
  i18n.loadLocaleData({
    en: { plurals: en },
    es: { plurals: es },
    fr: { plurals: fr },
  })
  
  export async function activateLocale(locale: string) {
    const { messages } = await import(\`./locales/\${locale}/messages.po\`)
    i18n.load(locale, messages)
    i18n.activate(locale)
  }`,
      },
    ],
    scripts: {
      "i18n:extract": "lingui extract",
      "i18n:compile": "lingui compile",
    },
  },
};
