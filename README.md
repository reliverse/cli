# Reliverse

[GitHub](https://github.com/reliverse/cli), [npmjs](https://npmjs.com/package/reliverse)

**Reliverse** is a CLI tool designed to streamline the setup of JavaScript, TypeScript, and other types of projects, with a primary focus on Next.js templates, though it is not limited to them.

It allows you to effortlessly bootstrap projects, including the [Relivator Next.js template](https://github.com/blefnk/relivator-nextjs-template) or any other template from GitHub or other Git-based sources. Additionally, Reliverse assists in managing configuration files and resolving potential conflicts between tools like ESLint, Prettier, and Biome.

Reliverse is more than just the easiest way to install Relivator. It’s also the most convenient new way to download any repository from GitHub and automatically prepare it for work. Especially if it’s a project from the JavaScript ecosystem.

The mission of this project is not only to help you install templates in seconds. It is also a desire to make web development more accessible to everyone. It’s a commitment to fixing many things that don’t work in the ecosystem. It’s a wish to share templates, libraries, and tools with the world that deserve attention. It’s also a drive to motivate developers to become contributors to various projects that need and deserve it.

## TL;DR

**It's a single tool for everything.** At its current stage, Reliverse CLI is a powerful website builder and project bootstrapper, right in your terminal. However, it won’t be only a website builder in the future, it will be a tool for building anything. Even now, you can start from scratch or with a template, setting everything up automatically or customizing it to your exact preferences. With all the tools pre-configured and ready to go, you can build exactly what you envision.

Remember the feeling of empowerment when you first used a website builder like WordPress? It gave you the freedom to create. But eventually, you hit limits—PageSpeed Insights flagged issues, performance lagged, and the bloated size of your site became hard to ignore.

*That’s where Reliverse comes in.* Reliverse is designed to fix the problems of traditional website builders, offering a universal toolset that lets you create anything you can imagine—efficiently and with ease.

## Get Started

Reliverse is still in its early stages, but it already allows you to bootstrap websites quickly. Soon, advanced customization options will be available, along with other exciting features. You're going to love what's coming.

By the way, you might think that a CLI doing so many things would become bloated, like an elephant in the room, but don’t worry—it’s going to be lean. This is the dream of a creator, a dream that must become reality. Everything has to be perfect.

## Installation

You should install [Git](https://git-scm.com), [VSCode](https://code.visualstudio.com), and [Node.js LTS](https://nodejs.org/en/download/package-manager) first. Then use one of the following commands to install **Reliverse**:

- With [bun](https://bun.sh): `bun i -g reliverse`
- With [pnpm](https://pnpm.io/installation#using-corepack): `pnpm add -g reliverse`
- With [yarn](https://yarnpkg.com): `yarn global add reliverse`
- With [npm](https://nodejs.org/en/learn/getting-started/an-introduction-to-the-npm-package-manager): `npm i -g reliverse`

## Usage

Once installed, you can use **Reliverse CLI** to create new projects or manage existing ones. Navigate to the root of your desired directory and run:

```bash
reliverse
```

> **Temporary issue**: It seems that currently if you build and publish a project using Bun, then the project does not run with a global installation, so *now wherever README.md says to use `bun`, please use `pnpm` instead*.

## Features

- **Create Projects**: Build new projects from scratch, including your own version of the **Relivator Next.js template**, or install any other templates from GitHub.
- **Support for JavaScript/TypeScript Projects**: Primarily designed for React and Next.js projects, but works with other JavaScript/TypeScript libraries as well.
- **Automatic Configuration Management**: Handles project configuration, including ESLint, Biome, Putout, GitHub, and IDE settings.
- **Conflict Resolution**: Detects existing configurations and helps resolve file conflicts, giving you control over which files to keep or replace.
- **Interactive Prompts**: Customize your setup through interactive prompts that allow you to select which file categories to include.
- **Template-Driven**: Automatically clones and installs templates from GitHub to kickstart your development.
- **Unlimited Possibilities**: It can work not only with templates! Are you going to clone a JS library? Feel free to use Reliverse!
- **Anything Else?!**: Currently, the CLI is optimized for JS/TS projects (like React, Astro, Vue, Svelte, etc). This is the dream of Reliverse's founder—a single tool designed for everything.

### Commands

The Reliverse CLI provides a series of interactive prompts to guide you through the project setup:

1. **Create a New Project**: Build from scratch or use predefined templates.
2. **Install GitHub Templates**: Install any JavaScript/TypeScript project by providing a GitHub repository URL.
3. **Manage Configurations**: The CLI checks for existing configuration files and assists you in handling any conflicts.
4. **File Categories**: Select from a variety of configuration categories for your project setup, such as ESLint, Biome, Putout, GitHub settings, and IDE preferences.
5. **Post-Editing**: Reliverse is there for you throughout your entire development journey. You can run `reliverse` even in an already installed project. If your project's `package.json` contains an `appts` script, that’s also a local piece of `reliverse` within your project.

### Example Workflow

Here’s an example session of using **Reliverse CLI**:

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
```

## Configuration Categories

When setting up a project, you can choose from the following file categories:

1. **eslint, biome, putout**
   - `.eslintrc.js`, `biome.json`, `.putout.json`
2. **GitHub**
   - `.github`, `README.md`
3. **IDE**
   - `.vscode`
4. **Reliverse configs**
   - `reliverse.config.ts`, `reliverse.info.ts`

## Conflict Management

**Reliverse CLI** helps you handle configuration conflicts for existing files such as `.eslintrc.cjs` or `prettier.config.js`. It prompts you with options to:

- **Remove**: Delete the existing file.
- **Rename**: Rename the file (e.g., add `.txt` to disable it).
- **Do Nothing**: Keep the existing file.

### Conflict Example

```bash
? .eslintrc.cjs file exists. Do you want to remove or rename it?
  1. Remove
  2. Rename to .eslintrc.cjs.txt
  3. Do nothing
```

### Prettier Conflict Example

```bash
? prettier.config.js found. Biome will be installed, so Prettier is not necessary.
  1. Remove
  2. Rename to prettier.config.js.txt
  3. Do nothing
```

## Installing Other Templates

You can install any JavaScript/TypeScript project (not just Next.js templates—anything, including JS libraries) from a GitHub repository by providing the repository URL during the interactive setup:

```bash
$ reliverse

? How do you want to proceed?
  1. I want to build my own Relivator from scratch
  2. I just want to install a template from GitHub
  3. I want to clone a library/tool from GitHub

? Enter the GitHub repository link: (e.g., `https://github.com/user/repo`)
```

Reliverse will then clone the repository and set up the project.

## Development

### Clone the Repository

#### Using Reliverse

You can use Reliverse itself to install it locally! 😄

Visit the [Installation](#installation) section and select **Tools Installation** when choosing to **Clone Reliverse Repository for Local Development**.

#### Classical Method

To contribute to **Reliverse CLI**, you can clone the repository and install the dependencies:

```bash
git clone https://github.com/reliverse/cli.git
cd reliverse
bun i # OR pnpm i OR yarn install OR npm i
```

### Running Locally

To run the CLI locally for development purposes, use:

```bash
bun dev
# or
pnpm dev
# or
yarn dev
# or
npm dev
```

## Contributing

We welcome contributions! Feel free to open issues or submit pull requests. Please ensure your code adheres to our linting guidelines by running `bun appts` before submitting.

> **Temporary issue**: It seems that currently if you build and publish a project using Bun, then the project does not run with a global installation, so *now wherever README.md says to use `bun`, please use `pnpm` instead*.

Reliverse takes a different, non-standard approach compared to other bootstrappers. The author has observed many CLIs handling project bootstrapping, some of which are quite impressive. However, their repositories often contain numerous files that are eventually bundled into a single `index.js`, functioning like an installer wizard. This leads to cluttered repositories, typically set up as monorepos, adding complexity. In contrast, the `reliverse/cli` repository downloads specific files from existing repositories and only copies or generates files when absolutely necessary.

## License

This project is licensed under the MIT License—see the [LICENSE](LICENSE) file for more details.
