"use client";

import { useState } from "react";
import type { LeaderboardEntry } from "@/types/ngn";
import { useArena } from "@/components/providers/ArenaProvider";
import { DivisionBadge } from "@/components/ratings/DivisionBadge";
import { DemoBadge, EmptyState, ButtonLink } from "@/components/ui/primitives";
import { divisionName } from "@/lib/arena/divisions";
import { averagePerspective } from "@/lib/arena/profile";
import {
  nationalLeaderboard,
  schoolLeaderboard,
  stateLeaderboard,
  SCHOOLS,
} from "@/data/demo/community";

const TABS = [
  { id: "national", label: "National" },
  { id: "state", label: "State" },
  { id: "school", label: "School" },
  { id: "friends", label: "Friends" },
] as const;

type Tab = (typeof TABS)[number]["id"];

function boardFor(
  tab: Tab,
  state: string | null,
  school: string | null,
): LeaderboardEntry[] {
  if (tab === "state") return state ? stateLeaderboard(state) : [];
  if (tab === "school") {
    const slug = SCHOOLS.find((s) => s.name === school)?.slug;
    return slug ? schoolLeaderboard(slug) : [];
  }
  if (tab === "friends") return [];
  return nationalLeaderboard();
}

/**
 * Rankings.
 *
 * Ranked strictly by Arena Rating — argument quality — never by activity,
 * reactions or followers. Location comes from what a student optionally typed
 * during onboarding; NGN never requests precise geolocation.
 */
export function Leaderboard() {
  const { ready, profile } = useArena();
  const [tab, setTab] = useState<Tab>("national");

  const rows = boardFor(tab, profile?.state ?? null, profile?.school ?? null);

  // Splice the student into the board so they can see where they stand.
  const withYou =
    ready && profile && profile.debatesCompleted > 0
      ? [
          ...rows,
          {
            rank: 0,
            username: profile.username,
            rating: profile.rating,
            division: divisionName(profile.rating),
            debates: profile.debatesCompleted,
            perspectiveScore: averagePerspective(profile) ?? 0,
            school: profile.school ?? undefined,
            state: profile.state ?? undefined,
            isYou: true,
          } satisfies LeaderboardEntry,
        ]
          .sort((a, b) => b.rating - a.rating)
          .map((entry, index) => ({ ...entry, rank: index + 1 }))
      : rows;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Leaderboard scope"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-rule px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((option) => (
          <button
            key={option.id}
            role="tab"
            aria-selected={tab === option.id}
            onClick={() => setTab(option.id)}
            className={`relative shrink-0 px-3 py-3 text-sm font-medium transition-colors ${
              tab === option.id ? "text-ink" : "text-ink-mute hover:text-ink"
            }`}
          >
            {option.label}
            {tab === option.id && (
              <span aria-hidden className="absolute inset-x-3 -bottom-px h-[2px] bg-lime-deep" />
            )}
          </button>
        ))}
      </div>

      {withYou.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={
              tab === "friends"
                ? "No friends added yet."
                : tab === "state"
                  ? "No state on your profile."
                  : "No school on your profile."
            }
            body={
              tab === "friends"
                ? "Friends boards let you compare argument quality with people you already debate. NGN never suggests people to follow, and there are no follower counts."
                : "State and school are optional. Add one in onboarding and this board fills in. NGN never asks for your precise location."
            }
            action={<ButtonLink href="/onboarding" tone="secondary">Update your profile</ButtonLink>}
          />
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-rule-strong">
                  <th scope="col" className="w-12 py-3 font-medium text-ink-mute">Rank</th>
                  <th scope="col" className="py-3 font-medium text-ink-mute">Student</th>
                  <th scope="col" className="py-3 font-medium text-ink-mute">Division</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Rating</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Debates</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Perspective</th>
                </tr>
              </thead>
              <tbody>
                {withYou.map((entry) => (
                  <tr
                    key={`${entry.username}-${entry.rank}`}
                    className={`border-b border-rule ${entry.isYou ? "bg-accent-soft" : ""}`}
                  >
                    <td className="tnum py-3.5 text-ink-faint">{entry.rank}</td>
                    <td className="py-3.5">
                      <span className={entry.isYou ? "font-semibold" : "font-medium"}>
                        {entry.username}
                      </span>
                      {entry.isYou && (
                        <span className="ml-2 text-[0.6875rem] uppercase tracking-wide text-accent">
                          You
                        </span>
                      )}
                      {entry.school && (
                        <span className="block text-xs text-ink-mute">{entry.school}</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <DivisionBadge division={entry.division} size="sm" />
                    </td>
                    <td className="tnum py-3.5 text-right font-semibold">{entry.rating}</td>
                    <td className="tnum py-3.5 text-right text-ink-mute">{entry.debates}</td>
                    <td className="tnum py-3.5 text-right text-ink-mute">
                      {entry.perspectiveScore || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
            Ranked by Arena Rating only — never by activity, reactions or
            followers.
            <DemoBadge />
          </p>
        </>
      )}
    </div>
  );
}
