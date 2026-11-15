import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext user password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch (err) {
    console.error('[Auth] Password comparison error:', err);
    return false;
  }
}

/**
 * Hashes a care circle invite code / passcode.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const normalized = passcode.trim().toUpperCase();
  return bcrypt.hash(normalized, SALT_ROUNDS);
}

/**
 * Compares a candidate invite code against a stored hash (or plain code fallback).
 */
export async function comparePasscode(candidate: string, hashOrPlain?: string): Promise<boolean> {
  if (!candidate || !hashOrPlain) return false;
  const normalized = candidate.trim().toUpperCase();

  // If plain code matches directly
  if (normalized === hashOrPlain.trim().toUpperCase()) {
    return true;
  }

  // If hash is bcrypt hash ($2a$ or $2b$)
  if (hashOrPlain.startsWith('$2a$') || hashOrPlain.startsWith('$2b$')) {
    try {
      return await bcrypt.compare(normalized, hashOrPlain);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Generates an accessible, human-friendly 6-character care circle invite code.
 * Example: NEST72, CARE49, CIRC83
 */
export function generateInviteCode(prefix = 'NEST'): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${digits}`;
}
