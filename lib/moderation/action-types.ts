/**
 * Action state shapes for moderation flows. Kept out of `actions.ts` because a
 * "use server" module may only export async functions.
 */

export interface SubmissionState {
  status: "idle" | "approved" | "held" | "flagged" | "error";
  message: string;
  body?: string;
  author?: { displayName: string; initials: string; hue: number };
}

export const EMPTY_SUBMISSION: SubmissionState = { status: "idle", message: "" };

export interface ReportState {
  status: "idle" | "filed" | "error";
  message: string;
}

export const EMPTY_REPORT: ReportState = { status: "idle", message: "" };
