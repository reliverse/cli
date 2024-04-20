import path from 'node:path';
import { execa } from 'execa';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import { fileURLToPath } from 'node:url';
import sortPackageJson from 'sort-package-json';
import fs$1 from 'node:fs';
import ora from 'ora';
import { execSync } from 'node:child_process';
import gradient from 'gradient-string';

const __filename = fileURLToPath(import.meta.url);
const distPath = path.dirname(__filename);
const PKG_ROOT = path.join(distPath, "../");
const TITLE_TEXT = `  ____  _____ _    _____      _____ ____  ____  _____
 |  _ \\| ____| |   |_ _| |  | | ____|  _ \\/ ___|| ____|
 | |_) |  _| | |    | |  |  | |  _| | |_) \\___ \\|  _|  
 |  _ <| |___| |____| |  \\  / | |___| _ <  ___) | |___ 
 |_| \\_\\_____|______|_|___\\/__|_____|_| \\_\\____/|_____|
`;
const DEFAULT_APP_NAME = "my-reliverse-app";
const CREATE_RELIVERSE = "create-reliverse";

const getEnvContent = (usingAuth, usingPrisma, usingDrizzle, usingStripe, usingLemon, databaseProvider, projectName) => {
  let content = `
# When adding additional environment variables, the schema in "/src/env.js"
# should be updated accordingly.
`.trim().concat("\n");
  if (usingPrisma)
    content += `
# Prisma
# https://prisma.io/docs/reference/database-reference/connection-urls#env
`;
  if (usingDrizzle)
    content += "\n# Drizzle\n";
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
      content += usingPrisma ? 'DATABASE_URL="file:./db.sqlite"' : 'DATABASE_URL="db.sqlite"';
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
# \u{1F7E1} OPTIONAL (MEDIUM)
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
# \u{1F7E3} INSTRUCTIONS
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
`.trim().concat("\n\n");
const envVariablesInstaller = ({
  projectDir,
  packages,
  databaseProvider,
  projectName
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
    projectName
  );
  let envFile = "";
  if (usingDb) {
    if (usingPlanetScale) {
      if (usingAuth) {
        if (usingPayments)
          envFile = "with-auth-db-planetscale-payments.js";
        else
          envFile = "with-auth-db-planetscale.js";
      } else {
        if (usingPayments)
          envFile = "with-db-planetscale-payments.js";
        else
          envFile = "with-db-planetscale.js";
      }
    } else {
      if (usingAuth) {
        if (usingPayments)
          envFile = "with-auth-db-payments.js";
        else
          envFile = "with-auth-db.js";
      } else {
        if (usingPayments)
          envFile = "with-db-payments.js";
        else
          envFile = "with-db.js";
      }
    }
  } else {
    if (usingAuth) {
      if (usingPayments)
        envFile = "with-auth-payments.js";
      else
        envFile = "with-auth.js";
    }
  }
  if (envFile !== "") {
    const envSchemaSrc = path.join(
      PKG_ROOT,
      "template/extras/src/env",
      envFile
    );
    const envFileText = fs.readFileSync(envSchemaSrc, "utf-8");
    const envSchemaDest = path.join(projectDir, "src/env.js");
    if (databaseProvider === "sqlite") {
      fs.writeFileSync(
        envSchemaDest,
        envFileText.replace("\n      .url()", ""),
        "utf-8"
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

const dependencyVersionMap = {
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
  "eslint-plugin-perfectionist": "^2.9.0"
};

const addPackageDependency = (opts) => {
  const { dependencies, devMode, projectDir } = opts;
  const pkgJson = fs.readJSONSync(
    path.join(projectDir, "package.json")
  );
  dependencies.forEach((pkgName) => {
    const version = dependencyVersionMap[pkgName];
    if (devMode && pkgJson.devDependencies) {
      pkgJson.devDependencies[pkgName] = version;
    } else if (pkgJson.dependencies) {
      pkgJson.dependencies[pkgName] = version;
    }
  });
  const sortedPkgJson = sortPackageJson(pkgJson);
  fs.writeJSONSync(path.join(projectDir, "package.json"), sortedPkgJson, {
    spaces: 2
  });
};

const nextAuthInstaller = ({
  projectDir,
  packages,
  appRouter
}) => {
  const usingPrisma = packages?.prisma.inUse;
  const usingDrizzle = packages?.drizzle.inUse;
  const deps = ["next-auth"];
  if (usingPrisma)
    deps.push("@auth/prisma-adapter");
  if (usingDrizzle)
    deps.push("@auth/drizzle-adapter");
  addPackageDependency({
    projectDir,
    dependencies: deps,
    devMode: false
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const apiHandlerFile = "src/pages/api/auth/[...nextauth].ts";
  const routeHandlerFile = "src/app/api/auth/[...nextauth]/route.ts";
  const srcToUse = appRouter ? routeHandlerFile : apiHandlerFile;
  const apiHandlerSrc = path.join(extrasDir, srcToUse);
  const apiHandlerDest = path.join(projectDir, srcToUse);
  const authConfigSrc = path.join(
    extrasDir,
    "src/core/server",
    appRouter ? "auth-app" : "auth-pages",
    usingPrisma ? "with-prisma.ts" : usingDrizzle ? "with-drizzle.ts" : "base.ts"
  );
  const authConfigDest = path.join(projectDir, "src/core/server/auth.ts");
  fs.copySync(apiHandlerSrc, apiHandlerDest);
  fs.copySync(authConfigSrc, authConfigDest);
};

const prismaInstaller = ({
  projectDir,
  packages,
  databaseProvider
}) => {
  addPackageDependency({
    projectDir,
    dependencies: ["prisma"],
    devMode: true
  });
  addPackageDependency({
    projectDir,
    dependencies: ["@prisma/client"],
    devMode: false
  });
  if (databaseProvider === "planetscale")
    addPackageDependency({
      projectDir,
      dependencies: ["@prisma/adapter-planetscale", "@planetscale/database"],
      devMode: false
    });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const schemaSrc = path.join(
    extrasDir,
    "prisma/schema",
    `${packages?.nextAuth.inUse ? "with-auth" : "base"}${databaseProvider === "planetscale" ? "-planetscale" : ""}.prisma`
  );
  let schemaText = fs.readFileSync(schemaSrc, "utf-8");
  if (databaseProvider !== "sqlite") {
    schemaText = schemaText.replace(
      'provider = "sqlite"',
      `provider = "${{
        mysql: "mysql",
        postgres: "postgresql",
        planetscale: "mysql"
      }[databaseProvider]}"`
    );
    if (["mysql", "planetscale"].includes(databaseProvider)) {
      schemaText = schemaText.replace("// @db.Text", "@db.Text");
    }
  }
  const schemaDest = path.join(projectDir, "prisma/schema.prisma");
  fs.mkdirSync(path.dirname(schemaDest), { recursive: true });
  fs.writeFileSync(schemaDest, schemaText);
  const clientSrc = path.join(
    extrasDir,
    databaseProvider === "planetscale" ? "src/core/server/db/db-prisma-planetscale.ts" : "src/core/server/db/db-prisma.ts"
  );
  const clientDest = path.join(projectDir, "src/core/server/db.ts");
  const packageJsonPath = path.join(projectDir, "package.json");
  const packageJsonContent = fs.readJSONSync(packageJsonPath);
  packageJsonContent.scripts = {
    ...packageJsonContent.scripts,
    postinstall: "prisma generate",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  };
  fs.copySync(clientSrc, clientDest);
  fs.writeJSONSync(packageJsonPath, packageJsonContent, {
    spaces: 2
  });
};

const tailwindInstaller = ({ projectDir }) => {
  addPackageDependency({
    projectDir,
    dependencies: [
      "tailwindcss",
      "postcss",
      "prettier",
      "prettier-plugin-tailwindcss"
    ],
    devMode: true
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const twCfgSrc = path.join(extrasDir, "config/tailwind.config.ts");
  const twCfgDest = path.join(projectDir, "tailwind.config.ts");
  const postcssCfgSrc = path.join(extrasDir, "config/postcss.config.cjs");
  const postcssCfgDest = path.join(projectDir, "postcss.config.cjs");
  const prettierSrc = path.join(extrasDir, "config/_prettier.config.js");
  const prettierDest = path.join(projectDir, "prettier.config.js");
  const cssSrc = path.join(extrasDir, "src/core/styles/globals.css");
  const cssDest = path.join(projectDir, "src/core/styles/globals.css");
  fs.copySync(twCfgSrc, twCfgDest);
  fs.copySync(postcssCfgSrc, postcssCfgDest);
  fs.copySync(cssSrc, cssDest);
  fs.copySync(prettierSrc, prettierDest);
};

const trpcInstaller = ({
  projectDir,
  packages,
  appRouter
}) => {
  addPackageDependency({
    projectDir,
    dependencies: [
      "@tanstack/react-query",
      "superjson",
      "@trpc/server",
      "@trpc/client",
      "@trpc/next",
      "@trpc/react-query"
    ],
    devMode: false
  });
  const usingAuth = packages?.nextAuth.inUse;
  const usingPrisma = packages?.prisma.inUse;
  const usingDrizzle = packages?.drizzle.inUse;
  const usingDb = usingPrisma || usingDrizzle;
  const usingTailwind = packages?.tailwind.inUse;
  const usingShadcn = packages?.shadcn.inUse;
  const usingComponents = packages?.components.inUse;
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const apiHandlerFile = "src/pages/api/trpc/[trpc].ts";
  const routeHandlerFile = "src/app/api/trpc/[trpc]/route.ts";
  const srcToUse = appRouter ? routeHandlerFile : apiHandlerFile;
  const apiHandlerSrc = path.join(extrasDir, srcToUse);
  const apiHandlerDest = path.join(projectDir, srcToUse);
  const trpcFile = usingAuth && usingDb ? "with-auth-db.ts" : usingAuth ? "with-auth.ts" : usingDb ? "with-db.ts" : "base.ts";
  const trpcSrc = path.join(
    extrasDir,
    "src/core/server/api",
    appRouter ? "trpc-app" : "trpc-pages",
    trpcFile
  );
  const trpcDest = path.join(projectDir, "src/core/server/api/trpc.ts");
  const rootRouterSrc = path.join(extrasDir, "src/core/server/api/root.ts");
  const rootRouterDest = path.join(projectDir, "src/core/server/api/root.ts");
  const exampleRouterFile = usingAuth && usingPrisma ? "with-auth-prisma.ts" : usingAuth && usingDrizzle ? "with-auth-drizzle.ts" : usingAuth ? "with-auth.ts" : usingPrisma ? "with-prisma.ts" : usingDrizzle ? "with-drizzle.ts" : "base.ts";
  const exampleRouterSrc = path.join(
    extrasDir,
    "src/core/server/api/routers/post",
    exampleRouterFile
  );
  const exampleRouterDest = path.join(
    projectDir,
    "src/core/server/api/routers/post.ts"
  );
  const copySrcDest = [
    [apiHandlerSrc, apiHandlerDest],
    [trpcSrc, trpcDest],
    [rootRouterSrc, rootRouterDest],
    [exampleRouterSrc, exampleRouterDest]
  ];
  if (appRouter) {
    addPackageDependency({
      dependencies: ["server-only"],
      devMode: false,
      projectDir
    });
    const trpcDir = path.join(extrasDir, "src/core/utils/trpc");
    copySrcDest.push(
      [
        path.join(trpcDir, "server.ts"),
        path.join(projectDir, "src/core/utils/trpc/server.ts")
      ],
      [
        path.join(trpcDir, "react.tsx"),
        path.join(projectDir, "src/core/utils/trpc/react.tsx")
      ],
      [
        path.join(
          extrasDir,
          "src/components",
          usingShadcn || usingComponents ? "create-post-shadcn.tsx" : usingTailwind ? "create-post-tw.tsx" : "create-post.tsx"
        ),
        path.join(projectDir, "src/components/create-post.tsx")
      ]
    );
    if (!(usingTailwind || usingShadcn || usingComponents)) {
      copySrcDest.push([
        path.join(extrasDir, "src/components", "index.module.css"),
        path.join(projectDir, "src/components/index.module.css")
      ]);
    }
  } else {
    const utilsSrc = path.join(extrasDir, "src/utils/api.ts");
    const utilsDest = path.join(projectDir, "src/utils/api.ts");
    copySrcDest.push([utilsSrc, utilsDest]);
  }
  copySrcDest.forEach(([src, dest]) => {
    fs.copySync(src, dest);
  });
};

const biomeInstaller = ({ projectDir }) => {
  addPackageDependency({
    projectDir,
    dependencies: ["@biomejs/biome"],
    devMode: true
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const biomeSrc = path.join(extrasDir, "config/biome.json");
  const biomeDest = path.join(projectDir, "biome.json");
  fs.copySync(biomeSrc, biomeDest);
};

const componentsInstaller = ({ projectDir }) => {
  addPackageDependency({
    projectDir,
    dependencies: [
      "postcss",
      "tailwindcss",
      "lucide-react",
      "tailwind-merge",
      "tailwindcss-animate",
      "@radix-ui/react-slot",
      "class-variance-authority"
    ],
    devMode: true
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const twCfgSrc = path.join(extrasDir, "shadcn/tailwind.config.ts");
  const twCfgDest = path.join(projectDir, "tailwind.config.ts");
  const postcssCfgSrc = path.join(extrasDir, "config/postcss.config.cjs");
  const postcssCfgDest = path.join(projectDir, "postcss.config.cjs");
  const cssSrc = path.join(extrasDir, "shadcn/globals.css");
  const cssDest = path.join(projectDir, "src/core/styles/globals.css");
  const shadcnCfgSrc = path.join(extrasDir, "shadcn/components.json");
  const shadcnCfgDest = path.join(projectDir, "components.json");
  const utilsSrc = path.join(extrasDir, "shadcn/utils/ui.ts");
  const utilsDest = path.join(projectDir, "src/core/utils/ui.ts");
  const shadcnComponentsSrc = path.join(extrasDir, "shadcn/components");
  const shadcnComponentsDest = path.join(projectDir, "src/components");
  fs.copySync(twCfgSrc, twCfgDest);
  fs.copySync(postcssCfgSrc, postcssCfgDest);
  fs.copySync(cssSrc, cssDest);
  fs.copySync(shadcnCfgSrc, shadcnCfgDest);
  fs.copySync(utilsSrc, utilsDest);
  fs.copySync(shadcnComponentsSrc, shadcnComponentsDest);
};

const dbContainerInstaller = ({
  projectDir,
  databaseProvider,
  projectName
}) => {
  const scriptSrc = path.join(
    PKG_ROOT,
    `template/extras/scripts/${databaseProvider}.sh`
  );
  const scriptText = fs$1.readFileSync(scriptSrc, "utf-8");
  const scriptDest = path.join(projectDir, `${databaseProvider}.sh`);
  fs$1.writeFileSync(scriptDest, scriptText.replaceAll("project1", projectName));
  fs$1.chmodSync(scriptDest, "755");
};

const drizzleInstaller = ({
  projectDir,
  packages,
  scopedAppName,
  databaseProvider
}) => {
  const devPackages = [
    "drizzle-kit",
    "eslint-plugin-drizzle"
  ];
  if (databaseProvider === "planetscale")
    devPackages.push("mysql2");
  if (databaseProvider === "sqlite")
    devPackages.push("@types/better-sqlite3");
  if (databaseProvider === "postgres")
    devPackages.push("pg");
  addPackageDependency({
    projectDir,
    dependencies: devPackages,
    devMode: true
  });
  addPackageDependency({
    projectDir,
    dependencies: [
      "drizzle-orm",
      {
        planetscale: "@planetscale/database",
        mysql: "mysql2",
        postgres: "postgres",
        sqlite: "better-sqlite3"
      }[databaseProvider]
    ],
    devMode: false
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const configFile = path.join(
    extrasDir,
    `config/drizzle-config-${databaseProvider === "planetscale" ? "mysql" : databaseProvider}.ts`
  );
  const configDest = path.join(projectDir, "drizzle.config.ts");
  const schemaSrc = path.join(
    extrasDir,
    "src/core/server/db/schema-drizzle",
    packages?.nextAuth.inUse ? `with-auth-${databaseProvider}.ts` : `base-${databaseProvider}.ts`
  );
  const schemaDest = path.join(projectDir, "src/core/server/db/schema.ts");
  let schemaContent = fs.readFileSync(schemaSrc, "utf-8");
  schemaContent = schemaContent.replace(
    "project1_${name}",
    `${scopedAppName}_\${name}`
  );
  let configContent = fs.readFileSync(configFile, "utf-8");
  configContent = configContent.replace("project1_*", `${scopedAppName}_*`);
  const clientSrc = path.join(
    extrasDir,
    `src/core/server/db/index-drizzle/with-${databaseProvider}.ts`
  );
  const clientDest = path.join(projectDir, "src/core/server/db/index.ts");
  const packageJsonPath = path.join(projectDir, "package.json");
  const packageJsonContent = fs.readJSONSync(packageJsonPath);
  packageJsonContent.scripts = {
    ...packageJsonContent.scripts,
    "db:push": `drizzle-kit push:${{
      postgres: "pg",
      sqlite: "sqlite",
      mysql: "mysql",
      planetscale: "mysql"
    }[databaseProvider]}`,
    "db:studio": "drizzle-kit studio"
  };
  fs.copySync(configFile, configDest);
  fs.mkdirSync(path.dirname(schemaDest), { recursive: true });
  fs.writeFileSync(schemaDest, schemaContent);
  fs.writeFileSync(configDest, configContent);
  fs.copySync(clientSrc, clientDest);
  fs.writeJSONSync(packageJsonPath, packageJsonContent, {
    spaces: 2
  });
};

/** @type {import("eslint").Linter.Config} */
const _initialConfig = {
	parser: "@typescript-eslint/parser",
	parserOptions: { project: true },
	plugins: ["@typescript-eslint"],
	extends: [
		"next/core-web-vitals",
		"plugin:@typescript-eslint/recommended-type-checked",
		"plugin:@typescript-eslint/stylistic-type-checked",
	],
	rules: {
		"@typescript-eslint/array-type": "off",
		"@typescript-eslint/consistent-type-definitions": "off",
		"@typescript-eslint/consistent-type-imports": [
			"warn",
			{ prefer: "type-imports", fixStyle: "inline-type-imports" },
		],
		"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
		"@typescript-eslint/require-await": "off",
		"@typescript-eslint/no-misused-promises": [
			"error",
			{ checksVoidReturn: { attributes: false } },
		],
	},
};

const dynamicEslintInstaller = ({ projectDir, packages }) => {
  const usingDrizzle = !!packages?.drizzle?.inUse;
  const usingOthers = !!packages?.others?.inUse;
  const eslintConfig = getEslintConfig({ usingDrizzle, usingOthers });
  const eslintrcFileContents = [
    '/** @type {import("eslint").Linter.Config} */',
    `const config = ${JSON.stringify(eslintConfig, null, 2)}`,
    "module.exports = config;"
  ].join("\n");
  const eslintConfigDest = path.join(projectDir, ".eslintrc.cjs");
  fs.writeFileSync(eslintConfigDest, eslintrcFileContents, "utf-8");
};
const getEslintConfig = ({
  usingDrizzle,
  usingOthers
}) => {
  const eslintConfig = _initialConfig;
  if (usingDrizzle) {
    eslintConfig.plugins = [...eslintConfig.plugins ?? [], "drizzle"];
    eslintConfig.rules = {
      ...eslintConfig.rules,
      "drizzle/enforce-delete-with-where": [
        "error",
        { drizzleObjectName: ["db"] }
      ],
      "drizzle/enforce-update-with-where": [
        "error",
        { drizzleObjectName: ["db"] }
      ]
    };
  }
  if (usingOthers) {
    eslintConfig.plugins = [...eslintConfig.plugins ?? [], "perfectionist"];
    eslintConfig.rules = {
      ...eslintConfig.rules,
      "perfectionist/sort-interfaces": "warn"
    };
  }
  return eslintConfig;
};

const lemonSqueezyInstaller = ({ projectDir, appRouter }) => {
  addPackageDependency({
    projectDir,
    dependencies: ["@lemonsqueezy/lemonsqueezy.js"],
    devMode: false
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  if (appRouter) {
    const configSrc = path.join(extrasDir, "src/app/api/lemon/route.ts");
    const configDest = path.join(projectDir, "src/app/api/lemon/route.ts");
    fs.copySync(configSrc, configDest);
  } else {
    const configSrc = path.join(extrasDir, "src/pages/api/lemon/index.ts");
    const configDest = path.join(projectDir, "src/pages/api/lemon/index.ts");
    fs.copySync(configSrc, configDest);
  }
};

const copyFile$1 = (srcDir, destDir, fileName) => {
  const srcFile = path.join(srcDir, fileName);
  const destFile = path.join(destDir, fileName);
  fs.copySync(srcFile, destFile);
};
const copyDirectory$1 = (srcDir, destDir) => {
  fs.copySync(srcDir, destDir);
};
const nextInternationalInstaller = ({
  projectDir,
  appRouter
}) => {
  addPackageDependency({
    projectDir,
    dependencies: ["next-international"],
    devMode: false
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const projectSrcDir = path.join(projectDir, "src");
  copyFile$1(path.join(extrasDir, "src"), projectSrcDir, "i18n.ts");
  const i18nSrcDir = path.join(extrasDir, "src/i18n");
  const i18nDestDir = path.join(projectSrcDir, "i18n");
  copyDirectory$1(i18nSrcDir, i18nDestDir);
  if (appRouter) {
    copyFile$1(path.join(extrasDir, "src"), projectSrcDir, "middleware.ts");
    copyFile$1(path.join(extrasDir, "src"), projectSrcDir, "navigation.ts");
  }
};

const copyFile = (srcDir, destDir, fileName) => {
  const srcFile = path.join(srcDir, fileName);
  const destFile = path.join(destDir, fileName);
  fs.copySync(srcFile, destFile);
};
const copyDirectory = (srcDir, destDir) => {
  fs.copySync(srcDir, destDir);
};
const nextIntlInstaller = ({ projectDir, appRouter }) => {
  addPackageDependency({
    projectDir,
    dependencies: ["next-intl"],
    devMode: false
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const projectSrcDir = path.join(projectDir, "src");
  copyFile(path.join(extrasDir, "src"), projectSrcDir, "i18n.ts");
  const i18nSrcDir = path.join(extrasDir, "src/i18n");
  const i18nDestDir = path.join(projectSrcDir, "i18n");
  copyDirectory(i18nSrcDir, i18nDestDir);
  if (appRouter) {
    copyFile(path.join(extrasDir, "src"), projectSrcDir, "middleware.ts");
    copyFile(path.join(extrasDir, "src"), projectSrcDir, "navigation.ts");
  }
};

const othersInstaller = ({ projectDir }) => {
  addPackageDependency({
    projectDir,
    dependencies: ["knip", "eslint-plugin-perfectionist"],
    devMode: true
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const knipCfgSrc = path.join(extrasDir, "others/knip.json");
  const knipCfgDest = path.join(projectDir, "knip.json");
  fs.copySync(knipCfgSrc, knipCfgDest);
};

const prettierInstaller = ({ projectDir }) => {
  addPackageDependency({
    projectDir,
    dependencies: ["prettier"],
    devMode: true
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const prettierSrc = path.join(extrasDir, "config/_prettier.config.js");
  const prettierDest = path.join(projectDir, "prettier.config.js");
  fs.copySync(prettierSrc, prettierDest);
};

const shadcnInstaller = ({ projectDir }) => {
  addPackageDependency({
    projectDir,
    dependencies: [
      "postcss",
      "tailwindcss",
      "lucide-react",
      "tailwind-merge",
      "tailwindcss-animate",
      "@radix-ui/react-slot",
      "class-variance-authority"
    ],
    devMode: true
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const twCfgSrc = path.join(extrasDir, "shadcn/tailwind.config.ts");
  const twCfgDest = path.join(projectDir, "tailwind.config.ts");
  const postcssCfgSrc = path.join(extrasDir, "config/postcss.config.cjs");
  const postcssCfgDest = path.join(projectDir, "postcss.config.cjs");
  const cssSrc = path.join(extrasDir, "shadcn/globals.css");
  const cssDest = path.join(projectDir, "src/core/styles/globals.css");
  const shadcnCfgSrc = path.join(extrasDir, "shadcn/components.json");
  const shadcnCfgDest = path.join(projectDir, "components.json");
  const utilsSrc = path.join(extrasDir, "shadcn/utils/ui.ts");
  const utilsDest = path.join(projectDir, "src/core/utils/ui.ts");
  const primitivesSrc = path.join(
    extrasDir,
    "shadcn/components/primitives/button.tsx"
  );
  const primitivesDest = path.join(
    projectDir,
    "components/primitives/button.tsx"
  );
  fs.copySync(twCfgSrc, twCfgDest);
  fs.copySync(postcssCfgSrc, postcssCfgDest);
  fs.copySync(cssSrc, cssDest);
  fs.copySync(shadcnCfgSrc, shadcnCfgDest);
  fs.copySync(primitivesSrc, primitivesDest);
  fs.copySync(utilsSrc, utilsDest);
};

const stripeInstaller = ({ projectDir, appRouter }) => {
  addPackageDependency({
    projectDir,
    dependencies: ["@stripe/stripe-js"],
    devMode: false
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  if (appRouter) {
    const configSrc = path.join(extrasDir, "src/app/api/stripe/route.ts");
    const configDest = path.join(projectDir, "src/app/api/stripe/route.ts");
    fs.copySync(configSrc, configDest);
  } else {
    const configSrc = path.join(extrasDir, "src/pages/api/stripe/index.ts");
    const configDest = path.join(projectDir, "src/pages/api/stripe/index.ts");
    fs.copySync(configSrc, configDest);
  }
};

const testingInstaller = ({ projectDir }) => {
  addPackageDependency({
    projectDir,
    dependencies: ["knip", "eslint-plugin-perfectionist", "jsdom", "vitest"],
    devMode: true
  });
  const extrasDir = path.join(PKG_ROOT, "template/extras");
  const vitestCfgSrc = path.join(extrasDir, "src/core/tests/vitest.config.ts");
  const vitestCfgDest = path.join(projectDir, "vitest.config.ts");
  const exampleTestSrc = path.join(extrasDir, "src/core/tests/example.test.ts");
  const exampleTestDest = path.join(
    projectDir,
    "src/core/tests/example.test.ts"
  );
  fs.copySync(vitestCfgSrc, vitestCfgDest);
  fs.copySync(exampleTestSrc, exampleTestDest);
};

const databaseProviders = [
  "mysql",
  "postgres",
  "sqlite",
  "planetscale"
];
const buildPkgInstallerMap = (packages, databaseProvider) => ({
  nextAuth: {
    inUse: packages.includes("nextAuth"),
    installer: nextAuthInstaller
  },
  prisma: {
    inUse: packages.includes("prisma"),
    installer: prismaInstaller
  },
  drizzle: {
    inUse: packages.includes("drizzle"),
    installer: drizzleInstaller
  },
  prettier: {
    inUse: packages.includes("prettier"),
    installer: prettierInstaller
  },
  biome: {
    inUse: packages.includes("biome"),
    installer: biomeInstaller
  },
  tailwind: {
    inUse: packages.includes("tailwind"),
    installer: tailwindInstaller
  },
  shadcn: {
    inUse: packages.includes("shadcn"),
    installer: shadcnInstaller
  },
  trpc: {
    inUse: packages.includes("trpc"),
    installer: trpcInstaller
  },
  dbContainer: {
    inUse: ["mysql", "postgres"].includes(databaseProvider),
    installer: dbContainerInstaller
  },
  envVariables: {
    inUse: true,
    installer: envVariablesInstaller
  },
  eslint: {
    inUse: true,
    installer: dynamicEslintInstaller
  },
  nextIntl: {
    inUse: packages.includes("nextIntl"),
    installer: nextIntlInstaller
  },
  nextInternational: {
    inUse: packages.includes("nextInternational"),
    installer: nextInternationalInstaller
  },
  stripe: {
    inUse: packages.includes("nextIntl"),
    installer: stripeInstaller
  },
  lemonSqueezy: {
    inUse: packages.includes("lemonSqueezy"),
    installer: lemonSqueezyInstaller
  },
  components: {
    inUse: packages.includes("components"),
    installer: componentsInstaller
  },
  testing: {
    inUse: packages.includes("testing"),
    installer: testingInstaller
  },
  others: {
    inUse: packages.includes("others"),
    installer: othersInstaller
  }
});

const getUserPkgManager = () => {
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent) {
    if (userAgent.startsWith("yarn")) {
      return "yarn";
    } else if (userAgent.startsWith("pnpm")) {
      return "pnpm";
    } else if (userAgent.startsWith("bun")) {
      return "bun";
    } else {
      return "npm";
    }
  } else {
    return "npm";
  }
};

const getVersion = () => {
  const packageJsonPath = path.join(PKG_ROOT, "package.json");
  const packageJsonContent = fs.readJSONSync(packageJsonPath);
  return packageJsonContent.version ?? "1.0.0";
};

class IsTTYError extends Error {
  constructor(msg) {
    super(`Error: ${msg}`);
  }
}

const logger = {
  error(...args) {
    console.log(chalk.red(...args));
  },
  warn(...args) {
    console.log(chalk.yellow(...args));
  },
  info(...args) {
    console.log(chalk.cyan(...args));
  },
  success(...args) {
    console.log(chalk.green(...args));
  }
};

const removeTrailingSlash = (input) => {
  if (input.length > 1 && input.endsWith("/")) {
    return input.slice(0, -1);
  }
  return input;
};

const validationRegExp = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const validateAppName = (rawInput) => {
  const input = removeTrailingSlash(rawInput);
  const paths = input.split("/");
  const indexOfDelimiter = paths.findIndex((p) => p.startsWith("@"));
  let appName = paths[paths.length - 1];
  if (paths.findIndex((p) => p.startsWith("@")) !== -1) {
    appName = paths.slice(indexOfDelimiter).join("/");
  }
  if (input === "." || validationRegExp.test(appName ?? "")) {
    return;
  } else {
    return "App name must consist of only lowercase alphanumeric characters, '-', and '_'";
  }
};

const validateImportAlias = (input) => {
  if (input.startsWith(".") || input.startsWith("/")) {
    return "Import alias can't start with '.' or '/'";
  }
  return;
};

const defaultOptions = {
  appName: DEFAULT_APP_NAME,
  packages: ["nextAuth", "prisma", "tailwind", "trpc"],
  flags: {
    noGit: false,
    noInstall: false,
    default: false,
    CI: false,
    tailwind: false,
    trpc: false,
    prisma: false,
    drizzle: false,
    nextAuth: false,
    importAlias: "~/",
    appRouter: false,
    nextIntl: false,
    nextInternational: false,
    stripe: false,
    lemonSqueezy: false,
    shadcn: false,
    prettier: false,
    biome: false,
    testing: false,
    others: false
  },
  databaseProvider: "sqlite",
  styling: "none",
  i18n: "none",
  formatter: "prettier",
  paymentProvider: "none",
  template: "versator"
};
const runCli = async () => {
  const cliResults = defaultOptions;
  const program = new Command().name(CREATE_RELIVERSE).description("A CLI for creating web applications with the Reliverse stack").arguments(
    "[dir]"
    // "The name of the application, as well as the name of the directory to create",
  ).option(
    "--noGit",
    "Explicitly tell the CLI to not initialize a new git repo in the project",
    false
  ).option(
    "--noInstall",
    "Explicitly tell the CLI to not run the package manager's install command",
    false
  ).option(
    "-y, --default",
    "Bypass the CLI and use all default options to bootstrap a new Reliverse app",
    false
  ).option("--CI", "Boolean value if we're running in CI", false).option(
    "--tailwind [boolean]",
    "Experimental: Boolean value if we should install Tailwind CSS. Must be used in conjunction with `--CI`.",
    (value) => !!value && value !== "false"
  ).option(
    "--nextAuth [boolean]",
    "Experimental: Boolean value if we should install NextAuth.js. Must be used in conjunction with `--CI`.",
    (value) => !!value && value !== "false"
  ).option(
    "--prisma [boolean]",
    "Experimental: Boolean value if we should install Prisma. Must be used in conjunction with `--CI`.",
    (value) => !!value && value !== "false"
  ).option(
    "--drizzle [boolean]",
    "Experimental: Boolean value if we should install Drizzle. Must be used in conjunction with `--CI`.",
    (value) => !!value && value !== "false"
  ).option(
    "--trpc [boolean]",
    "Experimental: Boolean value if we should install tRPC. Must be used in conjunction with `--CI`.",
    (value) => !!value && value !== "false"
  ).option(
    "-i, --import-alias",
    "Explicitly tell the CLI to use a custom import alias",
    defaultOptions.flags.importAlias
  ).option(
    "--dbProvider [provider]",
    `Choose a database provider to use. Possible values: ${databaseProviders.join(
      ", "
    )}`,
    defaultOptions.flags.importAlias
  ).option(
    "--appRouter [boolean]",
    "Explicitly tell the CLI to use the new Next.js app router",
    (value) => !!value && value !== "false"
  ).version(getVersion(), "-v, --version", "Display the version number").addHelpText(
    "afterAll",
    `
 The Reliverse stack was built by ${chalk.hex("#E8DCFF").bold(
      "@blefnk"
    )} and has been used to build awesome fullstack applications like ${chalk.hex("#E24A8D").underline("https://github.com/blefnk/versator")} 
`
  ).parse(process.argv);
  if (process.env.npm_config_user_agent?.startsWith("yarn/3")) {
    logger.warn(`  WARNING: It looks like you are using Yarn 3. This is currently not supported,
  and likely to result in a crash. Please run create-reliverse with another
  package manager such as pnpm, npm, or Yarn Classic.`);
  }
  const cliProvidedName = program.args[0];
  if (cliProvidedName) {
    cliResults.appName = cliProvidedName;
  }
  cliResults.flags = program.opts();
  if (cliResults.flags.CI) {
    cliResults.packages = [];
    if (cliResults.flags.trpc)
      cliResults.packages.push("trpc");
    if (cliResults.flags.tailwind)
      cliResults.packages.push("tailwind");
    if (cliResults.flags.prisma)
      cliResults.packages.push("prisma");
    if (cliResults.flags.drizzle)
      cliResults.packages.push("drizzle");
    if (cliResults.flags.nextAuth)
      cliResults.packages.push("nextAuth");
    if (cliResults.flags.prisma && cliResults.flags.drizzle) {
      logger.warn("Incompatible combination Prisma + Drizzle. Exiting.");
      process.exit(0);
    }
    cliResults.databaseProvider = cliResults.packages.includes("drizzle") ? "planetscale" : "sqlite";
    return cliResults;
  }
  if (cliResults.flags.default) {
    return cliResults;
  }
  try {
    if (process.env.TERM_PROGRAM?.toLowerCase().includes("mintty")) {
      logger.warn(`  WARNING: It looks like you are using MinTTY, which is non-interactive. This is most likely because you are 
  using Git Bash. If that's that case, please use Git Bash from another terminal, such as Windows Terminal. Alternatively, you 
  can provide the arguments from the CLI directly: https://docs.bleverse.com/en/installation#experimental-usage to skip the prompts.`);
      throw new IsTTYError("Non-interactive environment");
    }
    const pkgManager = getUserPkgManager();
    const project = await p.group(
      {
        ...!cliProvidedName && {
          name: () => p.text({
            message: "[1/18] How your project be called?",
            defaultValue: cliProvidedName,
            validate: validateAppName
          })
        },
        language: () => {
          return p.select({
            message: "[2/18] Will you be using TypeScript or JavaScript?",
            options: [
              { value: "typescript", label: "TypeScript" },
              { value: "javascript", label: "JavaScript" }
            ],
            initialValue: "typescript"
          });
        },
        _: ({ results }) => results.language === "javascript" ? p.note(
          chalk.dim(
            "JS-only support is coming soon.\nLet's use TypeScript instead! \u{1F680}"
          )
        ) : void 0,
        monorepo: () => {
          return p.select({
            message: `${chalk.bgGray(
              " OPTIONAL "
            )} [3/18] Would you like to have a regular repo or a monorepo?`,
            options: [
              { value: "regular", label: "Regular" },
              { value: "monorepo", label: "Monorepo" }
            ],
            initialValue: "regular"
          });
        },
        styling: () => {
          return p.select({
            message: "[4/18] What do you want to use for styling?",
            options: [
              { value: "none", label: "Only CSS" },
              { value: "tailwind", label: "Tailwind" },
              { value: "shadcn", label: "Tailwind - Shadcn" },
              { value: "components", label: "Tailwind - Shadcn - Components" }
            ],
            initialValue: "none"
          });
        },
        trpc: () => {
          return p.confirm({
            message: "[5/18] Would you like to use tRPC?"
          });
        },
        authentication: () => {
          return p.select({
            message: "[6/18] What auth provider would you like to use? (clerk, supabase, lucia are coming soon)",
            options: [
              { value: "none", label: "None" },
              { value: "next-auth", label: "NextAuth.js" }
              // TODO: Implement Clerk as auth provider
              // { value: "clerk", label: "Clerk" },
              // TODO: Implement Supabase as auth provider
              // { value: "supabase", label: "Supabase" },
              // TODO: Implement Lucia as auth provider
              // { value: "lucia-auth", label: "Lucia" },
            ],
            initialValue: "none"
          });
        },
        database: () => {
          return p.select({
            message: "[7/18] What database ORM would you like to use?",
            options: [
              { value: "none", label: "None" },
              { value: "prisma", label: "Prisma" },
              { value: "drizzle", label: "Drizzle" }
            ],
            initialValue: "none"
          });
        },
        appRouter: () => {
          return p.confirm({
            message: `${chalk.bgCyan(
              " RECOMMENDED "
            )} [8/18] Would you like to use Next.js App Router?`,
            initialValue: true
          });
        },
        i18n: () => {
          return p.select({
            message: "[9/18] What internationalization library would you like to use?",
            options: [
              { value: "none", label: "None" },
              { value: "next-intl", label: "next-intl" },
              { value: "next-international", label: "next-international" }
            ],
            initialValue: "none"
          });
        },
        paymentProvider: () => {
          return p.select({
            message: "[10/18] What payment provider would you like to use?",
            options: [
              { value: "none", label: "None" },
              { value: "stripe", label: "Stripe" },
              { value: "lemon-squeezy", label: "LemonSqueezy" }
            ],
            initialValue: "none"
          });
        },
        formatter: () => {
          return p.select({
            message: "[11/18] What formatter would you like to use?",
            options: [
              { value: "none", label: "None" },
              { value: "prettier", label: "Prettier" },
              { value: "biome", label: "Biome" }
            ],
            initialValue: "none"
          });
        },
        databaseProvider: ({ results }) => {
          if (results.database === "none")
            return;
          return p.select({
            message: "[12/18] What database provider would you like to use?",
            options: [
              { value: "sqlite", label: "SQLite" },
              { value: "mysql", label: "MySQL" },
              { value: "postgres", label: "PostgreSQL" },
              { value: "planetscale", label: "PlanetScale" }
            ],
            initialValue: "sqlite"
          });
        },
        testing: () => {
          return p.confirm({
            message: `${chalk.bgGray(
              " ADVANCED "
            )} [13/18] Would you like to install Vitest and add some testing files?`,
            initialValue: false
          });
        },
        template: () => {
          return p.select({
            message: "[14/18] What template/cms would you like to use?",
            options: [
              { value: "versator", label: "versator/relivator" },
              { value: "create-t3-app", label: "create-t3-app" },
              { value: "create-vite", label: "[soon] create-vite" },
              { value: "create-remix", label: "[soon] create-remix" },
              { value: "create-next-app", label: "[soon] create-next-app" },
              { value: "create-medusa-app", label: "[soon] create-medusa-app" },
              { value: "create-strapi-app", label: "[soon] create-strapi-app" },
              {
                value: "create-payload-app",
                label: "[soon] create-payload-app"
              }
            ],
            initialValue: "versator"
          });
        },
        others: () => {
          return p.confirm({
            message: `${chalk.bgCyan(
              " RECOMMENDED "
            )} [15/18] Would you like to install Knip and eslint-plugin-perfectionist?`,
            initialValue: true
          });
        },
        ...!cliResults.flags.noGit && {
          git: () => {
            return p.confirm({
              message: "[16/18] Should we init a Git repo and stage changes?",
              initialValue: !defaultOptions.flags.noGit
            });
          }
        },
        ...!cliResults.flags.noInstall && {
          install: () => {
            return p.confirm({
              message: `[17/18] Should we run '${pkgManager}${pkgManager === "yarn" ? `'?` : ` install' for you?`}`,
              initialValue: !defaultOptions.flags.noInstall
            });
          }
        },
        importAlias: () => {
          return p.text({
            message: "[18/18] What import alias would you like to use?",
            defaultValue: defaultOptions.flags.importAlias,
            placeholder: defaultOptions.flags.importAlias,
            validate: validateImportAlias
          });
        }
      },
      {
        onCancel() {
          process.exit(1);
        }
      }
    );
    const packages = [];
    if (project.testing)
      packages.push("testing");
    if (project.others)
      packages.push("others");
    if (project.styling === "components")
      packages.push("components");
    if (project.styling === "tailwind")
      packages.push("tailwind");
    if (project.styling === "shadcn")
      packages.push("shadcn");
    if (project.trpc)
      packages.push("trpc");
    if (project.authentication === "next-auth")
      packages.push("nextAuth");
    if (project.database === "prisma")
      packages.push("prisma");
    if (project.database === "drizzle")
      packages.push("drizzle");
    if (project.i18n === "next-intl")
      packages.push("nextIntl");
    if (project.i18n === "next-international")
      packages.push("nextInternational");
    if (project.paymentProvider === "stripe")
      packages.push("stripe");
    if (project.paymentProvider === "lemon-squeezy")
      packages.push("lemonSqueezy");
    if (project.formatter === "biome")
      packages.push("biome");
    if (project.formatter === "prettier")
      packages.push("prettier");
    return {
      appName: project.name ?? cliResults.appName,
      packages,
      databaseProvider: project.databaseProvider || "sqlite",
      styling: project.styling,
      i18n: project.i18n,
      paymentProvider: project.paymentProvider,
      formatter: project.formatter,
      template: project.template,
      flags: {
        ...cliResults.flags,
        appRouter: project.appRouter ?? cliResults.flags.appRouter,
        noGit: !project.git || cliResults.flags.noGit,
        noInstall: !project.install || cliResults.flags.noInstall,
        importAlias: project.importAlias ?? cliResults.flags.importAlias
      }
    };
  } catch (err) {
    if (err instanceof IsTTYError) {
      logger.warn(`
  ${CREATE_RELIVERSE} needs an interactive terminal to provide options`);
      const shouldContinue = await p.confirm({
        message: "Continue scaffolding a default Reliverse app?",
        initialValue: true
      });
      if (!shouldContinue) {
        logger.info("Exiting...");
        process.exit(0);
      }
      logger.info(
        `Bootstrapping a default Reliverse app in ./${cliResults.appName}`
      );
    } else {
      throw err;
    }
  }
  return cliResults;
};

const installPackages = (options) => {
  const { packages, projectDir, projectName } = options;
  logger.info("Adding boilerplate...");
  const installedPackages = [];
  for (const [name, pkgOpts] of Object.entries(packages)) {
    if (pkgOpts.inUse) {
      const spinner = ora(`Boilerplating ${name}...`).start();
      pkgOpts.installer(options);
      spinner.succeed(
        chalk.green(
          `Successfully setup boilerplate for ${chalk.green.bold(name)}`
        )
      );
      installedPackages.push(name);
    }
  }
  logger.info("");
  const readmePath = path.join(projectDir, "README.md");
  const output = `## Generated output

\u2714 ${projectName} scaffolded successfully with Reliverse CLI!

\u2714 Successfully setup boilerplate for ${installedPackages.join(", ")}.

If you encounter any issues, please open an issue! Remember to fill the .env file.`;
  fs$1.appendFileSync(readmePath, `
${output}
`);
};

const scaffoldProject = async ({
  projectName,
  projectDir,
  pkgManager,
  noInstall
}) => {
  const srcDir = path.join(PKG_ROOT, "template/base");
  if (!noInstall) {
    logger.info(`
Using: ${chalk.cyan.bold(pkgManager)}
`);
  } else {
    logger.info("");
  }
  const spinner = ora(`Scaffolding in: ${projectDir}...
`).start();
  if (fs.existsSync(projectDir)) {
    if (fs.readdirSync(projectDir).length === 0) {
      if (projectName !== ".")
        spinner.info(
          `${chalk.cyan.bold(
            projectName
          )} exists but is empty, continuing...
`
        );
    } else {
      spinner.stopAndPersist();
      const overwriteDir = await p.select({
        message: `${chalk.redBright.bold("Warning:")} ${chalk.cyan.bold(
          projectName
        )} already exists and isn't empty. How would you like to proceed?`,
        options: [
          {
            label: "Abort installation (recommended)",
            value: "abort"
          },
          {
            label: "Clear the directory and continue installation",
            value: "clear"
          },
          {
            label: "Continue installation and overwrite conflicting files",
            value: "overwrite"
          }
        ],
        initialValue: "abort"
      });
      if (overwriteDir === "abort") {
        spinner.fail("Aborting installation...");
        process.exit(1);
      }
      const overwriteAction = overwriteDir === "clear" ? "clear the directory" : "overwrite conflicting files";
      const confirmOverwriteDir = await p.confirm({
        message: `Are you sure you want to ${overwriteAction}?`,
        initialValue: false
      });
      if (!confirmOverwriteDir) {
        spinner.fail("Aborting installation...");
        process.exit(1);
      }
      if (overwriteDir === "clear") {
        spinner.info(
          `Emptying ${chalk.cyan.bold(
            projectName
          )} and creating Reliverse app..
`
        );
        fs.emptyDirSync(projectDir);
      }
    }
  }
  spinner.start();
  fs.copySync(srcDir, projectDir);
  fs.renameSync(
    path.join(projectDir, "_gitignore"),
    path.join(projectDir, ".gitignore")
  );
  fs.renameSync(
    path.join(projectDir, "tsconfig.txt"),
    path.join(projectDir, "tsconfig.json")
  );
  fs.renameSync(
    path.join(projectDir, ".vscode/extensions.txt"),
    path.join(projectDir, ".vscode/extensions.json")
  );
  fs.renameSync(
    path.join(projectDir, ".vscode/settings.txt"),
    path.join(projectDir, ".vscode/settings.json")
  );
  const scaffoldedName = projectName === "." ? "App" : chalk.cyan.bold(projectName);
  spinner.succeed(
    `${scaffoldedName} ${chalk.green("scaffolded successfully!")}
`
  );
};

const selectLayoutFile = ({
  projectDir,
  packages
}) => {
  const usingTw = packages.tailwind.inUse;
  const usingTRPC = packages.trpc.inUse;
  const usingI18n = packages.nextIntl.inUse || packages.nextInternational.inUse;
  let layoutFile = "base.tsx";
  if (usingI18n) {
    if (usingTRPC && usingTw) {
      layoutFile = "[locale]/with-trpc-tw.tsx";
    } else if (usingTRPC && !usingTw) {
      layoutFile = "[locale]/with-trpc.tsx";
    } else if (!usingTRPC && usingTw) {
      layoutFile = "[locale]/with-tw.tsx";
    } else {
      layoutFile = "[locale]/base.tsx";
    }
  } else {
    if (usingTRPC && usingTw) {
      layoutFile = "with-trpc-tw.tsx";
    } else if (usingTRPC && !usingTw) {
      layoutFile = "with-trpc.tsx";
    } else if (!usingTRPC && usingTw) {
      layoutFile = "with-tw.tsx";
    }
  }
  const layoutFileDir = path.join(PKG_ROOT, "template/extras/src/app/layout");
  const layoutSrc = path.join(layoutFileDir, layoutFile);
  const layoutDest = path.join(
    projectDir,
    usingI18n ? "src/app/[locale]/layout.tsx" : "src/app/layout.tsx"
  );
  fs.copySync(layoutSrc, layoutDest);
  if (usingI18n) {
    const intlLayoutSrc = path.join(layoutFileDir, "with-i18n.tsx");
    const intlLayoutDest = path.join(projectDir, "src/app/layout.tsx");
    fs.copySync(intlLayoutSrc, intlLayoutDest);
  }
};
const selectPageFile = ({
  projectDir,
  packages
}) => {
  const usingTRPC = packages.trpc.inUse;
  const usingTw = packages.tailwind.inUse;
  const usingAuth = packages.nextAuth.inUse;
  const usingI18n = packages.nextIntl.inUse || packages.nextInternational.inUse;
  let pageFile = "base.tsx";
  if (usingI18n) {
    if (usingTRPC && usingTw && usingAuth) {
      pageFile = "[locale]/with-auth-trpc-tw.tsx";
    } else if (usingTRPC && !usingTw && usingAuth) {
      pageFile = "[locale]/with-auth-trpc.tsx";
    } else if (usingTRPC && usingTw) {
      pageFile = "[locale]/with-trpc-tw.tsx";
    } else if (usingTRPC && !usingTw) {
      pageFile = "[locale]/with-trpc.tsx";
    } else if (!usingTRPC && usingTw) {
      pageFile = "[locale]/with-tw.tsx";
    }
  } else {
    if (usingTRPC && usingTw && usingAuth) {
      pageFile = "with-auth-trpc-tw.tsx";
    } else if (usingTRPC && !usingTw && usingAuth) {
      pageFile = "with-auth-trpc.tsx";
    } else if (usingTRPC && usingTw) {
      pageFile = "with-trpc-tw.tsx";
    } else if (usingTRPC && !usingTw) {
      pageFile = "with-trpc.tsx";
    } else if (!usingTRPC && usingTw) {
      pageFile = "with-tw.tsx";
    }
  }
  const pageFileDir = path.join(PKG_ROOT, "template/extras/src/app/page");
  const pageSrc = path.join(pageFileDir, pageFile);
  const pageDest = path.join(
    projectDir,
    usingI18n ? "src/app/[locale]/page.tsx" : "src/app/page.tsx"
  );
  fs.copySync(pageSrc, pageDest);
  if (usingI18n) {
    const intlPageSrc = path.join(pageFileDir, "with-i18n.tsx");
    const intlPageDest = path.join(projectDir, "src/app/page.tsx");
    fs.copySync(intlPageSrc, intlPageDest);
  }
  if (usingAuth) {
    const authSrcDir = path.join(PKG_ROOT, "template/extras/src/app/auth");
    const authDestDir = path.join(
      projectDir,
      usingI18n ? "src/app/[locale]/auth" : "src/app/auth"
    );
    fs.copySync(authSrcDir, authDestDir);
  }
};
const selectAppFile = ({
  projectDir,
  packages
}) => {
  const appFileDir = path.join(PKG_ROOT, "template/extras/src/pages/_app");
  const usingTw = packages.tailwind.inUse;
  const usingTRPC = packages.trpc.inUse;
  const usingNextAuth = packages.nextAuth.inUse;
  let appFile = "base.tsx";
  if (usingTRPC && usingTw && usingNextAuth) {
    appFile = "with-auth-trpc-tw.tsx";
  } else if (usingTRPC && !usingTw && usingNextAuth) {
    appFile = "with-auth-trpc.tsx";
  } else if (usingTRPC && usingTw) {
    appFile = "with-trpc-tw.tsx";
  } else if (usingTRPC && !usingTw) {
    appFile = "with-trpc.tsx";
  } else if (!usingTRPC && usingTw) {
    appFile = "with-tw.tsx";
  } else if (usingNextAuth && usingTw) {
    appFile = "with-auth-tw.tsx";
  } else if (usingNextAuth && !usingTw) {
    appFile = "with-auth.tsx";
  }
  const appSrc = path.join(appFileDir, appFile);
  const appDest = path.join(projectDir, "src/pages/_app.tsx");
  fs.copySync(appSrc, appDest);
};
const selectIndexFile = ({
  projectDir,
  packages
}) => {
  const indexFileDir = path.join(PKG_ROOT, "template/extras/src/pages/index");
  const usingTRPC = packages.trpc.inUse;
  const usingTw = packages.tailwind.inUse;
  const usingAuth = packages.nextAuth.inUse;
  let indexFile = "base.tsx";
  if (usingTRPC && usingTw && usingAuth) {
    indexFile = "with-auth-trpc-tw.tsx";
  } else if (usingTRPC && !usingTw && usingAuth) {
    indexFile = "with-auth-trpc.tsx";
  } else if (usingTRPC && usingTw) {
    indexFile = "with-trpc-tw.tsx";
  } else if (usingTRPC && !usingTw) {
    indexFile = "with-trpc.tsx";
  } else if (!usingTRPC && usingTw) {
    indexFile = "with-tw.tsx";
  }
  const indexSrc = path.join(indexFileDir, indexFile);
  const indexDest = path.join(projectDir, "src/pages/index.tsx");
  fs.copySync(indexSrc, indexDest);
};

const removeExpectErrors = (projectDir) => {
  const removeExpectErrorComments = (file) => {
    const content = fs$1.readFileSync(file, "utf-8");
    const updatedContent = content.replace(/^.*@ts-expect-error.*\r?\n/gm, "");
    fs$1.writeFileSync(file, updatedContent);
  };
  const traverseDirectory = (dir) => {
    const items = fs$1.readdirSync(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      if (fs$1.statSync(itemPath).isDirectory()) {
        traverseDirectory(itemPath);
      } else if (path.extname(itemPath) === ".ts" || path.extname(itemPath) === ".tsx") {
        removeExpectErrorComments(itemPath);
      }
    }
  };
  traverseDirectory(projectDir);
};

const createProject = async ({
  projectName,
  scopedAppName,
  packages,
  noInstall,
  appRouter,
  databaseProvider
}) => {
  const pkgManager = getUserPkgManager();
  const projectDir = path.resolve(process.cwd(), projectName);
  const usingTailwind = packages.tailwind.inUse;
  const usingShadcn = packages.shadcn.inUse;
  const usingComponents = packages.components.inUse;
  await scaffoldProject({
    projectName,
    projectDir,
    pkgManager,
    scopedAppName,
    noInstall,
    appRouter,
    databaseProvider
  });
  installPackages({
    projectName,
    scopedAppName,
    projectDir,
    pkgManager,
    packages,
    noInstall,
    appRouter,
    databaseProvider
  });
  if (packages.nextIntl.inUse || packages.nextInternational.inUse) {
    const i18nPackage = packages.nextIntl.inUse ? "nextIntl" : "nextInternational";
    packages[i18nPackage].installer({
      projectDir,
      pkgManager,
      noInstall,
      packages,
      appRouter,
      projectName,
      scopedAppName,
      databaseProvider
    });
  }
  if (packages.stripe.inUse || packages.lemonSqueezy.inUse) {
    const paymentPackage = packages.stripe.inUse ? "stripe" : "lemonSqueezy";
    packages[paymentPackage].installer({
      projectDir,
      pkgManager,
      noInstall,
      packages,
      appRouter,
      projectName,
      scopedAppName,
      databaseProvider
    });
  }
  if (appRouter) {
    fs$1.copyFileSync(
      path.join(PKG_ROOT, "template/extras/config/next-config-appdir.js"),
      path.join(projectDir, "next.config.js")
    );
    selectLayoutFile({ projectDir, packages });
    selectPageFile({ projectDir, packages });
  } else {
    selectAppFile({ projectDir, packages });
    selectIndexFile({ projectDir, packages });
  }
  if (!(usingTailwind || usingShadcn || usingComponents)) {
    const indexModuleCss = path.join(
      PKG_ROOT,
      "template/extras/src/index.module.css"
    );
    const indexModuleCssDest = path.join(
      projectDir,
      "src",
      appRouter ? "app" : "pages",
      "index.module.css"
    );
    fs$1.copyFileSync(indexModuleCss, indexModuleCssDest);
  }
  removeExpectErrors(projectDir);
  return projectDir;
};

const isGitInstalled = (dir) => {
  try {
    execSync("git --version", { cwd: dir });
    return true;
  } catch (_e) {
    return false;
  }
};
const isRootGitRepo = (dir) => {
  return fs.existsSync(path.join(dir, ".git"));
};
const isInsideGitRepo = async (dir) => {
  try {
    await execa("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: dir,
      stdout: "ignore"
    });
    return true;
  } catch (_e) {
    return false;
  }
};
const getGitVersion = () => {
  const stdout = execSync("git --version").toString().trim();
  const gitVersionTag = stdout.split(" ")[2];
  const major = gitVersionTag?.split(".")[0];
  const minor = gitVersionTag?.split(".")[1];
  return { major: Number(major), minor: Number(minor) };
};
const getDefaultBranch = () => {
  const stdout = execSync("git config --global init.defaultBranch || echo main").toString().trim();
  return stdout;
};
const initializeGit = async (projectDir) => {
  logger.info("Initializing Git...");
  if (!isGitInstalled(projectDir)) {
    logger.warn("Git is not installed. Skipping Git initialization.");
    return;
  }
  const spinner = ora("Creating a new git repo...\n").start();
  const isRoot = isRootGitRepo(projectDir);
  const isInside = await isInsideGitRepo(projectDir);
  const dirName = path.parse(projectDir).name;
  if (isInside && isRoot) {
    spinner.stop();
    const overwriteGit = await p.confirm({
      message: `${chalk.redBright.bold(
        "Warning:"
      )} Git is already initialized in "${dirName}". Initializing a new git repository would delete the previous history. Would you like to continue anyways?`,
      initialValue: false
    });
    if (!overwriteGit) {
      spinner.info("Skipping Git initialization.");
      return;
    }
    fs.removeSync(path.join(projectDir, ".git"));
  } else if (isInside && !isRoot) {
    spinner.stop();
    const initializeChildGitRepo = await p.confirm({
      message: `${chalk.redBright.bold(
        "Warning:"
      )} "${dirName}" is already in a git worktree. Would you still like to initialize a new git repository in this directory?`,
      initialValue: false
    });
    if (!initializeChildGitRepo) {
      spinner.info("Skipping Git initialization.");
      return;
    }
  }
  try {
    const branchName = getDefaultBranch();
    const { major, minor } = getGitVersion();
    if (major < 2 || major === 2 && minor < 28) {
      await execa("git", ["init"], { cwd: projectDir });
      await execa("git", ["symbolic-ref", "HEAD", `refs/heads/${branchName}`], {
        cwd: projectDir
      });
    } else {
      await execa("git", ["init", `--initial-branch=${branchName}`], {
        cwd: projectDir
      });
    }
    await execa("git", ["add", "."], { cwd: projectDir });
    spinner.succeed(
      `${chalk.green("Successfully initialized and staged")} ${chalk.green.bold(
        "git"
      )}
`
    );
  } catch (error) {
    spinner.fail(
      `${chalk.bold.red(
        "Failed:"
      )} could not initialize git. Update git to the latest version!
`
    );
  }
};

const execWithSpinner = async (projectDir, pkgManager, options) => {
  const { onDataHandle, args = ["install"], stdout = "pipe" } = options;
  const spinner = ora(`Running ${pkgManager} install...`).start();
  const subprocess = execa(pkgManager, args, { cwd: projectDir, stdout });
  await new Promise((res, rej) => {
    if (onDataHandle) {
      subprocess.stdout?.on("data", onDataHandle(spinner));
    }
    void subprocess.on("error", (e) => rej(e));
    void subprocess.on("close", () => res());
  });
  return spinner;
};
const runInstallCommand = async (pkgManager, projectDir) => {
  switch (pkgManager) {
    case "npm":
      await execa(pkgManager, ["install"], {
        cwd: projectDir,
        stderr: "inherit"
      });
      return null;
    case "pnpm":
      return execWithSpinner(projectDir, pkgManager, {
        onDataHandle: (spinner) => (data) => {
          const text = data.toString();
          if (text.includes("Progress")) {
            spinner.text = text.includes("|") ? text.split(" | ")[1] ?? "" : text;
          }
        }
      });
    case "yarn":
      return execWithSpinner(projectDir, pkgManager, {
        onDataHandle: (spinner) => (data) => {
          spinner.text = data.toString();
        }
      });
    case "bun":
      return execWithSpinner(projectDir, pkgManager, { stdout: "ignore" });
  }
};
const installDependencies = async ({
  projectDir
}) => {
  logger.info("Installing dependencies...");
  const pkgManager = getUserPkgManager();
  const installSpinner = await runInstallCommand(pkgManager, projectDir);
  (installSpinner ?? ora()).succeed(
    chalk.green("Successfully installed dependencies!\n")
  );
};

const logNextSteps = async ({
  projectName = DEFAULT_APP_NAME,
  packages,
  appRouter,
  noInstall,
  projectDir,
  databaseProvider
}) => {
  const pkgManager = getUserPkgManager();
  logger.info("Next steps:");
  projectName !== "." && logger.info(`  cd ${projectName}`);
  if (noInstall) {
    if (pkgManager === "yarn") {
      logger.info(`  ${pkgManager}`);
    } else {
      logger.info(`  ${pkgManager} install`);
    }
  }
  if (["postgres", "mysql"].includes(databaseProvider)) {
    logger.info("  Start up a database, if needed use './{mysql|postgres}.sh'");
  }
  if (packages?.prisma.inUse || packages?.drizzle.inUse) {
    if (["npm", "bun"].includes(pkgManager)) {
      logger.info(`  ${pkgManager} run db:push`);
    } else {
      logger.info(`  ${pkgManager} db:push`);
    }
  }
  if (["npm", "bun"].includes(pkgManager)) {
    logger.info(`  ${pkgManager} run dev`);
  } else {
    logger.info(`  ${pkgManager} dev`);
  }
  if (!await isInsideGitRepo(projectDir) && !isRootGitRepo(projectDir)) {
    logger.info("  git init");
  }
  logger.info(`  git commit -m "initial commit"`);
  if (appRouter) {
    logger.warn(
      "\nIf you encounter any issues, please open an issue! Remember to fill the .env file."
    );
  }
  if (packages?.drizzle.inUse) {
    logger.warn(
      "\nThank you for trying out the new Drizzle option. If you encounter any issues, please open an issue!"
    );
  }
  if (databaseProvider === "planetscale") {
    logger.warn(
      `
We use the PlanetScale driver so that you can query your data in edge runtimes. If you want to use a different driver, you'll need to change it yourself.`
    );
  }
  if (packages?.stripe.inUse || packages?.lemonSqueezy.inUse) {
    logger.warn(
      "\nPayment providers currently not finished, especially the LemonSqueezy. Please let us know if you ran into any issues."
    );
  }
};

function replaceTextInFiles(directoryPath, search, replacement) {
  const files = fs$1.readdirSync(directoryPath);
  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);
    if (fs$1.statSync(filePath).isDirectory()) {
      replaceTextInFiles(filePath, search, replacement);
    } else {
      const data = fs$1.readFileSync(filePath, "utf8");
      const updatedData = data.replace(new RegExp(search, "g"), replacement);
      fs$1.writeFileSync(filePath, updatedData, "utf8");
    }
  });
}
const setImportAlias = (projectDir, importAlias) => {
  const normalizedImportAlias = importAlias.replace(/\*/g, "").replace(/[^\/]$/, "$&/");
  replaceTextInFiles(projectDir, "~/", normalizedImportAlias);
};

const parseNameAndPath = (rawInput) => {
  const input = removeTrailingSlash(rawInput);
  const paths = input.split("/");
  let appName = paths[paths.length - 1];
  if (appName === ".") {
    const parsedCwd = path.resolve(process.cwd());
    appName = path.basename(parsedCwd);
  }
  const indexOfDelimiter = paths.findIndex((p) => p.startsWith("@"));
  if (paths.findIndex((p) => p.startsWith("@")) !== -1) {
    appName = paths.slice(indexOfDelimiter).join("/");
  }
  const path$1 = paths.filter((p) => !p.startsWith("@")).join("/");
  return [appName, path$1];
};

const poimandresTheme = {
  blue: "#add7ff",
  cyan: "#89ddff",
  green: "#5de4c7",
  magenta: "#fae4fc",
  red: "#d0679d",
  yellow: "#fffac2"
};
const renderTitle = () => {
  const textGradient = gradient(Object.values(poimandresTheme));
  const pkgManager = getUserPkgManager();
  if (pkgManager === "yarn" || pkgManager === "pnpm") {
    console.log("");
  }
  console.log(textGradient.multiline(TITLE_TEXT));
};

const main = async () => {
  const pkgManager = getUserPkgManager();
  renderTitle();
  const {
    appName,
    packages,
    flags: { noGit, noInstall, importAlias, appRouter },
    databaseProvider
  } = await runCli();
  const usePackages = buildPkgInstallerMap(packages, databaseProvider);
  const [scopedAppName, appDir] = parseNameAndPath(appName);
  const projectDir = await createProject({
    projectName: appDir,
    scopedAppName,
    packages: usePackages,
    databaseProvider,
    importAlias,
    noInstall,
    appRouter
  });
  const pkgJson = fs.readJSONSync(
    path.join(projectDir, "package.json")
  );
  pkgJson.name = scopedAppName;
  pkgJson.reliverseMetadata = { initVersion: getVersion() };
  if (pkgManager !== "bun") {
    const { stdout } = await execa(pkgManager, ["-v"], {
      cwd: projectDir
    });
    pkgJson.packageManager = `${pkgManager}@${stdout.trim()}`;
  }
  fs.writeJSONSync(path.join(projectDir, "package.json"), pkgJson, {
    spaces: 2
  });
  if (importAlias !== "~/") {
    setImportAlias(projectDir, importAlias);
  }
  if (!noInstall) {
    await installDependencies({ projectDir });
  }
  if (!noGit) {
    await initializeGit(projectDir);
  }
  await logNextSteps({
    projectName: appDir,
    packages: usePackages,
    appRouter,
    noInstall,
    projectDir,
    databaseProvider
  });
  process.exit(0);
};
main().catch((err) => {
  logger.error("Aborting installation...");
  if (err instanceof Error) {
    logger.error(err);
  } else {
    logger.error(
      "An unknown error has occurred. Please open an issue on github with the below:"
    );
    console.log(err);
  }
  process.exit(1);
});
