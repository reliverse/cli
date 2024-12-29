import fs from "fs-extra";
import path from "pathe";

function replaceTextInFiles(
  directoryPath: string,
  search: string,
  replacement: string,
): void {
  const files = fs.readdirSync(directoryPath);

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      replaceTextInFiles(filePath, search, replacement);
    } else {
      const data = fs.readFileSync(filePath, "utf8");
      const updatedData = data.replace(new RegExp(search, "g"), replacement);
      fs.writeFileSync(filePath, updatedData, "utf8");
    }
  });
}

export const setImportAlias = (projectDir: string, importAlias: string) => {
  const normalizedImportAlias = importAlias
    .replace(/\*/g, "") // remove any wildcards (~/* -> ~/)
    // eslint-disable-next-line no-useless-escape
    .replace(/[^\/]$/, "$&/"); // ensure trailing slash (@ -> ~/)

  // update import alias in any files if not using the default
  replaceTextInFiles(projectDir, "~/", normalizedImportAlias);
};
