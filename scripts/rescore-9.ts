/**
 * Validate game-analysis-v2 + the independent verifier against the nine
 * baseline clips. Timestamps unchanged. No 130-window rerun.
 *
 *   npx tsx --conditions=react-server scripts/rescore-9.ts
 *
 * Per clip: discovery decision -> deterministic gate -> (if it passes) an
 * independent verification pass -> final result. Captures window 67 (21:01) as
 * the permanent regression fixture.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const PB = "yqvyYqVLV1k1H2kvoqEtuFvZoVfvvIg8kf4nIfb2sQo";
const WINDOWS_9 = [67, 24, 33, 27, 71, 47, 83, 35, 48];
const TITLES: Record<number, string> = {
  67: "Attack the Gap With a Help Read",
  24: "High Ball Screen: Roll to the Rim",
  33: "Transition attack: finish through the lane",
  27: "Weak-Side Rim Rotation",
  71: "Attack the Left-Side Closeout",
  47: "Use the Screen, Then Find the Wing",
  83: "High Screen: Roll Into Space",
  35: "Drive Help, Then Kick Out",
  48: "Protect the Rim on the Late Drive",
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const preview = (a: number, b: number) =>
  `https://image.mux.com/${PB}/animated.webp?start=${Math.round(a)}&end=${Math.round(b)}&width=640&fps=15`;

async function main() {
  const cursor = JSON.parse(readFileSync(resolve(process.cwd(), "scratchpad/coverage-cursor.json"), "utf8"));
  const windows: { startSeconds: number; endSeconds: number }[] = cursor.windows;
  const references: { timestampSeconds: number }[] = cursor.references;
  const anyNumberVisible: boolean = cursor.anyNumberVisible;

  const { fetchMuxFrame } = await import("@/lib/video/mux-frame-source");
  const { POSSESSION_FRAME_WIDTH } = await import("@/lib/ai/game-analysis/limits");
  const { analyzePossessionVerified, __setRawHook } = await import("@/lib/ai/game-analysis/possession");

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

  console.log("Validating game-analysis-v2 + verifier against 9 baseline clips.\n");
  let inTok = 0;
  let outTok = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const report: any[] = [];

  for (const w of WINDOWS_9) {
    const win = windows[w];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let captured: any = null;
    __setRawHook((x) => {
      captured = x;
    });
    const res = await analyzePossessionVerified(PB, win, target, referenceFrames, null, refHint);
    __setRawHook(undefined);
    inTok += res.usage.input;
    outTok += res.usage.output;

    const discovery = captured?.raw?.decision === true ? "decision:true" : "decision:false";
    const gateKind = captured?.gate?.kind ?? "n/a";
    const gateReason =
      captured?.gate?.kind === "rejected" ? `${captured.gate.reason} (${captured.gate.detail})` : gateKind;
    const verifier = res.verifier
      ? `T:${b(res.verifier.correctTarget)} D:${b(res.verifier.meaningfulDecision)} A:${b(
          res.verifier.twoAlternativesVisible,
        )} P:${b(res.verifier.pauseBeforeCommitment)} O:${b(res.verifier.outcomeVisible)}`
      : "not run (gate rejected)";
    const finalResult =
      res.kind === "candidate" ? "ACCEPT" : res.kind === "flagged" ? "needs_attention" : "reject";
    const finalReason = res.kind === "rejected" ? `${res.reason} (${res.detail})` : res.kind === "flagged" ? res.reason : "";

    report.push({ w, win, discovery, gateReason, verifier, finalResult, finalReason, res, captured });
    console.log(
      `win ${String(w).padStart(3)} ${clock(win.startSeconds)}-${clock(win.endSeconds)} "${TITLES[w]}"\n` +
        `   discovery: ${discovery}\n` +
        `   gate:      ${gateReason}\n` +
        `   verifier:  ${verifier}\n` +
        `   FINAL:     ${finalResult}${finalReason ? ` — ${finalReason}` : ""}\n`,
    );

    if (captured) {
      mkdirSync(resolve(process.cwd(), "test/fixtures/v2-negative"), { recursive: true });
      writeFileSync(
        resolve(process.cwd(), `test/fixtures/v2-negative/win-${w}.json`),
        JSON.stringify(
          {
            note: `Permanent NEGATIVE regression fixture — baseline clip "${TITLES[w]}" (${clock(win.startSeconds)}-${clock(win.endSeconds)}). Human review confirmed no meaningful decision by white #15. game-analysis-v2 must NEVER accept/publish this; if discovery+gate pass, the independent verifier must disagree.`,
            capturedAt: new Date().toISOString(),
            window: win,
            gateKind: captured.gate.kind,
            gateReason: captured.gate.kind === "rejected" ? captured.gate.reason : null,
            finalKind: res.kind, // "rejected" | "flagged" (never "candidate")
            verifierVerdict: res.verifier ?? null,
            modelResponse: captured.raw,
          },
          null,
          2,
        ),
      );
      if (w === 67) {
        // keep the legacy path referenced by decision-gate-regression.test.ts
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
      }
    }

    if (res.kind === "candidate" || res.kind === "flagged") {
      const d = res.draft;
      console.log("   TIMESTAMP GROUNDING:");
      console.log(`     target identified:  ${d.targetEvidence.map((e) => clock(e.timestampSeconds)).join(", ")}`);
      console.log(`     decision (pause):   ${clock(d.decisionSeconds)}`);
      console.log(`     actual action:      ${d.actualAction} @ ${d.actualActionSeconds != null ? clock(d.actualActionSeconds) : "?"}`);
      console.log(`     visible outcome:    ${d.visibleOutcomeSeconds != null ? clock(d.visibleOutcomeSeconds) : "?"}`);
      d.plausibleAlternatives.forEach((a, i) =>
        console.log(`     alt ${i + 1} @ ${clock(a.atSeconds)}:  ${a.action} — ${a.visibleEvidence}`),
      );
      console.log(`     preview:            ${preview(d.clipStartSeconds, d.clipEndSeconds)}\n`);
    }
  }

  console.log("=== SUMMARY ===");
  console.log("win | title | discovery | gate | verifier | final | reason | preview");
  for (const r of report) {
    const d = r.res.kind === "rejected" ? null : r.res.draft;
    console.log(
      `${String(r.w).padStart(3)} | ${TITLES[r.w]} | ${r.discovery} | ${r.gateReason} | ${r.verifier} | ` +
        `${r.finalResult} | ${r.finalReason || "-"} | ${d ? preview(d.clipStartSeconds, d.clipEndSeconds) : "-"}`,
    );
  }
  const accepted = report.filter((r) => r.res.kind === "candidate").length;
  const na = report.filter((r) => r.res.kind === "flagged").length;
  console.log(`\naccepted: ${accepted}/9   needs_attention: ${na}/9   rejected: ${9 - accepted - na}/9`);
  const w67 = report.find((r) => r.w === 67);
  console.log(
    `\n21:01 (window 67): discovery ${w67.discovery}, final ${w67.finalResult} — ${w67.finalReason || w67.gateReason}`,
  );
  console.log(`\ntokens: in ${inTok}, out ${outTok}  ·  added model cost est $${((inTok / 1e6) * 1.25 + (outTok / 1e6) * 10).toFixed(3)}`);
}

function b(x: boolean) {
  return x ? "y" : "n";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
