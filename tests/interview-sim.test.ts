/**
 * Simulated interview evaluations, against the real model.
 *
 * TWO MODES, because this costs real money.
 *
 *   npm run test:sim:quick   two coaches, 10 turns each, ~22 calls
 *   npm run test:sim         all five coaches, ~100+ calls
 *
 * Use quick for tuning. The full run is for when you deliberately want a
 * broad evaluation — it is the one that burned through the credits.
 *
 * Most tuning questions do not need this at all: `npm run test:readiness`
 * walks the same interview deterministically, for free, and is where the
 * question-count targets are actually pinned.
 *
 * This REQUIRES a real API key. Running it against a mock would measure a
 * script rather than the interview, so without a key it refuses rather than
 * printing numbers that mean nothing. Nothing is written to the database.
 */

import { providerMode, interviewModel } from "@/lib/ai/anthropic";
import { PROMPT_VERSION, runInterviewTurn } from "@/lib/ai/coach-interview";
import { calculateFilmReadiness, skippedAreas } from "@/lib/interview/gain";
import type { InterviewSnapshot } from "@/lib/interview/types";
import { COACHES, answerFor, type Coach } from "./coaches";
import { applyTurn, emptyRun } from "./sim-state";

delete process.env.READREP_AI_MODE;

const QUICK = process.argv.includes("--quick") || process.env.READREP_SIM_MODE === "quick";

/**
 * Hard caps, so a runaway interview cannot bill forever. Quick mode is sized
 * to answer "did the tuning work?" — a detailed coach should finish well
 * inside it, and a terse one hitting the cap is itself the signal.
 */
const MAX_QUESTIONS = QUICK ? 10 : 22;

/** Quick mode contrasts the two coaches whose behaviour should differ most. */
const QUICK_COACH_IDS = ["A", "B"];

/** Every provider call in this process, so the cost is never a surprise. */
let apiCalls = 0;

type Report = {
  coach: string;
  summary: string;
  questions: number;
  confirmed: number;
  inferred: number;
  openUnknowns: number;
  skipped: number;
  skippedExamples: string[];
  readiness: string;
  endedBecause: string;
  transcript: { q: string; a: string }[];
};

async function interview(coach: Coach): Promise<Report> {
  let snapshot: InterviewSnapshot = emptyRun(coach.name);
  const transcript: { q: string; a: string }[] = [];
  let endedBecause = `hit the ${MAX_QUESTIONS}-question cap`;

  // Opening turn: no coach message.
  apiCalls += 1;
  let result = await runInterviewTurn(snapshot, null);
  if (!result.ok) throw new Error(`${coach.name}: opening turn failed — ${result.message}`);
  snapshot = applyTurn(snapshot, null, result.turn);

  for (let i = 0; i < MAX_QUESTIONS; i++) {
    const question = result.ok ? result.turn.assistantMessage : "";
    const answer = answerFor(coach, question);
    transcript.push({ q: question, a: answer });

    apiCalls += 1;
    result = await runInterviewTurn(snapshot, answer);
    if (!result.ok) throw new Error(`${coach.name}: turn ${i + 2} failed — ${result.message}`);

    snapshot = applyTurn(snapshot, answer, result.turn);

    if (result.end) {
      endedBecause = calculateFilmReadiness(snapshot).reason;
      break;
    }
  }

  const readiness = calculateFilmReadiness(snapshot);
  const skipped = skippedAreas(snapshot).filter((a) => a.relevance >= 0.25);

  return {
    coach: coach.name,
    summary: coach.summary,
    questions: transcript.length,
    confirmed: snapshot.knowledge.filter((k) => k.provenance === "confirmed").length,
    inferred: snapshot.knowledge.filter((k) => k.provenance === "inferred").length,
    openUnknowns: snapshot.unknowns.length,
    skipped: skipped.length,
    skippedExamples: skipped.slice(0, 3).map((a) => `${a.area.label}: ${a.skipReason}`),
    readiness: readiness.status,
    endedBecause,
    transcript,
  };
}

async function main() {
  if (providerMode() !== "live") {
    console.log(
      "\nSKIPPED — no ANTHROPIC_API_KEY.\n\n" +
        "These evaluations only mean something against a real model. Running them\n" +
        "against a scripted mock would measure the script, not the interview.\n\n" +
        "  ANTHROPIC_API_KEY=… npm run test:sim\n",
    );
    process.exit(1);
  }

  const coaches = QUICK ? COACHES.filter((c) => QUICK_COACH_IDS.includes(c.id)) : COACHES;

  console.log(`\nCoach interview evaluation${QUICK ? " (QUICK)" : ""}`);
  console.log(`  provider: anthropic`);
  console.log(`  model:    ${interviewModel()}`);
  console.log(`  prompt:   ${PROMPT_VERSION}`);
  console.log(`  coaches:  ${coaches.map((c) => c.id).join(", ")}`);
  console.log(`  cap:      ${MAX_QUESTIONS} questions each`);
  console.log(`  worst-case calls: ${coaches.length * (MAX_QUESTIONS + 1)}\n`);

  const reports: Report[] = [];
  for (const coach of coaches) {
    process.stdout.write(`  running ${coach.name}… `);
    const report = await interview(coach);
    reports.push(report);
    console.log(`${report.questions} questions, ${report.readiness}`);
  }

  console.log("\n" + "=".repeat(78));
  console.log("RESULTS");
  console.log("=".repeat(78));
  console.log(
    ["coach", "Qs", "confirmed", "inferred", "open", "skipped", "readiness"]
      .map((h, i) => h.padEnd([26, 4, 10, 9, 5, 8, 12][i]))
      .join(""),
  );
  for (const r of reports) {
    console.log(
      [
        r.coach.slice(0, 25),
        String(r.questions),
        String(r.confirmed),
        String(r.inferred),
        String(r.openUnknowns),
        String(r.skipped),
        r.readiness,
      ]
        .map((c, i) => c.padEnd([26, 4, 10, 9, 5, 8, 12][i]))
        .join(""),
    );
  }

  for (const r of reports) {
    console.log("\n" + "-".repeat(78));
    console.log(`${r.coach} — ${r.summary}`);
    console.log(`ended: ${r.endedBecause}`);
    if (r.skippedExamples.length > 0) {
      console.log("questions ReadRep refused to ask:");
      for (const s of r.skippedExamples) console.log(`  · ${s}`);
    }
    console.log("transcript:");
    for (const [i, t] of r.transcript.entries()) {
      console.log(`  ${i + 1}. Q: ${t.q}`);
      console.log(`     A: ${t.a}`);
    }
  }

  // --- Assertions: these are the product claims, checked ---------------------
  console.log("\n" + "=".repeat(78));
  const failures: string[] = [];

  const byId = new Map(reports.map((r, i) => [coaches[i].id, r]));

  const a = byId.get("A")!;
  const b = byId.get("B")!;
  const c = byId.get("C");
  const d = byId.get("D");

  if (a.questions < b.questions) {
    console.log(`ok   a detailed coach finishes faster than a terse one (${a.questions} vs ${b.questions})`);
  } else {
    failures.push(`Coach A (${a.questions}) should need fewer questions than Coach B (${b.questions})`);
  }

  for (const r of reports) {
    if (r.confirmed / Math.max(1, r.questions) >= 1.5) {
      console.log(`ok   ${r.coach}: ${(r.confirmed / r.questions).toFixed(1)} facts per question`);
    } else {
      failures.push(`${r.coach} only extracted ${(r.confirmed / r.questions).toFixed(1)} facts per question`);
    }
  }

  // The headline target: a detailed coach should be readable quickly.
  if (a.questions <= 12 && a.readiness === "film_ready") {
    console.log(`ok   the detailed coach was film-ready in ${a.questions} questions`);
  } else {
    failures.push(
      `Coach A took ${a.questions} questions and reached "${a.readiness}" — target is film-ready within 12`,
    );
  }

  if (c && d) {
    if (c.transcript.every((t) => !/vs drop|pick and roll|ball screen coverage/i.test(t.q))) {
      console.log("ok   the post team was never dragged through a pick-and-roll interview");
    } else {
      failures.push("Coach C was asked about ball screens despite barely using them");
    }

    if (d.transcript.some((t) => /zone|short corner|high post/i.test(t.q))) {
      console.log("ok   the zone team was asked about its zone");
    } else {
      failures.push("Coach D was never asked about zone principles");
    }
  }

  console.log(`\n${apiCalls} Anthropic calls made.`);

  if (failures.length > 0) {
    console.log("\nFAILURES");
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nAll evaluation checks passed.\n");
}

void main();
