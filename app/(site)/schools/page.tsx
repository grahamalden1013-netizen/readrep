import type { Metadata } from "next";
import {
  Card,
  Container,
  DemoBadge,
  Meter,
  PageHeader,
  Pill,
  SectionHead,
} from "@/components/ui/primitives";
import {
  COMPETITION_SCORING,
  SCHOOL_COMPETITIONS,
  SCHOOLS,
  SCHOOL_MIN_DEBATES,
  SCHOOL_MIN_STUDENTS,
  rankedSchools,
} from "@/data/demo/community";

export const metadata: Metadata = {
  title: "School Competitions",
  description: "School versus school, won on argument quality rather than ideology.",
};

const SCHOOL_BY_ID = new Map(SCHOOLS.map((s) => [s.id, s]));

export default function SchoolsPage() {
  const ranked = rankedSchools();

  return (
    <>
      <PageHeader
        eyebrow="Competition"
        title="School Competitions"
        lede="Schools compete weekly on debate quality, perspective-taking, participation and civility. Never on which positions their students take."
      />

      <Container className="py-10 sm:py-12">
        {/* Head to head */}
        <section>
          <SectionHead title="This week's matchups" />
          <ul className="grid gap-4 lg:grid-cols-2">
            {SCHOOL_COMPETITIONS.map((competition) => {
              const home = SCHOOL_BY_ID.get(competition.homeSchoolId);
              const away = SCHOOL_BY_ID.get(competition.awaySchoolId);
              if (!home || !away) return null;

              const progress =
                (competition.debatesCompleted / competition.debatesTarget) * 100;

              return (
                <li key={competition.id}>
                  <Card className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="eyebrow text-ink-mute">{competition.week}</span>
                      <Pill tone={competition.status === "live" ? "live" : "neutral"}>
                        {competition.status === "live"
                          ? "Live"
                          : competition.status === "final"
                            ? "Final"
                            : "Upcoming"}
                      </Pill>
                    </div>

                    <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      <div className="min-w-0 text-right">
                        <p className="truncate text-sm font-semibold">{home.name}</p>
                        <p className="text-xs text-ink-mute">{home.state}</p>
                      </div>
                      <div className="tnum shrink-0 text-center text-2xl font-semibold">
                        {competition.homePoints}
                        <span className="mx-1.5 text-ink-faint">–</span>
                        {competition.awayPoints}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{away.name}</p>
                        <p className="text-xs text-ink-mute">{away.state}</p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-rule pt-4">
                      <Meter
                        value={progress}
                        tone="lime"
                        label="Debates completed"
                        valueLabel={`${competition.debatesCompleted} / ${competition.debatesTarget}`}
                        compact
                      />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Scoring */}
        <section className="mt-14">
          <SectionHead
            title="How points are earned"
            description="Nothing on this list can be earned by taking a particular political position."
          />
          <dl className="divide-y divide-rule border-y border-rule">
            {COMPETITION_SCORING.map((rule) => (
              <div key={rule.label} className="grid gap-1 py-4 sm:grid-cols-[1fr_auto_1.4fr] sm:items-baseline sm:gap-6">
                <dt className="text-sm font-medium">{rule.label}</dt>
                <dd className="tnum text-sm font-semibold text-accent">{rule.points}</dd>
                <dd className="text-sm text-ink-mute">{rule.note}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Standings */}
        <section className="mt-14">
          <SectionHead
            title="Season standings"
            description={`Qualification requires ${SCHOOL_MIN_DEBATES}+ debates across ${SCHOOL_MIN_STUDENTS}+ students, so one strong debater cannot carry a school.`}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-rule-strong">
                  <th scope="col" className="w-12 py-3 font-medium text-ink-mute">#</th>
                  <th scope="col" className="py-3 font-medium text-ink-mute">School</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Debates</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Perspective</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Civility</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Points</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((school, index) => (
                  <tr key={school.id} className="border-b border-rule">
                    <td className="tnum py-3.5 text-ink-faint">{index + 1}</td>
                    <td className="py-3.5">
                      <span className="font-medium">{school.name}</span>
                      <span className="block text-xs text-ink-mute">
                        {school.state} · {school.students} students
                      </span>
                    </td>
                    <td className="tnum py-3.5 text-right text-ink-mute">
                      {school.debates.toLocaleString()}
                    </td>
                    <td className="tnum py-3.5 text-right">{school.averagePerspective}</td>
                    <td className="tnum py-3.5 text-right">{school.averageCivility}</td>
                    <td className="tnum py-3.5 text-right font-semibold">
                      {school.points.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
            Seeded standings.
            <DemoBadge />
          </p>
        </section>
      </Container>
    </>
  );
}
