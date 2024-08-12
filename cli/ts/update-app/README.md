# Reliverse CLI: Project Updater

The Reliverse CLI Project Updater is a tool that allows users to easily update their projects bootstrapped with the Reliverse CLI. It provides a seamless way to keep projects up-to-date with the latest version of Reliverse CLI while preserving user modifications.

## Features

- Automatically detects the current version of the project based on the `reli.config.ts` file.
- Bootstraps temporary projects with the old and new versions of Reliverse CLI for comparison.
- Compares the old and new project directories to identify changed files.
- Prompts the user to select the files they want to update.
- Updates the selected files in the user's project directory.

## Prerequisites

- Bun runtime: Make sure you have Bun installed on your system. You can download and install Bun from the official website: [https://bun.sh](https://bun.sh)
- Reliverse CLI: Ensure that you have the latest version of Reliverse CLI installed globally.

## Usage

To update a project bootstrapped with Reliverse CLI, follow these steps:

1. Open your terminal and navigate to the directory of the project you want to update.

2. Install the Reliverse CLI Project Updater:

   ```sh
   bunx add -g @reliverse/updater
   ```

3. Run the following command, replacing `<path-to-project>` with the path to your project (or just run `@reliverse/updater` in the project's root):

   ```sh
   @reliverse/updater <path-to-project>
   ```

4. Follow the interactive prompts to select the files you want to update.

5. Once the update process is complete, the script will display a success message.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvement, please open an issue or submit a pull request on the [GitHub repository](https://github.com/blefnk/reliverse).

### Development

1. Clone the repository:

   ```sh
   git clone https://github.com/blefnk/reliverse.git
   ```

2. Install the dependencies using Bun:

   ```sh
   pnpm install
   ```

3. Navigate to the module directory:

   ```sh
   cd cli/ts/update-project
   ```

4. Run the following command to build the project:

   ```sh
   pnpm run build
   ```

5. Run the following command to start the development server:

   ```sh
   pnpm run dev
   ```

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [Bun](https://bun.sh) - The fast and easy-to-use JavaScript runtime.
- [Astro](https://astro.build) - The all-in-one web framework for building fast, content-focused websites.
- [TypeScript](https://typescriptlang.org) - The typed superset of JavaScript that compiles to plain JavaScript.
- [Reliverse CLI](https://github.com/blefnk/reliverse) - The CLI tool for bootstrapping and managing projects.
