import type { ArticleStatus } from "@/types/ngn";
import type { EditableStory } from "@/lib/admin/editable";

/**
 * Action state shapes and their initial values.
 *
 * These live outside `actions.ts` because a "use server" module may only
 * export async functions.
 */

export interface GenerateState {
  status: "idle" | "generated" | "error";
  message: string;
  live: boolean;
  draft?: EditableStory;
  editorNotes?: string[];
}

export const EMPTY_GENERATE: GenerateState = {
  status: "idle",
  message: "",
  live: false,
};

export interface ReviewIssue {
  field: string;
  message: string;
  blocking: boolean;
}

export interface ReviewState {
  status: "idle" | "ok" | "blocked" | "error";
  message: string;
  intent?: ArticleStatus;
  issues: ReviewIssue[];
  persisted: boolean;
}

export const EMPTY_REVIEW: ReviewState = {
  status: "idle",
  message: "",
  issues: [],
  persisted: false,
};
