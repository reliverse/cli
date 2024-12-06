// import relinka from "@reliverse/relinka";
// import fs from "fs-extra";

// import { verbose } from "~/app/data/constants.js";

/**
 * Retrieves the version number from the package.json file.
 * @returns {string} - The version number.
 */
// export async function getVersion(): Promise<string> {
//   try {
//     const packageJson = await fs.readFile(
//       new URL("../package.json", import.meta.url),
//       "utf-8",
//     );
//     const { version } = JSON.parse(packageJson) as { version: string };
//     verbose && relinka.info(`Retrieved version from package.json: ${version}`);
//     return version;
//   } catch (error) {
//     relinka.error("Error reading package.json to get version:", error);
//     throw error;
//   }
// }
