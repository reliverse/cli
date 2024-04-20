# Reliverse CLI 0.3.0: Bootstrap Next.js Templates in Seconds

Welcome to the Reliverse! This CLI helps you bootstrap and deploy new web apps in a matter of seconds. Currently, the project focuses on Next.js, but support for other frameworks and additional features will be available soon. Happy coding!

## Features

- 🚀 Bootstrap [Relivator](https://github.com/blefnk/relivator), a Next.js starter, in seconds
- 🌐 Comprehensive and powerful code and no-code website builder (coming soon)
- 🎨 Beautiful and fast sites and web apps by default
- 🧩 Can be used as a Turborepo starter
- 🌟 Exciting features planned (currently not all are implemented), including Next.js 14, Tauri Apps UI, Solito Expo, i18n, Stripe, Shadcn, Tailwind, Drizzle Zod Trpc, TypeScript, Resend, Auth, Lucide CSS Radix UI, Responsive React Server, TS ORM, Intl App Router Docs, User Actions Kit, SaaS Commerce Shop, Subscriptions Payments, and Turbopack Full Stack

## Installation

1. Fork this repository to your GitHub profile or run the following command:

   ```sh
   bunx create-turbo@latest -e https://github.com/blefnk/reliverse
   ```

2. Install dependencies:

   ```sh
   cd reliverse
   bun install
   ```

3. Experimental. Run the following command to check if the current project state meets the deploy best practices standards:

   ```sh
   bun appts
   ```

Tip. You can also use `ctrl+shift+b` to run the `appts` script.

## Usage

### Development

To develop all apps and packages, run the following command:

```sh
cd reliverse
bun run dev
```

#### CLI Ts Edition

```sh
# Buid and run
bun start:cli
# Build only
bun build:cli
```

#### CLI Go Edition

```sh
# Install Go lang — https://go.dev/dl
# Open Reliverse in terminal and run:
go run .
```

### Building

To build all apps and packages, run the following command:

```sh
cd reliverse
bun run build
```

## Monorepo Structure

This project includes the following packages/apps:

### Apps and Packages

- `nextjs`: a [Next.js](https://nextjs.org) app with App Router
- `expo`: a [Solito](https://solito.dev) app Expo Router (coming soon)
- `tauri`: a [Tauri](https://tauri.app) app with Tauri UI (coming soon)
- `@tools/eslintconfig`: `eslint` tool configurations (includes `eslint-config-next`)
- `@tools/tailwind-config` / `@tools/tsconfig` / `@repo/jsconfig`: tools used throughout the monorepo
- `@packages/ui`: a stub React component library shared by the entire application
- `@tools/tsconfig`: `tsconfig.json`s used throughout the monorepo
- ...and much more!

Each package/app is 100% [TypeScript](https://typescriptlang.org/).

### Utilities

This project has some additional tools already set up for you:

- [TypeScript](https://typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Biome](https://biomejs.dev) for code formatting and linting

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

## TODO

- [ ] Reliverse CLI TS Edition should have everything that Relivator has.
- [ ] All items on the Relivator roadmap must be completed.
- [ ] Release Relivator 1.0.0 version.

## Frequently Asked Questions

### How to fix error "ENOWORKSPACES command does not support workspaces"?

```sh
bunx next telemetry disable
```

## Credits

This project is created by @blefnk Nazarii Korniienko. Many thanks to the t3-oss team for create-t3-app and create-t3-turbo, this project is very inspired by these projects. The Reliverse has the almost everything what they has, so you can migrate to Relivator very easily.

## Contributing

We welcome contributions to improve Reliverse! If you have any ideas, suggestions, or bug reports, please open an issue on the [GitHub repository](https://github.com/blefnk/reliverse). If you'd like to contribute code, please fork the repository and submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
