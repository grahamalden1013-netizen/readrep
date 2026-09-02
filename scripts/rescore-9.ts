/**
 * Re-run the strict (prompt v2) decision gate against the nine current
 * candidates WITHOUT changing their window timestamps.
 *
 *   npx tsx --conditions=react-server scripts/rescore-9.ts
 *
 * ~9 model calls. Captures window 67 (the 21:01 clip) as a permanent
 * regression fixture that must reject as no-meaningful-decision.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const PB = "yqvyYqVLV1k1H2kvoqEtuFvZoVfvvIg8kf4nIfb2sQo";
const WINDOWS_9 = [67, 24, 33, 27, 71, 47, 83, 35, 48];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

async function main() {
  const cursor = JSON.parse(readFileSync(resolve(process.cwd(), "scratchpad/coverage-cursor.json"), "utf8"));
  const windows: { startSeconds: number; endSeconds: number }[] = cursor.windows;
  const references: { timestampSeconds: number }[] = cursor.references;
  const anyNumberVisible: boolean = cursor.anyNumberVisible;

  const { fetchMuxFrame } = await import("@/lib/video/mux-frame-source");
  const { POSSESSION_FRAME_WIDTH } = await import("@/lib/ai/game-analysis/limits");
  const { analyzePossession, __setRawHook } = await import("@/lib/ai/game-analysis/possession");

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

  console.log(`Re-scoring ${WINDOWS_9.length} candidates against the strict v2 gate.\n`);
  const rows: { win: number; window: string; decision: string; kind: string; reason: string }[] = [];
  let inTok = 0;
  let outTok = 0;

  for (const w of WINDOWS_9) {
    const win = windows[w];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let captured: any = null;
    __setRawHook((x) => {
      captured = x;
    });
    const res = await analyzePossession(PB, win, target, referenceFrames, null, refHint);
    __setRawHook(undefined);
    inTok += res.usage.input;
    outTok += res.usage.output;

    const reason =
      res.kind === "rejected" ? res.reason : res.kind === "flagged" ? `flagged: ${res.reason}` : "accepted";
    const detail = res.kind === "rejected" ? ` (${res.detail})` : "";
    rows.push({
      win: w,
      window: `${clock(win.startSeconds)}-${clock(win.endSeconds)}`,
      decision: captured?.raw?.decision === true ? "decision:true" : "decision:false",
      kind: res.kind,
      reason: reason + detail,
    });
    console.log(
      `  win ${String(w).padStart(3)} ${clock(win.startSeconds)}-${clock(win.endSeconds)}  ` +
        `model:${captured?.raw?.decision === true ? "decision" : "no-decision"}  ->  ${res.kind} · ${reason}${detail}`,
    );

    if (w === 67 && captured) {
      mkdirSync(resolve(process.cwd(), "test/fixtures"), { recursive: true });
      writeFileSync(
        resolve(process.cwd(), "test/fixtures/decision-21-01-response.json"),
        JSON.stringify(
          {
            note: "Regression fixture — the 21:01 clip (window 67). The strict v2 gate MUST reject this as no-meaningful-decision.",
            capturedAt: new Date().toISOString(),
            window: win,
            gateKind: captured.gate.kind,
            gateReason: captured.gate.kind === "rejected" ? captured.gate.reason : null,
            modelResponse: captured.raw,
          },
          null,
          2,
        ),
      );
      console.log("    -> wrote test/fixtures/decision-21-01-response.json");
    }
  }

  const survived = rows.filter((r) => r.kind === "candidate" || r.kind === "flagged");
  console.log("\n=== RESCORE RESULT ===");
  console.log(`survivors: ${survived.length} / ${WINDOWS_9.length}`);
  for (const r of rows) {
    const mark = r.kind === "candidate" || r.kind === "flagged" ? "KEEP  " : "reject";
    console.log(`  ${mark} win ${String(r.win).padStart(3)} ${r.window}  ${r.decision}  ${r.reason}`);
  }
  console.log(`\ntokens: in ${inTok}, out ${outTok}  ·  est $${((inTok / 1e6) * 1.25 + (outTok / 1e6) * 10).toFixed(3)}`);
  const w67 = rows.find((r) => r.win === 67);
  console.log(`\n21:01 (window 67): ${w67?.kind} — ${w67?.reason}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
