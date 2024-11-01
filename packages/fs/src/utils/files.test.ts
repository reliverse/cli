import { describe, it, expect } from "vitest";
import fs from "fs-extra";
import {
  removeFile,
  fileExists,
  getFoldersInDirectory,
  removeFolder,
} from "./files";

describe("removeFile", () => {
  it("should remove the file if it exists", async () => {
    const filePath = "/tmp/testfile.txt";
    await fs.outputFile(filePath, "content");
    await removeFile(filePath);
    const exists = await fs.pathExists(filePath);
    expect(exists).toBe(false);
  });

  it("should throw an error if the file does not exist", async () => {
    const filePath = "/tmp/nonexistent.txt";
    await expect(removeFile(filePath)).rejects.toThrow(
      "⛔ Could not read the file.",
    );
  });
});

describe("fileExists", () => {
  it("should return true if the file exists", async () => {
    const filePath = "/tmp/existing.txt";
    await fs.outputFile(filePath, "content");
    const exists = await fileExists(filePath);
    expect(exists).toBe(true);
    await fs.remove(filePath);
  });

  it("should return false if the file does not exist", async () => {
    const filePath = "/tmp/nonexistent.txt";
    const exists = await fileExists(filePath);
    expect(exists).toBe(false);
  });
});

describe("getFoldersInDirectory", () => {
  it("should return a list of directories in the given path", () => {
    const directory = "/tmp/testdir";
    fs.ensureDirSync(`${directory}/subdir1`);
    fs.ensureDirSync(`${directory}/subdir2`);
    fs.outputFileSync(`${directory}/file.txt`, "content");
    const folders = getFoldersInDirectory(directory);
    expect(folders).toEqual(["subdir1", "subdir2"]);
    fs.removeSync(directory);
  });
});

describe("removeFolder", () => {
  it("should remove the folder and its contents", async () => {
    const folderPath = "/tmp/testfolder";
    fs.ensureDirSync(`${folderPath}/subfolder`);
    fs.outputFileSync(`${folderPath}/file.txt`, "content");
    await removeFolder(folderPath);
    const exists = fs.existsSync(folderPath);
    expect(exists).toBe(false);
  });
});
