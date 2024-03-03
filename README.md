# Reliverse: An Open-Source Superapp CLI

## Reliverse CLI v0.3.0

Ship your web apps faster! Try the Reliverse CLI to bootstrap [Relivator](https://github.com/blefnk/relivator) v1.2.5 in seconds! Run it with:

```sh
# Install Go lang — https://go.dev/dl
# Open Reliverse in terminal and run:
go run .
```

## Coming Soon ✨

_Build a Site, Build an App, Build a Game, Build Everything._

This is the one app to build them all. It's comprehensive and powerful both code and no-code website builder. Work as you want. Sites/apps/games created with this builder will be super fast and beautiful by default.

Also, you can use it as Turborepo starter. But it's not currently production-ready. So you can check the [Relivator: A Next.js Starter](https://github.com/blefnk/relivator) for now.

This is the Reliverse Turborepo Edition. It's the Incremental Turborepo Superapp Starter 💻 Next.js 13, Tauri Apps UI, Solito Expo 💪 i18n, Stripe, Shadcn, Tailwind, Drizzle Zod Trpc, TypeScript, Resend, Auth, Lucide CSS Radix UI, Responsive React Server, TS ORM, Intl App Router Docs, User Actions Kit, SaaS Commerce Shop, Subscriptions Payments, T3 Turbo Full Stack 🤩 (more stars → more features)

When you give us the star [on this repo](https://github.com/blefnk/reliverse), you take part in the lottery where a randomly selected person will receive a secret Reliverse feature of their choice as a gift!

## How to Install

Make fork to your Github profile, or just run the following command:

```sh
pnpm dlx create-turbo@latest -e https://github.com/blefnk/reliverse
```

## What's inside?

This project includes the following packages/apps:

### Apps and Packages

- `@nextjs/edge`: a [Next.js](https://nextjs.org) with App Router (Edge Runtime)
- `@nextjs/node`: a [Next.js](https://nextjs.org) with App Router (Node.js Runtime)
- `@acme/expo`: a [Solito](https://solito.dev) app Expo Router
- `@acme/tauri`: a [Tauri](https://tauri.app) app with Tauri UI
- `@acme/eslint-config`: `eslint` tool configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@acme/tsconfig` / `@acme/tailwind-config` / `@acme/prettier-config`: tools used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This project has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```sh
cd reliverse
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```sh
cd reliverse
pnpm dev
```

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup), then enter the following commands:

```sh
cd reliverse
pnpm dlx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```sh
pnpm dlx turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
