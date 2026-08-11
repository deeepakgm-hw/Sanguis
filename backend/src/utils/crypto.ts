import crypto from "crypto";
import { logger } from "./logger";
import { env } from "../config/env";

// Standard AES-256-GCM settings
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes is the standard IV length for GCM

// Generate or derive a 32-byte key
const ENCRYPTION_KEY: Buffer = Buffer.from(env.ENCRYPTION_KEY, "hex");


/**
 * Encrypts cleartext using AES-256-GCM.
 * Returns a colon-separated string in the format "iv:authTag:ciphertext"
 */
export function encrypt(text: string): string {
  if (!text) return "";
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    logger.error({ err }, "Encryption failed");
    throw new Error("Symmetric encryption failed");
  }
}

/**
 * Decrypts a colon-separated cipher string "iv:authTag:ciphertext" using AES-256-GCM.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid ciphertext format. Expected iv:authTag:ciphertext");
    }
    
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (err) {
    logger.error({ err }, "Decryption failed - cipher may be tampered or key is invalid");
    return ""; // Return empty string or handle gracefully
  }
}
