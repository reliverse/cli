type ValidationResult = {
  isValid: boolean;
  message?: string;
};

/**
 * Validates a name against allowed characters
 */
export function isValidName(name: string): ValidationResult {
  if (!/^[a-zA-Z0-9-]+$/.test(name)) {
    return {
      isValid: false,
      message:
        "Project name can only contain latin letters, numbers and hyphens",
    };
  }
  return { isValid: true };
}

/**
 * Cleans up project name from config by removing scope and invalid characters.
 * For paths with multiple segments (e.g. "@org/subpath/cli"), takes the last segment.
 * This also ensures complex cases (e.g. "@some@weird/path/the-name!" returns "the-name").
 */
export function normalizeName(name: string): string {
  // Take the last segment after any slashes (e.g. "@org/subpath/cli" -> "cli")
  const segments = name.split("/");
  const lastSegment = segments[segments.length - 1] ?? name;

  // Keep only valid characters
  return lastSegment.replace(/[^a-zA-Z0-9-]/g, "");
}
