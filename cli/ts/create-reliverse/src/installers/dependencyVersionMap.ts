/*
 * This maps the necessary packages to a version.
 * This improves performance significantly over fetching it from the npm registry.
 */
export const dependencyVersionMap = {
	// monorepo dependencies
	turbo: "^1.13.2",

	// NextAuth.js
	"next-auth": "^4.24.6",
	"@auth/prisma-adapter": "^1.4.0",
	"@auth/drizzle-adapter": "^0.7.0",

	// Prisma
	prisma: "^5.10.2",
	"@prisma/client": "^5.10.2",
	"@prisma/adapter-planetscale": "^5.10.2",

	// Drizzle
	"drizzle-orm": "^0.29.4",
	"drizzle-kit": "^0.20.14",
	"eslint-plugin-drizzle": "^0.2.3",
	mysql2: "^3.9.1",
	"@planetscale/database": "^1.16.0",
	postgres: "^3.4.3",
	pg: "^8.11.3",
	"@types/better-sqlite3": "^7.6.9",
	"better-sqlite3": "^9.4.3",

	// TailwindCSS & Shadcn
	tailwindcss: "^3.4.1",
	postcss: "^8.4.34",
	"tailwind-merge": "^2.3.0",
	"prettier-plugin-tailwindcss": "^0.5.11",
	"tailwindcss-animate": "^1.0.7",
	"class-variance-authority": "^0.7.0",
	"@radix-ui/react-slot": "^1.0.2",
	"lucide-react": "^0.372.0",

	// tRPC
	"@trpc/client": "next",
	"@trpc/server": "next",
	"@trpc/react-query": "next",
	"@trpc/next": "next",
	"@tanstack/react-query": "^5.25.0",
	superjson: "^2.2.1",
	"server-only": "^0.0.1",

	// Internationalization
	"next-intl": "^3.11.2",
	"next-international": "^1.2.4",

	// Payment Providers
	"@stripe/stripe-js": "^3.3.0",
	"@lemonsqueezy/lemonsqueezy.js": "^2.2.0",

	// Formatter Providers
	prettier: "^3.2.5",
	"@biomejs/biome": "^1.6.4",

	// Testing Dependencies
	vitest: "^1.4.0",
	jsdom: "^24.0.0",

	// Other Dependencies
	knip: "^5.9.4",
	"eslint-plugin-perfectionist": "^2.9.0",
} as const;
export type AvailableDependencies = keyof typeof dependencyVersionMap;
