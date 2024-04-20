import path from "node:path";
import fs from "fs-extra";

import { PKG_ROOT } from "../consts.js";
import type { DatabaseProvider, Installer } from "../installers/index.js";

const getEnvContent = (
	usingAuth: boolean,
	usingPrisma: boolean,
	usingDrizzle: boolean,
	usingStripe: boolean,
	usingLemon: boolean,
	databaseProvider: DatabaseProvider,
	projectName: string,
) => {
	let content = `
# When adding additional environment variables, the schema in "/src/env.js"
# should be updated accordingly.
`
		.trim()
		.concat("\n");

	if (usingPrisma)
		content += `
# Prisma
# https://prisma.io/docs/reference/database-reference/connection-urls#env
`;

	if (usingDrizzle) content += "\n# Drizzle\n";

	if (usingPrisma || usingDrizzle) {
		if (databaseProvider === "planetscale") {
			if (usingDrizzle) {
				content += `# Get the Database URL from the "prisma" dropdown selector in PlanetScale. 
# Change the query params at the end of the URL to "?ssl={"rejectUnauthorized":true}"
DATABASE_URL='mysql://YOUR_MYSQL_URL_HERE?ssl={"rejectUnauthorized":true}'`;
			} else {
				content = `# Get the Database URL from the "prisma" dropdown selector in PlanetScale. 
DATABASE_URL='mysql://YOUR_MYSQL_URL_HERE?sslaccept=strict'`;
			}
		} else if (databaseProvider === "mysql") {
			content += `DATABASE_URL="mysql://root:password@localhost:3306/${projectName}"`;
		} else if (databaseProvider === "postgres") {
			content += `DATABASE_URL="postgresql://postgres:password@localhost:5432/${projectName}?sslmode=require"`;
		} else if (databaseProvider === "sqlite") {
			content += usingPrisma
				? 'DATABASE_URL="file:./db.sqlite"'
				: 'DATABASE_URL="db.sqlite"';
		}
		content += "\n";
	}

	if (usingAuth)
		content += `
# Next Auth
# You can generate a new secret on the command line with:
# openssl rand -base64 32
# https://next-auth.js.org/configuration/options#secret
NEXTAUTH_SECRET="example-secret-at-least-32-characters"
NEXTAUTH_URL="http://localhost:3000"

# Next Auth Discord Provider
DISCORD_CLIENT_ID=""
DISCORD_CLIENT_SECRET=""
`;

	if (!usingAuth && !usingPrisma)
		content += `
# Example:
# SERVERVAR="foo"
# NEXT_PUBLIC_CLIENTVAR="bar"
`;

	if (usingStripe)
		content += `
#===========================================
# 🟡 OPTIONAL (MEDIUM)
#===========================================

# https://dashboard.stripe.com/test/products
STRIPE_PROFESSIONAL_SUBSCRIPTION_PRICE_ID=""
STRIPE_ENTERPRISE_SUBSCRIPTION_PRICE_ID=""

# https://dashboard.stripe.com/test/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
STRIPE_SECRET_KEY=""

# Read the instructions at the end of file
STRIPE_WEBHOOK_SIGNING_SECRET=""

#===========================================
# 🟣 INSTRUCTIONS
#===========================================

# [STRIPE WEBHOOK FOR DEVELOPMENT]
# 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli#install
# 2. https://dashboard.stripe.com/test/webhooks/create?endpoint_location=local
# 3. Open 3 terminals: (1) "bun dev"; (2) "stripe login"; (3) "bun stripe:listen".
# 4. Copy signing secret from your terminal, paste to STRIPE_WEBHOOK_SIGNING_SECRET.
# 5. Run "stripe trigger payment_intent.succeeded", wait for Completed, click Done.
# Keep "bun stripe:listen" enabled when you need to test Stripe on the localhost.
# When testing the Stripe -> use these test data: 4242424242424242 | 12/34 | 567

# [STRIPE WEBHOOK FOR PRODUCTION]
# 1. https://dashboard.stripe.com/test/webhooks/create?endpoint_location=hosted
# 2. As endpoint use: https://use-your-domain-here.com/api/webhooks/stripe
# 3. "Select events" > "Select all events" > "Add events".
# 4. "Events on your account"; Version "Latest API version".
# 5. Scroll the page down to the end and click "Add endpoint".
# 6. Open newly created webhook and reveal your signing secret.
# Please note: you will get the test-mode production signing key,
# switch to the live-mode to get real one, steps possibly the same.
`;

	if (usingLemon)
		content += `
# Lemon Squeezy
LEMON_SQUEEZY_API_KEY=""
`;

	return content;
};

const exampleEnvContent = `
# Since the ".env" file is gitignored, you can use the ".env.example" file to
# build a new ".env" file when you clone the repo. Keep this file up-to-date
# when you add new variables to \`.env\`.

# This file will be committed to version control, so make sure not to have any
# secrets in it. If you are cloning this repo, create a copy of this file named
# ".env" and populate it with your secrets.
`
	.trim()
	.concat("\n\n");

export const envVariablesInstaller: Installer = ({
	projectDir,
	packages,
	databaseProvider,
	projectName,
}) => {
	const usingAuth = packages?.nextAuth.inUse;
	const usingPrisma = packages?.prisma.inUse;
	const usingDrizzle = packages?.drizzle.inUse;
	const usingStripe = packages?.stripe.inUse;
	const usingLemon = packages?.lemonSqueezy.inUse;

	const usingDb = usingPrisma || usingDrizzle;
	const usingPlanetScale = databaseProvider === "planetscale";
	const usingPayments = usingStripe || usingLemon;

	const envContent = getEnvContent(
		!!usingAuth,
		!!usingPrisma,
		!!usingDrizzle,
		!!usingStripe,
		!!usingLemon,
		databaseProvider,
		projectName,
	);

	let envFile = "";
	if (usingDb) {
		if (usingPlanetScale) {
			if (usingAuth) {
				if (usingPayments) envFile = "with-auth-db-planetscale-payments.js";
				else envFile = "with-auth-db-planetscale.js";
			} else {
				if (usingPayments) envFile = "with-db-planetscale-payments.js";
				else envFile = "with-db-planetscale.js";
			}
		} else {
			if (usingAuth) {
				if (usingPayments) envFile = "with-auth-db-payments.js";
				else envFile = "with-auth-db.js";
			} else {
				if (usingPayments) envFile = "with-db-payments.js";
				else envFile = "with-db.js";
			}
		}
	} else {
		if (usingAuth) {
			if (usingPayments) envFile = "with-auth-payments.js";
			else envFile = "with-auth.js";
		}
	}

	if (envFile !== "") {
		const envSchemaSrc = path.join(
			PKG_ROOT,
			"template/extras/src/env",
			envFile,
		);
		const envFileText = fs.readFileSync(envSchemaSrc, "utf-8");
		const envSchemaDest = path.join(projectDir, "src/env.js");

		if (databaseProvider === "sqlite") {
			fs.writeFileSync(
				envSchemaDest,
				envFileText.replace("\n      .url()", ""),
				"utf-8",
			);
		} else {
			fs.writeFileSync(envSchemaDest, envFileText, "utf-8");
		}
	}

	const envDest = path.join(projectDir, ".env");
	const envExampleDest = path.join(projectDir, ".env.example");

	fs.writeFileSync(envDest, envContent, "utf-8");
	fs.writeFileSync(envExampleDest, exampleEnvContent + envContent, "utf-8");
};
