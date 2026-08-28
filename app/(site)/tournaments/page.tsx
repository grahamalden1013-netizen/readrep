import type { Metadata } from "next";
import {
  Card,
  Container,
  DemoBadge,
  Eyebrow,
  PageHeader,
  Pill,
  SectionHead,
} from "@/components/ui/primitives";
import { DivisionBadge } from "@/components/ratings/DivisionBadge";
import { TOURNAMENT } from "@/data/demo/community";
import type { TournamentMatch } from "@/types/ngn";

export const metadata: Metadata = {
  title: "Weekly Arena Championship",
  description: "A single-elimination bracket seeded by Arena Rating.",
};

const ROUNDS: TournamentMatch["round"][] = [
  "Quarterfinals",
  "Semifinals",
  "Final",
];

function MatchCard({ match }: { match: TournamentMatch }) {
  const decided = match.winner !== null;
  const tied =
    match.scoreA !== null && match.scoreB !== null && match.scoreA === match.scoreB;

  return (
    <Card className="p-3.5">
      {[
        { name: match.playerA, score: match.scoreA },
        { name: match.playerB, score: match.scoreB },
      ].map((side, index) => (
        <div
          key={index}
          className={`flex items-center justify-between gap-3 py-1.5 ${
            index === 0 ? "border-b border-rule" : ""
          }`}
        >
          <span
            className={`truncate text-sm ${
              side.name === match.winner
                ? "font-semibold"
                : decided
                  ? "text-ink-mute"
                  : ""
            }`}
          >
            {side.name ?? <span className="text-ink-faint">To be decided</span>}
          </span>
          <span className="tnum shrink-0 text-sm font-semibold">
            {side.score ?? "—"}
          </span>
        </div>
      ))}
      {tied && !decided && (
        <p className="mt-2 border-t border-rule pt-2 text-[0.6875rem] text-warn">
          Tied — going to a perspective tiebreak
        </p>
      )}
    </Card>
  );
}

export default function TournamentsPage() {
  const { eligibility, players, matches } = TOURNAMENT;

  return (
    <>
      <PageHeader
        eyebrow="Competition"
        title={TOURNAMENT.name}
        lede="Single elimination, seeded by Arena Rating. Won on argument quality — a bracket cannot be won by taking a popular position."
        aside={
          <div className="flex items-center gap-2">
            <Pill tone="live">Live</Pill>
            <DemoBadge />
          </div>
        }
      />

      <Container className="py-10 sm:py-12">
        {/* Eligibility */}
        <section>
          <SectionHead
            title="Eligibility"
            description="Thresholds exist so the bracket rewards sustained, civil practice rather than one good night."
          />
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              { term: "Minimum debates", def: eligibility.minDebates, note: "Completed, any format" },
              { term: "Minimum civility", def: eligibility.minCivility, note: "Running average" },
              { term: "Minimum rating", def: eligibility.minRating, note: "Gold division and above" },
            ].map((item) => (
              <div key={item.term} className="card p-5">
                <dt className="eyebrow text-ink-mute">{item.term}</dt>
                <dd className="tnum mt-2 text-2xl font-semibold">{item.def}</dd>
                <p className="mt-1 text-xs text-ink-faint">{item.note}</p>
              </div>
            ))}
          </dl>
        </section>

        {/* Bracket */}
        <section className="mt-14">
          <SectionHead title="Bracket" />
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="grid min-w-[720px] grid-cols-3 gap-6">
              {ROUNDS.map((round) => (
                <div key={round}>
                  <h3 className="eyebrow mb-3 text-ink-mute">{round}</h3>
                  <ul className="space-y-3">
                    {matches
                      .filter((match) => match.round === round)
                      .map((match) => (
                        <li key={match.id}>
                          <MatchCard match={match} />
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Seeds */}
        <section className="mt-14">
          <SectionHead title="Seeds" description="Ordered by Arena Rating at lock-in." />
          <ol className="divide-y divide-rule border-y border-rule">
            {players.map((player) => (
              <li key={player.username} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5">
                <span className="tnum w-6 shrink-0 text-sm text-ink-faint">
                  {player.seed}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{player.username}</p>
                  {player.school && (
                    <p className="truncate text-xs text-ink-mute">{player.school}</p>
                  )}
                </div>
                <DivisionBadge division={player.division} size="sm" />
                <span className="tnum text-sm font-semibold">{player.rating}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <Eyebrow>How a tie is broken</Eyebrow>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-mute">
            Two equal argument scores go to a perspective tiebreak: both students
            make the strongest case for the side they argued against, and the
            higher Perspective Score advances. It is the only place a perspective
            score affects a competitive outcome, and it is symmetrical — neither
            student can gain by taking a particular position.
          </p>
        </section>
      </Container>
    </>
  );
}
