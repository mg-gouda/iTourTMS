import { partnerHandlers } from "@/lib/auth-partner";

/**
 * The partner realm's own Auth.js endpoints, separate from /api/auth so a
 * partner sign-in can never mint a staff cookie or vice versa.
 */
export const { GET, POST } = partnerHandlers;
