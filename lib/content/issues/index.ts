import type { Issue } from "@/types/ngn";
import { issuesSetA } from "./set-a";
import { issuesSetB } from "./set-b";

/** The Issues Library, in display order. */
export const ALL_ISSUES: Issue[] = [...issuesSetA, ...issuesSetB];
