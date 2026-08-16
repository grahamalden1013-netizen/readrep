/**
 * Interview engine tests — prompt construction, the provider contract,
 * server-side redundancy enforcement, and failure handling.
 *
 * These run against the scripted mock provider, NOT a real model: they prove
 * the engine's plumbing, not that a real model asks good basketball questions.
 * For that, see `npm run test:live` and `npm run test:sim`.
 *
 * `server-only` resolves to an empty module under the react-server condition,
 * which is why this file must run as:
 *
 *   npm run test:engine
 */

import { assert, equal, excludes, group, includes, report, test } from "./harness";

import { setMockResponder } from "@/lib/ai/provider";
import { getProvider, interviewModel, providerMode, DEFAULT_MODEL, MODEL_VAR, API_KEY_VAR } from "@/lib/ai/anthropic";
import { PROMPT_VERSION, runInterviewTurn } from "@/lib/ai/coach-interview";
import { buildSystemPrompt } from "@/lib/ai/prompts/coach-interview-v2";
import { InterviewTurnSchema } from "@/lib/ai/schemas";
import { node, outputNode, snapshot, turnOutput, unknown, RICH_ANSWER_FACTS } from "./fixtures";

process.env.READREP_AI_MODE = "mock";

async function main() {
  // -------------------------------------------------------------------------
  group("Configuration — model and credentials");

  await test("the model is configurable and defaults to a strong one", () => {
    delete process.env[MODEL_VAR];
    equal(interviewModel(), DEFAULT_MODEL, "sensible default");

    process.env[MODEL_VAR] = "claude-sonnet-5";
    equal(interviewModel(), "claude-sonnet-5", "overridable without touching the engine");
    delete process.env[MODEL_VAR];
  });

  await test("the key variable is server-only by name", () => {
    equal(API_KEY_VAR, "ANTHROPIC_API_KEY", "never NEXT_PUBLIC_-prefixed");
    excludes(API_KEY_VAR, "NEXT_PUBLIC", "a public prefix would ship the key to browsers");
  });

  await test("without a key and without mock mode, the provider is unconfigured", async () => {
    const prior = process.env.READREP_AI_MODE;
    delete process.env.READREP_AI_MODE;
    delete process.env[API_KEY_VAR];

    equal(providerMode(), "unconfigured", "mode reflects the missing key");
    const result = await getProvider().generate({
      system: "x",
      messages: [{ role: "user", content: "y" }],
      schema: InterviewTurnSchema,
    });
    assert(!result.ok, "no call is attempted");
    equal(result.kind, "unconfigured", "the caller can show an honest state");
    includes(result.message, "ANTHROPIC_API_KEY", "naming the variable to set");

    process.env.READREP_AI_MODE = prior ?? "mock";
  });

  // -------------------------------------------------------------------------
  group("System prompt — what ReadRep tells the model it may do");

  await test("carries the closed situation vocabulary", () => {
    const prompt = buildSystemPrompt(snapshot());
    includes(prompt, "coverage: drop, switch, hedge, blitz, ice, under, over", "coverages listed");
    includes(prompt, "closed enums", "declared closed");
  });

  await test("hands the model a ranked shortlist, not a syllabus", () => {
    const prompt = buildSystemPrompt(snapshot());
    includes(prompt, "WORTH ASKING ABOUT NOW", "ranked by value");
    includes(prompt, "ranked by expected value to film analysis", "and says on what basis");
  });

  await test("areas the coach already answered are named as off-limits", () => {
    const prompt = buildSystemPrompt(
      snapshot({
        knowledge: RICH_ANSWER_FACTS.map((f) =>
          node({ areaId: f.area_id, instruction: f.instruction }),
        ),
        turns: [
          { id: "t1", seq: 1, role: "coach", content: "We're mostly 5-out, we play fast, we run Zoom and side ball screens.", areaId: null, reason: null, informationValue: null, model: null, promptVersion: null, createdAt: "" },
        ],
      }),
    );
    includes(prompt, "ALREADY SETTLED — do not ask about these", "the settled list exists");
    const settled = prompt.slice(prompt.indexOf("ALREADY SETTLED"));
    includes(settled, "offense.identity", "and names what's settled");
  });

  await test("shows confirmed and inferred separately with their real ids", () => {
    const prompt = buildSystemPrompt(
      snapshot({
        knowledge: [
          node({ id: "k-conf", instruction: "5-out motion" }),
          node({ id: "k-inf", provenance: "inferred", areaId: "offense.principles", instruction: "spacing matters on penetration" }),
        ],
      }),
    );
    includes(prompt, "CONFIRMED — the coach said these", "confirmed section");
    includes(prompt, "INFERRED — your guesses, not yet agreed to", "inferred section");
    includes(prompt, "[k-conf]", "ids exposed for updates");
    includes(prompt, "[k-inf]", "including the guesses, so they can be confirmed");
  });

  await test("carries open gaps and ReadRep's own readiness call", () => {
    const prompt = buildSystemPrompt(snapshot({ unknowns: [unknown()] }));
    includes(prompt, "OPEN GAPS", "gaps carried forward");
    includes(prompt, "weak-side corner drift", "verbatim");
    includes(prompt, "computed from stored facts, not your report", "readiness is ReadRep's");
  });

  await test("never contains a credential", () => {
    process.env[API_KEY_VAR] = "sk-ant-test-should-never-appear";
    const prompt = buildSystemPrompt(snapshot({ knowledge: [node()] }));
    excludes(prompt, "sk-ant", "no key material in the prompt");
    delete process.env[API_KEY_VAR];
    process.env.READREP_AI_MODE = "mock";
  });

  // -------------------------------------------------------------------------
  group("Traceability");

  await test("every turn records provider, model and prompt version", async () => {
    setMockResponder(() => turnOutput());
    const result = await runInterviewTurn(snapshot(), null);
    assert(result.ok, "turn succeeds");
    if (!result.ok) return;
    equal(result.meta.promptVersion, PROMPT_VERSION, "prompt version stamped");
    equal(result.meta.provider, "mock", "provider stamped");
    includes(result.meta.model, DEFAULT_MODEL, "model stamped");
    assert(result.meta.latencyMs >= 0, "latency recorded");
  });

  await test("the prompt version is the versioned one, not a bare name", () => {
    equal(PROMPT_VERSION, "coach-interview-v2", "improvable over time");
  });

  // -------------------------------------------------------------------------
  group("Conversation shape");

  await test("an opening turn synthesizes the first user message", async () => {
    let seen: { role: string; content: string }[] = [];
    setMockResponder(({ messages }) => {
      seen = messages;
      return turnOutput();
    });

    await runInterviewTurn(snapshot(), null);
    equal(seen.length, 1, "one synthesized message");
    equal(seen[0].role, "user", "the API requires a user turn first");
    includes(seen[0].content, "broad one", "and it asks for a high-information opener");
  });

  await test("consecutive coach turns are collapsed rather than sent as-is", async () => {
    let seen: { role: string; content: string }[] = [];
    setMockResponder(({ messages }) => {
      seen = messages;
      return turnOutput();
    });

    await runInterviewTurn(
      snapshot({
        turns: [
          { id: "1", seq: 1, role: "assistant", content: "What do you run?", areaId: null, reason: null, informationValue: null, model: null, promptVersion: null, createdAt: "" },
          { id: "2", seq: 2, role: "coach", content: "5-out motion", areaId: null, reason: null, informationValue: null, model: null, promptVersion: null, createdAt: "" },
        ],
      }),
      "Sorry — 5-out with a trail big",
    );

    for (let i = 1; i < seen.length; i++) {
      assert(seen[i].role !== seen[i - 1].role, "no two consecutive turns share a role");
    }
    includes(seen[seen.length - 1].content, "trail big", "both coach messages survive");
  });

  // -------------------------------------------------------------------------
  group("Redundancy enforcement — the engine, not just the prompt");

  await test("a question about something the coach already answered is rejected and retried", async () => {
    const stored = RICH_ANSWER_FACTS.map((f) => node({ areaId: f.area_id, instruction: f.instruction }));
    const withAnswers = snapshot({
      knowledge: stored,
      turns: [
        { id: "t1", seq: 1, role: "assistant", content: "How do you want to play?", areaId: null, reason: null, informationValue: null, model: null, promptVersion: null, createdAt: "" },
        { id: "t2", seq: 2, role: "coach", content: "We're 5-out, play fast, run Zoom and side ball screens.", areaId: null, reason: null, informationValue: null, model: null, promptVersion: null, createdAt: "" },
      ],
    });

    let call = 0;
    setMockResponder(() => {
      call += 1;
      return call === 1
        ? turnOutput({
            assistant_message: "What offensive alignment do you use?",
            next_question_area: "offense.identity",
          })
        : turnOutput({
            assistant_message: "How do you want to defend?",
            next_question_area: "defense.identity",
          });
    });

    const result = await runInterviewTurn(withAnswers, "anything");
    assert(result.ok, "turn completes");
    if (!result.ok) return;
    equal(call, 2, "the redundant question triggered a corrective retry");
    equal(result.turn.nextAreaId, "defense.identity", "and the replacement moved on");
    assert(result.corrections.length > 0, "the violation is recorded");
    includes(result.corrections[0], "Rejected a redundant question", "with an explanation");
  });

  await test("two redundant attempts end the interview rather than asking anyway", async () => {
    const stored = RICH_ANSWER_FACTS.map((f) => node({ areaId: f.area_id, instruction: f.instruction }));
    const withAnswers = snapshot({
      knowledge: stored,
      turns: [{ id: "t2", seq: 2, role: "coach", content: "We're 5-out, fast, Zoom and side ball screens.", areaId: null, reason: null, informationValue: null, model: null, promptVersion: null, createdAt: "" }],
    });

    setMockResponder(() =>
      turnOutput({ assistant_message: "Do you run ball screens?", next_question_area: "offense.identity" }),
    );

    const result = await runInterviewTurn(withAnswers, "anything");
    assert(result.ok, "turn completes");
    if (!result.ok) return;
    assert(result.turn.modelSaysEnd, "the interview ends instead of repeating itself");
    assert(
      result.corrections.some((c) => c.includes("ending the interview")),
      "and says why",
    );
  });

  await test("a question about an irrelevant area is rejected too", async () => {
    const noBallScreens = snapshot({
      turns: [{ id: "t1", seq: 1, role: "coach", content: "We're 4-out-1-in, post heavy, we barely use ball screens.", areaId: null, reason: null, informationValue: null, model: null, promptVersion: null, createdAt: "" }],
    });

    let call = 0;
    setMockResponder(() => {
      call += 1;
      return call === 1
        ? turnOutput({ assistant_message: "What's your first read vs drop?", next_question_area: "offense.ball_screen_reads" })
        : turnOutput({ assistant_message: "How do you get the post the ball?", next_question_area: "offense.post_reads" });
    });

    const result = await runInterviewTurn(noBallScreens, "anything");
    assert(result.ok && result.corrections.length > 0, "the irrelevant question was caught");
    if (result.ok) includes(result.corrections[0], "doesn't apply", "for the right reason");
  });

  // -------------------------------------------------------------------------
  group("Readiness is ReadRep's call, not the model's");

  await test("the model cannot declare film-ready on an empty playbook", async () => {
    setMockResponder(() =>
      turnOutput({
        film_readiness: { status: "film_ready", reason: "I know plenty." },
        should_end_onboarding: true,
      }),
    );
    const result = await runInterviewTurn(snapshot(), "hi");
    assert(result.ok, "turn succeeds");
    if (!result.ok) return;
    equal(result.readiness.status, "learning", "ReadRep computes its own answer");
    equal(result.end, false, "and does not end on the model's say-so");
  });

  await test("this turn's answer counts toward readiness immediately", async () => {
    setMockResponder(() =>
      turnOutput({
        confirmed_knowledge_updates: RICH_ANSWER_FACTS,
        coverage_updates: RICH_ANSWER_FACTS.map((f) => ({
          area_id: f.area_id,
          status: "partial" as const,
          confidence: 0.8,
          note: null,
        })),
      }),
    );
    const result = await runInterviewTurn(snapshot(), "long answer");
    assert(result.ok, "turn succeeds");
    if (!result.ok) return;
    assert(result.readiness.score > 0, "the answer just given already moved readiness");
  });

  // -------------------------------------------------------------------------
  group("Failures — the app degrades honestly");

  await test("output missing a required field is rejected, not partly applied", async () => {
    setMockResponder(() => ({ assistant_message: "Hi", confirmed_knowledge_updates: [] }));
    const result = await runInterviewTurn(snapshot(), "hello");
    assert(!result.ok, "malformed output fails the turn");
    equal(result.kind, "invalid_output", "classified as invalid output");
  });

  await test("an out-of-vocabulary enum is rejected at the schema boundary", async () => {
    setMockResponder(() =>
      turnOutput({
        confirmed_knowledge_updates: [
          outputNode({ area_id: "defense.ball_screen_coverage", coverage: "veer" as never }),
        ],
      }),
    );
    const result = await runInterviewTurn(snapshot(), "we veer it");
    assert(!result.ok, "the turn fails rather than silently dropping the coverage");
    equal(result.kind, "invalid_output", "classified as invalid output");
  });

  await test("prose where an object was required fails", async () => {
    setMockResponder(() => "Sure! Here's what I think about your ball screens.");
    const result = await runInterviewTurn(snapshot(), "hello");
    assert(!result.ok, "not a turn");
  });

  await test("an empty reply is treated as a failed turn", async () => {
    setMockResponder(() => turnOutput({ assistant_message: "   " }));
    const result = await runInterviewTurn(snapshot(), "hello");
    assert(!result.ok, "a blank question is not a turn");
  });

  await test("a provider outage is classified, not thrown", async () => {
    setMockResponder(() => {
      throw new Error("socket hang up");
    });
    const result = await runInterviewTurn(snapshot(), "hello");
    assert(!result.ok, "the turn fails");
    equal(result.kind, "provider_error", "classified rather than crashing the request");
  });

  await test("mock mode with no responder refuses to invent intelligence", async () => {
    setMockResponder(null);
    const result = await getProvider().generate({
      system: "x",
      messages: [{ role: "user", content: "y" }],
      schema: InterviewTurnSchema,
    });
    assert(!result.ok, "no fallback answer is produced");
    equal(result.kind, "unconfigured", "reported as unconfigured");
  });

  report();
}

void main();
