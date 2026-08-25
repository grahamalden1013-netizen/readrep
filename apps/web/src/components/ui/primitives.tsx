import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Decision quality                                                            */
/* -------------------------------------------------------------------------- */

export const QUALITY_LABEL: Record<string, string> = {
  preferred: "Preferred read",
  acceptable: "Acceptable read",
  suboptimal: "Better read available",
  high_risk: "High-risk read",
  unclear: "Not enough evidence to judge",
};

const QUALITY_CLASS: Record<string, string> = {
  preferred:
    "border-quality-preferred/40 bg-quality-preferred/10 text-quality-preferred",
  acceptable:
    "border-quality-acceptable/40 bg-quality-acceptable/10 text-quality-acceptable",
  suboptimal:
    "border-quality-suboptimal/40 bg-quality-suboptimal/10 text-quality-suboptimal",
  high_risk: "border-quality-risk/40 bg-quality-risk/10 text-quality-risk",
  unclear: "border-quality-unclear/40 bg-quality-unclear/10 text-quality-unclear",
};

/**
 * The quality of a read.
 *
 * Always renders the written label beside the colour. Colour alone would fail a
 * colour-blind player, and more importantly it would let the interface imply
 * "wrong" without ever having to say it.
 */
export function QualityBadge({ quality }: { quality: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        QUALITY_CLASS[quality] ?? QUALITY_CLASS.unclear
      }`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {QUALITY_LABEL[quality] ?? quality}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Provenance                                                                  */
/* -------------------------------------------------------------------------- */

const PROVENANCE_COPY: Record<string, { label: string; detail: string }> = {
  manual_authoring: {
    label: "Written by hand",
    detail:
      "A person wrote this. No video was processed and no model produced any part of it.",
  },
  ai_proposal: {
    label: "AI proposal",
    detail: "A model proposed this. It is a proposal until a coach approves it.",
  },
  coach_approved: {
    label: "Coach approved",
    detail: "Your coach reviewed and approved this.",
  },
  player_input: { label: "Your words", detail: "You wrote this." },
  system_derived: {
    label: "Derived",
    detail: "Computed from other records by deterministic code.",
  },
};

/**
 * Where a record's content came from.
 *
 * Shown wherever content could be mistaken for something it is not. Manually
 * authored demonstration data must never read as analysis, and an AI proposal
 * must never read as the coach's word.
 */
export function ProvenanceBadge({
  provenance,
  className = "",
}: {
  provenance: string;
  className?: string;
}) {
  const copy = PROVENANCE_COPY[provenance] ?? {
    label: provenance,
    detail: "Unrecognised provenance.",
  };
  const isProposal = provenance === "ai_proposal";
  return (
    <span
      title={copy.detail}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        isProposal
          ? "border-quality-suboptimal/40 bg-quality-suboptimal/10 text-quality-suboptimal"
          : "border-ink-600 bg-ink-800 text-chalk-400"
      } ${className}`}
    >
      {copy.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Grounding                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Whether advice comes from the coach's system or is general reasoning.
 *
 * When no coach rule applies, the interface says so plainly. Presenting general
 * basketball reasoning as the team's required decision is the specific failure
 * the blueprint's grounding rule exists to prevent.
 */
export function GroundingNotice({
  grounding,
  rules,
}: {
  grounding: "coach_system" | "general_reasoning";
  rules: { id: string; statement: string; topic: string }[];
}) {
  if (grounding === "general_reasoning") {
    return (
      <div className="border-quality-suboptimal/30 bg-quality-suboptimal/5 rounded-lg border p-4">
        <p className="text-quality-suboptimal text-xs font-semibold uppercase tracking-wide">
          General basketball reasoning
        </p>
        <p className="text-chalk-200 mt-1.5 text-sm leading-relaxed">
          Your coach has not set a rule for this situation, so this is general
          basketball reasoning — not what your team requires. Ask your coach what they
          want here.
        </p>
      </div>
    );
  }
  return (
    <div className="border-ink-600 bg-ink-850 rounded-lg border p-4">
      <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
        {rules.length === 1 ? "Your coach's rule" : "Your coach's rules"}
      </p>
      <ul className="mt-2 space-y-2">
        {rules.map((rule) => (
          <li key={rule.id} className="text-chalk-50 text-sm leading-relaxed">
            <span className="text-court-400">“</span>
            {rule.statement}
            <span className="text-court-400">”</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Uncertainty                                                                 */
/* -------------------------------------------------------------------------- */

const UNCERTAINTY_LABEL: Record<string, string> = {
  off_screen: "Off screen",
  occlusion: "Blocked from view",
  camera_cut: "Camera cut",
  motion_blur: "Motion blur",
  ambiguous_identity: "Player identity unclear",
  similar_jerseys: "Similar jerseys",
  substitution_boundary: "Substitution",
  insufficient_evidence: "Not enough evidence",
  no_applicable_coach_rule: "No coach rule for this",
  timing_dependent: "Depends on timing",
  court_geometry_unknown: "Court geometry unknown",
  ball_not_visible: "Ball not visible",
};

/** What ReadRep could not see. Shown, never suppressed. */
export function UncertaintyList({
  items,
  className = "",
}: {
  items: { kind: string; detail: string }[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={`border-ink-600 bg-ink-850 rounded-lg border p-4 ${className}`}>
      <p className="text-chalk-500 text-xs font-semibold uppercase tracking-wide">
        What we could not see
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li
            key={`${item.kind}-${i}`}
            className="text-chalk-200 text-sm leading-relaxed"
          >
            <span className="text-chalk-50 font-medium">
              {UNCERTAINTY_LABEL[item.kind] ?? item.kind}:
            </span>{" "}
            {item.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Film                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The honest stand-in for a clip ReadRep does not have.
 *
 * Phase 0 has no authorized footage and no video provider. This panel says so
 * and shows the timestamps the moment is actually built from. It never renders
 * a player that cannot play, and never a placeholder image implying footage
 * exists.
 */
export function FilmUnavailable({
  detail,
  clip,
}: {
  detail: string;
  clip: { startMs: number; endMs: number; pausePointMs: number };
}) {
  const t = (ms: number) => {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };
  return (
    <div className="border-ink-600 bg-ink-850 flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-6 text-center sm:p-8">
      <div className="border-ink-600 bg-ink-800 flex size-11 items-center justify-center rounded-full border">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-chalk-500 size-5"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 9 16 0M9 5v14" />
        </svg>
      </div>
      <div className="max-w-md">
        <p className="text-chalk-50 text-sm font-semibold">Authorized clip required</p>
        <p className="text-chalk-400 mt-1.5 text-sm leading-relaxed">{detail}</p>
      </div>
      <dl className="text-chalk-500 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-xs">
        <div className="flex gap-1.5">
          <dt>clip</dt>
          <dd className="text-chalk-200">
            {t(clip.startMs)}–{t(clip.endMs)}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt>pause</dt>
          <dd className="text-court-400">{t(clip.pausePointMs)}</dd>
        </div>
      </dl>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`border-ink-700 bg-ink-850 rounded-xl border ${className}`}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-chalk-500 text-xs font-semibold uppercase tracking-[0.08em]">
      {children}
    </h2>
  );
}

/** The demonstration-data banner. Shown wherever seeded content is displayed. */
export function DemonstrationNotice() {
  return (
    <div className="border-court-500/30 bg-court-500/5 rounded-lg border px-4 py-3">
      <p className="text-chalk-200 text-sm leading-relaxed">
        <span className="text-court-400 font-semibold">Demonstration data.</span> These
        moments were written by hand to prove the learning loop. No game film was
        uploaded or processed, no player was identified automatically, and no model
        produced any of this content.
      </p>
    </div>
  );
}
