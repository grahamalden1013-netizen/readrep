import { NextResponse } from "next/server";
import { explainArticle, aiEnabled, type ExplainMode } from "@/lib/ai";

const MODES: ExplainMode[] = [
  "sixty-seconds",
  "background",
  "from-scratch",
  "define-terms",
];

export async function POST(request: Request) {
  let payload: { slug?: string; mode?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { slug, mode } = payload;

  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Missing story slug." }, { status: 400 });
  }
  if (!MODES.includes(mode as ExplainMode)) {
    return NextResponse.json({ error: "Unknown explain mode." }, { status: 400 });
  }

  try {
    const response = await explainArticle(slug, mode as ExplainMode);
    return NextResponse.json({ ...response, live: aiEnabled() });
  } catch (error) {
    console.error("[ngn:ai] explain failed", error);
    return NextResponse.json(
      { error: "That explanation could not be generated. Try again." },
      { status: 502 },
    );
  }
}
