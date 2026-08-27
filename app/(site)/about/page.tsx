import type { Metadata } from "next";
import { AUTHORS } from "@/lib/content/authors";
import { Container } from "@/components/layout/container";
import { Avatar } from "@/components/ui/avatar";

export const metadata: Metadata = {
  title: "About NGN",
  description:
    "How NGN works: editorial standards, corrections, privacy, and how we use AI.",
};

const STANDARDS = [
  {
    title: "Fact, analysis and opinion are labelled separately",
    body: "News stories state what is established and what is contested. Opinion runs in The NGN Weekly, under a named byline, marked as an editor's article.",
  },
  {
    title: "We never write “Democrats believe” or “Republicans believe”",
    body: "Parties are coalitions that disagree internally. We write “many Democratic lawmakers argue” or “a common position among Republican leaders is”, and we show where each party splits.",
  },
  {
    title: "Uncertainty is a section, not an omission",
    body: "Every story has a “What's still unclear” block. If the evidence is genuinely contested, we say that rather than picking the study that fits.",
  },
  {
    title: "Primary sources first",
    body: "Bill text, court opinions, agency rules and official data outrank descriptions of them.",
  },
  {
    title: "No outrage mechanics",
    body: "There is no angry reaction, no engagement ranking, no follower counts. Stories are ordered by significance.",
  },
];

export default function AboutPage() {
  return (
    <Container className="max-w-[820px] py-10 sm:py-14">
      <p className="eyebrow text-accent">About</p>
      <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[2.875rem]">
        Understand what&rsquo;s happening. Decide what you think.
      </h1>
      <p className="mt-5 text-[1.0625rem] leading-[1.65] text-ink-2">
        NGN is a politically neutral news product built for high-school and
        college-age readers. Most political coverage is written for people who
        already follow politics. NGN is written for everyone else — without
        talking down, and without telling you what to conclude.
      </p>

      <section id="standards" className="mt-14 scroll-mt-24 rule-top pt-4">
        <h2 className="eyebrow text-accent">Editorial standards</h2>
        <div className="mt-6 space-y-6">
          {STANDARDS.map((standard) => (
            <div key={standard.title}>
              <h3 className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.015em] text-ink">
                {standard.title}
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-[1.65] text-ink-2">
                {standard.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="ai" className="mt-14 scroll-mt-24 rule-top pt-4">
        <h2 className="eyebrow text-accent">How we use AI</h2>
        <div className="mt-5 space-y-4 text-[0.9375rem] leading-[1.7] text-ink-2">
          <p>
            AI drafts stories. It does not publish them. Every generated draft
            enters the newsroom queue with the status{" "}
            <span className="font-mono text-[0.875rem]">needs_review</span> and
            cannot move to published without a human editor reading every field —
            headline, facts, both perspective sections, uncertainties and
            sources.
          </p>
          <p>
            Reader-facing AI features — the &ldquo;I don&rsquo;t get it&rdquo;
            panel and Ask NGN — answer only from the article you are reading and
            its approved sources. They will not speculate, and they will not tell
            you which position to hold.
          </p>
          <p>
            This build ships with mock AI responses assembled from each
            article&rsquo;s own approved fields, so nothing is fabricated even
            when no model is connected.
          </p>
        </div>
      </section>

      <section id="corrections" className="mt-14 scroll-mt-24 rule-top pt-4">
        <h2 className="eyebrow text-accent">Corrections</h2>
        <p className="mt-5 text-[0.9375rem] leading-[1.7] text-ink-2">
          When we get something wrong we correct it in place and say what
          changed at the bottom of the story. We do not quietly edit. If you
          think something here is inaccurate, the report control on any comment
          reaches an editor.
        </p>
      </section>

      <section id="privacy" className="mt-14 scroll-mt-24 rule-top pt-4">
        <h2 className="eyebrow text-accent">Privacy</h2>
        <div className="mt-5 space-y-4 text-[0.9375rem] leading-[1.7] text-ink-2">
          <p>
            Many NGN readers are minors, so the product is built to hold as
            little as possible. Email addresses are never displayed. School and
            grade are optional, and school is never shown publicly. We do not
            collect precise location.
          </p>
          <p>
            Discussion posts are screened before they appear, and anything that
            looks like contact information is held automatically.
          </p>
        </div>
      </section>

      <section className="mt-14 rule-top pt-4">
        <h2 className="eyebrow text-ink-3">The newsroom</h2>
        <p className="mt-3 text-[0.8125rem] text-ink-3">
          Demo build: these are illustrative staff profiles, not real
          journalists.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {AUTHORS.map((author) => (
            <div
              key={author.id}
              className="flex items-start gap-4 rounded-[var(--radius-card)] border border-hairline bg-surface p-5"
            >
              <Avatar initials={author.initials} hue={author.hue} size="lg" />
              <div>
                <p className="text-[0.9375rem] font-semibold text-ink">
                  {author.name}
                </p>
                <p className="text-[0.75rem] text-accent">{author.role}</p>
                <p className="mt-2 text-[0.8125rem] leading-[1.6] text-ink-2">
                  {author.bio}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}
