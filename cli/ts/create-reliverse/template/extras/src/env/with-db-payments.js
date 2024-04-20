import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		DATABASE_URL: z.string().url(),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		STRIPE_SECRET_KEY: z.string().optional(),
		STRIPE_WEBHOOK_SIGNING_SECRET: z.string().optional(),
		STRIPE_PROFESSIONAL_SUBSCRIPTION_PRICE_ID: z.string().optional(),
		STRIPE_ENTERPRISE_SUBSCRIPTION_PRICE_ID: z.string().optional(),
		LEMON_SQUEEZY_API_KEY: z.string().optional(),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
		// NEXT_PUBLIC_CLIENTVAR: z.string().optional(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		// NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
		STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
		STRIPE_WEBHOOK_SIGNING_SECRET: process.env.STRIPE_WEBHOOK_SIGNING_SECRET,
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
			process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
		STRIPE_PROFESSIONAL_SUBSCRIPTION_PRICE_ID:
			process.env.STRIPE_PROFESSIONAL_SUBSCRIPTION_PRICE_ID,
		STRIPE_ENTERPRISE_SUBSCRIPTION_PRICE_ID:
			process.env.STRIPE_ENTERPRISE_SUBSCRIPTION_PRICE_ID,
		LEMON_SQUEEZY_API_KEY: process.env.LEMON_SQUEEZY_API_KEY,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
