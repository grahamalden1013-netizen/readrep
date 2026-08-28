import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader, SectionHead, DemoBadge } from "@/components/ui/primitives";
import { Leaderboard } from "@/components/arena/Leaderboard";
import { rankedSchools, SCHOOL_MIN_DEBATES, SCHOOL_MIN_STUDENTS } from "@/data/demo/community";

export const metadata: Metadata = {
  title: "Rankings",
  description: "Arena Ratings for students and schools, ranked on argument quality.",
};

export default function RankingsPage() {
  const schools = rankedSchools();

  return (
    <>
      <PageHeader
        eyebrow="Standings"
        title="Rankings"
        lede="Ranked on how well students argue — evidence, reasoning, rebuttal, understanding the other side. Never on which side they take."
      />

      <Container className="py-10 sm:py-12">
        <Leaderboard />
      </Container>

      <section className="border-t border-rule bg-paper-sunken/50">
        <Container className="py-12">
          <SectionHead
            title="Top schools"
            description={`Schools qualify with at least ${SCHOOL_MIN_DEBATES} debates across ${SCHOOL_MIN_STUDENTS}+ students, so no single strong debater can carry a school.`}
            action={
              <Link href="/schools" className="font-medium text-accent hover:underline">
                Competitions →
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-rule-strong">
                  <th scope="col" className="w-12 py-3 font-medium text-ink-mute">Rank</th>
                  <th scope="col" className="py-3 font-medium text-ink-mute">School</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Students</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Debates</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Avg rating</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Perspective</th>
                  <th scope="col" className="py-3 text-right font-medium text-ink-mute">Points</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school, index) => (
                  <tr key={school.id} className="border-b border-rule">
                    <td className="tnum py-3.5 text-ink-faint">{index + 1}</td>
                    <td className="py-3.5">
                      <span className="font-medium">{school.name}</span>
                      <span className="block text-xs text-ink-mute">{school.state}</span>
                    </td>
                    <td className="tnum py-3.5 text-right text-ink-mute">{school.students}</td>
                    <td className="tnum py-3.5 text-right text-ink-mute">
                      {school.debates.toLocaleString()}
                    </td>
                    <td className="tnum py-3.5 text-right">{school.averageRating}</td>
                    <td className="tnum py-3.5 text-right text-ink-mute">
                      {school.averagePerspective}
                    </td>
                    <td className="tnum py-3.5 text-right font-semibold">
                      {school.points.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
            School points come from wins, perspective scores, participation and
            civility — never from political positions.
            <DemoBadge />
          </p>
        </Container>
      </section>
    </>
  );
}
