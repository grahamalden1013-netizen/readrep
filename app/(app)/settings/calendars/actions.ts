"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { listCalendars } from "@/lib/google/calendars";
import { requireUser } from "@/lib/session";

const selectionSchema = z.object({
  /** Google calendar ID holding Schoology assignments, or null for none. */
  schoolCalendarId: z.string().min(1).nullable(),
  /** Google calendar IDs whose events mark the user as busy. */
  busyCalendarIds: z.array(z.string().min(1)),
});

export type SaveCalendarsResult =
  | { ok: true; schoolSelected: boolean; busyCount: number }
  | { ok: false; error: string };

/**
 * Persists the user's calendar choices.
 *
 * Only calendar IDs Google actually reports for this user are accepted, so a
 * forged POST cannot register an arbitrary calendar. Sources that are no longer
 * selected are removed; their assignments cascade, which is correct because a
 * de-selected calendar is an explicit user action.
 */
export async function saveCalendarSelection(
  input: z.input<typeof selectionSchema>,
): Promise<SaveCalendarsResult> {
  const user = await requireUser();

  const parsed = selectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid calendar selection." };
  }
  const { schoolCalendarId, busyCalendarIds } = parsed.data;

  let available;
  try {
    available = await listCalendars(user.id);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not read your Google calendars.",
    };
  }

  const availableById = new Map(available.map((c) => [c.id, c]));

  if (schoolCalendarId && !availableById.has(schoolCalendarId)) {
    return { ok: false, error: "That school calendar is no longer available." };
  }
  const busyIds = busyCalendarIds.filter(
    (id) => availableById.has(id) && id !== schoolCalendarId,
  );

  const desired = [
    ...(schoolCalendarId
      ? [{ googleCalendarId: schoolCalendarId, type: "SCHOOL" as const }]
      : []),
    ...busyIds.map((id) => ({ googleCalendarId: id, type: "BUSY" as const })),
  ];
  const desiredIds = desired.map((d) => d.googleCalendarId);

  await prisma.$transaction(async (tx) => {
    await tx.calendarSource.deleteMany({
      where: { userId: user.id, googleCalendarId: { notIn: desiredIds } },
    });

    for (const entry of desired) {
      const name = availableById.get(entry.googleCalendarId)!.name;
      const existing = await tx.calendarSource.findUnique({
        where: {
          userId_googleCalendarId: {
            userId: user.id,
            googleCalendarId: entry.googleCalendarId,
          },
        },
        select: { id: true, type: true },
      });

      await tx.calendarSource.upsert({
        where: {
          userId_googleCalendarId: {
            userId: user.id,
            googleCalendarId: entry.googleCalendarId,
          },
        },
        create: {
          userId: user.id,
          googleCalendarId: entry.googleCalendarId,
          name,
          type: entry.type,
        },
        update: {
          name,
          type: entry.type,
          // Changing a calendar's role invalidates its incremental sync state.
          ...(existing && existing.type !== entry.type
            ? { syncToken: null, lastSyncedAt: null }
            : {}),
        },
      });
    }
  });

  revalidatePath("/settings/calendars");
  revalidatePath("/dashboard");

  return { ok: true, schoolSelected: schoolCalendarId !== null, busyCount: busyIds.length };
}
