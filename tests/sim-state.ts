import { fingerprintOf, type NormalizedTurn } from "@/lib/interview/normalize";
import type { InterviewSnapshot, KnowledgeNode } from "@/lib/interview/types";

/**
 * An in-memory stand-in for `persistTurn`, so a whole interview can be driven
 * against a real model without writing to the database.
 *
 * It applies the same rules the server action does — confirmed and inferred
 * stay separate, a matching fingerprint updates rather than duplicates,
 * resolved gaps close, a replacement of a confirmed rule waits for the coach —
 * so the numbers the evaluation reports are the numbers the app would store.
 */

export function emptyRun(teamName: string): InterviewSnapshot {
  return {
    playbookId: "sim",
    teamId: "sim",
    teamName,
    completedAt: null,
    knowledge: [],
    areaStates: [],
    turns: [],
    terms: [],
    unknowns: [],
    ruleChanges: [],
    scratch: { suggestions: [], nextAreaId: null, endedAt: null },
  };
}

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${(counter += 1)}`;

export function applyTurn(
  snapshot: InterviewSnapshot,
  coachMessage: string | null,
  turn: NormalizedTurn,
): InterviewSnapshot {
  const knowledge: KnowledgeNode[] = snapshot.knowledge.map((k) => ({ ...k }));
  const byFingerprint = new Map(
    knowledge.map((k) => [
      fingerprintOf({ ...k, provenance: k.provenance }),
      k,
    ]),
  );

  // Revisions, retractions and confirmations — the same ops the server applies.
  for (const update of turn.updates) {
    const target = knowledge.find((k) => k.id === update.id);
    if (!target) continue;

    if (update.op === "confirm") {
      if (target.provenance === "inferred") {
        target.provenance = "confirmed";
        target.confirmedAt = new Date().toISOString();
      }
      continue;
    }
    if (update.op === "retire") {
      knowledge.splice(knowledge.indexOf(target), 1);
      continue;
    }
    // A replacement of something confirmed waits for the coach, exactly as the
    // server action queues it — so it must not land as knowledge here.
    if (update.replacesConfirmedRule && target.provenance === "confirmed") continue;
    if (update.instruction !== null) target.instruction = update.instruction;
    if (update.trigger !== null) target.trigger = update.trigger;
    if (update.confidence !== null) target.confidence = update.confidence;
  }

  // New facts, parents before children.
  const idByRef = new Map<string, string>();
  const ordered = [...turn.nodes].sort((x, y) =>
    x.parentRef && !y.parentRef ? 1 : !x.parentRef && y.parentRef ? -1 : 0,
  );

  for (const n of ordered) {
    const existing = byFingerprint.get(n.fingerprint);
    if (existing) {
      existing.instruction = n.instruction;
      existing.confidence = n.confidence;
      idByRef.set(n.ref, existing.id);
      continue;
    }
    const created: KnowledgeNode = {
      id: nextId("k"),
      areaId: n.areaId,
      concept: n.concept,
      phase: n.phase,
      action: n.action,
      coverage: n.coverage,
      role: n.role,
      clock: n.clock,
      trigger: n.trigger,
      instruction: n.instruction,
      priority: n.priority,
      confidence: n.confidence,
      provenance: n.provenance,
      confirmedAt: n.provenance === "confirmed" ? new Date().toISOString() : null,
      parentId: n.parentRef ? (idByRef.get(n.parentRef) ?? null) : null,
      createdAt: new Date().toISOString(),
    };
    knowledge.push(created);
    byFingerprint.set(n.fingerprint, created);
    idByRef.set(n.ref, created.id);
  }

  const areaStates = new Map(snapshot.areaStates.map((s) => [s.areaId, { ...s }]));
  for (const areaId of turn.notApplicable) {
    areaStates.set(areaId, { areaId, status: "not_applicable", confidence: 0, note: null });
  }

  const resolved = new Set(turn.resolvedUnknowns.map((q) => q.toLowerCase()));
  const unknowns = [
    ...snapshot.unknowns.filter((u) => !resolved.has(u.question.toLowerCase())),
    ...turn.unknowns
      .filter(
        (u) =>
          !snapshot.unknowns.some((e) => e.question.toLowerCase() === u.question.toLowerCase()),
      )
      .map((u) => ({
        id: nextId("u"),
        areaId: u.areaId,
        question: u.question,
        whyItMatters: null,
        importance: u.importance,
        createdAt: new Date().toISOString(),
      })),
  ];

  const seq = snapshot.turns.length;

  return {
    ...snapshot,
    knowledge,
    areaStates: [...areaStates.values()],
    unknowns,
    terms: [
      ...snapshot.terms,
      ...turn.terminology
        .filter((t) => !snapshot.terms.some((e) => e.term.toLowerCase() === t.term.toLowerCase()))
        .map((t) => ({ id: nextId("t"), ...t, origin: "interview" })),
    ],
    turns: [
      ...snapshot.turns,
      ...(coachMessage
        ? [
            {
              id: nextId("turn"),
              seq: seq + 1,
              role: "coach" as const,
              content: coachMessage,
              areaId: null,
              reason: null,
              informationValue: null,
              model: null,
              promptVersion: null,
              createdAt: "",
            },
          ]
        : []),
      {
        id: nextId("turn"),
        seq: seq + 2,
        role: "assistant" as const,
        content: turn.assistantMessage,
        areaId: turn.nextAreaId,
        reason: turn.nextQuestionReason,
        informationValue: turn.informationValue,
        model: null,
        promptVersion: null,
        createdAt: "",
      },
    ],
    scratch: {
      suggestions: turn.suggestions,
      nextAreaId: turn.nextAreaId,
      endedAt: snapshot.scratch.endedAt,
    },
  };
}
