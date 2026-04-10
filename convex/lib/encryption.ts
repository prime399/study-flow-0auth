/**
 * Encryption utilities for securing API keys in the database
 * Uses AES-256-GCM encryption with Web Crypto API
 */

/**
 * Get the encryption key from environment variables
 * This should be a 256-bit (32 byte) key stored as a base64 string
 */
function getEncryptionKey(): string {
  const key = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!key) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET environment variable is not set. " +
      "Please set it in your Convex dashboard with a secure 32-byte base64-encoded key."
    );
  }
  return key;
}

/**
 * Convert a base64 string to a CryptoKey
 */
async function importKey(base64Key: string): Promise<CryptoKey> {
  // Decode base64 to raw bytes
  const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt an API key
 * Returns base64-encoded string in format: iv:encryptedData
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  try {
    const encryptionKey = getEncryptionKey();
    const cryptoKey = await importKey(encryptionKey);

    // Generate a random 12-byte IV (96 bits, recommended for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the API key
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);

    const encryptedData = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      cryptoKey,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Error encrypting API key:", error);
    throw new Error("Failed to encrypt API key");
  }
}

/**
 * Decrypt an API key
 * Takes base64-encoded string in format: iv:encryptedData
 */
export async function decryptApiKey(encryptedData: string): Promise<string> {
  try {
    const encryptionKey = getEncryptionKey();
    const cryptoKey = await importKey(encryptionKey);

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV (first 12 bytes) and encrypted data (rest)
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      cryptoKey,
      data
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error("Error decrypting API key:", error);
    throw new Error("Failed to decrypt API key");
  }
}

/**
 * Generate a random 256-bit encryption key (for setup purposes)
 * This is a helper function - the actual key should be generated once
 * and stored securely in environment variables
 */
export function generateEncryptionKey(): string {
  const keyData = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...keyData));
}

/**
 * Mask an API key for display purposes
 * Shows only first 4 and last 4 characters
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "*".repeat(apiKey.length);
  }
  const first4 = apiKey.slice(0, 4);
  const last4 = apiKey.slice(-4);
  const maskedLength = apiKey.length - 8;
  return `${first4}${"*".repeat(maskedLength)}${last4}`;
}
