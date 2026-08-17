import { AssignmentCard } from "@/components/assignment/assignment-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatMinutes } from "@/lib/format";
import type { AssignmentView } from "@/lib/queries/dashboard";

const GROUPS: { key: keyof Groups; label: string; emptyHint: string }[] = [
  { key: "today", label: "Today", emptyHint: "Nothing due today." },
  { key: "tomorrow", label: "Tomorrow", emptyHint: "Nothing due tomorrow." },
  { key: "thisWeek", label: "This week", emptyHint: "Nothing else this week." },
  { key: "later", label: "Later", emptyHint: "Nothing further out." },
];

type Groups = {
  today: AssignmentView[];
  tomorrow: AssignmentView[];
  thisWeek: AssignmentView[];
  later: AssignmentView[];
};

export function TodoSection({
  groups,
  timezone,
  now,
}: {
  groups: Groups;
  timezone: string;
  now: Date;
}) {
  const total = Object.values(groups).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  if (total === 0) {
    return (
      <Card>
        <CardHeader title="To do" />
        <CardBody>
          <p className="text-sm text-muted">
            Nothing outstanding. Sync Schoology if you&apos;re expecting new
            work.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight">To do</h2>

      {GROUPS.map(({ key, label, emptyHint }) => {
        const items = groups[key];
        if (items.length === 0) {
          // Today and Tomorrow always show, so an empty evening is explicit.
          if (key !== "today" && key !== "tomorrow") return null;
          return (
            <div key={key}>
              <GroupHeading label={label} items={items} />
              <p className="mt-2 text-sm text-muted">{emptyHint}</p>
            </div>
          );
        }

        return (
          <div key={key}>
            <GroupHeading label={label} items={items} />
            <div className="mt-2 space-y-2">
              {items.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  timezone={timezone}
                  now={now}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function GroupHeading({
  label,
  items,
}: {
  label: string;
  items: AssignmentView[];
}) {
  const minutes = items.reduce((sum, item) => sum + item.estimatedMinutes, 0);

  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-1.5">
      <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
        {label}
      </h3>
      {items.length > 0 ? (
        <span className="text-xs text-muted tabular-nums">
          {items.length} · {formatMinutes(minutes)}
        </span>
      ) : null}
    </div>
  );
}
