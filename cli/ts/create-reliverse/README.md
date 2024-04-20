# Reliverse CLI

Reliverse CLI is a powerful command-line tool that allows you to bootstrap web templates in seconds. It provides a seamless way to kickstart your projects with various options and configurations.

## Installation

To install Reliverse CLI, follow these steps:

1. Make sure you have [Node.js](https://nodejs.org) installed on your system.
2. Run one of the following commands to install Reliverse CLI globally:

   ```sh
   bun add -g reliverse # bun
   pnpm add -g reliverse # pnpm
   yarn global add reliverse # yarn
   npm install -g reliverse # npm
   ```

3. Once the installation is complete, you can start using Reliverse CLI.

If global installation fails, try these commands:

   ```sh
   bunx reliverse # bun
   pnpx reliverse # pnpm
   yarn reliverse # yarn
   npx reliverse # npm
   ```

## Usage

To create a new project using Reliverse CLI, follow these steps:

1. Open your terminal and navigate to the directory where you want to create your project.
2. Just run the following command, that's it:

   ```sh
   reliverse
   ```

3. Follow the interactive prompts to configure your project options.
4. Once the configuration is complete, Reliverse CLI will bootstrap your project with the selected options.

## Adding New Options to Reliverse CLI

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

## Contributing

We welcome contributions to Reliverse CLI! If you have any ideas, suggestions, or bug reports, please open an issue on the [GitHub repository](https://github.com/blefnk/reliverse). If you'd like to contribute code, please fork the repository and submit a pull request.

## License

Reliverse CLI is open-source software licensed under the [MIT license](https://opensource.org/licenses/MIT).
