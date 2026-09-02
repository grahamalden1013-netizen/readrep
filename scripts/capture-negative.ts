/**
 * (Re)capture ONE negative regression fixture.
 *   npx tsx --conditions=react-server scripts/capture-negative.ts <windowIndex>
 * Retries transient provider errors. Writes test/fixtures/v2-negative/win-<N>.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const PB = "yqvyYqVLV1k1H2kvoqEtuFvZoVfvvIg8kf4nIfb2sQo";
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

async function main() {
  const w = Number(process.argv[2]);
  const cursor = JSON.parse(readFileSync(resolve(process.cwd(), "scratchpad/coverage-cursor.json"), "utf8"));
  const win = cursor.windows[w];
  const references: { timestampSeconds: number }[] = cursor.references;

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
  const refHint = { cues: ["White uniform, number 15"], anyNumberVisible: cursor.anyNumberVisible };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let res: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let captured: any = null;
  for (let a = 1; a <= 5 && !res; a += 1) {
    captured = null;
    __setRawHook((x) => {
      captured = x;
    });
    try {
      res = await analyzePossessionVerified(PB, win, target, referenceFrames, null, refHint);
    } catch (e) {
      console.log(`attempt ${a} failed: ${e instanceof Error ? e.message : e}`);
      await new Promise((r) => setTimeout(r, 3000 * a));
    } finally {
      __setRawHook(undefined);
    }
  }
  if (!res) throw new Error("could not complete after 5 attempts");

  console.log(
    `win ${w} ${clock(win.startSeconds)}-${clock(win.endSeconds)}: discovery ${
      captured?.raw?.decision === true ? "decision:true" : "decision:false"
    } · gate ${captured?.gate?.kind} · final ${res.kind}` + (res.verifier ? ` · verifier ${JSON.stringify(res.verifier)}` : ""),
  );

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
        finalKind: res.kind,
        verifierVerdict: res.verifier ?? null,
        modelResponse: captured.raw,
      },
      null,
      2,
    ),
  );
  console.log(`wrote test/fixtures/v2-negative/win-${w}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
