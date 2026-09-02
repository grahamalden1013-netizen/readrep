/**
 * Repair run for the three baseline defects.
 *
 *   npx tsx --conditions=react-server scripts/repair-run.ts
 *
 * Re-uses the persisted baseline data in scratchpad/coverage-cursor.json.
 * Makes a HANDFUL of new model calls only (windows 55 and 68); everything else
 * is recomputed from the stored drafts.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const PB = "yqvyYqVLV1k1H2kvoqEtuFvZoVfvvIg8kf4nIfb2sQo";
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const preview = (a: number, b: number) =>
  `https://image.mux.com/${PB}/animated.webp?start=${Math.round(a)}&end=${Math.round(b)}&width=640&fps=15`;
const still = (t: number) => `https://image.mux.com/${PB}/thumbnail.webp?time=${Math.round(t)}&width=960&fit_mode=preserve`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDraft = any;

async function main() {
  const cursor = JSON.parse(readFileSync(resolve(process.cwd(), "scratchpad/coverage-cursor.json"), "utf8"));
  const windows: { startSeconds: number; endSeconds: number }[] = cursor.windows;
  const storedDrafts: AnyDraft[] = cursor.drafts;
  const references: { timestampSeconds: number }[] = cursor.references;
  const anyNumberVisible: boolean = cursor.anyNumberVisible;

  console.log(`Loaded baseline: ${windows.length} windows, ${storedDrafts.length} stored candidate drafts.\n`);

  const { fetchMuxFrame } = await import("@/lib/video/mux-frame-source");
  const { POSSESSION_FRAME_WIDTH, MIN_PRE_DECISION_SECONDS } = await import("@/lib/ai/game-analysis/limits");
  const { analyzeWindowToTerminal } = await import("@/lib/ai/game-analysis/coverage");
  const { rankWithMergeReport } = await import("@/lib/ai/game-analysis/rank");

  // --- reference frames (same construction as the baseline harness) ---
  const referenceFrames: { timestampSeconds: number; dataUrl: string }[] = [];
  for (const r of references) {
    for (const dt of [0, -2, 2, -4, 4]) {
      const f = await fetchMuxFrame(PB, Math.max(0, r.timestampSeconds + dt), POSSESSION_FRAME_WIDTH, 8000);
      if (f) referenceFrames.push({ timestampSeconds: r.timestampSeconds + dt, dataUrl: f.dataUrl });
      if (referenceFrames.length >= 10) break;
    }
    if (referenceFrames.length >= 10) break;
  }
  const target = { jerseyNumber: "15", teamColor: "white", marker: "White uniform, number 15" };
  const refHint = { cues: ["White uniform, number 15"], anyNumberVisible };

  // --- DEFECT 3: reprocess window 55 (was invalid-output) ---
  console.log("--- Defect 3: reprocess window 55 (was invalid-output: choice id > 8 chars) ---");
  let repairIn = 0;
  let repairOut = 0;
  const w55 = windows[55];
  const r55 = await analyzeWindowToTerminal(55, w55, PB, target, referenceFrames, null, refHint);
  repairIn += r55.usage.input;
  repairOut += r55.usage.output;
  console.log(
    `  window 55 (${clock(w55.startSeconds)}-${clock(w55.endSeconds)}) -> ${r55.ledger.outcome} (${r55.ledger.reason})`,
  );
  const w55ParsesNow = r55.ledger.outcome !== "invalid-output";
  console.log(`  parses to a real semantic outcome now: ${w55ParsesNow}\n`);

  // --- DEFECT 1: reprocess window 68 (candidate #9, pause at window start) ---
  console.log("--- Defect 1: reprocess window 68 (candidate #9, pause was at window start) ---");
  const w68 = windows[68];
  const r68 = await analyzeWindowToTerminal(68, w68, PB, target, referenceFrames, null, refHint);
  repairIn += r68.usage.input;
  repairOut += r68.usage.output;
  console.log(
    `  window 68 (${clock(w68.startSeconds)}-${clock(w68.endSeconds)}) -> ${r68.ledger.outcome} (${r68.ledger.reason})`,
  );
  const w68Draft = r68.analyzed && (r68.analyzed.kind === "candidate" || r68.analyzed.kind === "flagged")
    ? { ...r68.analyzed.draft, __window: 68, __flagged: r68.analyzed.kind === "flagged" }
    : null;
  console.log(
    w68Draft
      ? `  repaired: new pause @ ${clock(w68Draft.decisionSeconds)}, ${(w68Draft.decisionSeconds - w68Draft.clipStartSeconds).toFixed(1)}s of pre-decision context`
      : `  removed: no longer a valid candidate`,
  );
  console.log("");

  // --- assemble the candidate set for re-dedupe ---
  // start from stored drafts, drop the old window-68 draft, add the repaired one if any
  const beforeDrafts: AnyDraft[] = storedDrafts
    .filter((d) => d.__window !== 68)
    .concat(w68Draft ? [w68Draft] : []);

  // context invariant over every candidate (geometry form)
  const contextRejected = beforeDrafts.filter(
    (d) => d.decisionSeconds - d.clipStartSeconds < MIN_PRE_DECISION_SECONDS,
  );
  const contextOk = beforeDrafts.filter(
    (d) => d.decisionSeconds - d.clipStartSeconds >= MIN_PRE_DECISION_SECONDS,
  );

  console.log("--- Defect 1: pre-decision-context invariant over all candidates ---");
  console.log(`  candidates entering dedupe: ${beforeDrafts.length}`);
  console.log(`  rejected for insufficient-pre-decision-context: ${contextRejected.length}`);
  for (const d of contextRejected) {
    console.log(`     window ${d.__window} @ ${clock(d.decisionSeconds)} — only ${(d.decisionSeconds - d.clipStartSeconds).toFixed(1)}s lead`);
  }
  console.log("");

  // --- DEFECT 2: timestamp-based merge ---
  const { ranked, merges } = rankWithMergeReport(contextOk);
  console.log("--- Defect 2: timestamp-based duplicate merge ---");
  console.log(`  candidates before dedupe: ${contextOk.length}`);
  console.log(`  candidates after dedupe:  ${ranked.length}`);
  console.log(`  merges: ${merges.length}`);
  for (const m of merges) {
    const keptW = beforeDrafts.find((d) => d === contextOk[m.kept])?.__window;
    const mergedW = m.merged.map((i) => contextOk[i]?.__window);
    console.log(`     kept window ${keptW}  <-  merged windows ${mergedW.join(", ")}`);
    console.log(`     reason: ${m.reason}`);
  }
  console.log("");

  // --- final queue ---
  console.log("=== FINAL REVIEW QUEUE (post-repair) ===");
  ranked.forEach((r, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rr = r as any;
    console.log(
      `  #${i + 1}  window ${rr.__window}  decision @ ${clock(r.decisionSeconds)}  ` +
        `(clip ${clock(r.clipStartSeconds)}..${clock(r.clipEndSeconds)}, ${(r.decisionSeconds - r.clipStartSeconds).toFixed(1)}s lead)\n` +
        `      "${r.title}" — ${r.skillCategory ?? "uncategorised"}${rr.__flagged ? "  [flagged]" : ""}\n` +
        `      preview: ${preview(r.clipStartSeconds, r.clipEndSeconds)}\n` +
        `      still @ pause: ${still(r.decisionSeconds)}`,
    );
  });
  console.log("");
  console.log("--- repair run cost ---");
  console.log(`  new model calls: 2 (windows 55, 68)`);
  console.log(`  tokens: in ${repairIn}  out ${repairOut}`);
  console.log(
    `  est cost: $${((repairIn / 1e6) * 1.25 + (repairOut / 1e6) * 10).toFixed(3)} + a few reference-frame fetches`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
