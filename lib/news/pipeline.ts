import type { Article, Source } from "@/types/ngn";
import { generateArticleDraft, type GeneratedDraft } from "@/lib/ai";

/**
 * Daily automation architecture.
 *
 * The intended shape of the morning job:
 *   1. fetchDailyStories()   — gather candidate stories from news APIs
 *   2. collectSources()      — find multiple reputable sources per candidate
 *   3. rankBySignificance()  — pick roughly five stories that matter
 *   4. generateArticleDraft()— Claude produces a draft per story
 *   5. factCheckDraft()      — verify every claim against collected sources
 *   6. saveDraft()           — draft lands in /admin as needs_review
 *   7. a human editor reviews, edits and publishes
 *
 * Step 7 is not optional. Nothing in this module publishes anything: the only
 * status a generated draft can reach here is `needs_review`.
 */

export interface StoryCandidate {
  externalId: string;
  headline: string;
  topic: string;
  firstSeenAt: string;
  /** Number of independent outlets carrying the story. */
  outletCount: number;
  significance: number;
}

export interface FactCheckIssue {
  field: string;
  claim: string;
  problem: "unsupported" | "contradicted" | "needs-attribution" | "vague";
  note: string;
}

export interface FactCheckResult {
  passed: boolean;
  issues: FactCheckIssue[];
  checkedAt: string;
}

export interface SavedDraft {
  id: string;
  status: Extract<Article["status"], "needs_review">;
  draft: GeneratedDraft;
  candidate: StoryCandidate;
  factCheck: FactCheckResult;
  savedAt: string;
}

const NOT_CONFIGURED =
  "News ingestion is not connected in this environment. Configure NEWS_API_KEY and a source allowlist to enable it.";

export function newsIngestionEnabled() {
  return Boolean(process.env.NEWS_API_KEY);
}

/**
 * Step 1 — gather the day's candidate stories.
 * Returns an empty list rather than throwing when no provider is configured,
 * so a scheduled job degrades to "nothing to review today".
 */
export async function fetchDailyStories(): Promise<StoryCandidate[]> {
  if (!newsIngestionEnabled()) {
    console.info(`[ngn:pipeline] fetchDailyStories skipped — ${NOT_CONFIGURED}`);
    return [];
  }
  // Connect a news provider here. Deliberately unimplemented: shipping a
  // half-working ingest is worse than shipping none.
  throw new Error("fetchDailyStories: no provider adapter registered");
}

/** Step 2 — find multiple reputable sources for a candidate. */
export async function collectSources(
  candidate: StoryCandidate,
): Promise<Source[]> {
  if (!newsIngestionEnabled()) {
    console.info(
      `[ngn:pipeline] collectSources skipped for ${candidate.externalId} — ${NOT_CONFIGURED}`,
    );
    return [];
  }
  throw new Error("collectSources: no provider adapter registered");
}

/** Step 3 — editorial ranking. Significance and corroboration, never clicks. */
export function rankBySignificance(
  candidates: StoryCandidate[],
  limit = 5,
): StoryCandidate[] {
  return [...candidates]
    .sort(
      (a, b) =>
        b.significance - a.significance || b.outletCount - a.outletCount,
    )
    .slice(0, limit);
}

/** Step 4 — draft generation, delegated to the AI service abstraction. */
export async function draftFromCandidate(
  candidate: StoryCandidate,
  sources: Source[],
): Promise<GeneratedDraft> {
  return generateArticleDraft({
    headline: candidate.headline,
    topic: candidate.topic,
    sourceUrls: sources.map((source) => source.url),
    sourceText: sources
      .map((source) => `${source.publisher} — ${source.title} (${source.date})`)
      .join("\n"),
    notes: `Automated candidate ${candidate.externalId}, carried by ${candidate.outletCount} outlets.`,
  });
}

/**
 * Step 5 — verify every factual claim against the collected sources.
 * Until a checker is connected this returns `passed: false`, which keeps
 * drafts in the review queue. Failing closed is the correct default.
 */
export async function factCheckDraft(
  draft: GeneratedDraft,
  sources: Source[],
): Promise<FactCheckResult> {
  const issues: FactCheckIssue[] = [];

  if (sources.length < 2) {
    issues.push({
      field: "sources",
      claim: draft.headline,
      problem: "needs-attribution",
      note: "Fewer than two independent sources collected.",
    });
  }

  for (const fact of draft.knownFacts ?? []) {
    issues.push({
      field: "knownFacts",
      claim: fact,
      problem: "unsupported",
      note: "No automated verifier connected — a human editor must confirm this claim.",
    });
  }

  return { passed: false, issues, checkedAt: new Date().toISOString() };
}

/**
 * Step 6 — persist for human review.
 * Note the hard-coded status: this function cannot publish.
 */
export async function saveDraft(
  candidate: StoryCandidate,
  draft: GeneratedDraft,
  factCheck: FactCheckResult,
): Promise<SavedDraft> {
  const saved: SavedDraft = {
    id: `draft-${candidate.externalId}`,
    status: "needs_review",
    draft,
    candidate,
    factCheck,
    savedAt: new Date().toISOString(),
  };
  // Replace with an insert into `articles` once Supabase is connected.
  console.info(`[ngn:pipeline] saved draft ${saved.id} as needs_review`);
  return saved;
}

/** The whole morning job, wired together. */
export async function runDailyBriefingJob(): Promise<SavedDraft[]> {
  const candidates = rankBySignificance(await fetchDailyStories());
  const saved: SavedDraft[] = [];

  for (const candidate of candidates) {
    const sources = await collectSources(candidate);
    const draft = await draftFromCandidate(candidate, sources);
    const factCheck = await factCheckDraft(draft, sources);
    saved.push(await saveDraft(candidate, draft, factCheck));
  }

  return saved;
}
