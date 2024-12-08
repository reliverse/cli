import type { ParsedUrlQuery } from "querystring";

import relinka from "@reliverse/relinka";
import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { MEMORY_FILE, verbose } from "~/app/data/constants.js";

type MemoryFileData = {
  code?: string | null;
  key?: string | null; // TODO: rename to `token`
  user?: {
    name?: string;
    email?: string;
  } | null;
};

export async function updateReliverseMemory(
  data: MemoryFileData | ParsedUrlQuery,
) {
  try {
    const homeDir = os.homedir();
    const filePath = path.join(homeDir, MEMORY_FILE);

    // Read existing data first
    let existingData: MemoryFileData = {};
    try {
      const fileContent = await fs.readFile(filePath, "utf8");
      existingData = JSON.parse(fileContent);
    } catch (err) {
      // File might not exist yet, that's ok
    }

    // Merge existing data with new data
    const mergedData = { ...existingData, ...data };

    await fs.writeFile(filePath, JSON.stringify(mergedData, null, 2));
    verbose && console.log(`Memory updated in ${filePath}`);
  } catch (error) {
    relinka.error("Error updating memory:", error);
    throw error;
  }
}

export async function readReliverseMemory(): Promise<MemoryFileData> {
  const homeDir = os.homedir();
  const filePath = path.join(homeDir, MEMORY_FILE);
  try {
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      verbose && console.log(`Memory file not found at ${filePath}`);
      return { code: null, key: null, user: null };
    }
    const data = await fs.readFile(filePath, "utf8");
    const parsedData = JSON.parse(data) as MemoryFileData;
    const { code, key, user } = parsedData;
    return { code, key, user };
  } catch (error) {
    relinka.error("Error reading memory file:", error);
    return { code: null, key: null, user: null };
  }
}
