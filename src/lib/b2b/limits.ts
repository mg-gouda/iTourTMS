/**
 * Limits the portal and its pages both need to know. Kept out of the service
 * layer so a client component can import them without pulling the database in.
 */

/** Longest stay a partner may search or book in one go. */
export const MAX_STAY_NIGHTS = 30;

/** How long staff have to answer an on-request booking. */
export const ON_REQUEST_HOURS = 48;

/**
 * Where the partner realm's auth endpoints live. Auth.js needs it on the
 * server (`basePath`) and next-auth/react needs it on the client, or the two
 * halves of a sign-in talk to different realms.
 */
export const PARTNER_AUTH_BASE_PATH = "/api/b2b/auth";
