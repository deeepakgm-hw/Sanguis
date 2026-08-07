import * as crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV size
const AUTH_TAG_LENGTH = 16; // GCM standard authentication tag size

// Derive the key buffer once at module load
const KEY = Buffer.from(env.ENCRYPTION_KEY, "hex");

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * The output format is a single colon-delimited string:
 * `iv_hex:auth_tag_hex:ciphertext_hex`
 *
 * @param plaintext The plain text string to encrypt.
 * @returns A colon-delimited string containing the hex-encoded IV, Auth Tag, and Ciphertext.
 */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${ciphertext}`;
}

/**
 * Decrypts a ciphertext string using AES-256-GCM.
 *
 * The input must be a colon-delimited string in the format:
 * `iv_hex:auth_tag_hex:ciphertext_hex`
 *
 * If the input is malformed, an Error is thrown.
 * If the GCM authentication tag verification fails (e.g. data was tampered with),
 * the standard Node crypto auth error is thrown.
 *
 * @param ciphertext The colon-delimited encrypted string.
 * @returns The decrypted plaintext string.
 * @throws Error if the ciphertext format is invalid.
 * @throws Error (Node crypto authentication failure) if the verification fails.
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format. Expected iv:authTag:ciphertext");
  }

  const [ivHex, authTagHex, encryptedTextHex] = parts;

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length.");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid Auth Tag length.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(encryptedTextHex, "hex", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}
