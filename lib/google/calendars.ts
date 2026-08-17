import "server-only";

import { getCalendarClient, translateGoogleError } from "@/lib/google/client";

export type DiscoveredCalendar = {
  id: string;
  name: string;
  description: string | null;
  primary: boolean;
  accessRole: string;
  timeZone: string | null;
  backgroundColor: string | null;
  /** True when the name looks like the subscribed Schoology feed. */
  looksLikeSchoology: boolean;
};

const SCHOOLOGY_HINT = /schoology/i;

/**
 * Lists every calendar the user can read. Calendar IDs are never assumed —
 * they are always discovered here and then chosen explicitly by the user.
 */
export async function listCalendars(
  userId: string,
): Promise<DiscoveredCalendar[]> {
  const calendar = await getCalendarClient(userId);

  const calendars: DiscoveredCalendar[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const response = await calendar.calendarList.list({
        maxResults: 250,
        showHidden: true,
        pageToken,
      });

      for (const item of response.data.items ?? []) {
        if (!item.id) continue;
        const name = item.summaryOverride || item.summary || item.id;
        calendars.push({
          id: item.id,
          name,
          description: item.description ?? null,
          primary: item.primary === true,
          accessRole: item.accessRole ?? "reader",
          timeZone: item.timeZone ?? null,
          backgroundColor: item.backgroundColor ?? null,
          looksLikeSchoology: SCHOOLOGY_HINT.test(name),
        });
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (error) {
    throw translateGoogleError(error);
  }

  // Primary first, then the Schoology feed, then everything else by name.
  return calendars.sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    if (a.looksLikeSchoology !== b.looksLikeSchoology) {
      return a.looksLikeSchoology ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
