import { SessionOptions } from "iron-session";

export interface SessionData {
  gameId?: string;
  empireId?: string;
  rateLimitId?: string;
  // Track which games this session has created (for authorization)
  ownedGameIds?: string[];
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long_for_dev",
  cookieName: "nexus_dominion_session",
  cookieOptions: {
    // secure: true should be used in production
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days (reduced from 30)
  },
};

// Declare session data type for TypeScript
declare module "iron-session" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IronSessionData extends SessionData {}
}
