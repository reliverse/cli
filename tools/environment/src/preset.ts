import { optional, picklist, string } from "valibot";
import { createEnv } from "./core";

/**
 * Vercel System Environment Variables
 * @see https://vercel.com/docs/projects/environment-variables/system-environment-variables#system-environment-variables
 */
export const presetVercel = createEnv({
	server: {
		VERCEL: optional(string()),
		VERCEL_ENV: optional(picklist(["development", "preview", "production"])),
		VERCEL_URL: optional(string()),
		VERCEL_BRANCH_URL: optional(string()),
		VERCEL_REGION: optional(string()),
		VERCEL_AUTOMATION_BYPASS_SECRET: optional(string()),
		VERCEL_GIT_PROVIDER: optional(string()),
		VERCEL_GIT_REPO_SLUG: optional(string()),
		VERCEL_GIT_REPO_OWNER: optional(string()),
		VERCEL_GIT_REPO_ID: optional(string()),
		VERCEL_GIT_COMMIT_REF: optional(string()),
		VERCEL_GIT_COMMIT_SHA: optional(string()),
		VERCEL_GIT_COMMIT_MESSAGE: optional(string()),
		VERCEL_GIT_COMMIT_AUTHOR_LOGIN: optional(string()),
		VERCEL_GIT_COMMIT_AUTHOR_NAME: optional(string()),
		VERCEL_GIT_PREVIOUS_SHA: optional(string()),
		VERCEL_GIT_PULL_REQUEST_ID: optional(string()),
	},
	runtimeEnv: process.env,
});
