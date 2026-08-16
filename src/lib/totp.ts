import { createHash, randomInt } from "node:crypto";

import { Secret, TOTP } from "otpauth";

const ISSUER = "iTourTMS";

/** Builds a TOTP instance — new random secret when `secret` is omitted. */
export function createTotp(email: string, secret?: string) {
  return new TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret ? Secret.fromBase32(secret) : new Secret({ size: 20 }),
  });
}

/** Validates a 6-digit code, tolerating one 30s step of clock drift. */
export function verifyTotp(email: string, secret: string, token: string) {
  return createTotp(email, secret).validate({ token, window: 1 }) !== null;
}

// Backup codes are letters only so the login box can tell them apart from a
// 6-digit TOTP without asking the user which one they are typing.
const BACKUP_ALPHABET = "abcdefghijkmnopqrstuvwxyz"; // no "l" — reads as 1
export const BACKUP_CODE_LENGTH = 8;
export const BACKUP_CODE_COUNT = 10;

/** Strips formatting so "ABCD EFGH" and "abcdefgh" hash the same. */
export function normalizeBackupCode(code: string) {
  return code.replace(/[^a-zA-Z]/g, "").toLowerCase();
}

/** Codes are high-entropy random, so a plain sha256 is enough — no KDF needed. */
export function hashBackupCode(code: string) {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

/** Returns the plaintext codes — shown once, only their hashes are stored. */
export function generateBackupCodes() {
  return Array.from({ length: BACKUP_CODE_COUNT }, () =>
    Array.from(
      { length: BACKUP_CODE_LENGTH },
      () => BACKUP_ALPHABET[randomInt(BACKUP_ALPHABET.length)],
    ).join(""),
  );
}
