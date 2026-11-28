import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM

/**
 * Returns a 32-byte Buffer key derived from PASSWORD_ENCRYPTION_KEY in .env.
 * Uses SHA-256 hashing to guarantee exact 256-bit (32 bytes) key length.
 */
function getEncryptionKey(): Buffer {
  const secretKey =
    process.env.PASSWORD_ENCRYPTION_KEY ||
    "bharatedge-enterprise-superadmin-password-encryption-key-2026";

  // Derive 32 bytes deterministically
  return crypto.createHash("sha256").update(secretKey).digest();
}

/**
 * Encrypts a plaintext password using AES-256-GCM.
 * Output format: `iv_hex:authTag_hex:ciphertext_hex`
 */
export function encryptPassword(plaintext: string): string {
  if (!plaintext) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an AES-256-GCM encrypted password string.
 * Expects format: `iv_hex:authTag_hex:ciphertext_hex`
 * Returns the decrypted plaintext string, or null if decryption fails.
 */
export function decryptPassword(encryptedPayload: string | null | undefined): string | null {
  if (!encryptedPayload) return null;

  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) {
      return null;
    }

    const [ivHex, authTagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(cipherHex, "hex");

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    console.warn("[EncryptionHelper] Failed to decrypt password payload:", err);
    return null;
  }
}
