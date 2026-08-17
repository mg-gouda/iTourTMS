import bcrypt from "bcryptjs";

/**
 * Work factor for every password we hash. Raising this is safe: existing hashes
 * keep verifying at their own cost, and `isStaleHash` lets the login path
 * rewrite them transparently on next sign-in.
 */
export const PASSWORD_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, PASSWORD_COST);
}

/**
 * True when a stored hash was written at a lower cost than we now require.
 * Partner passwords were hashed at 10 for a long time, which both weakened them
 * and made their verification measurably faster than the cost-12 decoy compare
 * used for unknown accounts — turning the anti-enumeration fix into an oracle.
 */
export function isStaleHash(hash: string): boolean {
  try {
    return bcrypt.getRounds(hash) < PASSWORD_COST;
  } catch {
    // Not a bcrypt hash we can read — leave it alone rather than guess.
    return false;
  }
}
