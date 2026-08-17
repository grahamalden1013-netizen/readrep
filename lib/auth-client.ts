"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth client. Only ever touches the public `/api/auth/*` routes —
 * the Google client secret stays on the server.
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
