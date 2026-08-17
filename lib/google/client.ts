import "server-only";

import { google, type calendar_v3 } from "googleapis";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Raised when the user has no usable Google grant and must reconnect. */
export class GoogleNotConnectedError extends Error {
  constructor(message = "Google Calendar is not connected.") {
    super(message);
    this.name = "GoogleNotConnectedError";
  }
}

/** Raised when the stored grant exists but Google rejected it. */
export class GoogleAuthExpiredError extends Error {
  constructor(message = "Google access expired. Please reconnect.") {
    super(message);
    this.name = "GoogleAuthExpiredError";
  }
}

export async function hasGoogleConnection(userId: string): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
    select: { id: true },
  });
  return account !== null;
}

/**
 * Returns a currently-valid Google access token for the user, refreshing it
 * through Better Auth when it is close to expiry. Works without an incoming
 * request, so background sync jobs can use it too.
 */
export async function getGoogleAccessToken(userId: string): Promise<string> {
  if (!(await hasGoogleConnection(userId))) {
    throw new GoogleNotConnectedError();
  }

  try {
    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: "google", userId },
    });
    if (!accessToken) throw new GoogleAuthExpiredError();
    return accessToken;
  } catch (error) {
    if (error instanceof GoogleAuthExpiredError) throw error;
    // A failed refresh means the grant was revoked or the refresh token was
    // never issued; either way the user has to reconnect.
    throw new GoogleAuthExpiredError(
      error instanceof Error ? error.message : undefined,
    );
  }
}

/** Builds a read-only Google Calendar API client bound to the user's token. */
export async function getCalendarClient(
  userId: string,
): Promise<calendar_v3.Calendar> {
  const accessToken = await getGoogleAccessToken(userId);
  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth: authClient });
}

/**
 * Normalizes Google API failures into our own error types so callers can tell
 * "needs reconnect" apart from "transient".
 */
export function translateGoogleError(error: unknown): Error {
  const status =
    typeof error === "object" && error !== null && "code" in error
      ? Number((error as { code: unknown }).code)
      : undefined;

  if (status === 401 || status === 403) {
    return new GoogleAuthExpiredError(
      "Google rejected the stored credentials. Reconnect your Google account.",
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}
