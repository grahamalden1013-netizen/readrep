import { NextResponse } from "next/server";
import { askAboutStory, aiEnabled } from "@/lib/ai";

const MAX_QUESTION_LENGTH = 400;

export async function POST(request: Request) {
  let payload: { slug?: string; question?: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { slug, question } = payload;

  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Missing story slug." }, { status: 400 });
  }
  if (!question || typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `Questions are limited to ${MAX_QUESTION_LENGTH} characters.` },
      { status: 400 },
    );
  }

  try {
    const response = await askAboutStory(slug, question.trim());
    return NextResponse.json({ ...response, live: aiEnabled() });
  } catch (error) {
    console.error("[ngn:ai] ask failed", error);
    return NextResponse.json(
      { error: "That answer could not be generated. Try again." },
      { status: 502 },
    );
  }
}
