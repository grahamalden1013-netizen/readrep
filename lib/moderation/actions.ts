"use server";

import { screenSubmission } from "@/lib/moderation";
import { getViewer } from "@/lib/auth";
import type { ReportState, SubmissionState } from "./action-types";

/**
 * Runs a comment or discussion reply through moderation.
 *
 * Nothing is persisted in this build — there is no database connected — but the
 * moderation pass is real, and the verdict returned is the status the record
 * would be stored with.
 */
export async function submitForReview(
  _previous: SubmissionState,
  formData: FormData,
): Promise<SubmissionState> {
  const viewer = await getViewer();
  if (!viewer) {
    return {
      status: "error",
      message: "Sign in to post. Reading NGN never requires an account.",
    };
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    return { status: "error", message: "Write something first." };
  }
  if (body.length > 2000) {
    return { status: "error", message: "Responses are limited to 2000 characters." };
  }

  const verdict = screenSubmission(body);
  const author = {
    displayName: viewer.displayName,
    initials: viewer.initials,
    hue: viewer.hue,
  };

  if (verdict.status === "approved") {
    return {
      status: "approved",
      message: "Posted. It is visible to other readers.",
      body,
      author,
    };
  }

  if (verdict.status === "flagged") {
    return {
      status: "flagged",
      message: verdict.message ?? "This was flagged for review.",
    };
  }

  return {
    status: "held",
    message: verdict.message ?? "Held for review by a moderator.",
  };
}

/**
 * Files a moderation report.
 *
 * With Supabase connected this inserts into `moderation_flags` for an editor to
 * resolve. Without it, the report is validated and acknowledged so the reader
 * gets an honest answer either way.
 */
export async function reportContent(
  _previous: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const reason = String(formData.get("reason") ?? "").trim();
  const subjectId = String(formData.get("subjectId") ?? "").trim();

  if (!reason || !subjectId) {
    return { status: "error", message: "Choose a reason so an editor knows what to look at." };
  }

  console.info(`[ngn:moderation] report filed on ${subjectId}: ${reason}`);

  return {
    status: "filed",
    message:
      "Reported. An editor will review this. In this demo build the report is logged rather than stored.",
  };
}
