/**
 * Logs debug messages if the "DEBUG" environment variable is set.
 */
export function relide(...args: unknown[]) {
  if (process.env["DEBUG"]) {
    console.debug("[reliverse]", ...args);
  }
}
