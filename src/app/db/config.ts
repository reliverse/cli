import { relinka } from "@reliverse/prompts";
import { subtle, getRandomValues } from "uncrypto";

// Encryption key based on machine-specific data
async function getDerivedKey(): Promise<CryptoKey> {
  const machineId = `${process.platform}-${process.arch}-${process.env["USERNAME"] ?? process.env["USER"]}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(machineId);

  // Create a hash of the machine ID
  const hashBuffer = await subtle.digest("SHA-256", data);

  // Import the hash as a key
  return subtle.importKey(
    "raw",
    hashBuffer,
    { name: "AES-CBC", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encrypt(text: string): Promise<string> {
  try {
    if (text === null || text === undefined) {
      throw new Error("Cannot encrypt null or undefined value");
    }

    // Convert to string explicitly in case we get a non-string value
    const textToEncrypt = String(text);

    // Generate random IV
    const iv = new Uint8Array(16);
    getRandomValues(iv);

    // Get the encryption key
    const key = await getDerivedKey();

    // Encode the text
    const encoder = new TextEncoder();
    const data = encoder.encode(textToEncrypt);

    // Encrypt the data
    const encryptedBuffer = await subtle.encrypt(
      { name: "AES-CBC", iv },
      key,
      data,
    );

    // Convert to hex strings for storage
    const ivHex = Array.from(iv)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const encryptedHex = Array.from(new Uint8Array(encryptedBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return `${ivHex}:${encryptedHex}`;
  } catch (error) {
    relinka(
      "error",
      "Error encrypting value:",
      `${error instanceof Error ? error.message : String(error)} (type: ${typeof text}, value: ${text})`,
    );
    throw error;
  }
}

export async function decrypt(text: string): Promise<string> {
  try {
    const [ivHex, encryptedHex] = text.split(":");
    if (!ivHex || !encryptedHex) {
      throw new Error("Invalid encrypted text format");
    }

    // Convert hex strings back to buffers
    const iv = new Uint8Array(
      ivHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );
    const encryptedData = new Uint8Array(
      encryptedHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );

    // Get the decryption key
    const key = await getDerivedKey();

    // Decrypt the data
    const decryptedBuffer = await subtle.decrypt(
      { name: "AES-CBC", iv },
      key,
      encryptedData,
    );

    // Decode the result
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    relinka(
      "error",
      "Error decrypting value:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
