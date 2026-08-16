import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type GameStatus = "uploading" | "processing" | "ready" | "published";
export type AssignmentStatus = "not_started" | "in_progress" | "completed";

const gameConfig: Record<GameStatus, { label: string; tone: "neutral" | "primary" | "success"; spin?: boolean }> = {
  uploading: { label: "Uploading", tone: "neutral", spin: true },
  processing: { label: "Processing", tone: "neutral", spin: true },
  ready: { label: "Ready for review", tone: "primary" },
  published: { label: "Published", tone: "success" },
};

const assignmentConfig: Record<AssignmentStatus, { label: string; tone: "neutral" | "primary" | "success" }> = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "primary" },
  completed: { label: "Completed", tone: "success" },
};

export function GameStatusBadge({ status }: { status: GameStatus }) {
  const { label, tone, spin } = gameConfig[status];
  return (
    <Badge tone={tone}>
      {spin && <Loader2 className="size-3 animate-spin" aria-hidden="true" />}
      {label}
    </Badge>
  );
}

export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const { label, tone } = assignmentConfig[status];
  return <Badge tone={tone}>{label}</Badge>;
}
