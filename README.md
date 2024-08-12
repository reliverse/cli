# Reliverse CLI v0.4.0: Bootstrap Templates in Seconds

Welcome to Reliverse! This CLI helps you bootstrap and deploy new web apps in a matter of seconds. The project focuses on Next.js, but support for other frameworks and additional features will be available soon. Happy coding!

## Features

- 🚀 Bootstrap slim edition of [Relivator](https://github.com/blefnk/relivator) -> [Versator](https://github.com/blefnk/versator), a Next.js starter
- 🌐 Comprehensive and powerful code and no-code website builder (coming soon)
- 🎨 Beautiful and fast sites and web apps by default
- 🌟 Exciting features planned (currently not all are implemented), including Next.js 14, Tauri Apps UI, Solito Expo, i18n, Stripe, Shadcn, Tailwind, Drizzle Zod Trpc, TypeScript, Resend, Auth, Lucide CSS Radix UI, Responsive React Server, TS ORM, Intl App Router Docs, User Actions Kit, SaaS Commerce Shop, and Fullstack Turborepo

## CLI Installation

To install Reliverse CLI, follow these steps:

1. Make sure you have [Node.js](https://nodejs.org) installed on your system.
2. Run one of the following commands to install Reliverse CLI globally:

   ```sh
   pnpm add -g reliverse # pnpm
   bun add -g reliverse # bun
   yarn global add reliverse # yarn
   npm install -g reliverse # npm
   ```

3. Once the installation is complete, you can start using Reliverse CLI.

If global installation fails, try these commands:

   ```sh
   pnpx reliverse # pnpm
   bunx reliverse # bun
   yarn reliverse # yarn
   npx reliverse # npm
   ```

## CLI Usage

To create a new project using Reliverse CLI, follow these steps:

1. Open your terminal and navigate to the directory where you want to create your project.
2. Run the following command:

   ```sh
   reliverse
   ```

3. Follow the interactive prompts to configure your project options.
4. Once the configuration is complete, Reliverse CLI will bootstrap your project with the selected options.

### CLI Development

**CLI Ts Edition:**

```sh
# Build & run
pnpm start:cli
# Build only
pnpm build:cli
```

**CLI Go Edition:**

```sh
# Install Go lang — https://go.dev/dl
# Open Reliverse in terminal and run:
go run .
```

### Monorepo Development

To build all apps and packages, run the following command:

```sh
cd reliverse
pnpm run build
```

To develop all apps and packages, run the following command:

```sh
cd reliverse
pnpm run dev
```

## Monorepo Structure

This project includes the following packages/apps:

### Apps and Packages

- `reliverse`: a [Reliverse](https://turbo.build) CLI
- `nextjs`: a [Next.js](https://nextjs.org) app with App Router
- [coming soon] `expo`: a [Solito](https://solito.dev) app Expo Router
- [coming soon] `tauri`: a [Tauri](https://tauri.app) app with Tauri UI
- `@repo/eslintconfig`: `eslint` tool configurations (includes `eslint-config-next`)
- `@repo/tailwind-config` / `@repo/tsconfig` / `@repo/jsconfig`: tools used throughout the monorepo
- `@repo/primitives`: a stub React component library shared by the entire application
- `@repo/tsconfig`: `tsconfig.json`s used throughout the monorepo
- ...and much more!

Each package/app is 100% [TypeScript](https://typescriptlang.org).

### Utilities

This project has some additional tools already set up for you:

- [TypeScript](https://typescriptlang.org) for static type checking
- [ESLint](https://eslint.org) for code linting
- [Biome](https://biomejs.dev) for code formatting and linting
- ...and much more!

## Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching, you will need an account with Vercel. If you don't have an account, you can [create one](https://vercel.com/signup), then enter the following commands:

```sh
cd reliverse
bunx turbo login
bunx turbo link
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview) and link your Turborepo to your Remote Cache.

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)

## Roadmap

- [x] Publish Reliverse CLI as a package on [NPM](https://npmjs.com/package/reliverse) and [JSR](https://jsr.io/@blefnk/reliverse)
- [ ] Add all Relivator features to Reliverse CLI TS Edition
- [ ] Complete all items on the Relivator roadmap
- [ ] Release Relivator 1.0.0 version

## Frequently Asked Questions

**Why does the VSCode terminal exhibit unexpected behavior when interacting with CLI like Turbo and Reliverse?**

```sh
[Use arrows to move, type to filter] › [B[A[B 
```

This is a known issue. Please use an external terminal instead. For Windows users, [PowerShell 7](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-windows?view=powershell-7.4) is recommended.

**How can I fix the error: ENOWORKSPACES command does not support workspaces?**

To resolve this error, run the following command:

```sh
bunx next telemetry disable
```

## Contributing

We welcome contributions to improve Reliverse! If you have any ideas, suggestions, or bug reports, please open an issue on the [GitHub repository](https://github.com/blefnk/reliverse). If you'd like to contribute code, please follow these steps:

1. Fork the repository to your GitHub profile or run the following command:

   ```sh
   bunx create-turbo@latest -e https://github.com/blefnk/reliverse
   ```

2. Install dependencies:

   ```sh
   cd reliverse
   pnpm install
   ```

3. (Experimental) Run the following command to check if the current project state meets the deploy best practices standards:

   ```sh
   pnpm appts
   ```

   Tip: You can also use `ctrl+shift+b` to run the `appts` script.

### Adding New Options to Reliverse CLI

If you want to contribute a new option to Reliverse CLI, follow these steps:

1. Add the option to the `CliFlags` and `CliResults` interfaces in `src/cli/index.ts`.
2. Update the `defaultOptions.flags` and `defaultOptions` const in `src/cli/index.ts` with the new option.
3. Add prompts for the new option in the `runCli` function (find `return p.confirm`) to ask the user if they want to include the option.
4. Add the option to the `const availablePackages` and `const buildPkgInstallerMap` in `src/installers/index.ts`.
5. Create a new installer file for the option in `src/installers/optionNameInstaller.ts`.
6. Place the necessary files to be copied in `template/extras/*`.
7. List the library in `const dependencyVersionMap` in `src/installers/dependencyVersionMap.ts`.
8. Find `if (project.` and add your option correspondingly.
9. In the return statement, add the option in the format: `optionName: project.optionName as "none" | "option1" | "option2"`.
10. If needed, find the relevant section (e.g., "Install the selected i18n package") and add your option accordingly.
11. Update `const selectLayoutFile` and `const selectPageFile` in `src/installers/index.ts` if required.
12. Add final log notes in `logNextSteps.ts` file for your option.
13. Update the required environment variables in `envVars.ts` file if necessary.
14. Update the scripts in `base/package.json` if needed.

## Credits

This project is created by @blefnk Nazarii Korniienko. Many thanks to the t3-oss team for create-t3-app and create-t3-turbo, as this project is greatly inspired by their work. Reliverse has almost everything they have, so you can migrate to Relivator very easily.

## License

This project is licensed under the [MIT License](LICENSE).
