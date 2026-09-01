import "server-only";
import OpenAI from "openai";
import { toAiError } from "@/lib/ai/errors";
import { assertAiConfigured } from "@/lib/ai/config";
import { fetchMuxFrame } from "@/lib/video/mux-frame-source";
import {
  DEFAULT_DISCOVERY_MODEL,
  SCOUT_BATCH_SIZE,
  SCOUT_CLUSTER_GAP_SECONDS,
  SCOUT_EDGE_TRIM_SECONDS,
  SCOUT_FRAME_WIDTH,
  SCOUT_MAX_CALLS,
  SCOUT_MAX_CANDIDATES,
  SCOUT_PREVIEW_LEAD_SECONDS,
  SCOUT_PREVIEW_TRAIL_SECONDS,
  SCOUT_SAMPLE_INTERVAL_SECONDS,
  SCOUT_VERIFY_BATCH_SIZE,
  SCOUT_VERIFY_FRAME_WIDTH,
  SCOUT_VERIFY_MAX_CALLS,
  SCOUT_VERIFY_MODEL,
} from "./limits";

/**
 * The pre-analysis "find my player" scan.
 *
 * It sweeps the whole game on a coarse grid with the cheap model, keeps only
 * frames that are (a) live basketball and (b) show a player in the target team
 * colour in the foreground, clusters nearby sightings, and returns a short list
 * of candidate moments for the coach to confirm. It never asserts identity — a
 * frame where a number happens to read is only ranked higher, not labelled
 * "confirmed". Confirmation is the coach clicking the player.
 */

export type ScoutCandidate = {
  /** Seconds into the game — the sharpest still for this sighting. */
  timestampSeconds: number;
  /** 3-5s preview window around it. */
  previewStartSeconds: number;
  previewEndSeconds: number;
  /** Ordering hint only, never shown as truth: color-only | number-legible | reads-target. */
  strength: "color-only" | "number-legible" | "reads-target";
};

export type ScoutResult = {
  candidates: ScoutCandidate[];
  probed: number;
  calls: number;
  liveColorFrames: number;
  /** Clusters that survived the stricter second pass. */
  verified: number;
  usage: { input: number; output: number };
  model: string;
};

type FrameVerdict = {
  index: number;
  live: boolean;
  targetColorVisible: boolean;
  numberLegible: boolean;
  matchesTarget: boolean;
};

const SCOUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["frames"],
  properties: {
    frames: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "live", "targetColorVisible", "numberLegible", "matchesTarget"],
        properties: {
          index: { type: "integer" },
          live: { type: "boolean" },
          targetColorVisible: { type: "boolean" },
          numberLegible: { type: "boolean" },
          matchesTarget: { type: "boolean" },
        },
      },
    },
  },
} as const;

function model(): string {
  return (process.env.OPENAI_DISCOVERY_MODEL || DEFAULT_DISCOVERY_MODEL).trim();
}

function scoutTimestamps(durationSeconds: number): number[] {
  const start = SCOUT_EDGE_TRIM_SECONDS;
  const end = Math.max(start + 1, durationSeconds - SCOUT_EDGE_TRIM_SECONDS);
  const out: number[] = [];
  for (let t = start; t <= end; t += SCOUT_SAMPLE_INTERVAL_SECONDS) out.push(Math.round(t));
  return out;
}

const VERIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["frames"],
  properties: {
    frames: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "colorVisible", "playerProminent", "numberReads"],
        properties: {
          index: { type: "integer" },
          /** A player clearly wearing the target colour is present. */
          colorVisible: { type: "boolean" },
          /** That player is in the foreground, not a distant/background figure. */
          playerProminent: { type: "boolean" },
          /** The digits if a target-colour number clearly reads, else null. */
          numberReads: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;

type VerifyVerdict = { index: number; colorVisible: boolean; playerProminent: boolean; numberReads: string | null };

/**
 * Stricter second pass on the shortlisted moments only: a better model, bigger
 * frames, high detail. Confirms the colour is genuinely visible before the
 * moment is offered to the coach, and reads the number when it can. One batch.
 */
async function verifyBatch(
  playbackId: string,
  timestamps: number[],
  teamColor: string,
  jerseyNumber: string,
): Promise<{ verdicts: Map<number, VerifyVerdict>; usage: { input: number; output: number } }> {
  const frames: { timestampSeconds: number; dataUrl: string }[] = [];
  for (const t of timestamps) {
    const f = await fetchMuxFrame(playbackId, t, SCOUT_VERIFY_FRAME_WIDTH, 8_000);
    if (f) frames.push({ timestampSeconds: t, dataUrl: f.dataUrl });
  }
  if (frames.length === 0) return { verdicts: new Map(), usage: { input: 0, output: 0 } };

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim(), timeout: 90_000, maxRetries: 1 });
  const content: OpenAI.Responses.ResponseInputContent[] = [
    {
      type: "input_text",
      text:
        `Find a specific player: ${teamColor} jersey, number ${jerseyNumber}. For each image: ` +
        `colorVisible = a player clearly wearing a ${teamColor} jersey is present; ` +
        "playerProminent = that player is in the foreground (not tiny / background / on the bench); " +
        `numberReads = the digits you can actually read on a ${teamColor} jersey (prefer the one nearest the ball), or null if none is legible. ` +
        "Do not guess a number. Return one entry per image with its 0-based index.",
    },
    ...frames.map((f): OpenAI.Responses.ResponseInputContent => ({
      type: "input_image",
      image_url: f.dataUrl,
      detail: "high",
    })),
  ];

  let response: OpenAI.Responses.Response;
  try {
    response = await client.responses.create({
      model: SCOUT_VERIFY_MODEL,
      reasoning: { effort: "low" },
      input: [{ role: "user", content }],
      max_output_tokens: 3_000,
      text: {
        format: { type: "json_schema", name: "scout_verify", strict: true, schema: VERIFY_SCHEMA as unknown as Record<string, unknown> },
      },
    });
  } catch (cause) {
    throw toAiError(cause);
  }

  const text = response.output_text?.trim();
  let parsed: { frames?: VerifyVerdict[] } = {};
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {};
    }
  }
  const verdicts = new Map<number, VerifyVerdict>();
  (parsed.frames ?? []).forEach((v) => {
    if (typeof v.index === "number" && frames[v.index]) {
      verdicts.set(frames[v.index].timestampSeconds, v);
    }
  });
  return {
    verdicts,
    usage: { input: response.usage?.input_tokens ?? 0, output: response.usage?.output_tokens ?? 0 },
  };
}

async function classifyBatch(
  frames: { timestampSeconds: number; dataUrl: string }[],
  teamColor: string,
  jerseyNumber: string,
): Promise<{ verdicts: FrameVerdict[]; usage: { input: number; output: number } }> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim(), timeout: 60_000, maxRetries: 1 });
  const content: OpenAI.Responses.ResponseInputContent[] = [
    {
      type: "input_text",
      text:
        `You are scanning a basketball broadcast to help a coach find a specific player: ${teamColor} jersey, number ${jerseyNumber}. ` +
        "For each image report: live = true only for live game action (not studio, commercials, halftime, timeouts, bench, crowd, replays, or dead-ball). " +
        `targetColorVisible = true only if at least one player clearly wearing a ${teamColor} jersey is visible in the foreground (not tiny or far background). ` +
        "numberLegible = true only if you could confidently read the digits on any such jersey. " +
        `matchesTarget = true only if a ${teamColor} player whose number clearly reads ${jerseyNumber} is visible. Be conservative: when unsure, use false. ` +
        "Return one entry per image in order with its 0-based index.",
    },
    ...frames.map((f): OpenAI.Responses.ResponseInputContent => ({
      type: "input_image",
      image_url: f.dataUrl,
      detail: "low",
    })),
  ];

  let response: OpenAI.Responses.Response;
  try {
    response = await client.responses.create({
      model: model(),
      // A flat classification — no chain of thought needed, and the small models
      // otherwise burn the whole token budget on reasoning and return nothing.
      reasoning: { effort: "minimal" },
      input: [{ role: "user", content }],
      max_output_tokens: 4_000,
      text: {
        format: {
          type: "json_schema",
          name: "player_scout_verdicts",
          strict: true,
          schema: SCOUT_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    });
  } catch (cause) {
    throw toAiError(cause);
  }

  // One weak batch must not kill the whole scan — treat it as "nothing seen".
  const text = response.output_text?.trim();
  let parsed: { frames?: FrameVerdict[] } = {};
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {};
    }
  }
  const byIndex = new Map((parsed.frames ?? []).map((v) => [v.index, v]));
  const verdicts: FrameVerdict[] = frames.map((_, i) => {
    const v = byIndex.get(i);
    return {
      index: i,
      live: v?.live === true,
      targetColorVisible: v?.targetColorVisible === true,
      numberLegible: v?.numberLegible === true,
      matchesTarget: v?.matchesTarget === true,
    };
  });
  return {
    verdicts,
    usage: { input: response.usage?.input_tokens ?? 0, output: response.usage?.output_tokens ?? 0 },
  };
}

function strengthOf(v: FrameVerdict): ScoutCandidate["strength"] {
  if (v.matchesTarget) return "reads-target";
  if (v.numberLegible) return "number-legible";
  return "color-only";
}

function score(s: ScoutCandidate["strength"]): number {
  return s === "reads-target" ? 3 : s === "number-legible" ? 2 : 1;
}

export async function scoutTeamColorCandidates(
  playbackId: string,
  durationSeconds: number,
  teamColor: string,
  jerseyNumber: string,
): Promise<ScoutResult> {
  assertAiConfigured();
  const timestamps = scoutTimestamps(durationSeconds);
  const hits: { timestampSeconds: number; strength: ScoutCandidate["strength"] }[] = [];
  let calls = 0;
  let probed = 0;
  let usageIn = 0;
  let usageOut = 0;

  for (let i = 0; i < timestamps.length && calls < SCOUT_MAX_CALLS; i += SCOUT_BATCH_SIZE) {
    const batchTs = timestamps.slice(i, i + SCOUT_BATCH_SIZE);
    const frames: { timestampSeconds: number; dataUrl: string }[] = [];
    for (const t of batchTs) {
      const f = await fetchMuxFrame(playbackId, t, SCOUT_FRAME_WIDTH, 6_000);
      if (f) frames.push({ timestampSeconds: t, dataUrl: f.dataUrl });
    }
    if (frames.length === 0) continue;

    const { verdicts, usage } = await classifyBatch(frames, teamColor, jerseyNumber);
    calls += 1;
    probed += frames.length;
    usageIn += usage.input;
    usageOut += usage.output;

    verdicts.forEach((v, j) => {
      // Permissive first pass — anything live that might be the target colour.
      // The strict second pass throws out the false positives.
      if (v.live && (v.targetColorVisible || v.numberLegible || v.matchesTarget)) {
        hits.push({ timestampSeconds: frames[j].timestampSeconds, strength: strengthOf(v) });
      }
    });
  }

  // Cluster nearby sightings; keep the strongest member of each cluster.
  hits.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  const clusters: { timestampSeconds: number; strength: ScoutCandidate["strength"] }[] = [];
  for (const hit of hits) {
    const last = clusters[clusters.length - 1];
    if (last && hit.timestampSeconds - last.timestampSeconds <= SCOUT_CLUSTER_GAP_SECONDS) {
      if (score(hit.strength) > score(last.strength)) last.strength = hit.strength;
      last.timestampSeconds = Math.round((last.timestampSeconds + hit.timestampSeconds) / 2);
    } else {
      clusters.push({ ...hit });
    }
  }

  // Shortlist the strongest clusters, then confirm each with the stricter pass.
  clusters.sort((a, b) => score(b.strength) - score(a.strength) || a.timestampSeconds - b.timestampSeconds);
  const shortlist = clusters.slice(0, SCOUT_VERIFY_BATCH_SIZE * SCOUT_VERIFY_MAX_CALLS);

  const verdicts = new Map<number, VerifyVerdict>();
  for (let i = 0; i < shortlist.length; i += SCOUT_VERIFY_BATCH_SIZE) {
    const batch = shortlist.slice(i, i + SCOUT_VERIFY_BATCH_SIZE).map((c) => c.timestampSeconds);
    const res = await verifyBatch(playbackId, batch, teamColor, jerseyNumber);
    res.verdicts.forEach((v, k) => verdicts.set(k, v));
    usageIn += res.usage.input;
    usageOut += res.usage.output;
  }

  const verified = shortlist
    .map((c) => ({ cluster: c, v: verdicts.get(c.timestampSeconds) }))
    // Keep only moments the strict pass confirms show a prominent target-colour player.
    .filter((x) => x.v && x.v.colorVisible && x.v.playerProminent)
    .map(({ cluster, v }) => {
      const reads = v!.numberReads?.trim() ?? null;
      const strength: ScoutCandidate["strength"] =
        reads && reads === jerseyNumber ? "reads-target" : reads ? "number-legible" : "color-only";
      return { timestampSeconds: cluster.timestampSeconds, strength };
    });

  const chosen = verified
    .sort((a, b) => score(b.strength) - score(a.strength) || a.timestampSeconds - b.timestampSeconds)
    .slice(0, SCOUT_MAX_CANDIDATES)
    .sort((a, b) => a.timestampSeconds - b.timestampSeconds);

  const candidates: ScoutCandidate[] = chosen.map((c) => ({
    timestampSeconds: c.timestampSeconds,
    previewStartSeconds: Math.max(0, c.timestampSeconds - SCOUT_PREVIEW_LEAD_SECONDS),
    previewEndSeconds: Math.min(durationSeconds, c.timestampSeconds + SCOUT_PREVIEW_TRAIL_SECONDS),
    strength: c.strength,
  }));

  return {
    candidates,
    probed,
    calls,
    liveColorFrames: hits.length,
    verified: verified.length,
    usage: { input: usageIn, output: usageOut },
    model: model(),
  };
}
