export const DEV_SECRET_PLACEHOLDER = "tally-super-secret-jwt-key-for-development-32chars";

/**
 * Validates and retrieves the NextAuth secret.
 * In production (NODE_ENV === "production"), throws a fatal error if NEXTAUTH_SECRET
 * is missing or set to the known development placeholder.
 */
export function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (
    isProduction &&
    (!secret || secret === DEV_SECRET_PLACEHOLDER || secret.includes("super-secret-jwt-key"))
  ) {
    throw new Error(
      "[Security Error] In production, NEXTAUTH_SECRET must be configured with a secure, unique 32+ character key. Refusing to run with missing secret or default development placeholder."
    );
  }

  return secret || DEV_SECRET_PLACEHOLDER;
}
