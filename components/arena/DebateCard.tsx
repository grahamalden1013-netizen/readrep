import Link from "next/link";
import type { Debate } from "@/types/ngn";
import { Card, Eyebrow, LiveDot, Pill } from "@/components/ui/primitives";
import { Countdown } from "./Countdown";
import { formatFor } from "@/lib/arena/formats";

const STATUS_LABEL: Record<Debate["status"], string> = {
  live: "Live",
  ongoing: "Ongoing",
  upcoming: "Upcoming",
  past: "Closed",
};

/** Compact debate card used in grids and lists. */
export function DebateCard({ debate }: { debate: Debate }) {
  const format = formatFor(debate.format);

  return (
    <Card interactive as="article" className="group flex h-full flex-col p-5">
      <div className="flex items-center gap-2.5">
        <Eyebrow tone={debate.status === "live" ? "live" : "mute"}>
          {debate.status === "live" && <LiveDot />} {STATUS_LABEL[debate.status]}
        </Eyebrow>
        <span aria-hidden className="h-3 w-px bg-rule" />
        <Eyebrow>{debate.category}</Eyebrow>
      </div>

      <h3 className="mt-3 text-lg leading-snug">
        <Link
          href={`/arena/${debate.slug}/brief`}
          className="after:absolute after:inset-0 focus:outline-none"
        >
          {debate.title}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-mute">
        {debate.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <Pill>{debate.difficulty}</Pill>
        <Pill>{format.name}</Pill>
        <Pill>{format.estimateLabel}</Pill>
      </div>

      <dl className="mt-auto flex items-center gap-5 border-t border-rule pt-4 text-xs text-ink-mute">
        <div className="flex items-baseline gap-1.5">
          <dt className="sr-only">Participants</dt>
          <dd className="tnum font-semibold text-ink">
            {debate.participants.toLocaleString()}
          </dd>
          <span>debating</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="sr-only">Average score</dt>
          <dd className="tnum font-semibold text-ink">{debate.averageScore}</dd>
          <span>avg score</span>
        </div>
        {debate.status !== "upcoming" && (
          <div className="ml-auto flex items-baseline gap-1.5">
            <dt className="sr-only">Time remaining</dt>
            <dd>
              <Countdown hours={debate.hoursRemaining} className="font-semibold text-ink" />
            </dd>
            <span className="hidden sm:inline">left</span>
          </div>
        )}
      </dl>
    </Card>
  );
}

/** Relative-position wrapper so the whole card is a click target. */
export function DebateCardGrid({ debates }: { debates: Debate[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {debates.map((debate) => (
        <li key={debate.id} className="relative">
          <DebateCard debate={debate} />
        </li>
      ))}
    </ul>
  );
}
