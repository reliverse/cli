import fs from "fs-extra";

import { cliConfigTs } from "~/libs/sdk/constants.js";
import { cliConfigJsonc } from "~/libs/sdk/constants.js";

/**
 * Checks if a directory contains only Reliverse config files
 * @param directory Path to the directory
 * @returns Boolean indicating if the directory contains only Reliverse config files
 */
export async function hasOnlyReliverseConfig(
  directory: string,
): Promise<boolean> {
  try {
    const files = await fs.readdir(directory);

    // If directory is empty, it doesn't have only Reliverse config
    if (files.length === 0) {
      return false;
    }

    // Check if all files are Reliverse config files
    const reliverseConfigFiles = [cliConfigJsonc, cliConfigTs];
    return files.every((file) => reliverseConfigFiles.includes(file));
  } catch (_error) {
    // If there's an error reading the directory, assume it has more than just config
    return false;
  }
}
