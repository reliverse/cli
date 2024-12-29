export function generateSecureString({
  length = 44,
  charset = "alphanumeric",
  purpose = "general",
}: {
  length?: number;
  charset?: "alphanumeric" | "numeric" | "alphabetic";
  purpose?: string;
}): string {
  const charsets: Record<string, string> = {
    alphanumeric:
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    numeric: "0123456789",
    alphabetic: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  };

  const purposeLengths: Record<string, number> = {
    "auth-secret": 44,
    "encryption-key": 64,
    general: 44,
  };

  const finalLength = purposeLengths[purpose] ?? length;
  const chars = charsets[charset] ?? charset;
  const bytes = new Uint8Array(finalLength);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => chars.charAt(byte % chars.length))
    .join("");
}
