import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { DEFAULT_PREFERENCES } from "@/lib/preferences";

/**
 * Google OAuth scopes.
 *
 * Deliberately read-only: the agent plans, it never writes to Google Calendar.
 * `calendar.readonly` covers reading events; `calendar.calendarlist.readonly`
 * lets us discover which calendars exist (including the subscribed Schoology
 * feed) so calendar IDs are never hard-coded.
 */
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];

export const auth = betterAuth({
  appName: "Homework Agent",
  secret: serverEnv.betterAuthSecret,
  baseURL: serverEnv.betterAuthUrl,

  database: prismaAdapter(prisma, {
    provider: "postgresql",
    transaction: true,
  }),

  socialProviders: {
    google: {
      clientId: serverEnv.googleClientId,
      clientSecret: serverEnv.googleClientSecret,
      scope: GOOGLE_CALENDAR_SCOPES,
      // `offline` + `consent` are what make Google hand back a refresh token,
      // without which background syncing stops working after ~1 hour.
      accessType: "offline",
      prompt: "consent",
    },
  },

  account: {
    // Tokens are encrypted at rest by Better Auth using BETTER_AUTH_SECRET.
    encryptOAuthTokens: true,
  },

  user: {
    additionalFields: {
      timezone: {
        type: "string",
        required: false,
        defaultValue: "America/New_York",
        input: false,
      },
      preferences: {
        type: "json",
        required: false,
        defaultValue: DEFAULT_PREFERENCES,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },

  // Must be last: lets Better Auth set cookies from Server Actions.
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
