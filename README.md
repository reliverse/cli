# Relivator: Nextjs Starter

> **Warn**
> It's not currently production-ready. Please check the [Bleverse Relivator non-monorepo edition](https://github.com/blefnk/relivator).

⬇️

> **Note**
> Ever wondered how to migrate your Relivator application into a monorepo? Stop right here! This is the perfect starter repo to get you running with the perfect stack!

This is the Bleverse Relivator Turborepo Edition. It's the Incremental Turborepo Starter 💻 Next.js 13, Tauri Apps UI, Solito Expo 💪 i18n, Stripe, Shadcn, Tailwind, Drizzle Zod Trpc, TypeScript Page, Resend, Auth, Lucide CSS Radix UI, Reponsive React Server, TS ORM, Intl App Router Docs, User Actions Kit, SaaS Commerce Shop, Subscriptions Payments, T3 Turbo Full Stack 🤩 (more stars → more features)

When you give us the star [on this repo](https://github.com/blefnk/reliverse), you take part in a weekly lottery where a randomly selected person will receive a secret Relivator feature of their choice as a gift!

## Using this template

Run the following command:

```sh
pnpm dlx create-turbo@latest -e https://github.com/blefnk/reliverse
```

## What's inside?

The Bleverse Relivator monorepo includes the following packages/apps:

### Apps / Packages / Tools

- `nextjs`: a [Next.js](https://nextjs.org) with App Router
- `solito`: a [Solito](https://solito.dev) app Expo Router
- `tauri`: a [Tauri](https://tauri.app) app with Tauri UI
- `primitives`: a stub React component library shared by both `nextjs`, `solito`, and `tauri` applications
- `eslint-config-custom`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `tsconfig`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://typescriptlang.org)

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://typescriptlang.org) for static type checking
- [ESLint](https://eslint.org) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

```bash
cd relivator
pnpm build
```

### Develop

To develop all apps and packages, run the following command:

```bash
cd relivator
pnpm dev
```

### Remote Caching

Turborepo can use a technique known as [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup), then enter the following commands:

```bash
cd relivator
pnpm dlx turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

```bash
pnpm dlx turbo link
```

## Useful Links

Learn more about the power of Relivator:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
