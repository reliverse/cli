import { createEnv } from "@tools/environment";
import { minLength, optional, string } from "valibot";

export const env = createEnv({
	/**
	 * Specify your client-side environment variables schema here. This
	 * way you can ensure the app isn't built with invalid env vars. To
	 * expose them to a client you can prefix them with `NEXT_PUBLIC_`.
	 */
	client: {
		NEXT_PUBLIC_APP_URL: optional(string([minLength(1)])),
	},

	/**
	 * You can't destruct `process.env` as the regular object in the Next.js edge
	 * runtimes (e.g. middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		// DATABASE_URL: process.env.DATABASE_URL,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
	},

	/**
	 * Specify your server-side environment variables schema here.
	 * This way you can ensure app isn't built with invalid vars.
	 */
	server: {
		// DATABASE_URL: string([minLength(1)]),
	},
});
