import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader, Card, Eyebrow, EmptyState, ButtonLink } from "@/components/ui/primitives";
import { DEMO_NOTIFICATIONS } from "@/data/demo/classroom";
import type { NotificationKind } from "@/types/ngn";

export const metadata: Metadata = { title: "Notifications" };

const KIND_LABEL: Record<NotificationKind, string> = {
  "round-ready": "Round ready",
  "opponent-replied": "Opponent replied",
  "debate-scored": "Debate scored",
  "rating-changed": "Rating changed",
  "badge-earned": "Badge earned",
  tournament: "Tournament",
  classroom: "Classroom",
};

export default function NotificationsPage() {
  const notifications = DEMO_NOTIFICATIONS;

  return (
    <>
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        lede="Only the things that need you: a round waiting, a score ready, a class assignment. Nothing designed to pull you back for its own sake."
      />

      <Container width="reading" className="py-10 sm:py-12">
        {notifications.length === 0 ? (
          <EmptyState
            title="Nothing waiting."
            body="You will hear from NGN when an opponent replies, a debate is scored, or a teacher sets an assignment."
            action={<ButtonLink href="/arena">Enter the Arena</ButtonLink>}
          />
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification) => (
              <li key={notification.id} className="relative">
                <Card
                  interactive
                  className={`p-4 sm:p-5 ${notification.read ? "" : "border-rule-strong"}`}
                >
                  <div className="flex items-start gap-3">
                    {!notification.read && (
                      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-live" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <Eyebrow tone={notification.read ? "mute" : "accent"}>
                          {KIND_LABEL[notification.kind]}
                        </Eyebrow>
                        <span className="text-xs text-ink-faint">{notification.at}</span>
                      </div>
                      <h2 className="mt-1.5 text-base font-medium">
                        <Link href={notification.href} className="after:absolute after:inset-0">
                          {notification.title}
                        </Link>
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-ink-mute">
                        {notification.body}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 rounded-sm border border-rule bg-paper-sunken/60 px-5 py-4 text-xs leading-relaxed text-ink-mute">
          NGN does not send streak-shaming reminders, engagement nudges, or
          notifications about what other people are doing. If a message is not
          about something waiting on you, it does not get sent.
        </p>
      </Container>
    </>
  );
}
