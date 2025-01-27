export const validateImportAlias = (input: string): string | undefined => {
  if (input.startsWith(".") || input.startsWith("/")) {
    return "Import alias can't start with '.' or '/'";
  }
  return undefined;
};
