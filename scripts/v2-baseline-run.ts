/**
 * One clean, full-game game-analysis-v2 baseline for game 4c059938.
 *
 *   npx tsx --conditions=react-server scripts/v2-baseline-run.ts [--max N] [--reset]
 *
 * Every live-play window -> discovery -> deterministic grounding gate ->
 * (only if it passes) independent verifier. Own resumable cursor, exactly-once,
 * pipelineVersion stamped on every ledger entry. Hard $5 total-cost ceiling:
 * on reaching it, the run stops and the cursor is preserved.
 *
 * Does NOT reuse v1 ledger outcomes. Does NOT modify thresholds. Does NOT force
 * a minimum candidate count.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
process.env.OPENAI_MAX_REASONING_CALLS = process.env.OPENAI_MAX_REASONING_CALLS || "1000";

const PIPELINE_VERSION = "game-analysis-v2";
const COST_CEILING_USD = 5.0;
const MAX_WINDOW_ATTEMPTS = 3;
const TERRA_IN = 1.25 / 1e6;
const TERRA_OUT = 10 / 1e6;
const NANO_IN = 0.05 / 1e6;
const NANO_OUT = 0.4 / 1e6;

const GAME = {
  id: "4c059938-44f6-4377-87b4-76f619d1788f",
  title: "Dragons",
  playbackId: "yqvyYqVLV1k1H2kvoqEtuFvZoVfvvIg8kf4nIfb2sQo",
  durationSeconds: 2400,
  teamColor: "White",
  jerseyNumber: "15",
};
const SCRATCH = resolve(process.cwd(), "scratchpad");
const CURSOR = resolve(SCRATCH, "v2-baseline-cursor.json");

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const preview = (a: number, b: number) =>
  `https://image.mux.com/${GAME.playbackId}/animated.webp?start=${Math.round(a)}&end=${Math.round(b)}&width=640&fps=15`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

type Persist = {
  pipelineVersion: string;
  builtAt: string;
  game: typeof GAME;
  liveSpanCount: number;
  windows: { startSeconds: number; endSeconds: number }[];
  references: { timestampSeconds: number }[];
  anyNumberVisible: boolean;
  possessionIndex: number;
  ledger: Any[];
  discoveryCalls: number;
  verifierCalls: number;
  retries: number;
  stageACalls: number;
  tokensIn: number;
  tokensOut: number;
  stageATokensIn: number;
  stageATokensOut: number;
  costUsd: number;
  wallMsAccrued: number;
  ceilingHit: boolean;
};

const load = (): Persist | null => (existsSync(CURSOR) ? (JSON.parse(readFileSync(CURSOR, "utf8")) as Persist) : null);
const save = (p: Persist) => {
  mkdirSync(SCRATCH, { recursive: true });
  writeFileSync(CURSOR, JSON.stringify(p, null, 2));
};

async function build(): Promise<Persist> {
  const { findLiveSpans, buildPossessionWindows } = await import("@/lib/ai/game-analysis/discovery");
  console.log("Building v2 baseline plan (Stage A live-span discovery)…");
  const live = await findLiveSpans(GAME.playbackId, GAME.durationSeconds);
  const windows = buildPossessionWindows(live.spans);
  console.log(`  ${live.spans.length} live spans -> ${windows.length} possession windows (${live.calls} cheap calls)`);

  const v1 = existsSync(resolve(SCRATCH, "coverage-cursor.json"))
    ? JSON.parse(readFileSync(resolve(SCRATCH, "coverage-cursor.json"), "utf8"))
    : { references: [], anyNumberVisible: false };

  return {
    pipelineVersion: PIPELINE_VERSION,
    builtAt: new Date().toISOString(),
    game: GAME,
    liveSpanCount: live.spans.length,
    windows,
    references: v1.references ?? [],
    anyNumberVisible: v1.anyNumberVisible ?? false,
    possessionIndex: 0,
    ledger: [],
    discoveryCalls: 0,
    verifierCalls: 0,
    retries: 0,
    stageACalls: live.calls,
    tokensIn: 0,
    tokensOut: 0,
    stageATokensIn: live.usage.input,
    stageATokensOut: live.usage.output,
    costUsd: live.usage.input * NANO_IN + live.usage.output * NANO_OUT,
    wallMsAccrued: 0,
    ceilingHit: false,
  };
}

function rejectionStage(raw: Any, gate: Any): { stage: string; reason: string } {
  if (!gate) return { stage: "frames", reason: "frames or model output unavailable" };
  if (gate.kind !== "rejected") return { stage: "pass", reason: gate.kind };
  if (gate.reason === "frames-unavailable") return { stage: "frames", reason: gate.detail || "frames unavailable" };
  if (gate.reason === "invalid-output") return { stage: "schema", reason: gate.detail || "invalid output" };
  if (raw && raw.decision === false) {
    return { stage: "discovery", reason: raw.noDecisionReason || gate.detail || "decision:false" };
  }
  return { stage: "gate", reason: `${gate.reason} (${gate.detail})` };
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
  const { analyzePossessionVerified, __setRawHook } = await import("@/lib/ai/game-analysis/possession");

  const referenceFrames: { timestampSeconds: number; dataUrl: string }[] = [];
  for (const r of state.references) {
    for (const dt of [0, -2, 2, -4, 4]) {
      const f = await fetchMuxFrame(GAME.playbackId, Math.max(0, r.timestampSeconds + dt), POSSESSION_FRAME_WIDTH, 8000);
      if (f) referenceFrames.push({ timestampSeconds: r.timestampSeconds + dt, dataUrl: f.dataUrl });
      if (referenceFrames.length >= 10) break;
    }
    if (referenceFrames.length >= 10) break;
  }
  const target = { jerseyNumber: GAME.jerseyNumber, teamColor: GAME.teamColor.toLowerCase(), marker: "White uniform, number 15" };
  const refHint = { cues: [`${GAME.teamColor} uniform, number ${GAME.jerseyNumber}`], anyNumberVisible: state.anyNumberVisible };

  const covered = new Set<number>(state.ledger.map((e: Any) => e.index));
  let processedThisRun = 0;
  let skipped = 0;
  const runStart = Date.now();

  while (state.possessionIndex < state.windows.length && processedThisRun < max && !state.ceilingHit) {
    const idx = state.possessionIndex;
    if (covered.has(idx)) {
      skipped += 1;
      state.possessionIndex += 1;
      continue;
    }
    const win = state.windows[idx];

    let attempts = 0;
    let res: Any = null;
    let captured: Any = null;
    let lastErr = "";
    while (attempts < MAX_WINDOW_ATTEMPTS && !res) {
      attempts += 1;
      captured = null;
      __setRawHook((x) => {
        captured = x;
      });
      try {
        res = await analyzePossessionVerified(GAME.playbackId, win, target, referenceFrames, null, refHint);
      } catch (e) {
        lastErr = e instanceof Error ? e.message.slice(0, 120) : String(e);
        if (attempts < MAX_WINDOW_ATTEMPTS) await new Promise((r) => setTimeout(r, 1500 * attempts));
      } finally {
        __setRawHook(undefined);
      }
    }
    state.retries += attempts - 1;

    let entry: Any;
    if (!res) {
      entry = {
        index: idx,
        startSeconds: win.startSeconds,
        endSeconds: win.endSeconds,
        pipelineVersion: PIPELINE_VERSION,
        discovery: "error",
        gateStage: "processing-failure",
        gateReason: lastErr || "provider error after retries",
        verifier: null,
        final: "rejected",
        rejectionStage: "processing-failure",
        rejectionReason: lastErr || "provider error after retries",
        attempts,
        usage: { input: 0, output: 0 },
      };
    } else {
      state.tokensIn += res.usage.input;
      state.tokensOut += res.usage.output;
      state.costUsd += res.usage.input * TERRA_IN + res.usage.output * TERRA_OUT;
      state.discoveryCalls += 1;
      if (res.verifier) state.verifierCalls += 1;

      const raw = captured?.raw ?? null;
      const gate = captured?.gate ?? null;
      const rs = rejectionStage(raw, gate);
      const discovery = raw ? (raw.decision === true ? "decision" : "no-decision") : "no-response";
      const final = res.kind === "candidate" ? "accepted" : res.kind === "flagged" ? "needs_attention" : "rejected";

      entry = {
        index: idx,
        startSeconds: win.startSeconds,
        endSeconds: win.endSeconds,
        pipelineVersion: PIPELINE_VERSION,
        discovery,
        gateStage: rs.stage,
        gateReason: rs.reason,
        verifier: res.verifier ?? null,
        final,
        rejectionStage: final === "rejected" ? rs.stage : null,
        rejectionReason: final === "rejected" ? rs.reason : final === "needs_attention" ? res.reason : null,
        attempts,
        usage: res.usage,
      };
      if (res.kind === "candidate" || res.kind === "flagged") {
        const d = res.draft;
        entry.draft = {
          title: d.title,
          skillCategory: d.skillCategory,
          decisionSeconds: d.decisionSeconds,
          clipStartSeconds: d.clipStartSeconds,
          clipEndSeconds: d.clipEndSeconds,
          actualAction: d.actualAction,
          actualActionSeconds: d.actualActionSeconds,
          visibleOutcomeSeconds: d.visibleOutcomeSeconds,
          targetEvidence: d.targetEvidence,
          plausibleAlternatives: d.plausibleAlternatives,
          playerIdConfidence: d.playerIdConfidence,
          decisionConfidence: d.decisionConfidence,
          situation: d.situation,
          prompt: d.prompt,
          answerChoices: d.answerChoices,
          bestReadChoiceId: d.bestReadChoiceId,
          actualDecisionChoiceId: d.actualDecisionChoiceId,
          outcome: d.outcome,
          coachingExplanation: d.coachingExplanation,
          possessionSummary: d.possessionSummary,
          whyThisIsNotRoutine: d.whyThisIsNotRoutine,
          whyThePauseIsBeforeCommitment: d.whyThePauseIsBeforeCommitment,
          difficulty: d.difficulty,
          decisionTags: d.decisionTags,
        };
      }
    }

    state.ledger.push(entry);
    covered.add(idx);
    state.possessionIndex += 1;
    processedThisRun += 1;
    state.wallMsAccrued += Date.now() - runStart - state.wallMsAccrued + state.wallMsAccrued; // noop; wall added below
    save(state);
    process.stdout.write(
      `  [${state.ledger.length}/${state.windows.length}] win ${idx} ${clock(win.startSeconds)}-${clock(win.endSeconds)}  ` +
        `${entry.discovery} · ${entry.gateStage}${entry.final !== "rejected" ? ` · ${entry.final}` : ""}  ($${state.costUsd.toFixed(2)})\n`,
    );

    if (state.costUsd >= COST_CEILING_USD) {
      state.ceilingHit = true;
      save(state);
      console.log(`\n!! COST CEILING $${COST_CEILING_USD} reached at $${state.costUsd.toFixed(2)}. Stopping. Cursor preserved.`);
      break;
    }
  }

  state.wallMsAccrued += Date.now() - runStart;
  save(state);
  report(state, processedThisRun, skipped);
}

function report(state: Persist, processedThisRun: number, skipped: number) {
  const L = state.ledger as Any[];
  const done = state.ledger.length >= state.windows.length;
  console.log(`\n--- invocation: +${processedThisRun} windows, ${skipped} already-done skipped ---`);
  console.log(
    `coverage: ${state.ledger.length} / ${state.windows.length}` +
      (state.ceilingHit ? "  (CEILING — resume disabled until ceiling raised)" : done ? "  ✓ COMPLETE" : "  (resume to continue)"),
  );
  if (!done && !state.ceilingHit) {
    console.log("(re-run to continue)");
    return;
  }

  const c = (f: (e: Any) => boolean) => L.filter(f).length;
  const discoveryDecision = c((e) => e.discovery === "decision");
  const discoveryNo = c((e) => e.discovery === "no-decision");
  const gatePass = c((e) => e.gateStage === "pass");
  const gateReject = c((e) => e.gateStage !== "pass");
  const verPass = L.filter((e) => e.verifier && ["correctTarget", "meaningfulDecision", "twoAlternativesVisible", "pauseBeforeCommitment", "outcomeVisible"].every((k) => e.verifier[k] === true)).length;
  const verFail = L.filter((e) => e.verifier && e.verifier.notes === "verifier pass did not complete").length;
  const verDisagree = L.filter((e) => e.verifier && !["correctTarget", "meaningfulDecision", "twoAlternativesVisible", "pauseBeforeCommitment", "outcomeVisible"].every((k) => e.verifier[k] === true) && e.verifier.notes !== "verifier pass did not complete").length;
  const accepted = L.filter((e) => e.final === "accepted");
  const needs = L.filter((e) => e.final === "needs_attention");

  const totalCost = state.costUsd;
  const totalTokens = { in: state.tokensIn + state.stageATokensIn, out: state.tokensOut + state.stageATokensOut };
  const calls = state.stageACalls + state.discoveryCalls + state.verifierCalls;

  console.log("\n==================== v2 BASELINE REPORT ====================");
  console.log(`game ${GAME.id} "${GAME.title}"  ·  target ${GAME.teamColor} #${GAME.jerseyNumber}  ·  pipelineVersion ${PIPELINE_VERSION}`);
  console.log(`status: ${state.ceilingHit ? "STOPPED AT COST CEILING" : "COMPLETE"}`);
  console.log("");
  console.log(`total live-play windows:        ${state.windows.length}`);
  console.log(`total windows processed:        ${state.ledger.length}`);
  console.log(`discovery decisions:            ${discoveryDecision}`);
  console.log(`discovery no-decisions:         ${discoveryNo}`);
  console.log(`deterministic-gate passes:      ${gatePass}`);
  console.log(`deterministic-gate rejections:  ${gateReject}`);
  console.log(`verifier passes:                ${verPass}`);
  console.log(`verifier failures (errored):    ${verFail}`);
  console.log(`verifier disagreements:         ${verDisagree}`);
  console.log(`FINAL accepted candidates:      ${accepted.length}`);
  console.log(`needs_attention candidates:     ${needs.length}`);
  console.log("");
  console.log(`runtime (analysis loop):        ${(state.wallMsAccrued / 60000).toFixed(1)} min`);
  console.log(`model calls:                    ${calls} (stageA ${state.stageACalls}, discovery ${state.discoveryCalls}, verifier ${state.verifierCalls})`);
  console.log(`retries:                        ${state.retries}`);
  console.log(`tokens:                         in ${totalTokens.in}, out ${totalTokens.out}`);
  console.log(`total estimated cost:          $${totalCost.toFixed(2)}  (ceiling $${COST_CEILING_USD})`);
  console.log("");

  console.log("REJECTION-REASON DISTRIBUTION (stage · reason):");
  const dist: Record<string, number> = {};
  for (const e of L.filter((x) => x.final === "rejected")) {
    const k = `${e.rejectionStage} · ${e.rejectionReason}`;
    dist[k] = (dist[k] ?? 0) + 1;
  }
  for (const [k, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(3)}  ${k}`);
  console.log("");

  const surv = [...accepted, ...needs];
  if (surv.length === 0) {
    console.log("FINAL / needs_attention candidates: NONE. Zero candidates survived — reported honestly.");
  } else {
    console.log("FINAL + needs_attention candidates:");
    for (const e of surv) {
      const d = e.draft;
      console.log(
        `  ${e.final.toUpperCase()}  win ${e.index} decision @ ${clock(d.decisionSeconds)}  "${d.title}"\n` +
          `     target seen: ${d.targetEvidence.map((t: Any) => clock(t.timestampSeconds)).join(", ")}\n` +
          `     action ${d.actualAction} @ ${d.actualActionSeconds != null ? clock(d.actualActionSeconds) : "?"} · outcome @ ${d.visibleOutcomeSeconds != null ? clock(d.visibleOutcomeSeconds) : "?"}\n` +
          d.plausibleAlternatives.map((a: Any, i: number) => `     alt ${i + 1} @ ${clock(a.atSeconds)}: ${a.action} — ${a.visibleEvidence}`).join("\n") +
          `\n     verifier: ${e.verifier ? JSON.stringify(e.verifier) : "n/a"}` +
          (e.final === "needs_attention" ? `\n     reason: ${e.rejectionReason}` : "") +
          `\n     preview: ${preview(d.clipStartSeconds, d.clipEndSeconds)}`,
      );
    }
  }
  console.log("\nData for DB persistence written to scratchpad/v2-baseline-cursor.json (ledger[].draft on survivors).");
  console.log("==========================================================");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
