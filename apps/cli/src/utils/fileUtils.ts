// fileUtils.ts
import fs from "fs-extra";

// Utility function to check if a file exists
export const checkFileExists = (filePath: string): boolean =>
  fs.pathExistsSync(filePath);

// Function to rename a file
export const renameFile = async (
  oldPath: string,
  newPath: string,
): Promise<void> => {
  await fs.rename(oldPath, newPath);
};

// Function to remove a file
export const removeFile = async (filePath: string): Promise<void> => {
  await fs.remove(filePath);
};
