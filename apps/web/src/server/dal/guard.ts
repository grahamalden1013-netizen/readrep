import "server-only";
import { AuthorizationError } from "@readrep/domain";
import { NotAuthenticatedError } from "../auth/authorize";

/**
 * Turns an authorization failure into a page-level outcome.
 *
 * Denials must not surface as HTTP 500. A 500 tells a caller "something broke
 * here", which is both wrong and a small information leak: it confirms the
 * route did real work on a resource. Returning `null` lets the page render
 * `notFound()`, so a caller who is not entitled to a resource cannot tell it
 * apart from one that does not exist.
 *
 * The denial itself is already recorded in the audit log by
 * `requirePermission` before the error is thrown, so nothing is lost by
 * swallowing it here.
 */
export const denyAsMissing = async <T>(load: () => Promise<T>): Promise<T | null> => {
  try {
    return await load();
  } catch (error) {
    if (error instanceof AuthorizationError) return null;
    throw error;
  }
};

export { NotAuthenticatedError };
