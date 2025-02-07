import type { InlinedFile } from "@vercel/sdk/models/createdeploymentop.js";

import fs from "fs-extra";
import path from "pathe";

// TODO: these helpers possibly deprecated, but maybe they can be useful in the future

/**
 * Retrieves a list of files for deployment recursively
 */
export async function getDeploymentFiles(
  directory: string,
): Promise<InlinedFile[]> {
  const files: InlinedFile[] = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(directory, fullPath);
    if (!shouldIncludeFile(relativePath)) continue;
    if (entry.isDirectory()) {
      files.push(...(await getDeploymentFiles(fullPath)));
    } else {
      if (isBinaryPath(relativePath)) {
        const data = await fs.readFile(fullPath, "base64");
        files.push({ file: relativePath, data, encoding: "base64" });
      } else {
        const data = await fs.readFile(fullPath, "utf-8");
        files.push({ file: relativePath, data, encoding: "utf-8" });
      }
    }
  }
  return files;
}

function isBinaryPath(filePath: string): boolean {
  const binaryExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".webp",
    ".mp4",
    ".webm",
    ".mov",
    ".mp3",
    ".wav",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".ttf",
    ".woff",
    ".woff2",
    ".eot",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
  ];
  return binaryExtensions.some((ext) => filePath.toLowerCase().endsWith(ext));
}

function shouldIncludeFile(filePath: string): boolean {
  const excludePatterns = [
    /^\.git\//,
    /^\.env/,
    /^node_modules\//,
    /^\.next\//,
    /^dist\//,
    /^\.vercel\//,
    /^\.vscode\//,
    /^\.idea\//,
    /\.(log|lock)$/,
    /^npm-debug\.log/,
    /^yarn-debug\.log/,
    /^yarn-error\.log/,
  ];
  return !excludePatterns.some((pattern) => pattern.test(filePath));
}

/**
 * Splits files into smaller chunks to avoid size limits.
 */
export function splitFilesIntoChunks(
  files: InlinedFile[],
  maxChunkSize = 8 * 1024 * 1024,
): InlinedFile[][] {
  const chunks: InlinedFile[][] = [];
  let currentChunk: InlinedFile[] = [];
  let currentSize = 0;
  for (const file of files) {
    const fileSize = Buffer.byteLength(
      file.data,
      file.encoding === "base64" ? "base64" : "utf8",
    );
    if (currentSize + fileSize > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(file);
    currentSize += fileSize;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  return chunks.length > 0 ? chunks : [[]];
}
