# @reliverse/cli

[npmjs](https://npmjs.com/package/@reliverse/cli), [GitHub](https://github.com/reliverse/cli), [Discord](https://discord.gg/Pb8uKbwpsJ)

Please consider following this project's author, [Nazar Kornienko](https://github.com/blefnk), and consider starring the project to show your ❤️ and support.

---

## Reliverse: Open-Source Full-Featured Product Launcher Tool & Assistant

![Reliverse Cover Image](./reliverse.webp)

👋 Welcome! This superapp tool can help you easily create new web projects and automatically make advanced codebase modifications, with more features coming soon.

**Reliverse** is a CLI tool designed to streamline the setup of JavaScript, TypeScript, and other types of projects, with a primary focus on Next.js templates, though it is not limited to them.

## Installation

Please make sure you have [Git](https://git-scm.com), [VSCode](https://code.visualstudio.com), and [Node.js LTS](https://nodejs.org/en/download/package-manager) installed first.

Then use one of the following commands to install **Reliverse**:

- With [bun](https://bun.sh): `bun i -g @reliverse/cli`
- With [pnpm](https://pnpm.io/installation#using-corepack): `pnpm add -g @reliverse/cli`
- With [yarn](https://yarnpkg.com): `yarn global add @reliverse/cli`
- With [npm](https://nodejs.org/en/learn/getting-started/an-introduction-to-the-npm-package-manager): `npm i -g @reliverse/cli`

## Usage

Once installed, you can use **@reliverse/cli** to create new projects or manage existing ones. Navigate to the root of your desired directory and run:

```bash
reliverse
```

## Updating

```bash
bun rm -g @reliverse/cli
bun i -g @reliverse/cli
# OR bun update --latest -g
# OR use another package manager
```

## Introduction

A single tool to launch a brand new thing from scratch? Yes.

Reliverse allows you to effortlessly bootstrap projects, including the [Relivator Next.js template](https://github.com/blefnk/relivator) or any other template from GitHub or other Git-based sources. Additionally, Reliverse assists in managing configuration files and resolving potential conflicts between tools like ESLint, Prettier, and Biome.

Reliverse is more than just the easiest way to install Relivator. It’s also the most convenient new way to download any repository from GitHub and automatically prepare it for work. Especially if it’s a project from the JavaScript ecosystem.

The mission of this project is not only to help you install templates in seconds. It is also a desire to make web development more accessible to everyone. It’s a commitment to fixing many things that don’t work in the ecosystem. It’s a wish to share templates, libraries, and tools with the world that deserve attention. It’s also a drive to motivate developers to become contributors to various projects that need and deserve it.

## TL;DR

Things are too overwhelming in our world. Let's make everything easier.

**@reliverse/cli allows you:**

1. Install the pre-configured Relivator.
2. Build your own Relivator from scratch.
3. Install any web-related repository from GitHub.
4. Add shadcn/ui components to your React/Vue/Svelte project.
5. Run code modifications on the existing codebase.
6. Update your GitHub clone with the latest changes.
7. Add, remove, or replace the Relivator's features.

**It's a single tool for everything.** At its current stage, @reliverse/cli is a powerful website builder and project bootstrapper, right in your terminal. However, it won’t be only a website builder in the future, it will be a tool for building anything. Even now, you can start from scratch or with a template, setting everything up automatically or customizing it to your exact preferences. With all the tools pre-configured and ready to go, you can build exactly what you envision.

Remember the feeling of empowerment when you first used a website builder like WordPress? It gave you the freedom to create. But eventually, you hit limits—PageSpeed Insights flagged issues, performance lagged, and the bloated size of your site became hard to ignore.

*That’s where Reliverse comes in.* Reliverse is designed to fix the problems of traditional website builders, offering a universal toolset that lets you create anything you can imagine—efficiently and with ease.

## Get Started

Reliverse is still in its early stages, but it already allows you to bootstrap websites quickly. Soon, advanced customization options will be available, along with other exciting features. You're going to love what's coming.

By the way, you might think that a CLI doing so many things would become bloated, like an elephant in the room, but don’t worry—it’s going to be lean. This is the dream of a creator, a dream that must become reality. Everything has to be perfect.

See the [Installation](#installation) section for more details.

## Collaborate

Reliverse team is open to partnerships and collaborations. If you are interested in working together, please contact us. Discord: <https://discord.gg/Pb8uKbwpsJ>.

## FAQ

**Bun doesn't install the latest version of @reliverse/cli. What should I do?**

```bash
bun pm cache rm -g
bunx reliverse # OR bunx reliverse@latest
```

**Why you don't use monorepo?**

Our mission is to make web development accessible and understandable for everyone. By everyone, we also mean any tool. Unfortunately, not every web tool works perfectly with monorepo, including Bun, which is critical for us. Strange things can sometimes happen with a monorepo codebase. But it depends on the vision of the project. If there is a real need for monorepo and all the tools work well, we will be free to switch to it. There has already been an attempt to switch to a monorepo structure, the developments were saved and available as a monorepo bootstrap using @reliverse/cli itself.

## Reliverse Addons

Reliverse Addons, also called as extensions or plugins, are projects that extend the functionality of Reliverse ecosystem. They are created by Reliverse core team and community. Not all of them are included in the Reliverse monorepo and can be installed separately. Reliverse Extension API is coming soon. Projects that are using Reliverse Addons may be selected and featured in the [@reliverse/awesome](https://github.com/reliverse/awesome) showcase. You can build your own Reliverse Addons using Reliverse Helper CLI. This CLI will help you to build your own Reliverse Addons. This CLI is currently under development and not available yet. Please check back later.

## Features

- **Create Projects**: Easily build new projects from scratch, including your own version of the **Relivator Next.js template**, or install any other templates directly from GitHub.
- **JavaScript/TypeScript Support**: Designed primarily for React and Next.js projects but compatible with a wide range of JavaScript and TypeScript libraries.
- **Automatic Configuration Management**: Manages project configurations for ESLint, Biome, Putout, GitHub, and IDE settings automatically.
- **Conflict Resolution**: Detects existing configurations and guides you through file conflicts, giving you control over which files to retain or replace.
- **Interactive Setup**: Customize your setup with interactive prompts that let you choose specific file categories to include.
- **Template-Driven Initialization**: Instantly clone and set up templates from GitHub to jumpstart your development.
- **Versatile Functionality**: Not just for templates! Planning to clone a JS library or experiment with new setups? Reliverse can support it all.
- **Enhanced shadcn/ui CLI Integration**: [W.I.P] The @reliverse/cli integrates with the shadcn/ui CLI, enabling seamless addition of components and dependencies to your project. With added features and support for shadcn-vue and shadcn-svelte (community-led ports for Vue and Svelte), you can easily add shadcn/ui components to React, Vue, and Svelte projects. Checkboxes let you select and install multiple components at once. Note: Reliverse and these community-supported ports are not affiliated with @shadcn.
- **Future Expansion**: While currently optimized for JavaScript and TypeScript projects (e.g., React, Astro, Vue, Svelte), Reliverse is envisioned to grow beyond web development into a comprehensive toolset you’ll love. This is the founder’s vision for Reliverse—to become the single tool for everything.

### Commands

The @reliverse/cli offers a series of interactive prompts to streamline your project setup:

1. **Create a New Project**: Start from scratch or use predefined templates for a quick setup.
2. **Install GitHub Templates**: Easily install any JavaScript or TypeScript project by providing a GitHub repository URL.
3. **Manage Configurations**: The CLI detects existing configuration files and helps you resolve any conflicts.
4. **Select Configuration Categories**: Choose from a range of configuration options for your setup, including ESLint, Biome, Putout, GitHub settings, and IDE preferences.
5. **Ongoing Support**: Reliverse supports you throughout your entire development process. You can run `reliverse` even on an existing project, and if your project’s `package.json` contains an `appts` script, it acts as a local instance of `reliverse` within your project.

<!-- ### Example Workflow

Here’s an example session of using **@reliverse/cli**:

```bash
$ reliverse

? How do you want to proceed?
  1. I want to build my own Relivator from scratch
  2. I just want to install a template from GitHub

? Select the file categories you want to download:
  ◉ eslint, biome, putout
  ◉ GitHub
  ◉ IDE
  ◉ Reliverse configs

? Do you want to replace all existing files? (N opens Conflict Management menu) (y/N)
``` -->

<!-- ## Configuration Categories

When setting up a project, you can choose from the following file categories:

1. **eslint, biome, putout**
   - `.eslintrc.js`, `biome.json`, `.putout.json`
2. **GitHub**
   - `.github`, `README.md`
3. **IDE**
   - `.vscode`
4. **Reliverse configs**
   - `reliverse.config.ts`, `reliverse.info.ts` -->

<!-- ## Conflict Management

**@reliverse/cli** helps you handle configuration conflicts for existing files such as `.eslintrc.cjs` or `prettier.config.js`. It prompts you with options to:

- **Remove**: Delete the existing file.
- **Rename**: Rename the file (e.g., add `.txt` to disable it).
- **Do Nothing**: Keep the existing file. -->

<!-- ### Conflict Example

```bash
? .eslintrc.cjs file exists. Do you want to remove or rename it?
  1. Remove
  2. Rename to .eslintrc.cjs.txt
  3. Do nothing
``` -->

<!-- ### Prettier Conflict Example

```bash
? prettier.config.js found. Biome will be installed, so Prettier is not necessary.
  1. Remove
  2. Rename to prettier.config.js.txt
  3. Do nothing
``` -->

<!-- ## Installing Other Templates

You can install any JavaScript/TypeScript project (not just Next.js templates—anything, including JS libraries) from a GitHub repository by providing the repository URL during the interactive setup:

```bash
$ reliverse

? How do you want to proceed?
  1. I want to build my own Relivator from scratch
  2. I just want to install a template from GitHub
  3. I want to clone a library/tool from GitHub

? Enter the GitHub repository link: (e.g., `https://github.com/user/repo`)
```

Reliverse will then clone the repository and set up the project. -->

## Development

### Clone the Repository

#### Using Reliverse

You can use Reliverse itself to install it locally! 😄

Visit the [Installation](#installation) section and select **Tools Installation** when choosing to **Clone Reliverse Repository for Local Development**.

#### Classical Method

To contribute to **@reliverse/cli**, you can clone the repository and install the dependencies:

```bash
git clone https://github.com/reliverse/cli.git
cd reliverse
bun i # OR bun i OR yarn install OR npm i
```

### Running Locally

To run the CLI locally for development purposes, use:

```bash
bun run dev
# or
bun run dev
# or
yarn dev
# or
npm dev
```

## Contributing

We welcome contributions! Feel free to open issues or submit pull requests. Please ensure your code adheres to our linting guidelines by running `bun appts` before submitting.

> **Temporary issue**: It seems that currently if you build and publish a project using bun , then the project does not run with a global installation, so *now wherever README.md says to use `bun`, please use `pnpm` instead*.

Reliverse takes a different, non-standard approach compared to other bootstrappers. The author has observed many CLIs handling project bootstrapping, some of which are quite impressive. However, their repositories often contain numerous files that are eventually bundled into a single `index.js`, functioning like an installer wizard. This leads to cluttered repositories, typically set up as monorepos, adding complexity. In contrast, the `reliverse/cli` repository downloads specific files from existing repositories and only copies or generates files when absolutely necessary.

## License

This project is licensed under the MIT License—see the [LICENSE](LICENSE) file for more details.

<!-- ## Bootstrapping Tool Comparison

> **Note:** This table currently contains approximate and placeholder values. More detailed assessments will be provided as tools continue to evolve.

**Icon Legend:**

- 🟡: Not yet verified
- 🟢: Fully supported
- 🔵: Partially supported
- 🔴: Not supported

| **Feature**                 | **Reliverse**  | **create-t3-app**  | **create-astro** |
|-----------------------------|----------------|--------------------|------------------|
| **Type Safety**             | 🟡             | 🟡                | 🟡               |
| **Crash Resilience**        | 🟡             | 🟡                | 🟡               |
| **Project Template Options**| 🟡             | 🟡                | 🟡               |
| **Customizable Setup**      | 🟡             | 🟡                | 🟡               |
| **Preconfigured Routing**   | 🟡             | 🟡                | 🟡               |
| **Integrated Testing**      | 🟡             | 🟡                | 🟡               |
| **Environment Configs**     | 🟡             | 🟡                | 🟡               |
| **Code Linting/Formatting** | 🟡             | 🟡                | 🟡               |
| **Automatic Deps Install**  | 🟡             | 🟡                | 🟡               |
| **Monorepo Support**        | 🟡             | 🟡                | 🟡               |
| **Error Handling**          | 🟡             | 🟡                | 🟡               |
| **Documentation**           | 🟡             | 🟡                | 🟡               |
| **Ease of Setup**           | 🟡             | 🟡                | 🟡               |
| **Example Projects**        | 🟡             | 🟡                | 🟡               |

**Related Links**: [ESM/CJS](https://dev.to/iggredible/what-the-heck-are-cjs-amd-umd-and-esm-ikm), ["Pure ESM package"](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c), [Clean code](https://github.com/ryanmcdermott/clean-code-javascript#readme), ["UX patterns for CLI tools"](https://lucasfcosta.com/2022/06/01/ux-patterns-cli-tools.html), [DX (Developer Experience)](https://github.blog/enterprise-software/collaboration/developer-experience-what-is-it-and-why-should-you-care), [TypeBox](https://github.com/sinclairzx81/typebox#readme) -->

## Special Thanks

This project wouldn’t exist without the amazing work of the following projects:

[@reliverse/relinka](https://github.com/SBoudrias/Inquirer.js#readme) | [terkelg/prompts](https://github.com/lu-jiejie/prompts-plus#readme#readme) | [@reliverse/relinka](https://github.com/bombshell-dev/clack#readme) | [create-t3-app](https://github.com/t3-oss/create-t3-app#readme) | [create-astro](https://github.com/withastro/astro/tree/main/packages/create-astro#readme) | [cronvel/terminal-kit](https://github.com/cronvel/terminal-kit#readme) | [unjs/relinka](https://github.com/unjs/relinka#readme)

## Wrap-Up

Reliverse is a powerful CLI tool designed to simplify the setup process for JavaScript, TypeScript, and various other project types, with a particular focus on Next.js templates—though its capabilities extend beyond them. Leveraging [@reliverse/prompts](https://github.com/reliverse/prompts#readme), Reliverse provides a customizable and engaging setup experience, allowing you to quickly bootstrap projects like the fully customizable Relivator Next.js template or pull templates from GitHub and other Git-based sources. It also helps manage configuration files and seamlessly resolves potential conflicts among tools like ESLint, Prettier, and Biome, ensuring a smooth development environment from the start.
