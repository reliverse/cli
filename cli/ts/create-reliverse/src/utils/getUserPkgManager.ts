export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export const getUserPkgManager: () => PackageManager = () => {
	// This environment variable is set by npm and yarn but bun seems less consistent
	const userAgent = process.env.npm_config_user_agent;

	if (userAgent) {
		if (userAgent.startsWith("yarn")) {
			return "yarn";
			// biome-ignore lint/style/noUselessElse: <explanation>
		} else if (userAgent.startsWith("pnpm")) {
			return "pnpm";
			// biome-ignore lint/style/noUselessElse: <explanation>
		} else if (userAgent.startsWith("bun")) {
			return "bun";
			// biome-ignore lint/style/noUselessElse: <explanation>
		} else {
			return "npm";
		}
		// biome-ignore lint/style/noUselessElse: <explanation>
	} else {
		// If no user agent is set, assume npm
		return "npm";
	}
};
