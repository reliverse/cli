import fs from "fs-extra";
import path from "pathe";

const distDir = path.resolve(__dirname, "dist");

function replaceImportPaths(
  content: string,
  fileDir: string,
  rootDir: string,
): string {
  return content.replace(
    /(from\s+['"])~(\/[^'"]*)(['"])/g,
    (match, prefix, importPath, suffix) => {
      const relativePathToRoot = path.relative(fileDir, rootDir) || ".";
      let newPath = path.join(relativePathToRoot, importPath);
      newPath = newPath.replace(/\\/g, "/");
      if (!newPath.startsWith(".")) {
        newPath = `./${newPath}`;
      }
      return `${prefix}${newPath}${suffix}`;
    },
  );
}

async function processFiles(dir: string) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await processFiles(filePath);
    } else if (filePath.endsWith(".js") || filePath.endsWith(".d.ts")) {
      const content = fs.readFileSync(filePath, "utf8");

      const updatedContent = replaceImportPaths(
        content,
        path.dirname(filePath),
        distDir,
      );

      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent, "utf8");
      }
    }
  }
}

processFiles(distDir).catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
