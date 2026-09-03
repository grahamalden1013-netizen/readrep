/**
 * Calibration evaluation for game 4c059938: run game-analysis-v2 against the
 * ten human gold-set clips only. No thresholds are changed.
 *
 *   1) dump the labels + genuine references:
 *      (agent) execute SQL -> scratchpad/calibration-bundle.json
 *   2) npx tsx --conditions=react-server scripts/calibration-eval.ts
 *
 * bundle.json shape:
 *   { references: [{ timestampSeconds, crop, numberVisible }],
 *     labels: [{ id, kind, clipStartSeconds, decisionSeconds, clipEndSeconds,
 *                actualAction, note, rejectionReason }] }
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const PB = "yqvyYqVLV1k1H2kvoqEtuFvZoVfvvIg8kf4nIfb2sQo";
const PAUSE_TOLERANCE_SECONDS = 1.5;
const TERRA_IN = 1.25 / 1e6;
const TERRA_OUT = 10 / 1e6;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const preview = (a: number, b: number) =>
  `https://image.mux.com/${PB}/animated.webp?start=${Math.round(a)}&end=${Math.round(b)}&width=640&fps=15`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

async function main() {
  const bundlePath = resolve(process.cwd(), "scratchpad/calibration-bundle.json");
  if (!existsSync(bundlePath)) {
    console.log("scratchpad/calibration-bundle.json not found. Dump the labels + references first.");
    process.exit(1);
  }
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as {
    references: { timestampSeconds: number; crop: string; numberVisible: boolean }[];
    labels: Any[];
  };
  const positives = bundle.labels.filter((l) => l.kind === "decision");
  const negatives = bundle.labels.filter((l) => l.kind === "non-decision");
  if (positives.length < 5 || negatives.length < 5) {
    console.log(`Gold set incomplete: ${positives.length} decisions, ${negatives.length} non-decisions. Need 5 + 5.`);
    process.exit(1);
  }
  if (bundle.references.length < 2 || !bundle.references.some((r) => r.numberVisible)) {
    console.log("Need 2-3 genuine references with at least one readable-number crop.");
    process.exit(1);
  }

  const { fetchMuxFrame } = await import("@/lib/video/mux-frame-source");
  const { POSSESSION_FRAME_WIDTH } = await import("@/lib/ai/game-analysis/limits");
  const { analyzePossessionVerified, __setRawHook } = await import("@/lib/ai/game-analysis/possession");
  const { verifierAgrees } = await import("@/lib/ai/game-analysis/verify-types");

  // genuine references: the coach crops themselves + their source frames + neighbours
  const referenceFrames: { timestampSeconds: number; dataUrl: string }[] = [];
  for (const r of bundle.references.slice(0, 3)) referenceFrames.push({ timestampSeconds: r.timestampSeconds, dataUrl: r.crop });
  for (const r of bundle.references.slice(0, 3)) {
    for (const dt of [0, -2, 2]) {
      const f = await fetchMuxFrame(PB, Math.max(0, r.timestampSeconds + dt), POSSESSION_FRAME_WIDTH, 8000);
      if (f) referenceFrames.push({ timestampSeconds: r.timestampSeconds + dt, dataUrl: f.dataUrl });
      if (referenceFrames.length >= 12) break;
    }
    if (referenceFrames.length >= 12) break;
  }
  const target = { jerseyNumber: "15", teamColor: "white", marker: "White uniform, number 15" };
  const refHint = { cues: ["White uniform, number 15"], anyNumberVisible: bundle.references.some((r) => r.numberVisible) };

  let inTok = 0;
  let outTok = 0;
  const rows: Any[] = [];

  for (const l of [...positives, ...negatives]) {
    const isPos = l.kind === "decision";
    const centre = isPos ? l.decisionSeconds : (l.clipStartSeconds + l.clipEndSeconds) / 2;
    const window = { startSeconds: Math.max(0, centre - 9), endSeconds: centre + 9 };

    let captured: Any = null;
    __setRawHook((x) => {
      captured = x;
    });
    const res = await analyzePossessionVerified(PB, window, target, referenceFrames, null, refHint);
    __setRawHook(undefined);
    inTok += res.usage.input;
    outTok += res.usage.output;

    const raw = captured?.raw ?? null;
    const gate = captured?.gate ?? null;
    const discovery = raw ? (raw.decision === true ? "decision" : "no-decision") : "no-response";
    const gatePass = gate ? gate.kind !== "rejected" : false;
    const gateReason = gate && gate.kind === "rejected" ? `${gate.reason} (${gate.detail})` : gate?.kind ?? "n/a";
    const verifier = res.verifier ?? null;
    const verPass = verifier ? verifierAgrees(verifier) : null;
    const final = res.kind === "candidate" ? "accepted" : res.kind === "flagged" ? "needs_attention" : "rejected";

    let pauseOk: boolean | null = null;
    let pauseDelta: number | null = null;
    if (isPos && (res.kind === "candidate" || res.kind === "flagged")) {
      pauseDelta = Math.abs(res.draft.decisionSeconds - l.decisionSeconds);
      pauseOk = pauseDelta <= PAUSE_TOLERANCE_SECONDS;
    }

    const rejStage = !gate
      ? "processing-failure"
      : gate.kind !== "rejected"
        ? verifier && !verifierAgrees(verifier)
          ? "verifier"
          : "pass"
        : gate.reason === "frames-unavailable"
          ? "frames"
          : gate.reason === "invalid-output"
            ? "schema"
            : raw && raw.decision === false
              ? "discovery"
              : "gate";

    rows.push({
      id: l.id,
      kind: l.kind,
      humanDecision: isPos ? l.decisionSeconds : null,
      humanAction: l.actualAction ?? null,
      window,
      discovery,
      gatePass,
      gateReason,
      verifier,
      verPass,
      final,
      pauseOk,
      pauseDelta,
      rejStage,
      modelDecision: res.kind === "rejected" ? null : res.draft.decisionSeconds,
      modelAction: res.kind === "rejected" ? null : res.draft.actualAction,
      clip: res.kind === "rejected" ? null : [res.draft.clipStartSeconds, res.draft.clipEndSeconds],
    });

    console.log(
      `${l.kind === "decision" ? "POS" : "NEG"} ${l.id.slice(0, 8)} @ ${clock(centre)}  ` +
        `disc:${discovery} gate:${gatePass ? "pass" : "reject"} ` +
        (verifier ? `verif:${verPass ? "pass" : "disagree"} ` : "") +
        `-> ${final}` +
        (isPos && pauseDelta != null ? `  Δpause ${pauseDelta.toFixed(1)}s` : ""),
    );
  }

  // ---- metrics ----
  const pos = rows.filter((r) => r.kind === "decision");
  const neg = rows.filter((r) => r.kind === "non-decision");
  const detected = pos.filter((r) => r.final === "accepted");
  const rejectedNeg = neg.filter((r) => r.final === "rejected");
  const targetOk = detected.filter((r) => r.verifier?.correctTarget === true);
  const pausesOk = detected.filter((r) => r.pauseOk === true);

  console.log("\n==================== CALIBRATION EVAL (game-analysis-v2, no tuning) ====================");
  console.log(`gold set: ${pos.length} real decisions, ${neg.length} non-decisions  ·  references: ${bundle.references.length}`);
  console.log("");
  console.log(`positive recall (detected / 5):        ${detected.length} / ${pos.length}`);
  console.log(`negative precision (rejected / 5):     ${rejectedNeg.length} / ${neg.length}`);
  console.log(`target-identification accuracy:        ${targetOk.length} / ${detected.length || 0} accepted`);
  console.log(`pause-point accuracy (<= ${PAUSE_TOLERANCE_SECONDS}s):        ${pausesOk.length} / ${detected.length || 0} accepted`);
  console.log("");
  console.log("discovery / gate / verifier breakdown:");
  console.log(`  discovery decision:true   ${rows.filter((r) => r.discovery === "decision").length} / 10`);
  console.log(`  gate passes               ${rows.filter((r) => r.gatePass).length} / 10`);
  console.log(`  verifier ran              ${rows.filter((r) => r.verifier).length}`);
  console.log(`  verifier passed           ${rows.filter((r) => r.verPass === true).length}`);
  console.log(`  verifier disagreed        ${rows.filter((r) => r.verifier && r.verPass === false).length}`);
  console.log("");
  console.log(`added model cost:  in ${inTok} out ${outTok}  ≈ $${(inTok * TERRA_IN + outTok * TERRA_OUT).toFixed(3)}`);
  console.log("");

  console.log("EXACT DISAGREEMENTS:");
  for (const r of pos.filter((x) => x.final !== "accepted")) {
    console.log(
      `  POS ${r.id.slice(0, 8)}: expected a decision @ ${clock(r.humanDecision)} (${r.humanAction}), got ${r.final}` +
        `  [stage: ${r.rejStage}, reason: ${r.gateReason}${r.verifier ? `, verifier ${JSON.stringify(r.verifier)}` : ""}]`,
    );
  }
  for (const r of pos.filter((x) => x.final === "accepted" && (x.pauseOk === false || x.verifier?.correctTarget === false))) {
    console.log(
      `  POS ${r.id.slice(0, 8)}: accepted but ` +
        (r.pauseOk === false ? `pause off by ${r.pauseDelta.toFixed(1)}s ` : "") +
        (r.verifier?.correctTarget === false ? "verifier: wrong target " : ""),
    );
  }
  for (const r of neg.filter((x) => x.final !== "rejected")) {
    console.log(`  NEG ${r.id.slice(0, 8)}: expected rejection, got ${r.final}  ${r.clip ? preview(r.clip[0], r.clip[1]) : ""}`);
  }
  if (
    pos.every((r) => r.final === "accepted") &&
    neg.every((r) => r.final === "rejected") &&
    pausesOk.length === detected.length
  ) {
    console.log("  none");
  }

  console.log("\nDIAGNOSIS (if recall low — do NOT fix by telling the model to accept more):");
  const posDiscFalse = pos.filter((r) => r.discovery === "no-decision");
  const posGateRej = pos.filter((r) => r.discovery === "decision" && !r.gatePass);
  const posVerRej = pos.filter((r) => r.gatePass && r.verPass === false);
  if (posDiscFalse.length) {
    console.log(
      `  ${posDiscFalse.length} positive(s): discovery returned decision:false. Check — genuine references correct? ` +
        `frame density enough to show the commitment? window cutting the possession? Or prompt too conservative.`,
    );
    for (const r of posDiscFalse) console.log(`     ${r.id.slice(0, 8)} @ ${clock(r.humanDecision)}: ${r.gateReason}`);
  }
  if (posGateRej.length) {
    console.log(`  ${posGateRej.length} positive(s): model asserted a decision but the grounding gate rejected it —`);
    for (const r of posGateRej) console.log(`     ${r.id.slice(0, 8)}: ${r.gateReason}`);
  }
  if (posVerRej.length) {
    console.log(`  ${posVerRej.length} positive(s): discovery+gate passed but the independent verifier disagreed —`);
    for (const r of posVerRej) console.log(`     ${r.id.slice(0, 8)}: ${JSON.stringify(r.verifier)}`);
  }
  if (!posDiscFalse.length && !posGateRej.length && !posVerRej.length) console.log("  recall is fine — no diagnosis needed.");
  console.log("======================================================================================");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
