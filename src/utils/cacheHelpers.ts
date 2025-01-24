import { homedir } from "node:os";
import path from "pathe";

/**
 * Directory to cache downloaded tarballs of functions like downloadRepo()
 */
export function cacheDirectory() {
  return path.join(
    process.env["XDG_CACHE_HOME"] ?? path.join(homedir(), ".reliverse"),
    "cache",
  );
}
