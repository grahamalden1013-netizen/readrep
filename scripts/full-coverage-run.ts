/**
 * Full-coverage acceptance run for one game + one player.
 *
 *   npx tsx --conditions=react-server scripts/full-coverage-run.ts [--max N] [--reset]
 *
 * Processes EVERY possession window to a terminal state, checkpointing a
 * resumable cursor to scratchpad/coverage-cursor.json after each window. Re-run
 * it to resume; it never re-analyses a window that already has a ledger entry.
 * `--max N` stops after N windows this invocation (for the resume demonstration).
 *
 * References are built from the scout's verified frames (full frames + ±2/±4s
 * neighbours) — the closest headless stand-in for a coach's clicked crop.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
process.env.OPENAI_MAX_REASONING_CALLS = process.env.OPENAI_MAX_REASONING_CALLS || "500";

const GAME = {
  id: "4c059938-44f6-4377-87b4-76f619d1788f",
  title: "Dragons",
  playbackId: "yqvyYqVLV1k1H2kvoqEtuFvZoVfvvIg8kf4nIfb2sQo",
  durationSeconds: 2400,
  teamColor: "White",
  jerseyNumber: "15",
};

const SCRATCH = resolve(process.cwd(), "scratchpad");
const CURSOR = resolve(SCRATCH, "coverage-cursor.json");

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const thumb = (t: number) =>
  `https://image.mux.com/${GAME.playbackId}/thumbnail.webp?time=${t}&width=960&fit_mode=preserve`;

type Persist = {
  builtAt: string;
  windows: { startSeconds: number; endSeconds: number }[];
  references: { timestampSeconds: number }[];
  anyNumberVisible: boolean;
  possessionIndex: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ledger: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drafts: any[];
  reasoningCalls: number;
  retries: number;
  usageIn: number;
  usageOut: number;
  cost: number;
  wallMsAccrued: number;
};

function load(): Persist | null {
  if (!existsSync(CURSOR)) return null;
  return JSON.parse(readFileSync(CURSOR, "utf8")) as Persist;
}
function save(p: Persist) {
  mkdirSync(SCRATCH, { recursive: true });
  writeFileSync(CURSOR, JSON.stringify(p, null, 2));
}

async function build(): Promise<Persist> {
  const { scoutTeamColorCandidates } = await import("@/lib/ai/game-analysis/scout");
  const { findLiveSpans, buildPossessionWindows } = await import("@/lib/ai/game-analysis/discovery");

  console.log("Building coverage plan…");
  const scout = await scoutTeamColorCandidates(GAME.playbackId, GAME.durationSeconds, GAME.teamColor, GAME.jerseyNumber);
  const refs = [...scout.candidates]
    .sort((a, b) => rank(b.strength) - rank(a.strength))
    .slice(0, 3)
    .map((c) => ({ timestampSeconds: c.timestampSeconds }));
  console.log(`  references: ${refs.map((r) => clock(r.timestampSeconds)).join(", ")}`);

  const live = await findLiveSpans(GAME.playbackId, GAME.durationSeconds);
  const windows = buildPossessionWindows(live.spans);
  console.log(`  ${live.spans.length} live spans -> ${windows.length} possession windows`);

  return {
    builtAt: new Date().toISOString(),
    windows,
    references: refs,
    anyNumberVisible: scout.candidates.some((c) => c.strength === "reads-target"),
    possessionIndex: 0,
    ledger: [],
    drafts: [],
    reasoningCalls: 0,
    retries: 0,
    usageIn: scout.usage.input + live.usage.input,
    usageOut: scout.usage.output + live.usage.output,
    cost: 0,
    wallMsAccrued: 0,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const maxArg = args.indexOf("--max");
  const max = maxArg >= 0 ? Number(args[maxArg + 1]) : Infinity;

  let state = reset ? null : load();
  if (!state) state = await build();

  const { fetchMuxFrame } = await import("@/lib/video/mux-frame-source");
  const { POSSESSION_FRAME_WIDTH } = await import("@/lib/ai/game-analysis/limits");
  const { analyzeWindowToTerminal, summariseLedger } = await import("@/lib/ai/game-analysis/coverage");
  const { dedupeAndRank } = await import("@/lib/ai/game-analysis/rank");

  // Reference frames: each scout ts plus ±2 / ±4s neighbours.
  const referenceFrames: { timestampSeconds: number; dataUrl: string }[] = [];
  for (const r of state.references) {
    for (const dt of [0, -2, 2, -4, 4]) {
      const t = Math.max(0, r.timestampSeconds + dt);
      const f = await fetchMuxFrame(GAME.playbackId, t, POSSESSION_FRAME_WIDTH, 8000);
      if (f) referenceFrames.push({ timestampSeconds: t, dataUrl: f.dataUrl });
      if (referenceFrames.length >= 10) break;
    }
    if (referenceFrames.length >= 10) break;
  }
  const refHint = { cues: [`${GAME.teamColor} uniform, number ${GAME.jerseyNumber}`], anyNumberVisible: state.anyNumberVisible };
  const target = { jerseyNumber: GAME.jerseyNumber, teamColor: GAME.teamColor.toLowerCase(), marker: "White uniform, number 15" };

  const covered = new Set<number>(state.ledger.map((e) => e.index));
  let processedThisRun = 0;
  let skippedAlreadyDone = 0;
  const runStart = Date.now();

  while (state.possessionIndex < state.windows.length && processedThisRun < max) {
    const idx = state.possessionIndex;
    if (covered.has(idx)) {
      skippedAlreadyDone += 1;
      state.possessionIndex += 1;
      continue;
    }
    const w = state.windows[idx];
    const wr = await analyzeWindowToTerminal(idx, w, GAME.playbackId, target, referenceFrames, null, refHint);

    state.ledger.push(wr.ledger);
    covered.add(idx);
    state.reasoningCalls += 1;
    state.retries += wr.retries;
    state.usageIn += wr.usage.input;
    state.usageOut += wr.usage.output;
    if (wr.analyzed && (wr.analyzed.kind === "candidate" || wr.analyzed.kind === "flagged")) {
      state.drafts.push({ ...wr.analyzed.draft, __window: idx, __flagged: wr.analyzed.kind === "flagged" });
    }
    // rough running cost using terra pricing
    state.cost += (wr.usage.input / 1e6) * 1.25 + (wr.usage.output / 1e6) * 10;

    state.possessionIndex += 1;
    processedThisRun += 1;
    state.wallMsAccrued += 0; // wall time accrued below on save
    save(state);
    process.stdout.write(
      `  [${state.ledger.length}/${state.windows.length}] win ${idx} ${clock(w.startSeconds)}-${clock(w.endSeconds)} -> ${wr.ledger.outcome} (${wr.ledger.reason})\n`,
    );
  }

  state.wallMsAccrued += Date.now() - runStart;
  save(state);

  const done = state.ledger.length >= state.windows.length;
  const sum = summariseLedger(state.ledger);
  console.log(`\n--- invocation done: +${processedThisRun} windows, ${skippedAlreadyDone} already-done skipped ---`);
  console.log(`coverage: ${state.ledger.length} / ${state.windows.length}${done ? "  ✓ COMPLETE" : "  (resume to continue)"}`);

  if (!done) {
    console.log(`buckets so far: ${JSON.stringify(sum)}`);
    return;
  }

  // ---- full coverage reached: final acceptance report ----
  const reasonHist: Record<string, Record<string, number>> = {};
  for (const e of state.ledger) {
    (reasonHist[e.outcome] ||= {})[e.reason] = ((reasonHist[e.outcome] || {})[e.reason] ?? 0) + 1;
  }
  const dupIndices = state.ledger.map((e) => e.index);
  const hasDup = new Set(dupIndices).size !== dupIndices.length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ranked = dedupeAndRank(state.drafts) as any[];
  const claimedSightings = sum["valid-decision"] + sum["target-no-decision"];

  console.log("\n==================== ACCEPTANCE REPORT ====================");
  console.log(`game ${GAME.id}  ·  target ${GAME.teamColor} #${GAME.jerseyNumber}  ·  ${clock(GAME.durationSeconds)} film`);
  console.log(`references: ${state.references.map((r) => `${clock(r.timestampSeconds)} (${thumb(r.timestampSeconds)})`).join("  ")}`);
  console.log("");
  console.log(`1. WINDOW COVERAGE: ${state.ledger.length} / ${state.windows.length}   (every window terminal: ${state.ledger.length === state.windows.length})`);
  console.log(`   no window analysed twice: ${!hasDup}`);
  console.log("");
  console.log("   outcome                     count");
  for (const k of ["valid-decision", "target-not-visible", "target-no-decision", "invalid-output", "processing-failure"] as const) {
    console.log(`   ${k.padEnd(26)} ${String(sum[k]).padStart(4)}`);
    for (const [reason, n] of Object.entries(reasonHist[k] ?? {}).sort((a, b) => b[1] - a[1])) {
      console.log(`       - ${reason}: ${n}`);
    }
  }
  console.log("");
  console.log(`   claimed target sightings (valid-decision + target-no-decision): ${claimedSightings}`);
  console.log(`   identification precision  = confirmed / ${claimedSightings}  — confirmed requires coach review of the frames`);
  console.log("");
  console.log(`2/3/4. REVIEW QUEUE (after full coverage) — ${ranked.length} reps, each to be checked against the film:`);
  ranked.forEach((r, i) => {
    const w = state.windows[r.__window as number];
    console.log(
      `   #${i + 1}  window ${r.__window} ${clock(w.startSeconds)}-${clock(w.endSeconds)}\n` +
        `       decision pause @ ${clock(r.decisionSeconds)}  (clip ${clock(r.clipStartSeconds)}..${clock(r.clipEndSeconds)})\n` +
        `       "${r.title}" — ${r.skillCategory ?? "uncategorised"}${r.__flagged ? "  [flagged low-confidence]" : ""}\n` +
        `       id-conf ${Number(r.playerIdConfidence).toFixed(2)}  dec-conf ${Number(r.decisionConfidence).toFixed(2)}  pause-before-action offset ${((r.decisionSeconds - w.startSeconds)).toFixed(1)}s into window\n` +
        `       still @ pause: ${thumb(Math.round(r.decisionSeconds))}\n` +
        `       dedupe key: ${r.dedupeKey}`,
    );
  });
  console.log(`   candidate precision = coach-approved / ${state.drafts.length} generated  — approval happens in the review UI`);
  console.log("");
  console.log("5. RESUME: this run was checkpointed to scratchpad/coverage-cursor.json after every window;");
  console.log("   re-invoking resumes from possessionIndex and skips covered windows (see 'already-done skipped').");
  console.log("6. SESSION: buildSessionFromApproved only publishes candidates a coach set to approved/edited (code-enforced).");
  console.log("");
  console.log("--- run totals ---");
  console.log(`wall time (analysis loop):   ${(state.wallMsAccrued / 60000).toFixed(1)} min`);
  console.log(`reasoning calls:             ${state.reasoningCalls}`);
  console.log(`retries:                     ${state.retries}`);
  console.log(`tokens:                      in ${state.usageIn}  out ${state.usageOut}`);
  console.log(`estimated cost:              $${state.cost.toFixed(2)} (reasoning) + scout/discovery`);
  console.log("==========================================================\n");
}

function rank(s: string): number {
  return s === "reads-target" ? 3 : s === "number-legible" ? 2 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
