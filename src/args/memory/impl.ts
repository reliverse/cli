import type { ParsedUrlQuery } from "querystring";

import fs from "fs-extra";
import os from "os";
import path from "pathe";

import { MEMORY_FILE } from "~/app/data/constants.js";
import { relinka } from "~/utils/console.js";

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // File might not exist yet, that's ok
    }

    // Merge existing data with new data
    const mergedData = { ...existingData, ...data };

    await fs.writeFile(filePath, JSON.stringify(mergedData, null, 2));
    relinka("success-verbose", `Memory updated in ${filePath}`);
  } catch (error) {
    relinka("error", "Error updating memory:", error.toString());
    throw error;
  }
}

export async function readReliverseMemory(): Promise<MemoryFileData> {
  const homeDir = os.homedir();
  const filePath = path.join(homeDir, MEMORY_FILE);
  try {
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      relinka("info-verbose", `Memory file not found at ${filePath}`);
      return { code: null, key: null, user: null };
    }
    const data = await fs.readFile(filePath, "utf8");
    const parsedData = JSON.parse(data) as MemoryFileData;
    const { code, key, user } = parsedData;
    return { code, key, user };
  } catch (error) {
    relinka("error", "Error reading memory file:", error.toString());
    return { code: null, key: null, user: null };
  }
}
