# @reliverse/cli: Bootstrap Templates in Seconds

👉 <https://reliverse.org>

 🏯 @reliverse/cli is a website builder inside your terminal. You can start from scratch or use a template. You can set everything up automatically or configure everything exactly the way you like. You can have it all, with all the tools already prepared for you.

---

Welcome to Reliverse! This CLI helps you bootstrap and deploy new web apps in a matter of seconds.

The project focuses on Next.js, but support for other frameworks and additional features will be available soon. Happy coding!

More features coming soon!

---

For more detailed usage instructions, API documentation, and examples, please visit the [Reliverse Docs](https://reliverse.org) website. If you find that the page for this library is missing, please notify us or consider contributing to add it.

## Installation

To launch this CLI, run:

```bash
pnpm add @reliverse/cli@latest
```

or with Bun:

```bash
bun add @reliverse/cli@latest
```

---

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

---

## How to Use This Library

To use `@reliverse/cli`, ensure that your project is set up as an ES module by including `"type": "module"` in your `package.json` file. Since this package is structured as an ES module, you'll need to use `import` statements instead of `require`.

The library primarily relies on the async versions of `fs` functions, so you need to add the `await` keyword before the utils from our library.

Here's an example of how to import and use a function from this package:

```ts
import { fileExists } from "@reliverse/cli";

const someFile = "path/to/file.ts";

export async function checkFile() {
  await fileExists(someFile);
}
```

Please refer to the source files located in the [`src` folder](https://github.com/reliverse/cli/blob/main/src) to learn about the currently implemented functions.

This package adopts the ES module format, with files compiled to `dist/.js` (formerly known as `dist/.mjs`). This approach aligns with the Node.js team's recent recommendations, encouraging the JavaScript/TypeScript community to transition to the ES module standard. If your project still requires CommonJS (CJS) support, you may fork this repository and modify the build process to generate `dist/.cjs` files. For guidance or community support, join the [Reliverse Discord community](https://discord.gg/C4Z46fHKQ8).

## Documentation and Support

If you encounter any issues, need help, or want to contribute, you can:

- Join the [Reliverse Discord community](https://discord.gg/C4Z46fHKQ8) to ask questions and engage with other users and developers.
- For usage instructions, API documentation, and examples, please visit the [Reliverse Docs](https://reliverse.org) website.
- Report bugs or suggest features by opening an issue on our [GitHub repository](https://github.com/reliverse/cli/issues).

## Sponsors

*Love using this project? If you find it useful, I’d greatly appreciate a cup of coffee! By supporting this project, you'll gain access to Reliverse Pro, exclusive access to @reliverse/addons-pro, private repositories, pre-release downloads, and even the ability to influence projects planning. Click on the donation platforms below to learn more. Thank you all for your support!*

**[We're Growing Fast! A Huge Thanks to All Our Supporters!](https://github.com/blefnk/relivator/stargazers)**

Developing something as ambitious as [@reliverse/addons](https://github.com/reliverse/addons) takes a huge amount of time, especially since the project is primarily developed by one person. The development could be significantly accelerated by bringing on additional developers. Therefore, @blefnk (Nazar Kornienko), the author of this project, would be immensely grateful to anyone who can contribute financially in any amount. A big thank you in advance to everyone who supports this effort!

**[Visit the "Donate to Relivator" page to see our current donors and learn more.](https://relivator.reliverse.org/donate)**

### 💚 [GitHub Sponsors](https://github.com/sponsors/blefnk) 🩵 [PayPal](https://paypal.me/blefony) 🧡 [Patreon](https://patreon.com/blefnk) 💛 [Buy Me a Coffee](https://buymeacoffee.com/blefnk) 🩷 [Ko-fi](https://ko-fi.com/blefnk)

## Contributing

We welcome contributions! If you’d like to contribute to the development of this package, please follow these steps:

1. **If you are a beginner:** Familiarize yourself with Git by following [The Detailed Git Guide](https://github.com/blefnk/relivator/blob/main/.github/GITGUIDE.md) created by @blefnk and @reliverse.
2. Fork this repository.
3. Create a new branch for your feature (e.g. `git checkout -b feature-branch`).
4. Make your changes in the new branch.
5. Commit your changes with a descriptive message (e.g. `git commit -m 'Add new feature'`).
6. Push your changes to your branch (e.g. `git push origin feature-branch`).
7. Open a [pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests) for our review.

Please ensure that your code follows the existing code style and includes appropriate tests. Your code should successfully pass the `pnpm appts` command.

## License

This project is developed by [Reliverse](https://github.com/orgs/reliverse/repositories) and [@blefnk (Nazar Kornienko)](https://github.com/blefnk) and is licensed under the MIT License. For more information, please refer to the [LICENSE](./LICENSE) file.
