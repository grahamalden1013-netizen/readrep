// ─────────────────────────────────────────────────────────────────────────────
// Explain Yourself — flavour text (entirely optional)
//
// The game ships with `AI_PROVIDER=none` and is fully playable that way: the
// app falls back to hand-written lines and never blocks a round on this.
//
// What this function is given: a game mode, a round number, and nothing else.
// It never sees a photo, a nickname, a caption, a location, or a single byte of
// anyone's camera roll — by construction, because the request body has nowhere
// to put one.
// ─────────────────────────────────────────────────────────────────────────────

const BANNED = [
  "gay", "straight", "muslim", "christian", "jewish", "hindu",
  "fat", "ugly", "skinny", "anorexic", "sexy", "nude", "naked",
  "arrested", "criminal", "illegal", "overdose",
  "pregnant", "cancer", "depressed", "suicidal", "immigrant", "deport",
  "racist", "republican", "democrat",
];

const SYSTEM = `You write one short line of flavour text for a party game where friends explain photos from their own camera rolls.

You never see a photo. You are given only the game mode and the round number.

Hard rules:
- Never guess or comment on anyone's appearance, body, sexuality, religion, health, ethnicity, politics, immigration status, or legal history.
- Never accuse anyone of a crime or of anything they would have to deny.
- Never write anything sexual.
- Never use a real person's name.
- Aim every joke at the photograph, never at the person holding the phone.
- One sentence. Under 60 characters. No emoji. No hashtags.`;

/** Re-checked on the way out. A system prompt is guidance; this is a control. */
function acceptable(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 90) return false;
  const lowered = trimmed.toLowerCase();
  return !BANNED.some((word) => new RegExp(`\\b${word}\\b`).test(lowered));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });

  const provider = Deno.env.get("AI_PROVIDER") ?? "none";
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (provider !== "anthropic" || !apiKey) {
    // The app already has a good line. Telling it so is a valid answer.
    return Response.json({ line: null, reason: "disabled" });
  }

  const { mode, roundNumber, totalRounds, kind } = await req.json();
  if (typeof mode !== "string" || typeof roundNumber !== "number") {
    return Response.json({ line: null, reason: "bad_request" });
  }

  const ask = kind === "noContextPrompt"
    ? `Write the prompt shown above an unexplained photo in "No Context". All caps.`
    : `Write one silly interrogation question to show under a photo. Round ${roundNumber} of ${totalRounds} of ${mode}.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5",
        max_tokens: 64,
        system: SYSTEM,
        messages: [{ role: "user", content: ask }],
      }),
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) return Response.json({ line: null, reason: "upstream" });

    const payload = await response.json();
    const line: string = payload?.content?.[0]?.text?.trim() ?? "";
    if (!acceptable(line)) return Response.json({ line: null, reason: "filtered" });
    return Response.json({ line });
  } catch {
    // Never hold up a round for this.
    return Response.json({ line: null, reason: "timeout" });
  }
});
