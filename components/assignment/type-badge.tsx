import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { AssignmentStatus, AssignmentType } from "@/lib/generated/prisma/enums";
import { TYPE_LABEL } from "@/lib/schoology/classify";
import { BAND_LABEL, priorityBand } from "@/lib/priority";

const TYPE_TONE: Record<AssignmentType, BadgeTone> = {
  MAJOR_ASSESSMENT: "danger",
  QUIZ: "warning",
  PROJECT: "info",
  HOMEWORK: "accent",
  CLASSWORK: "neutral",
  SCHOOL_EVENT: "neutral",
};

export function TypeBadge({ type }: { type: AssignmentType }) {
  return <Badge tone={TYPE_TONE[type]}>{TYPE_LABEL[type]}</Badge>;
}

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  SKIPPED: "Skipped",
};

const STATUS_TONE: Record<AssignmentStatus, BadgeTone> = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "info",
  DONE: "success",
  SKIPPED: "neutral",
};

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function PriorityBadge({ score }: { score: number }) {
  const band = priorityBand(score);
  const tone: BadgeTone =
    band === "critical"
      ? "danger"
      : band === "high"
        ? "warning"
        : band === "medium"
          ? "neutral"
          : "neutral";
  return <Badge tone={tone}>{BAND_LABEL[band]}</Badge>;
}
