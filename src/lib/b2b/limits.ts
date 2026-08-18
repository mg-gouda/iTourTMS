/**
 * Limits the portal and its pages both need to know. Kept out of the service
 * layer so a client component can import them without pulling the database in.
 */

/** Longest stay a partner may search or book in one go. */
export const MAX_STAY_NIGHTS = 30;

/** How long staff have to answer an on-request booking. */
export const ON_REQUEST_HOURS = 48;
