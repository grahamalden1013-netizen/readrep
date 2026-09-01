/**
 * Headless evaluation run for the full-game analysis pipeline.
 *
 *   npx tsx --conditions=react-server scripts/analysis-report.ts            # scout only
 *   npx tsx --conditions=react-server scripts/analysis-report.ts --full     # scout + real analysis
 *
 * Reads .env.local for OPENAI_API_KEY. Uses the public Mux playback id, so no
 * auth and no DB row are involved — this proves the pipeline against the real
 * 40-minute game without the browser. The confirmation crops a coach would
 * click are approximated here by the scout's own best frames; the report says so.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const GAME = {
  id: "4c059938-44f6-4377-87b4-76f619d1788f",
  title: "Dragons",
  playbackId: "yqvyYqVLV1k1H2kvoqEtuFvZoVfvvIg8kf4nIfb2sQo",
  durationSeconds: 2400,
  teamColor: "White",
  jerseyNumber: "15",
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const thumb = (t: number, w = 960) =>
  `https://image.mux.com/${GAME.playbackId}/thumbnail.webp?time=${t}&width=${w}&fit_mode=preserve`;
const preview = (a: number, b: number) =>
  `https://image.mux.com/${GAME.playbackId}/animated.webp?start=${a}&end=${b}&width=640&fps=15`;

async function main() {
  const full = process.argv.includes("--full");
  const { scoutTeamColorCandidates } = await import("@/lib/ai/game-analysis/scout");
  const { fetchMuxFrame } = await import("@/lib/video/mux-frame-source");
  const { POSSESSION_FRAME_WIDTH } = await import("@/lib/ai/game-analysis/limits");

  console.log(`\n=== NextRep analysis report — ${GAME.title} (${GAME.id}) ===`);
  console.log(`Target: ${GAME.teamColor} #${GAME.jerseyNumber}   Duration: ${clock(GAME.durationSeconds)}\n`);

  console.log("--- STEP 1: scan for the player ---");
  const scout = await scoutTeamColorCandidates(
    GAME.playbackId,
    GAME.durationSeconds,
    GAME.teamColor,
    GAME.jerseyNumber,
  );
  console.log(
    `probed ${scout.probed} frames in ${scout.calls} cheap calls (${scout.model}); ` +
      `${scout.liveColorFrames} live frames with ${GAME.teamColor} visible; ${scout.verified} confirmed by the strict pass.\n`,
  );
  console.log("Candidate moments for coach confirmation (open the URLs to verify #15):");
  scout.candidates.forEach((c, i) => {
    console.log(
      `  ${i + 1}. ${clock(c.timestampSeconds)}  [${c.strength}]\n` +
        `      still:   ${thumb(c.timestampSeconds)}\n` +
        `      preview: ${preview(c.previewStartSeconds, c.previewEndSeconds)}`,
    );
  });
  console.log(
    `\nInput tokens ${scout.usage.input}, output ${scout.usage.output}. ` +
      `A coach now clicks the player on 2-3 of these and answers Yes / No / Not clear.\n`,
  );

  if (!full) {
    console.log("(run again with --full to execute the analysis using these as references)\n");
    return;
  }

  // Approximate the coach-confirmed references with the scout's strongest frames.
  const refs = [...scout.candidates]
    .sort((a, b) => rank(b.strength) - rank(a.strength))
    .slice(0, 3);
  console.log("--- STEP 2: analysis (references approximated by scout frames) ---");
  console.log("references: " + refs.map((r) => `${clock(r.timestampSeconds)}[${r.strength}]`).join(", ") + "\n");

  const referenceFrames: { timestampSeconds: number; dataUrl: string }[] = [];
  for (const r of refs) {
    const f = await fetchMuxFrame(GAME.playbackId, r.timestampSeconds, POSSESSION_FRAME_WIDTH, 8000);
    if (f) referenceFrames.push({ timestampSeconds: r.timestampSeconds, dataUrl: f.dataUrl });
  }
  const anyNumberVisible = refs.some((r) => r.strength === "reads-target");

  const { findLiveSpans, buildPossessionWindows } = await import("@/lib/ai/game-analysis/discovery");
  const { analyzePossession } = await import("@/lib/ai/game-analysis/possession");
  const { dedupeAndRank } = await import("@/lib/ai/game-analysis/rank");
  const { MAX_REASONING_CALLS } = await import("@/lib/ai/game-analysis/limits");

  const live = await findLiveSpans(GAME.playbackId, GAME.durationSeconds);
  const windowsAll = buildPossessionWindows(live.spans);
  const step = Math.max(1, Math.floor(windowsAll.length / MAX_REASONING_CALLS));
  const windows = windowsAll.filter((_, i) => i % step === 0).slice(0, MAX_REASONING_CALLS);
  console.log(
    `live footage: ${live.spans.length} spans (${live.calls} calls, ${live.model}); ` +
      `${windowsAll.length} possession windows, analysing ${windows.length}.\n`,
  );

  const drafts: import("@/lib/ai/game-analysis/possession").CandidateDraft[] = [];
  const rejected: { window: string; reason: string; detail: string }[] = [];
  let flagged = 0;
  let inTok = live.usage.input + scout.usage.input;
  let outTok = live.usage.output + scout.usage.output;

  for (const w of windows) {
    const res = await analyzePossession(
      GAME.playbackId,
      w,
      { jerseyNumber: GAME.jerseyNumber, teamColor: GAME.teamColor.toLowerCase(), marker: "White uniform, number 15" },
      referenceFrames,
      null,
      { cues: ["White uniform, number 15"], anyNumberVisible },
    );
    inTok += res.usage.input;
    outTok += res.usage.output;
    if (res.kind === "rejected") {
      rejected.push({ window: `${clock(w.startSeconds)}-${clock(w.endSeconds)}`, reason: res.reason, detail: res.detail });
    } else {
      if (res.kind === "flagged") flagged += 1;
      drafts.push(res.draft);
      console.log(
        `  candidate @ ${clock(res.draft.decisionSeconds)} — ${res.draft.title} ` +
          `(id ${res.draft.playerIdConfidence.toFixed(2)}, dec ${res.draft.decisionConfidence.toFixed(2)})`,
      );
    }
  }

  const ranked = dedupeAndRank(drafts);

  console.log("\n=== POINT 10 REPORT ===");
  console.log(`player sightings found (scout):        ${scout.liveColorFrames}`);
  console.log(`possessions reviewed:                  ${windows.length}`);
  console.log(`candidate decisions found:             ${drafts.length} (${flagged} flagged low-confidence)`);
  console.log(`candidates rejected:                   ${rejected.length}`);
  const byReason = rejected.reduce<Record<string, number>>((a, r) => ((a[r.reason] = (a[r.reason] ?? 0) + 1), a), {});
  for (const [reason, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
    console.log(`   - ${reason}: ${n}`);
  }
  console.log(`final reps awaiting review (ranked):   ${ranked.length}`);
  ranked.forEach((r) =>
    console.log(`   #${r.rank} @ ${clock(r.decisionSeconds)}  ${r.title}  [${r.skillCategory ?? "uncategorised"}]`),
  );
  console.log(`\ntokens: in ${inTok}, out ${outTok}\n`);
}

function rank(s: string): number {
  return s === "reads-target" ? 3 : s === "number-legible" ? 2 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
