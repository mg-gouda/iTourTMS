import crypto from "crypto";
import bcrypt from "bcryptjs";

const CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

/**
 * Generate a license key in the format xxxx-xxxx-xxxx-xxxx
 * using cryptographically secure random bytes.
 */
export async function generateLicenseKey(): Promise<{
  plainKey: string;
  keyHash: string;
  keyPrefix: string;
  keySuffix: string;
}> {
  const bytes = crypto.randomBytes(16);
  const chars: string[] = [];
  for (let i = 0; i < 16; i++) {
    chars.push(CHARSET[bytes[i]! % CHARSET.length]!);
  }

  const plainKey = [
    chars.slice(0, 4).join(""),
    chars.slice(4, 8).join(""),
    chars.slice(8, 12).join(""),
    chars.slice(12, 16).join(""),
  ].join("-");

  const keyHash = await bcrypt.hash(plainKey, 12);
  const keyPrefix = plainKey.slice(0, 4);
  const keySuffix = plainKey.slice(-4);

  return { plainKey, keyHash, keyPrefix, keySuffix };
}

/**
 * Verify a license key against a bcrypt hash.
 */
export async function verifyLicenseKey(
  inputKey: string,
  storedHash: string,
): Promise<boolean> {
  return bcrypt.compare(inputKey, storedHash);
}

/** Number of days a license is valid after activation. */
export const LICENSE_VALIDITY_DAYS = 365;

/** Number of days before expiry to send a warning notification. */
export const LICENSE_EXPIRY_WARNING_DAYS = 30;
